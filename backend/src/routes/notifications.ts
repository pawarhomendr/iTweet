import { Router } from 'express';
import { Notification } from '../models/Notification';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string ?? '1', 10));
    const limit = 20;
    const [notifications, total, unread] = await Promise.all([
      Notification.find({ recipient: req.user!._id })
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('sender', 'username displayName avatar'),
      Notification.countDocuments({ recipient: req.user!._id }),
      Notification.countDocuments({ recipient: req.user!._id, isRead: false }),
    ]);
    res.json({ success: true, data: { notifications, total, unread, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    await Notification.updateMany({ recipient: req.user!._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    await Notification.updateOne({ _id: req.params.id, recipient: req.user!._id }, { isRead: true });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
