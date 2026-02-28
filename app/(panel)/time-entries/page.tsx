'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Clock, CheckCircle, FileText } from 'lucide-react';

type TimeEntryItem = {
  id: string;
  caseId: string;
  taskId?: string | null;
  userId: string;
  description?: string | null;
  hours: number | string;
  billable: boolean;
  rate?: number | string | null;
  approvedAt?: string | null;
  invoiceId?: string | null;
  workDate: string;
  case?: { id: string; title: string; clientId?: string | null } | null;
  user?: { id: string; name: string | null } | null;
  task?: { id: string; title: string } | null;
};

type CaseOption = { id: string; title: string; caseNumber?: string | null };

function formatRp(n: number | string) {
  const x = typeof n === 'string' ? parseFloat(n) : n;
  if (Number.isNaN(x)) return '—';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(x);
}

export default function TimeEntriesPage() {
  const [list, setList] = useState<TimeEntryItem[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCaseId, setFilterCaseId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [generateModal, setGenerateModal] = useState(false);
  const [generateClientId, setGenerateClientId] = useState('');
  const [generateDueDate, setGenerateDueDate] = useState('');
  const [generateSubmitting, setGenerateSubmitting] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filterCaseId
        ? adminEndpoints.timeEntriesByCase(filterCaseId)
        : adminEndpoints.timeEntriesList();
      const res = await adminFetch(url);
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setList(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }, [filterCaseId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminFetch(adminEndpoints.casesList()).then((r) => r.ok && r.json()).then((j) => {
      setCases(Array.isArray(j?.data) ? j.data : []);
    }).catch(() => {});
    adminFetch(adminEndpoints.clientsList()).then((r) => r.ok && r.json()).then((j) => {
      setClients(Array.isArray(j?.data) ? j.data : []);
    }).catch(() => {});
  }, []);

  const approve = async (id: string) => {
    setApprovingId(id);
    try {
      const res = await adminFetch(adminEndpoints.timeEntryApprove(id), { method: 'POST' });
      if (!res.ok) throw new Error(res.statusText);
      await load();
      setSelectedIds((prev) => new Set(prev));
    } catch {
      // ignore
    } finally {
      setApprovingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllApprovedNotInvoiced = () => {
    const ids = list
      .filter((e) => e.approvedAt && !e.invoiceId)
      .map((e) => e.id);
    setSelectedIds(new Set(ids));
  };

  const canGenerate = selectedIds.size > 0 && list.every((e) => {
    if (!selectedIds.has(e.id)) return true;
    return e.approvedAt && !e.invoiceId;
  });

  const openGenerateModal = () => {
    const first = list.find((e) => selectedIds.has(e.id));
    setGenerateClientId(first?.case?.clientId ?? '');
    setGenerateDueDate('');
    setGenerateError(null);
    setGenerateModal(true);
  };

  const submitGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateClientId || selectedIds.size === 0) return;
    setGenerateSubmitting(true);
    setGenerateError(null);
    try {
      const res = await adminFetch(adminEndpoints.invoiceFromTimeEntries(), {
        method: 'POST',
        body: JSON.stringify({
          timeEntryIds: Array.from(selectedIds),
          clientId: generateClientId,
          dueDate: generateDueDate || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? res.statusText);
      setGenerateModal(false);
      setSelectedIds(new Set());
      await load();
      if (data.id) window.location.href = `/billing?highlight=${data.id}`;
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Gagal membuat invoice');
    } finally {
      setGenerateSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Clock className="w-6 h-6 text-[#1B4965]" />
          Time Tracking & Billing
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 items-center">
          <select
            value={filterCaseId}
            onChange={(e) => setFilterCaseId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[200px]"
          >
            <option value="">Semua perkara</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.title || c.caseNumber || c.id}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={selectAllApprovedNotInvoiced}
            className="px-3 py-2 text-sm text-[#1B4965] border border-[#1B4965] rounded-lg hover:bg-[#1B4965]/5"
          >
            Pilih semua (disetujui & belum di-invoice)
          </button>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={openGenerateModal}
              disabled={!canGenerate}
              className="px-4 py-2 text-sm bg-[#1B4965] text-white rounded-lg hover:bg-[#153a52] disabled:opacity-50 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Buat Invoice ({selectedIds.size} entri)
            </button>
          )}
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        )}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border-b border-red-100">{error}</div>
        )}
        {!loading && !error && list.length === 0 && (
          <div className="p-8 text-center text-gray-500">Belum ada time entry.</div>
        )}
        {!loading && list.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-3 font-medium text-gray-600 w-10">#</th>
                  <th className="text-left p-3 font-medium text-gray-600">Perkara</th>
                  <th className="text-left p-3 font-medium text-gray-600">Pengacara</th>
                  <th className="text-left p-3 font-medium text-gray-600">Tanggal</th>
                  <th className="text-right p-3 font-medium text-gray-600">Jam</th>
                  <th className="text-right p-3 font-medium text-gray-600">Rate</th>
                  <th className="text-right p-3 font-medium text-gray-600">Jumlah</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const hours = Number(e.hours);
                  const rate = e.rate != null ? Number(e.rate) : 0;
                  const amount = hours * rate;
                  const canSelect = !!e.approvedAt && !e.invoiceId;
                  return (
                    <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-3">
                        {canSelect ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(e.id)}
                            onChange={() => toggleSelect(e.id)}
                            className="rounded border-gray-300"
                          />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Link href={`/cases?id=${e.caseId}`} className="text-[#1B4965] hover:underline">
                          {e.case?.title ?? e.caseId}
                        </Link>
                        {e.task && (
                          <span className="text-gray-500 text-xs block">Task: {e.task.title}</span>
                        )}
                      </td>
                      <td className="p-3">{e.user?.name ?? e.userId}</td>
                      <td className="p-3 text-gray-600">{new Date(e.workDate).toLocaleDateString('id-ID')}</td>
                      <td className="p-3 text-right">{hours.toFixed(2)}</td>
                      <td className="p-3 text-right">{rate ? formatRp(rate) : '—'}</td>
                      <td className="p-3 text-right font-medium">{formatRp(amount)}</td>
                      <td className="p-3">
                        {e.invoiceId ? (
                          <Link href={`/billing?highlight=${e.invoiceId}`} className="text-[#1B4965] hover:underline flex items-center gap-1">
                            <FileText className="w-4 h-4" /> Invoice
                          </Link>
                        ) : e.approvedAt ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Disetujui
                          </span>
                        ) : (
                          <span className="text-amber-600">Menunggu persetujuan</span>
                        )}
                      </td>
                      <td className="p-3">
                        {!e.approvedAt && (
                          <button
                            type="button"
                            onClick={() => approve(e.id)}
                            disabled={!!approvingId}
                            className="text-sm text-[#1B4965] hover:underline disabled:opacity-50"
                          >
                            {approvingId === e.id ? '...' : 'Setujui'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {generateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Buat Invoice dari Time Entries</h2>
            <form onSubmit={submitGenerateInvoice}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Klien *</label>
                <select
                  value={generateClientId}
                  onChange={(e) => setGenerateClientId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                >
                  <option value="">— Pilih klien —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Jatuh tempo (opsional)</label>
                <input
                  type="date"
                  value={generateDueDate}
                  onChange={(e) => setGenerateDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              {generateError && (
                <p className="text-sm text-red-600 mb-3">{generateError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setGenerateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={generateSubmitting}
                  className="px-4 py-2 bg-[#1B4965] text-white rounded-lg hover:bg-[#153a52] disabled:opacity-50"
                >
                  {generateSubmitting ? 'Memproses...' : 'Buat Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
