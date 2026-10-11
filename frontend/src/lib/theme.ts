/**
 * Colour theme: the context, the hooks and the storage rules.
 *
 * The provider component lives in `ThemeProvider.tsx`; keeping it out of this
 * file means this one exports no components, which is what lets Fast Refresh
 * hot-reload the hooks cleanly.
 */

import { createContext, useContext } from 'react';
import { STORAGE_KEYS } from '../config';
import {
  INK_DARK,
  INK_LIGHT,
  PAPER_DARK,
  PAPER_LIGHT,
} from '../components/flowers/flowerGeometry';

export type ThemeSetting = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeValue {
  setting: ThemeSetting;
  resolved: ResolvedTheme;
  setTheme: (setting: ThemeSetting) => void;
  toggle: () => void;
  /**
   * The surface colour behind flower art, handed to mono flowers so their
   * occluding fill matches the card they sit on.
   */
  paper: string;
  /** Line colour for mono art, passed down for the same reason as `paper`. */
  ink: string;
}

export const ThemeContext = createContext<ThemeValue | null>(null);

export function artColorsFor(resolved: ResolvedTheme): { paper: string; ink: string } {
  return resolved === 'dark'
    ? { paper: PAPER_DARK, ink: INK_DARK }
    : { paper: PAPER_LIGHT, ink: INK_LIGHT };
}

export function readStoredTheme(): ThemeSetting {
  try {
    const value = localStorage.getItem(STORAGE_KEYS.theme);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    // Private browsing: fall through to the system setting.
  }
  return 'system';
}

export function writeStoredTheme(setting: ThemeSetting): void {
  try {
    if (setting === 'system') localStorage.removeItem(STORAGE_KEYS.theme);
    else localStorage.setItem(STORAGE_KEYS.theme, setting);
  } catch {
    // Not being able to remember the choice is survivable.
  }
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside a ThemeProvider');
  return value;
}

/** Just the drawing colours, for components that only render flower art. */
export function useArtColors(): { paper: string; ink: string } {
  const { paper, ink } = useTheme();
  return { paper, ink };
}
