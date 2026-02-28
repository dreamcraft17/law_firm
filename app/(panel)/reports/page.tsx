'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { BarChart3, Briefcase, Users, FileText, DollarSign, CheckSquare } from 'lucide-react';

type Summary = {
  totalCases?: number;
  activeCases?: number;
  closedCases?: number;
  totalUsers?: number;
  totalInvoices?: number;
  totalRevenue?: number;
  totalTasks?: number;
};

type RecentCase = {
  id: string;
  title: string;
  status?: string;
  caseNumber?: string | null;
  client?: { id: string; name: string } | null;
};

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary>({});
  const [recentCases, setRecentCases] = useState<RecentCase[]>([]);
  const [taskBreakdown, setTaskBreakdown] = useState<Record<string, number>>({});
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
        if (!cancelled) {
          setSummary(json.summary ?? json);
          setRecentCases(Array.isArray(json.recentCases) ? json.recentCases : []);
          setTaskBreakdown(typeof json.taskBreakdown === 'object' && json.taskBreakdown !== null ? json.taskBreakdown : {});
        }
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

  const kpis = [
    { label: 'Perkara aktif', value: summary.activeCases ?? 0, icon: Briefcase, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Perkara ditutup', value: summary.closedCases ?? 0, icon: Briefcase, color: 'bg-slate-50 text-slate-700 border-slate-200' },
    { label: 'Total pengguna', value: summary.totalUsers ?? 0, icon: Users, color: 'bg-violet-50 text-violet-700 border-violet-200' },
    { label: 'Total invoice', value: summary.totalInvoices ?? 0, icon: FileText, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { label: 'Total revenue', value: `Rp ${formatRp(Number(summary.totalRevenue ?? 0))}`, icon: DollarSign, color: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'Total tugas', value: summary.totalTasks ?? 0, icon: CheckSquare, color: 'bg-teal-50 text-teal-700 border-teal-200' },
  ];

  const taskStatusLabels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'Sedang dikerjakan',
    done: 'Selesai',
    cancelled: 'Dibatalkan',
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-gray-600" />
        <p className="text-gray-600">W6 — Reporting & Analytics Dashboard</p>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {loading ? (
        <div className="text-gray-500">Memuat...</div>
      ) : (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className={`rounded-xl border p-4 ${color} bg-opacity-50`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 opacity-80" />
                  <span className="text-sm font-medium opacity-90">{label}</span>
                </div>
                <p className="text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Perkara terbaru */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <h2 className="font-semibold text-gray-800">Perkara terbaru</h2>
                <Link
                  href="/cases"
                  className="text-sm text-[#1B4965] hover:underline font-medium"
                >
                  Lihat semua →
                </Link>
              </div>
              <div className="overflow-x-auto">
                {recentCases.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">Belum ada perkara.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50/80">
                        <th className="text-left p-3 font-medium text-gray-700">Judul</th>
                        <th className="text-left p-3 font-medium text-gray-700">Klien</th>
                        <th className="text-left p-3 font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCases.map((c) => (
                        <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="p-3">
                            <Link href="/cases" className="text-[#1B4965] hover:underline font-medium">
                              {c.title}
                            </Link>
                            {c.caseNumber && <span className="text-gray-400 ml-1">({c.caseNumber})</span>}
                          </td>
                          <td className="p-3 text-gray-600">{c.client?.name ?? '—'}</td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              c.status === 'closed' ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-700'
                            }`}>
                              {c.status === 'closed' ? 'Ditutup' : 'Aktif'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Tugas per status */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <h2 className="font-semibold text-gray-800">Tugas per status</h2>
                <Link
                  href="/tasks"
                  className="text-sm text-[#1B4965] hover:underline font-medium"
                >
                  Lihat semua →
                </Link>
              </div>
              <div className="p-4">
                {Object.keys(taskBreakdown).length === 0 ? (
                  <p className="text-sm text-gray-500">Tidak ada data tugas.</p>
                ) : (
                  <ul className="space-y-3">
                    {Object.entries(taskBreakdown).map(([status, count]) => (
                      <li key={status} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-100">
                        <span className="text-gray-700">{taskStatusLabels[status] ?? status}</span>
                        <span className="font-semibold text-gray-900">{count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
