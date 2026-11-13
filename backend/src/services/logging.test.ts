import { describe, expect, it } from 'vitest';
import { redactUrlForLog } from './logging';

describe('request log redaction', () => {
  it('redacts verification tokens from request URLs', () => {
    const logged = redactUrlForLog('/api/auth/verify-email?token=raw-verification-token&mode=email');

    expect(logged).toBe('/api/auth/verify-email');
    expect(logged).not.toContain('raw-verification-token');
  });

  it('redacts query values from absolute referrer URLs', () => {
    const logged = redactUrlForLog('https://app.example.test/verify-email?token=raw-token');

    expect(logged).toBe('https://app.example.test/verify-email');
    expect(logged).not.toContain('raw-token');
  });

  it('does not invent a query string for URLs without query values', () => {
    expect(redactUrlForLog('/api/health')).toBe('/api/health');
    expect(redactUrlForLog(undefined)).toBe('-');
  });
});
