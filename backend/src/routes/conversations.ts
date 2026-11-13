import { Router } from 'express';
import { body } from 'express-validator';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { authenticate, requireEmailVerified, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { detectMimeFromBuffer, upload, uploadToCloudinary } from '../services/upload';
import { loadMessageReactions } from '../services/messageReactions';

const router = Router();

function isConversationMember(conv: { participants: unknown[] }, userId: string): boolean {
  return conv.participants.map((participant) => String(participant)).includes(userId);
}

async function attachReactions(messages: any[]) {
  const grouped = await loadMessageReactions(messages.map((message) => message._id));
  return messages.map((message) => ({
    ...(message.toObject ? message.toObject() : message),
    reactions: grouped.get(String(message._id)) ?? [],
  }));
}

// GET /api/conversations — list my conversations
router.get('/', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const convs = await Conversation.find({ participants: req.user!._id })
      .sort({ updatedAt: -1 })
      .populate('participants', 'username displayName avatar isVerified lastSeen')
      .populate('lastMessage');
    res.json({ success: true, data: { conversations: convs } });
  } catch (err) { next(err); }
});

// POST /api/conversations — start or get existing with a user
router.post('/', authenticate, requireEmailVerified, [
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
    }).populate('participants', 'username displayName avatar isVerified lastSeen').populate('lastMessage');

    if (!conv) {
      conv = await Conversation.create({ participants: [req.user!._id, other._id] });
      conv = await conv.populate('participants', 'username displayName avatar isVerified lastSeen');
    }

    res.json({ success: true, data: { conversation: conv } });
  } catch (err) { next(err); }
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const conv = await Conversation.findById(req.params.id).lean();
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    if (!isConversationMember(conv, String(req.user!._id))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const page = Math.max(1, parseInt(req.query.page as string ?? '1', 10));
    const limit = 50;
    const [messages, total] = await Promise.all([
      Message.find({ conversation: req.params.id })
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('sender', 'username displayName avatar isVerified'),
      Message.countDocuments({ conversation: req.params.id }),
    ]);

    // Mark unread
    await Message.updateMany({ conversation: req.params.id, sender: { $ne: req.user!._id }, isRead: false }, { isRead: true });

    const orderedMessages = messages.reverse();
    res.json({ success: true, data: { messages: await attachReactions(orderedMessages), total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// GET /api/conversations/:conversationId/messages/:messageId/image — private chat media download
router.get('/:conversationId/messages/:messageId/image', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const conv = await Conversation.findById(req.params.conversationId).lean();
    if (!conv || !isConversationMember(conv, String(req.user!._id))) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    const message = await Message.findOne({ _id: req.params.messageId, conversation: conv._id }).lean();
    if (!message?.imageUrl) return res.status(404).json({ success: false, message: 'Media not found' });

    let buffer: Buffer;
    let contentType = 'image/jpeg';
    if (message.imageUrl.startsWith('data:image/')) {
      const match = message.imageUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i);
      if (!match) return res.status(404).json({ success: false, message: 'Media not found' });
      contentType = match[1];
      buffer = Buffer.from(match[2], 'base64');
    } else {
      let mediaUrl: URL;
      try {
        mediaUrl = new URL(message.imageUrl);
      } catch {
        return res.status(404).json({ success: false, message: 'Media not found' });
      }
      if (mediaUrl.hostname !== 'res.cloudinary.com' || mediaUrl.protocol !== 'https:') {
        return res.status(404).json({ success: false, message: 'Media not found' });
      }
      const upstream = await fetch(mediaUrl);
      if (!upstream.ok) return res.status(404).json({ success: false, message: 'Media not found' });
      contentType = upstream.headers.get('content-type')?.split(';')[0] || contentType;
      const contentLength = Number(upstream.headers.get('content-length') ?? 0);
      if (!contentType.startsWith('image/') || contentLength > 10 * 1024 * 1024) {
        return res.status(404).json({ success: false, message: 'Media not found' });
      }
      buffer = Buffer.from(await upstream.arrayBuffer());
    }

    if (buffer.length > 10 * 1024 * 1024) return res.status(404).json({ success: false, message: 'Media not found' });
    const detectedMime = detectMimeFromBuffer(buffer);
    if (!detectedMime?.startsWith('image/')) return res.status(404).json({ success: false, message: 'Media not found' });
    contentType = detectedMime;

    const extension = contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="indiagram-chat-${req.params.messageId}.${extension}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.end(buffer);
  } catch (err) { next(err); }
});

// POST /api/conversations/:id/upload — upload image for chat
router.post('/:id/upload', authenticate, requireEmailVerified, upload.single('image'), async (req: AuthRequest, res: any, next: any) => {
  try {
    const conv = await Conversation.findById(req.params.id).lean();
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    if (!isConversationMember(conv, String(req.user!._id))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const uploaded = await uploadToCloudinary(req.file.buffer, 'chat');
    res.json({ success: true, data: { url: uploaded.url } });
  } catch (err) { next(err); }
});

export default router;
