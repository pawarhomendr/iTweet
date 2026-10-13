import { Router } from 'express';
import { body } from 'express-validator';
import { Report } from '../models/Report';
import { authenticate, requireMod, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// POST /api/reports
router.post('/', authenticate, [
  body('targetType').isIn(['post', 'comment', 'user']),
  body('target').isMongoId(),
  body('reason').isIn(['spam', 'harassment', 'misinformation', 'adult_content', 'hate_speech', 'other']),
  body('details').optional().trim().isLength({ max: 500 }),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    // Prevent duplicate report from same user
    const existing = await Report.findOne({ reporter: req.user!._id, targetType: req.body.targetType, target: req.body.target });
    if (existing) return res.status(409).json({ success: false, message: 'Already reported' });

    const report = await Report.create({
      reporter: req.user!._id,
      targetType: req.body.targetType,
      target: req.body.target,
      reason: req.body.reason,
      details: req.body.details ?? '',
    });
    res.status(201).json({ success: true, data: { report } });
  } catch (err) { next(err); }
});

// GET /api/reports (mod only)
router.get('/', authenticate, requireMod, async (req: any, res: any, next: any) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limit = 20;
    const status = req.query.status ?? 'open';
    const [reports, total] = await Promise.all([
      Report.find({ status }).sort({ createdAt: 1 }).skip((page - 1) * limit).limit(limit)
        .populate('reporter', 'username avatar'),
      Report.countDocuments({ status }),
    ]);
    res.json({ success: true, data: { reports, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// PATCH /api/reports/:id
router.patch('/:id', authenticate, requireMod, [
  body('status').isIn(['resolved', 'dismissed']),
  body('reviewNote').optional().trim().isLength({ max: 500 }),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, reviewedBy: req.user!._id, reviewNote: req.body.reviewNote ?? '' },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: { report } });
  } catch (err) { next(err); }
});

export default router;
