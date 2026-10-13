import { Router } from 'express';
import { body } from 'express-validator';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// GET /api/conversations — list my conversations
router.get('/', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const convs = await Conversation.find({ participants: req.user!._id })
      .sort({ updatedAt: -1 })
      .populate('participants', 'username displayName avatar isVerified')
      .populate('lastMessage');
    res.json({ success: true, data: { conversations: convs } });
  } catch (err) { next(err); }
});

// POST /api/conversations — start or get existing with a user
router.post('/', authenticate, [
  body('username').trim().notEmpty(),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const other = await User.findOne({ username: req.body.username.toLowerCase() });
    if (!other) return res.status(404).json({ success: false, message: 'User not found' });
    if (String(other._id) === String(req.user!._id)) {
      return res.status(400).json({ success: false, message: 'Cannot message yourself' });
    }

    // Find existing conversation between the two
    let conv = await Conversation.findOne({
      participants: { $all: [req.user!._id, other._id], $size: 2 },
    }).populate('participants', 'username displayName avatar isVerified').populate('lastMessage');

    if (!conv) {
      conv = await Conversation.create({ participants: [req.user!._id, other._id] });
      conv = await conv.populate('participants', 'username displayName avatar isVerified');
    }

    res.json({ success: true, data: { conversation: conv } });
  } catch (err) { next(err); }
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const conv = await Conversation.findById(req.params.id).lean();
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    const memberIds = conv.participants.map((p) => p.toString());
    if (!memberIds.includes(String(req.user!._id))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const page = Math.max(1, parseInt(req.query.page as string ?? '1', 10));
    const limit = 50;
    const [messages, total] = await Promise.all([
      Message.find({ conversation: req.params.id })
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('sender', 'username displayName avatar'),
      Message.countDocuments({ conversation: req.params.id }),
    ]);

    // Mark unread
    await Message.updateMany({ conversation: req.params.id, sender: { $ne: req.user!._id }, isRead: false }, { isRead: true });

    res.json({ success: true, data: { messages: messages.reverse(), total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

export default router;
