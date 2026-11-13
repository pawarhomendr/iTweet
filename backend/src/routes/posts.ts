import { Router } from 'express';
import { body } from 'express-validator';
import { Post } from '../models/Post';
import { Like } from '../models/Like';
import { Bookmark } from '../models/Bookmark';
import { Repost } from '../models/Repost';
import { Comment } from '../models/Comment';
import { Notification } from '../models/Notification';
import { authenticate, optionalAuth, requireEmailVerified, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadMedia, uploadToCloudinary } from '../services/upload';
import { awardPoints } from '../services/rewards';
import { emitNotification } from '../config/socket';
import { isSafeHttpUrl } from '../services/validation';
import xss from 'xss';

const router = Router();

function paginate(q: any) {
  const page = Math.max(1, parseInt(q.page ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(q.limit ?? '20', 10)));
  return { skip: (page - 1) * limit, limit, page };
}

// Helper to attach interaction flags (liked, bookmarked, reposted) to posts for authenticated users
async function attachInteractions(posts: any[], userId?: string) {
  if (!userId || posts.length === 0) {
    return posts.map((p) => {
      const obj = p.toObject ? p.toObject() : { ...p };
      return { ...obj, liked: false, bookmarked: false, reposted: false };
    });
  }

  const postIds = posts.map((p) => p._id);
  const [likes, bookmarks, reposts] = await Promise.all([
    Like.find({ user: userId, targetType: 'post', target: { $in: postIds } }).select('target').lean(),
    Bookmark.find({ user: userId, post: { $in: postIds } }).select('post').lean(),
    Repost.find({ user: userId, post: { $in: postIds } }).select('post').lean(),
  ]);

  const likedSet = new Set(likes.map((l) => String(l.target)));
  const bookmarkedSet = new Set(bookmarks.map((b) => String(b.post)));
  const repostedSet = new Set(reposts.map((r) => String(r.post)));

  return posts.map((p) => {
    const obj = p.toObject ? p.toObject() : { ...p };
    const id = String(obj._id);
    return {
      ...obj,
      liked: likedSet.has(id),
      bookmarked: bookmarkedSet.has(id),
      reposted: repostedSet.has(id),
    };
  });
}

