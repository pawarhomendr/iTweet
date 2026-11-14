import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailDeliveryError, sendEmail } from './email';

describe('Gmail API HTTPS email delivery service', () => {
  const originalEnv = { ...process.env };
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      GMAIL_CLIENT_ID: 'client-id-test',
      GMAIL_CLIENT_SECRET: 'client-secret-test',
      GMAIL_REFRESH_TOKEN: 'refresh-token-test',
      EMAIL_FROM: 'iTweet <noreply@example.test>',
    };
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  it('successfully exchanges token and sends email via Gmail API', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'mock-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'gmail-msg-id-123' }),
      });

    await expect(
      sendEmail({ to: 'recipient@example.test', subject: 'Verify', html: '<p>Hi</p>' })
    ).resolves.toEqual({ accepted: true, messageId: 'gmail-msg-id-123' });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');
    expect(mockFetch.mock.calls[1][0]).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  });

  it('returns an operational error when Gmail configuration is incomplete', async () => {
    delete process.env.GMAIL_REFRESH_TOKEN;

    await expect(
      sendEmail({ to: 'recipient@example.test', subject: 'Verify', html: '<p>Hi</p>' })
    ).rejects.toMatchObject<Partial<EmailDeliveryError>>({
      code: 'EMAIL_CONFIG_MISSING',
      status: 503,
    });
  });

  it('surfaces OAuth token refresh failure correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'invalid_grant' }),
    });

    await expect(
      sendEmail({ to: 'recipient@example.test', subject: 'Verify', html: '<p>Hi</p>' })
    ).rejects.toMatchObject<Partial<EmailDeliveryError>>({
      code: 'invalid_grant',
      status: 503,
    });
  });

  it('surfaces Gmail API send failure correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'mock-access-token' }),
      })
      .mockResolvedValueOnce({
        status: 429,
        ok: false,
        json: async () => ({ error: { status: 'RATE_LIMIT_EXCEEDED', message: 'Quota exceeded' } }),
      });

    await expect(
      sendEmail({ to: 'recipient@example.test', subject: 'Verify', html: '<p>Hi</p>' })
    ).rejects.toMatchObject<Partial<EmailDeliveryError>>({
      code: 'RATE_LIMIT_EXCEEDED',
      status: 503,
    });
  });
});
