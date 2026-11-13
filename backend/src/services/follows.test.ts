import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isDuplicateKeyError, isSelfFollow, toggleFollowRelationship } from './follows';

const { findOneAndDelete, create, deleteOne, updateOne } = vi.hoisted(() => ({
  findOneAndDelete: vi.fn(),
  create: vi.fn(),
  deleteOne: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock('../models/Follow', () => ({
  Follow: { findOneAndDelete, create, deleteOne },
}));

vi.mock('../models/User', () => ({
  User: { updateOne },
}));

describe('follow relationship consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    deleteOne.mockResolvedValue({ deletedCount: 1 });
  });

  it('creates a follow and increments both denormalized counters once', async () => {
    findOneAndDelete.mockResolvedValue(null);
    create.mockResolvedValue({ _id: 'follow-1' });

    await expect(toggleFollowRelationship('follower-1', 'following-1')).resolves.toEqual({
      following: true,
      changed: true,
    });

    expect(create).toHaveBeenCalledWith({ follower: 'follower-1', following: 'following-1' });
    expect(updateOne).toHaveBeenCalledTimes(2);
    expect(updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: 'following-1' },
      { $inc: { followersCount: 1 } },
    );
    expect(updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: 'follower-1' },
      { $inc: { followingCount: 1 } },
    );
  });

  it('removes a follow and decrements counters without allowing negative updates', async () => {
    findOneAndDelete.mockResolvedValue({ _id: 'follow-1' });

    await expect(toggleFollowRelationship('follower-1', 'following-1')).resolves.toEqual({
      following: false,
      changed: true,
    });

    expect(create).not.toHaveBeenCalled();
    expect(updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: 'following-1', followersCount: { $gt: 0 } },
      { $inc: { followersCount: -1 } },
    );
    expect(updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: 'follower-1', followingCount: { $gt: 0 } },
      { $inc: { followingCount: -1 } },
    );
  });

  it('treats a unique-index duplicate create as an idempotent follow', async () => {
    findOneAndDelete.mockResolvedValue(null);
    create.mockRejectedValue({ code: 11000 });

    await expect(toggleFollowRelationship('follower-1', 'following-1')).resolves.toEqual({
      following: true,
      changed: false,
    });

    expect(updateOne).not.toHaveBeenCalled();
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
    expect(isDuplicateKeyError({ code: 11001 })).toBe(false);
  });

  it('compensates the relationship when a counter update fails', async () => {
    findOneAndDelete.mockResolvedValue(null);
    create.mockResolvedValue({ _id: 'follow-1' });
    updateOne
      .mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 })
      .mockRejectedValueOnce(new Error('counter unavailable'))
      .mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });

    await expect(toggleFollowRelationship('follower-1', 'following-1')).rejects.toThrow('counter unavailable');
    expect(deleteOne).toHaveBeenCalledWith({ _id: 'follow-1' });
    expect(updateOne).toHaveBeenLastCalledWith(
      { _id: 'following-1', followersCount: { $gt: 0 } },
      { $inc: { followersCount: -1 } },
    );
  });

  it('rejects self-follow before relationship creation', () => {
    expect(isSelfFollow('same-user', 'same-user')).toBe(true);
    expect(isSelfFollow('user-a', 'user-b')).toBe(false);
  });
});
