'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';

type Invoice = {
  id: string;
  status: string;
  amount: number | string;
  createdAt: string;
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<{ totalInvoices?: number; totalAmount?: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [amount, setAmount] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.billingInvoices());
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setInvoices(Array.isArray(json.data) ? json.data : []);
      setSummary(json.summary ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.billingInvoices(), {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount) || 0, status: 'draft' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      setAmount('');
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
      <p className="text-gray-600 mb-4">W5 — Billing and Finance System</p>
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
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Buat Invoice</h2>
        <form onSubmit={handleCreate} className="flex gap-2 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Amount (angka)</label>
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
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-left p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-gray-100">
                    <td className="p-3 font-mono text-xs">{inv.id.slice(0, 8)}…</td>
                    <td className="p-3">{inv.status}</td>
                    <td className="p-3 text-right">{formatRp(inv.amount)}</td>
                    <td className="p-3 text-gray-500">{new Date(inv.createdAt).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
