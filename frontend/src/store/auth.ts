import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

/**
 * FIX S-1 / S-2: Access token is stored ONLY in module-level memory (never localStorage).
 * The user profile is persisted for UI restoration, but the token is NOT.
 * On page reload, the app calls /api/auth/refresh using the httpOnly refresh cookie
 * to silently restore an in-memory access token.
 */
let _memoryToken: string | null = null;

interface AuthState {
  user: User | null;
  // token is NOT in the persisted store — it lives in _memoryToken above
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  getToken: () => string | null;
  logout: () => void;
  isAuthenticated: () => boolean;
  isMod: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setAuth: (user, token) => {
        _memoryToken = token; // token in memory only — NOT persisted
        set({ user });
      },
      setUser: (user) => set({ user }),
      setToken: (token) => { _memoryToken = token; },
      getToken: () => _memoryToken,
      logout: () => {
        _memoryToken = null;
        set({ user: null });
      },
      isAuthenticated: () => !!_memoryToken && !!get().user,
    isMod: () => {
  const role = get().user?.role;
  return typeof role === 'string' &&
    role.split(',').map((r) => r.trim()).some((r) => ['moderator', 'admin'].includes(r));
},
      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'obo-auth',
      // FIX S-2: only persist the user profile for UI hydration — NOT the token
      partialize: (s) => ({ user: s.user }),
    }
  )
);
