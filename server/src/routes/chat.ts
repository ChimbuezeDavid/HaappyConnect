import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Question } from '../models/Question';
import { Booking } from '../models/Booking';
import { Transaction } from '../models/Transaction';
import { getSystemSettings } from '../models/SystemSettings';
import { sendPushNotification } from '../utils/push';
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

// GET /api/chat/conversations/:id/consultation-status - Verify if seeker has active paid consultation with this expert
router.get('/conversations/:id/consultation-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const currentUser = await User.findById(req.userId);
    const otherUserId = conversation.participants.find(p => p.toString() !== req.userId);
    const otherUser = await User.findById(otherUserId);
    const otherProfile = await Profile.findOne({ user: otherUserId });

    // If the recipient is an expert, no free communication allowed (for seekers OR other experts)
    if (otherUser?.role === 'expert') {
      // Check if currentUser is the hired expert replying to a consultation
      const isReplyingExpert = await Question.exists({
        expert: req.userId,
        seeker: otherUserId,
        status: { $in: ['pending', 'answered'] }
      }) || await Booking.exists({
        expert: req.userId,
        seeker: otherUserId,
        status: { $in: ['pending', 'confirmed'] }
      });

      if (isReplyingExpert) {
        return res.json({ isGated: false, reason: 'expert_reply' });
      }

      // Any user (seeker OR another expert) contacting an expert must have paid consultation
      const activeQuestion = await Question.findOne({
        seeker: req.userId,
        expert: otherUserId,
        status: { $in: ['pending', 'answered'] }
      }).sort({ createdAt: -1 });

      const activeBooking = await Booking.findOne({
        seeker: req.userId,
        expert: otherUserId,
        status: { $in: ['pending', 'confirmed'] }
      }).sort({ createdAt: -1 });

      const hasActiveConsultation = !!(activeQuestion || activeBooking);

      return res.json({
        isGated: !hasActiveConsultation,
        expertProfileId: otherProfile?._id,
        expertName: otherProfile?.fullName || 'Expert',
        textQuestionPrice: otherProfile?.textQuestionPrice || 5000,
        videoResponsePrice: otherProfile?.videoResponsePrice || 10000,
        hourlyRate: otherProfile?.hourlyRate || 25000,
        activeQuestionId: activeQuestion?._id,
        activeBookingId: activeBooking?._id
      });
    }

    res.json({ isGated: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error checking consultation status' });
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

// POST /api/chat/conversations/:id/read - Guaranteed REST endpoint to mark conversation as read
router.post('/conversations/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or unauthorized' });
    }

    // Clear unread count for current user
    const ucObj = conversation.unreadCounts.find(uc => uc.user.toString() === req.userId);
    if (ucObj) {
      ucObj.count = 0;
    }
    await conversation.save();

    // Mark messages as read by current user
    await Message.updateMany(
      { conversationId: id, senderId: { $ne: req.userId }, readBy: { $ne: req.userId } },
      { $addToSet: { readBy: req.userId } }
    );

    // Broadcast read event to active room & user
    try {
      const io = getIO();
      io.to(id).emit('messagesRead', { conversationId: id, userId: req.userId });
      io.to(`user:${req.userId}`).emit('conversationUpdated', {
        conversationId: id,
        unreadCounts: conversation.unreadCounts
      });
    } catch (_) {}

    res.json({ success: true, conversationId: id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error marking messages as read' });
  }
});

