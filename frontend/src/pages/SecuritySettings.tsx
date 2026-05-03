import React from 'react';
import { useNavigate } from 'react-router-dom';
import SecurityPageHeader from '../components/SecurityPageHeader';
import BackLink from '../components/BackLink';
import { readSessionTimeoutMinutes } from '../utils/sessionTimeout';

function formatTimeoutDescription(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.round(minutes / 60);
    return `Currently ${hours} hour${hours === 1 ? '' : 's'} of inactivity.`;
  }
  return `Currently ${minutes} minute${minutes === 1 ? '' : 's'} of inactivity.`;
}

const SecuritySettings: React.FC = () => {
  const navigate = useNavigate();
  const timeoutMinutes = readSessionTimeoutMinutes();
  const timeoutLabel = formatTimeoutDescription(timeoutMinutes);

  return (
    <div className="fade-in max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-8 space-y-10 md:space-y-12">
      <SecurityPageHeader
        eyebrow="Account Protection"
        title="Security Settings"
        description="Choose how strict your sign-in should be and how the app handles inactive sessions. Every option here only affects your account, not the secrets you create."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Authentication Layer */}
        <div className="p-8 border space-y-6" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="section-title" style={{ color: 'var(--text-primary)' }}>How you sign in</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border" style={{ borderColor: 'var(--border-default)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Two-Factor Auth</p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Ask for a 6-digit code on every sign-in.</p>
              </div>
              <button onClick={() => navigate('/security/2fa')} className="text-[10px] font-bold uppercase underline" style={{ color: 'var(--text-primary)' }}>Enable</button>
            </div>
            <div className="flex items-center justify-between p-4 border" style={{ borderColor: 'var(--border-default)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Biometric Lock</p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Sign in with fingerprint or face.</p>
              </div>
              <button onClick={() => navigate('/security/biometric')} className="text-[10px] font-bold uppercase underline" style={{ color: 'var(--text-primary)' }}>Configure</button>
            </div>
          </div>
        </div>

        {/* Cryptographic Session */}
        <div className="p-8 border space-y-6" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="section-title" style={{ color: 'var(--text-primary)' }}>Sessions and timeouts</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border" style={{ borderColor: 'var(--border-default)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Auto-timeout</p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{timeoutLabel}</p>
              </div>
              <button onClick={() => navigate('/security/timeout')} className="text-[10px] font-bold uppercase underline" style={{ color: 'var(--text-primary)' }}>Edit</button>
            </div>
            <div className="flex items-center justify-between p-4 border" style={{ borderColor: 'var(--border-default)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Device sessions</p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Current session only. Tap to review.</p>
              </div>
              <button onClick={() => navigate('/security/sessions')} className="text-[10px] font-bold uppercase underline" style={{ color: 'var(--text-primary)' }}>View All</button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 border space-y-4" style={{ borderColor: 'var(--text-danger)', background: 'var(--surface-danger)' }}>
        <h3 className="section-title" style={{ color: 'var(--text-danger)' }}>Danger Zone</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Permanently delete your account, your usage history, and every active secret you have created. This cannot be undone.
        </p>
        <button
          onClick={() => navigate('/security/destroy')}
          className="text-[10px] font-bold uppercase px-4 py-2 transition-colors"
          style={{ background: 'var(--text-danger)', color: '#fff' }}
        >
          Destroy Vault
        </button>
      </div>

      <BackLink to="/privacy" label="Privacy" />
    </div>
  );
};

export default SecuritySettings;
