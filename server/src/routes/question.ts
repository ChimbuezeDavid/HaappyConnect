import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Question } from '../models/Question';
import { Profile } from '../models/Profile';
import { Transaction } from '../models/Transaction';
import { Review } from '../models/Review';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { sendPushNotification } from '../utils/push';
import { sendConsultationNoticeEmail } from '../services/email';
import { getIO } from '../socket';
import { getSystemSettings } from '../models/SystemSettings';

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
        const hasReview = await Review.exists({ question: question._id });
        return {
          ...question.toObject(),
          seekerProfile,
          expertProfile,
          hasReview: !!hasReview
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

    if (expertId === req.userId) {
      return res.status(400).json({ error: 'You cannot submit a consultation question to yourself' });
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

    // Calculate seeker's available balance
    const userTransactions = await Transaction.find({ user: req.userId });
    let availableBalance = 0;
    for (const tx of userTransactions) {
      if (tx.status === 'success') {
        availableBalance += tx.amount;
      } else if (tx.status === 'pending' && tx.amount < 0) {
        availableBalance += tx.amount;
      }
    }

    if (availableBalance < price) {
      return res.status(400).json({ error: 'Insufficient wallet balance. Please deposit funds first.' });
    }

    // Dynamic SLA duration (default 7 days escrow hold)
    const settings = await getSystemSettings();
    const slaDays = settings.responseSlaDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + slaDays);

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

    // Use the single unified conversation between seeker and expert
    let conv = await Conversation.findOne({
      participants: { $all: [req.userId, expertId] }
    }).sort({ updatedAt: -1 });

    if (!conv) {
      conv = new Conversation({
        participants: [req.userId, expertId],
        unreadCounts: [
          { user: req.userId, count: 0 },
          { user: expertId, count: 0 }
        ]
      });
      await conv.save();
    }

    const typeLabel = type === 'video' ? '1:1 Video Q&A' : type === 'voice' ? 'Voice Memo Q&A' : 'Written Advice Q&A';
    const message = new Message({
      conversationId: conv._id,
      senderId: req.userId,
      content: `[Consultation Question - ${typeLabel}]\n\n${seekerContent}`,
      readBy: [req.userId]
    });
    await message.save();

    conv.lastMessage = message._id as any;
    conv.relatedTo = { modelType: 'Question', id: question._id };
    conv.unreadCounts.forEach((uc) => {
      if (uc.user.toString() !== req.userId) {
        uc.count += 1;
      }
    });
    await conv.save();

    // Broadcast message via socket
    try {
      const io = getIO();
      io.to(conv._id.toString()).emit('messageReceived', message);
      conv.participants.forEach((p) => {
        io.to(`user:${p.toString()}`).emit('conversationUpdated', {
          conversationId: conv._id,
          lastMessage: message,
          unreadCounts: conv.unreadCounts
        });
      });
    } catch (_) {}

    // Create a Seeker debit transaction placeholder as pending hold
    const transaction = new Transaction({
      user: req.userId,
      amount: -price,
      type: 'charge',
      status: 'pending',
      description: `Pending ${type} question to expert ${expertProfile.fullName}`,
      metadata: { questionId: question._id }
    });
    await transaction.save();

    res.status(201).json({
      message: 'Question submitted successfully',
      question
    });

    try {
      const { getIO } = require('../socket');
      getIO().to(`user:${expertId}`).emit('notification', {
        type: 'new_question',
        title: 'New Question Received',
        body: `You have a new ${type} question waiting for your response.`,
        data: { questionId: question._id }
      });
      sendPushNotification(
        expertId,
        'New Question Received',
        `You have a new ${type} question waiting for your response.`,
        { questionId: question._id }
      );

      // Email notification via Resend
      const expertUser = await User.findById(expertId);
      const seekerProfile = await Profile.findOne({ user: req.userId });
      if (expertUser && expertUser.email) {
        sendConsultationNoticeEmail({
          toEmail: expertUser.email,
          recipientName: expertProfile.fullName,
          senderName: seekerProfile?.fullName || 'A Client',
          type: 'question',
          sessionDetails: `New ${type.toUpperCase()} Consultation Question:\n"${seekerContent.slice(0, 160)}${seekerContent.length > 160 ? '...' : ''}"`
        });
      }
    } catch (_) {}
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error submitting question' });
  }
});

