import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import Skeleton from '../components/Skeleton';

const SuperAdmin: React.FC = () => {
  const [adminKey, setAdminKey] = useState(sessionStorage.getItem('nullSecret_superKey') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!adminKey);
  const [keyInput, setKeyInput] = useState('');
  
  const [stats, setStats] = useState<{
    status: string;
    goroutines: number;
    heap_alloc_mb: number;
    active_secrets: number;
    total_payload_mb: number;
  } | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: {
          'X-Admin-Key': keyInput.trim(),
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Invalid Super Admin Password');
      }
      
      sessionStorage.setItem('nullSecret_superKey', keyInput.trim());
      setAdminKey(keyInput.trim());
      setIsAuthenticated(true);
      toast('Login successful. Fetching telemetry...', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('nullSecret_superKey');
    setAdminKey('');
    setIsAuthenticated(false);
    setStats(null);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/telemetry`, {
        headers: { 'X-Admin-Key': adminKey },
      });
      if (!res.ok) throw new Error('Failed to fetch backend telemetry');
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [adminKey]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Initial fetch
    fetchStats();
    
    // Poll every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchStats]);

  const handlePurge = async () => {
    if (!window.confirm('CRITICAL WARNING: This will immediately destroy ALL active secrets in the database. Are you absolutely sure?')) return;
    
    setPurging(true);
    try {
      const res = await fetch(`${API_BASE}/admin/purge`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Key': adminKey,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized. Invalid Super Admin Key.');
        throw new Error('Failed to purge database.');
      }
      
      const data = await res.json();
      toast(`System Purged. Destroyed ${data.count} active secrets.`, 'success');
      fetchStats();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Purge failed', 'error');
    } finally {
      setPurging(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto space-y-8 slide-up mt-12">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Super Admin
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            System telemetry and emergency controls.
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
              Super Admin Password
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="input-field w-full text-center tracking-widest"
              placeholder="ENTER PASSWORD"
              autoFocus
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading} className="btn w-full text-xs tracking-wider uppercase">
            {loading ? 'Verifying...' : 'Unlock Dashboard'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-8 slide-up">
      <div className="flex justify-between items-end mb-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            System Telemetry
          </h2>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-success)' }}>
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Live Polling Active
          </p>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost text-xs tracking-wider uppercase text-red-500">
          Lock
        </button>
      </div>

      {error && (
        <div className="error-banner mb-6">
          <span>{error}</span>
        </div>
      )}

      {!stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} width="100%" height="100px" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 flex flex-col justify-between" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>Active Secrets</span>
            <span className="text-4xl font-logo mt-2" style={{ color: 'var(--text-primary)' }}>{stats.active_secrets || 0}</span>
          </div>
          <div className="p-6 flex flex-col justify-between" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>Payload Data</span>
            <span className="text-4xl font-logo mt-2" style={{ color: 'var(--text-primary)' }}>{(stats.total_payload_mb || 0).toFixed(3)}<span className="text-sm ml-1">MB</span></span>
          </div>
          <div className="p-6 flex flex-col justify-between" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>Heap Alloc</span>
            <span className="text-4xl font-logo mt-2" style={{ color: 'var(--text-primary)' }}>{(stats.heap_alloc_mb || 0).toFixed(1)}<span className="text-sm ml-1">MB</span></span>
          </div>
          <div className="p-6 flex flex-col justify-between" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>Goroutines</span>
            <span className="text-4xl font-logo mt-2" style={{ color: 'var(--text-primary)' }}>{stats.goroutines || 0}</span>
          </div>
        </div>
      )}

      <div className="pt-12 mt-12 border-t" style={{ borderColor: 'var(--border-default)' }}>
        <h3 className="text-lg font-bold tracking-tight mb-4" style={{ color: 'var(--text-danger)' }}>Danger Zone</h3>
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6" style={{ border: '1px solid var(--text-danger)', background: 'var(--surface-danger)' }}>
          <div className="space-y-1">
            <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-danger)' }}>Emergency Purge</h4>
            <p className="text-xs" style={{ color: 'var(--text-danger)', opacity: 0.8 }}>
              Instantly destroy all active secrets in the database memory map. Cannot be undone.
            </p>
          </div>
          <button
            onClick={handlePurge}
            disabled={purging}
            className="btn whitespace-nowrap text-xs tracking-wider uppercase flex items-center justify-center gap-2"
            style={{ background: 'var(--text-danger)', color: 'black' }}
          >
            {purging ? 'Purging...' : 'Burn Everything'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin;
