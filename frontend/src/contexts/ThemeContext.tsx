import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type ThemeMode = 'light' | 'dark';
type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextType {
  /** The resolved theme currently applied to the UI. */
  theme: ThemeMode;
  /** The user's preference: 'system' follows OS, or a manual override. */
  preference: ThemePreference;
  /** Cycle through: system → light → dark → system */
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  preference: 'system',
  cycleTheme: () => {},
});

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(pref: ThemePreference): ThemeMode {
  return pref === 'system' ? getSystemTheme() : pref;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stored = (localStorage.getItem('theme-preference') as ThemePreference | null);
  const [preference, setPreference] = useState<ThemePreference>(stored || 'system');
  const [theme, setTheme] = useState<ThemeMode>(resolveTheme(stored || 'system'));

  // Apply theme class to <body>
  useEffect(() => {
    const resolved = resolveTheme(preference);
    setTheme(resolved);
    document.body.className = resolved;
    localStorage.setItem('theme-preference', preference);
  }, [preference]);

  // Listen for OS theme changes when preference is 'system'
  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const next: ThemeMode = e.matches ? 'dark' : 'light';
      setTheme(next);
      document.body.className = next;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

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
export const useTheme = () => useContext(ThemeContext);