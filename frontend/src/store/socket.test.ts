import { describe, expect, it } from 'vitest';
import { resolveSocketUrl } from './socket';

describe('resolveSocketUrl', () => {
  it('prefers explicit VITE_SOCKET_URL', () => {
    expect(resolveSocketUrl({ VITE_SOCKET_URL: 'https://backend.example.com', VITE_API_URL: 'https://api.example.com/api' })).toBe('https://backend.example.com');
  });

  it('derives origin from absolute VITE_API_URL when socket URL is missing', () => {
    expect(resolveSocketUrl({ VITE_API_URL: 'https://indiagram-backend-staging.onrender.com/api' })).toBe('https://indiagram-backend-staging.onrender.com');
  });

  it('falls back to local proxy path for relative VITE_API_URL', () => {
    expect(resolveSocketUrl({ VITE_API_URL: '/api' })).toBe('/');
  });

  it('falls back to local proxy path when values are missing or invalid', () => {
    expect(resolveSocketUrl({})).toBe('/');
    expect(resolveSocketUrl({ VITE_SOCKET_URL: '   ' })).toBe('/');
    expect(resolveSocketUrl({ VITE_API_URL: 'not-a-url' })).toBe('/');
  });
});
