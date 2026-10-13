import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { Post } from '../models/Post';
import { Like } from '../models/Like';
import { Bookmark } from '../models/Bookmark';
import { Notification } from '../models/Notification';
import { authenticate, optionalAuth, requireMod, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload, uploadToCloudinary } from '../services/upload';
import { awardPoints } from '../services/rewards';
import { emitNotification } from '../config/socket';
import xss from 'xss';

const router = Router();

function paginate(q: any) {
  const page = Math.max(1, parseInt(q.page ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(q.limit ?? '20', 10)));
  return { skip: (page - 1) * limit, limit, page };
}

// GET /api/posts  — public feed
router.get('/', optionalAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { skip, limit, page } = paginate(req.query);
    const { category, tag, search, author, status } = req.query as any;

    const filter: any = {};
    // Only mods/admins can see non-published
    const isMod = req.user && ['moderator', 'admin'].includes(req.user.role);
    if (status && isMod) filter.status = status;
    else filter.status = 'published';

    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (author) filter.author = author;
    if (search) filter.$text = { $search: search };

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort(search ? { score: { $meta: 'textScore' }, publishedAt: -1 } : { publishedAt: -1 })
        .skip(skip).limit(limit)
        .populate('author', 'username displayName avatar isVerified level'),
      Post.countDocuments(filter),
    ]);

    res.json({ success: true, data: { posts, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// GET /api/posts/trending
router.get('/trending', async (_req, res: any, next: any) => {
  try {
    const since = new Date(Date.now() - 7 * 86400_000);
    const posts = await Post.find({ status: 'published', publishedAt: { $gte: since } })
      .sort({ likesCount: -1, commentsCount: -1, viewsCount: -1 })
      .limit(10)
      .populate('author', 'username displayName avatar isVerified');
    res.json({ success: true, data: { posts } });
  } catch (err) { next(err); }
});

// GET /api/posts/:slug
router.get('/:slug', optionalAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug })
      .populate('author', 'username displayName avatar isVerified level bio followersCount postsCount');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.status !== 'published') {
      const isMod = req.user && ['moderator', 'admin'].includes(req.user.role);
      const isOwner = req.user && String(req.user._id) === String(post.author._id);
      if (!isMod && !isOwner) return res.status(404).json({ success: false, message: 'Post not found' });
    }
    // Increment view count (fire-and-forget)
    Post.findByIdAndUpdate(post._id, { $inc: { viewsCount: 1 } }).exec();

    // Check if current user liked/bookmarked
    let liked = false, bookmarked = false;
    if (req.user) {
      const [lk, bm] = await Promise.all([
        Like.findOne({ user: req.user._id, targetType: 'post', target: post._id }).lean(),
        Bookmark.findOne({ user: req.user._id, post: post._id }).lean(),
      ]);
      liked = !!lk;
      bookmarked = !!bm;
    }
    res.json({ success: true, data: { post, liked, bookmarked } });
  } catch (err) { next(err); }
});

// POST /api/posts  — create
router.post('/', authenticate, upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'images', maxCount: 5 }]), [
  body('title').trim().isLength({ min: 5, max: 120 }),
  body('body').trim().isLength({ min: 50, max: 50000 }),
  body('category').isIn(['news', 'tutorial', 'opinion', 'showcase', 'discussion', 'other']),
  body('excerpt').optional().trim().isLength({ max: 300 }),
  body('tags').optional(),
  body('sourceUrl').optional().isURL().withMessage('Invalid source URL'),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let coverImage = '';
    const images: string[] = [];

    if (files?.cover?.[0]) {
      coverImage = await uploadToCloudinary(files.cover[0].buffer, 'covers');
    }
    if (files?.images) {
      for (const f of files.images) {
        images.push(await uploadToCloudinary(f.buffer, 'posts'));
      }
    }

    const tags = (req.body.tags ?? '')
      .split(',')
      .map((t: string) => t.trim().toLowerCase().slice(0, 30))
      .filter(Boolean)
      .slice(0, 8);

    const post = await Post.create({
      author: req.user!._id,
      title: xss(req.body.title),
      excerpt: xss(req.body.excerpt ?? ''),
      body: xss(req.body.body),
      coverImage,
      images,
      category: req.body.category,
      tags,
      sourceUrl: req.body.sourceUrl ?? '',
      status: 'pending',
    });

    res.status(201).json({ success: true, data: { post } });
  } catch (err) { next(err); }
});

