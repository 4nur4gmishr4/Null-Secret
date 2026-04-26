import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import historyLottie from '../assets/lotties/privacylock.json';
import { auth, db } from '../utils/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface HistoryItem {
  id: string;
  createdAt: any;
}

const UsageHistory: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const q = query(
            collection(db, 'users', user.uid, 'history'),
            orderBy('createdAt', 'desc')
          );
          const querySnapshot = await getDocs(q);
          const items = querySnapshot.docs.map(doc => ({
            id: doc.data().id,
            createdAt: doc.data().createdAt
          }));
          setHistory(items);
        } catch (error) {
          console.error("Error fetching history:", error);
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '...';
    const date = timestamp.toDate();
    return date.toLocaleString();
  };

  return (
    <div className="fade-in max-w-5xl mx-auto py-12 px-4 md:px-8 space-y-12">
      <div className="flex flex-col md:flex-row items-center gap-8 border-b pb-12" style={{ borderColor: 'var(--border-default)' }}>
        <div className="w-32 h-32 md:w-48 md:h-48 lottie-themed">
          <Lottie animationData={historyLottie} loop={true} />
        </div>
        <div className="space-y-4 text-center md:text-left">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: 'var(--text-tertiary)' }}>Activity Log</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>Usage History</h1>
          <p className="text-sm md:text-base leading-relaxed max-w-xl font-medium" style={{ color: 'var(--text-secondary)' }}>
            Track your ephemeral footprint. Remember: Null-Secret never stores the content of your messages, only the minimal proof of your encrypted actions.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-default)' }}>
          <div className="col-span-6 md:col-span-4">Creation Date</div>
          <div className="col-span-6 md:col-span-8">Secret ID (Encrypted Reference)</div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs font-bold uppercase animate-pulse" style={{ color: 'var(--text-tertiary)' }}>Retrieving secure logs...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No recent activity found.</div>
        ) : (
          history.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-6 border hover:bg-[var(--bg-secondary)] transition-colors group" style={{ borderColor: 'var(--border-default)' }}>
              <div className="col-span-6 md:col-span-4 text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{formatDate(item.createdAt)}</div>
              <div className="col-span-6 md:col-span-8 text-xs font-mono break-all" style={{ color: 'var(--text-secondary)' }}>{item.id}</div>
            </div>
          ))
        )}
      </div>

      <div className="p-8 border bg-[var(--bg-secondary)] space-y-4" style={{ borderColor: 'var(--border-default)' }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Privacy Note</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          This log contains only zero-knowledge references to your actions. It is impossible to reconstruct your messages from this list. Logs are automatically pruned periodically for your security.
        </p>
      </div>

      <div className="pt-8">
        <button onClick={() => navigate('/app')} className="btn btn-primary w-full md:w-auto">Create New Secret</button>
      </div>
    </div>
  );
};

export default UsageHistory;
