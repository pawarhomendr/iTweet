import { Router } from 'express';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Follow } from '../models/Follow';
import { Notification } from '../models/Notification';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { awardPoints } from '../services/rewards';
import { emitNotification } from '../config/socket';
import { upload, uploadToCloudinary } from '../services/upload';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import xss from 'xss';

const router = Router();

function paginate(q: any) {
  const page = Math.max(1, parseInt(q.page ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(q.limit ?? '20', 10)));
  return { skip: (page - 1) * limit, limit, page };
}

// GET /api/users — search
router.get('/', optionalAuth, async (req: any, res: any, next: any) => {
  try {
    const { skip, limit, page } = paginate(req.query);
    const { search } = req.query as any;
    const filter: any = {};
    if (search) filter.$text = { $search: search };
    const [users, total] = await Promise.all([
      User.find(filter).sort(search ? { score: { $meta: 'textScore' } } : { points: -1 })
        .skip(skip).limit(limit).select('-__v'),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: { users, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// GET /api/users/:username
router.get('/:username', optionalAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    let isFollowing = false;
    if (req.user) {
      isFollowing = !!(await Follow.findOne({ follower: req.user._id, following: user._id }).lean());
    }
    const { skip, limit, page } = paginate(req.query);
    const [posts, postTotal] = await Promise.all([
      Post.find({ author: user._id, status: 'published' }).sort({ publishedAt: -1 }).skip(skip).limit(limit),
      Post.countDocuments({ author: user._id, status: 'published' }),
    ]);
    res.json({ success: true, data: { user, isFollowing, posts, postTotal, page, pages: Math.ceil(postTotal / limit) } });
  } catch (err) { next(err); }
});

// PATCH /api/users/me  — update own profile
router.patch('/me', authenticate, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), [
  body('displayName').optional().trim().isLength({ max: 60 }),
  body('bio').optional().trim().isLength({ max: 280 }),
  body('website').optional().isURL().withMessage('Invalid URL'),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const files = req.files as any;
    const update: any = {};
    if (req.body.displayName !== undefined) update.displayName = xss(req.body.displayName);
    if (req.body.bio !== undefined) update.bio = xss(req.body.bio);
    if (req.body.website !== undefined) update.website = req.body.website;
    if (files?.avatar?.[0]) {
  const uploadedAvatar = await uploadToCloudinary(
    files.avatar[0].buffer,
    'avatars'
  );
  update.avatar = uploadedAvatar.url;
}

if (files?.cover?.[0]) {
  const uploadedCover = await uploadToCloudinary(
    files.cover[0].buffer,
    'covers'
  );
  update.coverImage = uploadedCover.url;
}

    const user = await User.findByIdAndUpdate(req.user!._id, update, { new: true });
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
});

// POST /api/users/:username/follow — toggle follow
router.post('/:username/follow', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const target = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    if (String(target._id) === String(req.user!._id)) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }
    const existing = await Follow.findOne({ follower: req.user!._id, following: target._id });
    if (existing) {
      await existing.deleteOne();
      await User.findByIdAndUpdate(target._id, { $inc: { followersCount: -1 } });
      await User.findByIdAndUpdate(req.user!._id, { $inc: { followingCount: -1 } });
      res.json({ success: true, data: { following: false } });
    } else {
      await Follow.create({ follower: req.user!._id, following: target._id });
      await User.findByIdAndUpdate(target._id, { $inc: { followersCount: 1 } });
      await User.findByIdAndUpdate(req.user!._id, { $inc: { followingCount: 1 } });
      await awardPoints({ userId: target._id, action: 'follow_received', ref: req.user!._id, refType: 'User' });
      const notif = await Notification.create({ recipient: target._id, sender: req.user!._id, type: 'follow', message: `${req.user!.username} followed you` });
      emitNotification(String(target._id), notif);
      res.json({ success: true, data: { following: true } });
    }
  } catch (err) { next(err); }
});

// GET /api/users/:username/followers
router.get('/:username/followers', async (req: any, res: any, next: any) => {
  try {
    const user = await User.findOne({ username: req.params.username }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { skip, limit, page } = paginate(req.query);
    const [follows, total] = await Promise.all([
      Follow.find({ following: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('follower', 'username displayName avatar isVerified level'),
      Follow.countDocuments({ following: user._id }),
    ]);
    res.json({ success: true, data: { followers: follows.map((f) => f.follower), total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// GET /api/users/:username/following
router.get('/:username/following', async (req: any, res: any, next: any) => {
  try {
    const user = await User.findOne({ username: req.params.username }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { skip, limit, page } = paginate(req.query);
    const [follows, total] = await Promise.all([
      Follow.find({ follower: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('following', 'username displayName avatar isVerified level'),
      Follow.countDocuments({ follower: user._id }),
    ]);
    res.json({ success: true, data: { following: follows.map((f) => f.following), total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

export default router;
