import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LottieView from '../components/LottieView';
import { generateKey, deriveKeyFromPassword, exportKey, encrypt, bundle } from '../utils/crypto';
import shieldAnimation from '../assets/lotties/shield-morph.json';
import { auth, db } from '../utils/firebase';
import {
  doc,
  runTransaction,
  serverTimestamp,
  collection,
  addDoc
} from 'firebase/firestore';
import { zipSync } from 'fflate';
import { DAILY_SECRET_LIMIT } from '../utils/constants';
import { estimatePasswordStrength, type StrengthLabel } from '../utils/passwordStrength';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';

const STRENGTH_LABELS: Record<StrengthLabel, string> = {
  empty: '',
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
  excellent: 'Excellent',
};

const STRENGTH_COLORS: Record<StrengthLabel, string> = {
  empty: 'var(--text-tertiary)',
  weak: 'var(--text-danger)',
  fair: 'var(--text-danger)',
  good: 'var(--text-tertiary)',
  strong: 'var(--text-success)',
  excellent: 'var(--text-success)',
};

const Home: React.FC = () => {
  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState('24');
  const [viewLimit, setViewLimit] = useState('1');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  const messageFill = Math.min((text.length / 500) * 100, 100);
  const passwordStrength = estimatePasswordStrength(password);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only flip back when leaving the wrapper, not its children.
    if (e.currentTarget === e.target) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleCreate = async () => {
    if (!text && files.length === 0) {
      setError('Type a message or attach a file before continuing.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      const today = new Date().toISOString().split('T')[0];

      // CRITICAL: Double-check limit before encryption
      // This prevents bypass if the button is manually re-enabled via console
      try {
        if (user) {
          // Firebase Transaction for Authenticated Users
          const usageRef = doc(db, 'usage', user.uid, 'daily', today);
          
          await runTransaction(db, async (transaction) => {
            const usageSnap = await transaction.get(usageRef);
            let count = 0;
            if (usageSnap.exists()) {
              count = usageSnap.data().count;
            }

            if (count >= DAILY_SECRET_LIMIT) {
              throw new Error('LIMIT_EXCEEDED');
            }

            if (!usageSnap.exists()) {
              transaction.set(usageRef, { count: 1 });
            } else {
              transaction.update(usageRef, { count: count + 1 });
            }
          });
        } else {
          // Local Storage Fallback for Guests
          const usageData = localStorage.getItem('ns_usage');
          let count = 0;
          if (usageData) {
            const { date, currentCount } = JSON.parse(usageData);
            if (date === today) count = currentCount;
          }

          if (count >= DAILY_SECRET_LIMIT) {
            throw new Error('LIMIT_EXCEEDED');
          }
          
          localStorage.setItem('ns_usage', JSON.stringify({ date: today, currentCount: count + 1 }));
        }
      } catch (usageErr: unknown) {
        if (usageErr instanceof Error && usageErr.message === 'LIMIT_EXCEEDED') throw usageErr;
        // Handle Firestore API disabled or network error
        console.error('Usage tracking failed', usageErr);
        const code = (usageErr as { code?: string } | null)?.code;
        if (code === 'permission-denied') {
          throw new Error('INFRASTRUCTURE_ERROR');
        }
        // If not a limit error, we might want to block anyway for security
        throw new Error('SECURITY_CHECK_FAILED');
      }

      // Proceed with Encryption
      let key = await generateKey();
      let saltStr: string | undefined;

      if (password) {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        // Avoid String.fromCharCode(...salt) spread; chunked pattern is stack-safe
        // for arbitrary lengths and produces identical base64.
        let saltBinary = '';
        for (let i = 0; i < salt.length; i++) {
          saltBinary += String.fromCharCode(salt[i]);
        }
        saltStr = btoa(saltBinary);
        key = await deriveKeyFromPassword(password, salt);
      }

      const keyStr = await exportKey(key);

      let plaintext = text;
      if (files.length > 0) {
        let totalSize = 0;
        const zipObj: Record<string, Uint8Array> = {};
        for (const f of files) {
          totalSize += f.size;
          if (totalSize > 6 * 1024 * 1024) throw new Error('Your files together must be smaller than 6 MB.');
          const buffer = await f.arrayBuffer();
          zipObj[f.name] = new Uint8Array(buffer);
        }

        let fileData;
        if (files.length === 1) {
          const reader = new FileReader();
          const fileBase64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(files[0]);
          });
          fileData = { name: files[0].name, type: files[0].type, data: `data:${files[0].type || 'application/octet-stream'};base64,${fileBase64}` };
        } else {
          const zipped = zipSync(zipObj);
          const blob = new Blob([zipped as any], { type: 'application/zip' });
          const reader = new FileReader();
          const zipBase64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          fileData = { name: 'secure_attachments.zip', type: 'application/zip', data: `data:application/zip;base64,${zipBase64}` };
        }

        plaintext = JSON.stringify({
          text: text,
          file: fileData
        });
      }

      const { payload, iv } = await encrypt(plaintext, key);
      const bundled = bundle(payload, iv, saltStr);

      const resp = await fetch(`${API_BASE}/secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: bundled,
          expiry: parseInt(expiry),
          viewLimit: parseInt(viewLimit)
        })
      });

      if (!resp.ok) throw new Error('We could not reach the server. Please try again in a moment.');

      const data = await resp.json();
      if (data.id) {
        // Log to History if authenticated
        if (user) {
          try {
            await addDoc(collection(db, 'users', user.uid, 'history'), {
              id: data.id,
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.error('History log failed', e);
          }
        }
        navigate(`/s/${data.id}#${keyStr}`, { state: { adminKey: data.adminKey } });
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : '';
      if (message === 'LIMIT_EXCEEDED') {
        setError(`You have reached the daily limit of ${DAILY_SECRET_LIMIT} secrets. The counter resets at midnight UTC.`);
      } else if (message === 'INFRASTRUCTURE_ERROR') {
        setError('We could not reach the account service. If you self-host this app, make sure Firestore is enabled in your Firebase console.');
      } else if (message === 'SECURITY_CHECK_FAILED') {
        setError('We could not verify your usage. Please refresh the page and try again.');
      } else if (!window.isSecureContext || !window.crypto || !window.crypto.subtle) {
        setError('Encryption needs a secure connection. Open the site over HTTPS or localhost.');
      } else {
        setError(message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 md:py-16 space-y-6 slide-up" aria-live="polite">
        <div className="lottie-themed w-56 h-56 md:w-72 md:h-72">
          <LottieView animationData={shieldAnimation} loop={true} />
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase animate-pulse" style={{ color: 'var(--text-tertiary)' }}>
          Locking your message…
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-6 slide-up">
      {/* Page Header */}
      <div className="space-y-2 mb-8">
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Create a secret
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Your message is locked inside this browser before anything reaches our servers. We never see what you typed.
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
            className="ml-auto hover:opacity-70 transition-opacity flex items-center justify-center"
            aria-label="Dismiss"
            style={{ border: 'none', background: 'none', color: 'var(--text-danger)', padding: '12px', minWidth: '44px', minHeight: '44px' }}
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
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Length</span>
            <div className="strength-bar">
              <div className="strength-bar-fill" style={{ width: `${messageFill}%` }} />
            </div>
          </div>
        </div>
        <textarea
          id="message-input"
          className="w-full h-48 p-4 focus:outline-none resize-none mono text-sm"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          placeholder="Type whatever you want to keep private…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      {/* File Upload (with drag-and-drop) */}
      <div className="space-y-2">
        <label htmlFor="file-upload" className="label block">Attach files (up to 6 MB combined)</label>
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="relative p-3 transition-colors"
          style={{
            background: isDragging ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
            border: `1px ${isDragging ? 'dashed' : 'solid'} ${isDragging ? 'var(--accent)' : 'var(--border-default)'}`,
          }}
        >
          <input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full text-xs font-medium focus:outline-none cursor-pointer"
            style={{ background: 'transparent', border: 'none' }}
          />
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
            {isDragging ? 'Release to attach the files.' : 'Or drag files anywhere onto this box.'}
          </p>
        </div>
        {files.length > 0 && (
          <ul className="space-y-1 pt-1">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                <span className="flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{(f.size / 1024).toFixed(1)} KB</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-[10px] font-bold uppercase underline flex-shrink-0"
                  style={{ color: 'var(--text-danger)' }}
                  aria-label={`Remove ${f.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="expiry-select" className="label block">Auto-delete after</label>
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
          <label htmlFor="view-select" className="label block">Allow how many opens</label>
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
        <div className="flex justify-between items-center">
          <label htmlFor="password-input" className="label">Add a password (optional)</label>
          {passwordStrength.label !== 'empty' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: STRENGTH_COLORS[passwordStrength.label] }}>
                {STRENGTH_LABELS[passwordStrength.label]}
              </span>
              <div className="strength-bar" aria-hidden="true">
                <div
                  className="strength-bar-fill"
                  style={{
                    width: `${passwordStrength.score}%`,
                    background: STRENGTH_COLORS[passwordStrength.label],
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <input
          id="password-input"
          type="password"
          placeholder="A second lock the recipient must type before opening"
          className="w-full p-3 text-sm focus:outline-none"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {passwordStrength.hints.length > 0 && (
          <ul className="text-[10px] space-y-0.5 pt-1" style={{ color: 'var(--text-tertiary)' }}>
            {passwordStrength.hints.map((hint) => (
              <li key={hint}>• {hint}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleCreate}
        disabled={loading || (text === '' && files.length === 0)}
        className="btn btn-primary w-full text-xs tracking-widest uppercase"
        style={{ padding: '16px 24px' }}
      >
        Create Secret
      </button>
    </div>
  );
};

export default Home;