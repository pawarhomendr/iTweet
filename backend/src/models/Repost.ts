import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRepost extends Document {
  user: Types.ObjectId;
  post: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const repostSchema = new Schema<IRepost>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  },
  { timestamps: true }
);

repostSchema.index({ user: 1, post: 1 }, { unique: true });
repostSchema.index({ user: 1, createdAt: -1 });
repostSchema.index({ post: 1 });

export const Repost = mongoose.model<IRepost>('Repost', repostSchema);
