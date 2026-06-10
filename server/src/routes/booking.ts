import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Booking } from '../models/Booking';
import { Profile } from '../models/Profile';
import { Transaction } from '../models/Transaction';
import { Review } from '../models/Review';
import { Conversation } from '../models/Conversation';

const router = Router();

// Get bookings for logged in user (either seeker or expert)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const isExpert = req.userRole === 'expert';
    const filter = isExpert ? { $or: [{ expert: req.userId }, { seeker: req.userId }] } : { seeker: req.userId };

    const bookings = await Booking.find(filter)
      .populate('seeker', 'email')
      .populate('expert', 'email')
      .sort({ scheduledAt: 1 });

    // Populate user profiles to show names
    const populatedBookings = await Promise.all(
      bookings.map(async booking => {
        const seekerProfile = await Profile.findOne({ user: booking.seeker });
        const expertProfile = await Profile.findOne({ user: booking.expert });
        const hasReview = await Review.exists({ booking: booking._id });
        return {
          ...booking.toObject(),
          seekerProfile,
          expertProfile,
          hasReview: !!hasReview
        };
      })
    );

    res.json(populatedBookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error fetching bookings' });
  }
});

// Create booking (Book a live call)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { expertId, scheduledAt, durationMinutes } = req.body;
    if (!expertId || !scheduledAt || !durationMinutes) {
      return res.status(400).json({ error: 'ExpertId, scheduled time, and duration are required' });
    }

    const expertProfile = await Profile.findOne({ user: expertId });
    if (!expertProfile) {
      return res.status(404).json({ error: 'Expert profile not found' });
    }

    const price = (expertProfile.hourlyRate / 60) * durationMinutes;

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

    const booking = new Booking({
      seeker: req.userId,
      expert: expertId,
      status: 'pending',
      price,
      scheduledAt: new Date(scheduledAt),
      durationMinutes,
      meetingLink: `https://meet.jit.si/haappy-connect-${Math.random().toString(36).substring(2, 9)}`
    });

    await booking.save();

    // Create a Seeker debit transaction placeholder as a pending escrow hold
    const transaction = new Transaction({
      user: req.userId,
      amount: -price,
      type: 'charge',
      status: 'pending',
      description: `Pending live call hold with expert ${expertProfile.fullName}`,
      metadata: { bookingId: booking._id }
    });
    await transaction.save();

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error creating booking' });
  }
});

// Update booking status (e.g. confirm, complete, cancel)
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status update' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check authorization: only participants can change status
    if (booking.seeker.toString() !== req.userId && booking.expert.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to modify this booking' });
    }

    // Prevent double processing
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({ error: `Booking has already been finalized as ${booking.status}` });
    }

    booking.status = status;
    await booking.save();

    // Auto-create conversation when booking is confirmed
    if (status === 'confirmed') {
      const existingConv = await Conversation.findOne({
        participants: { $all: [booking.seeker, booking.expert] },
        'relatedTo.modelType': 'Booking',
        'relatedTo.id': booking._id
      });
      if (!existingConv) {
        const conv = new Conversation({
          participants: [booking.seeker, booking.expert],
          unreadCounts: [
            { user: booking.seeker, count: 0 },
            { user: booking.expert, count: 0 }
          ],
          relatedTo: { modelType: 'Booking', id: booking._id }
        });
        await conv.save();
      }
    }

    // Find the original pending transaction
    const escrowTx = await Transaction.findOne({
      'metadata.bookingId': booking._id,
      status: 'pending'
    });

    // If completed, finalize the hold and credit the expert (earnings)
    if (status === 'completed') {
      if (escrowTx) {
        escrowTx.status = 'success';
        escrowTx.description = `Completed live call payment`;
        await escrowTx.save();
      }

      const expertProfile = await Profile.findOne({ user: booking.expert });
      const transaction = new Transaction({
        user: booking.expert,
        amount: booking.price * 0.8, // 80% to expert, 20% platform fee
        type: 'charge',
        status: 'success',
        description: `Earnings: Completed live call booking`,
        metadata: { bookingId: booking._id }
      });
      await transaction.save();
    }

    // If cancelled, fail the hold to release funds back to the seeker
    if (status === 'cancelled') {
      if (escrowTx) {
        escrowTx.status = 'failed';
        escrowTx.description = `Cancelled live call hold release`;
        await escrowTx.save();
      } else {
        // Fallback for legacy items: issue a refund transaction
        const refundTx = new Transaction({
          user: booking.seeker,
          amount: booking.price,
          type: 'refund',
          status: 'success',
          description: `Refund: Cancelled live call booking`
        });
        await refundTx.save();
      }
    }

    res.json({
      message: `Booking status updated to ${status}`,
      booking
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error updating booking status' });
  }
});

export default router;
