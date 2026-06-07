import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Question } from '../models/Question';
import { Profile } from '../models/Profile';
import { Transaction } from '../models/Transaction';

const router = Router();

// Get questions for logged in user (either seeker or expert)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const isExpert = req.userRole === 'expert';
    const filter = isExpert ? { $or: [{ expert: req.userId }, { seeker: req.userId }] } : { seeker: req.userId };

    const questions = await Question.find(filter)
      .populate('seeker', 'email')
      .populate('expert', 'email')
      .sort({ createdAt: -1 });

    // Populate user profiles to show names
    const populatedQuestions = await Promise.all(
      questions.map(async question => {
        const seekerProfile = await Profile.findOne({ user: question.seeker });
        const expertProfile = await Profile.findOne({ user: question.expert });
        return {
          ...question.toObject(),
          seekerProfile,
          expertProfile
        };
      })
    );

    res.json(populatedQuestions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error fetching questions' });
  }
});

// Create question (Ask an expert)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { expertId, type, seekerContent } = req.body;
    if (!expertId || !type || !seekerContent) {
      return res.status(400).json({ error: 'ExpertId, question type, and content are required' });
    }

    if (!['text', 'voice', 'video'].includes(type)) {
      return res.status(400).json({ error: 'Invalid question type' });
    }

    const expertProfile = await Profile.findOne({ user: expertId });
    if (!expertProfile) {
      return res.status(404).json({ error: 'Expert profile not found' });
    }

    // Determine price based on type
    const price = type === 'text' ? expertProfile.textQuestionPrice : (type === 'video' ? expertProfile.videoResponsePrice : expertProfile.textQuestionPrice * 1.5);

    // Expires in 72 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    const question = new Question({
      seeker: req.userId,
      expert: expertId,
      type,
      status: 'pending',
      price,
      seekerContent,
      expiresAt
    });

    await question.save();

    // Create a Seeker debit transaction placeholder
    const transaction = new Transaction({
      user: req.userId,
      amount: -price,
      type: 'charge',
      description: `Pending ${type} question to expert ${expertProfile.fullName}`
    });
    await transaction.save();

    res.status(201).json({
      message: 'Question submitted successfully',
      question
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error submitting question' });
  }
});

// Answer a question (Expert only)
router.patch('/:id/answer', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { expertResponse } = req.body;
    if (!expertResponse) {
      return res.status(400).json({ error: 'Response content is required' });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Verify ownership: only the targeted expert can answer
    if (question.expert.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized: only the assigned expert can answer this question' });
    }

    if (question.status !== 'pending') {
      return res.status(400).json({ error: 'This question cannot be answered (it might be cancelled, expired or already answered)' });
    }

    question.expertResponse = expertResponse;
    question.status = 'answered';
    question.answeredAt = new Date();
    await question.save();

    // Credit expert (earnings)
    const transaction = new Transaction({
      user: question.expert,
      amount: question.price * 0.8, // 80% to expert, 20% platform fee
      type: 'charge',
      description: `Answered ${question.type} question from seeker`
    });
    await transaction.save();

    res.json({
      message: 'Question answered successfully',
      question
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error answering question' });
  }
});

// Decline or refund a question
router.patch('/:id/decline', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Verify ownership: only targeted expert can decline
    if (question.expert.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to decline this question' });
    }

    if (question.status !== 'pending') {
      return res.status(400).json({ error: 'Question is not pending' });
    }

    question.status = 'declined';
    await question.save();

    // Refund Seeker
    const transaction = new Transaction({
      user: question.seeker,
      amount: question.price,
      type: 'refund',
      description: `Declined question refund`
    });
    await transaction.save();

    res.json({
      message: 'Question declined and seeker refunded',
      question
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error declining question' });
  }
});

export default router;
