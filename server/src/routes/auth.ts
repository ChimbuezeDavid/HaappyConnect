import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforhaappyconnect';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET + '_refresh');

export const generateAccessToken = (userId: any, role: string) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

export const generateRefreshToken = (userId: any, role: string) => {
  return jwt.sign({ userId, role }, JWT_REFRESH_SECRET, { expiresIn: '90d' });
};

export const storeRefreshToken = async (user: any, refreshToken: string) => {
  if (!user.refreshTokens) {
    user.refreshTokens = [];
  }
  // Retain the 5 most recent active sessions
  user.refreshTokens = [...user.refreshTokens.slice(-4), refreshToken];
  await user.save();
};

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

    const token = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);
    await storeRefreshToken(user, refreshToken);

    res.status(201).json({
      token,
      refreshToken,
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
      return res.status(400).json({ error: 'This account uses social sign-in. Please log in using your social provider.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);
    await storeRefreshToken(user, refreshToken);

    let profile = null;
    if (user.isOnboarded) {
      profile = await Profile.findOne({ user: user._id });
    }

    res.json({
      token,
      refreshToken,
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

// Refresh Token (Silent Rotation)
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ error: 'Session expired or token revoked' });
    }

    // Generate new token pair
    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id, user.role);

    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during token refresh' });
  }
});

// Logout Session
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        const decoded: any = jwt.decode(refreshToken);
        if (decoded?.userId) {
          const user = await User.findById(decoded.userId);
          if (user && user.refreshTokens) {
            user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
            await user.save();
          }
        }
      } catch (_) {}
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error logging out' });
  }
});

// Forgot Password (Request 6-digit recovery code)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({ message: 'If an account exists with this email, a 6-digit recovery code has been generated.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordCode = code;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    console.log(`[Password Reset] Recovery code for ${user.email}: ${code}`);

    res.json({
      message: 'Verification code sent to your email.',
      code: process.env.NODE_ENV === 'production' ? undefined : code
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error processing forgot password request' });
  }
});

// Reset Password (Verify code and update password)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid recovery request or user not found' });
    }

    if (!user.resetPasswordCode || user.resetPasswordCode !== code.trim()) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshTokens = [];
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error resetting password' });
  }
});

// Change Password (Authenticated user in Settings)
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error updating password' });
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

// Helper to safely redirect back to app or browser
const renderAuthRedirect = (res: Response, targetUrl: string) => {
  const isCustomScheme = !targetUrl.startsWith('http://') && !targetUrl.startsWith('https://');

  if (!isCustomScheme) {
    return res.redirect(targetUrl);
  }

  // Construct Android Intent URI as extra resilient fallback
  let intentUrl = targetUrl;
  try {
    const urlObj = new URL(targetUrl);
    const pathAndQuery = targetUrl.replace(/^[a-zA-Z0-9+.-]+:\/\//, '');
    const scheme = urlObj.protocol.replace(':', '');
    intentUrl = `intent://${pathAndQuery}#Intent;scheme=${scheme};package=com.anonymous.HaappyConnect;end;`;
  } catch (_) {}

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Happy Connect - Authentication Successful</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #061431;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #0B0F14;
      border: 1px solid #222D3D;
      border-radius: 20px;
      padding: 36px 28px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: #059669;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    p {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .btn {
      display: block;
      width: 100%;
      background: #10b981;
      color: #061431;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 20px;
      border-radius: 12px;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      margin-bottom: 12px;
    }
    .btn:active {
      opacity: 0.85;
    }
    .hint {
      font-size: 12px;
      color: #64748b;
    }
  </style>
  <script>
    function openApp() {
      window.location.href = "${targetUrl}";
      setTimeout(function() {
        window.location.href = "${intentUrl}";
      }, 500);
    }
    window.addEventListener('DOMContentLoaded', openApp);
  </script>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Signed In Successfully!</h1>
    <p>Returning you to <strong>Happy Connect</strong>. If your app does not open automatically, tap the button below.</p>
    <a href="${targetUrl}" onclick="openApp();" class="btn">Open Happy Connect</a>
    <div class="hint">Authenticated securely</div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
};

