// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

// ─── Auth store: token must NOT be persisted to localStorage ─────────────────
describe('Auth store — token in-memory only', () => {
  it('getToken returns null before setAuth', async () => {
    const { useAuthStore } = await import('../store/auth');
    expect(useAuthStore.getState().getToken()).toBeNull();
  });

  it('setAuth stores user but token only in memory', async () => {
    const { useAuthStore } = await import('../store/auth');
    const mockUser = { _id: '1', username: 'test', role: 'user' } as any;
    useAuthStore.getState().setAuth(mockUser, 'test-access-token');

    // Token accessible via getToken()
    expect(useAuthStore.getState().getToken()).toBe('test-access-token');
    // User persisted for UI
    expect(useAuthStore.getState().user).toEqual(mockUser);

    // Check localStorage does NOT contain the token
    const persisted = JSON.parse(localStorage.getItem('obo-auth') ?? '{}');
    expect(persisted?.state?.token).toBeUndefined();
    expect(persisted?.state?.user?.username).toBe('test'); // user IS persisted
  });

  it('logout clears both user and token', async () => {
    const { useAuthStore } = await import('../store/auth');
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().getToken()).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });
});

