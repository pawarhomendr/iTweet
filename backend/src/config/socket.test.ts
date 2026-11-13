import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Socket } from 'socket.io';
import { User } from '../models/User';
import {
  authenticateSocket,
  authorizeAndRateLimitSocketEvent,
  checkSocketEventRateLimit,
  ensureSocketAccountActive,
  emitSocketRateLimitError,
  isSocketAccountEligible,
  pruneSocketRateLimits,
  resetSocketRateLimits,
  SOCKET_RATE_LIMIT_ERROR,
  SOCKET_EVENT_RATE_LIMITS,
} from './socket';

const SOCKET_TEST_SECRET = 'socket-test-secret-that-is-long-enough';
const SOCKET_TEST_USER_ID = '507f1f77bcf86cd799439011';

function activeUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: SOCKET_TEST_USER_ID,
    username: 'database-user',
    emailVerified: true,
    isSuspended: false,
    suspendedUntil: null,
    isDisabled: false,
    ...overrides,
  };
}

function mockUserLookup(user: Record<string, unknown> | null) {
  const query = {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(user),
  };
  vi.spyOn(User, 'findById').mockReturnValue(query as never);
  return query;
}

function socketWithToken(token?: string): Socket {
  return {
    handshake: { auth: token ? { token } : {} },
    emit: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as Socket;
}

function signedToken(overrides: Record<string, unknown> = {}) {
  const options = overrides.exp
    ? { algorithm: 'HS256' as const }
    : { algorithm: 'HS256' as const, expiresIn: '5m' };
  return jwt.sign(
    { userId: SOCKET_TEST_USER_ID, username: 'client-forged-name', ...overrides },
    SOCKET_TEST_SECRET,
    options,
  );
}

describe('Socket.IO event rate limits', () => {
  beforeEach(() => {
    resetSocketRateLimits();
    process.env.JWT_SECRET = SOCKET_TEST_SECRET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows normal message traffic and blocks the next message in the window', () => {
    const now = 1_000;
    for (let index = 0; index < SOCKET_EVENT_RATE_LIMITS.message.max; index++) {
      expect(checkSocketEventRateLimit('user-1', 'message', now)).toBe(true);
    }
    expect(checkSocketEventRateLimit('user-1', 'message', now)).toBe(false);
    expect(checkSocketEventRateLimit('user-1', 'message', now + SOCKET_EVENT_RATE_LIMITS.message.windowMs)).toBe(true);
  });

  it('tracks expensive event types independently per server-derived user ID', () => {
    expect(checkSocketEventRateLimit('user-1', 'join', 1_000)).toBe(true);
    expect(checkSocketEventRateLimit('user-1', 'reaction', 1_000)).toBe(true);
    expect(checkSocketEventRateLimit('user-2', 'join', 1_000)).toBe(true);
  });

  it('enforces the configured room-join, reaction, typing, and presence limits', () => {
    for (const event of ['join', 'reaction', 'typing', 'presence'] as const) {
      const limit = SOCKET_EVENT_RATE_LIMITS[event].max;
      for (let index = 0; index < limit; index++) {
        expect(checkSocketEventRateLimit(`user-${event}`, event, 1_000)).toBe(true);
      }
      expect(checkSocketEventRateLimit(`user-${event}`, event, 1_000)).toBe(false);
    }
  });

  it('shares a conservative fallback bucket when no authenticated user ID is available', () => {
    const now = 1_000;
    for (let index = 0; index < SOCKET_EVENT_RATE_LIMITS.join.max; index++) {
      expect(checkSocketEventRateLimit(undefined, 'join', now)).toBe(true);
    }
    expect(checkSocketEventRateLimit(undefined, 'join', now)).toBe(false);
    expect(checkSocketEventRateLimit('user-1', 'join', now)).toBe(true);
  });

  it('prunes expired buckets and allows the next window at the exact boundary', () => {
    const now = 1_000;
    for (let index = 0; index < SOCKET_EVENT_RATE_LIMITS.presence.max; index++) {
      expect(checkSocketEventRateLimit('user-1', 'presence', now)).toBe(true);
    }
    expect(checkSocketEventRateLimit('user-1', 'presence', now + SOCKET_EVENT_RATE_LIMITS.presence.windowMs - 1)).toBe(false);
    pruneSocketRateLimits(now + SOCKET_EVENT_RATE_LIMITS.presence.windowMs);
    expect(checkSocketEventRateLimit('user-1', 'presence', now + SOCKET_EVENT_RATE_LIMITS.presence.windowMs)).toBe(true);
  });

  it('uses one safe rate-limit response for every protected event category', () => {
    const socket = { emit: vi.fn() };

    emitSocketRateLimitError(socket);

    expect(socket.emit).toHaveBeenCalledWith('error', SOCKET_RATE_LIMIT_ERROR);
    expect(JSON.stringify(socket.emit.mock.calls)).not.toMatch(/token|secret|credential/i);
  });
});

describe('Socket.IO authorization', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SOCKET_TEST_SECRET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts a valid token, reloads the user, and ignores the token username', async () => {
    mockUserLookup(activeUser());
    const socket = socketWithToken(signedToken());
    const next = vi.fn();

    await authenticateSocket(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.user).toEqual({ userId: SOCKET_TEST_USER_ID, username: 'database-user' });
    expect(socket.joinedRooms).toBeInstanceOf(Set);
  });

  it.each([
    ['missing token', socketWithToken(), 'No auth token'],
    ['invalid token', socketWithToken('not-a-jwt'), 'Invalid token'],
    ['expired token', socketWithToken(signedToken({ exp: Math.floor(Date.now() / 1000) - 1 })), 'Invalid token'],
  ])('rejects %s without exposing token details', async (_label, socket, message) => {
    const next = vi.fn();

    await authenticateSocket(socket, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message }));
    expect(JSON.stringify(next.mock.calls)).not.toContain('not-a-jwt');
  });

  it.each([
    ['a missing user', null],
    ['a suspended user', activeUser({ isSuspended: true })],
    ['a disabled user', activeUser({ isDisabled: true })],
    ['an unverified user', activeUser({ emailVerified: false })],
  ])('rejects %s during authentication', async (_label, user) => {
    mockUserLookup(user);
    const socket = socketWithToken(signedToken());
    const next = vi.fn();

    await authenticateSocket(socket, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Account unavailable' }));
  });

  it('rechecks authorization after connection and disconnects an account disabled later', async () => {
    const lookup = mockUserLookup(activeUser());
    const socket = socketWithToken(signedToken());
    const next = vi.fn();

    await authenticateSocket(socket, next);
    expect(next).toHaveBeenCalledWith();

    lookup.lean.mockResolvedValueOnce(activeUser({ isDisabled: true }));
    const allowed = await ensureSocketAccountActive(socket);

    expect(allowed).toBe(false);
    expect(socket.accountActive).toBe(false);
    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Account unavailable' });
  });

  it('authorizes before enforcing the per-user event limit and rejects only after the boundary', async () => {
    mockUserLookup(activeUser());
    const socket = socketWithToken(signedToken());
    const next = vi.fn();
    await authenticateSocket(socket, next);

    for (let index = 0; index < SOCKET_EVENT_RATE_LIMITS.reaction.max; index++) {
      await expect(authorizeAndRateLimitSocketEvent(socket, 'reaction')).resolves.toBe(true);
    }
    await expect(authorizeAndRateLimitSocketEvent(socket, 'reaction')).resolves.toBe(false);

    expect(socket.emit).toHaveBeenLastCalledWith('error', SOCKET_RATE_LIMIT_ERROR);
  });

  it('treats deleted, suspended, and disabled records as ineligible', () => {
    expect(isSocketAccountEligible(null)).toBe(false);
    expect(isSocketAccountEligible(activeUser({ isSuspended: true }))).toBe(false);
    expect(isSocketAccountEligible(activeUser({ isDisabled: true }))).toBe(false);
    expect(isSocketAccountEligible(activeUser())).toBe(true);
  });
});
