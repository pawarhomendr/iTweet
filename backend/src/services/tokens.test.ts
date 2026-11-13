import { describe, expect, it } from 'vitest';
import { hashToken, isTokenExpired } from './tokens';

describe('one-time token helpers', () => {
  it('stores a deterministic cryptographic hash rather than the raw token', () => {
    expect(hashToken('disposable-token')).toHaveLength(64);
    expect(hashToken('disposable-token')).toBe(hashToken('disposable-token'));
    expect(hashToken('different-token')).not.toBe(hashToken('disposable-token'));
  });

  it('recognizes expired verification/reset timestamps', () => {
    const now = new Date('2026-10-25T00:00:00.000Z');
    expect(isTokenExpired(new Date('2026-10-24T23:59:59.000Z'), now)).toBe(true);
    expect(isTokenExpired(new Date('2026-10-25T00:00:01.000Z'), now)).toBe(false);
  });
});
