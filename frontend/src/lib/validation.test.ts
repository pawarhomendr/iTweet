import { describe, expect, it } from 'vitest';
import { isSafeHttpUrl, isValidEmail } from './validation';

describe('email validation', () => {
  it('accepts a conventional email address', () => {
    expect(isValidEmail('person@example.com')).toBe(true);
  });

  it('rejects malformed email input', () => {
    expect(isValidEmail('person@example')).toBe(false);
    expect(isValidEmail('not an email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('safe HTTP URL validation', () => {
  it('accepts valid HTTP and HTTPS URLs', () => {
    expect(isSafeHttpUrl('https://example.com')).toBe(true);
    expect(isSafeHttpUrl('http://localhost:5173/docs')).toBe(true);
  });

  it('rejects executable, protocol-relative, malformed, and missing URLs', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeHttpUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeHttpUrl('//example.com')).toBe(false);
    expect(isSafeHttpUrl('not a URL')).toBe(false);
    expect(isSafeHttpUrl('')).toBe(false);
    expect(isSafeHttpUrl(undefined)).toBe(false);
  });
});
