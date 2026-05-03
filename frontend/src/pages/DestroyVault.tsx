import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SecurityPageHeader from '../components/SecurityPageHeader';
import { auth, db } from '../utils/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import redsecurityData from '../assets/lotties/redsecurity.json';
import {
  collection,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';

const CONFIRM_PHRASE = 'destroy my vault';
const FIRESTORE_BATCH_LIMIT = 400; // Firestore hard cap is 500 writes/batch; 400 leaves headroom.

function describeAuthError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes('requires-recent-login')) {
      return 'For your safety we need a fresh sign-in before deleting your account. Sign out, sign back in, and try again.';
    }
    return msg;
  }
  return 'Account deletion failed.';
}

/**
 * Deletes every document under `users/{uid}/history`, batched to respect
 * Firestore's per-batch write cap. Continues until the collection is empty.
 */
async function deleteHistoryCollection(uid: string): Promise<void> {
  const ref = collection(db, 'users', uid, 'history');
  while (true) {
    const snapshot = await getDocs(ref);
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    let count = 0;
    for (const document of snapshot.docs) {
      batch.delete(document.ref);
      count++;
      if (count >= FIRESTORE_BATCH_LIMIT) break;
    }
    await batch.commit();
    if (snapshot.size <= FIRESTORE_BATCH_LIMIT) return;
  }
}

/**
 * Deletes every document under `usage/{uid}/daily`. The daily counter docs
 * are keyed by `YYYY-MM-DD` so the cardinality is bounded by the account
 * lifetime in days; well within the batch cap in practice.
 */
async function deleteUsageCollection(uid: string): Promise<void> {
  const dailyRef = collection(db, 'usage', uid, 'daily');
  const snapshot = await getDocs(dailyRef);
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  for (const document of snapshot.docs) {
    batch.delete(document.ref);
  }
  // The umbrella `usage/{uid}` doc itself, if it has scalar fields, also goes.
  batch.delete(doc(db, 'usage', uid));
  await batch.commit();
}

const DestroyVault: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phraseMatches = confirmation.trim().toLowerCase() === CONFIRM_PHRASE;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleDestroy = useCallback(async () => {
    if (!user || !phraseMatches || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      // Order matters: clean up data first, then the auth account.
      // If account delete fails, the user can retry without orphan data.
      await deleteHistoryCollection(user.uid);
      await deleteUsageCollection(user.uid);
      await user.delete();
      // After delete the auth state listener will fire null and the layout
      // will route us. Navigate explicitly so the message shows.
      navigate('/');
    } catch (err) {
      setError(describeAuthError(err));
      setDeleting(false);
    }
  }, [user, phraseMatches, deleting, navigate]);

  return (
    <div className="fade-in max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-8 space-y-10 md:space-y-12">
      <SecurityPageHeader
        eyebrow="Danger Zone"
        eyebrowColor="var(--text-danger)"
        lottie={redsecurityData}
        title="Destroy Vault"
        description="This permanently deletes your account, your usage history, and your daily counters. Active secrets you created will continue to live until they expire on their own. There is no recovery."
      />

      <div className="p-8 border space-y-6" style={{ borderColor: 'var(--text-danger)', background: 'var(--surface-danger)' }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-danger)' }}>What gets deleted right now</h3>
        <ul className="space-y-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <li>Your sign-in account on Firebase. Your email becomes available for reuse.</li>
          <li>Every entry in your usage history (`users/{'{uid}'}/history`).</li>
          <li>Your daily quota counters (`usage/{'{uid}'}/*`).</li>
        </ul>
        <h3 className="text-xs font-bold uppercase tracking-widest pt-2" style={{ color: 'var(--text-danger)' }}>What stays alive</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Existing secret links you have already shared continue to work until they expire or hit their view limit. Deleting your account does not retroactively unshare a link. If you want a specific secret gone right now, open the admin link for that secret and use the Delete button there.
        </p>
      </div>

      <div className="space-y-3">
        <label htmlFor="confirm-phrase" className="label block">
          To continue, type <span className="mono font-bold">{CONFIRM_PHRASE}</span> below
        </label>
        <input
          id="confirm-phrase"
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="w-full p-4 mono text-sm focus:outline-none"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-4">
        <button
          onClick={() => navigate('/security')}
          disabled={deleting}
          className="btn btn-ghost w-full text-xs tracking-wider uppercase"
        >
          Cancel
        </button>
        <button
          onClick={handleDestroy}
          disabled={!phraseMatches || deleting}
          className="btn w-full text-xs tracking-wider uppercase"
          style={{
            background: phraseMatches && !deleting ? 'var(--text-danger)' : 'var(--surface-danger)',
            color: phraseMatches && !deleting ? '#fff' : 'var(--text-danger)',
            border: `1px solid var(--text-danger)`,
            opacity: phraseMatches && !deleting ? 1 : 0.6,
            cursor: phraseMatches && !deleting ? 'pointer' : 'not-allowed',
          }}
        >
          {deleting ? 'Deleting…' : 'Destroy vault permanently'}
        </button>
      </div>
    </div>
  );
};

export default DestroyVault;
