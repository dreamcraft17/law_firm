'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/api-client';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';

type BudgetCase = {
  id: string;
  title: string;
  caseNumber: string | null;
  caseType: string | null;
  status: string;
  budgetAmount: number | null;
  client: { name: string } | null;
};

type BudgetDetail = {
  budgetAmount: number | null;
  budgetUsed: number;
  budgetPct: number | null;
  isOverAlert: boolean;
  alertThreshold: number;
  breakdown: { timeCost: number; expCost: number };
};

type CaseWithBudget = BudgetCase & { budget?: BudgetDetail };

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

function BudgetBar({ pct, isOver }: { pct: number; isOver: boolean }) {
  const clamped = Math.min(pct, 100);
  const color = isOver ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export default function BudgetPage() {
  const [cases, setCases] = useState<CaseWithBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CaseWithBudget | null>(null);
  const [editBudget, setEditBudget] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/cases?limit=200');
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      const raw: BudgetCase[] = (Array.isArray(json.data) ? json.data : []).map((c: BudgetCase) => ({
        id: c.id, title: c.title, caseNumber: c.caseNumber, caseType: c.caseType,
        status: c.status, budgetAmount: c.budgetAmount ?? null, client: c.client ?? null,
      }));
      setCases(raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBudgets = useCallback(async (caseList: BudgetCase[]) => {
    setLoadingBudgets(true);
    const updated = await Promise.all(
      caseList.map(async (c) => {
        try {
          const res = await adminFetch(`/api/admin/cases/${c.id}/budget`);
          const b: BudgetDetail = await res.json();
          return { ...c, budget: b };
        } catch {
          return c;
        }
      })
    );
    setCases(updated);
    setLoadingBudgets(false);
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  useEffect(() => {
    if (cases.length > 0 && !cases[0].budget) {
      loadBudgets(cases);
    }
  }, [cases, loadBudgets]);

  const handleSaveBudget = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const amount = parseFloat(editBudget.replace(/[^0-9.]/g, '')) || null;
      await adminFetch(`/api/admin/cases/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ budgetAmount: amount }),
      });
      setSelected(null);
      await loadCases();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const overBudget = cases.filter((c) => c.budget?.isOverAlert);
  const withBudget = cases.filter((c) => c.budget?.budgetAmount);
  const noBudget = cases.filter((c) => c.budget && !c.budget.budgetAmount);

  return (
    <div>
      <p className="text-gray-600 mb-4 text-sm">
        Pantau anggaran (budget) per perkara. Budget = planned amount; dibandingan dengan waktu terpakai × rate + biaya.
      </p>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Perkara', value: cases.length, icon: DollarSign, color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { label: 'Punya Budget', value: withBudget.length, icon: TrendingUp, color: 'text-green-600 bg-green-50 border-green-200' },
          { label: 'Over Alert (≥80%)', value: overBudget.length, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Tanpa Budget', value: noBudget.length, icon: TrendingDown, color: 'text-gray-600 bg-gray-50 border-gray-200' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${color}`}>
            <Icon className="w-7 h-7 shrink-0 opacity-70" />
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium opacity-80">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Budget per Perkara</h2>
        <button type="button" onClick={() => { loadCases(); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <RefreshCw size={15} />
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl border">Memuat...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Perkara</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Budget</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Terpakai</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 w-40">Progress</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">%</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const b = c.budget;
                const pct = b?.budgetPct ?? 0;
                const isOver = b?.isOverAlert ?? false;
                return (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 truncate max-w-[200px]">{c.title}</p>
                      <p className="text-xs text-gray-400">{c.client?.name ?? '—'}{c.caseNumber ? ` · #${c.caseNumber}` : ''}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {b?.budgetAmount ? fmt(b.budgetAmount) : <span className="text-gray-400 text-xs italic">Belum diset</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {loadingBudgets ? <span className="text-gray-300 text-xs">…</span> : b ? fmt(b.budgetUsed) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {b?.budgetAmount ? (
                        <BudgetBar pct={pct} isOver={isOver} />
                      ) : (
                        <div className="h-2 bg-gray-100 rounded-full" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {b?.budgetPct != null ? (
                        <span className={`font-semibold ${isOver ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {b.budgetPct}%{isOver && ' ⚠️'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => { setSelected(c); setEditBudget(b?.budgetAmount ? String(b.budgetAmount) : ''); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1 text-xs"
                      >
                        Set <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Budget breakdown panel */}
      {selected?.budget && (
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
          <p className="font-semibold text-gray-800 mb-2">{selected.title} — Rincian Biaya</p>
          <div className="flex gap-6">
            <div><span className="text-gray-500">Waktu:</span> <strong>{fmt(selected.budget.breakdown.timeCost)}</strong></div>
            <div><span className="text-gray-500">Biaya:</span> <strong>{fmt(selected.budget.breakdown.expCost)}</strong></div>
            <div><span className="text-gray-500">Total:</span> <strong>{fmt(selected.budget.budgetUsed)}</strong></div>
          </div>
        </div>
      )}

      {/* Modal set budget */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Set Budget</h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{selected.title}</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Budget (IDR)</label>
                <input
                  type="number"
                  min={0}
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Contoh: 50000000"
                />
                <p className="text-xs text-gray-400 mt-1">Kosongkan untuk hapus budget.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelected(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm">Batal</button>
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  disabled={saving}
                  className="flex-1 py-2 bg-[#1B4965] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
