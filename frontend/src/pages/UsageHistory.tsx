import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SecurityPageHeader from '../components/SecurityPageHeader';
import { auth, db } from '../utils/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc, type Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { DAILY_SECRET_LIMIT } from '../utils/constants';
import { buildCsv, downloadCsv } from '../utils/csv';

interface HistoryItem {
  id: string;
  createdAt: Timestamp | null;
}

const UsageHistory: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dailyCount, setDailyCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch Daily Quota
        const usageRef = doc(db, 'usage', user.uid, 'daily', today);
        const usageSnap = await getDoc(usageRef);
        if (cancelled) return;
        if (usageSnap.exists()) {
          const data = usageSnap.data() as { count?: number };
          setDailyCount(typeof data.count === 'number' ? data.count : 0);
        }

        // Fetch History Log
        const q = query(
          collection(db, 'users', user.uid, 'history'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        if (cancelled) return;
        const items: HistoryItem[] = querySnapshot.docs.map(snapshot => {
          const data = snapshot.data() as { id?: string; createdAt?: Timestamp };
          return {
            id: typeof data.id === 'string' ? data.id : snapshot.id,
            createdAt: data.createdAt ?? null,
          };
        });
        setHistory(items);
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching usage data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [navigate]);

  const formatDate = (timestamp: Timestamp | null): string => {
    if (!timestamp) return '...';
    return timestamp.toDate().toLocaleString();
  };

  const handleExportCsv = useCallback(() => {
    if (history.length === 0) return;
    const rows = history.map((item) => [
      item.id,
      item.createdAt ? item.createdAt.toDate().toISOString() : '',
    ]);
    const csv = buildCsv(['secret_id', 'created_at_iso8601'], rows);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCsv(`null-secret-history-${stamp}.csv`, csv);
  }, [history]);

  return (
    <div className="fade-in max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-8 space-y-10 md:space-y-12">
      <SecurityPageHeader
        eyebrow="Your activity"
        title="Usage history"
        description="A list of every secret you have created from this account. We only keep the ID and the time you sent it. The actual messages are never logged anywhere."
        aside={
          <div
            className="p-6 border flex flex-col items-center md:items-end justify-center w-full min-w-[200px]"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
          >
            <p className="text-[9px] uppercase tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Today's usage
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
                {dailyCount}
              </span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>
                / {DAILY_SECRET_LIMIT}
              </span>
            </div>
            <p
              className="text-[10px] font-bold mt-2 uppercase tracking-widest"
              style={{ color: dailyCount >= DAILY_SECRET_LIMIT ? 'var(--text-danger)' : 'var(--text-success)' }}
            >
              {dailyCount >= DAILY_SECRET_LIMIT ? 'Daily limit reached' : 'Secrets created today'}
            </p>
          </div>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-default)' }}>
          <div className="col-span-6 md:col-span-4">Created</div>
          <div className="col-span-6 md:col-span-8">Secret ID</div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs font-bold uppercase animate-pulse" style={{ color: 'var(--text-tertiary)' }}>Loading your history…</div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>You have not created any secrets yet. Start with the button below.</div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-4 px-6 py-6 border hover:bg-[var(--bg-secondary)] transition-colors group" style={{ borderColor: 'var(--border-default)' }}>
              <div className="col-span-6 md:col-span-4 text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{formatDate(item.createdAt)}</div>
              <div className="col-span-6 md:col-span-8 text-xs font-mono break-all" style={{ color: 'var(--text-secondary)' }}>{item.id}</div>
            </div>
          ))
        )}
      </div>

      <div className="p-8 border bg-[var(--bg-secondary)] space-y-4" style={{ borderColor: 'var(--border-default)' }}>
        <h3 className="section-title" style={{ color: 'var(--text-primary)' }}>What this list does and does not contain</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          You are looking at IDs and timestamps only. The contents of the messages were never sent to us in readable form, so they cannot appear here. We periodically clean up this list, so it does not grow without limit.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 pt-8">
        <button onClick={() => navigate('/app')} className="btn btn-primary w-full md:w-auto">Create new secret</button>
        <button
          onClick={handleExportCsv}
          disabled={history.length === 0}
          className="btn btn-secondary w-full md:w-auto"
        >
          Download history as CSV
        </button>
      </div>
    </div>
  );
};

export default UsageHistory;
