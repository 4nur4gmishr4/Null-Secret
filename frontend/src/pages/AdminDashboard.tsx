import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Skeleton from '../components/Skeleton';
import { API_BASE } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

const AdminDashboard: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  // SECURITY NOTE: The admin key is stored in sessionStorage for UX convenience.
  // If this page is exposed to XSS, admin keys for all managed secrets in this
  // session could leak. For higher security, consider backend-issued session
  // tokens tied to the user's Firebase auth rather than raw admin keys.
  let adminKey = location.hash.replace('#', '');
  if (!adminKey && id) {
    const keys = JSON.parse(sessionStorage.getItem('nullSecret_adminKeys') || '{}');
    adminKey = keys[id] || '';
  }

  const [info, setInfo] = useState<{views: number, viewLimit: number, expiresAt: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [burning, setBurning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/secret/${id}/info`, {
          headers: { 'X-Admin-Key': adminKey },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('We could not find this secret. The admin link may be wrong, or the message has already self-destructed.');
        const data = await res.json();
        setInfo(data);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id, adminKey]);

  const handleBurn = async () => {
    if (!window.confirm('Delete this secret right now, before anyone reads it? This cannot be undone.')) return;
    setBurning(true);
    try {
      const res = await fetch(`${API_BASE}/secret/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Key': adminKey,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('We could not delete this secret. Please try again.');
      setInfo(null);
      setError('Secret deleted. The link no longer works for anyone.');
      toast('Secret permanently destroyed', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Burn failed', 'error');
    } finally {
      setBurning(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-6 slide-up" aria-live="polite">
        <div className="space-y-2 mb-8">
          <Skeleton width="200px" height="24px" />
          <Skeleton width="320px" height="14px" />
        </div>
        <div style={{ border: '1px solid var(--border-default)' }}>
          <div className="p-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <Skeleton width="100%" height="16px" />
          </div>
          <div className="p-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <Skeleton width="100%" height="16px" />
          </div>
          <div className="p-4">
            <Skeleton width="100%" height="16px" />
          </div>
        </div>
        <Skeleton width="100%" height="48px" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-6 slide-up" role="alert" aria-live="assertive">
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          We could not load this dashboard
        </h2>
        <div className="error-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{error}</span>
        </div>
        <button 
          onClick={() => navigate('/app')}
          className="btn btn-ghost w-full text-xs tracking-wider uppercase"
        >
          Create new secret
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-6 slide-up">
      <div className="space-y-2 mb-8">
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Manage your secret
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          See whether the message has been opened and delete it early if you need to.
        </p>
      </div>

      {info && (
        <>
          <div className="space-y-0" style={{ border: `1px solid var(--border-default)` }}>
            <div className="flex justify-between items-center p-4" style={{ background: 'var(--bg-secondary)', borderBottom: `1px solid var(--border-default)` }}>
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>Status</span>
              <span className="text-xs font-bold" style={{ color: 'var(--text-success)' }}>Live</span>
            </div>
            <div className="flex justify-between items-center p-4" style={{ background: 'var(--bg-elevated)', borderBottom: `1px solid var(--border-default)` }}>
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>Times opened</span>
              <span className="text-xs mono font-bold" style={{ color: 'var(--text-primary)' }}>{info.views} / {info.viewLimit}</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 gap-2" style={{ background: 'var(--bg-elevated)' }}>
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>Auto-deletes at</span>
              <span className="text-xs mono font-bold" style={{ color: 'var(--text-primary)' }}>{new Date(info.expiresAt).toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-8">
            <button
              onClick={handleBurn}
              disabled={burning}
              className="btn w-full text-xs tracking-wider uppercase flex items-center justify-center gap-2"
              style={{ background: 'var(--surface-danger)', color: 'var(--text-danger)', border: `1px solid var(--text-danger)` }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {burning ? 'Deleting…' : 'Delete now'}
            </button>
            <p className="text-[10px] text-center mt-3 uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
              This cannot be undone.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;