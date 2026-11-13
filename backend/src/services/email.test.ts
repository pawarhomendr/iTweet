import { beforeEach, describe, expect, it, vi } from 'vitest';

const emailMocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
  close: vi.fn(),
  createTransport: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: emailMocks.createTransport,
  },
}));

import { EmailDeliveryError, sendEmail } from './email';

describe('email delivery service', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'production', SMTP_HOST: 'smtp.example.test', SMTP_USER: 'mailer', SMTP_PASS: 'not-a-real-secret', EMAIL_FROM: 'Indiagram <noreply@example.test>' };
    emailMocks.sendMail.mockReset();
    emailMocks.close.mockReset();
    emailMocks.createTransport.mockReset().mockReturnValue({ sendMail: emailMocks.sendMail, close: emailMocks.close });
  });

  it('reports provider acceptance without exposing message contents', async () => {
    emailMocks.sendMail.mockResolvedValue({ accepted: ['recipient@example.test'], messageId: 'message-id' });

    await expect(sendEmail({ to: 'recipient@example.test', subject: 'Subject', html: '<p>Body</p>' }))
      .resolves.toEqual({ accepted: true, messageId: 'message-id' });
  });

  it('returns an operational error when SMTP configuration is incomplete', async () => {
    delete process.env.SMTP_PASS;

    await expect(sendEmail({ to: 'recipient@example.test', subject: 'Subject', html: '<p>Body</p>' }))
      .rejects.toMatchObject<Partial<EmailDeliveryError>>({ code: 'EMAIL_CONFIG_MISSING', status: 503 });
  });

  it('surfaces provider failures as safe operational errors', async () => {
    emailMocks.sendMail.mockRejectedValue(Object.assign(new Error('connection refused'), { code: 'ECONNECTION' }));

    await expect(sendEmail({ to: 'recipient@example.test', subject: 'Subject', html: '<p>Body</p>' }))
      .rejects.toMatchObject<Partial<EmailDeliveryError>>({ code: 'ECONNECTION', status: 503 });
  });
});
