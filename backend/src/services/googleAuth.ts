import { OAuth2Client } from 'google-auth-library';

export interface GoogleIdentity {
  email: string;
  emailVerified: boolean;
  subject: string;
  name?: string;
  picture?: string;
}

export class GoogleAuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleAuthConfigurationError';
  }
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getConfiguredClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId || /^(your[-_]|replace_with|<|>)/i.test(clientId)) {
    throw new GoogleAuthConfigurationError('GOOGLE_CLIENT_ID is not configured');
  }
  return clientId;
}

export function canLinkGoogleAccount(identity: GoogleIdentity, existingEmail: string): boolean {
  return identity.emailVerified && normalizeEmail(identity.email) === normalizeEmail(existingEmail);
}

export async function verifyGoogleCredential(credential: unknown): Promise<GoogleIdentity> {
  if (typeof credential !== 'string' || credential.length < 32 || credential.length > 8192) {
    throw new Error('Invalid Google credential');
  }

  const clientId = getConfiguredClientId();

  const ticket = await new OAuth2Client().verifyIdToken({
    idToken: credential,
    audience: clientId,
  });
  const token = ticket.getPayload();
  const now = Math.floor(Date.now() / 1000);
  const email = typeof token?.email === 'string' ? normalizeEmail(token.email) : '';
  const subject = typeof token?.sub === 'string' ? token.sub : '';

  if (
    !token
    || token.aud !== clientId
    || (token.iss !== 'accounts.google.com' && token.iss !== 'https://accounts.google.com')
    || !Number.isSafeInteger(token.exp)
    || token.exp <= now
    || token.email_verified !== true
    || !email
    || !subject
  ) {
    throw new Error('Invalid Google identity token');
  }

  return {
    email,
    emailVerified: true,
    subject,
    name: typeof token.name === 'string' ? token.name : undefined,
    picture: typeof token.picture === 'string' ? token.picture : undefined,
  };
}
