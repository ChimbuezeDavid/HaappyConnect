import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { Booking } from '../models/Booking';
import { Question } from '../models/Question';
import { Transaction } from '../models/Transaction';
import { sendExpertVerificationStatusEmail } from '../services/email';
import { SystemSettings, getSystemSettings } from '../models/SystemSettings';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforhaappyconnect';

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Invalid credentials or user is not an administrator' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Password authentication not configured for this admin' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      admin: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /api/admin/registration-status - Check if new admin registration is allowed
router.get('/registration-status', async (req, res) => {
  try {
    const settings = await getSystemSettings();
    const adminCount = await User.countDocuments({ role: 'admin' });
    return res.json({
      allowAdminRegistration: settings.allowAdminRegistration ?? true,
      adminCount,
    });
  } catch (error) {
    console.error('Registration status check error:', error);
    return res.status(500).json({ error: 'Failed to retrieve admin registration status' });
  }
});

// POST /api/admin/setup - Create or bootstrap an admin account using email and password
router.post('/setup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const settings = await getSystemSettings();
    const adminCount = await User.countDocuments({ role: 'admin' });

    // If admins already exist and registration is disabled by the admin, block new registrations
    if (adminCount > 0 && settings.allowAdminRegistration === false) {
      return res.status(403).json({
        error: 'Administrator registration is currently disabled to prevent unauthorized access. Contact existing portal administrator.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let user = await User.findOne({ email: cleanEmail });
    if (user) {
      user.role = 'admin';
      user.passwordHash = passwordHash;
      user.isOnboarded = true;
      await user.save();
    } else {
      user = new User({
        email: cleanEmail,
        passwordHash,
        role: 'admin',
        isOnboarded: true,
      });
      await user.save();
    }

    // Provision admin profile if name provided
    if (name && name.trim()) {
      let profile = await Profile.findOne({ user: user._id });
      if (profile) {
        profile.fullName = name.trim();
        await profile.save();
      } else {
        await Profile.create({
          user: user._id,
          fullName: name.trim(),
          bio: 'Platform Administrator',
          headline: 'HaappyConnect Administrator',
          avatarUrl: '',
          hourlyRate: 0,
          textQuestionPrice: 0,
          videoResponsePrice: 0,
          ratingAverage: 5,
          reviewsCount: 0,
          isVerified: true,
          categories: [],
        });
      }
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Admin account created successfully',
      token,
      admin: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Admin setup error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error setting up admin' });
  }
});

// GET /api/admin/me
router.get('/me', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('email role createdAt');
    if (!user) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    return res.json({ admin: user });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch admin identity' });
  }
});

