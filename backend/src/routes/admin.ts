import { Router } from 'express';
import { body } from 'express-validator';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Notification } from '../models/Notification';
import { Report } from '../models/Report';
import { Feedback } from '../models/Feedback';
import { RewardLedger } from '../models/RewardLedger';
import { VerificationRequest } from '../models/VerificationRequest';
import { authenticate, requireAdmin, requireMod, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { awardPoints } from '../services/rewards';
import { emitNotification } from '../config/socket';

const router = Router();

// GET /api/admin/stats
router.get('/stats', authenticate, requireMod, async (_req, res: any, next: any) => {
  try {
    const [users, posts, pendingPosts, openReports, feedbackUnread] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments({ status: 'published' }),
      Post.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'open' }),
      Feedback.countDocuments({ isRead: false }),
    ]);
    res.json({ success: true, data: { users, posts, pendingPosts, openReports, feedbackUnread } });
  } catch (err) { next(err); }
});

// GET /api/admin/posts/pending
router.get('/posts/pending', authenticate, requireMod, async (req: any, res: any, next: any) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limit = 20;
    const [posts, total] = await Promise.all([
      Post.find({ status: 'pending' }).sort({ createdAt: 1 }).skip((page - 1) * limit).limit(limit)
        .populate('author', 'username displayName avatar'),
      Post.countDocuments({ status: 'pending' }),
    ]);
    res.json({ success: true, data: { posts, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// PATCH /api/admin/posts/:id/review
router.patch('/posts/:id/review', authenticate, requireMod, [
  body('status').isIn(['published', 'rejected']),
  body('rejectionReason').optional().trim().isLength({ max: 300 }),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.status !== 'pending') return res.status(404).json({ success: false, message: 'Post not found or not pending' });

    post.status = req.body.status;
    if (req.body.status === 'published') {
      post.publishedAt = new Date();
    } else {
      post.rejectionReason = req.body.rejectionReason ?? '';
    }
    await post.save();

    // Award points on approval
    if (req.body.status === 'published') {
      await awardPoints({ userId: post.author, action: 'post_approved', ref: post._id, refType: 'Post', awardedBy: req.user!._id });
      await User.findByIdAndUpdate(post.author, { $inc: { postsCount: 1 } });
    }

    const type = req.body.status === 'published' ? 'post_approved' : 'post_rejected';
    const message = req.body.status === 'published'
      ? `Your post "${post.title}" was approved and is now live!`
      : `Your post "${post.title}" was rejected: ${req.body.rejectionReason}`;
    const notif = await Notification.create({ recipient: post.author, type, post: post._id, message });
    emitNotification(String(post.author), notif);

    res.json({ success: true, data: { post } });
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/suspend
router.patch('/users/:id/suspend', authenticate, requireAdmin, [
  body('reason').trim().isLength({ min: 5, max: 200 }),
  body('days').optional().isInt({ min: 1, max: 365 }),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const update: any = { isSuspended: true, suspendedReason: req.body.reason };
    if (req.body.days) update.suspendedUntil = new Date(Date.now() + req.body.days * 86400_000);
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/unsuspend
router.patch('/users/:id/unsuspend', authenticate, requireAdmin, async (req: any, res: any, next: any) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: false, suspendedReason: '', suspendedUntil: null }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', authenticate, requireAdmin, [
  body('role').isIn(['user', 'moderator', 'admin']),
], validate, async (req: any, res: any, next: any) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
});

// POST /api/admin/rewards/reverse
router.post('/rewards/reverse', authenticate, requireMod, [
  body('userId').isMongoId(),
  body('points').isInt({ min: 1 }),
  body('note').trim().isLength({ min: 5, max: 200 }),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    await awardPoints({
      userId: req.body.userId,
      action: 'moderation_reversal',
      awardedBy: req.user!._id,
      overridePoints: -Math.abs(req.body.points),
      note: req.body.note,
    });
    res.json({ success: true, message: 'Points reversed' });
  } catch (err) { next(err); }
});

// GET /api/admin/feedback
router.get('/feedback', authenticate, requireMod, async (req: any, res: any, next: any) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limit = 20;
    const [entries, total] = await Promise.all([
      Feedback.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Feedback.countDocuments(),
    ]);
    res.json({ success: true, data: { entries, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// POST /api/admin/feedback  — public submit
router.post('/feedback', [
  body('email').isEmail().normalizeEmail(),
  body('subject').trim().isLength({ min: 3, max: 120 }),
  body('body').trim().isLength({ min: 10, max: 2000 }),
], validate, async (req: any, res: any, next: any) => {
  try {
    const entry = await Feedback.create({ email: req.body.email, subject: req.body.subject, body: req.body.body });
    res.status(201).json({ success: true, message: 'Thanks for the feedback!', data: { id: entry._id } });
  } catch (err) { next(err); }
});

export default router;
