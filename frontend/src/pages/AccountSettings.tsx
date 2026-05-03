import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SecurityPageHeader from '../components/SecurityPageHeader';
import { auth } from '../utils/firebase';
import { friendlyAuthError } from '../utils/authErrors';
import {
  onAuthStateChanged,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User,
} from 'firebase/auth';

type Status = { kind: 'idle' | 'success' | 'error'; message: string };

const IDLE: Status = { kind: 'idle', message: '' };

function describeAuthError(err: unknown): string {
  return friendlyAuthError(err, 'Something went wrong. Please try again.');
}

const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameStatus, setNameStatus] = useState<Status>(IDLE);

  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<Status>(IDLE);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
      setDisplayName(currentUser.displayName ?? '');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const onSaveDisplayName = useCallback(async () => {
    if (!user) return;
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      setNameStatus({ kind: 'error', message: 'Display name cannot be empty.' });
      return;
    }
    if (trimmed.length > 60) {
      setNameStatus({ kind: 'error', message: 'Keep it under 60 characters.' });
      return;
    }
    setSavingName(true);
    setNameStatus(IDLE);
    try {
      await updateProfile(user, { displayName: trimmed });
      setNameStatus({ kind: 'success', message: 'Display name saved.' });
    } catch (err) {
      setNameStatus({ kind: 'error', message: describeAuthError(err) });
    } finally {
      setSavingName(false);
    }
  }, [user, displayName]);

  const onSendEmailChange = useCallback(async () => {
    if (!user) return;
    const trimmed = newEmail.trim();
    if (trimmed.length === 0) {
      setEmailStatus({ kind: 'error', message: 'Type the new email first.' });
      return;
    }
    if (trimmed === user.email) {
      setEmailStatus({ kind: 'error', message: 'That is already your email.' });
      return;
    }
    setSavingEmail(true);
    setEmailStatus(IDLE);
    try {
      await verifyBeforeUpdateEmail(user, trimmed);
      setEmailStatus({
        kind: 'success',
        message: `We sent a confirmation email to ${trimmed}. The change takes effect once you click the link in that email.`,
      });
      setNewEmail('');
    } catch (err) {
      setEmailStatus({ kind: 'error', message: describeAuthError(err) });
    } finally {
      setSavingEmail(false);
    }
  }, [user, newEmail]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 slide-up">
        <p className="text-xs font-semibold tracking-widest uppercase animate-pulse" style={{ color: 'var(--text-tertiary)' }}>Loading account…</p>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-8 space-y-10 md:space-y-12">
      <SecurityPageHeader
        eyebrow="Account"
        title="Profile"
        description="Your account details. Anything you change here only affects how you sign in. Your secrets stay encrypted on your device."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 border space-y-6" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Identity</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="display-name" className="text-[10px] uppercase tracking-widest font-bold mb-2 block" style={{ color: 'var(--text-tertiary)' }}>Display name</label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={60}
                className="w-full p-3 text-sm focus:outline-none"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
              />
              <button
                onClick={onSaveDisplayName}
                disabled={savingName || displayName.trim() === (user?.displayName ?? '')}
                className="btn btn-secondary text-[10px] tracking-widest uppercase mt-3"
                style={{ padding: '8px 16px' }}
              >
                {savingName ? 'Saving…' : 'Save name'}
              </button>
              {nameStatus.kind !== 'idle' && (
                <p className="text-[11px] mt-2" style={{ color: nameStatus.kind === 'success' ? 'var(--text-success)' : 'var(--text-danger)' }}>
                  {nameStatus.message}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--text-tertiary)' }}>Current email</p>
              <p className="text-sm font-bold break-all" style={{ color: 'var(--text-primary)' }}>{user?.email || 'Not set'}</p>
              <p className="text-[10px] mt-1" style={{ color: user?.emailVerified ? 'var(--text-success)' : 'var(--text-tertiary)' }}>
                {user?.emailVerified ? 'Verified' : 'Not verified yet'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--text-tertiary)' }}>Account created</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 border space-y-6" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Change email</h3>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Type your new email below. We will send a confirmation link to the new address. The change only takes effect once you click that link, so you do not lose access if you typed it wrong.
          </p>
          <div>
            <label htmlFor="new-email" className="text-[10px] uppercase tracking-widest font-bold mb-2 block" style={{ color: 'var(--text-tertiary)' }}>New email</label>
            <input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full p-3 text-sm focus:outline-none"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
            />
            <button
              onClick={onSendEmailChange}
              disabled={savingEmail || newEmail.trim() === '' || newEmail.trim() === user?.email}
              className="btn btn-secondary text-[10px] tracking-widest uppercase mt-3"
              style={{ padding: '8px 16px' }}
            >
              {savingEmail ? 'Sending…' : 'Send confirmation'}
            </button>
            {emailStatus.kind !== 'idle' && (
              <p className="text-[11px] mt-2 leading-relaxed" style={{ color: emailStatus.kind === 'success' ? 'var(--text-success)' : 'var(--text-danger)' }}>
                {emailStatus.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 border space-y-6" style={{ borderColor: 'var(--border-default)' }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Quick links</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button onClick={() => navigate('/history')} className="w-full text-left p-4 border text-xs font-bold hover:bg-[var(--accent-subtle)] transition-colors" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
            View usage history
          </button>
          <button onClick={() => navigate('/security')} className="w-full text-left p-4 border text-xs font-bold hover:bg-[var(--accent-subtle)] transition-colors" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
            Security settings
          </button>
          <button onClick={() => navigate('/security/destroy')} className="w-full text-left p-4 border text-xs font-bold transition-colors" style={{ borderColor: 'var(--text-danger)', color: 'var(--text-danger)' }}>
            Destroy vault
          </button>
        </div>
      </div>

      <div className="pt-8 text-center">
        <button onClick={() => navigate('/app')} className="btn btn-primary text-xs tracking-widest uppercase">Create New Secret</button>
      </div>
    </div>
  );
};

export default AccountSettings;
