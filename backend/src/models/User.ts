import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'user' | 'moderator' | 'admin';
export type CreatorLevel = 'newbie' | 'contributor' | 'regular' | 'veteran' | 'legend';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  displayName: string;
  bio: string;
  avatar: string;
  coverImage: string;
  website: string;
  role: UserRole;
  isVerified: boolean;
  isSuspended: boolean;
  isDisabled: boolean;
  suspendedReason: string;
  suspendedUntil: Date | null;
  emailVerified: boolean;
  emailVerifyToken: string | null;
  emailVerifyExpires: Date | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  refreshToken: string | null;
  points: number;
  level: CreatorLevel;
  badges: string[];
  followersCount: number;
  followingCount: number;
  postsCount: number;
  lastSeen?: Date;
  ageConfirmed: boolean;
  ageConfirmedAt: Date | null;
  termsAcceptedVersion: string;
  termsAcceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String, required: true, unique: true, lowercase: true, trim: true,
      minlength: 3, maxlength: 30,
      match: [/^[a-z0-9_-]+$/, 'Username may only contain lowercase letters, numbers, underscores, and hyphens'],
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    displayName: { type: String, trim: true, maxlength: 60, default: '' },
    bio: { type: String, maxlength: 280, default: '' },
    avatar: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    website: { type: String, maxlength: 200, default: '' },
    role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    suspendedReason: { type: String, default: '' },
    suspendedUntil: { type: Date, default: null },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, default: null, select: false },
    emailVerifyExpires: { type: Date, default: null, select: false },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
    refreshToken: { type: String, default: null, select: false },
    points: { type: Number, default: 0, min: 0 },
    level: { type: String, enum: ['newbie', 'contributor', 'regular', 'veteran', 'legend'], default: 'newbie' },
    badges: [{ type: String }],
    followersCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    postsCount: { type: Number, default: 0, min: 0 },
    lastSeen: { type: Date, default: Date.now },
    ageConfirmed: { type: Boolean, default: false },
    ageConfirmedAt: { type: Date, default: null },
    termsAcceptedVersion: { type: String, default: '' },
    termsAcceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ points: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ username: 'text', displayName: 'text', bio: 'text' });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// Compute creator level from points
userSchema.pre('save', function (next) {
  if (!this.isModified('points')) return next();
  if (this.points >= 10000) this.level = 'legend';
  else if (this.points >= 2500) this.level = 'veteran';
  else if (this.points >= 500) this.level = 'regular';
  else if (this.points >= 100) this.level = 'contributor';
  else this.level = 'newbie';
  next();
});

// Never leak password field
// Never expose credentials or security tokens in JSON responses
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const safe = { ...ret } as Record<string, unknown>;

    delete safe.password;
    delete safe.emailVerifyToken;
    delete safe.emailVerifyExpires;
    delete safe.passwordResetToken;
    delete safe.passwordResetExpires;
    delete safe.refreshToken;

    return safe;
  },
});

export const User = mongoose.model<IUser>('User', userSchema);
