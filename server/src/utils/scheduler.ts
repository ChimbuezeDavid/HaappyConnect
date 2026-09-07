import { Question } from '../models/Question';
import { Booking } from '../models/Booking';
import { Transaction } from '../models/Transaction';
import { sendPushNotification } from './push';
import { getIO } from '../socket';

export function startExpirationScheduler() {
  console.log('[Scheduler] Expiration scheduler started.');
  // Run once immediately on start
  checkExpiredItems();
  // Then run every hour (3600000 ms)
  setInterval(checkExpiredItems, 3600000);
}

async function checkExpiredItems() {
  const now = new Date();
  console.log(`[Scheduler] Checking for expired questions and bookings at ${now.toISOString()}...`);

  try {
    // 1. Check for Expired Pending Questions (Mark as expired so client can extend 24h or refund)
    const expiredQuestions = await Question.find({
      status: 'pending',
      expiresAt: { $lt: now }
    });

    for (const question of expiredQuestions) {
      try {
        console.log(`[Scheduler] Marking question expired: ${question._id}`);
        question.status = 'expired';
        await question.save();

        // Notify seeker via Sockets and Push (Clean text, no emojis)
        try {
          getIO().to(`user:${question.seeker}`).emit('notification', {
            type: 'question_expired',
            title: 'Consultation Deadline Expired',
            body: 'Your expert did not respond within the timeframe. You can extend the deadline by 24 hours or claim an instant refund.',
            data: { questionId: question._id, conversationId: question.conversation }
          });
          
          await sendPushNotification(
            question.seeker.toString(),
            'Consultation Deadline Expired',
            'Your expert did not respond within the timeframe. You can extend the deadline by 24 hours or claim an instant refund.',
            { questionId: question._id.toString(), conversationId: question.conversation ? question.conversation.toString() : '' }
          );

          // Also notify expert about the missed deadline
          getIO().to(`user:${question.expert}`).emit('notification', {
            type: 'question_sla_missed',
            title: 'Consultation Deadline Passed',
            body: 'A consultation request passed without your response and is now eligible for client cancellation.',
            data: { questionId: question._id }
          });

          await sendPushNotification(
            question.expert.toString(),
            'Consultation Deadline Passed',
            'A consultation request passed without your response and is now eligible for client cancellation.',
            { questionId: question._id.toString() }
          );
        } catch (_) {}
      } catch (err) {
        console.error(`[Scheduler] Error updating expired question ${question._id}:`, err);
      }
    }

    // 2. Check for stale expired questions (expired for > 5 days without client action) -> auto-refund
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const staleExpiredQuestions = await Question.find({
      status: 'expired',
      updatedAt: { $lt: fiveDaysAgo },
      escrowStatus: 'held'
    });

    for (const question of staleExpiredQuestions) {
      try {
        question.escrowStatus = 'refunded';
        await question.save();

        const refundTx = new Transaction({
          user: question.seeker,
          amount: question.price,
          type: 'refund',
          status: 'success',
          description: 'Automatic refund for unresolved expired consultation',
          metadata: { questionId: question._id }
        });
        await refundTx.save();
      } catch (err) {
        console.error(`[Scheduler] Error auto-refunding stale question ${question._id}:`, err);
      }
    }

    // 3. Check for Expired Call Bookings (Scheduled time is in the past, and status is still 'pending' unconfirmed)
    const expiredBookings = await Booking.find({
      status: 'pending',
      scheduledAt: { $lt: now }
    });

    for (const booking of expiredBookings) {
      try {
        console.log(`[Scheduler] Expiring unconfirmed booking: ${booking._id}`);
        booking.status = 'cancelled';
        await booking.save();

        // Release the hold
        const escrowTx = await Transaction.findOne({
          'metadata.bookingId': booking._id,
          status: 'pending'
        });

        if (escrowTx) {
          escrowTx.status = 'failed';
          escrowTx.description = 'Expired unconfirmed booking hold release';
          await escrowTx.save();
        } else {
          // Fallback: Refund seeker
          const refundTx = new Transaction({
            user: booking.seeker,
            amount: booking.price,
            type: 'refund',
            status: 'success',
            description: 'Refund: Expired call booking'
          });
          await refundTx.save();
        }

        // Notify Seeker
        try {
          getIO().to(`user:${booking.seeker}`).emit('notification', {
            type: 'booking_cancelled',
            title: 'Booking Expired ⏰',
            body: 'Your live call booking expired without confirmation. Funds have been refunded.',
            data: { bookingId: booking._id }
          });

          await sendPushNotification(
            booking.seeker.toString(),
            'Booking Expired ⏰',
            'Your live call booking expired without confirmation. Funds have been refunded.',
            { bookingId: booking._id.toString() }
          );
        } catch (notifyErr) {
          console.error('[Scheduler] Notification failed for booking expiry:', notifyErr);
        }
      } catch (err) {
        console.error(`[Scheduler] Error processing booking expiry ${booking._id}:`, err);
      }
    }

  } catch (globalErr) {
    console.error('[Scheduler] Global scheduler run error:', globalErr);
  }
}
