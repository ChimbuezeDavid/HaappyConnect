import { Router } from 'express';
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
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error fetching expert detail' });
  }
});

export default router;
