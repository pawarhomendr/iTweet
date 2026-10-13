import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IComment extends Document {
  post: Types.ObjectId;
  author: Types.ObjectId;
  parent: Types.ObjectId | null;
  text: string;
  likesCount: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
    likesCount: { type: Number, default: 0, min: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, parent: 1, createdAt: 1 });
commentSchema.index({ author: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
