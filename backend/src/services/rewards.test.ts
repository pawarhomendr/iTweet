import { describe, it, expect, vi, beforeEach } from 'vitest';
import { awardPoints } from '../services/rewards';
import { RewardLedger } from '../models/RewardLedger';
import { User } from '../models/User';

vi.mock('../models/RewardLedger');
vi.mock('../models/User');

describe('Server-authoritative Reward Ledger', () => {
  beforeEach(() => vi.clearAllMocks());

  it('skips award when duplicate key error 11000 is thrown (atomic DB dedup)', async () => {
    (RewardLedger.findOne as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    (RewardLedger.aggregate as any).mockResolvedValue([{ total: 0 }]);
    // Simulate MongoDB duplicate key error from the unique index
    (RewardLedger.create as any).mockRejectedValue({ code: 11000 });
    (User.findByIdAndUpdate as any).mockResolvedValue({});

    await expect(awardPoints({
      userId: '507f1f77bcf86cd799439011',
      action: 'post_approved',
      ref: '507f1f77bcf86cd799439012',
      refType: 'Post',
    })).resolves.toBeUndefined(); // silently skips, no throw

    // Points must NOT be incremented after duplicate key error
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('awards points when no duplicate exists', async () => {
    (RewardLedger.findOne as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    (RewardLedger.aggregate as any).mockResolvedValue([{ total: 0 }]);
    (RewardLedger.create as any).mockResolvedValue({ _id: 'new-id' });
    (User.findByIdAndUpdate as any).mockResolvedValue({});
    (User.findOneAndUpdate as any).mockResolvedValue({});
    (User.updateOne as any).mockResolvedValue({});

    await awardPoints({
      userId: '507f1f77bcf86cd799439011',
      action: 'post_approved',
      ref: '507f1f77bcf86cd799439013',
      refType: 'Post',
    });

    expect(RewardLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'post_approved', points: 50 })
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      { $inc: { points: 50 } }
    );
  });

  it('enforces daily cap — skips award when user reached cap today', async () => {
    (RewardLedger.findOne as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    // Simulate already at cap
    (RewardLedger.aggregate as any).mockResolvedValue([{ total: 200 }]);

    await awardPoints({
      userId: '507f1f77bcf86cd799439011',
      action: 'comment',
      ref: '507f1f77bcf86cd799439014',
      refType: 'Comment',
    });

    expect(RewardLedger.create).not.toHaveBeenCalled();
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('moderation reversal uses findOneAndUpdate to prevent points going negative', async () => {
    (RewardLedger.create as any).mockResolvedValue({});
    (User.findOneAndUpdate as any).mockResolvedValue({ points: 0 });
    (User.updateOne as any).mockResolvedValue({});

    await awardPoints({
      userId: '507f1f77bcf86cd799439011',
      action: 'moderation_reversal',
      overridePoints: -100,
      note: 'Spam post reversal',
    });

    // Should use conditional findOneAndUpdate, not plain findByIdAndUpdate
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: '507f1f77bcf86cd799439011', points: { $gte: 100 } }),
      expect.objectContaining({ $inc: { points: -100 } })
    );
  });
});
