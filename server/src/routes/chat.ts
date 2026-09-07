import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { getIO } from '../socket';
import fs from 'fs';
import path from 'path';

const router = Router();

// GET /api/chat/conversations - Get list of conversations for logged-in user
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId
    })
      .populate({
        path: 'lastMessage',
        select: 'content media senderId isDeleted createdAt'
      })
      .sort({ updatedAt: -1 });

    // Deduplicate so each peer appears only once in the chat list (single chat per peer)
    const seenPeers = new Set<string>();
    const uniqueConversations: typeof conversations = [];

    for (const conv of conversations) {
      const otherUserId = conv.participants.find(p => p.toString() !== req.userId)?.toString();
      if (!otherUserId) continue;
      if (!seenPeers.has(otherUserId)) {
        seenPeers.add(otherUserId);
        uniqueConversations.push(conv);
      }
    }

    const populatedConversations = await Promise.all(
      uniqueConversations.map(async (conv) => {
        const otherUserId = conv.participants.find(p => p.toString() !== req.userId);
        const otherProfile = await Profile.findOne({ user: otherUserId });
        const otherUser = await User.findById(otherUserId);
        const myUnreadObj = conv.unreadCounts.find(uc => uc.user.toString() === req.userId);
        
        return {
          _id: conv._id,
          participants: conv.participants,
          lastMessage: conv.lastMessage,
          unreadCount: myUnreadObj ? myUnreadObj.count : 0,
          relatedTo: conv.relatedTo,
          blockedBy: conv.blockedBy,
          isBlocked: conv.blockedBy.length > 0,
          otherProfile: otherProfile ? {
            userId: otherProfile.user,
            fullName: otherProfile.fullName,
            avatarUrl: otherProfile.avatarUrl,
            headline: otherProfile.headline,
            isExpert: otherUser?.role === 'expert'
          } : {
            userId: otherUserId,
            fullName: 'User',
            avatarUrl: '',
            headline: '',
            isExpert: otherUser?.role === 'expert'
          },
          updatedAt: conv.updatedAt
        };
      })
    );

    res.json(populatedConversations);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error fetching conversations' });
  }
});

// GET /api/chat/conversations/:id/messages - Get messages for a specific conversation (paginated)
router.get('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = '40', before } = req.query;

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.userId
    });

    if (!conversation) {
      return res.status(403).json({ error: 'Unauthorized or conversation not found' });
    }

    const query: any = { conversationId: id };
    if (before) {
      query.createdAt = { $lt: new Date(before as string) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error fetching messages' });
  }
});

// POST /api/chat/conversations/:id/messages - Post a new message with direct database persistence
router.post('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, media } = req.body;

    if (!content && !media) {
      return res.status(400).json({ error: 'Message content or media is required' });
    }

    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or unauthorized' });
    }

    if (conversation.blockedBy && conversation.blockedBy.length > 0) {
      return res.status(403).json({ error: 'Cannot send message: This conversation is blocked' });
    }

    const message = new Message({
      conversationId: id,
      senderId: req.userId,
      content,
      media,
      readBy: [req.userId]
    });
    await message.save();

    conversation.lastMessage = message._id as any;
    conversation.unreadCounts.forEach((uc) => {
      if (uc.user.toString() !== req.userId) {
        uc.count += 1;
      }
    });
    await conversation.save();

    // Broadcast via socket if initialized
    try {
      const io = getIO();
      io.to(id).emit('messageReceived', message);
      conversation.participants.forEach((p) => {
        io.to(`user:${p.toString()}`).emit('conversationUpdated', {
          conversationId: id,
          lastMessage: message,
          unreadCounts: conversation.unreadCounts
        });
      });
    } catch (_) {}

    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error sending message' });
  }
});

// POST /api/chat/conversations - Initialize or fetch a conversation
router.post('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { participantId, relatedToModel, relatedToId } = req.body;
    if (!participantId) {
      return res.status(400).json({ error: 'ParticipantId is required' });
    }

    if (participantId === req.userId) {
      return res.status(400).json({ error: 'Cannot start a conversation with yourself' });
    }

    // Always find or return the single canonical conversation between these two users
    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, participantId] }
    }).sort({ updatedAt: -1 });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.userId, participantId],
        unreadCounts: [
          { user: req.userId, count: 0 },
          { user: participantId, count: 0 }
        ],
        relatedTo: relatedToModel && relatedToId ? { modelType: relatedToModel, id: relatedToId } : undefined
      });
      await conversation.save();
    } else if (relatedToModel && relatedToId) {
      // Update active context pointer without creating a duplicate thread
      conversation.relatedTo = { modelType: relatedToModel, id: relatedToId };
      await conversation.save();
    }

    const otherProfile = await Profile.findOne({ user: participantId });
    const otherUser = await User.findById(participantId);
    const myUnreadObj = conversation.unreadCounts.find(uc => uc.user.toString() === req.userId);

    res.status(201).json({
      _id: conversation._id,
      participants: conversation.participants,
      lastMessage: conversation.lastMessage,
      unreadCount: myUnreadObj ? myUnreadObj.count : 0,
      relatedTo: conversation.relatedTo,
      blockedBy: conversation.blockedBy,
      isBlocked: conversation.blockedBy.length > 0,
      otherProfile: otherProfile ? {
        userId: otherProfile.user,
        fullName: otherProfile.fullName,
        avatarUrl: otherProfile.avatarUrl,
        headline: otherProfile.headline,
        isExpert: otherUser?.role === 'expert'
      } : {
        userId: participantId,
        fullName: 'User',
        avatarUrl: '',
        headline: '',
        isExpert: otherUser?.role === 'expert'
      },
      updatedAt: conversation.updatedAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error starting conversation' });
  }
});

// POST /api/chat/conversations/:id/media - Upload base64 media attachment
router.post('/conversations/:id/media', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { base64, fileName, fileType } = req.body;

    if (!base64 || !fileName || !fileType) {
      return res.status(400).json({ error: 'Base64 data, fileName, and fileType are required' });
    }

    // Verify conversation
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.userId
    });

    if (!conversation) {
      return res.status(403).json({ error: 'Unauthorized or conversation not found' });
    }

    // Ensure directory exists
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Write file
    const uniqueFileName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
    const filePath = path.join(uploadsDir, uniqueFileName);
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(filePath, buffer);

    const host = req.get('host');
    const fileUrl = `${req.protocol}://${host}/uploads/${uniqueFileName}`;

    res.json({ url: fileUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error uploading media' });
  }
});

// POST /api/chat/conversations/:id/block - Toggle blocking of conversation
router.post('/conversations/:id/block', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const userObjectId = new Object(req.userId) as any;
    const isBlockedIndex = conversation.blockedBy.findIndex(
      (uid) => uid.toString() === req.userId
    );

    if (isBlockedIndex > -1) {
      // Unblock
      conversation.blockedBy.splice(isBlockedIndex, 1);
    } else {
      // Block
      conversation.blockedBy.push(userObjectId);
    }

    await conversation.save();

    res.json({
      message: conversation.blockedBy.includes(userObjectId) ? 'Conversation blocked' : 'Conversation unblocked',
      blockedBy: conversation.blockedBy
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error blocking conversation' });
  }
});

// POST /api/chat/conversations/:id/report - Report conversation
router.post('/conversations/:id/report', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason for reporting is required' });
    }

    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const userObjectId = new Object(req.userId) as any;
    conversation.reportedBy.push({
      reporter: userObjectId,
      reason,
      createdAt: new Date()
    });

    await conversation.save();

    res.json({ message: 'Report submitted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error reporting conversation' });
  }
});

export default router;