// Google Auth Start
router.get('/google', (req, res) => {
  const redirectUri = req.query.redirect_uri as string;
  if (!redirectUri) {
    return res.status(400).json({ error: 'redirect_uri query parameter is required' });
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const callbackUrl = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
      `client_id=${process.env.GOOGLE_CLIENT_ID.trim()}&` + 
      `redirect_uri=${encodeURIComponent(callbackUrl)}&` + 
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

    const host = req.get('host') || 'localhost:3000';
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const callbackUrl = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

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

    const token = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);
    await storeRefreshToken(user, refreshToken);

    const finalRedirect = appendQueryParams(redirectUri as string, {
      token,
      refreshToken,
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isOnboarded: user.isOnboarded,
      suggestedName: googleUser.name || '',
      suggestedAvatar: googleUser.picture || '',
    });

    return renderAuthRedirect(res, finalRedirect);
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

    const token = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);
    await storeRefreshToken(user, refreshToken);

    const finalRedirect = appendQueryParams(redirectUri as string, {
      token,
      refreshToken,
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isOnboarded: user.isOnboarded,
      suggestedName: twitterUser.name || twitterUser.username || '',
    });

    return renderAuthRedirect(res, finalRedirect);
  } catch (error: any) {
    res.status(500).send(`Twitter authentication failed: ${error.message}`);
  }
});

// LinkedIn Auth Start
router.get('/linkedin', (req, res) => {
  const redirectUri = req.query.redirect_uri as string;
  if (!redirectUri) {
    return res.status(400).json({ error: 'redirect_uri query parameter is required' });
  }

  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code&` +
      `client_id=${process.env.LINKEDIN_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/linkedin/callback`)}&` +
      `state=${encodeURIComponent(redirectUri)}&` +
      `scope=openid%20profile%20email`;
    return res.redirect(linkedinAuthUrl);
  }

  res.redirect(`/api/auth/mock-consent?provider=linkedin&redirect_uri=${encodeURIComponent(redirectUri)}`);
});

// LinkedIn callback
router.get('/linkedin/callback', async (req, res) => {
  try {
    const { code, state: redirectUri } = req.query;
    if (!code || !redirectUri) {
      return res.status(400).send('Authentication code or state missing');
    }

    const host = req.get('host');
    const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    const callbackUrl = process.env.LINKEDIN_REDIRECT_URI || `${req.protocol}://${host}/api/auth/linkedin/callback`;

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirect_uri: callbackUrl,
      })
    });

    const tokenData = await tokenRes.json() as any;
    if (tokenData.error) {
      return res.status(400).send(`LinkedIn Token Exchange Error: ${tokenData.error_description || tokenData.error}`);
    }

    const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const linkedinUser = await userRes.json() as any;

    if (!linkedinUser.email) {
      return res.status(400).send('LinkedIn did not return an email address');
    }

    let user = await User.findOne({ email: linkedinUser.email.toLowerCase() });
    if (!user) {
      user = new User({
        email: linkedinUser.email.toLowerCase(),
        role: 'expert', // Default professional sign-in to expert
        isOnboarded: false,
        linkedinId: linkedinUser.sub,
      });
      await user.save();
    } else if (!user.linkedinId) {
      user.linkedinId = linkedinUser.sub;
      await user.save();
    }

    const token = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);
    await storeRefreshToken(user, refreshToken);

    const finalRedirect = appendQueryParams(redirectUri as string, {
      token,
      refreshToken,
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isOnboarded: user.isOnboarded,
      suggestedName: linkedinUser.name || `${linkedinUser.given_name || ''} ${linkedinUser.family_name || ''}`.trim(),
      suggestedAvatar: linkedinUser.picture || '',
    });

    return renderAuthRedirect(res, finalRedirect);
  } catch (error: any) {
    res.status(500).send(`LinkedIn authentication failed: ${error.message}`);
  }
});

