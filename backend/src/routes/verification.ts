import { Router } from 'express';
import { body } from 'express-validator';
import { VerificationRequest } from '../models/VerificationRequest';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { authenticate, requireMod, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { emitNotification } from '../config/socket';

const router = Router();

const ELIGIBILITY_POSTS = 5;
const ELIGIBILITY_FOLLOWERS = 20;
const ELIGIBILITY_POINTS = 200;

// POST /api/verification/apply
router.post('/apply', authenticate, [
  body('statement').trim().isLength({ min: 50, max: 800 }),
  body('links').optional().isArray({ max: 5 }),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const user = req.user!;

    // Check eligibility
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Already verified' });
    if (user.postsCount < ELIGIBILITY_POSTS)
      return res.status(400).json({ success: false, message: `Need at least ${ELIGIBILITY_POSTS} published posts` });
    if (user.followersCount < ELIGIBILITY_FOLLOWERS)
      return res.status(400).json({ success: false, message: `Need at least ${ELIGIBILITY_FOLLOWERS} followers` });
    if (user.points < ELIGIBILITY_POINTS)
      return res.status(400).json({ success: false, message: `Need at least ${ELIGIBILITY_POINTS} contribution points` });

    // One pending request at a time
    const existing = await VerificationRequest.findOne({ user: user._id, status: 'pending' });
    if (existing) return res.status(409).json({ success: false, message: 'A pending request already exists' });

    const request = await VerificationRequest.create({
      user: user._id,
      statement: req.body.statement,
      links: req.body.links ?? [],
      postsCount: user.postsCount,
      followersCount: user.followersCount,
    });
    res.status(201).json({ success: true, data: { request } });
  } catch (err) { next(err); }
});

// GET /api/verification/my
router.get('/my', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const request = await VerificationRequest.findOne({ user: req.user!._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { request } });
  } catch (err) { next(err); }
});

// GET /api/verification (admin/mod only)
router.get('/', authenticate, requireMod, async (_req, res: any, next: any) => {
  try {
    const requests = await VerificationRequest.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .populate('user', 'username displayName avatar points postsCount followersCount');
    res.json({ success: true, data: { requests } });
  } catch (err) { next(err); }
});

// PATCH /api/verification/:id
router.patch('/:id', authenticate, requireMod, [
  body('status').isIn(['approved', 'rejected']),
  body('reviewNote').optional().trim().isLength({ max: 500 }),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const request = await VerificationRequest.findById(req.params.id);
    if (!request || request.status !== 'pending') return res.status(404).json({ success: false, message: 'Request not found or already reviewed' });

    request.status = req.body.status;
    request.reviewedBy = req.user!._id;
    request.reviewNote = req.body.reviewNote ?? '';
    await request.save();

    if (req.body.status === 'approved') {
      await User.findByIdAndUpdate(request.user, { isVerified: true });
    }

    const type = req.body.status === 'approved' ? 'verification_approved' : 'verification_rejected';
    const notif = await Notification.create({ recipient: request.user, type, message: req.body.status === 'approved' ? 'Your verification request was approved! You now have a blue tick.' : `Your verification request was rejected: ${req.body.reviewNote}` });
    emitNotification(String(request.user), notif);

    res.json({ success: true, data: { request } });
  } catch (err) { next(err); }
});

export default router;
