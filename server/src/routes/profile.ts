import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import path from 'path';
import fs from 'fs';

const router = Router();

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = await Profile.findOne({ user: req.userId }).populate('categories');
    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isOnboarded: user.isOnboarded
      },
      profile
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error fetching profile' });
  }
});

// Create/Update profile (Onboarding)
router.post('/setup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      fullName,
      username,
      location,
      goals,
      communicationStyle,
      experience,
      negotiableTiers,
      availabilityImmediate,
      availabilityNote,
      visibility,
      avatarUrl,
      bio,
      headline,
      hourlyRate,
      textQuestionPrice,
      videoResponsePrice,
      categories,
      role
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    if (username) {
      const existingUsername = await Profile.findOne({
        username: username.toLowerCase().replace('@', ''),
        user: { $ne: req.userId }
      });
      if (existingUsername) {
        return res.status(400).json({ error: 'Username handle is already taken' });
      }
    }

    let profile = await Profile.findOne({ user: req.userId });

    const cleanUsername = username ? username.toLowerCase().replace('@', '') : undefined;

    if (profile) {
      // Update existing
      profile.fullName = fullName;
      if (cleanUsername !== undefined) profile.username = cleanUsername;
      if (location !== undefined) profile.location = location;
      if (goals !== undefined) profile.goals = goals;
      if (communicationStyle !== undefined) profile.communicationStyle = communicationStyle;
      if (experience !== undefined) profile.experience = experience;
      if (negotiableTiers !== undefined) profile.negotiableTiers = negotiableTiers;
      if (availabilityImmediate !== undefined) profile.availabilityImmediate = availabilityImmediate;
      if (availabilityNote !== undefined) profile.availabilityNote = availabilityNote;
      if (visibility !== undefined) profile.visibility = visibility;
      profile.avatarUrl = avatarUrl !== undefined ? avatarUrl : profile.avatarUrl;
      profile.bio = bio !== undefined ? bio : profile.bio;
      profile.headline = headline !== undefined ? headline : profile.headline;
      profile.hourlyRate = hourlyRate !== undefined ? hourlyRate : profile.hourlyRate;
      profile.textQuestionPrice = textQuestionPrice !== undefined ? textQuestionPrice : profile.textQuestionPrice;
      profile.videoResponsePrice = videoResponsePrice !== undefined ? videoResponsePrice : profile.videoResponsePrice;
      profile.categories = categories !== undefined ? categories : profile.categories;
      await profile.save();
    } else {
      // Create new
      profile = new Profile({
        user: req.userId,
        fullName,
        username: cleanUsername,
        location,
        goals,
        communicationStyle,
        experience,
        negotiableTiers,
        availabilityImmediate,
        availabilityNote,
        visibility,
        avatarUrl,
        bio,
        headline,
        hourlyRate: hourlyRate || 0,
        textQuestionPrice: textQuestionPrice || 0,
        videoResponsePrice: videoResponsePrice || 0,
        categories: categories || []
      });
      await profile.save();
    }

    // Update user onboarding status and optional role change
    const userUpdate: any = { isOnboarded: true };
    if (role && (role === 'seeker' || role === 'expert')) {
      userUpdate.role = role;
    }
    await User.findByIdAndUpdate(req.userId, userUpdate);

    // Get updated user & populate profile categories
    const updatedUser = await User.findById(req.userId);
    const populatedProfile = await Profile.findById(profile._id).populate('categories');

    res.json({
      message: 'Profile saved successfully',
      user: {
        id: updatedUser?._id,
        email: updatedUser?.email,
        role: updatedUser?.role,
        isOnboarded: updatedUser?.isOnboarded
      },
      profile: populatedProfile
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error setting up profile' });
  }
});

// POST /api/profile/upload-avatar
router.post('/upload-avatar', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { base64, fileName, fileType } = req.body;
    if (!base64 || !fileName || !fileType) {
      return res.status(400).json({ error: 'Base64 data, fileName, and fileType are required' });
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueFileName = `avatar-${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
    const filePath = path.join(uploadsDir, uniqueFileName);
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(filePath, buffer);

    const host = req.get('host');
    const fileUrl = `${req.protocol}://${host}/uploads/${uniqueFileName}`;

    res.json({ url: fileUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error uploading avatar' });
  }
});

// POST /api/profile/upload-media
router.post('/upload-media', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { base64, fileName, fileType } = req.body;
    if (!base64 || !fileName || !fileType) {
      return res.status(400).json({ error: 'Base64 data, fileName, and fileType are required' });
    }

    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueFileName = `media-${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
    const filePath = path.join(uploadsDir, uniqueFileName);
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(filePath, buffer);

    const host = req.get('host');
    const fileUrl = `${req.protocol}://${host}/uploads/${uniqueFileName}`;

    res.json({ url: fileUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error uploading media file' });
  }
});

export default router;
