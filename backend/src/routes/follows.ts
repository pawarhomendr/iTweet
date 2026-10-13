import { Router } from 'express';
import { Follow } from '../models/Follow';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Already handled in users.ts (POST /:username/follow)
// This file exposes feed endpoints

// GET /api/follows/feed  — posts from followed users
router.get('/feed', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string ?? '1', 10));
    const limit = 20;
    const follows = await Follow.find({ follower: req.user!._id }).select('following').lean();
    const followingIds = follows.map((f) => f.following);
    const { Post } = await import('../models/Post');
    const [posts, total] = await Promise.all([
      Post.find({ author: { $in: followingIds }, status: 'published' })
        .sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('author', 'username displayName avatar isVerified level'),
      Post.countDocuments({ author: { $in: followingIds }, status: 'published' }),
    ]);
    res.json({ success: true, data: { posts, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

export default router;
