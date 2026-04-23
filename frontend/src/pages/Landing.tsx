import React from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import privacyFull from '../assets/lotties/privacyfull.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LottieComponent = (Lottie as any).default || Lottie;

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in">
      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center min-h-[65vh] text-center px-4 py-16">
        <div className="space-y-8 max-w-2xl mx-auto">
          {/* Tagline chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 glowing-border-chip">
            <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--text-primary)' }}>
              End-to-End Encrypted
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-[1.2]" style={{ color: 'var(--text-primary)' }}>
            Securely share sensitive data.
            <br />
            <span style={{ color: 'var(--text-secondary)' }}>
              Complete privacy guaranteed.
            </span>
          </h1>

          <p className="text-sm md:text-base leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Protect your passwords, files, and private messages with end-to-end encryption. Your data is encrypted on your device and self-destructs after being read, ensuring it can never be recovered.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => navigate('/app')}
              className="btn btn-primary w-full sm:w-auto text-xs tracking-widest uppercase"
              style={{ minWidth: '220px', padding: '16px 32px' }}
            >
              Secure a Message
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            <a
              href="https://github.com/4nur4gmishr4/Null-Secret"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary w-full sm:w-auto text-xs tracking-widest uppercase"
              style={{ minWidth: '180px', padding: '16px 32px', textDecoration: 'none' }}
            >
              View Source
            </a>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-16" style={{ borderTop: `1px solid var(--border-default)` }}>
        <div className="text-center mb-12">
          <span className="label">How It Works</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-0">
          {[
            {
              step: '01',
              title: 'Client-Side Encryption',
              desc: 'AES-256-GCM encryption happens entirely in your browser before any data leaves your device. The key stays in the URL fragment — never sent to the server.',
            },
            {
              step: '02',
              title: 'Burn After Reading',
              desc: 'Set a view limit of 1 to 5. Once the threshold is reached, the message is atomically deleted from memory. No recovery possible.',
            },
            {
              step: '03',
              title: 'Zero Disk Storage',
              desc: 'Our backend runs entirely in RAM with 256 sharded partitions. No databases, no backups, no logs. When the server restarts, everything is gone.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="feature-card"
              style={{
                borderRight: i < 2 ? undefined : undefined,
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="mono text-[11px] font-medium px-2 py-1" style={{ color: 'var(--text-tertiary)', border: `1px solid var(--border-default)` }}>
                  {item.step}
                </span>
                <h3 className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust Section ── */}
      <section className="py-16" style={{ borderTop: `1px solid var(--border-default)` }}>
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <div className="lottie-themed w-full max-w-[280px] md:max-w-md lg:max-w-lg aspect-square flex-shrink-0 mx-auto">
            <LottieComponent animationData={privacyFull} loop={true} />
          </div>
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Cryptographically Enforced Privacy
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Unlike traditional secret-sharing services, Null-Secret uses a zero-knowledge architecture. The encryption key never reaches our infrastructure — it travels only in the URL fragment, which browsers strip from network requests by design.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
              {['AES-256-GCM', 'PBKDF2 100K', 'Zero Logs', 'Auto Destruct'].map((tag) => (
                <span key={tag} className="text-[10px] font-semibold tracking-wider uppercase text-center py-2 px-3" style={{ color: 'var(--text-tertiary)', border: `1px solid var(--border-default)` }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 text-center" style={{ borderTop: `1px solid var(--border-default)` }}>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Ready to send something that can never be traced?
        </p>
        <button
          onClick={() => navigate('/app')}
          className="btn btn-primary text-xs tracking-widest uppercase mx-auto"
          style={{ minWidth: '240px', padding: '16px 32px' }}
        >
          Create Encrypted Message
        </button>
      </section>
    </div>
  );
};

export default Landing;
