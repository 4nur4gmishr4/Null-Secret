import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import LottieView from '../components/LottieView';
import { deriveKeyFromPassword, importKey, decrypt, unbundle } from '../utils/crypto';
import { API_BASE } from '../utils/api';
import shieldMorphData from '../assets/lotties/shield-morph.json';
import redsecurityData from '../assets/lotties/redsecurity.json';
import privacylockData from '../assets/lotties/privacylock.json';

const ViewSecret: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const keyStr = location.hash.replace('#', '').split('|')[0];
  const [password, setPassword] = useState('');
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [bundledData, setBundledData] = useState<{ p: string, i: string, s?: string } | null>(null);
  const [fileData, setFileData] = useState<{ name: string, type: string, data: string } | null>(null);
  const [views, setViews] = useState<{ current: number, limit: number } | null>(null);

  const decryptBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (decryptBtnRef.current) {
      decryptBtnRef.current.focus();
    }
  }, []);

  const handleFetch = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/secret/${id}`);
      if (!resp.ok) throw new Error('We could not find this message. Either the link is wrong, or it has already been opened the maximum number of times.');

      const data = await resp.json();
      setViews({ current: data.views, limit: data.viewLimit });
      const unbundled = unbundle(data.payload);
      setBundledData(unbundled);

      if (unbundled.s) {
        setNeedsPassword(true);
      } else {
        await handleDecrypt(unbundled);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async (data = bundledData, pass = password) => {
    if (!data) return;
    setLoading(true);
    try {
      let key = await importKey(keyStr);
      if (data.s) {
        const binary = atob(data.s);
        const salt = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          salt[i] = binary.charCodeAt(i);
        }
        key = await deriveKeyFromPassword(pass, salt);
      }
      const plaintext = await decrypt(data.p, data.i, key);
      try {
        const parsed: unknown = JSON.parse(plaintext);
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          ('text' in parsed || 'file' in parsed)
        ) {
          const envelope = parsed as { text?: unknown; file?: { name: string; type: string; data: string } };
          setDecrypted(typeof envelope.text === 'string' ? envelope.text : '');
          if (envelope.file) {
            setFileData(envelope.file);
          }
        } else {
          setDecrypted(plaintext);
        }
      } catch {
        // Plaintext was not JSON (legacy/raw secret); display verbatim.
        setDecrypted(plaintext);
      }
    } catch (err: unknown) {
      console.error('decrypt failed', err);
      setError('We could not unlock this message. The password might be wrong, or the link might be incomplete.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading && !needsPassword) {
    return (
      <div className="max-w-4xl lg:max-w-5xl mx-auto flex flex-col items-center justify-center py-12 md:py-16 space-y-6 slide-up" aria-live="polite">
        <div className="lottie-themed w-56 h-56 md:w-72 md:h-72">
          <LottieView animationData={shieldMorphData} loop={true} />
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase animate-pulse" style={{ color: 'var(--text-tertiary)' }}>
          Unlocking your message…
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-6 slide-up" role="alert" aria-live="assertive">
        <div className="flex flex-col items-center text-center py-8 space-y-6">
          <div className="lottie-themed w-44 h-44 md:w-56 md:h-56">
            <LottieView animationData={redsecurityData} loop={true} />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              We could not open this message
            </h2>
            <div className="error-banner justify-center" style={{ maxWidth: '400px', margin: '0 auto' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          className="btn btn-secondary w-full text-xs tracking-wider uppercase"
        >
          Back to home
        </button>
      </div>
    );
  }

  // Decrypted view
  if (decrypted !== null) {
    return (
      <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-6 slide-up" aria-live="polite">
        <div className="space-y-2 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center" style={{ background: 'var(--surface-success)', border: `1px solid var(--text-success)` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-success)' }}>
                <rect x="3" y="11" width="18" height="11" rx="0" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Message unlocked
            </h2>
          </div>
        </div>

        {decrypted && (
          <div className="p-4 mono text-sm whitespace-pre-wrap min-h-[80px] surface">
            {decrypted}
          </div>
        )}

        {fileData && (
          <div className="surface flex justify-between items-center p-4">
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-xs font-medium truncate max-w-[200px]">{fileData.name}</span>
            </div>
            <a
              href={fileData.data}
              download={fileData.name}
              className="btn btn-secondary text-xs"
              style={{ padding: '6px 12px', textDecoration: 'none' }}
            >
              Download
            </a>
          </div>
        )}

        {/* View Counter */}
        <div className="info-row justify-center" style={{ textAlign: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>
            {views
              ? views.current < views.limit
                ? `Open ${views.current} of ${views.limit}. ${views.limit - views.current} more open(s) before this message is gone forever.`
                : 'This was the final view — the message has been deleted forever.'
              : 'This message has been deleted forever.'}
          </span>
        </div>

        <button
          onClick={() => navigate('/app')}
          className="btn btn-primary w-full text-xs tracking-widest uppercase"
        >
          Create your own secret
        </button>
      </div>
    );
  }

  // Password prompt
  if (needsPassword) {
    return (
      <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-6 slide-up" aria-live="polite">
        <div className="flex flex-col items-center text-center py-6 md:py-8 space-y-4">
          <div className="lottie-themed w-52 h-52 md:w-72 md:h-72">
            <LottieView animationData={privacylockData} loop={true} />
          </div>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Password needed
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            The sender added a password as an extra lock. Type it below to continue.
          </p>
        </div>
        <input
          id="decrypt-password"
          type="password"
          placeholder="Type the password the sender gave you"
          className="w-full p-4 focus:outline-none mono text-sm"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleDecrypt(bundledData, password)}
          autoFocus
        />
        <button
          onClick={() => handleDecrypt(bundledData, password)}
          className="btn btn-primary w-full text-xs tracking-widest uppercase"
        >
          Unlock
        </button>
      </div>
    );
  }

  // Initial gate
  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-6 text-center py-8 md:py-12 slide-up">
      <div className="lottie-themed w-52 h-52 md:w-72 md:h-72 mx-auto mb-4">
        <LottieView animationData={privacylockData} loop={true} />
      </div>
      <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        Someone sent you a private message
      </h2>
      <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-tertiary)' }}>
        Opening it counts as one view. After the agreed number of opens, the message is deleted for good. Make sure you are ready to read it before you continue.
      </p>
      <button
        ref={decryptBtnRef}
        onClick={handleFetch}
        disabled={loading}
        className="btn btn-primary mx-auto text-xs tracking-widest uppercase"
        style={{ minWidth: '200px', padding: '16px 32px' }}
      >
        Open the message
      </button>
    </div>
  );
};

export default ViewSecret;