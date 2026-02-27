'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Filter, Wallet, FileText, Percent } from 'lucide-react';

function TrustAccountsSection(props: { clients: Client[]; formatRp: (n: number | string) => string }) {
  const [clientId, setClientId] = useState('');
  const [account, setAccount] = useState<{ balance: number; currency: string; transactions?: { type: string; amount: number; note?: string; createdAt: string }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [txType, setTxType] = useState<'deposit' | 'drawdown'>('deposit');
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!clientId) {
      setAccount(null);
      return;
    }
    setLoading(true);
    try {
      const res = await adminFetch(adminEndpoints.trustAccountByClient(clientId));
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setAccount({
        balance: Number(data.balance ?? 0),
        currency: data.currency ?? 'IDR',
        transactions: (data.transactions ?? []).slice(0, 10).map((t: { type: string; amount: number; note?: string; createdAt: string }) => ({
          type: t.type,
          amount: Number(t.amount),
          note: t.note,
          createdAt: t.createdAt,
        })),
      });
    } catch {
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const handleSubmitTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !txAmount || Number(txAmount) <= 0) return;
    setSubmitting(true);
    try {
      const res = await adminFetch(adminEndpoints.trustAccountByClient(clientId), {
        method: 'POST',
        body: JSON.stringify({ type: txType, amount: Number(txAmount), note: txNote || undefined }),
      });
      if (!res.ok) throw new Error(res.statusText);
      setTxAmount('');
      setTxNote('');
      loadAccount();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <Wallet className="w-5 h-5" />
        Trust / Retainer
      </h2>
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Klien</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 w-56">
            <option value="">— Pilih klien —</option>
            {props.clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {clientId && (
          <>
            {loading ? (
              <span className="text-sm text-gray-500">Memuat...</span>
            ) : account ? (
              <p className="text-sm">
                Saldo: <strong>{props.formatRp(account.balance)}</strong> {account.currency}
              </p>
            ) : null}
          </>
        )}
      </div>
      {clientId && account && (
        <form onSubmit={handleSubmitTx} className="flex flex-wrap gap-3 items-end mb-4">
          <select value={txType} onChange={(e) => setTxType(e.target.value as 'deposit' | 'drawdown')} className="border border-gray-300 rounded-lg px-3 py-2">
            <option value="deposit">Deposit</option>
            <option value="drawdown">Drawdown</option>
          </select>
          <input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="Jumlah" className="border border-gray-300 rounded-lg px-3 py-2 w-32" min={0.01} step={0.01} />
          <input type="text" value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder="Catatan" className="border border-gray-300 rounded-lg px-3 py-2 w-48" />
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm disabled:opacity-50">
            {submitting ? '...' : 'Proses'}
          </button>
        </form>
      )}
      {account?.transactions && account.transactions.length > 0 && (
        <div className="text-xs text-gray-600 border-t pt-3 mt-3">
          <p className="font-medium mb-1">Riwayat terakhir:</p>
          <ul>
            {account.transactions.map((t, i) => (
              <li key={i}>{t.type} {t.amount >= 0 ? '+' : ''}{props.formatRp(t.amount)} — {new Date(t.createdAt).toLocaleString('id-ID')} {t.note ? `— ${t.note}` : ''}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type Client = { id: string; name: string };
type Invoice = {
  id: string;
  invoiceNumber?: string | null;
  status: string;
  amount: number | string;
  paidAmount?: number | string;
  clientId?: string | null;
  client?: Client | null;
  dueDate?: string | null;
  createdAt: string;
  writeOffAmount?: number | null;
  writeOffReason?: string | null;
  taxRate?: number | null;
  currency?: string | null;
};

type SavedViewItem = { id: string; name: string; entityType: string; filters: Record<string, string> };

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState<{ totalInvoices?: number; totalAmount?: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [amount, setAmount] = useState('');
  const [clientId, setClientId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [savedViews, setSavedViews] = useState<SavedViewItem[]>([]);
  const [selectedViewId, setSelectedViewId] = useState('');
  const [invoiceDetail, setInvoiceDetail] = useState<Invoice | null>(null);
  const [writeOffAmount, setWriteOffAmount] = useState('');
  const [writeOffReason, setWriteOffReason] = useState('');
  const [writeOffSubmitting, setWriteOffSubmitting] = useState(false);
  const [rateRules, setRateRules] = useState<{ id: string; caseId?: string | null; userId?: string | null; activityType?: string | null; rateType: string; rate: number; effectiveFrom?: string | null; effectiveTo?: string | null }[]>([]);
  const [rateRuleModal, setRateRuleModal] = useState(false);
  const [rateRuleForm, setRateRuleForm] = useState({ caseId: '', userId: '', activityType: '', rateType: 'hourly', rate: '', effectiveFrom: '', effectiveTo: '' });
  const [rateRuleSaving, setRateRuleSaving] = useState(false);
  const [creditNotes, setCreditNotes] = useState<{ id: string; invoiceId: string; amount: number; reason?: string | null; status: string }[]>([]);
  const [creditNoteModal, setCreditNoteModal] = useState(false);
  const [creditNoteForm, setCreditNoteForm] = useState({ invoiceId: '', amount: '', reason: '' });
  const [creditNoteSaving, setCreditNoteSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { status?: string; clientId?: string; from?: string; to?: string } = {};
      if (filterStatus) params.status = filterStatus;
      if (filterClientId) params.clientId = filterClientId;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const res = await adminFetch(adminEndpoints.billingInvoices(params));
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setInvoices(Array.isArray(json.data) ? json.data : []);
      setSummary(json.summary ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterClientId, filterFrom, filterTo]);

  const loadClients = async () => {
    try {
      const res = await adminFetch(adminEndpoints.clientsList());
      if (!res.ok) return;
      const json = await res.json();
      setClients(Array.isArray(json.data) ? json.data : []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    load();
    loadClients();
  }, [load]);

  useEffect(() => {
    adminFetch(adminEndpoints.savedViewsList()).then((r) => r.ok && r.json()).then((j) => {
      const data = (j?.data ?? []).filter((v: SavedViewItem) => v.entityType === 'invoice');
      setSavedViews(data);
    }).catch(() => {});
  }, []);

  const loadRateRules = useCallback(async () => {
    try {
      const res = await adminFetch(adminEndpoints.rateRulesList());
      if (!res.ok) return;
      const json = await res.json();
      setRateRules(Array.isArray(json.data) ? json.data : []);
    } catch {
      setRateRules([]);
    }
  }, []);
  const loadCreditNotes = useCallback(async () => {
    try {
      const res = await adminFetch(adminEndpoints.creditNotesList());
      if (!res.ok) return;
      const json = await res.json();
      setCreditNotes(Array.isArray(json.data) ? json.data : []);
    } catch {
      setCreditNotes([]);
    }
  }, []);

  useEffect(() => {
    loadRateRules();
    loadCreditNotes();
  }, [loadRateRules, loadCreditNotes]);

  const openInvoiceDetail = async (inv: Invoice) => {
    try {
      const res = await adminFetch(adminEndpoints.invoiceDetail(inv.id));
      if (!res.ok) return;
      const data = await res.json();
      setInvoiceDetail(data);
      setWriteOffAmount('');
      setWriteOffReason('');
    } catch {
      setInvoiceDetail(null);
    }
  };

  const handleWriteOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceDetail || !writeOffAmount || Number(writeOffAmount) <= 0) return;
    setWriteOffSubmitting(true);
    try {
      const res = await adminFetch(adminEndpoints.invoiceWriteOff(invoiceDetail.id), {
        method: 'POST',
        body: JSON.stringify({ amount: Number(writeOffAmount), reason: writeOffReason || undefined }),
      });
      if (!res.ok) throw new Error(res.statusText);
      setInvoiceDetail(null);
      setWriteOffAmount('');
      setWriteOffReason('');
      load();
    } catch {
      // ignore
    } finally {
      setWriteOffSubmitting(false);
    }
  };

  const handleRateRuleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateRuleForm.rate || Number(rateRuleForm.rate) <= 0) return;
    setRateRuleSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.rateRuleCreate(), {
        method: 'POST',
        body: JSON.stringify({
          caseId: rateRuleForm.caseId || null,
          userId: rateRuleForm.userId || null,
          activityType: rateRuleForm.activityType.trim() || null,
          rateType: rateRuleForm.rateType,
          rate: Number(rateRuleForm.rate),
          effectiveFrom: rateRuleForm.effectiveFrom || null,
          effectiveTo: rateRuleForm.effectiveTo || null,
        }),
      });
      if (!res.ok) throw new Error(res.statusText);
      setRateRuleModal(false);
      setRateRuleForm({ caseId: '', userId: '', activityType: '', rateType: 'hourly', rate: '', effectiveFrom: '', effectiveTo: '' });
      loadRateRules();
    } catch {
      // ignore
    } finally {
      setRateRuleSaving(false);
    }
  };

  const handleCreditNoteCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditNoteForm.invoiceId || !creditNoteForm.amount || Number(creditNoteForm.amount) <= 0) return;
    setCreditNoteSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.creditNoteCreate(), {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: creditNoteForm.invoiceId,
          amount: Number(creditNoteForm.amount),
          reason: creditNoteForm.reason.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(res.statusText);
      setCreditNoteModal(false);
      setCreditNoteForm({ invoiceId: '', amount: '', reason: '' });
      loadCreditNotes();
    } catch {
      // ignore
    } finally {
      setCreditNoteSaving(false);
    }
  };

  const applySavedView = (v: SavedViewItem) => {
    setSelectedViewId(v.id);
    const f = v.filters || {};
    setFilterStatus(f.status ?? '');
    setFilterClientId(f.clientId ?? '');
    setFilterFrom(f.from ?? '');
    setFilterTo(f.to ?? '');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.billingInvoices(), {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount) || 0,
          status: 'draft',
          clientId: clientId.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      setAmount('');
      setClientId('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal buat invoice');
    } finally {
      setCreating(false);
    }
  };

  const formatRp = (n: number | string) => `Rp ${Number(n).toLocaleString('id-ID')}`;

  return (
    <div>
      <p className="text-gray-600 mb-2">W5 — Billing and Finance System</p>
      <p className="text-sm text-gray-500 mb-2">
        Invoice = tagihan ke <strong>Client</strong>. Pilih client agar jelas invoice untuk siapa.
      </p>
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <Filter className="w-4 h-4 text-slate-500" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">Semua status</option>
          <option value="draft">draft</option>
          <option value="sent">sent</option>
          <option value="partial_paid">partial_paid</option>
          <option value="paid">paid</option>
          <option value="overdue">overdue</option>
        </select>
        <select value={filterClientId} onChange={(e) => setFilterClientId(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">Semua klien</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
        <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
        <select value={selectedViewId} onChange={(e) => { const id = e.target.value; setSelectedViewId(id); const v = savedViews.find((x) => x.id === id); if (v) applySavedView(v); }} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">Tampilan tersimpan</option>
          {savedViews.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Ringkasan</h2>
        <p className="text-sm text-gray-600">
          Total invoice: <strong>{summary.totalInvoices ?? 0}</strong> — Total amount:{' '}
          <strong>{formatRp(summary.totalAmount ?? 0)}</strong>
        </p>
      </div>

      <TrustAccountsSection clients={clients} formatRp={formatRp} />

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Percent className="w-5 h-5" />
          Rate Rules (per case / activity / blended)
        </h2>
        <p className="text-sm text-gray-500 mb-3">Atur tarif per kasus, per aktivitas, atau override per time entry.</p>
        <button type="button" onClick={() => setRateRuleModal(true)} className="mb-3 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-sm hover:bg-slate-200">
          Tambah Rate Rule
        </button>
        {rateRules.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada rate rule.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Rate type</th>
                  <th className="text-left p-2">Rate</th>
                  <th className="text-left p-2">Case / User / Activity</th>
                  <th className="text-left p-2">Effective</th>
                </tr>
              </thead>
              <tbody>
                {rateRules.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="p-2">{r.rateType}</td>
                    <td className="p-2">{formatRp(r.rate)}</td>
                    <td className="p-2 text-gray-600">{r.caseId ? `Case ${r.caseId.slice(0, 8)}` : r.userId ? `User ${r.userId.slice(0, 8)}` : r.activityType || '—'}</td>
                    <td className="p-2 text-gray-500">{r.effectiveFrom ? new Date(r.effectiveFrom).toLocaleDateString('id-ID') : '—'} s/d {r.effectiveTo ? new Date(r.effectiveTo).toLocaleDateString('id-ID') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Credit Notes & Refund
        </h2>
        <button type="button" onClick={() => setCreditNoteModal(true)} className="mb-3 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-sm hover:bg-slate-200">
          Tambah Credit Note
        </button>
        {creditNotes.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada credit note.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Invoice</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Reason</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {creditNotes.map((cn) => (
                  <tr key={cn.id} className="border-t border-gray-100">
                    <td className="p-2 font-mono text-xs">{cn.invoiceId.slice(0, 8)}…</td>
                    <td className="p-2 text-right">{formatRp(cn.amount)}</td>
                    <td className="p-2 text-gray-600">{cn.reason || '—'}</td>
                    <td className="p-2">{cn.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Buat Invoice</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Client (opsional)</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-56"
            >
              <option value="">— Pilih client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Amount (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-48"
              placeholder="0"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm disabled:opacity-50"
          >
            {creating ? '...' : 'Buat Invoice'}
          </button>
        </form>
      </div>
      <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h2 className="font-semibold text-gray-800 p-4 border-b">Daftar Invoice</h2>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Belum ada invoice.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">No / ID</th>
                  <th className="text-left p-3">Client</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-left p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-gray-100">
                    <td className="p-3 font-mono text-xs">
                      {inv.invoiceNumber ?? inv.id.slice(0, 8)}…
                    </td>
                    <td className="p-3">{inv.client?.name ?? '—'}</td>
                    <td className="p-3">{inv.status}</td>
                    <td className="p-3 text-right">{formatRp(inv.amount)} {inv.currency ?? ''}</td>
                    <td className="p-3 text-gray-500">{new Date(inv.createdAt).toLocaleDateString('id-ID')}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => openInvoiceDetail(inv)} className="text-[#1B4965] hover:underline text-sm">
                        Detail / Write-off
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {invoiceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Detail Invoice — Write-off / Pajak</h2>
              <button type="button" onClick={() => setInvoiceDetail(null)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <p><strong>No:</strong> {invoiceDetail.invoiceNumber ?? invoiceDetail.id.slice(0, 8)}</p>
              <p><strong>Client:</strong> {invoiceDetail.client?.name ?? '—'}</p>
              <p><strong>Amount:</strong> {formatRp(invoiceDetail.amount)} {invoiceDetail.currency ?? 'IDR'}</p>
              <p><strong>Tax rate:</strong> {invoiceDetail.taxRate != null ? `${Number(invoiceDetail.taxRate) * 100}%` : '—'}</p>
              <p><strong>Write-off:</strong> {invoiceDetail.writeOffAmount != null ? formatRp(invoiceDetail.writeOffAmount) + (invoiceDetail.writeOffReason ? ` — ${invoiceDetail.writeOffReason}` : '') : '—'}</p>
            </div>
            <form onSubmit={handleWriteOff} className="p-4 border-t space-y-2">
              <p className="font-medium text-gray-700">Write-off (sebelum kirim invoice)</p>
              <input type="number" value={writeOffAmount} onChange={(e) => setWriteOffAmount(e.target.value)} placeholder="Jumlah write-off" className="w-full border border-gray-300 rounded-lg px-3 py-2" min={0} step={0.01} />
              <input type="text" value={writeOffReason} onChange={(e) => setWriteOffReason(e.target.value)} placeholder="Alasan" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              <div className="flex gap-2">
                <button type="submit" disabled={writeOffSubmitting || !writeOffAmount} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm disabled:opacity-50">Write-off</button>
                <button type="button" onClick={() => setInvoiceDetail(null)} className="px-4 py-2 border border-gray-300 rounded-lg">Tutup</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rateRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Tambah Rate Rule</h2>
              <button type="button" onClick={() => setRateRuleModal(false)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <form onSubmit={handleRateRuleCreate} className="p-4 space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate type</label>
                <select value={rateRuleForm.rateType} onChange={(e) => setRateRuleForm((f) => ({ ...f, rateType: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="hourly">hourly</option>
                  <option value="per_case">per_case</option>
                  <option value="per_activity">per_activity</option>
                  <option value="blended">blended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (Rp) *</label>
                <input type="number" value={rateRuleForm.rate} onChange={(e) => setRateRuleForm((f) => ({ ...f, rate: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" required min={0} step={0.01} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Case ID (opsional)</label>
                <input type="text" value={rateRuleForm.caseId} onChange={(e) => setRateRuleForm((f) => ({ ...f, caseId: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User ID (opsional)</label>
                <input type="text" value={rateRuleForm.userId} onChange={(e) => setRateRuleForm((f) => ({ ...f, userId: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity type (opsional)</label>
                <input type="text" value={rateRuleForm.activityType} onChange={(e) => setRateRuleForm((f) => ({ ...f, activityType: e.target.value }))} placeholder="e.g. research, court" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective from</label>
                  <input type="date" value={rateRuleForm.effectiveFrom} onChange={(e) => setRateRuleForm((f) => ({ ...f, effectiveFrom: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective to</label>
                  <input type="date" value={rateRuleForm.effectiveTo} onChange={(e) => setRateRuleForm((f) => ({ ...f, effectiveTo: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={rateRuleSaving} className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm disabled:opacity-50">Simpan</button>
                <button type="button" onClick={() => setRateRuleModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {creditNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Tambah Credit Note</h2>
              <button type="button" onClick={() => setCreditNoteModal(false)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <form onSubmit={handleCreditNoteCreate} className="p-4 space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice *</label>
                <select value={creditNoteForm.invoiceId} onChange={(e) => setCreditNoteForm((f) => ({ ...f, invoiceId: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                  <option value="">— Pilih invoice —</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNumber ?? inv.id.slice(0, 8)} — {inv.client?.name ?? '—'} ({formatRp(inv.amount)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp) *</label>
                <input type="number" value={creditNoteForm.amount} onChange={(e) => setCreditNoteForm((f) => ({ ...f, amount: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" required min={0.01} step={0.01} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alasan (opsional)</label>
                <input type="text" value={creditNoteForm.reason} onChange={(e) => setCreditNoteForm((f) => ({ ...f, reason: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={creditNoteSaving} className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm disabled:opacity-50">Simpan</button>
                <button type="button" onClick={() => setCreditNoteModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
