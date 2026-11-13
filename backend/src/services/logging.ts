import morgan from 'morgan';
import type { Request } from 'express';

const REDACTION_ORIGIN = 'http://log-redaction.invalid';

export function redactUrlForLog(value: string | undefined): string {
  if (!value) return '-';

  try {
    const parsed = new URL(value, REDACTION_ORIGIN);
    return parsed.origin === REDACTION_ORIGIN
      ? parsed.pathname
      : `${parsed.origin}${parsed.pathname}`;
  } catch {
    return value.split(/[?#]/, 1)[0] || '-';
  }
}

export function registerRedactedMorganTokens(): void {
  morgan.token('safe-url', (req: Request) => redactUrlForLog(req.originalUrl || req.url));
  morgan.token('safe-referrer', (req: Request) => redactUrlForLog(req.get('referer')));
}

export const REDACTED_MORGAN_FORMAT = [
  ':remote-addr',
  '-',
  ':remote-user',
  '[:date[iso]]',
  '"',
  ':method',
  ':safe-url',
  'HTTP/:http-version',
  '"',
  ':status',
  ':res[content-length]',
  '"',
  ':safe-referrer',
  '"',
  '"',
  ':user-agent',
  '"',
].join(' ');
