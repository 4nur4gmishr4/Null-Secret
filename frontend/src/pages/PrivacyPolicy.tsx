import React from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import privacyLock from '../assets/lotties/privacylock.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LottieComponent = (Lottie as any).default || Lottie;

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in max-w-2xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto lottie-themed">
          <LottieComponent animationData={privacyLock} loop={true} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Privacy & Security
        </h1>
        <p className="text-sm leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
          We believe privacy is a fundamental human right. Here is exactly how we protect your data.
        </p>
      </div>

      {/* Security Mechanisms */}
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>1. Client-Side Encryption</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            When you type a message, it is locked (encrypted) directly on your device before it is ever sent over the internet. This means we never see your actual message, only scrambled code.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>2. The "Zero-Knowledge" Link</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The secret key needed to unlock your message is generated on your device and added to the very end of the web link (after the <code>#</code> symbol). By design, web browsers do not send anything after the <code>#</code> symbol to our servers. Because we don't have the key, we cannot unlock your data, even if we wanted to.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>3. True Self-Destruction</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            We do not use hard drives or traditional databases to store your messages. Everything is kept temporarily in our server's short-term memory (RAM). When a message reaches its view limit or expiration time, it is instantly and permanently deleted. Once deleted, recovery is mathematically impossible.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>4. Optional Passwords & Biometrics</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            You can add an extra password or require the recipient to use FaceID or TouchID before viewing the message. This ensures that even if the link is intercepted, the message cannot be read without the secondary lock.
          </p>
        </section>

        <section className="space-y-3 p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <h2 className="text-sm font-bold tracking-wide uppercase mb-2" style={{ color: 'var(--text-primary)' }}>Cookie Policy</h2>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong>No tracking cookies are used on this website.</strong> We do not track your IP address, your location, or your browsing habits. We only use your browser's local storage to remember your theme preference (Light or Dark mode) to give you a seamless viewing experience.
          </p>
        </section>
      </div>

      <div className="pt-8 text-center" style={{ borderTop: `1px solid var(--border-default)` }}>
        <button
          onClick={() => navigate('/app')}
          className="btn btn-primary text-xs tracking-widest uppercase mx-auto"
          style={{ minWidth: '240px', padding: '16px 32px' }}
        >
          Create Encrypted Message
        </button>
      </div>
    </div>
  );
};

export default PrivacyPolicy;