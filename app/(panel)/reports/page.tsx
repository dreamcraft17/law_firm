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

export default function ReportsPage() {
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

  const formatRp = (n: number) => Number(n).toLocaleString('id-ID');

  return (
    <div>
      <p className="text-gray-600 mb-4">W6 — Reporting & Analytics Dashboard</p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {loading ? (
        <div className="text-gray-500">Memuat...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <h2 className="font-semibold text-gray-800 p-4 border-b">Ringkasan</h2>
          <ul className="p-4 space-y-2 text-sm">
            <li>• Perkara aktif: <strong>{summary.activeCases ?? 0}</strong></li>
            <li>• Perkara ditutup: <strong>{summary.closedCases ?? 0}</strong></li>
            <li>• Total perkara: <strong>{summary.totalCases ?? 0}</strong></li>
            <li>• Total pengguna: <strong>{summary.totalUsers ?? 0}</strong></li>
            <li>• Total invoice: <strong>{summary.totalInvoices ?? 0}</strong></li>
            <li>• Total revenue: <strong>Rp {formatRp(Number(summary.totalRevenue ?? 0))}</strong></li>
            <li>• Total tugas: <strong>{summary.totalTasks ?? 0}</strong></li>
          </ul>
        </div>
      )}
    </div>
  );
}
