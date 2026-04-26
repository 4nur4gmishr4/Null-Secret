import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../contexts/ThemeContext';

const Success: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  const hash = location.hash.replace('#', '');
  const keyStr = hash;
  const adminKey = location.state?.adminKey;
  
  React.useEffect(() => {
    if (adminKey && id) {
      const keys = JSON.parse(localStorage.getItem('nullSecret_adminKeys') || '{}');
      keys[id] = adminKey;
      localStorage.setItem('nullSecret_adminKeys', JSON.stringify(keys));
    }
  }, [adminKey, id]);
  
  const [copied, setCopied] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const fullUrl = `${window.location.origin}/v/${id}#${keyStr}`;
  const adminUrl = adminKey ? `${window.location.origin}/admin/${id}` : '';

  const copyToClipboard = (text: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2500);
  };

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-6 slide-up">
      {/* Header */}
      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center" style={{ background: 'var(--surface-success)', border: `1px solid var(--text-success)` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-success)' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {copied || copiedAdmin ? 'Copied to Clipboard' : 'Your Secure Links Are Ready'}
          </h2>
        </div>
      </div>

      {/* Secret Link Display */}
      <div className="space-y-2">
        <label className="label">Secret Link (For Recipient)</label>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Share this link with the intended recipient. The encryption key is embedded in the URL fragment.
        </p>
        <div className="link-display" aria-live="assertive">
          {fullUrl}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => copyToClipboard(fullUrl, setCopied)}
            className={`btn w-full text-xs tracking-wider uppercase ${copied ? 'btn-secondary' : 'btn-primary'}`}
          >
            {copied ? 'Copied!' : 'Copy Secret Link'}
          </button>
          <button
            onClick={() => setShowQR(!showQR)}
            className="btn btn-secondary w-full text-xs tracking-wider uppercase"
          >
            {showQR ? 'Hide QR' : 'Show QR'}
          </button>
        </div>
      </div>

      {/* Admin Link Display */}
      {adminUrl && (
        <div className="space-y-2 pt-6">
          <label className="label">Admin Dashboard Link (For You)</label>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Keep this link secret! Use it to track view status and manually burn the message before it's read.
          </p>
          <div className="link-display" aria-live="assertive" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
            {adminUrl}
          </div>
          <div className="pt-2">
            <button
              onClick={() => copyToClipboard(adminUrl, setCopiedAdmin)}
              className={`btn w-full text-xs tracking-wider uppercase ${copiedAdmin ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ border: '1px solid var(--border-default)' }}
            >
              {copiedAdmin ? 'Copied!' : 'Copy Admin Link'}
            </button>
          </div>
        </div>
      )}

      {/* QR Code */}
      {showQR && (
        <div className="flex justify-center p-8 surface fade-in">
          <QRCodeSVG
            value={fullUrl}
            size={200}
            level="H"
            bgColor={theme === 'dark' ? '#1A1A1A' : '#FFFFFF'}
            fgColor={theme === 'dark' ? '#FAFAFA' : '#0A0A0A'}
          />
        </div>
      )}

      {/* Security Notes */}
      <div className="space-y-0 pt-6">
        {[
          'The encryption key never touches our server.',
          'The link works only for the specified number of views.',
          'Once fully viewed, the message is destroyed permanently.',
          'Do not lose the admin link.'
        ].map((note, i) => (
          <div key={i} className="info-row" style={{ borderTop: i === 0 ? undefined : 'none' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>{note}</span>
          </div>
        ))}
      </div>

      {/* Create Another */}
      <button
        onClick={() => navigate('/app')}
        className="btn btn-ghost w-full text-xs tracking-wider uppercase mt-4"
      >
        Create Another Message
      </button>
    </div>
  );
};

export default Success;