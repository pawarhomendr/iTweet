import { describe, expect, it } from 'vitest';
import { PUBLIC_USER_FIELDS, PUBLIC_USER_SELECT, toPublicUser } from './userViews';

describe('public user response projection', () => {
  it('keeps profile fields needed by public profile and search UI', () => {
    const publicUser = toPublicUser({
      _id: 'user-id',
      username: 'reader',
      displayName: 'Reader',
      bio: 'Bio',
      avatar: '',
      coverImage: '',
      website: 'https://example.com',
      isVerified: true,
      points: 10,
      level: 'newbie',
      badges: [],
      followersCount: 2,
      followingCount: 3,
      postsCount: 4,
    });

    expect(publicUser).toMatchObject({ username: 'reader', displayName: 'Reader', followersCount: 2 });
    expect(PUBLIC_USER_SELECT).toContain('coverImage');
    expect(PUBLIC_USER_SELECT).toContain('postsCount');
    expect(Object.keys(publicUser).sort()).toEqual([...PUBLIC_USER_FIELDS].sort());
  });

  it('excludes email, roles, suspension state, and credential fields', () => {
    const publicUser = toPublicUser({
      _id: 'user-id',
      username: 'reader',
      email: 'private@example.com',
      role: 'admin',
      isSuspended: true,
      suspendedReason: 'private reason',
      suspendedUntil: new Date(),
      emailVerified: true,
      password: 'hashed-password',
      refreshToken: 'refresh-hash',
      passwordResetToken: 'reset-hash',
      emailVerifyToken: 'verify-hash',
      isDisabled: true,
      lastSeen: new Date(),
      __v: 4,
    });

    expect(publicUser).not.toHaveProperty('email');
    expect(publicUser).not.toHaveProperty('role');
    expect(publicUser).not.toHaveProperty('isSuspended');
    expect(publicUser).not.toHaveProperty('suspendedReason');
    expect(publicUser).not.toHaveProperty('suspendedUntil');
    expect(publicUser).not.toHaveProperty('emailVerified');
    expect(publicUser).not.toHaveProperty('password');
    expect(publicUser).not.toHaveProperty('refreshToken');
    expect(publicUser).not.toHaveProperty('passwordResetToken');
    expect(publicUser).not.toHaveProperty('emailVerifyToken');
    expect(publicUser).not.toHaveProperty('isDisabled');
    expect(publicUser).not.toHaveProperty('lastSeen');
    expect(publicUser).not.toHaveProperty('__v');
    expect(PUBLIC_USER_SELECT).not.toMatch(/email|role|password|refreshToken|Suspended|emailVerified/i);
  });
});
