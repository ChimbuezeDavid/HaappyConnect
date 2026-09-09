import { Router, Response } from 'express';
import mongoose from 'mongoose';
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

// Direct Paystack Escrow Checkout: Initiate a consultation package
router.post('/initiate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { expertId, type = 'text', seekerContent, redirect_uri } = req.body;
    if (!expertId || !seekerContent) {
      return res.status(400).json({ error: 'ExpertId and consultation content are required' });
    }

    const expertProfile = await Profile.findOne({
      $or: [
        { user: expertId },
        ...(mongoose.isValidObjectId(expertId) ? [{ _id: expertId }] : [])
      ]
    });
    if (!expertProfile) {
      return res.status(404).json({ error: 'Expert profile not found' });
    }

    const resolvedExpertUserId = expertProfile.user.toString();
    if (resolvedExpertUserId === req.userId) {
      return res.status(400).json({ error: 'You cannot submit a consultation to yourself' });
    }

    if (!['text', 'voice', 'video'].includes(type)) {
      return res.status(400).json({ error: 'Invalid question type' });
    }

    const seekerUser = await User.findById(req.userId);
    if (!seekerUser) {
      return res.status(404).json({ error: 'Seeker user not found' });
    }

    // Determine package pricing, quota count, and response turnaround from expert's configuration
    let price = 0;
    let quotaTotal = 1;
    if (type === 'video') {
      price = expertProfile.videoPackagePrice || expertProfile.videoResponsePrice || 5000;
      quotaTotal = expertProfile.videoPackageCount || 1;
    } else {
      // text or voice package
      price = expertProfile.textPackagePrice || expertProfile.textQuestionPrice || 3000;
      quotaTotal = expertProfile.textPackageCount || 3;
    }

    const turnaroundDays = expertProfile.responseWindowDays || 3;
    const expiresAt = new Date(Date.now() + turnaroundDays * 24 * 60 * 60 * 1000);

    // Get or create canonical single lifetime thread between seeker and expert
    let conv = await Conversation.findOne({
      participants: { $all: [req.userId, resolvedExpertUserId] }
    }).sort({ updatedAt: -1 });

    if (!conv) {
      conv = new Conversation({
        participants: [req.userId, resolvedExpertUserId],
        unreadCounts: [
          { user: req.userId, count: 0 },
          { user: resolvedExpertUserId, count: 0 }
        ]
      });
      await conv.save();
    }

    const reference = `hc_escrow_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const question = new Question({
      seeker: req.userId,
      expert: resolvedExpertUserId,
      conversation: conv._id,
      type,
      status: 'payment_pending',
      price,
      seekerContent,
      quotaTotal,
      quotaUsed: 0,
      paidWith: 'paystack',
      paymentReference: reference,
      escrowStatus: 'held',
      expiresAt
    });
    await question.save();

    const PAYSTACK_SECRET = (process.env.PAYSTACK_SECRET_KEY || '').trim();
    const effectiveRedirectUri = redirect_uri || 'haappy://checkout-complete';

    if (PAYSTACK_SECRET) {
      const initializeUrl = 'https://api.paystack.co/transaction/initialize';
      const paystackRes = await fetch(initializeUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: seekerUser.email,
          amount: Math.round(price * 100), // kobo
          reference,
          callback_url: effectiveRedirectUri,
          metadata: {
            questionId: question._id,
            conversationId: conv._id,
            seekerId: req.userId,
            expertId,
            type: 'consultation_escrow'
          }
        })
      });

      const responseData = (await paystackRes.json()) as any;
      if (!responseData.status) {
        return res.status(400).json({ error: responseData.message || 'Paystack initialization failed' });
      }

      return res.json({
        questionId: question._id,
        conversationId: conv._id,
        authorizationUrl: responseData.data.authorization_url,
        reference,
        isMock: false
      });
    }

    // Sandbox / Mock flow for testing
    const mockCheckoutUrl = `${req.protocol}://${req.get('host')}/api/wallet/mock-checkout?` +
      `reference=${reference}&` +
      `amount=${price}&` +
      `redirect_uri=${encodeURIComponent(effectiveRedirectUri)}`;

    return res.json({
      questionId: question._id,
      conversationId: conv._id,
      authorizationUrl: mockCheckoutUrl,
      reference,
      isMock: true
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error initiating consultation' });
  }
});