// Apple Auth Start
router.get('/apple', (req, res) => {
  const redirectUri = req.query.redirect_uri as string;
  if (!redirectUri) {
    return res.status(400).json({ error: 'redirect_uri query parameter is required' });
  }

  if (process.env.APPLE_CLIENT_ID) {
    const appleAuthUrl = `https://appleid.apple.com/auth/authorize?` +
      `client_id=${process.env.APPLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.APPLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/apple/callback`)}&` +
      `response_type=code%20id_token&` +
      `scope=name%20email&` +
      `response_mode=form_post&` +
      `state=${encodeURIComponent(redirectUri)}`;
    return res.redirect(appleAuthUrl);
  }

  res.redirect(`/api/auth/mock-consent?provider=apple&redirect_uri=${encodeURIComponent(redirectUri)}`);
});

// Apple Sign-In Endpoint (Native Client Integration)
router.post('/apple', async (req, res) => {
  try {
    const { identityToken, email, fullName, user: appleUserId, role } = req.body;
    if (!identityToken && !appleUserId) {
      return res.status(400).json({ error: 'Apple identityToken or user ID is required' });
    }

    let resolvedEmail = email;
    let appleSub = appleUserId;
    if (identityToken) {
      const decoded: any = jwt.decode(identityToken);
      if (decoded) {
        resolvedEmail = resolvedEmail || decoded.email;
        appleSub = appleSub || decoded.sub;
      }
    }

    if (!resolvedEmail) {
      resolvedEmail = `${appleSub || Date.now()}@privaterelay.appleid.com`;
    }

    let user = await User.findOne({ $or: [{ appleId: appleSub }, { email: resolvedEmail.toLowerCase() }] });
    if (!user) {
      user = new User({
        email: resolvedEmail.toLowerCase(),
        role: role || 'seeker',
        isOnboarded: false,
        appleId: appleSub,
      });
      await user.save();
    } else if (!user.appleId && appleSub) {
      user.appleId = appleSub;
      await user.save();
    }

    const token = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);
    await storeRefreshToken(user, refreshToken);

    let profile = null;
    if (user.isOnboarded) {
      profile = await Profile.findOne({ user: user._id });
    }

    res.json({
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
      profile,
      suggestedProfile: {
        fullName: fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : '',
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Apple sign-in failed' });
  }
});

// Unified Social Login (Direct Client-Side Token Exchange)
router.post('/social-login', async (req, res) => {
  try {
    const { provider, email, fullName, avatarUrl, providerId, role } = req.body;
    if (!email || !provider) {
      return res.status(400).json({ error: 'Provider and email are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = new User({
        email: normalizedEmail,
        role: role || (provider === 'linkedin' ? 'expert' : 'seeker'),
        isOnboarded: false,
      });

      if (provider === 'google') user.googleId = providerId || `google_${Date.now()}`;
      if (provider === 'linkedin') user.linkedinId = providerId || `linkedin_${Date.now()}`;
      if (provider === 'apple') user.appleId = providerId || `apple_${Date.now()}`;
      if (provider === 'twitter' || provider === 'x') user.twitterId = providerId || `x_${Date.now()}`;

      await user.save();
    } else {
      let updated = false;
      if (provider === 'google' && !user.googleId) { user.googleId = providerId; updated = true; }
      if (provider === 'linkedin' && !user.linkedinId) { user.linkedinId = providerId; updated = true; }
      if (provider === 'apple' && !user.appleId) { user.appleId = providerId; updated = true; }
      if ((provider === 'twitter' || provider === 'x') && !user.twitterId) { user.twitterId = providerId; updated = true; }
      if (updated) await user.save();
    }

    const token = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);
    await storeRefreshToken(user, refreshToken);

    let profile = null;
    if (user.isOnboarded) {
      profile = await Profile.findOne({ user: user._id });
    }

    res.json({
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
      profile,
      suggestedProfile: {
        fullName,
        avatarUrl,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Social login failed' });
  }
});

// Mock Consent Page HTML
router.get('/mock-consent', (req, res) => {
  const { provider, redirect_uri } = req.query;
  if (!provider || !redirect_uri) {
    return res.status(400).send('Provider and redirect_uri are required');
  }

  let providerLabel = 'Social Account';
  if (provider === 'google') providerLabel = 'Google';
  else if (provider === 'twitter' || provider === 'x') providerLabel = 'X (Twitter)';
  else if (provider === 'linkedin') providerLabel = 'LinkedIn';
  else if (provider === 'apple') providerLabel = 'Apple';

  const defaultRole = provider === 'linkedin' ? 'expert' : 'seeker';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HaappyConnect - Sign in with ${providerLabel}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0B0F14;
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
      background-color: #131A22;
      border: 1px solid #222D3D;
      border-radius: 24px;
      padding: 36px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo {
      font-size: 28px;
      font-weight: 900;
      color: #10B981;
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
      color: #94a3b8;
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
      color: #94a3b8;
      margin-bottom: 10px;
    }
    input[type="email"] {
      width: 100%;
      padding: 16px;
      background-color: #0B0F14;
      border: 1px solid #222D3D;
      border-radius: 14px;
      color: #ffffff;
      font-size: 15px;
      box-sizing: border-box;
      transition: all 0.2s;
    }
    input[type="email"]:focus {
      outline: none;
      border-color: #10B981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
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
      padding: 16px;
      background-color: #0B0F14;
      border: 1px solid #222D3D;
      border-radius: 14px;
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      color: #94a3b8;
      transition: all 0.2s;
    }
    .role-option input[type="radio"]:checked + .role-box {
      border-color: #10B981;
      background-color: rgba(16, 185, 129, 0.12);
      color: #34D399;
    }
    .btn-submit {
      width: 100%;
      padding: 18px;
      background-color: #059669;
      border: none;
      border-radius: 14px;
      color: #ffffff;
      font-weight: 800;
      font-size: 16px;
      cursor: pointer;
      margin-top: 10px;
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.3);
    }
    .btn-submit:hover {
      background-color: #047857;
    }
    .badge {
      display: inline-block;
      padding: 5px 12px;
      background-color: rgba(16, 185, 129, 0.15);
      color: #34D399;
      font-size: 10px;
      font-weight: 800;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border: 1px solid rgba(16, 185, 129, 0.3);
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">HaappyConnect</div>
      <div class="badge">Official ${providerLabel} Sign-In</div>
      <h2 class="title">Sign in with ${providerLabel}</h2>
      <p class="subtitle">Authorize <strong>HaappyConnect</strong> to access your profile using ${providerLabel}.</p>
    </div>
    
    <form action="/api/auth/mock-callback" method="POST">
      <input type="hidden" name="provider" value="${provider}">
      <input type="hidden" name="redirect_uri" value="${redirect_uri}">
      
      <div class="form-group">
        <label for="email">${providerLabel} Email Address</label>
        <input type="email" id="email" name="email" value="" required placeholder="you@example.com">
      </div>
      
      <div class="form-group">
        <label>Account Role</label>
        <div class="role-options">
          <label class="role-option">
            <input type="radio" name="role" value="seeker" ${defaultRole === 'seeker' ? 'checked' : ''}>
            <div class="role-box">
              <span>Seeker</span>
            </div>
          </label>
          <label class="role-option">
            <input type="radio" name="role" value="expert" ${defaultRole === 'expert' ? 'checked' : ''}>
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
        role: role || (provider === 'linkedin' ? 'expert' : 'seeker'),
        isOnboarded: false,
      });

      if (provider === 'google') user.googleId = `mock_google_id_${Date.now()}`;
      else if (provider === 'linkedin') user.linkedinId = `mock_linkedin_id_${Date.now()}`;
      else if (provider === 'apple') user.appleId = `mock_apple_id_${Date.now()}`;
      else user.twitterId = `mock_twitter_id_${Date.now()}`;

      await user.save();
    } else {
      let updated = false;
      if (provider === 'google' && !user.googleId) { user.googleId = `mock_google_${Date.now()}`; updated = true; }
      if (provider === 'linkedin' && !user.linkedinId) { user.linkedinId = `mock_linkedin_${Date.now()}`; updated = true; }
      if (provider === 'apple' && !user.appleId) { user.appleId = `mock_apple_${Date.now()}`; updated = true; }
      if ((provider === 'twitter' || provider === 'x') && !user.twitterId) { user.twitterId = `mock_twitter_${Date.now()}`; updated = true; }
      if (updated) await user.save();
    }

    // Sign dual tokens
    const token = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);
    await storeRefreshToken(user, refreshToken);

    // Build redirection link
    const finalRedirect = appendQueryParams(redirect_uri, {
      token,
      refreshToken,
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isOnboarded: user.isOnboarded,
      suggestedName: normalizedEmail.split('@')[0].replace(/[._]/g, ' '),
    });

    return renderAuthRedirect(res, finalRedirect);
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
