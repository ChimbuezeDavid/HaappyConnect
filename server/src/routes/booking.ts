import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Booking } from '../models/Booking';
import { Profile } from '../models/Profile';
import { Transaction } from '../models/Transaction';
import { Review } from '../models/Review';
import { Conversation } from '../models/Conversation';
import { Availability } from '../models/Availability';

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

    try {
      const { getIO } = require('../socket');
      getIO().to(`user:${expertId}`).emit('notification', {
        type: 'new_booking',
        title: 'New Booking Request 📅',
        body: `You have a new ${durationMinutes}-minute call booking request.`,
        data: { bookingId: booking._id }
      });
    } catch (_) {}
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

    try {
      const { getIO } = require('../socket');
      const notifyUserId = booking.seeker.toString() === req.userId
        ? booking.expert
        : booking.seeker;
      const statusMessages: Record<string, { title: string; body: string }> = {
        confirmed: { title: 'Booking Confirmed! ✅', body: 'Your call booking has been confirmed by the expert.' },
        completed: { title: 'Call Completed 🎓', body: 'Your consultation session has been marked as completed.' },
        cancelled: { title: 'Booking Cancelled', body: 'A booking has been cancelled. Any charges have been refunded.' }
      };
      const msg = statusMessages[status];
      if (msg) {
        getIO().to(`user:${notifyUserId}`).emit('notification', {
          type: `booking_${status}`,
          title: msg.title,
          body: msg.body,
          data: { bookingId: booking._id }
        });
      }
    } catch (_) {}
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error updating booking status' });
  }
});

// GET /booking/my-availability - Retrieve own availability settings (Experts only)
router.get('/my-availability', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    let availability = await Availability.findOne({ expert: req.userId });
    if (!availability) {
      availability = new Availability({ expert: req.userId });
      await availability.save();
    }
    res.json(availability);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error fetching availability' });
  }
});

// PUT /booking/my-availability - Update availability settings (Experts only)
router.put('/my-availability', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'expert') {
      return res.status(403).json({ error: 'Only experts can configure availability.' });
    }
    const { weeklyHours, timezone } = req.body;
    let availability = await Availability.findOne({ expert: req.userId });
    if (!availability) {
      availability = new Availability({ expert: req.userId, weeklyHours, timezone });
    } else {
      availability.weeklyHours = weeklyHours;
      if (timezone) availability.timezone = timezone;
    }
    await availability.save();
    res.json(availability);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error saving availability' });
  }
});

// GET /booking/availability/:expertId - Retrieve active available slots for an expert on a date
router.get('/availability/:expertId', async (req, res) => {
  try {
    const { expertId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!date) {
      return res.status(400).json({ error: 'Date query parameter (YYYY-MM-DD) is required.' });
    }

    const queryDate = new Date(date as string);
    if (isNaN(queryDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    const dayOfWeek = queryDate.getDay();

    let availability = await Availability.findOne({ expert: expertId });
    if (!availability) {
      availability = new Availability({ expert: expertId });
    }

    const schedule = availability.weeklyHours.find(s => s.dayOfWeek === dayOfWeek);
    if (!schedule || !schedule.enabled || schedule.slots.length === 0) {
      return res.json([]);
    }

    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const activeBookings = await Booking.find({
      expert: expertId,
      status: { $ne: 'cancelled' },
      scheduledAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const freeSlots: string[] = [];

    const parseTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const d = new Date(queryDate);
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    const formatTime12h = (d: Date) => {
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minStr = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${minStr} ${ampm}`;
    };

    const slotDurationMs = 30 * 60 * 1000;

    for (const range of schedule.slots) {
      const rangeStart = parseTime(range.start);
      const rangeEnd = parseTime(range.end);

      let current = new Date(rangeStart);

      while (current.getTime() + slotDurationMs <= rangeEnd.getTime()) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current.getTime() + slotDurationMs);

        const isOverlap = activeBookings.some(booking => {
          const bStart = new Date(booking.scheduledAt).getTime();
          const bEnd = bStart + booking.durationMinutes * 60 * 1000;
          return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
        });

        if (!isOverlap) {
          const now = new Date();
          if (slotStart.getTime() > now.getTime()) {
            freeSlots.push(formatTime12h(slotStart));
          }
        }

        current = new Date(current.getTime() + slotDurationMs);
      }
    }

    res.json(freeSlots);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error calculating availability' });
  }
});

export default router;
