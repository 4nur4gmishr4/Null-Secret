import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SecurityPageHeader from '../components/SecurityPageHeader';
import {
  readSessionTimeoutMinutes,
  writeSessionTimeoutMinutes,
} from '../utils/sessionTimeout';
import type { SessionTimeoutOption } from '../utils/constants';

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
  const [selected, setSelected] = useState<SessionTimeoutOption>(() => {
    return String(readSessionTimeoutMinutes()) as SessionTimeoutOption;
  });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [persisted, setPersisted] = useState<SessionTimeoutOption>(() => {
    return String(readSessionTimeoutMinutes()) as SessionTimeoutOption;
  });

  const handleSave = useCallback(() => {
    writeSessionTimeoutMinutes(selected);
    setPersisted(selected);
    setSavedAt(Date.now());
  }, [selected]);

  const isDirty = persisted !== selected;

  return (
    <div className="fade-in max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-8 space-y-10 md:space-y-12">
      <SecurityPageHeader
        eyebrow="Cryptographic Session"
        title="Auto Timeout"
        description="Pick how long the app should wait before signing you out automatically when you stop using it. The new value applies on your next sign-in or after a page refresh."
      />

      <div className="space-y-4">
        <h3 className="section-title" style={{ color: 'var(--text-primary)' }}>Choose a window</h3>
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
