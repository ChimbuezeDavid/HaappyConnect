import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import crypto from 'crypto';
import { sendPushNotification } from '../utils/push';

const router = Router();

// Helper to calculate wallet balance metrics
async function calculateBalance(userId: string) {
  const transactions = await Transaction.find({ user: userId });

  let availableBalance = 0;
  let pendingBalance = 0; // locked in escrow or pending payout
  let totalBalance = 0;

  let totalEarned = 0;
  let totalSpent = 0;

  for (const tx of transactions) {
    if (tx.status === 'success') {
      availableBalance += tx.amount;
      totalBalance += tx.amount;

      // Track stats
      if (tx.amount > 0 && (tx.type === 'charge' || tx.type === 'payout' || tx.type === 'refund')) {
        totalEarned += tx.amount;
      } else if (tx.amount < 0 && tx.type === 'charge') {
        totalSpent += Math.abs(tx.amount);
      }
    } else if (tx.status === 'pending') {
      if (tx.amount < 0) {
        // Holds / Pending payouts reduce spendable (available) balance immediately
        availableBalance += tx.amount;
        pendingBalance += Math.abs(tx.amount);
        totalBalance += tx.amount; // Seeker still technically owns it until final success
      }
    }
  }

  return {
    availableBalance: Math.max(0, availableBalance),
    pendingBalance,
    totalBalance: Math.max(0, totalBalance),
    totalEarned,
    totalSpent
  };
}

// GET /api/wallet/balance - Get detailed balance metrics
router.get('/balance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await calculateBalance(req.userId!);
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error calculating balance' });
  }
});

// GET /api/wallet/transactions - Paginated and filtered transactions
router.get('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const query: any = { user: req.userId };

    if (type && type !== 'all') {
      // Map frontend filters to DB types
      if (type === 'deposit') query.type = 'deposit';
      else if (type === 'withdrawal') query.type = 'withdrawal';
      else if (type === 'payment') query.type = 'charge';
      else if (type === 'refund') query.type = 'refund';
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error fetching transaction history' });
  }
});

// POST /api/wallet/deposit - Initialize a deposit (Paystack or Fallback Sandbox)
router.post('/deposit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, redirect_uri } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid deposit amount is required' });
    }
    if (!redirect_uri) {
      return res.status(400).json({ error: 'redirect_uri parameter is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const amountInNaira = Number(amount);
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

    // Production flow using Paystack API
    if (PAYSTACK_SECRET) {
      const reference = `hc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const initializeUrl = 'https://api.paystack.co/transaction/initialize';
      const paystackRes = await fetch(initializeUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user.email,
          amount: amountInNaira * 100, // Paystack works in kobo
          reference,
          callback_url: redirect_uri,
          metadata: {
            userId: user._id,
            redirect_uri
          }
        })
      });

      const responseData = await paystackRes.json() as any;
      if (!responseData.status) {
        return res.status(400).json({ error: responseData.message || 'Paystack initialization failed' });
      }

      // Create a pending transaction
      const transaction = new Transaction({
        user: user._id,
        amount: amountInNaira,
        type: 'deposit',
        status: 'pending',
        reference,
        description: `Deposit via Paystack`,
        metadata: { redirect_uri }
      });
      await transaction.save();

      return res.json({
        authorizationUrl: responseData.data.authorization_url,
        reference,
        isMock: false
      });
    }

    // fallback Mock Flow for local testing
    const reference = `hc_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const transaction = new Transaction({
      user: user._id,
      amount: amountInNaira,
      type: 'deposit',
      status: 'pending',
      reference,
      description: `Deposit (Simulated sandbox)`,
      metadata: { redirect_uri }
    });
    await transaction.save();

    const mockCheckoutUrl = `${req.protocol}://${req.get('host')}/api/wallet/mock-checkout?` +
      `reference=${reference}&` +
      `amount=${amountInNaira}&` +
      `redirect_uri=${encodeURIComponent(redirect_uri)}`;

    res.json({
      authorizationUrl: mockCheckoutUrl,
      reference,
      isMock: true
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error initializing deposit' });
  }
});

// POST /api/wallet/verify - Verify a transaction (Paystack or Mock validation)
router.post('/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ error: 'Transaction reference is required' });
    }

    const transaction = await Transaction.findOne({ reference });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction record not found' });
    }

    if (transaction.status !== 'pending') {
      return res.json({ message: 'Transaction already completed', transaction });
    }

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

    if (PAYSTACK_SECRET && !reference.startsWith('hc_mock_')) {
      // Fetch status from Paystack
      const verifyUrl = `https://api.paystack.co/transaction/verify/${reference}`;
      const paystackRes = await fetch(verifyUrl, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
      });

      const responseData = await paystackRes.json() as any;
      if (responseData.status && responseData.data.status === 'success') {
        transaction.status = 'success';
        await transaction.save();
        return res.json({ message: 'Transaction verified successfully', transaction });
      } else {
        transaction.status = 'failed';
        await transaction.save();
        return res.status(400).json({ error: 'Transaction verification failed on gateway', transaction });
      }
    }

    // Mock fallback response: if it's already updated, return it. Otherwise fail.
    // Transactions get resolved via the checkout callback.
    if (transaction.status === 'pending') {
      // For immediate local tests, we can default verification to success if not processed yet,
      // but standard mock checkout redirects to `/mock-callback` which sets it.
      // So if it's still pending here, we keep it pending or fail.
      return res.json({ message: 'Transaction verification is pending mock portal action', transaction });
    }

    res.json({ transaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error verifying transaction' });
  }
});

