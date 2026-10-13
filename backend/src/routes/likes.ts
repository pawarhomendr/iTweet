import { Router } from 'express';
import { query } from 'express-validator';
import { Like } from '../models/Like';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// GET /api/likes/check?targetType=post&target=:id
// FIX I-1: validate query params — don't pass raw user input to findOne
router.get('/check', authenticate, [
  query('targetType').isIn(['post', 'comment']).withMessage('targetType must be post or comment'),
  query('target').isMongoId().withMessage('target must be a valid ID'),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { targetType, target } = req.query as { targetType: string; target: string };
    const like = await Like.findOne({ user: req.user!._id, targetType, target }).lean();
    res.json({ success: true, data: { liked: !!like } });
  } catch (err) { next(err); }
});

export default router;
