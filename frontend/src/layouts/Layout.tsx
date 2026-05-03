import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '../utils/firebase';
import InViewLottie from '../components/InViewLottie';
import Footer from '../components/Footer';
import { AUTH_ROUTES } from '../utils/constants';
import { readSessionTimeoutMinutes } from '../utils/sessionTimeout';
import { API_BASE } from '../utils/api';
import logolottieData from '../assets/lotties/logolottie.json';
const MENU_CLOSE_DURATION_MS = 240;
const INACTIVITY_EVENTS: readonly (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
];

const ThemeIcon: React.FC<{ preference: string }> = ({ preference }) => {
  if (preference === 'system') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
  }
  if (preference === 'light') {
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
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
};

type WifiState = 'error' | 'staging' | 'connected';

function deriveWifiState(alive: boolean | null, animState: 0 | 1 | 2 | 3): WifiState {
  if (alive === false) return 'error';
  if (alive === true) return 'connected';
  if (animState === 0) return 'error';
  if (animState === 1) return 'staging';
  return 'connected';
}

const WifiErrorIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fade-in-quick">
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M8.5 16.5a5 5 0 0 1 7 0" />
    <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
    <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.82" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const WifiStagingIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12.01" y2="20" className="opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]" style={{ animationDelay: '0s' }} />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" className="opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]" style={{ animationDelay: '0.2s' }} />
    <path d="M5 12.55a11 11 0 0 1 14.08 0" className="opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]" style={{ animationDelay: '0.5s' }} />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" className="opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]" style={{ animationDelay: '0.8s' }} />
  </svg>
);

const WifiOkIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fade-in-quick">
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const HeaderWifiIcon: React.FC<{ alive: boolean | null }> = ({ alive }) => {
  const [animState, setAnimState] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    if (alive !== null) return;
    const timers: number[] = [
      window.setTimeout(() => setAnimState(1), 1000),
      window.setTimeout(() => setAnimState(2), 2000),
      window.setTimeout(() => setAnimState(3), 3000),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [alive]);

  const state = deriveWifiState(alive, animState);
  const isChecking = alive === null && animState < 3;

  return (
    <div className="relative flex items-center justify-center w-8 h-8">
      <svg
        className="absolute inset-0 w-full h-full stretchy-spinner transition-opacity duration-500"
        viewBox="25 25 50 50"
        style={{ opacity: isChecking ? 1 : 0 }}
      >
        <circle cx="50" cy="50" r="20" fill="none" stroke="var(--text-tertiary)" strokeWidth="3" strokeLinecap="round" />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        {state === 'error' && <WifiErrorIcon />}
        {state === 'staging' && <WifiStagingIcon />}
        {state === 'connected' && <WifiOkIcon />}
      </div>
    </div>
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
  /** 'closed' = not in DOM; 'open' = mounted with enter animation; 'closing' = playing exit animation. */
  const [menuPhase, setMenuPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const [user, setUser] = useState<User | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const isMobileMenuOpen = menuPhase !== 'closed';
  const closeMenuTimerRef = useRef<number | null>(null);

  const closeMobileMenu = useCallback(() => {
    setMenuPhase(prev => (prev === 'open' ? 'closing' : prev));
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMenuPhase(prev => {
      if (prev === 'closed') return 'open';
      if (prev === 'open') return 'closing';
      return prev;
    });
  }, []);

  // After the close animation finishes, unmount the menu so it does not stay focusable.
  useEffect(() => {
    if (menuPhase !== 'closing') return;
    closeMenuTimerRef.current = window.setTimeout(() => setMenuPhase('closed'), MENU_CLOSE_DURATION_MS);
    return () => {
      if (closeMenuTimerRef.current !== null) window.clearTimeout(closeMenuTimerRef.current);
    };
  }, [menuPhase]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    setShowProfileMenu(false);
    navigate('/');
  }, [navigate]);

  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showProfileMenu) return;
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  useEffect(() => {
    const handleScroll = (): void => {
      setScrolled(prev => {
        const next = window.scrollY > 8;
        return prev === next ? prev : next;
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let interval: number | null = null;

    const checkHealth = async (): Promise<void> => {
      try {
        const resp = await fetch(`${API_BASE}/healthz`, {
          mode: 'cors',
          signal: controller.signal,
        });
        if (cancelled) return;
        setBackendAlive(resp.ok);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        setBackendAlive(false);
      }
    };

    const startPolling = () => {
      if (interval !== null) return;
      void checkHealth();
      interval = window.setInterval(() => { void checkHealth(); }, 60_000);
    };

    const stopPolling = () => {
      if (interval !== null) {
        window.clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      controller.abort();
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  /**
   * Auto-logout for signed-in users.
   * Resets a deadline on each interaction event. When the deadline passes
   * with no activity, signs the user out. Effect cleanly tears down its
   * listeners and timer when the user signs out or the window unmounts.
   */
  useEffect(() => {
    if (!user) return;
    const minutes = readSessionTimeoutMinutes();
    const timeoutMs = minutes * 60 * 1000;
    let deadlineTimer: number | null = null;

    const triggerLogout = () => {
      void handleSignOut();
    };

    const resetDeadline = () => {
      if (deadlineTimer !== null) window.clearTimeout(deadlineTimer);
      deadlineTimer = window.setTimeout(triggerLogout, timeoutMs);
    };

    resetDeadline();
    for (const evt of INACTIVITY_EVENTS) {
      window.addEventListener(evt, resetDeadline, { passive: true });
    }
    return () => {
      if (deadlineTimer !== null) window.clearTimeout(deadlineTimer);
      for (const evt of INACTIVITY_EVENTS) {
        window.removeEventListener(evt, resetDeadline);
      }
    };
  }, [user, handleSignOut]);

  const isHome = location.pathname === '/';
  const isApp = location.pathname === '/app';
  const isAuthRoute = AUTH_ROUTES.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Header ── */}
      <header
        className={`sticky top-0 z-[70] transition-all duration-200 ${scrolled ? 'header-scrolled' : ''}`}
        style={{
          background: 'var(--bg-primary)',
          borderBottom: `1px solid ${scrolled ? 'var(--border-default)' : 'transparent'}`,      
        }}
      >
        <div className="w-full max-w-screen-2xl mx-auto px-2 md:px-8 py-4 flex items-center justify-between">
          {/* Logo (Lottie first, then Text) */}
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => navigate('/')}
              className="relative flex items-center gap-1 md:gap-2 hover:opacity-75 transition-opacity"  
              aria-label="Home"
              style={{ border: 'none', background: 'none' }}
            >
              {/* Invisible spacer to maintain layout and nav height */}
              <div className="w-16 h-10 md:w-20 md:h-12 flex-shrink-0" />
              
              {/* Actual Oversized Logo Lottie */}
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 flex-shrink-0 lottie-themed pointer-events-none">
                <InViewLottie
                  animationData={logolottieData}
                  loop={true}
                  autoplay={true}
                />
              </div>
              <div className="font-logo text-base md:text-xl tracking-wide flex items-center ml-4 md:ml-6" style={{ color: 'var(--text-primary)' }}>
                <span className="whitespace-nowrap">
                  Null-Secret
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Actions & Hamburger */}
          <div className="flex items-center gap-3 md:gap-4">
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
                onClick={() => user ? navigate('/app') : navigate('/login')}
                className="btn-ghost text-xs font-semibold tracking-wide hidden sm:flex"
                style={{ padding: '6px 12px', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                Create Secret
              </button>
            )}
            {!user && (
              <button
                onClick={() => navigate('/login')}
                className="btn-ghost text-xs font-semibold tracking-wide hidden sm:flex items-center gap-2"
                style={{ padding: '6px 12px', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                Vault
              </button>
            )}

            <div className="hidden sm:flex items-center justify-center mr-1">
              <HeaderWifiIcon alive={backendAlive} />
            </div>

            {/* Theme Toggle */}
            <div className={`${isMobileMenuOpen ? 'hidden' : 'flex'} items-center gap-3 md:gap-4`}>
              {/* Theme Toggle */}
              <button
                onClick={cycleTheme}
                aria-label={`Theme: ${PREF_LABEL[preference]}. Click to change.`}
                title={`Theme: ${PREF_LABEL[preference]}`}
                className="flex items-center justify-center transition-all duration-200"
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  border: '1px solid var(--border-default)', 
                  background: 'var(--bg-elevated)',
                  cursor: 'pointer'
                }}
              >
                <ThemeIcon preference={preference} />
              </button>

              {/* Profile Box */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center justify-center transition-all duration-200 overflow-hidden"
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    border: '1px solid var(--border-default)', 
                    background: 'var(--bg-elevated)',
                    cursor: 'pointer'
                  }}
                  aria-label="User Profile"
                >
                  {user ? (
                    user.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold uppercase" style={{ color: 'var(--text-primary)' }}>
                        {(user.displayName || user.email || 'U').charAt(0)}
                      </span>
                    )
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 z-[80] slide-up shadow-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)', right: '0' }}>
                    {user ? (
                      <>
                        <div className="p-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
                          <p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--text-tertiary)' }}>Active Account</p>
                          <p className="text-xs font-bold mt-1 break-all" style={{ color: 'var(--text-primary)' }}>{user.email}</p>
                        </div>
                        <div className="py-1">
                          <button onClick={() => { setShowProfileMenu(false); navigate('/app'); }} className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-[var(--accent-subtle)] transition-colors" style={{ color: 'var(--text-primary)' }}>Create Secret</button>
                          <button onClick={() => { setShowProfileMenu(false); navigate('/account'); }} className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-[var(--accent-subtle)] transition-colors" style={{ color: 'var(--text-primary)' }}>Account Profile</button>
                          <button onClick={() => { setShowProfileMenu(false); navigate('/history'); }} className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-[var(--accent-subtle)] transition-colors" style={{ color: 'var(--text-primary)' }}>Usage History</button>
                          <button onClick={() => { setShowProfileMenu(false); navigate('/security'); }} className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-[var(--accent-subtle)] transition-colors" style={{ color: 'var(--text-primary)' }}>Security Settings</button>
                          <button onClick={() => { setShowProfileMenu(false); navigate('/privacy'); }} className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-[var(--accent-subtle)] transition-colors" style={{ color: 'var(--text-primary)' }}>Privacy</button>
                        </div>
                        <div className="p-1 border-t" style={{ borderColor: 'var(--border-default)' }}>
                          <button onClick={handleSignOut} className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-500/5 transition-colors">Sign Out</button>
                        </div>
                      </>
                    ) : (
                      <div className="p-2 space-y-1">
                        <button onClick={() => { setShowProfileMenu(false); navigate('/login'); }} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-[var(--accent-subtle)] transition-colors" style={{ color: 'var(--text-primary)' }}>Sign In</button>
                        <button onClick={() => { setShowProfileMenu(false); navigate('/signup'); }} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-[var(--accent-subtle)] transition-colors" style={{ color: 'var(--text-primary)' }}>Create Account</button>
                        <div className="border-t my-1" style={{ borderColor: 'var(--border-default)' }} />
                        <button onClick={() => { setShowProfileMenu(false); navigate('/privacy'); }} className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-[var(--accent-subtle)] transition-colors" style={{ color: 'var(--text-primary)' }}>Privacy</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hamburger Menu */}
            <div className="flex items-center">
              <button
                  onClick={toggleMobileMenu}
                  className="p-2 transition-colors flex items-center justify-center"
                  style={{ border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', width: '36px', height: '36px' }}
                  aria-label={isMobileMenuOpen ? "Close Menu" : "Open Menu"}
              >
                  {isMobileMenuOpen ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="4" x2="20" y1="12" y2="12" />
                        <line x1="4" x2="20" y1="6" y2="6" />
                        <line x1="4" x2="20" y1="18" y2="18" />
                    </svg>
                  )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
          className={`fixed inset-0 z-50 flex flex-col pt-[var(--header-h)] ${menuPhase === 'closing' ? 'menu-close' : 'menu-open'}`}
          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          aria-hidden={menuPhase === 'closing'}
        >
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 sm:py-8">
            {/* Identity row */}
            {user ? (
              <div className="flex items-center gap-4 pb-6 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <div className="w-12 h-12 border flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
                  {user.photoURL
                    ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                    : <span className="text-base font-bold uppercase">{(user.displayName || user.email || 'U').charAt(0)}</span>}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold tracking-tight truncate">{user.displayName || 'Signed in'}</p>
                  <p className="text-[11px] break-all" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="pb-6 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: 'var(--text-tertiary)' }}>Welcome</p>
                <p className="text-sm mt-1 leading-snug" style={{ color: 'var(--text-secondary)' }}>Sign in to save your daily limit, see your history, and pick stricter security settings.</p>
              </div>
            )}

            {/* Primary navigation */}
            <nav aria-label="Primary" className="pt-6">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-4" style={{ color: 'var(--text-tertiary)' }}>Navigate</p>
              <ul className="space-y-0">
                {[
                  { label: 'Home', path: '/' },
                  { label: 'Create Secret', path: '/app', protected: true },
                  { label: 'Privacy', path: '/privacy' },
                ].map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <li key={item.path}>
                      <button
                        onClick={() => {
                          closeMobileMenu();
                          if (item.protected && !user) {
                            navigate('/login');
                          } else {
                            navigate(item.path);
                          }
                        }}
                        className="group w-full flex items-center justify-between py-5 text-left border-b transition-colors"
                        style={{ borderColor: 'var(--border-default)', color: active ? 'var(--text-primary)' : 'var(--text-primary)' }}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="font-bold text-[22px] sm:text-[26px] tracking-tight">{item.label}</span>
                        <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold" style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                          {active && <span className="w-1.5 h-1.5 inline-block" style={{ background: 'var(--text-primary)' }} aria-hidden="true" />}
                          {active ? 'Open' : 'Go'}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* External links */}
            <nav aria-label="External" className="pt-8">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-4" style={{ color: 'var(--text-tertiary)' }}>Resources</p>
              <ul className="space-y-0">
                {[
                  { label: 'Documentation', url: 'https://github.com/4nur4gmishr4/Null-Secret/blob/main/README.md', external: true },
                  { label: 'GitHub Repository', url: 'https://github.com/4nur4gmishr4/Null-Secret', external: true },
                  { label: 'User Guide', url: 'https://github.com/4nur4gmishr4/Null-Secret/blob/main/USER_GUIDE.md', external: true },
                  { label: 'Support', url: 'https://github.com/4nur4gmishr4/Null-Secret/issues', external: true },
                ].map((item) => (
                  <li key={item.url}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group w-full flex items-center justify-between py-4 text-left text-sm font-bold border-b transition-colors"
                      style={{ borderColor: 'var(--border-default)' }}
                    >
                      <span>{item.label}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }} className="transition-transform group-hover:translate-x-0.5">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Theme toggle in mobile menu */}
            <nav aria-label="Theme" className="pt-8">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-4" style={{ color: 'var(--text-tertiary)' }}>Appearance</p>
              <button
                onClick={cycleTheme}
                className="w-full flex items-center justify-between py-4 text-left text-sm font-bold border-b transition-colors"
                style={{ borderColor: 'var(--border-default)' }}
              >
                <span>Theme: {PREF_LABEL[preference]}</span>
                <ThemeIcon preference={preference} />
              </button>
            </nav>

            {/* Legal links */}
            <nav aria-label="Legal" className="pt-8">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-4" style={{ color: 'var(--text-tertiary)' }}>Legal</p>
              <ul className="space-y-0">
                {[
                  { label: 'Privacy Policy', url: '/privacy', external: false },
                  { label: 'Terms of Service', url: 'https://github.com/4nur4gmishr4/Null-Secret/blob/main/LICENSE', external: true },
                ].map((item) => (
                  <li key={item.url}>
                    {item.external ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group w-full flex items-center justify-between py-4 text-left text-sm font-bold border-b transition-colors"
                        style={{ borderColor: 'var(--border-default)' }}
                      >
                        <span>{item.label}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }} className="transition-transform group-hover:translate-x-0.5">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    ) : (
                      <button
                        onClick={() => { closeMobileMenu(); navigate(item.url); }}
                        className="group w-full flex items-center justify-between py-4 text-left text-sm font-bold border-b transition-colors"
                        style={{ borderColor: 'var(--border-default)' }}
                      >
                        <span>{item.label}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }} className="transition-transform group-hover:translate-x-0.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            {/* Contact */}
            <nav aria-label="Contact" className="pt-8">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-4" style={{ color: 'var(--text-tertiary)' }}>Contact</p>
              <a
                href="mailto:anuragmishrasnag06082004@gmail.com"
                className="group w-full flex items-center justify-between py-4 text-left text-sm font-bold border-b transition-colors"
                style={{ borderColor: 'var(--border-default)' }}
              >
                <span>Email</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }} className="transition-transform group-hover:translate-x-0.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </a>
            </nav>

            {/* Account section, signed-in only */}
            {user && (
              <nav aria-label="Account" className="pt-8">
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-4" style={{ color: 'var(--text-tertiary)' }}>Your account</p>
                <ul className="space-y-0">
                  {[
                    { label: 'Account Profile', path: '/account' },
                    { label: 'Usage History', path: '/history' },
                    { label: 'Security Settings', path: '/security' },
                  ].map((item) => {
                    const active = location.pathname === item.path;
                    return (
                      <li key={item.path}>
                        <button
                          onClick={() => { closeMobileMenu(); navigate(item.path); }}
                          className="w-full flex items-center justify-between py-4 text-left text-sm font-bold border-b transition-colors"
                          style={{ borderColor: 'var(--border-default)' }}
                          aria-current={active ? 'page' : undefined}
                        >
                          <span>{item.label}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
          </div>

          {/* Sticky bottom action */}
          <div className="px-5 sm:px-8 py-4 mt-auto" style={{ borderTop: '1px solid var(--border-default)' }}>
            {!user ? (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { closeMobileMenu(); navigate('/login'); }} className="w-full py-3 text-sm font-bold transition-colors" style={{ background: 'transparent', border: '1px solid var(--border-default)' }}>
                  Sign In
                </button>
                <button onClick={() => { closeMobileMenu(); navigate('/signup'); }} className="w-full py-3 text-sm font-bold transition-colors" style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                  Create Account
                </button>
              </div>
            ) : (
              <button onClick={() => { closeMobileMenu(); void handleSignOut(); }} className="w-full py-3 text-sm font-bold transition-colors text-red-500" style={{ background: 'transparent', border: '1px solid var(--border-default)' }}>
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <main
        className={`flex-grow w-full mx-auto fade-in ${isAuthRoute ? 'p-0' : 'max-w-screen-2xl px-3 md:px-8 py-2 md:py-4'}`}
      >
        {children}
      </main>

      {!isAuthRoute && <Footer />}
    </div>
  );
};

export default Layout;
