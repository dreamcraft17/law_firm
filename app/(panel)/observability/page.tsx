'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/api-client';
import {
  Activity, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Database, Clock, RotateCcw, ChevronRight, Server,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type HealthData = {
  ok: boolean;
  checkedAt: string;
  db: { ok: boolean; latencyMs: number };
  counts: Record<string, number>;
  lastCronRuns: CronRun[];
  pendingDeleteRequests: number;
  archivedCases: number;
};

type CronRun = {
  id: string;
  cronName: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  details: Record<string, unknown> | null;
};

type JobLog = CronRun & { _expanded?: boolean };

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return '–';
  return new Date(d).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDuration(ms: number | null | undefined) {
  if (ms == null) return '–';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-blue-100 text-blue-700',
    partial: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status === 'success' && <CheckCircle2 size={10} />}
      {status === 'failed' && <XCircle size={10} />}
      {status === 'running' && <RefreshCw size={10} className="animate-spin" />}
      {status === 'partial' && <AlertTriangle size={10} />}
      {status}
    </span>
  );
}

function StatCard({ label, value, sub, color = 'blue' }: {
  label: string; value: string | number; sub?: string; color?: 'blue' | 'green' | 'red' | 'amber' | 'gray';
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-600',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ObservabilityPage() {
  const [tab, setTab] = useState<'health' | 'logs'>('health');

  // Health
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Job logs
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [filterCron, setFilterCron] = useState('');
  const [filterFailed, setFilterFailed] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Retry
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryMsg, setRetryMsg] = useState<Record<string, string>>({});

  const loadHealth = useCallback(async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const res = await adminFetch('/api/admin/observability/health');
      if (!res.ok) throw new Error(res.statusText);
      setHealth(await res.json());
    } catch (e) {
      setHealthError(e instanceof Error ? e.message : 'Gagal memuat health');
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    setLogsError(null);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterCron) params.set('cronName', filterCron);
      if (filterFailed) params.set('failed', 'true');
      const res = await adminFetch(`/api/admin/observability/job-logs?${params}`);
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setLogs((json.data ?? []) as JobLog[]);
    } catch (e) {
      setLogsError(e instanceof Error ? e.message : 'Gagal memuat log');
    } finally {
      setLoadingLogs(false);
    }
  }, [filterCron, filterFailed]);

  useEffect(() => { loadHealth(); }, [loadHealth]);
  useEffect(() => { if (tab === 'logs') loadLogs(); }, [tab, loadLogs]);

  const handleRetry = async (cronName: string) => {
    setRetrying(cronName);
    setRetryMsg((m) => ({ ...m, [cronName]: '' }));
    try {
      const res = await adminFetch(`/api/admin/observability/retry-job/${cronName}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setRetryMsg((m) => ({ ...m, [cronName]: json.message ?? 'Job dipicu' }));
      setTimeout(() => loadLogs(), 1500);
    } catch (e) {
      setRetryMsg((m) => ({ ...m, [cronName]: `Gagal: ${e instanceof Error ? e.message : String(e)}` }));
    } finally {
      setRetrying(null);
    }
  };

  const CRON_NAMES = ['sla', 'reminder', 'invoice'];

  return (
    <div>
      <p className="text-gray-600 mb-5 text-sm">
        Monitor kesehatan sistem, job scheduler, dan log eksekusi cron.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { key: 'health', label: 'System Health', icon: Server },
          { key: 'logs', label: 'Job Logs', icon: Activity },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-[#1B4965] text-[#1B4965]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Health Tab ── */}
      {tab === 'health' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-800">System Health Dashboard</h2>
            <button
              type="button"
              onClick={loadHealth}
              disabled={loadingHealth}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={13} className={loadingHealth ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {healthError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{healthError}</div>
          )}

          {loadingHealth && !health && (
            <div className="p-10 text-center text-gray-400 text-sm">Memeriksa sistem...</div>
          )}

          {health && (
            <div className="space-y-6">
              {/* DB Status */}
              <div className={`rounded-xl border p-5 flex items-start gap-4 ${health.db.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${health.db.ok ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Database className={`w-5 h-5 ${health.db.ok ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold text-sm ${health.db.ok ? 'text-green-800' : 'text-red-800'}`}>
                      Database: {health.db.ok ? 'Terhubung' : 'Error'}
                    </p>
                    {health.db.ok
                      ? <CheckCircle2 className="text-green-600 w-4 h-4" />
                      : <XCircle className="text-red-600 w-4 h-4" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Latensi: <span className="font-medium">{health.db.latencyMs}ms</span>
                    {' · '}Diperiksa: {fmtDate(health.checkedAt)}
                  </p>
                </div>
                <div className="text-right">
                  {health.pendingDeleteRequests > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                      <AlertTriangle size={11} />
                      {health.pendingDeleteRequests} delete request pending
                    </span>
                  )}
                </div>
              </div>

              {/* Entity Counts */}
              {health.counts && Object.keys(health.counts).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Jumlah Entitas</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Object.entries(health.counts).map(([k, v]) => (
                      <StatCard key={k} label={k} value={v} color="gray" />
                    ))}
                    <StatCard label="Arsip Perkara" value={health.archivedCases} color="amber" />
                  </div>
                </div>
              )}

              {/* Last Cron Runs */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Eksekusi Cron Terakhir</p>
                {health.lastCronRuns.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm bg-white rounded-xl border">
                    Belum ada cron run tercatat
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Job</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Waktu Mulai</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Durasi</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Error</th>
                          <th className="py-3 px-4" />
                        </tr>
                      </thead>
                      <tbody>
                        {health.lastCronRuns.map((run) => (
                          <tr key={run.id} className={`border-b border-gray-100 ${run.status === 'failed' ? 'bg-red-50/40' : 'hover:bg-gray-50/50'}`}>
                            <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-800">{run.cronName}</td>
                            <td className="py-3 px-4"><StatusChip status={run.status} /></td>
                            <td className="py-3 px-4 text-gray-600 text-xs">{fmtDate(run.startedAt)}</td>
                            <td className="py-3 px-4 text-gray-600 text-xs">{fmtDuration(run.durationMs)}</td>
                            <td className="py-3 px-4 text-red-600 text-xs max-w-[200px] truncate">{run.errorMessage ?? '–'}</td>
                            <td className="py-3 px-4">
                              {run.status === 'failed' && CRON_NAMES.includes(run.cronName) && (
                                <button
                                  type="button"
                                  onClick={() => handleRetry(run.cronName)}
                                  disabled={retrying === run.cronName}
                                  className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded disabled:opacity-50"
                                >
                                  <RotateCcw size={10} className={retrying === run.cronName ? 'animate-spin' : ''} />
                                  Retry
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Retry messages */}
                {Object.entries(retryMsg).filter(([, m]) => m).map(([cronName, msg]) => (
                  <div key={cronName} className={`mt-2 p-2 rounded-lg text-xs ${msg.startsWith('Gagal') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    [{cronName}] {msg}
                  </div>
                ))}
              </div>

              {/* Quick Retry Section */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Manual Trigger Cron</p>
                <div className="flex flex-wrap gap-2">
                  {CRON_NAMES.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleRetry(name)}
                      disabled={retrying === name}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RotateCcw size={13} className={retrying === name ? 'animate-spin' : ''} />
                      Run <span className="font-mono font-semibold text-[#1B4965]">{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Job Logs Tab ── */}
      {tab === 'logs' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Job Execution Log</h2>
            <button
              type="button"
              onClick={loadLogs}
              disabled={loadingLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={13} className={loadingLogs ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 font-medium">Job:</label>
              <select
                value={filterCron}
                onChange={(e) => setFilterCron(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 bg-white"
              >
                <option value="">Semua</option>
                {CRON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filterFailed}
                onChange={(e) => setFilterFailed(e.target.checked)}
                className="rounded border-gray-300"
              />
              Hanya yang gagal
            </label>
            <button
              type="button"
              onClick={loadLogs}
              disabled={loadingLogs}
              className="px-3 py-1.5 bg-[#1B4965] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
            >
              Filter
            </button>
          </div>

          {/* Retry messages */}
          {Object.entries(retryMsg).filter(([, m]) => m).map(([cronName, msg]) => (
            <div key={cronName} className={`mb-3 p-2 rounded-lg text-xs ${msg.startsWith('Gagal') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              [{cronName}] {msg}
            </div>
          ))}

          {logsError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{logsError}</div>
          )}

          {loadingLogs ? (
            <div className="p-10 text-center text-gray-400 text-sm">Memuat log...</div>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm bg-white rounded-xl border">Belum ada log</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Job</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Mulai</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Selesai</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Durasi</th>
                    <th className="py-3 px-4 font-medium text-gray-700" />
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <>
                      <tr
                        key={log.id}
                        className={`border-b border-gray-100 cursor-pointer ${
                          log.status === 'failed' ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50/50'
                        }`}
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      >
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-800">{log.cronName}</td>
                        <td className="py-3 px-4"><StatusChip status={log.status} /></td>
                        <td className="py-3 px-4 text-gray-600 text-xs">{fmtDate(log.startedAt)}</td>
                        <td className="py-3 px-4 text-gray-600 text-xs">{fmtDate(log.finishedAt)}</td>
                        <td className="py-3 px-4 text-gray-600 text-xs">{fmtDuration(log.durationMs)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {log.status === 'failed' && CRON_NAMES.includes(log.cronName) && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRetry(log.cronName); }}
                                disabled={retrying === log.cronName}
                                className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded disabled:opacity-50"
                              >
                                <RotateCcw size={10} className={retrying === log.cronName ? 'animate-spin' : ''} />
                                Retry
                              </button>
                            )}
                            <ChevronRight
                              size={14}
                              className={`text-gray-400 transition-transform ${expandedLog === log.id ? 'rotate-90' : ''}`}
                            />
                          </div>
                        </td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr key={`${log.id}-detail`} className={log.status === 'failed' ? 'bg-red-50/30' : 'bg-gray-50/30'}>
                          <td colSpan={6} className="px-4 py-3">
                            <div className="space-y-2">
                              {log.errorMessage && (
                                <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                  <XCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs font-semibold text-red-700 mb-0.5">Error</p>
                                    <p className="text-xs text-red-600 font-mono">{log.errorMessage}</p>
                                  </div>
                                </div>
                              )}
                              {log.details && (
                                <div className="p-2 bg-gray-100 rounded-lg">
                                  <p className="text-xs font-semibold text-gray-600 mb-1">Details</p>
                                  <pre className="text-xs text-gray-700 font-mono overflow-auto max-h-32">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                              <p className="text-xs text-gray-400 font-mono">ID: {log.id}</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary bar */}
          {logs.length > 0 && (
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {logs.length} log ditampilkan
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 size={11} />
                {logs.filter((l) => l.status === 'success').length} sukses
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <XCircle size={11} />
                {logs.filter((l) => l.status === 'failed').length} gagal
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
