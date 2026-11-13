import { describe, it, expect, vi } from 'vitest';
import { isAccountUnavailable, requireEmailVerified, requireRole } from '../middleware/auth';

// ─── RBAC middleware ──────────────────────────────────────────────────────────
describe('requireRole middleware', () => {
  it('returns 401 when no user on request', () => {
    const req: any = {};
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireRole('moderator')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for insufficient role', () => {
    const req: any = { user: { role: 'user' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireRole('moderator', 'admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for authorized role', () => {
    const req: any = { user: { role: 'moderator' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireRole('moderator', 'admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('requireEmailVerified middleware', () => {
  it('rejects an unverified account before a mutating action', () => {
    const req: any = { user: { emailVerified: false } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireEmailVerified(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'EMAIL_VERIFICATION_REQUIRED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a verified account through', () => {
    const req: any = { user: { emailVerified: true } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireEmailVerified(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('account availability checks', () => {
  it('allows a normal account', () => {
    expect(isAccountUnavailable({ isSuspended: false, suspendedUntil: null, isDisabled: false })).toBe(false);
  });

  it('blocks a suspended account without an expiry or with a future expiry', () => {
    expect(isAccountUnavailable({ isSuspended: true, suspendedUntil: null, isDisabled: false })).toBe(true);
    expect(isAccountUnavailable({ isSuspended: true, suspendedUntil: new Date(Date.now() + 60_000), isDisabled: false })).toBe(true);
  });

  it('allows a suspension that has expired and blocks disabled accounts', () => {
    expect(isAccountUnavailable({ isSuspended: true, suspendedUntil: new Date(Date.now() - 60_000), isDisabled: false })).toBe(false);
    expect(isAccountUnavailable({ isSuspended: false, suspendedUntil: null, isDisabled: true })).toBe(true);
  });
});
