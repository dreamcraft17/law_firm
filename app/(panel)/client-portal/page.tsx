'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/api-client';
import { CheckCircle2, Circle, Link2, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

type MilestoneItem = { id: string; name: string; status?: string; completedAt?: string | null };

type CaseItem = {
  id: string;
  title: string;
  caseNumber: string | null;
  status: string;
  client: { name: string } | null;
};

type InvoiceItem = {
  id: string;
  invoiceNumber: string;
  status: string;
  amount: number | null;
  dueDate: string | null;
  paymentUrl: string | null;
  client: { name: string } | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

function MilestoneBar({ milestones }: { milestones: MilestoneItem[] }) {
  const total = milestones.length;
  if (total === 0) return <span className="text-xs text-gray-400">–</span>;
  const done = milestones.filter(
    (m) => m.status === 'completed' || m.completedAt != null
  ).length;
  const pct = Math.round((done / total) * 100);
  const color = pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : 'bg-amber-400';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 shrink-0">{done}/{total}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    closed: 'bg-gray-100 text-gray-600',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    active: 'Aktif', pending: 'Pending', closed: 'Tutup', paid: 'Lunas', overdue: 'Jatuh Tempo',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function ClientPortalPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment URL edit state
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Case expand state with lazy milestone loading
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [caseMilestones, setCaseMilestones] = useState<Record<string, MilestoneItem[]>>({});
  const [loadingMilestones, setLoadingMilestones] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [casesRes, invRes] = await Promise.all([
        adminFetch('/api/admin/cases?limit=100&status=active'),
        adminFetch('/api/admin/billing/invoices?limit=200'),
      ]);
      if (!casesRes.ok) throw new Error(casesRes.statusText);
      if (!invRes.ok) throw new Error(invRes.statusText);

      const casesJson = await casesRes.json();
      const invJson = await invRes.json();

      const caseList: CaseItem[] = (Array.isArray(casesJson.data) ? casesJson.data : []).map((c: CaseItem) => ({
        id: c.id,
        title: c.title,
        caseNumber: c.caseNumber,
        status: c.status,
        client: c.client ?? null,
      }));

      const invList: InvoiceItem[] = (Array.isArray(invJson.data) ? invJson.data : []).map((inv: InvoiceItem) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber ?? inv.id,
        status: inv.status,
        amount: inv.amount != null ? Number(inv.amount) : null,
        dueDate: inv.dueDate ?? null,
        paymentUrl: inv.paymentUrl ?? null,
        client: inv.client ?? null,
      }));

      setCases(caseList);
      setInvoices(invList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveUrl = async (invoiceId: string) => {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/billing/invoices/${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentUrl: editUrl || null }),
      });
      if (!res.ok) throw new Error(res.statusText);
      setEditingInvoiceId(null);
      setInvoices((prev) => prev.map((inv) => inv.id === invoiceId ? { ...inv, paymentUrl: editUrl || null } : inv));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const loadMilestones = async (caseId: string) => {
    if (caseMilestones[caseId]) return; // already loaded
    setLoadingMilestones(caseId);
    try {
      const res = await adminFetch(`/api/admin/cases/${caseId}/milestones`);
      if (res.ok) {
        const json = await res.json();
        const list: MilestoneItem[] = (Array.isArray(json.data) ? json.data : []).map((m: MilestoneItem) => ({
          id: m.id, name: m.name, status: m.status, completedAt: m.completedAt ?? null,
        }));
        setCaseMilestones((prev) => ({ ...prev, [caseId]: list }));
      }
    } finally {
      setLoadingMilestones(null);
    }
  };

  const withPaymentUrl = invoices.filter((inv) => inv.paymentUrl);
  const unpaidInvoices = invoices.filter((inv) => inv.status !== 'paid');

  return (
    <div>
      <p className="text-gray-600 mb-5 text-sm">
        Kelola portal klien: pantau progres perkara aktif dan atur tautan pembayaran invoice.
      </p>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Perkara Aktif', value: cases.length, color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { label: 'Invoice Belum Bayar', value: unpaidInvoices.length, color: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: 'Ada Link Bayar', value: withPaymentUrl.length, color: 'text-green-700 bg-green-50 border-green-200' },
          { label: 'Belum Ada Link', value: unpaidInvoices.filter((i) => !i.paymentUrl).length, color: 'text-red-700 bg-red-50 border-red-200' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium opacity-80 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* Cases progress section */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Progres Perkara Aktif</h2>
        <button type="button" onClick={() => load()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <RefreshCw size={15} />
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl border mb-6">Memuat...</div>
      ) : cases.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-white rounded-xl border mb-6 text-sm">Tidak ada perkara aktif</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Perkara</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Klien</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 w-44">Progres Milestone</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const isExpanded = expandedCase === c.id;
                const milestones = caseMilestones[c.id] ?? [];
                const isLoadingMs = loadingMilestones === c.id;
                return (
                  <>
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 truncate max-w-[220px]">{c.title}</p>
                        {c.caseNumber && <p className="text-xs text-gray-400">#{c.caseNumber}</p>}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{c.client?.name ?? '—'}</td>
                      <td className="py-3 px-4"><StatusBadge status={c.status} /></td>
                      <td className="py-3 px-4">
                        {milestones.length > 0
                          ? <MilestoneBar milestones={milestones} />
                          : <span className="text-xs text-gray-400">{isLoadingMs ? 'Memuat...' : '–'}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!isExpanded) await loadMilestones(c.id);
                            setExpandedCase(isExpanded ? null : c.id);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${c.id}-detail`} className="bg-gray-50 border-b border-gray-100">
                        <td colSpan={5} className="px-6 py-3">
                          {milestones.length === 0 ? (
                            <p className="text-xs text-gray-400">Belum ada milestone</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                              {milestones.map((m) => {
                                const done = m.status === 'completed' || m.completedAt != null;
                                return (
                                  <div key={m.id} className="flex items-center gap-2">
                                    {done
                                      ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                      : <Circle size={13} className="text-gray-300 shrink-0" />}
                                    <span className={done ? 'text-gray-600 line-through' : 'text-gray-700'}>{m.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice payment URL section */}
      <h2 className="text-base font-semibold text-gray-900 mb-3">Tautan Pembayaran Invoice</h2>
      {loading ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl border">Memuat...</div>
      ) : invoices.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-white rounded-xl border text-sm">Belum ada invoice</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Invoice</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Klien</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Jumlah</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Link Bayar</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const isEditing = editingInvoiceId === inv.id;
                return (
                  <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-medium text-gray-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 text-gray-700">{inv.client?.name ?? '—'}</td>
                    <td className="py-3 px-4 text-gray-700">
                      {inv.amount != null ? fmt(inv.amount) : '—'}
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={inv.status} /></td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            placeholder="https://payment.example.com/..."
                            className="border border-gray-300 rounded px-2 py-1 text-xs w-52"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveUrl(inv.id)}
                            disabled={saving}
                            className="px-2.5 py-1 bg-[#1B4965] text-white rounded text-xs font-medium disabled:opacity-60"
                          >
                            {saving ? '...' : 'Simpan'}
                          </button>
                          <button type="button" onClick={() => setEditingInvoiceId(null)} className="px-2 py-1 text-gray-500 text-xs hover:bg-gray-100 rounded">
                            Batal
                          </button>
                        </div>
                      ) : inv.paymentUrl ? (
                        <a
                          href={inv.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-blue-600 hover:underline text-xs"
                        >
                          <Link2 size={12} />
                          <span className="truncate max-w-[140px]">{inv.paymentUrl}</span>
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Belum diset</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {inv.status !== 'paid' && !isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInvoiceId(inv.id);
                            setEditUrl(inv.paymentUrl ?? '');
                          }}
                          className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
                        >
                          {inv.paymentUrl ? 'Edit' : 'Set'}
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
  );
}
