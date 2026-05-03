import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

const Success: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { toast } = useToast();
  
  const keyStr = location.hash.replace('#', '');
  const adminKey = location.state?.adminKey;
  
  React.useEffect(() => {
    if (adminKey && id) {
      const keys = JSON.parse(sessionStorage.getItem('nullSecret_adminKeys') || '{}');
      keys[id] = adminKey;
      sessionStorage.setItem('nullSecret_adminKeys', JSON.stringify(keys));
    }
  }, [adminKey, id]);
  
  const [copied, setCopied] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const fullUrl = `${window.location.origin}/v/${id}#${keyStr}`;
  const adminUrl = adminKey ? `${window.location.origin}/admin/${id}` : '';

  const copyToClipboard = async (
    text: string,
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    label: string,
  ): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      toast(`${label} copied to clipboard`, 'success');
      setTimeout(() => setter(false), 2500);
    } catch (err) {
      console.error('clipboard write failed', err);
      toast('Could not copy to clipboard', 'error');
    }
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
            {copied || copiedAdmin ? 'Copied' : 'Your links are ready'}
          </h2>
        </div>
      </div>

      {/* Secret Link Display */}
      <div className="space-y-2">
        <label className="label">Link for the recipient</label>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Send this to the person who should read the message. The decryption key is hidden in the link itself, after the # sign, so we never see it.
        </p>
        <div className="link-display" aria-live="assertive">
          {fullUrl}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => copyToClipboard(fullUrl, setCopied, 'Secret link')}
            className={`btn w-full text-xs tracking-wider uppercase ${copied ? 'btn-secondary' : 'btn-primary'}`}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button
            onClick={() => setShowQR(!showQR)}
            className="btn btn-secondary w-full text-xs tracking-wider uppercase"
          >
            {showQR ? 'Hide QR code' : 'Show QR code'}
          </button>
        </div>
      </div>

      {/* Admin Link Display */}
      {adminUrl && (
        <div className="space-y-2 pt-6">
          <label className="label">Admin link (keep this for yourself)</label>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Save this link somewhere safe. It lets you check whether the message has been opened and lets you delete it early if you change your mind. Do not share it.
          </p>
          <div className="link-display" aria-live="assertive" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
            {adminUrl}
          </div>
          <div className="pt-2">
            <button
              onClick={() => copyToClipboard(adminUrl, setCopiedAdmin, 'Admin link')}
              className={`btn w-full text-xs tracking-wider uppercase ${copiedAdmin ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ border: '1px solid var(--border-default)' }}
            >
              {copiedAdmin ? 'Copied' : 'Copy admin link'}
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
          'The decryption key stays in the link, not on our server.',
          'The link only works for the number of opens you chose.',
          'Once that limit is reached, the message is gone forever.',
          'If you lose the admin link, you cannot manage this secret anymore.'
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
        Send another secret
      </button>
    </div>
  );
};

export default Success;