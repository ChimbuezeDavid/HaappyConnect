import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Review } from '../models/Review';
import { Booking } from '../models/Booking';
import { Question } from '../models/Question';
import { Profile } from '../models/Profile';

const router = Router();

// POST /api/review - Submit a review for an expert
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { expertId, rating, comment, bookingId, questionId } = req.body;

    if (!expertId || !rating) {
      return res.status(400).json({ error: 'ExpertId and rating are required' });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // Verify role: only seekers can review experts
    if (req.userRole !== 'seeker') {
      return res.status(403).json({ error: 'Only Seekers can submit reviews' });
    }

    // Prevent self-reviews
    if (req.userId === expertId) {
      return res.status(400).json({ error: 'You cannot submit a review for yourself' });
    }

    // Verify transaction history (Must be linked to a completed booking or answered question)
    if (!bookingId && !questionId) {
      return res.status(400).json({ error: 'A review must be linked to a completed booking or answered question' });
    }

    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ error: 'Linked booking not found' });
      }
      if (booking.seeker.toString() !== req.userId || booking.expert.toString() !== expertId) {
        return res.status(403).json({ error: 'You are not authorized to review this booking' });
      }
      if (booking.status !== 'completed') {
        return res.status(400).json({ error: 'You can only review completed call bookings' });
      }

      // Check if already reviewed
      const duplicate = await Review.findOne({ booking: bookingId });
      if (duplicate) {
        return res.status(400).json({ error: 'You have already submitted a review for this booking' });
      }
    }

    if (questionId) {
      const question = await Question.findById(questionId);
      if (!question) {
        return res.status(404).json({ error: 'Linked question not found' });
      }
      if (question.seeker.toString() !== req.userId || question.expert.toString() !== expertId) {
        return res.status(403).json({ error: 'You are not authorized to review this question' });
      }
      if (question.status !== 'answered') {
        return res.status(400).json({ error: 'You can only review answered questions' });
      }

      // Check if already reviewed
      const duplicate = await Review.findOne({ question: questionId });
      if (duplicate) {
        return res.status(400).json({ error: 'You have already submitted a review for this question' });
      }
    }

    // Save review
    const review = new Review({
      seeker: req.userId,
      expert: expertId,
      rating: numericRating,
      comment: comment || '',
      booking: bookingId || undefined,
      question: questionId || undefined
    });
    await review.save();

    // Recalculate Expert Rating Average and Reviews Count
    const reviews = await Review.find({ expert: expertId });
    const reviewsCount = reviews.length;
    const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
    const ratingAverage = reviewsCount > 0 ? ratingSum / reviewsCount : 0;

    await Profile.findOneAndUpdate(
      { user: expertId },
      { ratingAverage, reviewsCount }
    );

    res.status(201).json({
      message: 'Review submitted successfully',
      review
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error submitting review' });
  }
});

// GET /api/review/expert/:expertId - Get all reviews for an expert
router.get('/expert/:expertId', async (req, res) => {
  try {
    const reviews = await Review.find({ expert: req.params.expertId })
      .sort({ createdAt: -1 })
      .populate('seeker', 'email');

    // Populate seeker profile details for frontend rendering
    const populatedReviews = await Promise.all(
      reviews.map(async (rev) => {
        const seekerProfile = await Profile.findOne({ user: rev.seeker });
        return {
          ...rev.toObject(),
          seekerProfile
        };
      })
    );

    res.json(populatedReviews);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error fetching expert reviews' });
  }
});

export default router;
