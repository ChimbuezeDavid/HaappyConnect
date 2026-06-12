import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { initSocket } from './socket';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

// Import models
import { Conversation } from './models/Conversation';
import { Message } from './models/Message';

// Import routes
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import expertRoutes from './routes/expert';
import bookingRoutes from './routes/booking';
import questionRoutes from './routes/question';
import walletRoutes from './routes/wallet';
import reviewRoutes from './routes/review';
import chatRoutes from './routes/chat';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/HaappyConnect';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforhaappyconnect';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static uploads
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Haappy-Connect API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/expert', expertRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/question', questionRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/chat', chatRoutes);

// Socket.io Setup
const io = initSocket(httpServer);

// Socket.io JWT Auth Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    socket.data = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Socket Connection Handler
io.on('connection', (socket) => {
  const userId = socket.data.userId;
  console.log(`[Socket] User connected: ${userId} (${socket.id})`);

  // Join notification room for user-specific real-time list updates
  socket.join(`user:${userId}`);

  // Event: joinConversation
  socket.on('joinConversation', ({ conversationId }) => {
    socket.join(conversationId);
    console.log(`[Socket] User ${userId} joined room: ${conversationId}`);
  });

  // Event: leaveConversation
  socket.on('leaveConversation', ({ conversationId }) => {
    socket.leave(conversationId);
    console.log(`[Socket] User ${userId} left room: ${conversationId}`);
  });

  // Event: sendMessage
  socket.on('sendMessage', async ({ conversationId, content, media }) => {
    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
      });

      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found or unauthorized' });
        return;
      }

      if (conversation.blockedBy && conversation.blockedBy.length > 0) {
        socket.emit('error', { message: 'Cannot send message: This conversation is blocked' });
        return;
      }

      const message = new Message({
        conversationId,
        senderId: userId,
        content,
        media,
        readBy: [userId]
      });
      await message.save();

      // Update lastMessage
      conversation.lastMessage = message._id as any;

      // Increment unreads for other participant
      conversation.unreadCounts.forEach((uc) => {
        if (uc.user.toString() !== userId.toString()) {
          uc.count += 1;
        }
      });
      await conversation.save();

      // Emit new message to room participants
      io.to(conversationId).emit('messageReceived', message);

      // Notify other user specifically (for updates to their conversation list list/unread badge)
      conversation.participants.forEach((p) => {
        io.to(`user:${p.toString()}`).emit('conversationUpdated', {
          conversationId,
          lastMessage: message,
          unreadCounts: conversation.unreadCounts
        });
      });
    } catch (err: any) {
      socket.emit('error', { message: err.message || 'Error processing message' });
    }
  });

  // Event: typing
  socket.on('typing', ({ conversationId, isTyping }) => {
    socket.to(conversationId).emit('typingStatus', {
      conversationId,
      userId,
      isTyping
    });
  });

  // Event: markAsRead
  socket.on('markAsRead', async ({ conversationId }) => {
    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
      });

      if (!conversation) return;

      // Clear unread count
      const ucObj = conversation.unreadCounts.find(uc => uc.user.toString() === userId.toString());
      if (ucObj) {
        ucObj.count = 0;
      }
      await conversation.save();

      // Mark matching messages as read
      await Message.updateMany(
        { conversationId, senderId: { $ne: userId }, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      );

      // Broadcast event
      io.to(conversationId).emit('messagesRead', { conversationId, userId });

      // Trigger list update for the user
      socket.emit('conversationUpdated', {
        conversationId,
        unreadCounts: conversation.unreadCounts
      });
    } catch (err: any) {
      console.error('[Socket] Error in markAsRead:', err);
    }
  });

  // Event: deleteMessage
  socket.on('deleteMessage', async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      if (message.senderId.toString() !== userId.toString()) {
        socket.emit('error', { message: 'Unauthorized: Can only delete your own messages' });
        return;
      }

      message.isDeleted = true;
      await message.save();

      io.to(message.conversationId.toString()).emit('messageDeleted', {
        conversationId: message.conversationId,
        messageId
      });
    } catch (err: any) {
      socket.emit('error', { message: err.message || 'Error deleting message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${userId} (${socket.id})`);
  });
});

// Connect to MongoDB & Start Server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    console.log('Starting HTTP server without DB for fallback...');
    httpServer.listen(PORT, () => {
      console.log(`Server running in fallback mode on port ${PORT} (no database connection)`);
    });
  });
