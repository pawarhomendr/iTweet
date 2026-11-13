import { Router } from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendEmail, passwordResetEmail, emailVerifyEmail } from '../services/email';
import { hashToken } from '../services/tokens';
import { canLinkGoogleAccount, GoogleAuthConfigurationError, verifyGoogleCredential } from '../services/googleAuth';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false });
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60_000;

function trustedFrontendUrl(): string {
  const raw = process.env.FRONTEND_URL;
  if (!raw) throw new Error('FRONTEND_URL is not configured');
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('FRONTEND_URL must use HTTP or HTTPS');
  return url.toString().replace(/\/$/, '');
}

function buildFrontendLink(pathname: string, token: string): string {
  const url = new URL(pathname, `${trustedFrontendUrl()}/`);
  url.searchParams.set('token', token);
  return url.toString();
}

function createEmailVerificationToken() {
  return {
    rawToken: crypto.randomBytes(32).toString('hex'),
    expires: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
  };
}

function signTokens(userId: string, username: string) {
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
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', refresh, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
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
    const existing = await User.findOne({ $or: [{ email }, { username: username.toLowerCase() }] }).lean();
    if (existing) {
      return res.status(409).json({ success: false, message: 'Unable to create an account with those details.' });
    }
    const { rawToken: rawVerifyToken, expires: verifyExpires } = createEmailVerificationToken();
    const user = await User.create({
      username: username.toLowerCase(), email, password,
      displayName: displayName || username,
      emailVerifyToken: hashToken(rawVerifyToken),
      emailVerifyExpires: verifyExpires,
    });
    const verifyLink = buildFrontendLink('/verify-email', rawVerifyToken);
    try {
      await sendEmail({ to: email, subject: 'Verify your Indiagram account', html: emailVerifyEmail(verifyLink) });
    } catch (error) {
      console.error(`[email] verification delivery failed code=${error instanceof Error && 'code' in error ? String(error.code) : 'UNKNOWN'}`);
      return res.status(503).json({ success: false, message: 'Your account was created, but verification email delivery is temporarily unavailable. Please try again.' });
    }
    res.status(201).json({
      success: true,
      message: 'Account created. Check your email to verify.',
      data: { user, requiresEmailVerification: true },
    });
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
      return res.status(403).json({ success: false, message: 'Account suspended. Contact support for details.' });
    }
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_VERIFICATION_REQUIRED',
        message: 'Please verify your email address before signing in.',
      });
    }
    const { access, refresh } = signTokens(String(user._id), user.username);
    await User.findByIdAndUpdate(user._id, { refreshToken: hashToken(refresh) });
    setCookies(res, refresh);
    res.json({ success: true, data: { token: access, user } });
  } catch (err) { next(err); }
});

