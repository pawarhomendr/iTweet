import { describe, expect, it } from 'vitest';
import { isSafeHttpUrl } from './validation';

describe('safe HTTP URL validation', () => {
  it.each([
    'https://example.com',
    'http://localhost:5173/docs',
    'https://example.com/path?q=1',
  ])('accepts a valid HTTP(S) URL: %s', (value) => {
    expect(isSafeHttpUrl(value)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '//example.com/path',
    'not a URL',
    'https://',
    '',
    null,
    undefined,
  ])('rejects an unsafe, malformed, or missing URL: %s', (value) => {
    expect(isSafeHttpUrl(value)).toBe(false);
  });
});