// GET /api/posts — public feed
router.get('/', optionalAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { skip, limit, page } = paginate(req.query);
    const { category, tag, search, author, status, mediaType } = req.query as any;

    const filter: any = {};
    const isMod = req.user && ['moderator', 'admin'].includes(req.user.role);
    if (status && isMod) filter.status = status;
    else filter.status = 'published';

    if (category && category !== 'all') filter.category = category;
    if (tag && tag !== 'all') filter.tags = tag;
    if (author) filter.author = author;
    if (mediaType) filter.mediaType = mediaType;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { excerpt: { $regex: escaped, $options: 'i' } },
        { tags: { $in: [new RegExp(escaped, 'i')] } },
      ];
    }

    const [rawPosts, total] = await Promise.all([
      Post.find(filter)
        .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
        .skip(skip).limit(limit)
        .populate('author', 'username displayName avatar isVerified level bio'),
      Post.countDocuments(filter),
    ]);

    const posts = await attachInteractions(rawPosts, req.user?._id ? String(req.user._id) : undefined);

    res.json({ success: true, data: { posts, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// GET /api/posts/trending — ranked discovery
router.get('/trending', optionalAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { filter = 'trending' } = req.query as { filter?: string };
    const since = new Date(Date.now() - 30 * 86400_000); // last 30 days for relevance

    let sortOption: any = {};
    if (filter === 'most_liked') {
      sortOption = { likesCount: -1, publishedAt: -1 };
    } else if (filter === 'most_discussed') {
      sortOption = { commentsCount: -1, publishedAt: -1 };
    } else if (filter === 'recent') {
      sortOption = { publishedAt: -1, createdAt: -1 };
    } else {
      // Default: composite trending engagement
      sortOption = { likesCount: -1, commentsCount: -1, repostsCount: -1, viewsCount: -1, publishedAt: -1 };
    }

    const rawPosts = await Post.find({
      status: 'published',
      publishedAt: { $gte: since },
    })
      .sort(sortOption)
      .limit(30)
      .populate('author', 'username displayName avatar isVerified level bio');

    // If fewer than 5 posts found in last 30 days, backfill with overall published posts
    let finalPosts = rawPosts;
    if (finalPosts.length < 5) {
      finalPosts = await Post.find({ status: 'published' })
        .sort(sortOption)
        .limit(30)
        .populate('author', 'username displayName avatar isVerified level bio');
    }

    const posts = await attachInteractions(finalPosts, req.user?._id ? String(req.user._id) : undefined);

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

    let liked = false, bookmarked = false, reposted = false;
    if (req.user) {
      const [lk, bm, rp] = await Promise.all([
        Like.findOne({ user: req.user._id, targetType: 'post', target: post._id }).lean(),
        Bookmark.findOne({ user: req.user._id, post: post._id }).lean(),
        Repost.findOne({ user: req.user._id, post: post._id }).lean(),
      ]);
      liked = !!lk;
      bookmarked = !!bm;
      reposted = !!rp;
    }
    res.json({ success: true, data: { post, liked, bookmarked, reposted } });
  } catch (err) { next(err); }
});

// POST /api/posts — create Post or Reel
router.post(
  '/',
  authenticate,
  requireEmailVerified,
  uploadMedia.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'images', maxCount: 5 },
    { name: 'video', maxCount: 1 },
  ]),
  [
    body('title').trim().isLength({ min: 5, max: 120 }),
    body('body').trim().isLength({ min: 1, max: 50000 }),
    body('category').optional().isIn(['news', 'tutorial', 'opinion', 'showcase', 'discussion', 'other']),
    body('mediaType').optional().isIn(['post', 'reel']),
    body('excerpt').optional().trim().isLength({ max: 300 }),
    body('tags').optional(),
    body('sourceUrl').optional({ checkFalsy: true }).custom((value) => {
      if (!isSafeHttpUrl(value)) {
        throw new Error('Source URL must be a valid HTTP or HTTPS URL');
      }
      return true;
    }),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      let coverImage = '';
      let videoUrl = '';
      const images: string[] = [];

      if (files?.cover?.[0]) {
        const uploadedCover = await uploadToCloudinary(files.cover[0].buffer, 'covers');
        coverImage = uploadedCover.url;
      }

      if (files?.video?.[0]) {
        const uploadedVideo = await uploadToCloudinary(files.video[0].buffer, 'reels');
        videoUrl = uploadedVideo.url;
      }

      if (files?.images) {
        for (const f of files.images) {
          const uploadedImage = await uploadToCloudinary(f.buffer, 'posts');
          images.push(uploadedImage.url);
        }
      }

      const tags = (req.body.tags ?? '')
        .split(',')
        .map((t: string) => t.trim().toLowerCase().slice(0, 30))
        .filter(Boolean)
        .slice(0, 8);

      const mediaType = req.body.mediaType === 'reel' || videoUrl ? 'reel' : 'post';

      const post = await Post.create({
        author: req.user!._id,
        title: xss(req.body.title),
        excerpt: xss(req.body.excerpt ?? ''),
        body: xss(req.body.body),
        coverImage,
        videoUrl,
        mediaType,
        images,
        category: req.body.category || 'other',
        tags,
        sourceUrl: req.body.sourceUrl ? req.body.sourceUrl.trim() : '',
        status: 'pending',
      });

      res.status(201).json({ success: true, data: { post } });
    } catch (err) { next(err); }
  }
);

