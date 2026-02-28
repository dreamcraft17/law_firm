'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/api-client';
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

type TeamMember = { userId: string; role: string | null; user: { name: string | null; email: string } };
type EscalatedCase = {
  id: string;
  title: string;
  caseNumber: string | null;
  caseType: string | null;
  status: string;
  slaDueDate: string | null;
  escalatedAt: string;
  escalationResolvedAt: string | null;
  escalationNote: string | null;
  client: { name: string } | null;
  teamMembers: TeamMember[];
};
type Summary = { total: number; unresolved: number; resolved: number };

const BASE = '/api/admin/escalations';

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function EscalationsPage() {
  const [list, setList] = useState<EscalatedCase[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, unresolved: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolveModal, setResolveModal] = useState<EscalatedCase | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`${BASE}?includeResolved=${includeResolved}`);
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setList(Array.isArray(json.data) ? json.data : []);
      if (json.summary) setSummary(json.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }, [includeResolved]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openResolve = (c: EscalatedCase) => {
    setResolveModal(c);
    setResolveNote('');
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    setSaving(true);
    try {
      const res = await adminFetch(`${BASE}/${resolveModal.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ note: resolveNote.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
      setResolveModal(null);
      fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal resolve');
    } finally {
      setSaving(false);
    }
  };

  const unresolved = list.filter((c) => !c.escalationResolvedAt);
  const resolved = list.filter((c) => !!c.escalationResolvedAt);

  return (
    <div>
      <p className="text-gray-600 mb-4 text-sm">
        Daftar perkara yang melebihi batas SLA dan membutuhkan tindakan segera. Selesaikan escalasi dengan mencatat resolusi.
      </p>

      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Escalasi', value: summary.total, color: 'bg-orange-50 border-orange-200 text-orange-700', icon: AlertTriangle },
          { label: 'Belum Diselesaikan', value: summary.unresolved, color: 'bg-red-50 border-red-200 text-red-700', icon: Clock },
          { label: 'Sudah Diselesaikan', value: summary.resolved, color: 'bg-green-50 border-green-200 text-green-700', icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${color}`}>
            <Icon className="w-8 h-8 shrink-0 opacity-70" />
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium opacity-80">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Escalasi</h2>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={includeResolved} onChange={(e) => setIncludeResolved(e.target.checked)} />
            Tampilkan yang sudah selesai
          </label>
        </div>
        <button type="button" onClick={fetchList} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200">Memuat...</div>
      ) : list.length === 0 ? (
        <div className="p-10 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
          <p className="font-medium">Tidak ada escalasi aktif</p>
          <p className="text-sm mt-1">Semua perkara masih dalam batas SLA.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unresolved.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-red-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Belum Diselesaikan ({unresolved.length})
              </p>
              {unresolved.map((c) => <EscalationCard key={c.id} c={c} onResolve={openResolve} />)}
            </>
          )}
          {resolved.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-green-600 flex items-center gap-1.5 mt-4">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Sudah Diselesaikan ({resolved.length})
              </p>
              {resolved.map((c) => <EscalationCard key={c.id} c={c} onResolve={openResolve} />)}
            </>
          )}
        </div>
      )}

      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Selesaikan Escalasi</h3>
              <p className="text-sm text-gray-500 mt-1 truncate">{resolveModal.title}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Resolusi (opsional)</label>
                <textarea
                  rows={3}
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Tindakan yang diambil untuk menyelesaikan escalasi..."
                  maxLength={500}
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setResolveModal(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm">
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleResolve}
                  disabled={saving}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Tandai Selesai'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EscalationCard({ c, onResolve }: { c: EscalatedCase; onResolve: (c: EscalatedCase) => void }) {
  const isResolved = !!c.escalationResolvedAt;
  const days = daysSince(c.escalatedAt);

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${isResolved ? 'border-gray-200 opacity-70' : 'border-red-200'}`}>
      <div className="flex">
        <div className={`w-1 shrink-0 ${isResolved ? 'bg-green-400' : 'bg-red-500'}`} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">{c.title}</span>
                {c.caseNumber && <span className="text-xs text-gray-400">#{c.caseNumber}</span>}
                {c.caseType && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{c.caseType}</span>
                )}
              </div>
              {c.client && <p className="text-xs text-gray-500 mt-0.5">Klien: {c.client.name}</p>}
            </div>
            {!isResolved && (
              <button
                type="button"
                onClick={() => onResolve(c)}
                className="shrink-0 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
              >
                Selesaikan
              </button>
            )}
            {isResolved && (
              <span className="shrink-0 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-lg flex items-center gap-1">
                <CheckCircle2 size={12} /> Selesai
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <AlertTriangle size={11} className="text-red-500" />
              Eskalasi: {fmt(c.escalatedAt)} ({days} hari lalu)
            </span>
            {c.slaDueDate && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                SLA due: {fmt(c.slaDueDate)}
              </span>
            )}
            {c.escalationResolvedAt && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 size={11} />
                Diselesaikan: {fmt(c.escalationResolvedAt)}
              </span>
            )}
          </div>
          {c.escalationNote && (
            <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
              {c.escalationNote}
            </p>
          )}
          {c.teamMembers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {c.teamMembers.map((m) => (
                <span key={m.userId} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                  {m.user.name ?? m.user.email}{m.role ? ` (${m.role})` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
