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
    // 1. Check for Expired Pending Questions (72 hours)
    const expiredQuestions = await Question.find({
      status: 'pending',
      expiresAt: { $lt: now }
    });

    for (const question of expiredQuestions) {
      try {
        console.log(`[Scheduler] Expiring question: ${question._id}`);
        question.status = 'declined';
        await question.save();

        // Release the escrow hold
        const escrowTx = await Transaction.findOne({
          'metadata.questionId': question._id,
          status: 'pending'
        });

        if (escrowTx) {
          escrowTx.status = 'failed';
          escrowTx.description = 'Expired question hold release';
          await escrowTx.save();
        } else {
          // Fallback: Credit seeker directly via refund
          const refundTx = new Transaction({
            user: question.seeker,
            amount: question.price,
            type: 'refund',
            status: 'success',
            description: 'Refund: Expired question'
          });
          await refundTx.save();
        }

        // Notify seeker via Sockets and Push
        try {
          getIO().to(`user:${question.seeker}`).emit('notification', {
            type: 'question_declined',
            title: 'Question Expired ⏰',
            body: 'Your question has expired unanswered. Your funds have been refunded to your wallet.',
            data: { questionId: question._id }
          });
          
          await sendPushNotification(
            question.seeker.toString(),
            'Question Expired ⏰',
            'Your question has expired unanswered. Your funds have been refunded to your wallet.',
            { questionId: question._id.toString() }
          );
        } catch (notifyErr) {
          console.error('[Scheduler] Notification failed for question expiry:', notifyErr);
        }
      } catch (err) {
        console.error(`[Scheduler] Error processing question expiry ${question._id}:`, err);
      }
    }

    // 2. Check for Expired Call Bookings (Scheduled time is in the past, and status is still 'pending' unconfirmed)
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
