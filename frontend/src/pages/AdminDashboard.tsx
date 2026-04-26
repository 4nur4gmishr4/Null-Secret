import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';

const AdminDashboard: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  let adminKey = location.hash.replace('#', '');
  if (!adminKey && id) {
    const keys = JSON.parse(localStorage.getItem('nullSecret_adminKeys') || '{}');
    adminKey = keys[id] || '';
  }

  const [info, setInfo] = useState<{views: number, viewLimit: number, expiresAt: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [burning, setBurning] = useState(false);

  const fetchInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/secret/${id}/info?admin_key=${adminKey}`);
      if (!res.ok) throw new Error('Secret not found or invalid admin key.');
      const data = await res.json();
      setInfo(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBurn = async () => {
    if (!window.confirm("Are you sure you want to permanently destroy this secret?")) return;
    setBurning(true);
    try {
      const res = await fetch(`${API_BASE}/secret/${id}?admin_key=${adminKey}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to burn secret.');
      setInfo(null);
      setError('Secret successfully destroyed.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Burn failed');
    } finally {
      setBurning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 slide-up">
        <p className="text-xs font-semibold tracking-widest uppercase animate-pulse" style={{ color: 'var(--text-tertiary)' }}>
          Loading status…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-6 slide-up" role="alert" aria-live="assertive">
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Dashboard Unavailable
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
          Create New Secret
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-6 slide-up">
      <div className="space-y-2 mb-8">
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Admin Dashboard
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Track the status of your secure message.
        </p>
      </div>

      {info && (
        <>
          <div className="space-y-0" style={{ border: `1px solid var(--border-default)` }}>
            <div className="flex justify-between items-center p-4" style={{ background: 'var(--bg-secondary)', borderBottom: `1px solid var(--border-default)` }}>
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>Status</span>
              <span className="text-xs font-bold" style={{ color: 'var(--text-success)' }}>Active</span>
            </div>
            <div className="flex justify-between items-center p-4" style={{ background: 'var(--bg-elevated)', borderBottom: `1px solid var(--border-default)` }}>
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>Views</span>
              <span className="text-xs mono font-bold" style={{ color: 'var(--text-primary)' }}>{info.views} / {info.viewLimit}</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 gap-2" style={{ background: 'var(--bg-elevated)' }}>
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>Expires</span>
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
              {burning ? 'Burning...' : 'Burn Now'}
            </button>
            <p className="text-[10px] text-center mt-3 uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
              This action cannot be undone.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;