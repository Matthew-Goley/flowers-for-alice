/**
 * Applies the colour theme.
 *
 * Three settings: follow the system, force light, force dark. The resolved
 * value is mirrored onto <html class="dark">, which is what the Tailwind
 * `dark:` variant keys off. The inline script in index.html applies the same
 * rule before first paint so there is no flash of the wrong theme.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  artColorsFor,
  readStoredTheme,
  systemPrefersDark,
  ThemeContext,
  writeStoredTheme,
  type ResolvedTheme,
  type ThemeSetting,
  type ThemeValue,
} from './theme';

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [setting, setSetting] = useState<ThemeSetting>(readStoredTheme);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Track the OS setting so "system" stays live without a reload.
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved: ResolvedTheme =
    setting === 'system' ? (systemDark ? 'dark' : 'light') : setting;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  const setTheme = useCallback((next: ThemeSetting) => {
    setSetting(next);
    writeStoredTheme(next);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const { paper, ink } = artColorsFor(resolved);
    return {
      setting,
      resolved,
      setTheme,
      toggle: () => setTheme(resolved === 'dark' ? 'light' : 'dark'),
      paper,
      ink,
    };
  }, [setting, resolved, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
