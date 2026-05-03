import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type ThemeMode = 'light' | 'dark';
type ThemePreference = 'system' | 'light' | 'dark';

const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = window.localStorage.getItem('theme-preference');
    return isThemePreference(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

interface ThemeContextType {
  /** The resolved theme currently applied to the UI. */
  theme: ThemeMode;
  /** The user's preference: 'system' follows OS, or a manual override. */
  preference: ThemePreference;
  /** Cycle through: system → light → dark → system */
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreference] = useState<ThemePreference>(readStoredPreference);
  const [osTheme, setOsTheme] = useState<ThemeMode>(getSystemTheme);

  const theme = preference === 'system' ? osTheme : preference;

  // Apply theme class to <body> idempotently without clobbering other classes.
  useEffect(() => {
    const body = document.body;
    body.classList.remove('light', 'dark');
    body.classList.add(theme);
    try {
      window.localStorage.setItem('theme-preference', preference);
    } catch {
      // Storage may be unavailable (private mode); preference still applies in-memory.
    }
  }, [theme, preference]);

  // Listen for OS theme changes when preference is 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setOsTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const cycleTheme = useCallback(() => {
    setPreference(prev => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, preference, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};