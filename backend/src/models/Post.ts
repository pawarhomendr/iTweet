import mongoose, { Document, Schema, Types } from 'mongoose';

export type PostStatus = 'draft' | 'pending' | 'published' | 'rejected';
export type PostCategory = 'news' | 'tutorial' | 'opinion' | 'showcase' | 'discussion' | 'other';
export type PostMediaType = 'post' | 'reel';

export interface IPost extends Document {
  author: Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: string;
  images: string[];
  videoUrl: string;
  mediaType: PostMediaType;
  category: PostCategory;
  tags: string[];
  sourceUrl: string;
  status: PostStatus;
  rejectionReason: string;
  publishedAt: Date | null;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  repostsCount: number;
  viewsCount: number;
  readMinutes: number;
  isPinned: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

const postSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    slug: { type: String, unique: true, lowercase: true },
    excerpt: { type: String, maxlength: 300, default: '' },
    body: { type: String, required: true, maxlength: 50000 },
    coverImage: { type: String, default: '' },
    images: [{ type: String }],
    videoUrl: { type: String, default: '' },
    mediaType: { type: String, enum: ['post', 'reel'], default: 'post' },
    category: {
      type: String,
      enum: ['news', 'tutorial', 'opinion', 'showcase', 'discussion', 'other'],
      default: 'other',
    },
    tags: [{ type: String, lowercase: true, maxlength: 30 }],
    sourceUrl: { type: String, maxlength: 500, default: '' },
    status: { type: String, enum: ['draft', 'pending', 'published', 'rejected'], default: 'draft' },
    rejectionReason: { type: String, default: '' },
    publishedAt: { type: Date, default: null },
    likesCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    bookmarksCount: { type: Number, default: 0, min: 0 },
    repostsCount: { type: Number, default: 0, min: 0 },
    viewsCount: { type: Number, default: 0, min: 0 },
    readMinutes: { type: Number, default: 1, min: 1 },
    isPinned: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-generate slug from title
postSchema.pre('save', async function (next) {
  if (!this.isModified('title') && this.slug) return next();
  const base = slugify(this.title);
  let slug = base;
  let i = 1;
  while (await mongoose.model('Post').exists({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${i++}`;
  }
  this.slug = slug;

  // Estimate read time (avg 200 wpm)
  const words = this.body.split(/\s+/).length;
  this.readMinutes = Math.max(1, Math.round(words / 200));
  next();
});

// Indexes
postSchema.index({ author: 1, status: 1, createdAt: -1 });
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ category: 1, status: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ title: 'text', excerpt: 'text', body: 'text' });
postSchema.index({ likesCount: -1, publishedAt: -1 }); // trending

export const Post = mongoose.model<IPost>('Post', postSchema);
