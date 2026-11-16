import { create } from 'zustand';

export type Theme = 'dark' | 'light';

function readTheme(): Theme {
  try {
    return localStorage.getItem('ipa.theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  theme: readTheme(),
  setTheme: (theme) => {
    try {
      localStorage.setItem('ipa.theme', theme);
    } catch {
      /* stockage indisponible : le thème reste valable pour la session */
    }
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },
}));
