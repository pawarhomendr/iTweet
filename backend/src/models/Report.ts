import mongoose, { Document, Schema, Types } from 'mongoose';

export type ReportTargetType = 'post' | 'comment' | 'user';
export type ReportReason = 'spam' | 'harassment' | 'misinformation' | 'adult_content' | 'hate_speech' | 'other';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface IReport extends Document {
  reporter: Types.ObjectId;
  targetType: ReportTargetType;
  target: Types.ObjectId;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  reviewedBy: Types.ObjectId | null;
  reviewNote: string;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['post', 'comment', 'user'], required: true },
    target: { type: Schema.Types.ObjectId, required: true },
    reason: {
      type: String,
      enum: ['spam', 'harassment', 'misinformation', 'adult_content', 'hate_speech', 'other'],
      required: true,
    },
    details: { type: String, maxlength: 500, default: '' },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNote: { type: String, default: '' },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1, targetType: 1, target: 1 }, { unique: true });

export const Report = mongoose.model<IReport>('Report', reportSchema);
