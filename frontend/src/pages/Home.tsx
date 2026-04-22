import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { generateKey, deriveKeyFromPassword, exportKey, encrypt, bundle } from '../utils/crypto';
import shieldAnimation from '../assets/lotties/shield-morph.json';

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
  const navigate = useNavigate();

  const securityStrength = Math.min((text.length / 500) * 100, 100);

  const handleCreate = async () => {
    if (!text) return;
    setLoading(true);
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

      if (!resp.ok) throw new Error('Could not reach the server.');

      const data = await resp.json();
      if (data.id) {
        navigate(`/s/${data.id}#${keyStr}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to secure your message.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6" aria-live="polite">
        <div className="lottie-themed w-32 h-32">
          <LottieComponent animationData={shieldAnimation} loop={true} />
        </div>
        <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--muted)' }}>Securing your message…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <label htmlFor="message-input" className="label">Message</label>
        <div className="flex items-center space-x-2" aria-hidden="true">
           <span className="label">Strength</span>
           <div className="w-20 h-1 border" style={{ borderColor: 'var(--border)' }}>
              <div className="h-full bg-current transition-all duration-200" style={{ width: `${securityStrength}%` }}></div>
           </div>
        </div>
      </div>
      <textarea
        id="message-input"
        className="w-full h-56 p-4 focus:outline-none resize-none mono text-sm bg-transparent"
        style={{ borderColor: 'var(--border)' }}
        placeholder="Type your private message here…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <label htmlFor="file-upload" className="label block">Attach file (max 4 MB)</label>
          <input 
            id="file-upload"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full p-3 text-xs font-medium focus:outline-none cursor-pointer"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="expiry-select" className="label block">Expiration</label>
          <select 
            id="expiry-select"
            value={expiry} 
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full p-3 text-xs font-medium cursor-pointer focus:outline-none"
            style={{ borderColor: 'var(--border)' }}
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
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="1">Delete after 1 view</option>
            <option value="2">Delete after 2 views</option>
            <option value="5">Delete after 5 views</option>
          </select>
        </div>
        <div className="space-y-2 col-span-2">
          <label htmlFor="password-input" className="label block">Extra password (optional)</label>
          <input 
            id="password-input"
            type="password"
            placeholder="Add a password for extra safety"
            className="w-full p-3 text-sm focus:outline-none"
            style={{ borderColor: 'var(--border)' }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2 col-span-2 flex items-center">
          <input 
            id="biometric-check"
            type="checkbox"
            checked={requireBiometric}
            onChange={(e) => setRequireBiometric(e.target.checked)}
            className="w-4 h-4 mr-2"
            style={{ borderColor: 'var(--border)' }}
          />
          <label htmlFor="biometric-check" className="text-xs font-medium cursor-pointer" style={{ color: 'var(--muted)' }}>
            Require device biometrics to decrypt (FaceID / TouchID / Windows Hello)
          </label>
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={loading || (!text && !file)}
        className="w-full bg-current text-white dark:text-black font-semibold py-4 hover:opacity-85 disabled:opacity-30 transition-all duration-200 text-sm tracking-wide"
      >
        Generate Secure Link
      </button>
    </div>
  );
};

export default Home;