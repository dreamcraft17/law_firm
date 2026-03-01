'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

type BreachCase = {
  id: string;
  title: string;
  caseNumber?: string | null;
  status?: string;
  caseType?: string | null;
  slaDueDate?: string | null;
  escalatedAt?: string | null;
  client?: { id: string; name: string | null } | null;
};

export default function SlaBreachReportPage() {
  const [data, setData] = useState<BreachCase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = adminEndpoints.reportsSlaBreach(
        filterFrom || filterTo ? { from: filterFrom || undefined, to: filterTo || undefined } : undefined
      );
      const res = await adminFetch(url);
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setData(Array.isArray(json.data) ? json.data : []);
      setTotal(Number(json.total) ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterFrom, filterTo]);

  const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <Link href="/reports" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Laporan
        </Link>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h1 className="text-xl font-semibold text-gray-900">SLA Breach — Perkara yang Terlewati Batas SLA</h1>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Daftar perkara yang telah melewati batas SLA (escalated). Filter opsional menurut tanggal escalasi.
      </p>
      <div className="flex flex-wrap gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Dari</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sampai</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button type="button" onClick={() => load()} className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm hover:opacity-90">
            Muat ulang
          </button>
        </div>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {loading ? (
        <div className="text-gray-500 py-8">Memuat...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-red-50/50">
            <p className="text-sm font-medium text-gray-800">Total: <span className="font-bold text-red-700">{total}</span> perkara</p>
          </div>
          {data.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Tidak ada perkara yang breach dalam filter ini.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Judul</th>
                    <th className="text-left p-3">No. Perkara</th>
                    <th className="text-left p-3">Klien</th>
                    <th className="text-left p-3">Tipe</th>
                    <th className="text-left p-3">SLA Due</th>
                    <th className="text-left p-3">Escalasi</th>
                    <th className="text-left p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="p-3 font-medium text-gray-900">{c.title}</td>
                      <td className="p-3 text-gray-600">{c.caseNumber ?? '—'}</td>
                      <td className="p-3 text-gray-600">{c.client?.name ?? '—'}</td>
                      <td className="p-3 text-gray-600">{c.caseType ?? '—'}</td>
                      <td className="p-3 text-gray-600">{fmt(c.slaDueDate)}</td>
                      <td className="p-3 text-red-600 font-medium">{fmt(c.escalatedAt)}</td>
                      <td className="p-3">
                        <Link href={`/cases?highlight=${c.id}`} className="text-[#1B4965] hover:underline">
                          Buka
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
