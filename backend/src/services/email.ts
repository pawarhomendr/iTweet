import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (process.env.NODE_ENV === 'test') return; // skip in tests
  const transport = createTransport();
  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? 'Off By One <noreply@example.com>',
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

export function passwordResetEmail(link: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#3B2AE0">Reset your password</h2>
      <p>Click the link below to reset your password. It expires in 1 hour.</p>
      <a href="${link}" style="display:inline-block;padding:12px 24px;background:#3B2AE0;color:#fff;border-radius:8px;text-decoration:none">Reset password</a>
      <p style="color:#888;font-size:12px;margin-top:32px">If you didn't request this, ignore this email.</p>
    </div>`;
}

export function emailVerifyEmail(link: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#3B2AE0">Verify your email</h2>
      <p>Thanks for joining Off By One. Click below to verify your address.</p>
      <a href="${link}" style="display:inline-block;padding:12px 24px;background:#3B2AE0;color:#fff;border-radius:8px;text-decoration:none">Verify email</a>
    </div>`;
}
