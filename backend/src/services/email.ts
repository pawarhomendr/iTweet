import nodemailer from 'nodemailer';

export interface EmailDeliveryResult {
  accepted: boolean;
  messageId?: string;
}

export class EmailDeliveryError extends Error {
  code: string;
  status = 503;
  isOperational = true;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'EmailDeliveryError';
    this.code = code;
  }
}

function missingEmailConfig(): string[] {
  return ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']
    .filter((key) => !process.env[key]?.trim());
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: process.env.SMTP_REQUIRE_TLS === 'true' || (!secure && process.env.NODE_ENV === 'production'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailDeliveryResult> {
  if (process.env.NODE_ENV === 'test') return { accepted: true };

  const missing = missingEmailConfig();
  if (missing.length > 0) {
    console.error(`[email] provider configuration incomplete; missing: ${missing.join(', ')}`);
    throw new EmailDeliveryError('EMAIL_CONFIG_MISSING', 'Email delivery is not configured.');
  }

  const transport = createTransport();
  try {
    const result = await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    const accepted = result.accepted.length > 0;
    if (!accepted) {
      console.error('[email] provider did not accept the message.');
      throw new EmailDeliveryError('EMAIL_NOT_ACCEPTED', 'Email provider did not accept the message.');
    }

    return { accepted, messageId: result.messageId };
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'SMTP_SEND_FAILED';
    const message = error instanceof Error ? error.message : 'Unknown SMTP failure';
    console.error(`[email] delivery failed code=${code} message=${message}`);
    throw new EmailDeliveryError(code, 'Email provider rejected the message.');
  } finally {
    transport.close();
  }
}


export function passwordResetEmail(link: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#211A16;background:#FAFAF7;padding:32px;border:1px solid #E4DDD6;border-radius:12px">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#B94428">Indiagram</p>
      <h2 style="color:#211A16;font-size:28px;margin:16px 0 10px">Reset your password</h2>
      <p style="line-height:1.6">Use the button below to choose a new password. This secure link expires in one hour and can only be used once.</p>
      <a href="${link}" style="display:inline-block;padding:13px 22px;background:#B94428;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;margin:18px 0">Choose a new password</a>
      <p style="font-size:12px;line-height:1.5;word-break:break-all;color:#8C7B72">Fallback address:<br>${link}</p>
      <p style="font-size:13px;line-height:1.6;color:#8C7B72">If you did not request this, you can safely ignore it.</p>
    </div>`;
}

export function emailVerifyEmail(link: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#211A16;background:#FAFAF7;padding:32px;border:1px solid #E4DDD6;border-radius:12px">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#B94428">Indiagram</p>
      <h2 style="color:#211A16;font-size:28px;margin:16px 0 10px">Welcome to Indiagram</h2>
      <p style="line-height:1.6">Confirm your email address to activate your account and join conversations, communities, and creative spaces across Indiagram.</p>
      <a href="${link}" style="display:inline-block;padding:13px 22px;background:#B94428;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;margin:18px 0">Verify my email</a>
      <p style="font-size:12px;line-height:1.5;word-break:break-all;color:#8C7B72">Fallback address:<br>${link}</p>
      <p style="font-size:13px;line-height:1.6;color:#8C7B72">This verification link expires in 24 hours. If you did not create this account, you can safely ignore this message.</p>
    </div>`;
}
