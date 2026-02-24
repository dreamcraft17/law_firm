'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Briefcase, CheckCircle, DollarSign, Users, ListTodo, FileText } from 'lucide-react';

type Summary = {
  totalCases?: number;
  activeCases?: number;
  closedCases?: number;
  totalUsers?: number;
  totalInvoices?: number;
  totalRevenue?: number;
  totalTasks?: number;
};

const cardMeta: { key: keyof Summary; label: string; sub: string; icon: React.ElementType; accent: 'gold' | 'navy' | 'emerald' }[] = [
  { key: 'activeCases', label: 'Perkara Aktif', sub: 'Sedang berjalan', icon: Briefcase, accent: 'gold' },
  { key: 'closedCases', label: 'Perkara Ditutup', sub: 'Selesai', icon: CheckCircle, accent: 'emerald' },
  { key: 'totalCases', label: 'Total Perkara', sub: 'Semua perkara', icon: FileText, accent: 'navy' },
  { key: 'totalRevenue', label: 'Revenue', sub: 'Total dari invoice', icon: DollarSign, accent: 'gold' },
  { key: 'totalUsers', label: 'Pengguna', sub: 'User terdaftar', icon: Users, accent: 'navy' },
  { key: 'totalTasks', label: 'Tugas', sub: 'Total task', icon: ListTodo, accent: 'navy' },
];

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

  const getValue = (key: keyof Summary) => {
    const v = summary[key];
    if (key === 'totalRevenue') return formatRp(Number(v ?? 0));
    return String(v ?? 0);
  };

  const accentStyles = {
    gold: 'border-t-gold bg-white',
    navy: 'border-t-navy bg-white',
    emerald: 'border-t-emerald-500 bg-white',
  };

  const iconStyles = {
    gold: 'bg-gold/15 text-gold',
    navy: 'bg-navy/10 text-navy',
    emerald: 'bg-emerald-500/15 text-emerald-600',
  };

  return (
    <div>
      <p className="text-slate-500 text-sm mb-6">Ringkasan — Reporting & Analytics</p>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
              <div className="h-8 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardMeta.map(({ key, label, sub, icon: Icon, accent }) => (
            <div
              key={key}
              className={`rounded-xl border border-slate-200 border-t-4 p-6 shadow-card hover:shadow-card-hover transition-shadow ${accentStyles[accent]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1.5 tabular-nums">{getValue(key)}</p>
                  <p className="text-xs text-slate-400 mt-1">{sub}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconStyles[accent]}`}>
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
