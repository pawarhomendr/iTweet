import { User } from '../models/User';
import { RewardLedger, RewardAction } from '../models/RewardLedger';
import { Types } from 'mongoose';

const POINT_MAP: Record<RewardAction, number> = {
  post_approved: Number(process.env.REWARD_POST_APPROVED ?? 50),
  comment: Number(process.env.REWARD_COMMENT ?? 5),
  like_received: Number(process.env.REWARD_LIKE_RECEIVED ?? 2),
  follow_received: 3,
  daily_login: 1,
  moderation_reversal: 0, // set by caller (can be negative)
};

const DAILY_CAP = Number(process.env.REWARD_DAILY_CAP ?? 200);

/**
 * Award points to a user in a server-authoritative, dedup-safe way.
 *
 * @param userId    Recipient
 * @param action    The earning action
 * @param ref       The document that triggered the reward (post, comment, etc.)
 * @param refType   Mongoose model name
 * @param awardedBy Moderator/admin userId, or null for system
 * @param overridePoints  Used for reversals — override the default point value
 */
export async function awardPoints(opts: {
  userId: string | Types.ObjectId;
  action: RewardAction;
  ref?: string | Types.ObjectId;
  refType?: string;
  awardedBy?: string | Types.ObjectId | null;
  overridePoints?: number;
  note?: string;
}): Promise<void> {
  const { userId, action, ref, refType, awardedBy = null, overridePoints, note = '' } = opts;

  // Dedup: no duplicate reward for same action + ref
  if (ref) {
    const exists = await RewardLedger.findOne({ user: userId, action, ref }).lean();
    if (exists) return;
  }

  // Daily cap check (skip for reversals)
  if (action !== 'moderation_reversal') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTotal = await RewardLedger.aggregate([
      { $match: { user: new Types.ObjectId(userId.toString()), createdAt: { $gte: today }, points: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$points' } } },
    ]);
    const earned = todayTotal[0]?.total ?? 0;
    if (earned >= DAILY_CAP) return;
  }

  const points = overridePoints ?? POINT_MAP[action];

  try {
    // FIX R-1: catch MongoDB duplicate key error (code 11000) from the unique index
    // This is the atomic dedup — the findOne above is just an optimistic fast-path
    await RewardLedger.create({
      user: userId,
      action,
      points,
      ref: ref ?? null,
      refType: refType ?? null,
      awardedBy,
      note,
    });
  } catch (err: any) {
    if (err?.code === 11000) return; // duplicate key — already awarded, silently skip
    throw err;
  }

  // FIX R-3: clamp points to 0 minimum — $inc with negative values bypasses schema min
  if (points < 0) {
    // Only deduct what the user actually has to avoid negative balances
    await User.findOneAndUpdate(
      { _id: userId, points: { $gte: Math.abs(points) } },
      { $inc: { points } }
    );
    // If user has fewer points than the deduction, set to 0
    await User.updateOne(
      { _id: userId, points: { $lt: 0 } },
      { $set: { points: 0 } }
    );
  } else {
    await User.findByIdAndUpdate(userId, { $inc: { points } });
  }
}