// Answer a question (Expert only)
router.patch('/:id/answer', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { expertResponse, expertResponseUrl } = req.body;
    if (!expertResponse && !expertResponseUrl) {
      return res.status(400).json({ error: 'Response content or media advice file is required' });
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

    question.expertResponse = expertResponse || '';
    question.expertResponseUrl = expertResponseUrl || '';
    question.status = 'answered';
    question.answeredAt = new Date();
    await question.save();

    // Find the original pending transaction
    const escrowTx = await Transaction.findOne({
      'metadata.questionId': question._id,
      status: 'pending'
    });

    if (escrowTx) {
      escrowTx.status = 'success';
      escrowTx.description = `Completed ${question.type} question payment`;
      await escrowTx.save();
    }

    // Credit expert (earnings minus platform fee)
    const settings = await getSystemSettings();
    const feeRatio = (100 - settings.platformFeePercentage) / 100;
    const transaction = new Transaction({
      user: question.expert,
      amount: question.price * feeRatio,
      type: 'charge',
      status: 'success',
      description: `Earnings: Answered ${question.type} question (${100 - settings.platformFeePercentage}% payout)`,
      metadata: { questionId: question._id }
    });
    await transaction.save();

    res.json({
      message: 'Question answered successfully',
      question
    });

    // Post the expert's response into the unified single conversation thread!
    try {
      let conv = await Conversation.findOne({
        participants: { $all: [question.seeker, question.expert] }
      }).sort({ updatedAt: -1 });

      if (!conv) {
        conv = new Conversation({
          participants: [question.seeker, question.expert],
          unreadCounts: [
            { user: question.seeker, count: 0 },
            { user: question.expert, count: 0 }
          ]
        });
        await conv.save();
      }

      const answerContent = expertResponse
        ? `[Expert Consultation Response]\n\n${expertResponse}`
        : `[Expert Consultation Response - ${question.type === 'video' ? 'Video' : 'Audio'} Attachment]`;

      const message = new Message({
        conversationId: conv._id,
        senderId: req.userId,
        content: answerContent,
        media: expertResponseUrl
          ? {
              url: expertResponseUrl,
              type: question.type === 'video' ? 'video' : 'audio'
            }
          : undefined,
        readBy: [req.userId]
      });
      await message.save();

      conv.lastMessage = message._id as any;
      conv.unreadCounts.forEach((uc) => {
        if (uc.user.toString() !== req.userId) {
          uc.count += 1;
        }
      });
      await conv.save();

      const io = getIO();
      io.to(conv._id.toString()).emit('messageReceived', message);
      conv.participants.forEach((p) => {
        io.to(`user:${p.toString()}`).emit('conversationUpdated', {
          conversationId: conv._id,
          lastMessage: message,
          unreadCounts: conv.unreadCounts
        });
      });
    } catch (chatErr) {
      console.error('Failed to post expert response to unified conversation:', chatErr);
    }

    try {
      const { getIO } = require('../socket');
      getIO().to(`user:${question.seeker}`).emit('notification', {
        type: 'question_answered',
        title: 'Expert Has Responded!',
        body: 'Your question has been answered. Tap to view the response.',
        data: { questionId: question._id }
      });
      sendPushNotification(
        question.seeker,
        'Expert Has Responded!',
        'Your question has been answered. Tap to view the response in your conversation.',
        { questionId: question._id }
      );

      // Email notification via Resend
      const seekerUser = await User.findById(question.seeker);
      const seekerProfile = await Profile.findOne({ user: question.seeker });
      const expertProfile = await Profile.findOne({ user: question.expert });
      if (seekerUser && seekerUser.email) {
        sendConsultationNoticeEmail({
          toEmail: seekerUser.email,
          recipientName: seekerProfile?.fullName || 'Client',
          senderName: expertProfile?.fullName || 'Your Expert',
          type: 'answer',
          sessionDetails: `Your consultation question has received an official response from ${expertProfile?.fullName || 'your expert'}. Open your messages in Haappy to view the full response and continue the conversation.`
        });
      }
    } catch (_) {}
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

    // Find the original pending transaction
    const escrowTx = await Transaction.findOne({
      'metadata.questionId': question._id,
      status: 'pending'
    });

    if (escrowTx) {
      escrowTx.status = 'failed';
      escrowTx.description = `Declined question hold release`;
      await escrowTx.save();
    } else {
      // Fallback: Refund Seeker directly
      const refundTx = new Transaction({
        user: question.seeker,
        amount: question.price,
        type: 'refund',
        status: 'success',
        description: `Refund: Declined question`
      });
      await refundTx.save();
    }

    res.json({
      message: 'Question declined and seeker refunded',
      question
    });

    try {
      const { getIO } = require('../socket');
      getIO().to(`user:${question.seeker}`).emit('notification', {
        type: 'question_declined',
        title: 'Question Declined',
        body: 'Your question was declined. Your wallet has been refunded.',
        data: { questionId: question._id }
      });
      sendPushNotification(
        question.seeker,
        'Question Declined ⚠️',
        'Your question was declined. Your wallet has been refunded.',
        { questionId: question._id }
      );
    } catch (_) {}
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error declining question' });
  }
});

export default router;