// Verify Paystack payment and activate consultation in single chat thread
router.post('/verify-payment', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ error: 'Transaction reference is required' });
    }

    const question = await Question.findOne({ paymentReference: reference });
    if (!question) {
      return res.status(404).json({ error: 'Consultation order not found for this reference' });
    }

    if (question.status !== 'payment_pending') {
      return res.json({
        success: true,
        message: 'Payment already verified',
        question,
        conversationId: question.conversation
      });
    }

    const PAYSTACK_SECRET = (process.env.PAYSTACK_SECRET_KEY || '').trim();
    if (PAYSTACK_SECRET && !reference.startsWith('hc_mock_')) {
      const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
      const verifyRes = await fetch(verifyUrl, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
      });
      const verifyData = (await verifyRes.json()) as any;
      if (!verifyData.status || verifyData.data?.status !== 'success') {
        return res.status(400).json({ error: 'Payment verification failed at Paystack' });
      }
    }

    const expertProfile = await Profile.findOne({ user: question.expert });
    const turnaroundDays = expertProfile?.responseWindowDays || 3;

    question.status = 'pending';
    question.escrowStatus = 'held';
    question.expiresAt = new Date(Date.now() + turnaroundDays * 24 * 60 * 60 * 1000);
    await question.save();

    // Record ledger entry
    const tx = new Transaction({
      user: question.seeker,
      amount: -question.price,
      type: 'charge',
      status: 'success',
      reference,
      description: `Escrow payment: ${question.type} advisory package`,
      metadata: { questionId: question._id, expertId: question.expert }
    });
    await tx.save();

    // Ensure single lifetime conversation
    let convId = question.conversation;
    if (!convId) {
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
      convId = conv._id as any;
      question.conversation = convId;
      await question.save();
    }

    // Post clean Order Card message directly into the single conversation thread (Icon only, no emojis)
    const orderCardContent = `[CONSULTATION_ORDER:${question._id}:${question.type}:${question.price}:${question.quotaTotal}:${question.expiresAt.toISOString()}]\n\n${question.seekerContent}`;

    const message = new Message({
      conversationId: convId,
      senderId: question.seeker,
      content: orderCardContent,
      readBy: [question.seeker]
    });
    await message.save();

    const conversation = await Conversation.findById(convId);
    if (conversation) {
      conversation.lastMessage = message._id as any;
      conversation.relatedTo = { modelType: 'Question', id: question._id };
      conversation.unreadCounts.forEach((uc) => {
        if (uc.user.toString() !== question.seeker.toString()) {
          uc.count += 1;
        }
      });
      await conversation.save();

      try {
        const io = getIO();
        io.to(conversation._id.toString()).emit('messageReceived', message);
        conversation.participants.forEach((p) => {
          io.to(`user:${p.toString()}`).emit('conversationUpdated', {
            conversationId: conversation._id,
            lastMessage: message,
            unreadCounts: conversation.unreadCounts
          });
        });
      } catch (_) {}
    }

    // Push and email notices
    try {
      const io = getIO();
      io.to(`user:${question.expert}`).emit('notification', {
        type: 'new_question',
        title: 'New Consultation Request',
        body: `You received a new paid ${question.type} consultation request.`,
        data: { questionId: question._id, conversationId: convId }
      });
      sendPushNotification(
        question.expert.toString(),
        'New Consultation Request',
        `You received a new paid ${question.type} consultation request.`,
        { questionId: question._id, conversationId: convId }
      );

      const expertUser = await User.findById(question.expert);
      const seekerProfile = await Profile.findOne({ user: question.seeker });
      if (expertUser?.email) {
        sendConsultationNoticeEmail({
          toEmail: expertUser.email,
          recipientName: expertProfile?.fullName || 'Expert',
          senderName: seekerProfile?.fullName || 'A Seeker',
          type: 'question',
          sessionDetails: `New ${question.type.toUpperCase()} Consultation Request:\n"${question.seekerContent.slice(0, 160)}"`
        });
      }
    } catch (_) {}

    return res.json({
      success: true,
      question,
      conversationId: convId
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error verifying consultation payment' });
  }
});

