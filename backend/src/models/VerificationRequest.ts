import mongoose, { Document, Schema, Types } from 'mongoose';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface IVerificationRequest extends Document {
  user: Types.ObjectId;
  status: VerificationStatus;
  statement: string;
  links: string[];
  postsCount: number;
  followersCount: number;
  reviewedBy: Types.ObjectId | null;
  reviewNote: string;
  createdAt: Date;
  updatedAt: Date;
}

const verificationRequestSchema = new Schema<IVerificationRequest>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    statement: { type: String, required: true, minlength: 50, maxlength: 800 },
    links: [{ type: String, maxlength: 500 }],
    postsCount: { type: Number, required: true },
    followersCount: { type: Number, required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNote: { type: String, default: '' },
  },
  { timestamps: true }
);

// One pending request per user at a time
verificationRequestSchema.index({ user: 1, status: 1 });

export const VerificationRequest = mongoose.model<IVerificationRequest>(
  'VerificationRequest',
  verificationRequestSchema
);
