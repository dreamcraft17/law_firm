'use client';

import { useEffect, useState, useMemo } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Briefcase, CheckCircle, DollarSign, Users, ListTodo, FileText, TrendingUp, Percent } from 'lucide-react';
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
  PieChart,
  Pie,
  Cell,
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

type Finance = {
  revenuePerLawyer?: { userId: string; lawyerName: string; revenue: number }[];
  agingReceivable?: Record<string, number>;
  collectionRate?: number;
  totalInvoiced?: number;
  totalPaid?: number;
};

type Operational = {
  taskCompletionRate?: number;
  taskDone?: number;
  taskTotal?: number;
  leadConversionRate?: number;
  convertedLeads?: number;
  totalLeads?: number;
};

type MonthlyTrendItem = { key: string; label: string; bulan: string; revenue: number; perkara: number };

const cardMeta: { key: keyof Summary; label: string; sub: string; icon: React.ElementType; accent: 'blue' | 'indigo' | 'emerald' }[] = [
  { key: 'activeCases', label: 'Perkara Aktif', sub: 'Sedang berjalan', icon: Briefcase, accent: 'blue' },
  { key: 'closedCases', label: 'Perkara Ditutup', sub: 'Selesai', icon: CheckCircle, accent: 'emerald' },
  { key: 'totalCases', label: 'Total Perkara', sub: 'Semua perkara', icon: FileText, accent: 'indigo' },
  { key: 'totalRevenue', label: 'Revenue', sub: 'Total dari invoice', icon: DollarSign, accent: 'blue' },
  { key: 'totalUsers', label: 'Pengguna', sub: 'User terdaftar', icon: Users, accent: 'indigo' },
  { key: 'totalTasks', label: 'Tugas', sub: 'Total task', icon: ListTodo, accent: 'indigo' },
];

const TASK_STATUS_LABEL: Record<string, string> = {
  todo: 'Belum dikerjakan',
  in_progress: 'Sedang dikerjakan',
  done: 'Selesai',
};

const TASK_STATUS_COLOR: Record<string, string> = {
  todo: '#94a3b8',
  in_progress: '#3b82f6',
  done: '#10b981',
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({});
  const [taskBreakdown, setTaskBreakdown] = useState<Record<string, number>>({});
  const [finance, setFinance] = useState<Finance>({});
  const [operational, setOperational] = useState<Operational>({});
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendItem[]>([]);
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
          setSummary(json.summary ?? {});
          setTaskBreakdown(json.taskBreakdown ?? {});
          setFinance(json.finance ?? {});
          setOperational(json.operational ?? {});
          setMonthlyTrend(Array.isArray(json.monthlyTrend) ? json.monthlyTrend : []);
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

  const barData = useMemo(() => {
    const active = Number(summary.activeCases ?? 0);
    const closed = Number(summary.closedCases ?? 0);
    return [
      { name: 'Perkara Aktif', jumlah: active, fill: '#3b82f6' },
      { name: 'Perkara Ditutup', jumlah: closed, fill: '#10b981' },
    ].filter((d) => d.jumlah > 0);
  }, [summary.activeCases, summary.closedCases]);

  const trendData = useMemo(() => {
    if (monthlyTrend.length > 0) return monthlyTrend;
    const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { label: `${BULAN[d.getMonth()]} ${d.getFullYear()}`, bulan: BULAN[d.getMonth()], revenue: 0, perkara: 0 };
    });
  }, [monthlyTrend]);

  const taskPieData = useMemo(() => {
    return Object.entries(taskBreakdown)
      .filter(([, value]) => value > 0)
      .map(([status, value]) => ({
        name: TASK_STATUS_LABEL[status] ?? status,
        value,
        fill: TASK_STATUS_COLOR[status] ?? '#64748b',
      }));
  }, [taskBreakdown]);

  const revenuePerLawyerData = useMemo(() => {
    const list = finance.revenuePerLawyer ?? [];
    return list.slice(0, 8).map((r) => ({ name: r.lawyerName.length > 18 ? r.lawyerName.slice(0, 18) + '…' : r.lawyerName, revenue: r.revenue, fullName: r.lawyerName }));
  }, [finance.revenuePerLawyer]);

  const agingData = useMemo(() => {
    const aging = finance.agingReceivable ?? {};
    return [
      { name: '0-30 hari', jumlah: aging['0-30'] ?? 0, fill: '#10b981' },
      { name: '31-60 hari', jumlah: aging['31-60'] ?? 0, fill: '#f59e0b' },
      { name: '61-90 hari', jumlah: aging['61-90'] ?? 0, fill: '#f97316' },
      { name: '90+ hari', jumlah: aging['90+'] ?? 0, fill: '#ef4444' },
    ].filter((d) => d.jumlah > 0);
  }, [finance.agingReceivable]);

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

          {/* KPI kecil: Collection rate & Lead conversion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Percent className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Tingkat Penagihan</p>
                <p className="text-xl font-bold text-slate-800">{Number(finance.collectionRate ?? 0).toFixed(1)}%</p>
                <p className="text-xs text-slate-400">Dari total tagihan yang dibayar</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Konversi Lead</p>
                <p className="text-xl font-bold text-slate-800">{Number(operational.leadConversionRate ?? 0).toFixed(1)}%</p>
                <p className="text-xs text-slate-400">{operational.convertedLeads ?? 0} dari {operational.totalLeads ?? 0} lead</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Status Perkara (bar horizontal) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Status Perkara</h3>
              {barData.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">Belum ada data perkara</div>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#475569' }} />
                      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v: number | undefined) => [v ?? 0, 'Jumlah']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="jumlah" radius={[0, 4, 4, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Task by status (Pie) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Tugas per Status</h3>
              {taskPieData.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">Belum ada data tugas</div>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={88}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {taskPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | undefined, name: string) => [v ?? 0, name]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Revenue per lawyer (horizontal bar) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Revenue per Advokat (6 bulan)</h3>
              {revenuePerLawyerData.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">Belum ada data time entry billable</div>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenuePerLawyerData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}Jt` : String(v))} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip formatter={(v: number | undefined) => [formatRp(v ?? 0), 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="revenue" fill="#1e3a8a" radius={[0, 4, 4, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Aging Piutang */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Aging Piutang (belum tertagih)</h3>
              {agingData.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">Tidak ada piutang tertunggak</div>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}Jt` : String(v))} />
                      <Tooltip formatter={(v: number | undefined) => [formatRp(v ?? 0), 'Jumlah']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="jumlah" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {agingData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Trend 6 bulan (full width) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Trend 6 Bulan Terakhir — Revenue & Perkara Baru</h3>
            <div className="h-[260px]">
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
                      name === 'revenue' ? 'Revenue' : 'Perkara baru',
                    ]}
                    labelFormatter={(label) => label}
                  />
                  <Legend formatter={(value) => (value === 'revenue' ? 'Revenue' : 'Perkara baru')} />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" name="revenue" stroke="#1e3a8a" strokeWidth={2} fill="url(#colorRevenue)" />
                  <Area yAxisId="right" type="monotone" dataKey="perkara" name="perkara" stroke="#3b82f6" strokeWidth={2} fill="url(#colorPerkara)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 mt-2">Data aktual dari invoice dan perkara yang dibuat per bulan.</p>
          </div>
        </>
      )}
    </div>
  );
}
