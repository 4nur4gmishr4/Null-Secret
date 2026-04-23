import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { generateKey, deriveKeyFromPassword, exportKey, encrypt, bundle } from '../utils/crypto';
import shieldAnimation from '../assets/lotties/shield-morph.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LottieComponent = (Lottie as any).default || Lottie;

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';

const Home: React.FC = () => {
  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState('24');
  const [viewLimit, setViewLimit] = useState('1');
  const [file, setFile] = useState<File | null>(null);
  const [requireBiometric, setRequireBiometric] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const securityStrength = Math.min((text.length / 500) * 100, 100);

  const handleCreate = async () => {
    if (!text) return;
    setLoading(true);
    setError(null);
    try {
      let key = await generateKey();
      let saltStr: string | undefined;

      if (password) {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        saltStr = btoa(String.fromCharCode(...salt));
        key = await deriveKeyFromPassword(password, salt);
      }

      const keyStr = await exportKey(key);

      let plaintext = text;
      if (file) {
         if (file.size > 4 * 1024 * 1024) {
           setError('File size exceeds the 4 MB limit.');
           setLoading(false);
           return;
         }
         const reader = new FileReader();
         const fileBase64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
         });
         plaintext = JSON.stringify({
            text: text,
            file: { name: file.name, type: file.type, data: `data:${file.type || 'application/octet-stream'};base64,${fileBase64}` }
         });
      }

      const { payload, iv } = await encrypt(plaintext, key);
      const bundled = bundle(payload, iv, saltStr, requireBiometric);

      const resp = await fetch(`${API_BASE}/secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: bundled,
          expiry: parseInt(expiry),
          viewLimit: parseInt(viewLimit)
        })
      });

      if (!resp.ok) throw new Error('Could not reach the server. Please try again.');

      const data = await resp.json();
      if (data.id) {
        navigate(`/s/${data.id}#${keyStr}`);
      }
    } catch (err: unknown) {
      console.error(err);
      if (!window.isSecureContext || !window.crypto || !window.crypto.subtle) {
        setError('Cryptography API requires a secure context (HTTPS or localhost).');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 slide-up" aria-live="polite">
        <div className="lottie-themed w-28 h-28">
          <LottieComponent animationData={shieldAnimation} loop={true} />
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase animate-pulse" style={{ color: 'var(--text-tertiary)' }}>
          Encrypting…
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 slide-up">
      {/* Page Header */}
      <div className="space-y-2 mb-8">
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Create Secret
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Your message is encrypted in the browser before anything is sent. We never see your data.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto hover:opacity-70 transition-opacity"
            aria-label="Dismiss"
            style={{ border: 'none', background: 'none', color: 'var(--text-danger)', padding: '2px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor="message-input" className="label">Message</label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Strength</span>
            <div className="strength-bar">
              <div className="strength-bar-fill" style={{ width: `${securityStrength}%` }} />
            </div>
          </div>
        </div>
        <textarea
          id="message-input"
          className="w-full h-48 p-4 focus:outline-none resize-none mono text-sm"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          placeholder="Type your private message here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <label htmlFor="file-upload" className="label block">Attach file (max 4 MB)</label>
        <input
          id="file-upload"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full p-3 text-xs font-medium focus:outline-none cursor-pointer"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
        />
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="expiry-select" className="label block">Expiration</label>
          <select
            id="expiry-select"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full p-3 text-xs font-medium cursor-pointer focus:outline-none"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          >
            <option value="1">1 hour</option>
            <option value="24">24 hours</option>
            <option value="168">7 days</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="view-select" className="label block">View limit</label>
          <select
            id="view-select"
            value={viewLimit}
            onChange={(e) => setViewLimit(e.target.value)}
            className="w-full p-3 text-xs font-medium cursor-pointer focus:outline-none"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          >
            <option value="1">Delete after 1 view</option>
            <option value="2">Delete after 2 views</option>
            <option value="5">Delete after 5 views</option>
          </select>
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label htmlFor="password-input" className="label block">Extra password (optional)</label>
        <input
          id="password-input"
          type="password"
          placeholder="Add a password for additional security"
          className="w-full p-3 text-sm focus:outline-none"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {/* Biometric */}
      <div className="flex items-center gap-3 p-3" style={{ background: 'var(--bg-secondary)', border: `1px solid var(--border-default)` }}>
        <input
          id="biometric-check"
          type="checkbox"
          checked={requireBiometric}
          onChange={(e) => setRequireBiometric(e.target.checked)}
          className="w-4 h-4 flex-shrink-0"
          style={{ borderColor: 'var(--border-strong)', accentColor: 'var(--accent)' }}
        />
        <label htmlFor="biometric-check" className="text-xs font-medium cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
          Require device biometrics to decrypt (FaceID / TouchID / Windows Hello)
        </label>
      </div>

      {/* Submit */}
      <button
        onClick={handleCreate}
        disabled={loading || (!text && !file)}
        className="btn btn-primary w-full text-xs tracking-widest uppercase"
        style={{ padding: '16px 24px' }}
      >
        Generate Secure Link
      </button>
    </div>
  );
};

export default Home;