import { Router } from 'express';
import { body } from 'express-validator';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { Like } from '../models/Like';
import { Notification } from '../models/Notification';
import { authenticate, optionalAuth, requireEmailVerified, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { awardPoints } from '../services/rewards';
import { emitNotification } from '../config/socket';
import xss from 'xss';

const router = Router();

// GET /api/posts/:postId/comments
router.get('/:postId/comments', optionalAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string ?? '1', 10));
    const limit = 20;
    const [comments, total] = await Promise.all([
      Comment.find({ post: req.params.postId, parent: null, isDeleted: false })
        .sort({ createdAt: 1 }).skip((page - 1) * limit).limit(limit)
        .populate('author', 'username displayName avatar isVerified level'),
      Comment.countDocuments({ post: req.params.postId, parent: null, isDeleted: false }),
    ]);
    res.json({ success: true, data: { comments, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// GET /api/posts/:postId/comments/:commentId/replies
router.get('/:postId/comments/:commentId/replies', async (req: any, res: any, next: any) => {
  try {
    const replies = await Comment.find({ post: req.params.postId, parent: req.params.commentId, isDeleted: false })
      .sort({ createdAt: 1 })
      .populate('author', 'username displayName avatar isVerified level');
    res.json({ success: true, data: { replies } });
  } catch (err) { next(err); }
});

// POST /api/posts/:postId/comments
router.post('/:postId/comments', authenticate, requireEmailVerified, [
  body('text').trim().isLength({ min: 1, max: 1000 }),
  body('parent').optional().isMongoId(),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post || post.status !== 'published') return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = await Comment.create({
      post: post._id,
      author: req.user!._id,
      parent: req.body.parent ?? null,
      text: xss(req.body.text),
    });

    await Post.findByIdAndUpdate(post._id, { $inc: { commentsCount: 1 } });
    const populated = await comment.populate('author', 'username displayName avatar isVerified level');

    // Reward commenter
    await awardPoints({ userId: req.user!._id, action: 'comment', ref: comment._id, refType: 'Comment' });

    // Notify post author
    if (String(post.author) !== String(req.user!._id)) {
      const type = req.body.parent ? 'reply' : 'comment';
      const notif = await Notification.create({
        recipient: post.author,
        sender: req.user!._id,
        type,
        post: post._id,
        comment: comment._id,
        message: `${req.user!.username} ${type === 'reply' ? 'replied to a comment on' : 'commented on'} your post`,
      });
      emitNotification(String(post.author), notif);
    }

    res.status(201).json({ success: true, data: { comment: populated } });
  } catch (err) { next(err); }
});

// PATCH /api/posts/:postId/comments/:id
router.patch('/:postId/comments/:id', authenticate, requireEmailVerified, [
  body('text').trim().isLength({ min: 1, max: 1000 }),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment || comment.isDeleted) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (String(comment.author) !== String(req.user!._id)) return res.status(403).json({ success: false, message: 'Forbidden' });
    comment.text = xss(req.body.text);
    await comment.save();
    res.json({ success: true, data: { comment } });
  } catch (err) { next(err); }
});

// DELETE /api/posts/:postId/comments/:id
router.delete('/:postId/comments/:id', authenticate, requireEmailVerified, async (req: AuthRequest, res: any, next: any) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    const isMod = ['moderator', 'admin'].includes(req.user!.role);
    const isOwner = String(comment.author) === String(req.user!._id);
    if (!isMod && !isOwner) return res.status(403).json({ success: false, message: 'Forbidden' });
    comment.isDeleted = true;
    comment.text = '[deleted]';
    await comment.save();
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) { next(err); }
});

// POST /api/posts/:postId/comments/:id/like — toggle
router.post('/:postId/comments/:id/like', authenticate, requireEmailVerified, async (req: AuthRequest, res: any, next: any) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment || comment.isDeleted) return res.status(404).json({ success: false, message: 'Comment not found' });
    const existing = await Like.findOne({ user: req.user!._id, targetType: 'comment', target: comment._id });
    if (existing) {
      await existing.deleteOne();
      await Comment.findByIdAndUpdate(comment._id, { $inc: { likesCount: -1 } });
      res.json({ success: true, data: { liked: false } });
    } else {
      await Like.create({ user: req.user!._id, targetType: 'comment', target: comment._id });
      await Comment.findByIdAndUpdate(comment._id, { $inc: { likesCount: 1 } });
      res.json({ success: true, data: { liked: true } });
    }
  } catch (err) { next(err); }
});

export default router;
