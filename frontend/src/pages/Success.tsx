import React, { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

const Success: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const keyStr = location.hash.replace('#', '');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const fullUrl = `${window.location.origin}/v/${id}#${keyStr}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <label className="label" aria-live="assertive">
        {copied ? 'Link copied to clipboard!' : 'Your secure link is ready'}
      </label>
      <div className="p-4 border break-all mono text-xs select-all" style={{ borderColor: 'var(--border)' }}>
        {fullUrl}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={copyToClipboard}
          className="bg-current text-white dark:text-black font-semibold py-4 hover:opacity-85 transition-all duration-200 text-sm"
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="border font-semibold py-4 hover:bg-current hover:text-white dark:hover:text-black transition-all duration-200 text-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          {showQR ? 'Hide QR' : 'Show QR'}
        </button>
      </div>

      {showQR && (
        <div className="flex justify-center p-8 border" style={{ borderColor: 'var(--border)' }}>
          <QRCodeSVG value={fullUrl} size={200} level="H" bgColor="var(--background)" fgColor="var(--foreground)" />
        </div>
      )}

      <div className="p-4 border text-xs leading-relaxed space-y-1" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
        <p>• The password never touches our server.</p>
        <p>• The link works only for the specified number of views.</p>
        <p>• Once fully viewed, it is gone forever.</p>
      </div>
    </div>
  );
};

export default Success;