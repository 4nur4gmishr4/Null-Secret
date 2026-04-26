import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LottieComponent = (Lottie as any).default || Lottie;

import { zipSync } from 'fflate';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';

const Home: React.FC = () => {
  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState('24');
  const [viewLimit, setViewLimit] = useState('1');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const securityStrength = Math.min((text.length / 500) * 100, 100);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleCreate = async () => {
    if (!text && files.length === 0) {
      setError('Please enter a message or attach a file.');
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

            if (count >= 30) {
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

          if (count >= 30) {
            throw new Error('LIMIT_EXCEEDED');
          }
          
          localStorage.setItem('ns_usage', JSON.stringify({ date: today, currentCount: count + 1 }));
        }
      } catch (usageErr: any) {
        if (usageErr.message === 'LIMIT_EXCEEDED') throw usageErr;
        // Handle Firestore API disabled or network error
        console.error('Usage tracking failed', usageErr);
        if (usageErr.code === 'permission-denied') {
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
        saltStr = btoa(String.fromCharCode(...salt));
        key = await deriveKeyFromPassword(password, salt);
      }

      const keyStr = await exportKey(key);

      let plaintext = text;
      if (files.length > 0) {
        let totalSize = 0;
        const zipObj: Record<string, Uint8Array> = {};
        for (const f of files) {
          totalSize += f.size;
          if (totalSize > 6 * 1024 * 1024) throw new Error('Total files must be smaller than 6MB');
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

      if (!resp.ok) throw new Error('Could not reach the server. Please try again.');

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
    } catch (err: any) {
      console.error(err);
      if (err.message === 'LIMIT_EXCEEDED') {
        setError('Daily security quota reached (30/30). System lockdown active until 00:00 UTC reset.');
      } else if (err.message === 'INFRASTRUCTURE_ERROR') {
        setError('Infrastructure Error: The security governance API is currently unreachable. Please ensure Firestore is enabled in your Firebase console.');
      } else if (err.message === 'SECURITY_CHECK_FAILED') {
        setError('Security Check Failed: We could not verify your usage quota. Action blocked for system integrity.');
      } else if (!window.isSecureContext || !window.crypto || !window.crypto.subtle) {
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
        <div className="lottie-themed w-48 h-48 md:w-64 md:h-64">
          <LottieComponent animationData={shieldAnimation} loop={true} />
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase animate-pulse" style={{ color: 'var(--text-tertiary)' }}>
          Encrypting…
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-6 slide-up">
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
        <label htmlFor="file-upload" className="label block">Attach files (max 6 MB total)</label>
        <div className="relative">
          <input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full p-3 text-xs font-medium focus:outline-none cursor-pointer"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          />
          {files.length > 0 && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
              {files.length} file(s)
            </span>
          )}
        </div>
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

      {/* Submit */}
      <button
        onClick={handleCreate}
        disabled={loading || (text === '' && files.length === 0)}
        className="btn btn-primary w-full text-xs tracking-widest uppercase"
        style={{ padding: '16px 24px' }}
      >
        Generate Secure Link
      </button>
    </div>
  );
};

export default Home;