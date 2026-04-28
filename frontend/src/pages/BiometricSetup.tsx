import React from 'react';
import { useNavigate } from 'react-router-dom';
import LottieView from '../components/LottieView';
import securityLottie from '../assets/lotties/privacylock.json';

const BiometricSetup: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-8 space-y-10 md:space-y-12">
      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 border-b pb-8 md:pb-10" style={{ borderColor: 'var(--border-default)' }}>
        <div className="w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 lottie-themed flex-shrink-0">
          <LottieView animationData={securityLottie} loop={true} />
        </div>
        <div className="space-y-4 text-center md:text-left">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: 'var(--text-tertiary)' }}>Authentication Layer</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>Biometric Lock</h1>
          <p className="text-sm md:text-base leading-relaxed max-w-xl font-medium" style={{ color: 'var(--text-secondary)' }}>
            Sign in with your fingerprint, face, or device PIN. No password to remember and nothing for an attacker to steal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 border space-y-6" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>What you get</h3>
          <ul className="space-y-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <li>Sign in with Face ID, Touch ID, Windows Hello, or any device unlock method.</li>
            <li>Phishing resistant: your biometric stays on your device, only a signed proof is sent.</li>
            <li>Faster than typing a password every time.</li>
            <li>Works as a replacement or as a second factor.</li>
          </ul>
        </div>

        <div className="p-8 border space-y-6" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border" style={{ borderColor: 'var(--border-default)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Not configured</p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Available on devices that support WebAuthn.</p>
              </div>
              <button disabled className="text-[10px] font-bold uppercase opacity-50 cursor-not-allowed" style={{ color: 'var(--text-primary)' }}>Coming soon</button>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              <strong>Technical note.</strong> Built on WebAuthn passkeys. Your private key is generated and stored on your device's secure enclave. The server only stores a public key for signature verification.
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

export default BiometricSetup;
