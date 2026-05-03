import React from 'react';
import { useNavigate } from 'react-router-dom';
import LottieView from '../components/LottieView';
import privacylockData from '../assets/lotties/privacylock.json';

interface SectionEntry {
  readonly id: string;
  readonly number: string;
  readonly title: string;
}

const SECTIONS: readonly SectionEntry[] = [
  { id: 'lock', number: '01', title: 'How your message gets locked' },
  { id: 'link', number: '02', title: 'The link carries the key, not us' },
  { id: 'memory', number: '03', title: 'We never write to disk' },
  { id: 'collect', number: '04', title: 'What we deliberately don\u2019t collect' },
  { id: 'promise', number: '05', title: 'The promise' },
];

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-8 space-y-12 md:space-y-16">
      {/* Hero */}
      <header className="text-center space-y-5 md:space-y-6">
        <div className="w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 mx-auto lottie-themed">
          <LottieView animationData={privacylockData} loop={true} />
        </div>
        <p className="text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: 'var(--text-tertiary)' }}>Privacy Manifesto</p>
        <h1 className="text-[36px] leading-[1.05] sm:text-5xl md:text-6xl font-bold tracking-tighter px-2" style={{ color: 'var(--text-primary)' }}>
          Your data, only yours.
        </h1>
        <p className="text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto font-medium px-2" style={{ color: 'var(--text-secondary)' }}>
          A plain-language tour of how Null-Secret keeps your messages private. Every section starts with what it means for you, then ends with a short technical note for the curious.
        </p>
      </header>

      {/* Quick summary cards */}
      <section aria-label="Privacy at a glance" className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 p-6 md:p-8 border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Nothing on disk</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Your message lives in memory only. We never write it to a hard drive, log it, or back it up.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Locked on your device</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Your message gets locked inside your browser before it leaves. We never see the unlocked version, and we never have the key.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Math, not promises</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>You do not have to trust us. The encryption is the same standard that banks and governments use, and it is verifiable.</p>
        </div>
      </section>

      {/* Table of Contents */}
      <nav aria-label="On this page" className="border p-5 md:p-6" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }}>
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-4" style={{ color: 'var(--text-tertiary)' }}>On this page</p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="group flex items-baseline gap-3 text-sm font-semibold py-1.5 border-b transition-colors"
                style={{ color: 'var(--text-primary)', borderColor: 'var(--border-default)' }}
              >
                <span className="mono text-[11px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{s.number}</span>
                <span className="group-hover:underline underline-offset-4 leading-snug">{s.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Deep Content Sections */}
      <div className="space-y-16 md:space-y-24">
        <section id="lock" className="section-anchor grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>01. How your message gets locked</h2>
            <div className="h-1 w-12 mt-4" style={{ background: 'var(--text-primary)' }} />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>The work happens inside your browser</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              When you click <strong>Generate Secure Link</strong>, your browser does three things before anything is sent to our servers. It creates a random key. It uses that key to scramble your message into something that looks like noise. It then sends only the noise to us, while the key stays on your machine.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Because the key never travels to us, we cannot read your message even if we wanted to, even if a court asked us to, and even if someone broke into our servers. The locked version is all that ever exists outside your device.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              When you add an optional password, your browser stretches it through hundreds of thousands of rounds of math before turning it into a key. This makes guessing attacks slow and expensive even for a determined attacker.
            </p>
            <div className="p-5 md:p-6 border-l-4" style={{ borderColor: 'var(--text-primary)', background: 'var(--bg-elevated)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>Technical note</p>
              <p className="text-xs font-mono leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                algorithm: AES-256-GCM<br/>
                key length: 256 bits<br/>
                IV: 96-bit, fresh per message<br/>
                key derivation: PBKDF2-HMAC-SHA256, 600000 iterations<br/>
                randomness: window.crypto.getRandomValues (CSPRNG)<br/>
                authentication: built-in GCM tag<br/>
                key storage: never sent to server
              </p>
            </div>
          </div>
        </section>

        <section id="link" className="section-anchor grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>02. The link carries the key, not us</h2>
            <div className="h-1 w-12 mt-4" style={{ background: 'var(--text-primary)' }} />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Look at the link, after the # sign</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              A Null-Secret link looks something like <span className="mono text-xs">/v/abc123#KEYHERE</span>. The bit after the <span className="mono text-xs">#</span> sign is the decryption key.
            </p>
            <p className="text-sm leading-relaxed font-bold" style={{ color: 'var(--text-primary)' }}>
              Web browsers are designed to never send anything after the # to the server.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              That tiny detail is the heart of our privacy story. The server only ever sees the part before the #, which tells us which locked message to hand back. The recipient&rsquo;s browser then takes the part after the #, decrypts the message locally, and shows it to them.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The result: the link you share is the only place where the lock and the key live together at the same time. Once you close that browser tab, neither of us can recover the message.
            </p>
            <div className="p-5 md:p-6 border-l-4" style={{ borderColor: 'var(--text-primary)', background: 'var(--bg-elevated)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>Technical note</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                The fragment behaviour is defined in RFC 3986 Section 3.5. Browsers strip the fragment from the request line of every HTTP request, so it never appears in our logs, our reverse proxy logs, or any third-party CDN that sits between you and us.
              </p>
            </div>
          </div>
        </section>

        <section id="memory" className="section-anchor grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>03. We never write to disk</h2>
            <div className="h-1 w-12 mt-4" style={{ background: 'var(--text-primary)' }} />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Your message lives in memory, briefly</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Most websites save your data to a hard drive so they can show it to you again next week. Null-Secret deliberately does the opposite. We hold your encrypted message in the server&rsquo;s working memory, the same kind of memory that gets wiped when the power blinks.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              That means there is nothing to back up, nothing to restore, and nothing to subpoena. When the message reaches its view limit or expiration time, we delete it. When the server restarts, every message disappears with it. There is no recovery path because there is nothing to recover.
            </p>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <span className="font-bold text-xs mt-1" style={{ color: 'var(--text-primary)' }}>[1]</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Your encrypted message lives only in our server&rsquo;s working memory. It never touches a hard drive.</p>
              </li>
              <li className="flex gap-4">
                <span className="font-bold text-xs mt-1" style={{ color: 'var(--text-primary)' }}>[2]</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Every message has a built-in expiration. Once it expires, or once it has been viewed the agreed number of times, we wipe it on the spot.</p>
              </li>
              <li className="flex gap-4">
                <span className="font-bold text-xs mt-1" style={{ color: 'var(--text-primary)' }}>[3]</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>If the server reboots for any reason, every message dies with it. There is no disaster-recovery archive to chase.</p>
              </li>
            </ul>
            <div className="p-5 md:p-6 border-l-4" style={{ borderColor: 'var(--text-primary)', background: 'var(--bg-elevated)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>Technical note</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Storage is split across 256 in-process shards with their own locks for concurrent access. A background sweeper deletes expired entries on a fixed cadence. There is no Redis, no SQL, no S3, no remote logging system. The Go process is the entire storage layer.
              </p>
            </div>
          </div>
        </section>

        <section id="collect" className="section-anchor grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>04. What we deliberately don&rsquo;t collect</h2>
            <div className="h-1 w-12 mt-4" style={{ background: 'var(--text-primary)' }} />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Encrypting the message is not enough</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Even when nobody can read your message, the data <em>around</em> it can give a lot away. Who you are. Where you are. What time you sent it. How often you use the service. We refuse to collect any of that. Here is what we leave on the table on purpose.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border" style={{ borderColor: 'var(--border-default)' }}>
                <h4 className="text-xs font-bold uppercase mb-2">No IP addresses</h4>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>We use IP only briefly, in memory, to enforce rate limits. We never write it to a database or a log file.</p>
              </div>
              <div className="p-4 border" style={{ borderColor: 'var(--border-default)' }}>
                <h4 className="text-xs font-bold uppercase mb-2">No trackers</h4>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>No Google Analytics, no Facebook Pixel, no marketing scripts. There is nobody watching over your shoulder while you use this site.</p>
              </div>
              <div className="p-4 border" style={{ borderColor: 'var(--border-default)' }}>
                <h4 className="text-xs font-bold uppercase mb-2">No link to identity</h4>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>You can use Null-Secret without an account. If you do sign in, the secrets you create are not tagged with your name on the server side.</p>
              </div>
              <div className="p-4 border" style={{ borderColor: 'var(--border-default)' }}>
                <h4 className="text-xs font-bold uppercase mb-2">No file leaks</h4>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Decryption happens inside your browser&rsquo;s sandbox. Files never escape that sandbox unless you explicitly download them.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="promise" className="section-anchor grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>05. The promise</h2>
            <div className="h-1 w-12 mt-4" style={{ background: 'var(--text-primary)' }} />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>What this all adds up to</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              We do not sell your data. We have nothing useful to sell.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              We do not hand data over to advertisers. There is nothing to hand over.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              If a law enforcement request reached us, we would cooperate with what we have, which is zero readable content. The math is the privacy guarantee, not our policy or our promises.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Use Null-Secret for the things you would not say in front of a stranger: a password reset code for a relative, a one-time API key for a teammate, a draft of something private that you do not want sitting in someone else&rsquo;s inbox forever.
            </p>
            <div className="p-5 md:p-6 border-l-4" style={{ borderColor: 'var(--text-primary)', background: 'var(--bg-elevated)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>Frequently asked</p>
              <div className="space-y-4 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <div>
                  <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Can I recover a secret I lost?</p>
                  <p>No. If the link is gone, the message is gone. There is no reset, no recovery email, no support team that can dig it up.</p>
                </div>
                <div>
                  <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>What if I send the link by email and someone intercepts it?</p>
                  <p>The link is only useful while the message is still alive. Set the view limit to one. The first person who opens it will burn it for everyone else, including the attacker.</p>
                </div>
                <div>
                  <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Can the recipient screenshot the message?</p>
                  <p>Yes. Encryption protects the message in transit and at rest. Once the recipient sees it, what they do with it is up to them.</p>
                </div>
                <div>
                  <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Why ask for an optional password?</p>
                  <p>It is a second lock. Even if someone steals the link, they still need the password to read the message. Useful when you cannot fully trust the channel you are sharing the link through.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* CTA */}
      <div className="pt-12 md:pt-16 text-center space-y-6 md:space-y-8" style={{ borderTop: '1px solid var(--border-default)' }}>
        <p className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
          Privacy is a habit, not a feature. We hope this tool makes the habit easier.
        </p>
        <button
          onClick={() => navigate('/app')}
          className="btn btn-primary lift text-xs tracking-widest uppercase mx-auto"
          style={{ minWidth: '260px', padding: '18px 32px' }}
        >
          Send Your First Secret
        </button>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
