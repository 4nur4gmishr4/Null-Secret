import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LottieView from '../components/LottieView';
import { auth } from '../utils/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import privacylockData from '../assets/lotties/privacylock.json';

interface CurrentDevice {
  readonly label: string;
  readonly platform: string;
  readonly userAgent: string;
  readonly lastActiveAt: string;
  readonly signedInAt: string;
}

/**
 * Builds a friendly description of the current browser without revealing
 * sensitive details. We deliberately avoid IP, geolocation, and User-Agent
 * client hints; the goal is to help the user recognise the row, not to
 * fingerprint them.
 */
function describeCurrentDevice(user: User): CurrentDevice {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  let label = 'This browser';
  if (/iPhone/i.test(ua)) label = 'iPhone';
  else if (/iPad/i.test(ua)) label = 'iPad';
  else if (/Android/i.test(ua)) label = 'Android device';
  else if (/Mac/i.test(ua)) label = 'Mac';
  else if (/Windows/i.test(ua)) label = 'Windows PC';
  else if (/Linux/i.test(ua)) label = 'Linux PC';

  let platform = 'Unknown browser';
  if (/Edg\//.test(ua)) platform = 'Edge';
  else if (/Chrome\//.test(ua)) platform = 'Chrome';
  else if (/Firefox\//.test(ua)) platform = 'Firefox';
  else if (/Safari\//.test(ua)) platform = 'Safari';

  return {
    label,
    platform,
    userAgent: ua,
    lastActiveAt: 'Active now',
    signedInAt: user.metadata.lastSignInTime
      ? new Date(user.metadata.lastSignInTime).toLocaleString()
      : 'Unknown',
  };
}

const DeviceSessions: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [device, setDevice] = useState<CurrentDevice | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
      setDevice(describeCurrentDevice(currentUser));
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSignOutThisDevice = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
      navigate('/');
    } finally {
      setSigningOut(false);
    }
  }, [navigate]);

  return (
    <div className="fade-in max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-8 space-y-10 md:space-y-12">
      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 border-b pb-8 md:pb-10" style={{ borderColor: 'var(--border-default)' }}>
        <div className="w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 lottie-themed flex-shrink-0">
          <LottieView animationData={privacylockData} loop={true} />
        </div>
        <div className="space-y-4 text-center md:text-left">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: 'var(--text-tertiary)' }}>Cryptographic Session</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>Device Sessions</h1>
          <p className="text-sm md:text-base leading-relaxed max-w-xl font-medium" style={{ color: 'var(--text-secondary)' }}>
            Your current sign-in session, plus a quick way to sign out from this browser.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>This device</h3>
        {device && user && (
          <div className="p-6 border space-y-3" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {device.label} · {device.platform}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  Signed in: {device.signedInAt}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-success)' }}>
                  {device.lastActiveAt}
                </p>
                <p className="text-[10px] mono break-all pt-2" style={{ color: 'var(--text-tertiary)' }}>
                  {device.userAgent}
                </p>
              </div>
              <button
                onClick={handleSignOutThisDevice}
                disabled={signingOut}
                className="text-[10px] font-bold uppercase underline whitespace-nowrap"
                style={{ color: 'var(--text-danger)' }}
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        )}
        <p className="text-[11px] leading-relaxed pt-2" style={{ color: 'var(--text-tertiary)' }}>
          <strong>Why only one device.</strong> Firebase Auth on the web exposes only the current session, not a list across devices. To see a true cross-device list we would need server-side session tokens, which we have deliberately avoided to keep our footprint minimal. Signing out here clears the auth state on this browser only. If you suspect another browser is signed in to your account, change your password from the sign-in screen; that revokes the refresh tokens everywhere.
        </p>
      </div>

      <div className="pt-8 text-center">
        <button onClick={() => navigate('/security')} className="text-xs font-bold uppercase tracking-widest underline" style={{ color: 'var(--text-tertiary)' }}>Back to Security</button>
      </div>
    </div>
  );
};

export default DeviceSessions;
