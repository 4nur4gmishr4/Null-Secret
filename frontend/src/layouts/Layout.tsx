import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import DecryptedText from '../components/DecryptedText';

const ThemeIcon: React.FC<{ preference: string }> = ({ preference }) => {
  if (preference === 'system') {
    // Monitor icon
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="0" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
  }
  if (preference === 'dark') {
    // Moon icon
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  // Sun icon
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
};

const PREF_LABEL: Record<string, string> = {
  system: 'Auto',
  light: 'Light',
  dark: 'Dark',
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preference, cycleTheme } = useTheme();

  return (
    <div className="min-h-screen transition-colors duration-200 flex flex-col p-8 max-w-2xl mx-auto">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <DecryptedText text="Null-Secret" speed={40} maxIterations={5} />
          </h1>
          <div className="h-[1.5px] bg-current w-full mt-2 opacity-20"></div>
        </div>
        <button
          onClick={cycleTheme}
          aria-label={`Theme: ${PREF_LABEL[preference]}. Click to change.`}
          title={`Theme: ${PREF_LABEL[preference]}`}
          className="flex items-center gap-2 px-3 py-2 border border-current/20 hover:border-current/50 transition-all duration-200 text-xs font-medium"
          style={{ borderColor: 'var(--border)' }}
        >
          <ThemeIcon preference={preference} />
          <span className="hidden sm:inline">{PREF_LABEL[preference]}</span>
        </button>
      </header>
      <main className="flex-grow fade-in">{children}</main>
      <footer className="mt-16 pt-4 border-t text-xs flex justify-between" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
        <span>Secure · Private · Temporary</span>
        <span>v2.2.0</span>
      </footer>
    </div>
  );
};

export default Layout;