// PATCH /api/posts/:id  — edit (owner or mod)
router.patch('/:id', authenticate, upload.fields([{ name: 'cover', maxCount: 1 }]), [
  body('title').optional().trim().isLength({ min: 5, max: 120 }),
  body('body').optional().trim().isLength({ min: 50, max: 50000 }),
  body('category').optional().isIn(['news', 'tutorial', 'opinion', 'showcase', 'discussion', 'other']),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    const isMod = ['moderator', 'admin'].includes(req.user!.role);
    const isOwner = String(post.author) === String(req.user!._id);
    if (!isMod && !isOwner) return res.status(403).json({ success: false, message: 'Forbidden' });

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files?.cover?.[0]) {
      post.coverImage = await uploadToCloudinary(files.cover[0].buffer, 'covers');
    }

    const allowed = ['title', 'body', 'excerpt', 'category', 'tags', 'sourceUrl'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) (post as any)[key] = key === 'tags'
        ? req.body.tags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean).slice(0, 8)
        : xss(req.body[key]);
    }
    // Re-queue for review if non-mod edits published post
    if (isOwner && !isMod && post.status === 'published') post.status = 'pending';
    await post.save();

    res.json({ success: true, data: { post } });
  } catch (err) { next(err); }
});

// DELETE /api/posts/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    const isMod = ['moderator', 'admin'].includes(req.user!.role);
    const isOwner = String(post.author) === String(req.user!._id);
    if (!isMod && !isOwner) return res.status(403).json({ success: false, message: 'Forbidden' });
    await post.deleteOne();
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) { next(err); }
});

// POST /api/posts/:id/like — toggle like
router.post('/:id/like', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.status !== 'published') return res.status(404).json({ success: false, message: 'Post not found' });

    const existing = await Like.findOne({ user: req.user!._id, targetType: 'post', target: post._id });
    if (existing) {
      await existing.deleteOne();
      await Post.findByIdAndUpdate(post._id, { $inc: { likesCount: -1 } });
      res.json({ success: true, data: { liked: false } });
    } else {
      await Like.create({ user: req.user!._id, targetType: 'post', target: post._id });
      await Post.findByIdAndUpdate(post._id, { $inc: { likesCount: 1 } });
      // Reward post author (not self-like)
      if (String(post.author) !== String(req.user!._id)) {
        await awardPoints({ userId: post.author, action: 'like_received', ref: post._id, refType: 'Post' });
        const notif = await Notification.create({ recipient: post.author, sender: req.user!._id, type: 'like_post', post: post._id, message: `${req.user!.username} liked your post` });
        emitNotification(String(post.author), notif);
      }
      res.json({ success: true, data: { liked: true } });
    }
  } catch (err) { next(err); }
});

// POST /api/posts/:id/bookmark
router.post('/:id/bookmark', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.status !== 'published') return res.status(404).json({ success: false, message: 'Post not found' });
    const existing = await Bookmark.findOne({ user: req.user!._id, post: post._id });
    if (existing) {
      await existing.deleteOne();
      await Post.findByIdAndUpdate(post._id, { $inc: { bookmarksCount: -1 } });
      res.json({ success: true, data: { bookmarked: false } });
    } else {
      await Bookmark.create({ user: req.user!._id, post: post._id });
      await Post.findByIdAndUpdate(post._id, { $inc: { bookmarksCount: 1 } });
      res.json({ success: true, data: { bookmarked: true } });
    }
  } catch (err) { next(err); }
});

// GET /api/posts/user/:userId/bookmarks
router.get('/user/:userId/bookmarks', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    if (String(req.user!._id) !== req.params.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { skip, limit, page } = paginate(req.query);
    const [bookmarks, total] = await Promise.all([
      Bookmark.find({ user: req.params.userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate({ path: 'post', populate: { path: 'author', select: 'username displayName avatar isVerified' } }),
      Bookmark.countDocuments({ user: req.params.userId }),
    ]);
    res.json({ success: true, data: { bookmarks: bookmarks.map((b) => b.post), total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

export default router;
