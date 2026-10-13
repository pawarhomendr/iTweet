import mongoose, { Document, Schema, Types } from 'mongoose';

export type RewardAction =
  | 'post_approved'
  | 'comment'
  | 'like_received'
  | 'follow_received'
  | 'daily_login'
  | 'moderation_reversal';

export interface IRewardLedger extends Document {
  user: Types.ObjectId;
  action: RewardAction;
  points: number; // positive = earn, negative = reversal
  refType: string | null;
  ref: Types.ObjectId | null;
  note: string;
  awardedBy: Types.ObjectId | null; // null = system, set = moderator/admin
  createdAt: Date;
}

const rewardLedgerSchema = new Schema<IRewardLedger>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      enum: ['post_approved', 'comment', 'like_received', 'follow_received', 'daily_login', 'moderation_reversal'],
      required: true,
    },
    points: { type: Number, required: true },
    refType: { type: String, default: null },
    ref: { type: Schema.Types.ObjectId, default: null },
    note: { type: String, default: '' },
    awardedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

rewardLedgerSchema.index({ user: 1, createdAt: -1 });

// FIX R-1: Unique index for atomic deduplication — prevents duplicate rewards
// Use sparse:true because ref can be null for some actions (e.g., daily_login)
rewardLedgerSchema.index(
  { user: 1, action: 1, ref: 1 },
  { unique: true, sparse: true, name: 'reward_unique_dedup' }
);

rewardLedgerSchema.index({ createdAt: -1 }); // admin audit log

export const RewardLedger = mongoose.model<IRewardLedger>('RewardLedger', rewardLedgerSchema);
