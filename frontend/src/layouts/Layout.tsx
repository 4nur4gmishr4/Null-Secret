import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wifi, WifiOff, Mail } from 'lucide-react';
import DecryptedText from '../components/DecryptedText';
import Lottie from 'lottie-react';
import logolottie from '../assets/lotties/logolottie.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LottiePlayer = (Lottie as any).default || Lottie;
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';

const ThemeIcon: React.FC<{ preference: string }> = ({ preference }) => {
  if (preference === 'system') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="0" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
  }
  if (preference === 'dark') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [backendAlive, setBackendAlive] = useState<boolean | null>(null);
  
  const [logoTrigger, setLogoTrigger] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lottieRef = useRef<any>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const baseUrl = API_BASE.replace('/api/v1', '');
        const resp = await fetch(`${baseUrl}/healthz`, { mode: 'cors' });
        setBackendAlive(resp.ok);
      } catch {
        setBackendAlive(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  // Decryption effect trigger for logo
  useEffect(() => {
    const interval = setInterval(() => {
      setLogoTrigger(prev => prev + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Lottie loop every 5 seconds
  useEffect(() => {
    const lottieInterval = setInterval(() => {
      lottieRef.current?.goToAndPlay(0, true);
    }, 5000);
    return () => clearInterval(lottieInterval);
  }, []);

  const isHome = location.pathname === '/';
  const isApp = location.pathname === '/app';

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Header ── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-200 ${scrolled ? 'header-scrolled' : ''}`}
        style={{
          background: 'var(--bg-primary)',
          borderBottom: `1px solid ${scrolled ? 'var(--border-default)' : 'transparent'}`,
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo + Status */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-0 hover:opacity-75 transition-opacity"
              aria-label="Home"
              style={{ border: 'none', background: 'none' }}
            >
              <div className="font-logo text-xl md:text-2xl tracking-wide flex items-center" style={{ color: 'var(--text-primary)' }}>
                <div style={{ width: '160px', textAlign: 'left', display: 'inline-block', whiteSpace: 'nowrap' }}>
                  <DecryptedText 
                    text="Null-Secret" 
                    speed={40} 
                    maxIterations={10} 
                    trigger={logoTrigger}
                  />
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 ml-1 md:ml-2 flex-shrink-0 lottie-themed">
                  <LottiePlayer
                    lottieRef={lottieRef}
                    animationData={logolottie}
                    loop={false}
                    autoplay={true}
                  />
                </div>
              </div>
            </button>

            <div className="hidden sm:flex items-center gap-2 ml-2 pl-4" style={{ borderLeft: `1px solid var(--border-default)`, minWidth: '40px', justifyContent: 'center' }}>
              <div className="transition-all duration-300 flex items-center justify-center">
                {backendAlive === true ? (
                  <Wifi size={16} style={{ color: 'var(--text-success)' }} />
                ) : backendAlive === false ? (
                  <WifiOff size={16} style={{ color: 'var(--text-danger)' }} />
                ) : (
                  <Wifi size={16} className="animate-pulse" style={{ color: '#3b82f6' }} />
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!isHome && (
              <button
                onClick={() => navigate('/')}
                className="btn-ghost text-xs font-semibold tracking-wide hidden sm:flex"
                style={{ padding: '6px 12px', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                How It Works
              </button>
            )}
            {!isApp && (
              <button
                onClick={() => navigate('/app')}
                className="btn-ghost text-xs font-semibold tracking-wide hidden sm:flex"
                style={{ padding: '6px 12px', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                Create Secret
              </button>
            )}
            <button
              onClick={cycleTheme}
              aria-label={`Theme: ${PREF_LABEL[preference]}. Click to change.`}
              title={`Theme: ${PREF_LABEL[preference]}`}
              className="btn-ghost flex items-center gap-2"
              style={{ padding: '8px 10px' }}
            >
              <ThemeIcon preference={preference} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-8 fade-in">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto py-8" style={{ borderTop: `1px solid var(--border-default)`, background: 'var(--bg-secondary)' }}>
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Developed by Anurag Mishra (4nur4gmishr4)
            </span>
            <div className="flex gap-3 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              <button onClick={() => navigate('/')} className="hover:opacity-75 transition-opacity uppercase tracking-widest">How It Works</button>
              <span>|</span>
              <button onClick={() => navigate('/app')} className="hover:opacity-75 transition-opacity uppercase tracking-widest">Create Secret</button>
            </div>
            <span className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              © {new Date().getFullYear()} NULL-SECRET. All rights reserved.
            </span>
          </div>
          
          <div className="flex items-center gap-5">
            <a href="https://github.com/4nur4gmishr4" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity" style={{ color: 'var(--text-secondary)' }} aria-label="GitHub">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 19 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.8 4.8 0 0 0 9 18v4"></path></svg>
            </a>
            <a href="https://www.linkedin.com/in/4nur4gmishra/" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity" style={{ color: 'var(--text-secondary)' }} aria-label="LinkedIn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
            <a href="https://x.com/4nur4gmishr4" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity" style={{ color: 'var(--text-secondary)' }} aria-label="Twitter/X">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
            </a>
            <a href="mailto:anuragmishrasnag06082004@gmail.com" className="hover:opacity-75 transition-opacity" style={{ color: 'var(--text-secondary)' }} aria-label="Email">
              <Mail size={16} strokeWidth={2} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;