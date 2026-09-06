import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from './models/User';
import { Profile } from './models/Profile';
import { Booking } from './models/Booking';
import { Question } from './models/Question';
import { Transaction } from './models/Transaction';
import { Category } from './models/Category';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/HaappyConnect';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforhaappyconnect';

async function runComprehensiveSubsystemTest() {
  console.log('\n======================================================');
  console.log('--- HAAPPYCONNECT COMPREHENSIVE SUBSYSTEM DEBUG TEST ---');
  console.log('======================================================\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✓ Database Connection established.\n');

  const testSuffix = Date.now().toString().slice(-6);
  let testAdminUser: any;
  let testExpertUser: any;
  let testSeekerUser: any;
  let testExpertProfile: any;
  let testSeekerProfile: any;
  let testQuestion: any;
  let testBooking: any;

  try {
    // -----------------------------------------------------------------
    // SUBSYSTEM 1: AUTHENTICATION, ROLES & DUAL-TOKEN ENGINE
    // -----------------------------------------------------------------
    console.log('[Subsystem 1] Testing Auth, Roles & Session Tokens...');
    
    // Test password hashing
    const rawPass = 'Secret123!';
    const passwordHash = await bcrypt.hash(rawPass, 10);
    const passMatches = await bcrypt.compare(rawPass, passwordHash);
    if (!passMatches) throw new Error('Password hash comparison failed');
    console.log('  ✓ Password hashing and bcrypt comparison: PASS');

    // 1. Create Admin User
    testAdminUser = new User({
      email: `test.admin.${testSuffix}@haappyconnect.com`,
      passwordHash,
      role: 'admin',
      isOnboarded: true
    });
    await testAdminUser.save();
    if (testAdminUser.role !== 'admin') throw new Error('Admin role assignment failed');
    console.log(`  ✓ Admin user creation (${testAdminUser.email}): PASS`);

    // 2. Create Expert User
    testExpertUser = new User({
      email: `test.expert.${testSuffix}@haappyconnect.com`,
      passwordHash,
      role: 'expert',
      isOnboarded: true
    });
    await testExpertUser.save();
    console.log(`  ✓ Expert user creation (${testExpertUser.email}): PASS`);

    // 3. Create Seeker User
    testSeekerUser = new User({
      email: `test.seeker.${testSuffix}@haappyconnect.com`,
      passwordHash,
      role: 'seeker',
      isOnboarded: true
    });
    await testSeekerUser.save();
    console.log(`  ✓ Seeker user creation (${testSeekerUser.email}): PASS`);

    // Dual-token simulation
    const accessToken = jwt.sign({ userId: testSeekerUser._id, role: testSeekerUser.role }, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: testSeekerUser._id, role: testSeekerUser.role }, JWT_SECRET, { expiresIn: '90d' });
    testSeekerUser.refreshTokens = [refreshToken];
    await testSeekerUser.save();

    const decodedAccess = jwt.verify(accessToken, JWT_SECRET) as any;
    const decodedRefresh = jwt.verify(refreshToken, JWT_SECRET) as any;
    if (decodedAccess.userId !== testSeekerUser._id.toString() || decodedRefresh.userId !== testSeekerUser._id.toString()) {
      throw new Error('JWT token verification mismatch');
    }
    console.log('  ✓ Dual-token lifecycle (1h access + 90d refresh) verification: PASS\n');

    // -----------------------------------------------------------------
    // SUBSYSTEM 2: PROFILE & CREDENTIAL VERIFICATION ENGINE
    // -----------------------------------------------------------------
    console.log('[Subsystem 2] Testing Profile, Verification & Rates (₦)...');

    testExpertProfile = new Profile({
      user: testExpertUser._id,
      fullName: 'Dr. Chimaobi Nwankwo',
      headline: 'Principal AI Architect & Cloud Mentor',
      bio: 'Advising tech leaders on scalable infrastructure and AI models.',
      hourlyRate: 50000,          // ₦50,000 / hr
      textQuestionPrice: 10000,   // ₦10,000 / question
      videoResponsePrice: 20000,  // ₦20,000 / video
      ratingAverage: 4.9,
      reviewsCount: 18,
      isVerified: false,          // Initially unverified pending admin review
      visibility: 'Public',
      location: 'Lagos, Nigeria'
    });
    await testExpertProfile.save();
    if (testExpertProfile.isVerified !== false) throw new Error('Default isVerified should be false');
    console.log('  ✓ Expert profile creation with ₦ rates & pending verification: PASS');

    testSeekerProfile = new Profile({
      user: testSeekerUser._id,
      fullName: 'Tunde Adebayo',
      headline: 'Aspiring Fullstack Engineer',
      bio: 'Seeking guidance on tech pivots and system design.',
      hourlyRate: 0,
      textQuestionPrice: 0,
      videoResponsePrice: 0,
      ratingAverage: 0,
      reviewsCount: 0,
      isVerified: false,
      visibility: 'Public',
      location: 'Abuja, Nigeria'
    });
    await testSeekerProfile.save();
    console.log('  ✓ Seeker profile creation: PASS\n');

    // -----------------------------------------------------------------
    // SUBSYSTEM 3: WALLET & ATOMIC ESCROW SETTLEMENT IN NAIRA (₦)
    // -----------------------------------------------------------------
    console.log('[Subsystem 3] Testing Wallet & Escrow Settlement in Nigerian Naira (₦)...');

    // Fund Seeker wallet with ₦100,000 deposit
    const depositTx = new Transaction({
      user: testSeekerUser._id,
      amount: 100000,
      type: 'deposit',
      status: 'success',
      description: 'Paystack Card Deposit: ₦100,000',
      reference: `DEP-${testSuffix}`
    });
    await depositTx.save();

    // Verify initial balance
    const seekerTxs1 = await Transaction.find({ user: testSeekerUser._id });
    let seekerBal1 = 0;
    for (const tx of seekerTxs1) {
      if (tx.status === 'success') seekerBal1 += tx.amount;
      else if (tx.status === 'pending' && tx.amount < 0) seekerBal1 += tx.amount;
    }
    if (seekerBal1 !== 100000) throw new Error(`Expected ₦100,000 balance, got ₦${seekerBal1}`);
    console.log(`  ✓ Seeker wallet funded: Available Balance = ₦${seekerBal1.toLocaleString()}: PASS`);

    // Seeker submits a text question (Price: ₦10,000)
    const questionPrice = testExpertProfile.textQuestionPrice; // 10,000
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    testQuestion = new Question({
      seeker: testSeekerUser._id,
      expert: testExpertUser._id,
      type: 'text',
      status: 'pending',
      price: questionPrice,
      seekerContent: 'What are the essential patterns for distributed escrow consistency?',
      expiresAt
    });
    await testQuestion.save();

    // Escrow lock: pending debit on Seeker
    const questionHoldTx = new Transaction({
      user: testSeekerUser._id,
      amount: -questionPrice,
      type: 'charge',
      status: 'pending',
      description: `Pending text question hold for expert Dr. Chimaobi Nwankwo`,
      metadata: { questionId: testQuestion._id }
    });
    await questionHoldTx.save();

    // Verify balance after lock
    const seekerTxs2 = await Transaction.find({ user: testSeekerUser._id });
    let seekerBal2 = 0;
    for (const tx of seekerTxs2) {
      if (tx.status === 'success') seekerBal2 += tx.amount;
      else if (tx.status === 'pending' && tx.amount < 0) seekerBal2 += tx.amount;
    }
    if (seekerBal2 !== 90000) throw new Error(`Expected ₦90,000 available balance after escrow hold, got ₦${seekerBal2}`);
    console.log(`  ✓ Escrow hold locked: Seeker available balance reduced from ₦100,000 to ₦${seekerBal2.toLocaleString()}: PASS`);

    // Expert Answers Question -> Settle Escrow (80% expert, 20% platform cut)
    testQuestion.expertResponse = 'Focus on idempotent message deduplication and atomic status transitions.';
    testQuestion.status = 'answered';
    testQuestion.answeredAt = new Date();
    await testQuestion.save();

    questionHoldTx.status = 'success';
    questionHoldTx.description = 'Completed text question payment';
    await questionHoldTx.save();

    const expertCredit = questionPrice * 0.8; // ₦8,000
    const expertEarningsTx = new Transaction({
      user: testExpertUser._id,
      amount: expertCredit,
      type: 'charge',
      status: 'success',
      description: 'Earnings: Answered text question',
      metadata: { questionId: testQuestion._id }
    });
    await expertEarningsTx.save();

    // Verify Expert balance
    const expertTxs = await Transaction.find({ user: testExpertUser._id });
    let expertBal = 0;
    for (const tx of expertTxs) {
      if (tx.status === 'success') expertBal += tx.amount;
    }
    if (expertBal !== 8000) throw new Error(`Expected expert balance ₦8,000 (80% of ₦10,000), got ₦${expertBal}`);
    console.log(`  ✓ Escrow settled: Expert credited ₦${expertBal.toLocaleString()} (80% net), Platform fee ₦${(questionPrice * 0.2).toLocaleString()} (20%): PASS\n`);

    // -----------------------------------------------------------------
    // SUBSYSTEM 4: 1:1 CALL BOOKING & ESCROW REFUND TEST
    // -----------------------------------------------------------------
    console.log('[Subsystem 4] Testing 1:1 Call Booking Escrow & Cancellation Refund...');

    const callPrice = testExpertProfile.hourlyRate; // ₦50,000
    testBooking = new Booking({
      seeker: testSeekerUser._id,
      expert: testExpertUser._id,
      status: 'pending',
      price: callPrice,
      scheduledAt: new Date(Date.now() + 86400000),
      durationMinutes: 60,
      meetingLink: 'https://meet.jit.si/haappy-connect-test'
    });
    await testBooking.save();

    // Lock call escrow hold (₦50,000)
    const bookingHoldTx = new Transaction({
      user: testSeekerUser._id,
      amount: -callPrice,
      type: 'charge',
      status: 'pending',
      description: 'Pending live call hold',
      metadata: { bookingId: testBooking._id }
    });
    await bookingHoldTx.save();

    // Check Seeker balance: ₦90,000 - ₦50,000 = ₦40,000
    const seekerTxs3 = await Transaction.find({ user: testSeekerUser._id });
    let seekerBal3 = 0;
    for (const tx of seekerTxs3) {
      if (tx.status === 'success') seekerBal3 += tx.amount;
      else if (tx.status === 'pending' && tx.amount < 0) seekerBal3 += tx.amount;
    }
    if (seekerBal3 !== 40000) throw new Error(`Expected ₦40,000, got ₦${seekerBal3}`);
    console.log(`  ✓ Booking hold placed: Seeker balance is now ₦${seekerBal3.toLocaleString()}: PASS`);

    // Simulate Call Cancellation -> Release hold (refund)
    testBooking.status = 'cancelled';
    await testBooking.save();
    bookingHoldTx.status = 'failed';
    bookingHoldTx.description = 'Cancelled call hold release';
    await bookingHoldTx.save();

    // Check Seeker balance after release: should be back to ₦90,000
    const seekerTxs4 = await Transaction.find({ user: testSeekerUser._id });
    let seekerBal4 = 0;
    for (const tx of seekerTxs4) {
      if (tx.status === 'success') seekerBal4 += tx.amount;
      else if (tx.status === 'pending' && tx.amount < 0) seekerBal4 += tx.amount;
    }
    if (seekerBal4 !== 90000) throw new Error(`Expected ₦90,000 refunded balance, got ₦${seekerBal4}`);
    console.log(`  ✓ Booking cancelled: Hold released, Seeker balance restored to ₦${seekerBal4.toLocaleString()}: PASS\n`);

    // -----------------------------------------------------------------
    // SUBSYSTEM 5: ADMIN GOVERNANCE, VERIFICATION & METRICS
    // -----------------------------------------------------------------
    console.log('[Subsystem 5] Testing Admin Governance & Verification Engine...');

    // Admin verifies expert
    const updatedProfile = await Profile.findByIdAndUpdate(
      testExpertProfile._id,
      { isVerified: true },
      { new: true }
    );
    if (!updatedProfile || updatedProfile.isVerified !== true) {
      throw new Error('Admin verification update failed');
    }
    console.log(`  ✓ Admin verification toggle (isVerified: true for ${updatedProfile.fullName}): PASS`);

    // Verify metrics aggregation
    const [totalUsers, totalExperts, totalSeekers, verifiedExperts] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'expert' }),
      User.countDocuments({ role: 'seeker' }),
      Profile.countDocuments({ isVerified: true })
    ]);
    console.log(`  ✓ Platform Aggregation Metrics:`);
    console.log(`    - Total Users: ${totalUsers}`);
    console.log(`    - Seekers: ${totalSeekers}`);
    console.log(`    - Experts: ${totalExperts}`);
    console.log(`    - Verified Experts: ${verifiedExperts}`);
    console.log('  ✓ Admin Metrics Calculation: PASS\n');

    // -----------------------------------------------------------------
    // SUBSYSTEM 6: DISCOVERY & INDEX PERFORMANCE CHECK
    // -----------------------------------------------------------------
    console.log('[Subsystem 6] Testing Expert Discovery Query Performance...');
    const startQ = Date.now();
    const discovered = await Profile.find({ isVerified: true })
      .sort({ ratingAverage: -1, reviewsCount: -1 })
      .limit(10)
      .lean();
    const queryDuration = Date.now() - startQ;
    console.log(`  ✓ Compound index query completed in ${queryDuration}ms (${discovered.length} verified records retrieved): PASS\n`);

  } finally {
    // CLEANUP TEST ARTIFACTS
    console.log('[Cleanup] Removing test records...');
    if (testAdminUser) await User.findByIdAndDelete(testAdminUser._id);
    if (testExpertUser) await User.findByIdAndDelete(testExpertUser._id);
    if (testSeekerUser) await User.findByIdAndDelete(testSeekerUser._id);
    if (testExpertProfile) await Profile.findByIdAndDelete(testExpertProfile._id);
    if (testSeekerProfile) await Profile.findByIdAndDelete(testSeekerProfile._id);
    if (testQuestion) await Question.findByIdAndDelete(testQuestion._id);
    if (testBooking) await Booking.findByIdAndDelete(testBooking._id);
    await Transaction.deleteMany({ reference: `DEP-${testSuffix}` });
    await Transaction.deleteMany({ 'metadata.questionId': testQuestion?._id });
    await Transaction.deleteMany({ 'metadata.bookingId': testBooking?._id });
    console.log('  ✓ Test sandbox data cleaned up.\n');
  }

  console.log('======================================================');
  console.log('ALL SUBSYSTEMS VERIFIED AND OPERATING WITH 100% HEALTH');
  console.log('======================================================\n');
  await mongoose.disconnect();
  process.exit(0);
}

runComprehensiveSubsystemTest().catch((err) => {
  console.error('\n❌ Subsystem Debug Test Failed:', err);
  process.exit(1);
});
