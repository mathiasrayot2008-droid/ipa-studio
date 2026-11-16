import { useTheme } from '@/app/theme';

describe('thème', () => {
  it('est sombre par défaut', () => {
    expect(useTheme.getState().theme).toBe('dark');
  });
  it('bascule en clair et le mémorise', () => {
    useTheme.getState().setTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('ipa.theme')).toBe('light');
    useTheme.getState().setTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
