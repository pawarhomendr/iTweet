import { Router } from 'express';
import { User } from '../models/User';
import { RewardLedger } from '../models/RewardLedger';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/rewards/leaderboard
router.get('/leaderboard', async (_req, res: any, next: any) => {
  try {
    const users = await User.find().sort({ points: -1 }).limit(50)
      .select('username displayName avatar isVerified points level badges followersCount postsCount');
    res.json({ success: true, data: { leaderboard: users } });
  } catch (err) { next(err); }
});

// GET /api/rewards/monthly-leaderboard
router.get('/monthly-leaderboard', async (_req, res: any, next: any) => {
  try {
    const start = new Date();
    start.setDate(1); start.setHours(0, 0, 0, 0);
    const agg = await RewardLedger.aggregate([
      { $match: { createdAt: { $gte: start }, points: { $gt: 0 } } },
      { $group: { _id: '$user', total: { $sum: '$points' } } },
      { $sort: { total: -1 } },
      { $limit: 50 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { total: 1, 'user.username': 1, 'user.displayName': 1, 'user.avatar': 1, 'user.isVerified': 1, 'user.level': 1 } },
    ]);
    res.json({ success: true, data: { leaderboard: agg } });
  } catch (err) { next(err); }
});

// GET /api/rewards/me — my ledger
router.get('/me', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string ?? '1', 10));
    const limit = 20;
    const [entries, total] = await Promise.all([
      RewardLedger.find({ user: req.user!._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      RewardLedger.countDocuments({ user: req.user!._id }),
    ]);
    res.json({ success: true, data: { entries, total, points: req.user!.points, level: req.user!.level, badges: req.user!.badges, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

export default router;
