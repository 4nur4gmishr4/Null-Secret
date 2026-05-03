import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LottieView from '../components/LottieView';
import {
  readSessionTimeoutMinutes,
  writeSessionTimeoutMinutes,
} from '../utils/sessionTimeout';
import type { SessionTimeoutOption } from '../utils/constants';
import privacylockData from '../assets/lotties/privacylock.json';

interface Option {
  readonly value: SessionTimeoutOption;
  readonly label: string;
  readonly hint: string;
}

const OPTIONS: readonly Option[] = [
  { value: '5', label: '5 minutes', hint: 'Most secure. Recommended for shared computers.' },
  { value: '15', label: '15 minutes', hint: 'Balanced default.' },
  { value: '60', label: '1 hour', hint: 'Convenient for personal devices.' },
  { value: '480', label: '8 hours', hint: 'Stays signed in for a working day.' },
];

const SessionTimeout: React.FC = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<SessionTimeoutOption>('15');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const persistedRef = useRef<string>('15');

  useEffect(() => {
    const current = String(readSessionTimeoutMinutes()) as SessionTimeoutOption;
    setSelected(current);
    persistedRef.current = current;
  }, []);

  const handleSave = useCallback(() => {
    writeSessionTimeoutMinutes(selected);
    persistedRef.current = selected;
    setSavedAt(Date.now());
  }, [selected]);

  const isDirty = persistedRef.current !== selected;

  return (
    <div className="fade-in max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-8 space-y-10 md:space-y-12">
      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 border-b pb-8 md:pb-10" style={{ borderColor: 'var(--border-default)' }}>
        <div className="w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 lottie-themed flex-shrink-0">
          <LottieView animationData={privacylockData} loop={true} />
        </div>
        <div className="space-y-4 text-center md:text-left">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: 'var(--text-tertiary)' }}>Cryptographic Session</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>Auto Timeout</h1>
          <p className="text-sm md:text-base leading-relaxed max-w-xl font-medium" style={{ color: 'var(--text-secondary)' }}>
            Pick how long the app should wait before signing you out automatically when you stop using it. The new value applies on your next sign-in or after a page refresh.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Choose a window</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className="p-6 border text-left transition-colors"
              style={{
                borderColor: selected === opt.value ? 'var(--text-primary)' : 'var(--border-default)',
                background: selected === opt.value ? 'var(--bg-elevated)' : 'transparent',
              }}
            >
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{opt.hint}</p>
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed pt-2" style={{ color: 'var(--text-tertiary)' }}>
          <strong>Technical note.</strong> Inactivity is measured by the absence of mouse, keyboard, scroll, and touch events. Once the timer fires, your auth state is cleared locally and a fresh sign-in is required. The preference is stored in your browser, not on our server.
        </p>
      </div>

      {savedAt !== null && (
        <div className="p-4 border" role="status" aria-live="polite" style={{ borderColor: 'var(--text-success)', background: 'var(--surface-success)', color: 'var(--text-success)' }}>
          <p className="text-xs font-semibold">Saved. Refresh the page or sign in again for the new window to take effect.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-4">
        <button onClick={() => navigate('/security')} className="btn btn-ghost w-full text-xs tracking-wider uppercase">Cancel</button>
        <button
          onClick={handleSave}
          disabled={!isDirty && savedAt !== null}
          className="btn btn-primary w-full text-xs tracking-wider uppercase"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default SessionTimeout;
