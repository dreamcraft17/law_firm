'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/api-client';
import {
  ShieldCheck, Archive, Trash2, RotateCcw, Plus, RefreshCw,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, HardDrive,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type RetentionPolicy = {
  id: string;
  name: string;
  documentType: string | null;
  caseStatus: string | null;
  retainYears: number;
  actionAfter: string;
  isActive: boolean;
};

type ArchivedCase = {
  id: string;
  title: string;
  caseNumber: string | null;
  status: string;
  archivedAt: string;
  archivedReason: string | null;
  client: { name: string } | null;
};

type DeleteRequest = {
  id: string;
  entityType: string;
  entityId: string;
  entityTitle: string | null;
  reason: string | null;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

type BackupResult = {
  ok: boolean;
  testedAt?: string;
  durationMs?: number;
  counts?: Record<string, number>;
  error?: string;
} | null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = { pending: 'Pending', approved: 'Disetujui', rejected: 'Ditolak' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DataGovernancePage() {
  const [tab, setTab] = useState<'retention' | 'archive' | 'delete' | 'backup'>('retention');

  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [archivedCases, setArchivedCases] = useState<ArchivedCase[]>([]);
  const [deleteRequests, setDeleteRequests] = useState<DeleteRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Retention form
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [policyForm, setPolicyForm] = useState({ name: '', retainYears: '7', actionAfter: 'archive', caseStatus: '', documentType: '' });
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Archive modal
  const [archivingCase, setArchivingCase] = useState<ArchivedCase | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [savingArchive, setSavingArchive] = useState(false);

  // Search for case to archive
  const [caseSearch, setCaseSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ArchivedCase[]>([]);
  const [searching, setSearching] = useState(false);

  // Delete request modal
  const [deleteForm, setDeleteForm] = useState({ entityType: 'case', entityId: '', reason: '' });
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [savingDelete, setSavingDelete] = useState(false);

  // Review modal
  const [reviewing, setReviewing] = useState<{ req: DeleteRequest; action: 'approve' | 'reject' } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Backup
  const [backupResult, setBackupResult] = useState<BackupResult>(null);
  const [runningBackup, setRunningBackup] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [polRes, arcRes, delRes] = await Promise.all([
        adminFetch('/api/admin/data-governance/retention'),
        adminFetch('/api/admin/data-governance/archived-cases'),
        adminFetch('/api/admin/data-governance/delete-requests'),
      ]);
      if (polRes.ok) setPolicies((await polRes.json()).data ?? []);
      if (arcRes.ok) setArchivedCases((await arcRes.json()).data ?? []);
      if (delRes.ok) setDeleteRequests((await delRes.json()).data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    try {
      const res = await adminFetch('/api/admin/data-governance/retention', {
        method: 'POST',
        body: JSON.stringify({
          name: policyForm.name,
          retainYears: Number(policyForm.retainYears),
          actionAfter: policyForm.actionAfter,
          caseStatus: policyForm.caseStatus || null,
          documentType: policyForm.documentType || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      const created = await res.json();
      setPolicies((p) => [created, ...p]);
      setShowPolicyForm(false);
      setPolicyForm({ name: '', retainYears: '7', actionAfter: 'archive', caseStatus: '', documentType: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleTogglePolicy = async (id: string, isActive: boolean) => {
    await adminFetch(`/api/admin/data-governance/retention/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !isActive }),
    });
    setPolicies((p) => p.map((pol) => pol.id === id ? { ...pol, isActive: !isActive } : pol));
  };

  const searchCases = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await adminFetch(`/api/admin/cases?q=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const json = await res.json();
        setSearchResults((json.data ?? []).filter((c: ArchivedCase) => !c.archivedAt));
      }
    } finally { setSearching(false); }
  };

  const handleArchiveCase = async () => {
    if (!archivingCase) return;
    setSavingArchive(true);
    try {
      const res = await adminFetch(`/api/admin/data-governance/archive-case/${archivingCase.id}`, {
        method: 'POST',
        body: JSON.stringify({ reason: archiveReason }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      setArchivingCase(null);
      setArchiveReason('');
      setSearchResults([]);
      setCaseSearch('');
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengarsip');
    } finally {
      setSavingArchive(false);
    }
  };

  const handleRestore = async (caseId: string) => {
    await adminFetch(`/api/admin/data-governance/restore-case/${caseId}`, { method: 'POST' });
    setArchivedCases((p) => p.filter((c) => c.id !== caseId));
  };

  const handleSubmitDeleteRequest = async () => {
    setSavingDelete(true);
    try {
      const res = await adminFetch('/api/admin/data-governance/delete-requests', {
        method: 'POST',
        body: JSON.stringify(deleteForm),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      const created = await res.json();
      setDeleteRequests((p) => [created, ...p]);
      setShowDeleteForm(false);
      setDeleteForm({ entityType: 'case', entityId: '', reason: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal submit');
    } finally {
      setSavingDelete(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewing) return;
    setSubmittingReview(true);
    try {
      const res = await adminFetch(`/api/admin/data-governance/delete-requests/${reviewing.req.id}/${reviewing.action}`, {
        method: 'POST',
        body: JSON.stringify({ note: reviewNote }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      const updated = await res.json();
      setDeleteRequests((p) => p.map((r) => r.id === reviewing.req.id ? updated : r));
      setReviewing(null);
      setReviewNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBackupTest = async () => {
    setRunningBackup(true);
    setBackupResult(null);
    try {
      const res = await adminFetch('/api/admin/data-governance/backup-test', { method: 'POST' });
      const json = await res.json();
      setBackupResult(json);
    } catch (e) {
      setBackupResult({ ok: false, error: String(e) });
    } finally {
      setRunningBackup(false);
    }
  };

  const pendingDeletes = deleteRequests.filter((r) => r.status === 'pending').length;

  return (
    <div>
      <p className="text-gray-600 mb-5 text-sm">
        Tata kelola data: retensi, arsip perkara, permintaan penghapusan permanen, dan uji backup.
      </p>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { key: 'retention', label: 'Retensi Data', icon: ShieldCheck },
          { key: 'archive', label: 'Arsip Perkara', icon: Archive },
          { key: 'delete', label: `Hapus Permanen${pendingDeletes > 0 ? ` (${pendingDeletes})` : ''}`, icon: Trash2 },
          { key: 'backup', label: 'Uji Backup', icon: HardDrive },
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

      {/* ── Retention Tab ── */}
      {tab === 'retention' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Kebijakan Retensi Data</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => loadData()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><RefreshCw size={14} /></button>
              <button
                type="button"
                onClick={() => setShowPolicyForm(!showPolicyForm)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#1B4965] text-white rounded-lg text-sm"
              >
                <Plus size={14} /> Tambah Policy
              </button>
            </div>
          </div>

          {showPolicyForm && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <p className="text-sm font-semibold text-blue-800">Policy Baru</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Nama Policy</label>
                  <input value={policyForm.name} onChange={(e) => setPolicyForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Perkara Selesai 7 Tahun" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Retensi (Tahun)</label>
                  <input type="number" min={1} max={30} value={policyForm.retainYears}
                    onChange={(e) => setPolicyForm((p) => ({ ...p, retainYears: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Aksi setelah periode</label>
                  <select value={policyForm.actionAfter} onChange={(e) => setPolicyForm((p) => ({ ...p, actionAfter: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="archive">Arsip</option>
                    <option value="notify">Notifikasi Admin</option>
                    <option value="delete_request">Buat Delete Request</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Berlaku untuk status perkara</label>
                  <input value={policyForm.caseStatus} onChange={(e) => setPolicyForm((p) => ({ ...p, caseStatus: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="closed (kosong = semua)" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPolicyForm(false)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700">Batal</button>
                <button type="button" onClick={handleSavePolicy} disabled={savingPolicy || !policyForm.name}
                  className="px-3 py-1.5 bg-[#1B4965] text-white rounded-lg text-sm disabled:opacity-60">
                  {savingPolicy ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Memuat...</div>
          ) : policies.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm bg-white rounded-xl border">Belum ada policy retensi</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Nama Policy</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Retensi</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Aksi Setelah</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Berlaku untuk</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-medium text-gray-900">{p.name}</td>
                      <td className="py-3 px-4 text-gray-700">{p.retainYears} tahun</td>
                      <td className="py-3 px-4 text-gray-700 capitalize">{p.actionAfter.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{p.caseStatus || p.documentType || 'Semua'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button type="button" onClick={() => handleTogglePolicy(p.id, p.isActive)}
                          className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">
                          {p.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Archive Tab ── */}
      {tab === 'archive' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Arsip Perkara</h2>
            <button type="button" onClick={() => loadData()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><RefreshCw size={14} /></button>
          </div>

          {/* Search to archive */}
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-semibold text-amber-800 mb-2">Arsip Perkara Baru</p>
            <div className="flex gap-2">
              <input
                value={caseSearch}
                onChange={(e) => { setCaseSearch(e.target.value); searchCases(e.target.value); }}
                placeholder="Cari perkara by judul..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            {searching && <p className="text-xs text-gray-400 mt-2">Mencari...</p>}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-white border border-gray-200 rounded-lg overflow-hidden">
                {searchResults.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setArchivingCase(c); setSearchResults([]); setCaseSearch(''); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <p className="text-sm font-medium text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-400">{(c as unknown as { client?: { name: string } }).client?.name ?? '–'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {archivingCase && (
            <div className="mb-4 p-4 bg-white border border-amber-300 rounded-xl space-y-3">
              <p className="text-sm font-semibold text-gray-800">Arsip: <span className="text-amber-700">{archivingCase.title}</span></p>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Alasan Pengarsipan</label>
                <input value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. Perkara selesai, masa retensi 7 tahun dimulai" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setArchivingCase(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700">Batal</button>
                <button type="button" onClick={handleArchiveCase} disabled={savingArchive}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm disabled:opacity-60">
                  {savingArchive ? 'Mengarsip...' : 'Arsip Perkara'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Memuat...</div>
          ) : archivedCases.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm bg-white rounded-xl border">Belum ada perkara yang diarsip</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Perkara</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Klien</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Diarsip</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Alasan</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {archivedCases.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{c.title}</p>
                        {c.caseNumber && <p className="text-xs text-gray-400">#{c.caseNumber}</p>}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{c.client?.name ?? '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{fmtDate(c.archivedAt)}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs max-w-[200px] truncate">{c.archivedReason ?? '—'}</td>
                      <td className="py-3 px-4">
                        <button type="button" onClick={() => handleRestore(c.id)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">
                          <RotateCcw size={11} /> Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Delete Requests Tab ── */}
      {tab === 'delete' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Permintaan Hapus Permanen</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => loadData()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><RefreshCw size={14} /></button>
              <button type="button" onClick={() => setShowDeleteForm(!showDeleteForm)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm">
                <Plus size={14} /> Ajukan Hapus
              </button>
            </div>
          </div>

          {showDeleteForm && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-red-800">Ajukan Permintaan Hapus Permanen</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipe Entity</label>
                  <select value={deleteForm.entityType} onChange={(e) => setDeleteForm((p) => ({ ...p, entityType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="case">Perkara (Case)</option>
                    <option value="document">Dokumen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">ID Entity</label>
                  <input value={deleteForm.entityId} onChange={(e) => setDeleteForm((p) => ({ ...p, entityId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-xs"
                    placeholder="UUID..." />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Alasan Penghapusan</label>
                <textarea value={deleteForm.reason} onChange={(e) => setDeleteForm((p) => ({ ...p, reason: e.target.value }))}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Jelaskan alasan penghapusan permanen..." />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowDeleteForm(false)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700">Batal</button>
                <button type="button" onClick={handleSubmitDeleteRequest} disabled={savingDelete || !deleteForm.entityId}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm disabled:opacity-60">
                  {savingDelete ? 'Mengajukan...' : 'Ajukan'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Memuat...</div>
          ) : deleteRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm bg-white rounded-xl border">Belum ada permintaan penghapusan</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Entity</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Alasan</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Diajukan</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {deleteRequests.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 capitalize">{r.entityType}</p>
                        <p className="text-xs text-gray-400 max-w-[180px] truncate">{r.entityTitle ?? r.entityId}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs max-w-[200px]">{r.reason ?? '—'}</td>
                      <td className="py-3 px-4 text-gray-500">{fmtDate(r.requestedAt)}</td>
                      <td className="py-3 px-4"><StatusPill status={r.status} /></td>
                      <td className="py-3 px-4">
                        {r.status === 'pending' && (
                          <div className="flex gap-1">
                            <button type="button"
                              onClick={() => { setReviewing({ req: r, action: 'approve' }); setReviewNote(''); }}
                              className="flex items-center gap-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded">
                              <CheckCircle2 size={11} /> Setujui
                            </button>
                            <button type="button"
                              onClick={() => { setReviewing({ req: r, action: 'reject' }); setReviewNote(''); }}
                              className="flex items-center gap-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded">
                              <XCircle size={11} /> Tolak
                            </button>
                          </div>
                        )}
                        {r.status !== 'pending' && r.reviewNote && (
                          <span className="text-xs text-gray-400">{r.reviewNote}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Backup Tab ── */}
      {tab === 'backup' && (
        <div>
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Uji Koneksi & Kesiapan Backup</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <HardDrive className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Backup Readiness Test</p>
                <p className="text-xs text-gray-500 mt-1">
                  Menguji konektivitas database, menghitung jumlah entitas aktif, dan mencatat hasil ke audit log.
                  Jalankan sebelum prosedur backup manual.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleBackupTest}
              disabled={runningBackup}
              className="w-full py-2.5 bg-[#1B4965] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {runningBackup ? <><RefreshCw size={14} className="animate-spin" /> Menguji...</> : <><HardDrive size={14} /> Jalankan Backup Test</>}
            </button>

            {backupResult && (
              <div className={`mt-4 p-4 rounded-xl border text-sm ${backupResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {backupResult.ok
                    ? <CheckCircle2 className="text-green-600 w-5 h-5" />
                    : <XCircle className="text-red-600 w-5 h-5" />}
                  <span className={`font-semibold ${backupResult.ok ? 'text-green-800' : 'text-red-800'}`}>
                    {backupResult.ok ? 'Database terhubung & siap backup' : 'Test gagal'}
                  </span>
                </div>
                {backupResult.ok ? (
                  <>
                    <p className="text-xs text-gray-600 mb-2">Waktu: {fmtDate(backupResult.testedAt ?? null)} · Latensi: {backupResult.durationMs}ms</p>
                    {backupResult.counts && (
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(backupResult.counts).map(([k, v]) => (
                          <div key={k} className="text-center bg-white rounded-lg p-2 border border-green-200">
                            <p className="text-lg font-bold text-green-700">{v}</p>
                            <p className="text-xs text-gray-500 capitalize">{k}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-red-700">{backupResult.error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Review Modal ── */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {reviewing.action === 'approve' ? 'Setujui Penghapusan' : 'Tolak Permintaan'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{reviewing.req.entityTitle ?? reviewing.req.entityId}</p>
            </div>
            <div className="p-5 space-y-4">
              {reviewing.action === 'approve' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  Perhatian: Data akan ditandai dihapus secara permanen dan tidak dapat dipulihkan.
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Review</label>
                <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Opsional..." />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setReviewing(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm">Batal</button>
                <button type="button" onClick={handleReviewSubmit} disabled={submittingReview}
                  className={`flex-1 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-60 ${reviewing.action === 'approve' ? 'bg-red-600' : 'bg-gray-700'}`}>
                  {submittingReview ? 'Memproses...' : reviewing.action === 'approve' ? 'Ya, Hapus' : 'Tolak'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
