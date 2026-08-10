// Copyright (c) 2026 Anurag Mishra. All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import Skeleton from '../components/Skeleton';
import LottieView from '../components/LottieView';
import AuthLayout from '../components/AuthLayout';
import shieldMorphData from '../assets/lotties/shield-morph.json';

/* ── Constants (mirror backend/store/storage.go) ── */
const MAX_HISTORY = 60; // 5 min at 5s poll
const MAX_SECRETS = 1000;
const MAX_PAYLOAD_MB = 48;
const POLL_MS = 5000;
const CHART_W = 300;
const CHART_H = 90;

/* ── Types ── */
interface TelemetryStats {
  status: string;
  goroutines: number;
  heap_alloc_mb: number;
  active_secrets: number;
  total_payload_mb: number;
}

interface TelemetrySample {
  ts: number;
  goroutines: number;
  heap_alloc_mb: number;
  active_secrets: number;
  total_payload_mb: number;
}

interface Point {
  x: number;
  y: number;
}

/* ── Formatting helpers ── */
function formatMb(mb: number): string {
  if (mb < 0.001) return '0 B';
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatUptime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatDelta(current: number, prev: number | undefined): string {
  if (prev === undefined || current === prev) return '—';
  const arrow = current > prev ? '↑' : '↓';
  const pct = (Math.abs(current - prev) / Math.max(Math.abs(prev), 1e-9)) * 100;
  let text: string;
  if (pct < 0.1) text = '<0.1';
  else if (pct >= 100) text = pct.toFixed(0);
  else text = pct.toFixed(1);
  return `${arrow} ${text}%`;
}

/* ── SVG chart math ── */
function scaleValues(values: number[], width: number, height: number, pad = 6): Point[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = min === max ? min - 1 : min;
  const hi = min === max ? max + 1 : max;
  const range = hi - lo;
  return values.map((v, i) => ({
    x: (i / Math.max(values.length - 1, 1)) * width,
    y: pad + (1 - (v - lo) / range) * (height - pad * 2),
  }));
}

function toPoints(pts: Point[]): string {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

/* ── Reusable presentational pieces ── */
function Sparkline({ id, values, color }: { id: string; values: number[]; color: string }) {
  const pts = scaleValues(values, 100, 32);
  if (pts.length < 2) {
    return <div className="w-16 h-8 shrink-0" aria-hidden="true" />;
  }
  const line = toPoints(pts);
  return (
    <svg viewBox="0 0 100 32" className="w-16 h-8 shrink-0" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,32 ${line} 100,32`} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function StatCard({ id, label, value, spark, color, delta }: {
  id: string;
  label: string;
  value: string;
  spark: number[];
  color: string;
  delta: string;
}) {
  return (
    <div className="p-6 flex flex-col gap-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="label truncate">{label}</span>
        <span className="mono text-[10px] whitespace-nowrap" style={{ color }}>{delta}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="text-3xl font-mono leading-none" style={{ color: 'var(--text-primary)' }}>{value}</span>
        <Sparkline id={id} values={spark} color={color} />
      </div>
    </div>
  );
}

function TimelineChart({ id, title, values, color, format }: {
  id: string;
  title: string;
  values: number[];
  color: string;
  format: (v: number) => string;
}) {
  const pts = scaleValues(values, CHART_W, CHART_H);
  const hasData = pts.length >= 2;
  const line = hasData ? toPoints(pts) : '';
  const current = values[values.length - 1] ?? 0;
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;

  return (
    <div className="p-6 flex flex-col" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center justify-between gap-3 mb-5">
        <h3 className="section-title" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
        <span className="mono text-xs" style={{ color }}>{format(current)}</span>
      </div>
      <div className="relative flex-1" style={{ height: '180px' }}>
        {[0.25, 0.5, 0.75].map((f) => (
          <div key={f} className="absolute left-0 right-0 border-t" style={{ top: `${f * 100}%`, borderColor: 'var(--border-default)' }} />
        ))}
        <span className="absolute left-0 top-0 -translate-y-1/2 mono text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{format(max)}</span>
        <span className="absolute left-0 bottom-0 translate-y-1/2 mono text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{format(min)}</span>
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {hasData && (
            <>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`0,${CHART_H} ${line} ${CHART_W},${CHART_H}`} fill={`url(#${id})`} />
              <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

function capacityColor(pct: number): string {
  if (pct >= 90) return 'var(--text-danger)';
  if (pct >= 70) return '#F59E0B';
  return 'var(--text-success)';
}

function CapacityBar({ title, current, max, format }: {
  title: string;
  current: number;
  max: number;
  format: (v: number) => string;
}) {
  const pct = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="label">{title}</span>
        <span className="mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>{format(current)} / {format(max)}</span>
      </div>
      <div className="h-1.5 w-full" style={{ background: 'var(--border-default)' }}>
        <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: capacityColor(pct) }} />
      </div>
    </div>
  );
}

function InfoCell({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  const color = tone === 'success' ? 'var(--text-success)' : tone === 'danger' ? 'var(--text-danger)' : 'var(--text-primary)';
  return (
    <div className="p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
      <span className="block label mb-1.5">{label}</span>
      <span className="mono text-sm" style={{ color }}>{value}</span>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ── Page ── */
const SuperAdmin: React.FC = () => {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [samples, setSamples] = useState<TelemetrySample[]>([]);
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

      setAdminKey(keyInput.trim());
      setIsAuthenticated(true);
      toast('Login successful. Fetching telemetry…', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminKey('');
    setIsAuthenticated(false);
    setStats(null);
    setSamples([]);
    setError(null);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/telemetry`, {
        headers: { 'X-Admin-Key': adminKey },
      });
      if (!res.ok) throw new Error('Failed to fetch backend telemetry');
      const data: TelemetryStats = await res.json();
      setStats(data);
      setError(null);
      setSamples((prev) => {
        const now = Date.now();
        const next: TelemetrySample[] = [...prev, {
          ts: now,
          goroutines: data.goroutines,
          heap_alloc_mb: data.heap_alloc_mb,
          active_secrets: data.active_secrets,
          total_payload_mb: data.total_payload_mb,
        }];
        return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [adminKey]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const initialFetch = async () => {
      await fetchStats();
    };
    void initialFetch();

    const interval = setInterval(() => { void fetchStats(); }, POLL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchStats]);

  const handlePurge = async () => {
    const first = window.confirm('CRITICAL WARNING: This will immediately destroy ALL active secrets in the database. Are you absolutely sure?');
    if (!first) return;
    const second = window.confirm('FINAL WARNING: This action cannot be undone. Confirm the emergency purge?');
    if (!second) return;

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

      const data: { count: number } = await res.json();
      toast(`System Purged. Destroyed ${data.count} active secrets.`, 'success');
      void fetchStats();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Purge failed', 'error');
    } finally {
      setPurging(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <AuthLayout heroTitle={<>System<br />Command Center</>}>
        <div className="space-y-6 slide-up">
          <div className="mx-auto w-24 h-24 lottie-themed">
            <LottieView animationData={shieldMorphData} loop={true} autoplay={true} />
          </div>
          <div className="text-center space-y-1.5">
            <h2 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Super Admin</h2>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Live telemetry and emergency controls</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full px-4 py-3 pr-11 text-sm tracking-widest"
                placeholder="ENTER PASSWORD"
                autoFocus
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 icon-soft"
                aria-label={showKey ? 'Hide password' : 'Show password'}
              >
                {showKey ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full text-xs tracking-wider uppercase">
              {loading ? 'Verifying…' : 'Unlock Dashboard'}
            </button>
          </form>
          <p className="text-center text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            Restricted area. Authorized personnel only.
          </p>
        </div>
      </AuthLayout>
    );
  }

  const prevSample = samples.length >= 2 ? samples[samples.length - 2] : undefined;
  const healthy = stats !== null && error === null;
  const uptimeMs = samples.length > 0
    ? (samples[samples.length - 1]?.ts ?? 0) - (samples[0]?.ts ?? 0)
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 slide-up">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            System Command Center
          </h2>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 animate-pulse" aria-hidden="true" />
            <span className="text-xs tracking-widest uppercase" style={{ color: healthy ? 'var(--text-success)' : 'var(--text-danger)' }}>
              {healthy ? 'All Systems Operational' : 'Connection Interrupted'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="mono text-[11px]" style={{ color: healthy ? 'var(--text-success)' : 'var(--text-danger)' }}>
            {healthy ? '● LIVE · 5s' : '○ OFFLINE'}
          </span>
          <button onClick={handleLogout} className="btn btn-ghost text-xs tracking-wider uppercase text-red-500">
            Lock
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
        </div>
      )}

      {!stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} width="100%" height="120px" />)}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              id="spark-secrets"
              label="Active Secrets"
              value={stats.active_secrets.toLocaleString()}
              spark={samples.map((s) => s.active_secrets)}
              color="var(--text-success)"
              delta={formatDelta(stats.active_secrets, prevSample?.active_secrets)}
            />
            <StatCard
              id="spark-payload"
              label="Payload Data"
              value={formatMb(stats.total_payload_mb)}
              spark={samples.map((s) => s.total_payload_mb)}
              color="var(--accent)"
              delta={formatDelta(stats.total_payload_mb, prevSample?.total_payload_mb)}
            />
            <StatCard
              id="spark-heap"
              label="Heap Alloc"
              value={formatMb(stats.heap_alloc_mb)}
              spark={samples.map((s) => s.heap_alloc_mb)}
              color="#F59E0B"
              delta={formatDelta(stats.heap_alloc_mb, prevSample?.heap_alloc_mb)}
            />
            <StatCard
              id="spark-goroutines"
              label="Goroutines"
              value={stats.goroutines.toLocaleString()}
              spark={samples.map((s) => s.goroutines)}
              color="var(--text-danger)"
              delta={formatDelta(stats.goroutines, prevSample?.goroutines)}
            />
          </div>

          {/* Time-series charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TimelineChart
              id="chart-goroutines"
              title="Goroutine Timeline"
              values={samples.map((s) => s.goroutines)}
              color="var(--text-success)"
              format={(v) => Math.round(v).toLocaleString()}
            />
            <TimelineChart
              id="chart-memory"
              title="Memory Timeline"
              values={samples.map((s) => s.heap_alloc_mb)}
              color="#F59E0B"
              format={formatMb}
            />
          </div>

          {/* System information */}
          <div className="p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <h3 className="section-title mb-5" style={{ color: 'var(--text-secondary)' }}>System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CapacityBar title="Secret Capacity" current={stats.active_secrets} max={MAX_SECRETS} format={(v) => v.toLocaleString()} />
              <CapacityBar title="Payload Storage" current={stats.total_payload_mb} max={MAX_PAYLOAD_MB} format={formatMb} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
              <InfoCell label="Uptime" value={formatUptime(uptimeMs)} />
              <InfoCell label="Status" value="Operational" tone="success" />
              <InfoCell label="Poll Interval" value="5 seconds" />
              <InfoCell label="History Window" value={`${Math.round((MAX_HISTORY * POLL_MS) / 60000)} min`} />
            </div>
          </div>
        </>
      )}

      {/* Danger zone */}
      <div className="pt-4">
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
            {purging ? 'Purging…' : 'Burn Everything'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin;
