import React from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import privacyLock from '../assets/lotties/privacylock.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LottieComponent = (Lottie as any).default || Lottie;

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in max-w-5xl mx-auto py-12 px-4 md:px-8 space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="w-48 h-48 md:w-72 md:h-72 mx-auto lottie-themed">
          <LottieComponent animationData={privacyLock} loop={true} />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: 'var(--text-tertiary)' }}>Security Manifesto v2.0</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
            Privacy & Security<br/>Architecture
          </h1>
        </div>
        <p className="text-base md:text-lg leading-relaxed max-w-2xl mx-auto font-medium" style={{ color: 'var(--text-secondary)' }}>
          A technical deep-dive into how Null-Secret ensures absolute data sovereignty and mathematical privacy through a Zero-Knowledge ecosystem.
        </p>
      </div>

      {/* Table of Contents / Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Zero Persistence</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>No disks. No logs. Data exists only in volatile memory until it self-destructs.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Client-Side Only</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Encryption and decryption happen exclusively on your hardware. We never see your keys.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Mathematical Trust</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Security relies on AES-256-GCM primitives, not on our promises or policies.</p>
        </div>
      </div>

      {/* Deep Content Sections */}
      <div className="space-y-24">
        {/* Section 1 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 sticky top-24">
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>01. The Cryptographic Handshake</h2>
            <div className="h-1 w-12 mt-4" style={{ background: 'var(--text-primary)' }} />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>AES-256-GCM Implementation</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Null-Secret utilizes Advanced Encryption Standard (AES) with a 256-bit key length in Galois/Counter Mode (GCM). This provides both data confidentiality and authenticity. When a secret is created, your browser generates a random 256-bit symmetric key locally via the Web Crypto API. 
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The payload is then encrypted with a unique 96-bit Initialization Vector (IV). The resulting ciphertext and the authentication tag are the only pieces of information transmitted to our infrastructure. At no point during this transmission is the raw data exposed to the public internet or our internal nodes.
            </p>
            <div className="p-6 border-l-4" style={{ borderColor: 'var(--text-primary)', background: 'var(--bg-elevated)' }}>
              <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                // Security Primitive Check:<br/>
                algorithm: "AES-GCM",<br/>
                keyLength: 256,<br/>
                entropy: "High (CSPRNG)"
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 sticky top-24">
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>02. Zero-Knowledge Links</h2>
            <div className="h-1 w-12 mt-4" style={{ background: 'var(--text-primary)' }} />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>The URL Hash Fragment Logic</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              A critical component of our security architecture is the link structure. Each secret URL contains a unique identifier followed by a hash fragment (the part after the # symbol). 
            </p>
            <p className="text-sm leading-relaxed font-bold" style={{ color: 'var(--text-primary)' }}>
              The hash fragment contains the actual decryption key.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              By RFC 3986 standards, the hash fragment of a URL is never transmitted by the browser to the server during an HTTP request. This creates a mathematical "Zero-Knowledge" state: the server hosts the encrypted data but remains fundamentally incapable of reading it because it never receives the key contained in the link you share.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 sticky top-24">
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>03. Volatile RAM Storage</h2>
            <div className="h-1 w-12 mt-4" style={{ background: 'var(--text-primary)' }} />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Anti-Persistence Protocols</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Unlike traditional storage services that write data to persistent solid-state drives (SSDs) or hard drives, Null-Secret operates entirely in RAM (Random Access Memory). 
            </p>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <span className="font-bold text-xs mt-1" style={{ color: 'var(--text-primary)' }}>[MEMORY]</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Data is stored as a temporary object in the server's heap memory. It never touches a disk controller.</p>
              </li>
              <li className="flex gap-4">
                <span className="font-bold text-xs mt-1" style={{ color: 'var(--text-primary)' }}>[LIMITS]</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Every secret has a hard-coded TTL (Time To Live). Once the timer expires, the object is dereferenced and garbage-collected immediately.</p>
              </li>
              <li className="flex gap-4">
                <span className="font-bold text-xs mt-1" style={{ color: 'var(--text-primary)' }}>[CLEANUP]</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>In the event of a server reboot or power failure, all stored data is naturally wiped from the volatile memory, ensuring no residual data can be recovered through forensic analysis.</p>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 sticky top-24">
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>04. Identity & Metadata</h2>
            <div className="h-1 w-12 mt-4" style={{ background: 'var(--text-primary)' }} />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Privacy Beyond the Payload</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Encryption hides the content, but metadata can often reveal the context. Null-Secret employs several strategies to eliminate metadata leakage:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border" style={{ borderColor: 'var(--border-default)' }}>
                <h4 className="text-xs font-bold uppercase mb-2">No IP Logging</h4>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Our backend does not log user IP addresses in any persistent database or monitoring system.</p>
              </div>
              <div className="p-4 border" style={{ borderColor: 'var(--border-default)' }}>
                <h4 className="text-xs font-bold uppercase mb-2">No Tracking</h4>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>We use zero third-party tracking scripts, analytics engines, or marketing pixels. Your visit is truly anonymous.</p>
              </div>
              <div className="p-4 border" style={{ borderColor: 'var(--border-default)' }}>
                <h4 className="text-xs font-bold uppercase mb-2">Ephemeral Identity</h4>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>While we offer Firebase Auth for your Vault, your individual secrets remain decoupled from your identity unless you explicitly choose to link them.</p>
              </div>
              <div className="p-4 border" style={{ borderColor: 'var(--border-default)' }}>
                <h4 className="text-xs font-bold uppercase mb-2">Browser Sandbox</h4>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>All decryption operations are performed within the browser's sandbox environment, preventing unauthorized access to your system files.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 sticky top-24">
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>05. Compliance & Trust</h2>
            <div className="h-1 w-12 mt-4" style={{ background: 'var(--text-primary)' }} />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Data Sovereignty</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Null-Secret is built on the principle of "Privacy by Design." We do not sell data, we do not share data with law enforcement (as we have no readable data to share), and we do not participate in any advertising networks.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              In a world of constant surveillance, Null-Secret provides a sanctuary for sensitive communication. By using this platform, you are taking a stand for your right to digital privacy and encrypted free speech.
            </p>
          </div>
        </section>
      </div>

      {/* Footer Call to Action */}
      <div className="pt-16 text-center space-y-8" style={{ borderTop: `1px solid var(--border-default)` }}>
        <p className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
          "Encryption is the only tool we have to protect our digital identity from the entities that seek to exploit it."
        </p>
        <button
          onClick={() => navigate('/app')}
          className="btn btn-primary text-xs tracking-widest uppercase mx-auto"
          style={{ minWidth: '300px', padding: '20px 40px' }}
        >
          Secure Your First Message
        </button>
      </div>
    </div>
  );
};

export default PrivacyPolicy;