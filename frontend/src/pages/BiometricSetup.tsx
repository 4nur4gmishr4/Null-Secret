import React from 'react';
import SecurityPageHeader from '../components/SecurityPageHeader';
import BackLink from '../components/BackLink';

const BiometricSetup: React.FC = () => {
  return (
    <div className="fade-in max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-8 space-y-10 md:space-y-12">
      <SecurityPageHeader
        eyebrow="Authentication Layer"
        title="Biometric Lock"
        description="Sign in with your fingerprint, face, or device PIN. No password to remember and nothing for an attacker to steal."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 border space-y-6" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="section-title" style={{ color: 'var(--text-primary)' }}>What you get</h3>
          <ul className="space-y-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <li>Sign in with Face ID, Touch ID, Windows Hello, or any device unlock method.</li>
            <li>Phishing resistant: your biometric stays on your device, only a signed proof is sent.</li>
            <li>Faster than typing a password every time.</li>
            <li>Works as a replacement or as a second factor.</li>
          </ul>
        </div>

        <div className="p-8 border space-y-6" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="section-title" style={{ color: 'var(--text-primary)' }}>Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border" style={{ borderColor: 'var(--border-default)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Not configured</p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Available on devices that support WebAuthn.</p>
              </div>
              <button disabled className="caps-button opacity-50 cursor-not-allowed" style={{ color: 'var(--text-primary)' }}>
                Coming soon
              </button>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              <strong>Technical note.</strong> Built on WebAuthn passkeys. Your private key is generated and stored on your device's secure enclave. The server only stores a public key for signature verification.
            </p>
          </div>
        </div>
      </div>

      <BackLink to="/security" label="Back to Security" />
    </div>
  );
};

export default BiometricSetup;
