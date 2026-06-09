import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import expertRoutes from './routes/expert';
import bookingRoutes from './routes/booking';
import questionRoutes from './routes/question';
import walletRoutes from './routes/wallet';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/HaappyConnect';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Connect to MongoDB & Start Server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    console.log('Starting Express server without DB for fallback...');
    app.listen(PORT, () => {
      console.log(`Server running in fallback mode on port ${PORT} (no database connection)`);
    });
  });
