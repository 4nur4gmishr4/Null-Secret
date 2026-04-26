import React from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import securityLottie from '../assets/lotties/privacylock.json';

const SecuritySettings: React.FC = () => {

  return (
    <div className="fade-in max-w-5xl mx-auto py-12 px-4 md:px-8 space-y-12">
      <div className="flex flex-col md:flex-row items-center gap-8 border-b pb-12" style={{ borderColor: 'var(--border-default)' }}>
        <div className="w-32 h-32 md:w-48 md:h-48 lottie-themed">
          <Lottie animationData={securityLottie} loop={true} />
        </div>
        <div className="space-y-4 text-center md:text-left">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: 'var(--text-tertiary)' }}>Hardening Protocol</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>Security Settings</h1>
          <p className="text-sm md:text-base leading-relaxed max-w-xl font-medium" style={{ color: 'var(--text-secondary)' }}>
            Configure your defense layers. From biometric authentication to advanced cryptographic sessions, manage how your data is shielded.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Authentication Layer */}
        <div className="p-8 border space-y-6" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Authentication</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border" style={{ borderColor: 'var(--border-default)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Two-Factor Auth</p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Add a secondary device check</p>
              </div>
              <button className="text-[10px] font-bold uppercase underline" style={{ color: 'var(--text-primary)' }}>Enable</button>
            </div>
            <div className="flex items-center justify-between p-4 border" style={{ borderColor: 'var(--border-default)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Biometric Lock</p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>FaceID / TouchID for mobile</p>
              </div>
              <button className="text-[10px] font-bold uppercase underline" style={{ color: 'var(--text-primary)' }}>Configure</button>
            </div>
          </div>
        </div>

        {/* Cryptographic Session */}
        <div className="p-8 border space-y-6" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Cryptographic Session</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border" style={{ borderColor: 'var(--border-default)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Auto-Timeout</p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Current: 15 Minutes</p>
              </div>
              <button className="text-[10px] font-bold uppercase underline" style={{ color: 'var(--text-primary)' }}>Edit</button>
            </div>
            <div className="flex items-center justify-between p-4 border" style={{ borderColor: 'var(--border-default)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Device Sessions</p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>1 Active Device</p>
              </div>
              <button className="text-[10px] font-bold uppercase underline" style={{ color: 'var(--text-primary)' }}>View All</button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 border bg-red-500/5 space-y-4 border-red-500/20">
        <h3 className="text-xs font-bold uppercase tracking-widest text-red-500">Danger Zone</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Wipe all encrypted metadata and permanently delete your vault. This action is irreversible.
        </p>
        <button className="text-[10px] font-bold uppercase px-4 py-2 bg-red-500 text-white hover:bg-red-600 transition-colors">Destroy Vault</button>
      </div>

      <div className="pt-8 text-center">
        <button onClick={() => window.open('/privacy', '_blank')} className="text-xs font-bold uppercase tracking-widest underline" style={{ color: 'var(--text-tertiary)' }}>Read Full Privacy Manifesto</button>
      </div>
    </div>
  );
};

export default SecuritySettings;