// Auto-expiry action: Extend 24h or instant refund (Seeker only)
router.post('/:id/auto-expire-action', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { action } = req.body; // 'extend' | 'refund'
    if (!['extend', 'refund'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "extend" or "refund"' });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Consultation order not found' });
    }

    if (question.seeker.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only the client can take action on expired consultations' });
    }

    const isExpired = new Date() >= new Date(question.expiresAt) || question.status === 'expired';
    if (!isExpired && question.status !== 'pending') {
      return res.status(400).json({ error: 'Consultation has not expired yet or is already resolved' });
    }

    if (action === 'extend') {
      const baseDate = new Date() > new Date(question.expiresAt) ? new Date() : new Date(question.expiresAt);
      question.expiresAt = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
      question.status = 'pending';
      question.extendedCount = (question.extendedCount || 0) + 1;
      await question.save();

      if (question.conversation) {
        const sysMsg = new Message({
          conversationId: question.conversation,
          senderId: req.userId,
          content: `[SYSTEM_NOTICE:EXTENDED] Client extended the response deadline by 24 hours.`,
          readBy: [req.userId]
        });
        await sysMsg.save();
        try {
          const io = getIO();
          io.to(question.conversation.toString()).emit('messageReceived', sysMsg);
        } catch (_) {}
      }

      try {
        const io = getIO();
        io.to(`user:${question.expert}`).emit('notification', {
          type: 'question_extended',
          title: 'Consultation Deadline Extended',
          body: 'Client has granted you 24 additional hours to respond to their consultation.',
          data: { questionId: question._id, conversationId: question.conversation }
        });
        sendPushNotification(
          question.expert.toString(),
          'Consultation Deadline Extended',
          'Client has granted you 24 additional hours to respond to their consultation.',
          { questionId: question._id, conversationId: question.conversation }
        );
      } catch (_) {}

      return res.json({ message: 'Response window extended by 24 hours', question });
    }

    if (action === 'refund') {
      question.status = 'expired';
      question.escrowStatus = 'refunded';
      await question.save();

      const refundTx = new Transaction({
        user: question.seeker,
        amount: question.price,
        type: 'refund',
        status: 'success',
        description: `100% Instant Refund: Consultation response timed out`,
        metadata: { questionId: question._id }
      });
      await refundTx.save();

      if (question.conversation) {
        const sysMsg = new Message({
          conversationId: question.conversation,
          senderId: req.userId,
          content: `[SYSTEM_NOTICE:REFUNDED] Consultation closed due to response timeout. 100% refund credited.`,
          readBy: [req.userId]
        });
        await sysMsg.save();
        try {
          const io = getIO();
          io.to(question.conversation.toString()).emit('messageReceived', sysMsg);
        } catch (_) {}
      }

      try {
        const io = getIO();
        io.to(`user:${question.expert}`).emit('notification', {
          type: 'question_cancelled',
          title: 'Consultation Cancelled',
          body: 'A consultation timed out without response and was refunded to the client.',
          data: { questionId: question._id }
        });
      } catch (_) {}

      return res.json({ message: '100% refund processed successfully to your account', question });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error processing auto-expiry action' });
  }
});

// File dispute / report issue with consultation (Seeker only)
router.post('/:id/dispute', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { reason, details } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Dispute reason is required' });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    if (question.seeker.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only the client can report an issue with this consultation' });
    }

    question.status = 'disputed';
    question.escrowStatus = 'disputed';
    question.disputeReason = reason;
    question.disputeDetails = details || '';
    question.disputedAt = new Date();
    await question.save();

    if (question.conversation) {
      const sysMsg = new Message({
        conversationId: question.conversation,
        senderId: req.userId,
        content: `[SYSTEM_NOTICE:DISPUTED] Client reported an issue: "${reason}". Our support team is reviewing.`,
        readBy: [req.userId]
      });
      await sysMsg.save();
      try {
        const io = getIO();
        io.to(question.conversation.toString()).emit('messageReceived', sysMsg);
      } catch (_) {}
    }

    return res.json({ message: 'Issue reported successfully. Support team will review.', question });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error filing dispute' });
  }
});

// Create question (Ask an expert - legacy wallet direct debit fallback)
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
