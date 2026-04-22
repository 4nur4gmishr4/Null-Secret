import React from 'react';
import { useNavigate } from 'react-router-dom';
import DecryptedText from '../components/DecryptedText';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-12 px-4 fade-in">
      <div className="space-y-6 max-w-xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">
          <DecryptedText text="Zero Knowledge" speed={45} maxIterations={8} />
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-500 to-gray-900 dark:from-gray-400 dark:to-gray-100">
            Infinite Privacy.
          </span>
        </h1>

        <p className="text-sm md:text-base leading-relaxed text-balance" style={{ color: 'var(--muted)' }}>
          A military-grade, end-to-end encrypted messaging system. Your secrets are encrypted in the browser, sharded across memory, and permanently destroyed after viewing. We never see your data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl text-left border-y py-12" style={{ borderColor: 'var(--border)' }}>
        <div className="space-y-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center border font-mono text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>01</div>
          <h3 className="text-sm font-bold tracking-wide">Client-Side Encryption</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>AES-GCM encryption happens before the payload ever leaves your device.</p>
        </div>
        <div className="space-y-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center border font-mono text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>02</div>
          <h3 className="text-sm font-bold tracking-wide">Burn After Reading</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>View limits enforce strict self-destruction. Once read, it's mathematically gone.</p>
        </div>
        <div className="space-y-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center border font-mono text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>03</div>
          <h3 className="text-sm font-bold tracking-wide">Zero Disk Logs</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>Our backend runs entirely in RAM. No databases, no backups, no traces.</p>
        </div>
      </div>

      <div className="pt-8 w-full max-w-md mx-auto">
        <button
          onClick={() => navigate('/app')}
          className="w-full bg-current text-white dark:text-black font-semibold py-5 hover:opacity-85 transition-all duration-300 text-sm tracking-widest uppercase relative overflow-hidden group"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            Secure a Message
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
};

export default Landing;
