import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Transaction } from '../models/Transaction';

const router = Router();

// Get wallet balance and ledger history
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await Transaction.find({ user: req.userId }).sort({ createdAt: -1 });

    // Calculate balance from transaction ledger
    const actualBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    // Provide a virtual starting credit of $1000 to users for dev testing
    const initialDevCredit = 1000;
    const balance = initialDevCredit + actualBalance;

    res.json({
      balance,
      transactions
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error fetching wallet data' });
  }
});

// Add funds (for development)
router.post('/add-funds', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid deposit amount is required' });
    }

    const transaction = new Transaction({
      user: req.userId,
      amount: Number(amount),
      type: 'refund',
      description: `Deposited funds to wallet via app`
    });
    await transaction.save();

    res.status(201).json({
      message: 'Funds added successfully',
      transaction
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error depositing funds' });
  }
});

export default router;
