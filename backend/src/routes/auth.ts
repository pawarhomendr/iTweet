import { Router } from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendEmail, passwordResetEmail, emailVerifyEmail } from '../services/email';
import { rateLimit } from 'express-rate-limit';

// Helper: hash a token before DB storage (never store plaintext reset/refresh tokens)
function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

function signTokens(userId: string, username: string) {
  // FIX S-1 / A-1: pin algorithm explicitly
  const access = jwt.sign({ userId, username }, process.env.JWT_SECRET!, {
    algorithm: 'HS256',
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as any,
  });
  const refresh = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET!, {
    algorithm: 'HS256',
    expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN ?? '30d') as any,
  });
  return { access, refresh };
}

function setCookies(res: any, refresh: string) {
  // FIX S-1: set only the refresh token as httpOnly cookie.
  // The access token is returned in-memory via JSON and stored in module memory only —
  // never in localStorage. Refresh cookie path-scoped to /api/auth/refresh.
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', refresh, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',  // FIX A-3: strict in prod
    maxAge: 30 * 86400_000,
    path: '/api/auth/refresh',
  });
}

// POST /api/auth/register
router.post('/register', authLimiter, [
  body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-z0-9_-]+$/i).toLowerCase(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('displayName').optional().trim().isLength({ max: 60 }),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { username, email, password, displayName } = req.body;
    // FIX A-5: generic message to avoid email enumeration
    const existing = await User.findOne({ $or: [{ email }, { username: username.toLowerCase() }] }).lean();
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with those details already exists.' });
    }
    // Email verify token — store hash, send raw to user
    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      username: username.toLowerCase(), email, password,
      displayName: displayName || username,
      emailVerifyToken: hashToken(rawVerifyToken),  // FIX A-4: store hash
    });
    const verifyLink = `${process.env.FRONTEND_URL}/verify-email?token=${rawVerifyToken}`;
    await sendEmail({ to: email, subject: 'Verify your Off By One account', html: emailVerifyEmail(verifyLink) });
    const { access, refresh } = signTokens(String(user._id), user.username);
    // FIX A-2: store hash of refresh token, not the raw value
    await User.findByIdAndUpdate(user._id, { refreshToken: hashToken(refresh) });
    setCookies(res, refresh);
    // FIX S-1: return access token in JSON body only — frontend must store in memory, NOT localStorage
    res.status(201).json({ success: true, message: 'Account created. Check your email to verify.', data: { token: access, user } });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (user.isSuspended && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
      // FIX E-2: don't leak the internal suspension reason to the client
      return res.status(403).json({ success: false, message: 'Account suspended. Contact support for details.' });
    }
    const { access, refresh } = signTokens(String(user._id), user.username);
    // FIX A-2: store hash of refresh token
    await User.findByIdAndUpdate(user._id, { refreshToken: hashToken(refresh) });
    setCookies(res, refresh);
    res.json({ success: true, data: { token: access, user } });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    await User.findByIdAndUpdate(req.user!._id, { refreshToken: null });
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: any, res: any, next: any) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });
  try {
    // FIX A-1: pin algorithm
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!, { algorithms: ['HS256'] }) as { userId: string };
    const user = await User.findById(payload.userId).select('+refreshToken');
    // FIX A-2: compare against stored hash
    if (!user || user.refreshToken !== hashToken(token)) {
      // Possible token reuse — invalidate all sessions for this user
      if (user) await User.findByIdAndUpdate(user._id, { refreshToken: null });
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
    const { access, refresh } = signTokens(String(user._id), user.username);
    await User.findByIdAndUpdate(user._id, { refreshToken: hashToken(refresh) });
    setCookies(res, refresh);
    res.json({ success: true, data: { token: access } });
  } catch { res.status(401).json({ success: false, message: 'Invalid or expired refresh token' }); }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, [body('email').isEmail().normalizeEmail()], validate, async (req: any, res: any, next: any) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600_000);
      // FIX A-4: store hash, send raw token in link only
      await User.findByIdAndUpdate(user._id, { passwordResetToken: hashToken(rawToken), passwordResetExpires: expires });
      const link = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
      await sendEmail({ to: user.email, subject: 'Reset your Off By One password', html: passwordResetEmail(link) });
    }
    // Always 200 to avoid email enumeration
    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, [
  body('token').notEmpty().isLength({ max: 128 }),
  body('password').isLength({ min: 8 }),
], validate, async (req: any, res: any, next: any) => {
  try {
    // FIX A-4: look up by hash of the submitted token
    const user = await User.findOne({
      passwordResetToken: hashToken(req.body.token),
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    user.password = req.body.password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.refreshToken = null; // Invalidate all existing sessions
    await user.save();
    res.json({ success: true, message: 'Password updated. Please log in.' });
  } catch (err) { next(err); }
});

// GET /api/auth/verify-email
router.get('/verify-email', async (req: any, res: any, next: any) => {
  try {
    const rawToken = String(req.query.token ?? '').slice(0, 128);
    if (!rawToken) return res.status(400).json({ success: false, message: 'Missing token' });
    // FIX A-4: look up by hash
    const user = await User.findOne({ emailVerifyToken: hashToken(rawToken) }).select('+emailVerifyToken');
    if (!user) return res.status(400).json({ success: false, message: 'Invalid verification token' });
    user.emailVerified = true;
    user.emailVerifyToken = null;
    await user.save();
    res.json({ success: true, message: 'Email verified!' });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthRequest, res: any) => {
  res.json({ success: true, data: { user: req.user } });
});

export default router;
