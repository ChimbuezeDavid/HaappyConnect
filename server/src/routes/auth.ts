import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforhaappyconnect';

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      passwordHash,
      role: role || 'seeker',
      isOnboarded: false,
    });
    await user.save();

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during signup' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (!user.passwordHash) {
      return res.status(400).json({ error: 'This account uses social sign-in. Please log in using Google or X.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    let profile = null;
    if (user.isOnboarded) {
      profile = await Profile.findOne({ user: user._id });
    }

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
      profile,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during login' });
  }
});

// Helper to append query parameters to a URL
const appendQueryParams = (url: string, params: Record<string, string | boolean>) => {
  const queryStr = Object.entries(params)
    .map(([key, val]) => `${key}=${encodeURIComponent(String(val))}`)
    .join('&');
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${queryStr}`;
};

// Google Auth Start
router.get('/google', (req, res) => {
  const redirectUri = req.query.redirect_uri as string;
  if (!redirectUri) {
    return res.status(400).json({ error: 'redirect_uri query parameter is required' });
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` + 
      `redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/google/callback`)}&` + 
      `response_type=code&` + 
      `scope=openid%20profile%20email&` + 
      `state=${encodeURIComponent(redirectUri)}`;
    return res.redirect(googleAuthUrl);
  }

  res.redirect(`/api/auth/mock-consent?provider=google&redirect_uri=${encodeURIComponent(redirectUri)}`);
});

// X / Twitter Auth Start
router.get('/x', (req, res) => {
  const redirectUri = req.query.redirect_uri as string;
  if (!redirectUri) {
    return res.status(400).json({ error: 'redirect_uri query parameter is required' });
  }

  if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
    const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?` + 
      `response_type=code&` + 
      `client_id=${process.env.TWITTER_CLIENT_ID}&` + 
      `redirect_uri=${encodeURIComponent(process.env.TWITTER_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/x/callback`)}&` + 
      `scope=users.read%20tweet.read&` + 
      `state=${encodeURIComponent(redirectUri)}&` + 
      `code_challenge=challenge&` + 
      `code_challenge_method=plain`;
    return res.redirect(twitterAuthUrl);
  }

  res.redirect(`/api/auth/mock-consent?provider=twitter&redirect_uri=${encodeURIComponent(redirectUri)}`);
});

// Google callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state: redirectUri } = req.query;
    if (!code || !redirectUri) {
      return res.status(400).send('Authentication code or state missing');
    }

    const host = req.get('host');
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const callbackUrl = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${host}/api/auth/google/callback`;

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json() as any;
    if (tokenData.error) {
      return res.status(400).send(`Google Token Exchange Error: ${tokenData.error_description || tokenData.error}`);
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const googleUser = await userRes.json() as any;

    if (!googleUser.email) {
      return res.status(400).send('Google did not return an email address');
    }

    let user = await User.findOne({ email: googleUser.email.toLowerCase() });
    if (!user) {
      user = new User({
        email: googleUser.email.toLowerCase(),
        role: 'seeker',
        isOnboarded: false,
        googleId: googleUser.id,
      });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleUser.id;
      await user.save();
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    const finalRedirect = appendQueryParams(redirectUri as string, {
      token,
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isOnboarded: user.isOnboarded
    });

    res.redirect(finalRedirect);
  } catch (error: any) {
    res.status(500).send(`Google authentication failed: ${error.message}`);
  }
});

// Twitter/X callback
router.get('/x/callback', async (req, res) => {
  try {
    const { code, state: redirectUri } = req.query;
    if (!code || !redirectUri) {
      return res.status(400).send('Authentication code or state missing');
    }

    const host = req.get('host');
    const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    const callbackUrl = process.env.TWITTER_REDIRECT_URI || `${req.protocol}://${host}/api/auth/x/callback`;

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.TWITTER_CLIENT_ID!,
        client_secret: process.env.TWITTER_CLIENT_SECRET!,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
        code_verifier: 'challenge'
      })
    });

    const tokenData = await tokenRes.json() as any;
    if (tokenData.error) {
      return res.status(400).send(`Twitter Token Exchange Error: ${tokenData.error_description || tokenData.error}`);
    }

    const userRes = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const twitterData = await userRes.json() as any;
    const twitterUser = twitterData.data;

    if (!twitterUser) {
      return res.status(400).send('Twitter did not return user information');
    }

    const email = `${twitterUser.username.toLowerCase()}@twitter-oauth.com`;

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        role: 'seeker',
        isOnboarded: false,
        twitterId: twitterUser.id,
      });
      await user.save();
    } else if (!user.twitterId) {
      user.twitterId = twitterUser.id;
      await user.save();
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    const finalRedirect = appendQueryParams(redirectUri as string, {
      token,
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isOnboarded: user.isOnboarded
    });

    res.redirect(finalRedirect);
  } catch (error: any) {
    res.status(500).send(`Twitter authentication failed: ${error.message}`);
  }
});