// GET /api/admin/metrics
router.get('/metrics', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalSeekers,
      totalExperts,
      totalAdmins,
      totalBookings,
      completedBookings,
      activeBookings,
      totalQuestions,
      answeredQuestions,
      activeQuestions,
      expertUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'seeker' }),
      User.countDocuments({ role: 'expert' }),
      User.countDocuments({ role: 'admin' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: { $in: ['pending', 'confirmed'] } }),
      Question.countDocuments(),
      Question.countDocuments({ status: 'answered' }),
      Question.countDocuments({ status: 'pending' }),
      User.find({ role: 'expert' }).select('_id')
    ]);

    const expertIds = expertUsers.map(u => u._id);
    const [verifiedExperts, unverifiedExperts] = await Promise.all([
      Profile.countDocuments({ user: { $in: expertIds }, isVerified: true }),
      Profile.countDocuments({ user: { $in: expertIds }, isVerified: { $ne: true } })
    ]);

    // Financial volume calculations
    const volumeAgg = await Transaction.aggregate([
      { $match: { status: 'success', type: { $in: ['charge', 'deposit'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalVolumeNaira = Math.abs(volumeAgg[0]?.total || 0);

    // Escrow currently locked in pending bookings + questions
    const [pendingBookingsAgg, pendingQuestionsAgg] = await Promise.all([
      Booking.aggregate([
        { $match: { status: { $in: ['pending', 'confirmed'] } } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ]),
      Question.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ])
    ]);
    const totalEscrowLockedNaira = (pendingBookingsAgg[0]?.total || 0) + (pendingQuestionsAgg[0]?.total || 0);

    // Platform revenue estimated (20% platform cut on completed consultations)
    const [completedBookingsAgg, answeredQuestionsAgg] = await Promise.all([
      Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ]),
      Question.aggregate([
        { $match: { status: 'answered' } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ])
    ]);
    const completedTurnover = (completedBookingsAgg[0]?.total || 0) + (answeredQuestionsAgg[0]?.total || 0);
    const platformRevenueNaira = Math.round(completedTurnover * 0.20);

    return res.json({
      users: {
        total: totalUsers,
        seekers: totalSeekers,
        experts: totalExperts,
        admins: totalAdmins,
        verifiedExperts,
        unverifiedExperts
      },
      consultations: {
        totalBookings,
        completedBookings,
        activeBookings,
        totalQuestions,
        answeredQuestions,
        activeQuestions,
        totalCompleted: completedBookings + answeredQuestions
      },
      finances: {
        totalVolumeNaira,
        totalEscrowLockedNaira,
        platformRevenueNaira,
        completedTurnover
      }
    });
  } catch (error) {
    console.error('Admin metrics error:', error);
    return res.status(500).json({ error: 'Failed to aggregate platform metrics' });
  }
});

// GET /api/admin/experts
router.get('/experts', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'all', search = '', page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 20));

    // Get all expert user IDs
    const expertUsers = await User.find({ role: 'expert' }).select('_id email');
    const expertUserMap = new Map(expertUsers.map(u => [u._id.toString(), u.email]));
    const expertUserIds = expertUsers.map(u => u._id);

    const query: any = { user: { $in: expertUserIds } };

    if (status === 'verified') {
      query.isVerified = true;
    } else if (status === 'pending') {
      query.isVerified = { $ne: true };
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { headline: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Profile.countDocuments(query);
    const profiles = await Profile.find(query)
      .populate('categories', 'name slug icon')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const formatted = profiles.map(p => ({
      ...p,
      email: expertUserMap.get(p.user.toString()) || 'Unknown'
    }));

    return res.json({
      experts: formatted,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Admin fetch experts error:', error);
    return res.status(500).json({ error: 'Failed to retrieve expert profiles' });
  }
});

// PATCH /api/admin/experts/:profileId/verify
router.patch('/experts/:profileId/verify', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const { isVerified } = req.body;

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({ error: 'isVerified must be a boolean' });
    }

    const updated = await Profile.findByIdAndUpdate(
      profileId,
      { isVerified },
      { new: true }
    ).populate('categories', 'name slug');

    if (!updated) {
      return res.status(404).json({ error: 'Expert profile not found' });
    }

    return res.json({
      message: `Expert ${isVerified ? 'verified' : 'unverified'} successfully`,
      profile: updated
    });
  } catch (error) {
    console.error('Admin verify expert error:', error);
    return res.status(500).json({ error: 'Failed to update expert verification status' });
  }
});

// GET /api/admin/leaderboard
router.get('/leaderboard', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const expertUsers = await User.find({ role: 'expert' }).select('_id email');
    const expertUserMap = new Map(expertUsers.map(u => [u._id.toString(), u.email]));
    const expertUserIds = expertUsers.map(u => u._id);

    const topExperts = await Profile.find({ user: { $in: expertUserIds } })
      .select('fullName username avatarUrl headline ratingAverage reviewsCount hourlyRate isVerified user')
      .sort({ ratingAverage: -1, reviewsCount: -1 })
      .limit(20)
      .lean();

    const formatted = topExperts.map((p, index) => ({
      rank: index + 1,
      ...p,
      email: expertUserMap.get(p.user.toString()) || ''
    }));

    return res.json({ leaderboard: formatted });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load expert leaderboard' });
  }
});

// GET /api/admin/transactions
router.get('/transactions', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = '30', page = '1' } = req.query;
    const limitNum = Math.min(100, parseInt(limit as string) || 30);
    const pageNum = Math.max(1, parseInt(page as string) || 1);

    const total = await Transaction.countDocuments();
    const transactions = await Transaction.find()
      .populate('user', 'email role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    return res.json({
      transactions,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve transaction ledger' });
  }
});

