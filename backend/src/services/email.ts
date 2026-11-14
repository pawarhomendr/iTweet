import { Buffer } from 'buffer';

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
  return ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'EMAIL_FROM']
    .filter((key) => !process.env[key]?.trim());
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new EmailDeliveryError('EMAIL_CONFIG_MISSING', 'Gmail API credentials are incomplete.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: controller.signal,
    });

    const data = await response.json() as { access_token?: string; error?: string };

    if (!response.ok || !data.access_token) {
      const errCode = data.error ?? 'OAUTH_REFRESH_FAILED';
      console.error(`[email] OAuth token refresh failed error=${errCode}`);
      throw new EmailDeliveryError(errCode, 'Failed to authenticate with Gmail API.');
    }

    return data.access_token;
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    const msg = error instanceof Error ? error.message : 'Unknown network failure';
    console.error(`[email] OAuth request failed message=${msg}`);
    throw new EmailDeliveryError('OAUTH_NETWORK_ERROR', 'Gmail API authentication request failed.');
  } finally {
    clearTimeout(timeout);
  }
}

function encodeMimeMessage(from: string, to: string, subject: string, html: string): string {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf-8').toString('base64'),
  ].join('\r\n');

  return Buffer.from(mime, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
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

  const accessToken = await getAccessToken();
  const rawMessage = encodeMimeMessage(process.env.EMAIL_FROM!, opts.to, opts.subject, opts.html);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
      signal: controller.signal,
    });

    const data = await response.json() as { id?: string; error?: { code?: number; message?: string; status?: string } };

    if (!response.ok || !data.id) {
      const status = response.status;
      const errCode = data.error?.status ?? `GMAIL_API_${status}`;
      console.error(`[email] Gmail API rejected message status=${status} code=${errCode}`);
      throw new EmailDeliveryError(errCode, 'Gmail API rejected the message.');
    }

    return { accepted: true, messageId: data.id };
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    const msg = error instanceof Error ? error.message : 'Unknown network failure';
    console.error(`[email] Gmail API request failed message=${msg}`);
    throw new EmailDeliveryError('GMAIL_SEND_FAILED', 'Gmail API delivery request failed.');
  } finally {
    clearTimeout(timeout);
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
