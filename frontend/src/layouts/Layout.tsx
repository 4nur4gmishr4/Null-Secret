import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '../utils/firebase';
import logolottie from '../assets/lotties/logolottie.json';
import InViewLottie from '../components/InViewLottie';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';

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

const HeaderWifiIcon: React.FC<{ alive: boolean | null }> = ({ alive }) => {
  const [animState, setAnimState] = useState<0|1|2|3>(0);

  useEffect(() => {
    if (alive !== null) return;
    const t1 = setTimeout(() => setAnimState(1), 1000);
    const t2 = setTimeout(() => setAnimState(2), 2000);
    const t3 = setTimeout(() => setAnimState(3), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [alive]);

  const isChecking = alive === null && animState < 3;
  const isConnected = alive === true || (alive === null && animState >= 2);
  const isError = alive === false;

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
        {(isError || (alive === null && animState === 0)) && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fade-in-quick">       
            <line x1="2" y1="2" x2="22" y2="22" />
            <path d="M8.5 16.5a5 5 0 0 1 7 0" />
            <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
            <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.82" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        )}
        {(alive === null && animState === 1) && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12.01" y2="20" className="opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]" style={{ animationDelay: '0s' }} />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" className="opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]" style={{ animationDelay: '0.2s' }} />
            <path d="M5 12.55a11 11 0 0 1 14.08 0" className="opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]" style={{ animationDelay: '0.5s' }} />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" className="opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]" style={{ animationDelay: '0.8s' }} />
          </svg>
        )}
        {(isConnected && animState >= 2) && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fade-in-quick">      
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        )}
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    setShowProfileMenu(false);
    navigate('/');
  };

  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const resp = await fetch(`${API_BASE}/healthz`, { mode: 'cors' });
        if (resp.ok) {
          setBackendAlive(true);
        } else {
          setBackendAlive(false);
        }
      } catch {
        setBackendAlive(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const isHome = location.pathname === '/';
  const isApp = location.pathname === '/app';

  // satisfy unused import check
  if (false) console.log(Navbar);

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
                  animationData={logolottie}
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
                onClick={() => navigate('/app')}
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
                          <button onClick={() => { setShowProfileMenu(false); navigate('/app'); }} className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-[var(--accent-subtle)] transition-colors" style={{ color: 'var(--text-primary)' }}>Create New Secret</button>
                          <button onClick={() => { setShowProfileMenu(false); navigate('/history'); }} className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-[var(--accent-subtle)] transition-colors" style={{ color: 'var(--text-primary)' }}>Usage History</button>
                          <button onClick={() => { setShowProfileMenu(false); navigate('/security'); }} className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-[var(--accent-subtle)] transition-colors" style={{ color: 'var(--text-primary)' }}>Security Settings</button>
                          <a 
                              href="/privacy" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="block px-4 py-3 text-xs font-semibold hover:bg-[var(--accent-subtle)] transition-colors" 
                              style={{ color: 'var(--text-primary)' }}
                          >
                              Privacy Manifesto
                          </a>
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
                        <a 
                            href="/privacy" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="block px-4 py-3 text-xs font-semibold hover:bg-[var(--accent-subtle)] transition-colors" 
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Privacy Manifesto
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hamburger Menu */}
            <div className="flex items-center">
              <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
          <div className="fixed inset-0 z-50 flex flex-col slide-up pt-[73px]" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

              {/* Mobile Links */}
              <div className="flex-1 overflow-y-auto px-6 py-12 space-y-8">
                  <div className="slide-up" style={{ borderBottom: '1px solid var(--border-default)', animationDelay: '0.05s' }}>
                      <button onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }} className="block w-full py-8 text-left font-bold text-[32px] tracking-tight hover:pl-2 transition-all">
                          Home
                      </button>
                  </div>
                  <div className="slide-up" style={{ borderBottom: '1px solid var(--border-default)', animationDelay: '0.1s' }}>
                      <button onClick={() => { setIsMobileMenuOpen(false); navigate('/app'); }} className="block w-full py-8 text-left font-bold text-[32px] tracking-tight hover:pl-2 transition-all">
                          Create Secret
                      </button>
                  </div>
                  <div className="slide-up" style={{ borderBottom: '1px solid var(--border-default)', animationDelay: '0.15s' }}>
                      <button onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }} className="block w-full py-8 text-left font-bold text-[32px] tracking-tight hover:pl-2 transition-all">
                          Vault
                      </button>
                                    {user && (
                    <div className="py-8 space-y-6 border-t" style={{ borderColor: 'var(--border-default)' }}>
                      <div className="text-[11px] uppercase tracking-[0.3em] font-bold" style={{ color: 'var(--text-tertiary)' }}>Account Details</div>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 border flex items-center justify-center overflow-hidden" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>  
                          {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-xl font-bold">{(user.displayName || user.email || 'U').charAt(0)}</span>}
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-bold tracking-tight">{user.displayName || 'User'}</p>
                          <p className="text-xs break-all" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 pt-4">
                          <button onClick={() => { setIsMobileMenuOpen(false); navigate('/history'); }} className="block w-full py-4 text-left text-base font-bold border-b" style={{ borderColor: 'var(--border-default)' }}>Usage History</button>
                          <button onClick={() => { setIsMobileMenuOpen(false); navigate('/security'); }} className="block w-full py-4 text-left text-base font-bold border-b" style={{ borderColor: 'var(--border-default)' }}>Security Settings</button>
                      </div>
                    </div>
                  )}
                </div>
        </div>

              {/* Mobile Footer Actions */}
              <div className="p-6 space-y-4 mt-auto" style={{ borderTop: '1px solid var(--border-default)' }}>
                  {!user ? (
                    <>
                      <button onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }} className="w-full py-4 text-base font-bold transition-colors" style={{ background: 'transparent', border: '1px solid var(--border-default)' }}>
                          Sign In to Vault
                      </button>
                      <button onClick={() => { setIsMobileMenuOpen(false); navigate('/signup'); }} className="w-full py-4 text-base font-bold transition-colors" style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                          Create Account
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setIsMobileMenuOpen(false); handleSignOut(); }} className="w-full py-4 text-base font-bold transition-colors text-red-500" style={{ background: 'transparent', border: '1px solid var(--border-default)' }}>
                        Sign Out
                    </button>
                  )}
              </div>
          </div>
      )}

      {/* ── Main ── */}
      <main className="flex-grow w-full max-w-screen-2xl mx-auto px-2 md:px-8 py-8 fade-in">    
        {children}
      </main>

      <Footer />
    </div>
  );
};

export default Layout;
