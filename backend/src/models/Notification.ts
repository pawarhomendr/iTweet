import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType =
  | 'like_post'
  | 'like_comment'
  | 'comment'
  | 'reply'
  | 'follow'
  | 'post_approved'
  | 'post_rejected'
  | 'verification_approved'
  | 'verification_rejected'
  | 'message';

export interface INotification extends Document {
  recipient: Types.ObjectId;
  sender: Types.ObjectId | null;
  type: NotificationType;
  post: Types.ObjectId | null;
  comment: Types.ObjectId | null;
  conversation: Types.ObjectId | null;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    type: {
      type: String,
      enum: [
        'like_post', 'like_comment', 'comment', 'reply', 'follow',
        'post_approved', 'post_rejected', 'verification_approved',
        'verification_rejected', 'message',
      ],
      required: true,
    },
    post: { type: Schema.Types.ObjectId, ref: 'Post', default: null },
    comment: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', default: null },
    message: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
