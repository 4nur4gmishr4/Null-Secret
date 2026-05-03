import React from 'react';
import { useNavigate } from 'react-router-dom';
import InViewLottie from '../components/InViewLottie';
import privacyfullData from '../assets/lotties/privacyfull.json';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in">
      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center min-h-[55vh] md:min-h-[65vh] text-center px-4 py-10 md:py-16">
        <div className="space-y-8 max-w-4xl lg:max-w-5xl mx-auto">
          {/* Tagline chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 glowing-border-chip">
            <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--text-primary)' }}>
              End-to-End Encrypted
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-[1.2]" style={{ color: 'var(--text-primary)' }}>
            Send anything private
            <br />
            <span style={{ color: 'var(--text-secondary)' }}>
              No traces left behind
            </span>
          </h1>

          <p className="text-sm md:text-base leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Send passwords, files, and private notes through a one-time link. The message gets locked on your device, the lock travels through us, and the key travels separately. Once the recipient reads it, the message disappears for good.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => navigate('/app')}
              className="btn btn-primary lift w-full sm:w-auto text-xs tracking-widest uppercase"
              style={{ minWidth: '220px', padding: '16px 32px' }}
            >
              Create Secret
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
      <section className="py-12 md:py-16" style={{ borderTop: `1px solid var(--border-default)` }}>
        <div className="text-center mb-8 md:mb-12">
          <span className="label">How It Works</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-0">
          {[
            {
              step: '01',
              title: 'Locked on your device',
              desc: 'Your browser scrambles the message before it leaves. The key is generated locally and stays in the link, not on our server. We could not read your message if we tried.',
            },
            {
              step: '02',
              title: 'Burns after reading',
              desc: 'Choose how many times the message can be opened. Once that limit is hit, it is wiped immediately. No recovery, no archive, no second chance.',
            },
            {
              step: '03',
              title: 'Nothing on disk',
              desc: 'Our server holds your locked message in memory only. No database, no backups, no logs. If the server restarts, every message disappears with it.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="feature-card"
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
      <section className="py-12 md:py-16" style={{ borderTop: `1px solid var(--border-default)` }}>
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
          <div className="lottie-themed w-full max-w-[450px] md:max-w-[600px] lg:max-w-[700px] aspect-square flex-shrink-0 mx-auto">
            <InViewLottie animationData={privacyfullData} loop={true} />
          </div>
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Privacy you can verify
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Most secure-message services ask you to trust them. Null-Secret asks you to trust math instead. The decryption key is tucked inside the part of the link after the # sign, which browsers are built to never send to any server. The result is simple: we cannot read your message even if we wanted to.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6 w-full">
              {['AES-256-GCM', 'PBKDF2 600K', 'Zero Logs', 'Auto Destruct'].map((tag) => (
                <div key={tag} className="flex items-center justify-center text-[10px] md:text-[12px] lg:text-[11px] font-bold tracking-widest uppercase text-center p-3 whitespace-normal break-words shadow-[4px_4px_0px_0px_var(--border-default)]" style={{ color: 'var(--text-primary)', border: `2px solid var(--border-default)`, background: 'var(--bg-elevated)', minHeight: '56px' }}>
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-12 md:py-16 text-center" style={{ borderTop: `1px solid var(--border-default)` }}>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Ready to send something private?
        </p>
        <button
          onClick={() => navigate('/app')}
          className="btn btn-primary lift text-xs tracking-widest uppercase mx-auto"
          style={{ minWidth: '240px', padding: '16px 32px' }}
        >
          Create Secret
        </button>
      </section>
    </div>
  );
};

export default Landing;