// POST /api/auth/google — Google OAuth login/registration
router.post('/google', authLimiter, [
  body('credential').notEmpty().withMessage('Google credential token required'),
], validate, async (req: any, res: any) => {
  try {
    const identity = await verifyGoogleCredential(req.body.credential);
    const { email, name, picture } = identity;

    let user = await User.findOne({ email });
    if (!user) {
      // Auto-register user from Google profile
      let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
      if (baseUsername.length < 3) baseUsername = 'user_' + Math.random().toString(36).substring(2, 7);
      let username = baseUsername;
      let i = 1;
      while (await User.exists({ username })) {
        username = `${baseUsername}${i++}`;
      }
      const randomPassword = crypto.randomBytes(24).toString('hex');
      user = await User.create({
        username,
        email,
        password: randomPassword,
        displayName: name || username,
        avatar: picture || '',
        emailVerified: true,
      });
    }

    if (user.isDisabled || (user.isSuspended && (!user.suspendedUntil || user.suspendedUntil > new Date()))) {
      return res.status(403).json({ success: false, message: 'Account unavailable.' });
    }

    if (!user.emailVerified && canLinkGoogleAccount(identity, user.email)) {
      user.emailVerified = true;
      user.emailVerifyToken = null;
      user.emailVerifyExpires = null;
      await user.save();
    }

    if (!user.emailVerified) {
      return res.status(403).json({ success: false, message: 'Google account email could not be verified.' });
    }

    const { access, refresh } = signTokens(String(user._id), user.username);
    await User.findByIdAndUpdate(user._id, { refreshToken: hashToken(refresh) });
    setCookies(res, refresh);
    res.json({ success: true, data: { token: access, user } });
  } catch (error) {
    if (error instanceof GoogleAuthConfigurationError) {
      return res.status(503).json({ success: false, message: 'Google authentication is not configured.' });
    }
    return res.status(401).json({ success: false, message: 'Google authentication failed. Please check credentials or configure Google client.' });
  }
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
router.post('/refresh', async (req: any, res: any) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });
  try {
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!, { algorithms: ['HS256'] }) as { userId: string };
    const user = await User.findById(payload.userId).select('+refreshToken');
    if (!user || user.refreshToken !== hashToken(token)) {
      if (user) await User.findByIdAndUpdate(user._id, { refreshToken: null });
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
    if (!user.emailVerified) {
      await User.findByIdAndUpdate(user._id, { refreshToken: null });
      return res.status(403).json({ success: false, code: 'EMAIL_VERIFICATION_REQUIRED', message: 'Please verify your email address before signing in.' });
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
    if (!user) {
      return res.status(202).json({ success: true, message: 'If the account is eligible, reset instructions will be sent.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600_000);
    await User.findByIdAndUpdate(user._id, { passwordResetToken: hashToken(rawToken), passwordResetExpires: expires });
    const link = buildFrontendLink('/reset-password', rawToken);
    try {
      await sendEmail({ to: user.email, subject: 'Reset your Indiagram password', html: passwordResetEmail(link) });
    } catch (error) {
      console.error(`[email] password reset delivery failed code=${error instanceof Error && 'code' in error ? String(error.code) : 'UNKNOWN'}`);
      return res.status(503).json({ success: false, message: 'Password reset email delivery is temporarily unavailable. Please try again later.' });
    }
    res.status(202).json({ success: true, message: 'If the account is eligible, reset instructions will be sent.' });
  } catch (err) { next(err); }
});

// POST /api/auth/resend-verification — generic response prevents account enumeration
router.post('/resend-verification', authLimiter, [body('email').isEmail().normalizeEmail()], validate, async (req: any, res: any, next: any) => {
  try {
    const generic = { success: true, message: 'If the account is eligible, a verification email will be sent.' };
    const user = await User.findOne({ email: req.body.email }).select('+emailVerifyToken +emailVerifyExpires');
    if (!user || user.emailVerified) return res.status(202).json(generic);

    const { rawToken, expires } = createEmailVerificationToken();
    await User.findByIdAndUpdate(user._id, { emailVerifyToken: hashToken(rawToken), emailVerifyExpires: expires });
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify your Indiagram account',
        html: emailVerifyEmail(buildFrontendLink('/verify-email', rawToken)),
      });
    } catch (error) {
      console.error(`[email] verification resend failed code=${error instanceof Error && 'code' in error ? String(error.code) : 'UNKNOWN'}`);
    }
    return res.status(202).json(generic);
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, [
  body('token').isHexadecimal().isLength({ min: 64, max: 128 }),
  body('password').isLength({ min: 8 }),
], validate, async (req: any, res: any, next: any) => {
  try {
    const user = await User.findOne({
      passwordResetToken: hashToken(req.body.token),
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    user.password = req.body.password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.refreshToken = null;
    await user.save();
    res.json({ success: true, message: 'Password updated. Please log in.' });
  } catch (err) { next(err); }
});

// GET /api/auth/verify-email
router.get('/verify-email', async (req: any, res: any, next: any) => {
  try {
    const rawToken = String(req.query.token ?? '').slice(0, 128);
    if (!rawToken) return res.status(400).json({ success: false, message: 'Missing token' });
    if (!/^[a-f0-9]{64}$/i.test(rawToken)) return res.status(400).json({ success: false, message: 'Invalid verification token' });
    const user = await User.findOne({
      emailVerifyToken: hashToken(rawToken),
      emailVerifyExpires: { $gt: new Date() },
    }).select('+emailVerifyToken +emailVerifyExpires');
    if (!user) return res.status(400).json({ success: false, message: 'Invalid verification token' });
    user.emailVerified = true;
    user.emailVerifyToken = null;
    user.emailVerifyExpires = null;
    await user.save();
    res.json({ success: true, message: 'Email verified successfully!' });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthRequest, res: any) => {
  res.json({ success: true, data: { user: req.user } });
});

export default router;
