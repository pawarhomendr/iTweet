import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const googleMocks = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = googleMocks.verifyIdToken;
  },
}));

import { canLinkGoogleAccount, GoogleAuthConfigurationError, verifyGoogleCredential } from './googleAuth';

const originalClientId = process.env.GOOGLE_CLIENT_ID;

function validGoogleResponse(overrides: Record<string, unknown> = {}) {
  return {
    getPayload: () => ({
      aud: 'google-client-id',
      iss: 'https://accounts.google.com',
      exp: Math.floor(Date.now() / 1000) + 300,
      sub: 'google-subject',
      email: 'person@example.com',
      email_verified: true,
      name: 'Person',
      picture: 'https://example.com/avatar.png',
      ...overrides,
    }),
  };
}

describe('Google identity validation', () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    googleMocks.verifyIdToken.mockReset().mockResolvedValue(validGoogleResponse());
  });

  it('accepts a verified, unexpired token for the configured audience and issuer', async () => {
    await expect(verifyGoogleCredential('g'.repeat(64))).resolves.toMatchObject({
      email: 'person@example.com',
      emailVerified: true,
      subject: 'google-subject',
    });
    expect(googleMocks.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'g'.repeat(64),
      audience: 'google-client-id',
    });
  });

  it.each([
    { aud: 'different-client' },
    { iss: 'https://attacker.example.com' },
    { exp: Math.floor(Date.now() / 1000) - 1 },
    { email_verified: false },
    { email_verified: 'true' },
  ])('rejects invalid Google identity claims: %o', async (override) => {
    googleMocks.verifyIdToken.mockResolvedValueOnce(validGoogleResponse(override));
    await expect(verifyGoogleCredential('g'.repeat(64))).rejects.toThrow('Invalid Google identity token');
  });

  it('fails closed when the OAuth client ID is not configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    await expect(verifyGoogleCredential('g'.repeat(64))).rejects.toBeInstanceOf(GoogleAuthConfigurationError);
    expect(googleMocks.verifyIdToken).not.toHaveBeenCalled();
  });

  it('treats the documented client ID placeholder as missing configuration', async () => {
    process.env.GOOGLE_CLIENT_ID = 'your-google-web-client-id.apps.googleusercontent.com';
    await expect(verifyGoogleCredential('g'.repeat(64))).rejects.toBeInstanceOf(GoogleAuthConfigurationError);
    expect(googleMocks.verifyIdToken).not.toHaveBeenCalled();
  });

  it('links only a verified identity with the same normalized email', async () => {
    const identity = await verifyGoogleCredential('g'.repeat(64));
    expect(canLinkGoogleAccount(identity, 'PERSON@example.com')).toBe(true);
    expect(canLinkGoogleAccount(identity, 'other@example.com')).toBe(false);
    expect(canLinkGoogleAccount({ ...identity, emailVerified: false }, 'person@example.com')).toBe(false);
  });

});

afterAll(() => {
  if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = originalClientId;
});