// POST /api/wallet/withdraw - Initiate payout request (Experts only)
router.post('/withdraw', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, bankName, accountNumber, accountName } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid payout amount is required' });
    }
    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({ error: 'Bank details (name, account number, account name) are required' });
    }



    const balanceMetrics = await calculateBalance(req.userId!);
    if (balanceMetrics.availableBalance < amount) {
      return res.status(400).json({ error: 'Insufficient available balance to complete withdrawal' });
    }

    const transaction = new Transaction({
      user: req.userId,
      amount: -Number(amount),
      type: 'withdrawal',
      status: 'pending',
      description: `Payout to ${bankName} (${accountNumber})`,
      metadata: {
        bankName,
        accountNumber,
        accountName
      }
    });
    await transaction.save();

    res.status(201).json({
      message: 'Withdrawal payout request submitted successfully',
      transaction
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error processing withdrawal' });
  }
});

// GET /api/wallet/mock-checkout - HTML mockup for Paystack Sandbox checkout page
router.get('/mock-checkout', (req, res) => {
  const { reference, amount, redirect_uri } = req.query;
  if (!reference || !amount || !redirect_uri) {
    return res.status(400).send('Required parameters (reference, amount, redirect_uri) missing.');
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HaappyConnect - Paystack Sandbox Checkout</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 24px;
      padding: 32px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
      text-align: center;
    }
    .header {
      margin-bottom: 24px;
    }
    .logo {
      font-size: 26px;
      font-weight: 950;
      color: #00d285;
      letter-spacing: -0.75px;
      margin-bottom: 6px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background-color: rgba(0, 210, 133, 0.15);
      color: #34d399;
      font-size: 10px;
      font-weight: 800;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border: 1px solid rgba(0, 210, 133, 0.2);
      margin-bottom: 12px;
    }
    .price-tag {
      font-size: 38px;
      font-weight: 800;
      color: #ffffff;
      margin: 12px 0;
    }
    .details {
      background-color: #0b0f19;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: left;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .details-row:last-child {
      margin-bottom: 0;
    }
    .label {
      color: #9ca3af;
    }
    .value {
      color: #ffffff;
      font-weight: 600;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn {
      padding: 16px;
      border-radius: 14px;
      font-weight: 800;
      font-size: 15px;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-success {
      background-color: #00d285;
      color: #000000;
    }
    .btn-success:hover {
      background-color: #05be79;
      box-shadow: 0 0 15px rgba(0, 210, 133, 0.3);
    }
    .btn-cancel {
      background-color: transparent;
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .btn-cancel:hover {
      background-color: rgba(239, 68, 68, 0.1);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">paystack</div>
      <div class="badge">Sandbox Checkout</div>
      <div class="price-tag">₦${Number(amount).toLocaleString()}</div>
    </div>

    <div class="details">
      <div class="details-row">
        <span class="label">Merchant</span>
        <span class="value">HaappyConnect Marketplace</span>
      </div>
      <div class="details-row">
        <span class="label">Reference</span>
        <span class="value" style="font-family: monospace;">${reference}</span>
      </div>
    </div>

    <form action="/api/wallet/mock-callback" method="POST" class="actions">
      <input type="hidden" name="reference" value="${reference}">
      <input type="hidden" name="redirect_uri" value="${redirect_uri}">
      
      <button type="submit" name="action" value="success" class="btn btn-success">Simulate Payment Success</button>
      <button type="submit" name="action" value="failed" class="btn btn-cancel">Decline & Cancel Payment</button>
    </form>
  </div>
</body>
</html>
  `;
  res.send(html);
});

// POST /api/wallet/mock-callback - Handles simulated payment result
router.post('/mock-callback', async (req: AuthRequest, res: Response) => {
  try {
    const { reference, redirect_uri, action } = req.body;
    if (!reference || !redirect_uri || !action) {
      return res.status(400).send('Required callback parameters missing.');
    }

    const transaction = await Transaction.findOne({ reference });
    if (!transaction) {
      return res.status(404).send('Transaction reference record not found.');
    }

    let status: 'success' | 'failed' = 'failed';
    if (action === 'success') {
      transaction.status = 'success';
      status = 'success';
    } else {
      transaction.status = 'failed';
    }
    await transaction.save();

    // Redirect back to client deep link
    const separator = redirect_uri.includes('?') ? '&' : '?';
    const finalUrl = `${redirect_uri}${separator}reference=${reference}&status=${status}`;
    res.redirect(finalUrl);
  } catch (error: any) {
    res.status(500).send(`Mock callback processing failed: ${error.message}`);
  }
});

// POST /api/wallet/webhook - Paystack Webhook Receiver
router.post('/webhook', async (req, res) => {
  try {
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const bypassSignature = isDevelopment && req.headers['x-mock-webhook'] === 'true';

    if (!PAYSTACK_SECRET && !bypassSignature) {
      console.warn('[Webhook] PAYSTACK_SECRET_KEY is not configured.');
      return res.sendStatus(400);
    }

    if (!bypassSignature) {
      const signature = req.headers['x-paystack-signature'];
      if (!signature) {
        return res.status(401).send('Signature missing');
      }

      // Verify signature using HMAC SHA512
      const computedSignature = crypto
        .createHmac('sha512', PAYSTACK_SECRET!)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (computedSignature !== signature) {
        console.warn('[Webhook] Signature verification failed');
        return res.status(401).send('Invalid signature');
      }
    }

    const event = req.body;
    console.log(`[Webhook] Received Paystack event: ${event.event}`);

    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;
      const amountInNaira = data.amount / 100; // Paystack sends in kobo

      // Find the pending transaction
      let transaction = await Transaction.findOne({ reference });

      if (transaction) {
        if (transaction.status === 'pending') {
          transaction.status = 'success';
          await transaction.save();
          console.log(`[Webhook] Updated transaction ${reference} to success`);
          
          // Notify user
          try {
            const { getIO } = require('../socket');
            getIO().to(`user:${transaction.user.toString()}`).emit('notification', {
              type: 'deposit_verified',
              title: 'Deposit Successful 💸',
              body: `Your deposit of ₦${amountInNaira.toLocaleString()} has been verified successfully.`,
              data: { reference }
            });
            await sendPushNotification(
              transaction.user.toString(),
              'Deposit Successful 💸',
              `Your deposit of ₦${amountInNaira.toLocaleString()} has been verified successfully.`,
              { reference }
            );
          } catch (notifyErr) {
            console.error('[Webhook] Notification error:', notifyErr);
          }
        }
      } else {
        // Fallback safety recovery: if transaction doesn't exist, create it!
        const userId = data.metadata?.userId;
        if (userId) {
          const userExists = await User.findById(userId);
          if (userExists) {
            transaction = new Transaction({
              user: userId,
              amount: amountInNaira,
              type: 'deposit',
              status: 'success',
              reference,
              description: `Deposit via Paystack Webhook (recovery)`
            });
            await transaction.save();
            console.log(`[Webhook] Created and resolved missing transaction ${reference} for user ${userId}`);

            // Notify user
            try {
              const { getIO } = require('../socket');
              getIO().to(`user:${userId.toString()}`).emit('notification', {
                type: 'deposit_verified',
                title: 'Deposit Successful 💸',
                body: `Your deposit of ₦${amountInNaira.toLocaleString()} has been verified successfully.`,
                data: { reference }
              });
              await sendPushNotification(
                userId.toString(),
                'Deposit Successful 💸',
                `Your deposit of ₦${amountInNaira.toLocaleString()} has been verified successfully.`,
                { reference }
              );
            } catch (notifyErr) {
              console.error('[Webhook] Notification error:', notifyErr);
            }
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error: any) {
    console.error('[Webhook] Error processing webhook:', error);
    res.status(500).send('Webhook error');
  }
});

export default router;
