import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  toggle: () => void;
  setTheme: (t: 'light' | 'dark') => void;
}

const saved = (() => {
  try { return (localStorage.getItem('obo-theme') as 'light' | 'dark') ?? 'light'; } catch { return 'light'; }
})();

document.documentElement.setAttribute('data-theme', saved);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: saved,
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('obo-theme', theme); } catch { /* private */ }
    set({ theme });
  },
  toggle: () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('obo-theme', next); } catch { /* private */ }
    set({ theme: next });
  },
}));
