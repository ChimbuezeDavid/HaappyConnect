import { Router, Request, Response } from 'express';
import { sendSupportTicketEmail } from '../services/email';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// POST /api/support/ticket - Submit support ticket
router.post('/ticket', async (req: Request, res: Response) => {
  try {
    const { email, name, category = 'General Inquiry', subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    let senderEmail = email;
    let senderName = name || 'Haappy User';
    let userRole = 'User';

    // Check if auth token is present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
        const user = await User.findById(decoded.userId);
        const profile = await Profile.findOne({ user: decoded.userId });
        if (user && user.email) {
          senderEmail = user.email;
        }
        if (profile && profile.fullName) {
          senderName = profile.fullName;
        }
        userRole = user?.role ? (user.role === 'expert' ? 'Expert' : user.role === 'admin' ? 'Admin' : 'Seeker') : decoded.role || 'Seeker';
      } catch (_) {}
    }

    if (!senderEmail) {
      return res.status(400).json({ error: 'A valid contact email address is required' });
    }

    const success = await sendSupportTicketEmail({
      fromUserEmail: senderEmail,
      userName: senderName,
      userRole,
      category,
      subject,
      message
    });

    if (!success) {
      return res.status(500).json({ error: 'Failed to dispatch support ticket via email. Please try again.' });
    }

    res.json({
      message: 'Support ticket submitted successfully. A confirmation email has been sent to your inbox.',
      ticket: {
        category,
        subject,
        submittedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error submitting support ticket' });
  }
});

export default router;