// Mock Consent Page HTML
router.get('/mock-consent', (req, res) => {
  const { provider, redirect_uri } = req.query;
  if (!provider || !redirect_uri) {
    return res.status(400).send('Provider and redirect_uri are required');
  }

  const providerLabel = provider === 'google' ? 'Google' : 'X (Twitter)';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HaappyConnect - Mock ${providerLabel} Consent</title>
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
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 24px;
      padding: 36px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
    }
    .header {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo {
      font-size: 30px;
      font-weight: 900;
      color: #8b5cf6;
      letter-spacing: -0.75px;
      margin-bottom: 8px;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 14px;
      color: #9ca3af;
      margin-top: 8px;
      line-height: 20px;
    }
    .form-group {
      margin-bottom: 24px;
    }
    label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      margin-bottom: 10px;
    }
    input[type="email"] {
      width: 100%;
      padding: 16px;
      background-color: #0b0f19;
      border: 1px solid #1f2937;
      border-radius: 14px;
      color: #ffffff;
      font-size: 15px;
      box-sizing: border-box;
      transition: all 0.2s;
    }
    input[type="email"]:focus {
      outline: none;
      border-color: #8b5cf6;
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
    }
    .role-options {
      display: flex;
      gap: 14px;
    }
    .role-option {
      flex: 1;
      position: relative;
    }
    .role-option input[type="radio"] {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    .role-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background-color: #0b0f19;
      border: 1px solid #1f2937;
      border-radius: 14px;
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      color: #9ca3af;
      transition: all 0.2s;
    }
    .role-option input[type="radio"]:checked + .role-box {
      border-color: #8b5cf6;
      background-color: rgba(139, 92, 246, 0.1);
      color: #a78bfa;
    }
    .btn-submit {
      width: 100%;
      padding: 18px;
      background-color: #8b5cf6;
      border: none;
      border-radius: 14px;
      color: #ffffff;
      font-weight: 800;
      font-size: 16px;
      cursor: pointer;
      margin-top: 10px;
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.2), 0 2px 4px -1px rgba(139, 92, 246, 0.2);
    }
    .btn-submit:hover {
      background-color: #7c3aed;
      box-shadow: 0 10px 15px -3px rgba(139, 92, 246, 0.3), 0 4px 6px -2px rgba(139, 92, 246, 0.3);
    }
    .badge {
      display: inline-block;
      padding: 5px 12px;
      background-color: rgba(139, 92, 246, 0.15);
      color: #c084fc;
      font-size: 10px;
      font-weight: 800;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border: 1px solid rgba(139, 92, 246, 0.25);
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">HaappyConnect</div>
      <div class="badge">${providerLabel} Sandboxed Login</div>
      <h2 class="title">Authorize Consent</h2>
      <p class="subtitle">Complete sign-in using your simulated <strong>${providerLabel}</strong> details.</p>
    </div>
    
    <form action="/api/auth/mock-callback" method="POST">
      <input type="hidden" name="provider" value="${provider}">
      <input type="hidden" name="redirect_uri" value="${redirect_uri}">
      
      <div class="form-group">
        <label for="email">Account Email</label>
        <input type="email" id="email" name="email" value="oauth_test_${provider}@gmail.com" required placeholder="name@example.com">
      </div>
      
      <div class="form-group">
        <label>Initial Role Selection</label>
        <div class="role-options">
          <label class="role-option">
            <input type="radio" name="role" value="seeker" checked>
            <div class="role-box">
              <span>Seeker</span>
            </div>
          </label>
          <label class="role-option">
            <input type="radio" name="role" value="expert">
            <div class="role-box">
              <span>Expert</span>
            </div>
          </label>
        </div>
      </div>
      
      <button type="submit" class="btn-submit">Authorize & Continue</button>
    </form>
  </div>
</body>
</html>
  `;
  res.send(html);
});

// Process Mock Authorization consent callback
router.post('/mock-callback', async (req, res) => {
  try {
    const { email, role, provider, redirect_uri } = req.body;
    if (!email || !redirect_uri || !provider) {
      return res.status(400).send('Required fields missing');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find or create User
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = new User({
        email: normalizedEmail,
        role: role || 'seeker',
        isOnboarded: false,
      });

      if (provider === 'google') {
        user.googleId = `mock_google_id_${Date.now()}`;
      } else {
        user.twitterId = `mock_twitter_id_${Date.now()}`;
      }
      await user.save();
    } else {
      // Link social ID if not already present
      let updated = false;
      if (provider === 'google' && !user.googleId) {
        user.googleId = `mock_google_id_${Date.now()}`;
        updated = true;
      } else if (provider === 'twitter' && !user.twitterId) {
        user.twitterId = `mock_twitter_id_${Date.now()}`;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    // Sign token
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // Build redirection link
    const finalRedirect = appendQueryParams(redirect_uri, {
      token,
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isOnboarded: user.isOnboarded
    });

    res.redirect(finalRedirect);
  } catch (error: any) {
    res.status(500).send(`Mock authorization processing failed: ${error.message}`);
  }
});

// Forgot Password - Step 1: Send verification code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Security best practice: don't reveal if user doesn't exist
      return res.json({ message: 'If that email address exists in our database, we will send a password reset code.' });
    }

    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetPasswordCode = code;
    user.resetPasswordExpires = expiry;
    await user.save();

    console.log(`[PASSWORD RESET] Code for ${email} is ${code}`);

    res.json({ message: 'If that email address exists in our database, we will send a password reset code.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during forgot password' });
  }
});

// Reset Password - Step 2: Validate code and set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset code' });
    }

    // Hash the new password and update user
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during password reset' });
  }
});

// POST /api/auth/register-push-token
router.post('/register-push-token', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.pushToken = token;
    await user.save();

    res.json({ message: 'Push token registered successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error registering push token' });
  }
});

export default router;
