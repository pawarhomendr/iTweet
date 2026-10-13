import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireRole } from '../middleware/auth';

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
