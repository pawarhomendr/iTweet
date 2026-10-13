import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILike extends Document {
  user: Types.ObjectId;
  targetType: 'post' | 'comment';
  target: Types.ObjectId;
  createdAt: Date;
}

const likeSchema = new Schema<ILike>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['post', 'comment'], required: true },
    target: { type: Schema.Types.ObjectId, required: true, refPath: 'targetType' },
  },
  { timestamps: true }
);

// Composite unique: one like per user per target
likeSchema.index({ user: 1, targetType: 1, target: 1 }, { unique: true });
likeSchema.index({ target: 1, targetType: 1 });

export const Like = mongoose.model<ILike>('Like', likeSchema);
