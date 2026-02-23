'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';

type Summary = {
  totalCases?: number;
  activeCases?: number;
  closedCases?: number;
  totalUsers?: number;
  totalInvoices?: number;
  totalRevenue?: number;
  totalTasks?: number;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch(adminEndpoints.reportsDashboard());
        if (!res.ok) throw new Error(res.statusText);
        const json = await res.json();
        if (!cancelled) setSummary(json.summary ?? json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const formatRp = (n: number) =>
    n >= 1e9 ? `Rp ${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `Rp ${(n / 1e6).toFixed(0)}Jt` : `Rp ${n.toLocaleString('id-ID')}`;

  const cards = [
    { label: 'Perkara Aktif', value: String(summary.activeCases ?? 0), sub: 'Total perkara aktif' },
    { label: 'Perkara Ditutup', value: String(summary.closedCases ?? 0), sub: 'Total perkara selesai' },
    { label: 'Total Perkara', value: String(summary.totalCases ?? 0), sub: 'Semua perkara' },
    { label: 'Revenue', value: formatRp(Number(summary.totalRevenue ?? 0)), sub: 'Total dari invoice' },
    { label: 'Pengguna', value: String(summary.totalUsers ?? 0), sub: 'User terdaftar' },
    { label: 'Tugas', value: String(summary.totalTasks ?? 0), sub: 'Total task' },
  ];

  return (
    <div>
      <p className="text-gray-600 mb-6">Reporting & Analytics Dashboard — W6</p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {loading ? (
        <div className="text-gray-500">Memuat...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className="text-2xl font-bold text-[#1B4965] mt-1">{c.value}</p>
              <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
