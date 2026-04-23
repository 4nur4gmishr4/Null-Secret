import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../contexts/ThemeContext';

const Success: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const keyStr = location.hash.replace('#', '');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const fullUrl = `${window.location.origin}/v/${id}#${keyStr}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 slide-up">
      {/* Header */}
      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center" style={{ background: 'var(--surface-success)', border: `1px solid var(--text-success)` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-success)' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {copied ? 'Copied to Clipboard' : 'Your Secure Link Is Ready'}
          </h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Share this link with the intended recipient. The encryption key is embedded in the URL fragment.
        </p>
      </div>

      {/* Link Display */}
      <div className="link-display" aria-live="assertive">
        {fullUrl}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={copyToClipboard}
          className={`btn w-full text-xs tracking-wider uppercase ${copied ? 'btn-secondary' : 'btn-primary'}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {copied ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <rect x="9" y="9" width="13" height="13" rx="0" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </>
            )}
          </svg>
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="btn btn-secondary w-full text-xs tracking-wider uppercase"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="3" height="3" />
            <rect x="19" y="14" width="2" height="2" />
            <rect x="14" y="19" width="2" height="2" />
            <rect x="19" y="19" width="2" height="2" />
          </svg>
          {showQR ? 'Hide QR' : 'Show QR'}
        </button>
      </div>

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
      <div className="space-y-0">
        {[
          'The encryption key never touches our server.',
          'The link works only for the specified number of views.',
          'Once fully viewed, the message is destroyed permanently.',
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
        className="btn btn-ghost w-full text-xs tracking-wider uppercase"
      >
        Create Another Message
      </button>
    </div>
  );
};

export default Success;