// GET /api/chat/conversations/:id/consultation-status - Verify active paid consultation requirement & package status
router.get('/conversations/:id/consultation-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const otherUserId = conversation.participants.find(p => p.toString() !== req.userId);
    if (!otherUserId) {
      return res.json({ isGated: false });
    }

    const otherUser = await User.findById(otherUserId);
    const expertProfile = await Profile.findOne({ user: otherUserId });

    // Check active question in this conversation or between these two users
    const activeQuestion = await Question.findOne({
      $or: [
        { conversation: id, status: { $in: ['pending', 'expired'] } },
        { seeker: req.userId, expert: otherUserId, status: { $in: ['pending', 'expired'] } },
        { seeker: otherUserId, expert: req.userId, status: { $in: ['pending', 'expired'] } }
      ]
    }).sort({ createdAt: -1 });

    const isReplyingExpert = await Question.exists({
      expert: req.userId,
      seeker: otherUserId,
      status: 'pending'
    }) || await Booking.exists({
      expert: req.userId,
      seeker: otherUserId,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (isReplyingExpert) {
      return res.json({
        isGated: false,
        activeQuestion: activeQuestion ? {
          _id: activeQuestion._id,
          type: activeQuestion.type,
          status: activeQuestion.status,
          quotaTotal: activeQuestion.quotaTotal || 1,
          quotaUsed: activeQuestion.quotaUsed || 0,
          price: activeQuestion.price,
          expiresAt: activeQuestion.expiresAt,
          extendedCount: activeQuestion.extendedCount || 0,
          escrowStatus: activeQuestion.escrowStatus,
          seeker: activeQuestion.seeker,
          expert: activeQuestion.expert
        } : null
      });
    }

    if (otherUser?.role !== 'expert') {
      return res.json({ isGated: false, activeQuestion: null });
    }

    const now = Date.now();
    const activeBooking = await Booking.findOne({
      seeker: req.userId,
      expert: otherUserId,
      status: 'confirmed',
      scheduledAt: {
        $gte: new Date(now - 2 * 60 * 60 * 1000),
        $lte: new Date(now + 24 * 60 * 60 * 1000)
      }
    });

    const isGated = !activeQuestion && !activeBooking;

    return res.json({
      isGated,
      expertUserId: otherUserId,
      expertProfileId: expertProfile?._id,
      expertName: expertProfile?.fullName || 'Expert Mentor',
      textQuestionPrice: expertProfile?.textQuestionPrice || 5000,
      videoResponsePrice: expertProfile?.videoResponsePrice || 10000,
      textPackagePrice: expertProfile?.textPackagePrice || expertProfile?.textQuestionPrice || 3000,
      textPackageCount: expertProfile?.textPackageCount || 3,
      videoPackagePrice: expertProfile?.videoPackagePrice || expertProfile?.videoResponsePrice || 5000,
      videoPackageCount: expertProfile?.videoPackageCount || 1,
      responseWindowDays: expertProfile?.responseWindowDays || 3,
      callPricePerMinute: expertProfile?.callPricePerMinute || 500,
      hourlyRate: expertProfile?.hourlyRate || 30000,
      hasActiveQuestion: !!activeQuestion,
      hasActiveBooking: !!activeBooking,
      activeQuestion: activeQuestion ? {
        _id: activeQuestion._id,
        type: activeQuestion.type,
        status: activeQuestion.status,
        quotaTotal: activeQuestion.quotaTotal || 1,
        quotaUsed: activeQuestion.quotaUsed || 0,
        price: activeQuestion.price,
        expiresAt: activeQuestion.expiresAt,
        extendedCount: activeQuestion.extendedCount || 0,
        escrowStatus: activeQuestion.escrowStatus,
        seeker: activeQuestion.seeker,
        expert: activeQuestion.expert
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error checking consultation status' });
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

    // Paid Consultation Gate: Ensure no free chat with experts from any user (seekers OR other experts)
    const currentUser = await User.findById(req.userId);
    const otherUserId = conversation.participants.find(p => p.toString() !== req.userId);
    const otherUser = await User.findById(otherUserId);

    if (otherUser?.role === 'expert') {
      const isReplyingExpert = await Question.exists({
        expert: req.userId,
        seeker: otherUserId,
        status: 'pending'
      }) || await Booking.exists({
        expert: req.userId,
        seeker: otherUserId,
        status: { $in: ['pending', 'confirmed'] }
      });

      if (!isReplyingExpert) {
        const activeQuestion = await Question.findOne({
          $or: [
            { conversation: id, status: 'pending' },
            { seeker: req.userId, expert: otherUserId, status: 'pending' }
          ]
        });

        const now = Date.now();
        const activeBooking = await Booking.findOne({
          seeker: req.userId,
          expert: otherUserId,
          status: 'confirmed',
          scheduledAt: {
            $gte: new Date(now - 2 * 60 * 60 * 1000),
            $lte: new Date(now + 24 * 60 * 60 * 1000)
          }
        });

        if (!activeQuestion && !activeBooking) {
          return res.status(402).json({
            error: 'Paid consultation required. You cannot message an expert without an active consultation.',
            requiresConsultation: true,
            expertUserId: otherUserId
          });
        }
      }
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

    // Check if the sender is an expert fulfilling an active consultation in this thread
    const activeConsultation = await Question.findOne({
      $or: [
        { conversation: id, expert: req.userId, status: 'pending' },
        { expert: req.userId, seeker: otherUserId, status: 'pending' }
      ]
    });

    if (activeConsultation) {
      activeConsultation.quotaUsed = (activeConsultation.quotaUsed || 0) + 1;
      const isFulfilled = activeConsultation.quotaUsed >= (activeConsultation.quotaTotal || 1);

      if (isFulfilled) {
        activeConsultation.status = 'answered';
        activeConsultation.escrowStatus = 'released';
        activeConsultation.answeredAt = new Date();

        // Release escrow payout to expert Earnings
        const settings = await getSystemSettings();
        const feeRatio = (100 - settings.platformFeePercentage) / 100;
        const payoutTx = new Transaction({
          user: activeConsultation.expert,
          amount: activeConsultation.price * feeRatio,
          type: 'charge',
          status: 'success',
          description: `Earnings: Completed ${activeConsultation.type} advisory package (${100 - settings.platformFeePercentage}% payout)`,
          metadata: { questionId: activeConsultation._id }
        });
        await payoutTx.save();

        // Notify seeker
        try {
          const io = getIO();
          io.to(`user:${activeConsultation.seeker}`).emit('notification', {
            type: 'question_answered',
            title: 'Consultation Package Completed',
            body: 'Your expert has provided all responses for your consultation package.',
            data: { questionId: activeConsultation._id, conversationId: id }
          });
          sendPushNotification(
            activeConsultation.seeker.toString(),
            'Consultation Package Completed',
            'Your expert has provided all responses for your consultation package.',
            { questionId: activeConsultation._id, conversationId: id }
          );
        } catch (_) {}
      }

      await activeConsultation.save();

      // Emit live consultation progress update to room
      try {
        const io = getIO();
        io.to(id).emit('consultationUpdated', {
          questionId: activeConsultation._id,
          quotaUsed: activeConsultation.quotaUsed,
          quotaTotal: activeConsultation.quotaTotal,
          status: activeConsultation.status,
          escrowStatus: activeConsultation.escrowStatus
        });
      } catch (_) {}
    }

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
    const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : req.protocol);
    const fileUrl = `${proto}://${host}/uploads/${uniqueFileName}`;

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
