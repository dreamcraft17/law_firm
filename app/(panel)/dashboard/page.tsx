'use client';

import { useEffect, useState, useMemo } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Briefcase, CheckCircle, DollarSign, Users, ListTodo, FileText } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  LineChart,
  Line,
} from 'recharts';

type Summary = {
  totalCases?: number;
  activeCases?: number;
  closedCases?: number;
  totalUsers?: number;
  totalInvoices?: number;
  totalRevenue?: number;
  totalTasks?: number;
};

const cardMeta: { key: keyof Summary; label: string; sub: string; icon: React.ElementType; accent: 'blue' | 'indigo' | 'emerald' }[] = [
  { key: 'activeCases', label: 'Perkara Aktif', sub: 'Sedang berjalan', icon: Briefcase, accent: 'blue' },
  { key: 'closedCases', label: 'Perkara Ditutup', sub: 'Selesai', icon: CheckCircle, accent: 'emerald' },
  { key: 'totalCases', label: 'Total Perkara', sub: 'Semua perkara', icon: FileText, accent: 'indigo' },
  { key: 'totalRevenue', label: 'Revenue', sub: 'Total dari invoice', icon: DollarSign, accent: 'blue' },
  { key: 'totalUsers', label: 'Pengguna', sub: 'User terdaftar', icon: Users, accent: 'indigo' },
  { key: 'totalTasks', label: 'Tugas', sub: 'Total task', icon: ListTodo, accent: 'indigo' },
];

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function getLast6Months(): { label: string; bulan: string }[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: BULAN[d.getMonth()] + ' ' + d.getFullYear(), bulan: BULAN[d.getMonth()] };
  });
}

type ActivityPoint = { hour: string; count: number };

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({});
  const [activityByHour, setActivityByHour] = useState<ActivityPoint[]>([]);
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
          setActivityByHour(Array.isArray(json.activityByHour) ? json.activityByHour : []);
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

  const formatRp = (n: number) =>
    n >= 1e9 ? `Rp ${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `Rp ${(n / 1e6).toFixed(0)}Jt` : `Rp ${n.toLocaleString('id-ID')}`;

  const getValue = (key: keyof Summary) => {
    const v = summary[key];
    if (key === 'totalRevenue') return formatRp(Number(v ?? 0));
    return String(v ?? 0);
  };

  const accentStyles = {
    blue: 'border-t-blue-500 bg-white',
    indigo: 'border-t-indigo-600 bg-white',
    emerald: 'border-t-emerald-500 bg-white',
  };

  const iconStyles = {
    blue: 'bg-blue-500/10 text-blue-600',
    indigo: 'bg-indigo-600/10 text-indigo-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
  };

  // Data untuk grafik batang: status perkara (dari summary)
  const barData = useMemo(() => {
    const active = Number(summary.activeCases ?? 0);
    const closed = Number(summary.closedCases ?? 0);
    return [
      { name: 'Perkara Aktif', jumlah: active, fill: '#3b82f6' },
      { name: 'Perkara Ditutup', jumlah: closed, fill: '#10b981' },
    ].filter((d) => d.jumlah > 0);
  }, [summary.activeCases, summary.closedCases]);

  // Data aktivitas 24 jam terakhir (real-time dari audit log)
  const activityChartData = useMemo(
    () => activityByHour.map((d) => ({ hour: d.hour, count: d.count })),
    [activityByHour],
  );

  // Data untuk grafik area: trend 6 bulan (mock dari total revenue/cases)
  const trendData = useMemo(() => {
    const months = getLast6Months();
    const totalRev = Number(summary.totalRevenue ?? 0);
    const totalCases = Number(summary.totalCases ?? 0);
    if (totalRev === 0 && totalCases === 0) {
      return months.map((m, i) => ({ ...m, revenue: 0, perkara: 0 }));
    }
    const revPerMonth = totalRev / 6;
    const casesPerMonth = totalCases / 6;
    return months.map((m, i) => ({
      ...m,
      revenue: Math.round(revPerMonth * (0.7 + (i * 0.1))),
      perkara: Math.max(0, Math.round(casesPerMonth * (0.8 + (i * 0.05)))),
    }));
  }, [summary.totalRevenue, summary.totalCases]);

  return (
    <div className="space-y-8">
      <p className="text-slate-500 text-sm">Ringkasan — Reporting & Analytics</p>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
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
        <>
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

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Grafik batang: Status perkara */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Status Perkara</h3>
              {barData.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">
                  Belum ada data perkara
                </div>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#475569' }} />
                      <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                        formatter={(value: number | undefined) => [value ?? 0, 'Jumlah']}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                      />
                      <Bar dataKey="jumlah" radius={[0, 4, 4, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Grafik area: Trend 6 bulan */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Trend 6 Bulan Terakhir</h3>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1e3a8a" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPerkara" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}Jt` : String(v))} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                      formatter={(value: number | undefined, name: string | undefined) => [
                        name === 'revenue' ? formatRp(value ?? 0) : value ?? 0,
                        name === 'revenue' ? 'Revenue' : 'Perkara',
                      ]}
                      labelFormatter={(label) => label}
                    />
                    <Legend formatter={(value) => (value === 'revenue' ? 'Revenue' : 'Perkara')} />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" name="revenue" stroke="#1e3a8a" strokeWidth={2} fill="url(#colorRevenue)" />
                    <Area yAxisId="right" type="monotone" dataKey="perkara" name="perkara" stroke="#3b82f6" strokeWidth={2} fill="url(#colorPerkara)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-500 mt-2">Estimasi distribusi berdasarkan total data. Data aktual per bulan dapat ditambah dari backend.</p>
            </div>

            {/* Grafik aktivitas 24 jam (real-time dari audit log) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 xl:col-span-2">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Aktivitas 24 Jam Terakhir</h3>
              <p className="text-xs text-slate-500 mb-4">Event sistem (login, update, create) per jam — data real-time dari audit log</p>
              <div className="h-[200px]">
                {activityChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Belum ada aktivitas tercatat
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activityChartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={28} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(value: number | undefined) => [value ?? 0, 'Event']}
                        labelFormatter={(label) => label}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#dc2626"
                        strokeWidth={2}
                        dot={{ fill: '#dc2626', r: 2 }}
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">Sumber: audit log (login, perubahan case/task/dokumen, dll). Refresh halaman untuk data terbaru.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
