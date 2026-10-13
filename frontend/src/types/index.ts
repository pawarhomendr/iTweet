// Shared API types mirrored from backend models

export type UserRole = 'user' | 'moderator' | 'admin';
export type CreatorLevel = 'newbie' | 'contributor' | 'regular' | 'veteran' | 'legend';
export type PostStatus = 'draft' | 'pending' | 'published' | 'rejected';
export type PostCategory = 'news' | 'tutorial' | 'opinion' | 'showcase' | 'discussion' | 'other';
export type NotificationType =
  | 'like_post' | 'like_comment' | 'comment' | 'reply' | 'follow'
  | 'post_approved' | 'post_rejected' | 'verification_approved' | 'verification_rejected' | 'message';

export interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  avatar: string;
  coverImage: string;
  website: string;
  role: UserRole;
  isVerified: boolean;
  isSuspended: boolean;
  emailVerified: boolean;
  points: number;
  level: CreatorLevel;
  badges: string[];
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
}

export interface Post {
  _id: string;
  author: User;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: string;
  images: string[];
  category: PostCategory;
  tags: string[];
  sourceUrl: string;
  status: PostStatus;
  rejectionReason: string;
  publishedAt: string | null;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  viewsCount: number;
  readMinutes: number;
  isPinned: boolean;
  isFeatured: boolean;
  createdAt: string;
}

export interface Comment {
  _id: string;
  post: string;
  author: User;
  parent: string | null;
  text: string;
  likesCount: number;
  isDeleted: boolean;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  lastMessage: Message | null;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: User;
  text: string;
  isRead: boolean;
  createdAt: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  sender: User | null;
  type: NotificationType;
  post: Post | null;
  comment: Comment | null;
  conversation: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface RewardEntry {
  _id: string;
  user: string;
  action: string;
  points: number;
  note: string;
  createdAt: string;
}

export interface LeaderboardUser extends User {
  total?: number; // monthly leaderboard
}

export interface VerificationRequest {
  _id: string;
  user: User;
  status: 'pending' | 'approved' | 'rejected';
  statement: string;
  links: string[];
  postsCount: number;
  followersCount: number;
  reviewedBy: User | null;
  reviewNote: string;
  createdAt: string;
}

export interface Report {
  _id: string;
  reporter: User;
  targetType: 'post' | 'comment' | 'user';
  target: string;
  reason: string;
  details: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}