// GET /api/admin/consultations
router.get('/consultations', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [recentBookings, recentQuestions] = await Promise.all([
      Booking.find()
        .populate('seeker', 'email')
        .populate('expert', 'email')
        .sort({ scheduledAt: -1 })
        .limit(20)
        .lean(),
      Question.find()
        .populate('seeker', 'email')
        .populate('expert', 'email')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    return res.json({
      bookings: recentBookings,
      questions: recentQuestions
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch consultations' });
  }
});

// GET /api/admin/verifications - List expert verification applications
router.get('/verifications', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const filter: any = {
      $or: [
        { verificationStatus: status ? status : { $in: ['pending', 'approved', 'rejected'] } },
        { 'verificationData.submittedAt': { $exists: true } }
      ]
    };

    const applications = await Profile.find(filter)
      .populate('user', 'email role createdAt')
      .populate('categories')
      .sort({ 'verificationData.submittedAt': -1, updatedAt: -1 })
      .lean();

    return res.json(applications);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch verification applications' });
  }
});

// POST /api/admin/verifications/:id/review - Approve or reject an expert verification
router.post('/verifications/:id/review', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { action, adminNotes } = req.body; // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const profile = await Profile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Expert profile not found' });
    }

    if (action === 'approve') {
      profile.isVerified = true;
      profile.verificationStatus = 'approved';
    } else {
      profile.isVerified = false;
      profile.verificationStatus = 'rejected';
    }

    if (profile.verificationData) {
      profile.verificationData.reviewedAt = new Date();
      profile.verificationData.adminNotes = adminNotes || '';
    }

    await profile.save();

    // Send email notification to expert via Resend
    try {
      const expertUser = await User.findById(profile.user);
      if (expertUser && expertUser.email) {
        sendExpertVerificationStatusEmail({
          toEmail: expertUser.email,
          expertName: profile.fullName,
          status: action === 'approve' ? 'verified' : 'rejected',
          notes: adminNotes
        });
      }
    } catch (_) {}

    return res.json({
      message: `Expert verification ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      isVerified: profile.isVerified,
      verificationStatus: profile.verificationStatus,
      profile
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to review verification application' });
  }
});

// GET /api/admin/settings/public - Public access to base economics (call base price, SLA days)
router.get('/settings/public', async (req, res) => {
  try {
    const settings = await getSystemSettings();
    return res.json({
      baseLiveCallPricePerMinute: settings.baseLiveCallPricePerMinute,
      responseSlaDays: settings.responseSlaDays,
      platformFeePercentage: settings.platformFeePercentage,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch public settings' });
  }
});

// GET /api/admin/settings - Admin access to full platform settings
router.get('/settings', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await getSystemSettings();
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch platform settings' });
  }
});

// PATCH /api/admin/settings - Admin update platform economics and governance
router.patch('/settings', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { platformFeePercentage, baseLiveCallPricePerMinute, responseSlaDays, allowAdminRegistration } = req.body;
    const settings = await getSystemSettings();

    if (platformFeePercentage !== undefined) {
      const fee = Number(platformFeePercentage);
      if (isNaN(fee) || fee < 0 || fee > 100) {
        return res.status(400).json({ error: 'Platform fee percentage must be between 0 and 100' });
      }
      settings.platformFeePercentage = fee;
    }

    if (baseLiveCallPricePerMinute !== undefined) {
      const baseCall = Number(baseLiveCallPricePerMinute);
      if (isNaN(baseCall) || baseCall < 0) {
        return res.status(400).json({ error: 'Base live call price per minute must be a positive number' });
      }
      settings.baseLiveCallPricePerMinute = baseCall;
    }

    if (responseSlaDays !== undefined) {
      const sla = Number(responseSlaDays);
      if (isNaN(sla) || sla < 1 || sla > 30) {
        return res.status(400).json({ error: 'Response SLA days must be between 1 and 30 days' });
      }
      settings.responseSlaDays = sla;
    }

    if (allowAdminRegistration !== undefined) {
      settings.allowAdminRegistration = Boolean(allowAdminRegistration);
    }

    settings.updatedBy = req.userId ? (req.userId as any) : undefined;
    await settings.save();

    return res.json({
      message: 'Platform settings updated successfully',
      settings
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update platform settings' });
  }
});

export default router;
