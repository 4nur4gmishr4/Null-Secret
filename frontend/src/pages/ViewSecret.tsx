import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Lottie from 'lottie-react';
import { deriveKeyFromPassword, importKey, decrypt, unbundle } from '../utils/crypto';
import shieldAnimation from '../assets/lotties/shield-morph.json';

const LottieComponent = (Lottie as any).default || Lottie;

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';

const ViewSecret: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const keyStr = location.hash.replace('#', '');
  const [password, setPassword] = useState('');
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [bundledData, setBundledData] = useState<{ p: string, i: string, s?: string, b?: boolean } | null>(null);
  const [fileData, setFileData] = useState<{name: string, type: string, data: string} | null>(null);
  const [views, setViews] = useState<{current: number, limit: number} | null>(null);
  
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
      if (!resp.ok) throw new Error('Message not found or already deleted.');
      
      const data = await resp.json();
      setViews({ current: data.views, limit: data.viewLimit });
      const unbundled = unbundle(data.payload);
      setBundledData(unbundled);

      if (unbundled.b) {
        try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          await navigator.credentials.get({
            publicKey: {
              challenge,
              userVerification: 'required',
            }
          });
        } catch {
          throw new Error('Biometric authentication failed or cancelled.');
        }
      }

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
        const salt = new Uint8Array(atob(data.s).split('').map(c => c.charCodeAt(0)));
        key = await deriveKeyFromPassword(pass, salt);
      }
      const plaintext = await decrypt(data.p, data.i, key);
      try {
        const parsed = JSON.parse(plaintext);
        if (parsed && typeof parsed === 'object' && ('text' in parsed || 'file' in parsed)) {
          setDecrypted(parsed.text || '');
          if (parsed.file) {
            setFileData(parsed.file);
          }
        } else {
          setDecrypted(plaintext);
        }
      } catch {
        setDecrypted(plaintext);
      }
    } catch {
      setError('Decryption failed. Wrong password or invalid link.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !needsPassword) {
     return (
       <div className="flex flex-col items-center justify-center py-20 space-y-6" aria-live="polite">
         <div className="lottie-themed w-32 h-32">
           <LottieComponent animationData={shieldAnimation} loop={true} />
         </div>
         <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--muted)' }}>Decrypting message…</p>
       </div>
     );
  }

  if (error) {
    return (
      <div className="space-y-6" role="alert" aria-live="assertive">
        <label className="label">Something went wrong</label>
        <div className="p-4 border text-sm font-medium" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          {error}
        </div>
        <button 
          onClick={() => window.location.href = '/'}
          className="w-full border font-semibold py-4 hover:bg-current hover:text-white dark:hover:text-black transition-all duration-200 text-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          Start Over
        </button>
      </div>
    );
  }

  if (decrypted !== null) {
    return (
      <div className="space-y-6" aria-live="polite">
        <label className="label">Message decrypted</label>
        {decrypted && (
          <div className="p-4 border mono text-sm whitespace-pre-wrap min-h-[100px]" style={{ borderColor: 'var(--border)' }}>
            {decrypted}
          </div>
        )}
        
        {fileData && (
          <div className="p-4 border flex justify-between items-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <span className="text-xs font-medium truncate max-w-[200px]">{fileData.name}</span>
            <a 
              href={fileData.data} 
              download={fileData.name}
              className="text-xs font-semibold border px-4 py-2 hover:opacity-80 transition-opacity"
              style={{ borderColor: 'var(--border)' }}
            >
              Download File
            </a>
          </div>
        )}

        <div className="p-3 text-xs font-medium text-center" style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
          {views && views.current < views.limit 
            ? `View ${views.current} of ${views.limit} — this message will be destroyed after ${views.limit - views.current} more view(s).`
            : 'This message is now gone forever.'}
        </div>
        <button 
          onClick={() => window.location.href = '/'}
          className="w-full border font-semibold py-4 hover:bg-current hover:text-white dark:hover:text-black transition-all duration-200 text-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          Create New Message
        </button>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="space-y-6" aria-live="polite">
        <label htmlFor="decrypt-password" className="label block">A password is required</label>
        <input 
          id="decrypt-password"
          type="password"
          placeholder="Enter password to decrypt"
          className="w-full p-4 border focus:outline-none mono text-sm bg-transparent"
          style={{ borderColor: 'var(--border)' }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <button
          onClick={() => handleDecrypt()}
          className="w-full bg-current text-white dark:text-black font-semibold py-4 hover:opacity-85 transition-all duration-200 text-sm"
        >
          Unlock & View
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center py-12">
      <h2 className="text-xl font-bold tracking-tight">Message Received</h2>
      <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
        Clicking the button will reveal the message and trigger its deletion based on the sender's settings.
      </p>
      <button
        ref={decryptBtnRef}
        onClick={handleFetch}
        disabled={loading}
        className="w-full bg-current text-white dark:text-black font-semibold py-4 hover:opacity-85 transition-all duration-200 text-sm"
      >
        View & Delete
      </button>
    </div>
  );
};

export default ViewSecret;