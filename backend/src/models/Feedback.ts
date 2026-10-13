import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFeedback extends Document {
  user: Types.ObjectId | null;
  email: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    email: { type: String, required: true, maxlength: 200 },
    subject: { type: String, required: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 2000 },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

feedbackSchema.index({ isRead: 1, createdAt: -1 });

export const Feedback = mongoose.model<IFeedback>('Feedback', feedbackSchema);
