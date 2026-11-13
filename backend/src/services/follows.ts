import { Follow } from '../models/Follow';
import { User } from '../models/User';

type FollowId = string | { toString(): string };
type CounterField = 'followersCount' | 'followingCount';

export interface FollowToggleResult {
  following: boolean;
  changed: boolean;
}

export function isSelfFollow(followerId: FollowId, followingId: FollowId): boolean {
  return followerId.toString() === followingId.toString();
}

export function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && (error as { code?: unknown }).code === 11000,
  );
}

async function updateCounter(userId: FollowId, field: CounterField, delta: 1 | -1): Promise<boolean> {
  const filter: Record<string, unknown> = { _id: userId };
  if (delta < 0) filter[field] = { $gt: 0 };

  const result = await User.updateOne(filter, { $inc: { [field]: delta } });
  const updateResult = result as { matchedCount?: number; modifiedCount?: number; n?: number; nModified?: number };
  const matchedCount = updateResult.matchedCount ?? updateResult.n;
  const modifiedCount = updateResult.modifiedCount ?? updateResult.nModified;

  // Mocks and older Mongoose result shapes may not expose counts. In that case,
  // the successful promise is treated as an applied update.
  return matchedCount === undefined && modifiedCount === undefined
    ? true
    : (modifiedCount ?? matchedCount ?? 0) > 0;
}

async function adjustCounters(
  followerId: FollowId,
  followingId: FollowId,
  delta: 1 | -1,
): Promise<void> {
  const changes: Array<{ userId: FollowId; field: CounterField }> = [
    { userId: followingId, field: 'followersCount' },
    { userId: followerId, field: 'followingCount' },
  ];
  const applied: Array<{ userId: FollowId; field: CounterField }> = [];

  try {
    for (const change of changes) {
      if (await updateCounter(change.userId, change.field, delta)) applied.push(change);
    }
  } catch (error) {
    for (const change of applied.reverse()) {
      try {
        await updateCounter(change.userId, change.field, delta === 1 ? -1 : 1);
      } catch {
        // Best-effort compensation keeps the normal path consistent without
        // hiding the original database failure from the request handler.
      }
    }
    throw error;
  }
}

/**
 * Toggle one Follow relationship while making duplicate concurrent creates
 * idempotent. The Follow unique index remains the final concurrency guard.
 */
export async function toggleFollowRelationship(
  followerId: FollowId,
  followingId: FollowId,
): Promise<FollowToggleResult> {
  const removed = await Follow.findOneAndDelete({ follower: followerId, following: followingId });

  if (removed) {
    try {
      await adjustCounters(followerId, followingId, -1);
    } catch (error) {
      try {
        await Follow.create(removed);
      } catch {
        // If restoration fails, preserve the original database error.
      }
      throw error;
    }
    return { following: false, changed: true };
  }

  let created;
  try {
    created = await Follow.create({ follower: followerId, following: followingId });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      // Another request created the unique relationship first. Treat this as
      // an idempotent follow result rather than returning a false failure.
      return { following: true, changed: false };
    }
    throw error;
  }

  try {
    await adjustCounters(followerId, followingId, 1);
  } catch (error) {
    try {
      await Follow.deleteOne(created?._id ? { _id: created._id } : { follower: followerId, following: followingId });
    } catch {
      // If cleanup fails, preserve the original database error.
    }
    throw error;
  }

  return { following: true, changed: true };
}