// PATCH /api/posts/:id — edit (owner or moderator)
router.patch(
  '/:id',
  authenticate,
  requireEmailVerified,
  uploadMedia.fields([{ name: 'cover', maxCount: 1 }]),
  [
    body('title').optional().trim().isLength({ min: 5, max: 120 }),
    body('body').optional().trim().isLength({ min: 1, max: 50000 }),
    body('excerpt').optional().trim().isLength({ max: 300 }),
    body('category').optional().isIn(['news', 'tutorial', 'opinion', 'showcase', 'discussion', 'other']),
    body('sourceUrl').optional({ checkFalsy: true }).custom((value) => {
      if (!isSafeHttpUrl(value)) {
        throw new Error('Source URL must be a valid HTTP or HTTPS URL');
      }
      return true;
    }),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

      const isMod = ['moderator', 'admin'].includes(req.user!.role);
      const isOwner = String(post.author) === String(req.user!._id);
      if (!isMod && !isOwner) return res.status(403).json({ success: false, message: 'Forbidden' });

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (files?.cover?.[0]) {
        const uploadedCover = await uploadToCloudinary(files.cover[0].buffer, 'covers');
        post.coverImage = uploadedCover.url;
      }

      if (req.body.title !== undefined) post.title = xss(req.body.title);
      if (req.body.body !== undefined) post.body = xss(req.body.body);
      if (req.body.excerpt !== undefined) post.excerpt = xss(req.body.excerpt);
      if (req.body.category !== undefined) post.category = req.body.category;
      if (req.body.sourceUrl !== undefined) post.sourceUrl = req.body.sourceUrl.trim();
      if (req.body.tags !== undefined) {
        post.tags = String(req.body.tags)
          .split(',')
          .map((tag: string) => tag.trim().toLowerCase().slice(0, 30))
          .filter(Boolean)
          .slice(0, 8);
      }

      // A creator edit must return a published post to moderation. Moderators
      // can correct content without taking it out of its current state.
      if (isOwner && !isMod && post.status === 'published') {
        post.status = 'pending';
        post.publishedAt = null;
      }

      await post.save();
      res.json({ success: true, data: { post } });
    } catch (err) { next(err); }
  },
);

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
      if (String(post.author) !== String(req.user!._id)) {
        await awardPoints({ userId: post.author, action: 'like_received', ref: post._id, refType: 'Post' });
        const notif = await Notification.create({
          recipient: post.author,
          sender: req.user!._id,
          type: 'like_post',
          post: post._id,
          message: `${req.user!.username} liked your post`,
        });
        emitNotification(String(post.author), notif);
      }
      res.json({ success: true, data: { liked: true } });
    }
  } catch (err) { next(err); }
});

// POST /api/posts/:id/repost — toggle repost
router.post('/:id/repost', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.status !== 'published') return res.status(404).json({ success: false, message: 'Post not found' });

    const existing = await Repost.findOne({ user: req.user!._id, post: post._id });
    if (existing) {
      await existing.deleteOne();
      await Post.findByIdAndUpdate(post._id, { $inc: { repostsCount: -1 } });
      res.json({ success: true, data: { reposted: false } });
    } else {
      await Repost.create({ user: req.user!._id, post: post._id });
      await Post.findByIdAndUpdate(post._id, { $inc: { repostsCount: 1 } });
      if (String(post.author) !== String(req.user!._id)) {
        await awardPoints({ userId: post.author, action: 'like_received', ref: post._id, refType: 'Post' });
        const notif = await Notification.create({
          recipient: post.author,
          sender: req.user!._id,
          type: 'like_post',
          post: post._id,
          message: `${req.user!.username} reposted your post`,
        });
        emitNotification(String(post.author), notif);
      }
      res.json({ success: true, data: { reposted: true } });
    }
  } catch (err) { next(err); }
});

// POST /api/posts/:id/bookmark — toggle bookmark
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

