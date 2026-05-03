import React from 'react';
import { useNavigate } from 'react-router-dom';
import LottieView from '../components/LottieView';
import privacylockData from '../assets/lotties/privacylock.json';

const TwoFactorSetup: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-8 space-y-10 md:space-y-12">
      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 border-b pb-8 md:pb-10" style={{ borderColor: 'var(--border-default)' }}>
        <div className="w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 lottie-themed flex-shrink-0">
          <LottieView animationData={privacylockData} loop={true} />
        </div>
        <div className="space-y-4 text-center md:text-left">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: 'var(--text-tertiary)' }}>Authentication Layer</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>Two-Factor Auth</h1>
          <p className="text-sm md:text-base leading-relaxed max-w-xl font-medium" style={{ color: 'var(--text-secondary)' }}>
            Add a second check on top of your password. Even if someone steals your password, they still cannot get in without your phone.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 border space-y-6" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>How it works</h3>
          <ol className="space-y-4 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <li><strong style={{ color: 'var(--text-primary)' }}>Step 1.</strong> Install an authenticator app like Google Authenticator, 1Password, or Authy.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Step 2.</strong> Scan the QR code we will show you.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Step 3.</strong> Type the 6-digit code from the app to confirm.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Step 4.</strong> From now on, signing in needs your password plus the latest 6-digit code.</li>
          </ol>
        </div>

        <div className="p-8 border space-y-6" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border" style={{ borderColor: 'var(--border-default)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Not enrolled</p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>You can enroll any time.</p>
              </div>
              <button disabled className="text-[10px] font-bold uppercase opacity-50 cursor-not-allowed" style={{ color: 'var(--text-primary)' }}>Coming soon</button>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              <strong>Technical note.</strong> We use the standard TOTP scheme (RFC 6238) with a 30-second window. Your secret never leaves the server in plain form.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-8 text-center">
        <button onClick={() => navigate('/security')} className="text-xs font-bold uppercase tracking-widest underline" style={{ color: 'var(--text-tertiary)' }}>Back to Security</button>
      </div>
    </div>
  );
};

export default TwoFactorSetup;
