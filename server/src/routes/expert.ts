import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { Category } from '../models/Category';
import { Profile } from '../models/Profile';
import { User } from '../models/User';

const router = Router();

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error fetching categories' });
  }
});

// Discover Experts (with optional filters)
router.get('/discover', async (req, res) => {
  try {
    const { category, query } = req.query;

    // Build matching user IDs that are experts and onboarded
    const expertUsers = await User.find({ role: 'expert', isOnboarded: true }).select('_id');
    const expertUserIds = expertUsers.map(u => u._id);

    const filter: any = { user: { $in: expertUserIds } };

    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) {
        filter.categories = cat._id;
      }
    }

    if (query) {
      filter.$or = [
        { fullName: { $regex: query, $options: 'i' } },
        { headline: { $regex: query, $options: 'i' } },
        { bio: { $regex: query, $options: 'i' } }
      ];
    }

    const experts = await Profile.find(filter)
      .populate('categories')
      .populate('user', 'email role isOnboarded');

    res.json(experts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error discovering experts' });
  }
});

// Get expert detail profile by profile ID
router.get('/:id', async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id)
      .populate('categories')
      .populate('user', 'email role isOnboarded');
    if (!profile) {
      return res.status(404).json({ error: 'Expert profile not found' });
    }

    const profileObj: any = profile.toObject();

    // Sanitize verification data for public seeker view
    if (profileObj.verificationData) {
      // Sensitive ID document is strictly confidential between expert & admin
      delete profileObj.verificationData.idDocumentUrl;
      delete profileObj.verificationData.adminNotes;

      const pa = profileObj.publicAccreditation || {
        showCertifications: true,
        showExperience: true,
        showPortfolio: true,
        showMentorshipStatement: true,
      };

      if (!pa.showCertifications) {
        profileObj.verificationData.certifications = [];
      }
      if (!pa.showExperience) {
        delete profileObj.verificationData.yearsOfExperience;
      }
      if (!pa.showPortfolio) {
        delete profileObj.verificationData.portfolioUrl;
      }
      if (!pa.showMentorshipStatement) {
        delete profileObj.verificationData.mentorshipStatement;
      }
    }

    res.json(profileObj);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error fetching expert detail' });
  }
});

// GET /api/expert/verification - Get verification status for logged-in expert
router.get('/verification/status', authenticate, async (req: any, res: any) => {
  try {
    const profile = await Profile.findOne({ user: req.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({
      isVerified: profile.isVerified,
      verificationStatus: profile.verificationStatus || 'unsubmitted',
      verificationData: profile.verificationData || null,
      publicAccreditation: profile.publicAccreditation || {
        showCertifications: true,
        showExperience: true,
        showPortfolio: true,
        showMentorshipStatement: true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error fetching verification status' });
  }
});

// POST /api/expert/verification - Submit accreditation details & answers
router.post('/verification/submit', authenticate, async (req: any, res: any) => {
  try {
    const {
      idDocumentUrl,
      certifications,
      yearsOfExperience,
      portfolioUrl,
      mentorshipStatement,
      publicAccreditation,
    } = req.body;

    const profile = await Profile.findOne({ user: req.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    profile.verificationStatus = 'pending';
    profile.verificationData = {
      idDocumentUrl: idDocumentUrl || profile.verificationData?.idDocumentUrl || '',
      certifications: Array.isArray(certifications) ? certifications : (profile.verificationData?.certifications || []),
      yearsOfExperience: Number(yearsOfExperience) || profile.verificationData?.yearsOfExperience || 0,
      portfolioUrl: portfolioUrl || profile.verificationData?.portfolioUrl || '',
      mentorshipStatement: mentorshipStatement || profile.verificationData?.mentorshipStatement || '',
      submittedAt: new Date(),
      adminNotes: ''
    };

    if (publicAccreditation && typeof publicAccreditation === 'object') {
      profile.publicAccreditation = {
        showCertifications: publicAccreditation.showCertifications !== false,
        showExperience: publicAccreditation.showExperience !== false,
        showPortfolio: publicAccreditation.showPortfolio !== false,
        showMentorshipStatement: publicAccreditation.showMentorshipStatement !== false,
      };
    }

    await profile.save();

    res.json({
      message: 'Verification application submitted successfully for review.',
      isVerified: profile.isVerified,
      verificationStatus: profile.verificationStatus,
      verificationData: profile.verificationData,
      publicAccreditation: profile.publicAccreditation,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error submitting verification' });
  }
});

export default router;