// GET /api/posts/user/:userId/bookmarks — private to account owner
router.get('/user/:userId/bookmarks', authenticate, async (req: AuthRequest, res: any, next: any) => {
  try {
    if (String(req.user!._id) !== req.params.userId) {
      return res.status(403).json({ success: false, message: 'Bookmarks are private' });
    }
    const { skip, limit, page } = paginate(req.query);
    const [bookmarks, total] = await Promise.all([
      Bookmark.find({ user: req.params.userId })
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit)
        .populate({
          path: 'post',
          populate: { path: 'author', select: 'username displayName avatar isVerified level bio' },
        }),
      Bookmark.countDocuments({ user: req.params.userId }),
    ]);

    const rawPosts = bookmarks.map((b: any) => b.post).filter(Boolean);
    const posts = await attachInteractions(rawPosts, String(req.user!._id));

    res.json({ success: true, data: { bookmarks: posts, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// GET /api/posts/user/:userId/reposts — profile Reposts tab
router.get('/user/:userId/reposts', optionalAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { skip, limit, page } = paginate(req.query);
    const [reposts, total] = await Promise.all([
      Repost.find({ user: req.params.userId })
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit)
        .populate({
          path: 'post',
          populate: { path: 'author', select: 'username displayName avatar isVerified level bio' },
        }),
      Repost.countDocuments({ user: req.params.userId }),
    ]);

    const rawPosts = reposts.map((r: any) => r.post).filter((p) => p && p.status === 'published');
    const posts = await attachInteractions(rawPosts, req.user?._id ? String(req.user._id) : undefined);

    res.json({ success: true, data: { posts, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// GET /api/posts/user/:userId/likes — profile Likes tab
router.get('/user/:userId/likes', optionalAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { skip, limit, page } = paginate(req.query);
    const [likes, total] = await Promise.all([
      Like.find({ user: req.params.userId, targetType: 'post' })
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit)
        .populate({
          path: 'target',
          model: 'Post',
          populate: { path: 'author', select: 'username displayName avatar isVerified level bio' },
        }),
      Like.countDocuments({ user: req.params.userId, targetType: 'post' }),
    ]);

    const rawPosts = likes.map((l: any) => l.target).filter((p) => p && p.status === 'published');
    const posts = await attachInteractions(rawPosts, req.user?._id ? String(req.user._id) : undefined);

    res.json({ success: true, data: { posts, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// GET /api/posts/user/:userId/replies — profile Replies tab
router.get('/user/:userId/replies', optionalAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { skip, limit, page } = paginate(req.query);
    const [comments, total] = await Promise.all([
      Comment.find({ author: req.params.userId, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit)
        .populate('author', 'username displayName avatar isVerified level')
        .populate({
          path: 'post',
          populate: { path: 'author', select: 'username displayName avatar isVerified' },
        }),
      Comment.countDocuments({ author: req.params.userId, isDeleted: false }),
    ]);

    res.json({ success: true, data: { replies: comments, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// GET /api/posts/user/:userId/media — profile Media tab
router.get('/user/:userId/media', optionalAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { skip, limit, page } = paginate(req.query);
    const filter = {
      author: req.params.userId,
      status: 'published',
      $or: [
        { coverImage: { $ne: '' } },
        { images: { $exists: true, $ne: [] } },
        { videoUrl: { $ne: '' } },
      ],
    };

    const [rawPosts, total] = await Promise.all([
      Post.find(filter)
        .sort({ publishedAt: -1 })
        .skip(skip).limit(limit)
        .populate('author', 'username displayName avatar isVerified level bio'),
      Post.countDocuments(filter),
    ]);

    const posts = await attachInteractions(rawPosts, req.user?._id ? String(req.user._id) : undefined);

    res.json({ success: true, data: { posts, total, page, pages: Math.ceil(total / limit) } });
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
    await Promise.all([
      Like.deleteMany({ targetType: 'post', target: post._id }),
      Bookmark.deleteMany({ post: post._id }),
      Repost.deleteMany({ post: post._id }),
      Comment.deleteMany({ post: post._id }),
    ]);
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) { next(err); }
});

export default router;
