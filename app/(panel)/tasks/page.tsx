'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Filter, Link2, Repeat } from 'lucide-react';

type TaskItem = {
  id: string;
  title: string;
  status: string;
  caseId?: string | null;
  dueDate?: string | null;
  createdAt: string;
  case?: { id: string; title: string; caseNumber?: string | null } | null;
};

type SavedViewItem = { id: string; name: string; entityType: string; filters: Record<string, string> };
type DepItem = { id: string; dependsOnTaskId: string; dependsOnTask?: { id: string; title: string; status: string } };
type RecurringItem = { id: string; title: string; recurrence: string; nextRunAt?: string | null; caseId?: string | null };

export default function TasksPage() {
  const [list, setList] = useState<TaskItem[]>([]);
  const [cases, setCases] = useState<Array<{ id: string; title: string; caseNumber?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCaseId, setFormCaseId] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [savedViews, setSavedViews] = useState<SavedViewItem[]>([]);
  const [selectedViewId, setSelectedViewId] = useState('');
  const [depsTask, setDepsTask] = useState<TaskItem | null>(null);
  const [dependencies, setDependencies] = useState<DepItem[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [addDepTaskId, setAddDepTaskId] = useState('');
  const [depSaving, setDepSaving] = useState(false);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringItem[]>([]);
  const [recurringModal, setRecurringModal] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ title: '', caseId: '', recurrence: 'monthly', nextRunAt: '' });
  const [recurringSaving, setRecurringSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { status?: string; from?: string; to?: string } = {};
      if (filterStatus) params.status = filterStatus;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const res = await adminFetch(adminEndpoints.tasksList(params));
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setList(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterFrom, filterTo]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminFetch(adminEndpoints.savedViewsList()).then((r) => r.ok && r.json()).then((j) => {
      const data = (j?.data ?? []).filter((v: SavedViewItem) => v.entityType === 'task');
      setSavedViews(data);
    }).catch(() => {});
    adminFetch(adminEndpoints.casesList()).then((r) => r.ok && r.json()).then((j) => {
      setCases(Array.isArray(j?.data) ? j.data : []);
    }).catch(() => {});
    adminFetch(adminEndpoints.recurringTaskTemplatesList()).then((r) => r.ok && r.json()).then((j) => {
      setRecurringTemplates(Array.isArray(j?.data) ? j.data : []);
    }).catch(() => {});
  }, []);

  const openDependencies = async (t: TaskItem) => {
    setDepsTask(t);
    setDependencies([]);
    setAddDepTaskId('');
    setDepsLoading(true);
    try {
      const res = await adminFetch(adminEndpoints.taskDependencies(t.id));
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setDependencies(Array.isArray(json.data) ? json.data : []);
    } catch {
      setDependencies([]);
    } finally {
      setDepsLoading(false);
    }
  };

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depsTask || !addDepTaskId || addDepTaskId === depsTask.id) return;
    setDepSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.taskDependencies(depsTask.id), {
        method: 'POST',
        body: JSON.stringify({ dependsOnTaskId: addDepTaskId }),
      });
      if (!res.ok) throw new Error(res.statusText);
      const created = await res.json();
      setDependencies((prev) => [...prev, created]);
      setAddDepTaskId('');
    } catch {
      // ignore
    } finally {
      setDepSaving(false);
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    if (!depsTask) return;
    try {
      const res = await adminFetch(adminEndpoints.taskDependencyDetail(depsTask.id, depId), { method: 'DELETE' });
      if (!res.ok) throw new Error(res.statusText);
      setDependencies((prev) => prev.filter((d) => d.id !== depId));
    } catch {
      // ignore
    }
  };

  const handleRecurringCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurringForm.title.trim()) return;
    setRecurringSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.recurringTaskTemplateCreate(), {
        method: 'POST',
        body: JSON.stringify({
          title: recurringForm.title.trim(),
          caseId: recurringForm.caseId || null,
          recurrence: recurringForm.recurrence,
          nextRunAt: recurringForm.nextRunAt || null,
        }),
      });
      if (!res.ok) throw new Error(res.statusText);
      const created = await res.json();
      setRecurringTemplates((prev) => [...prev, created]);
      setRecurringModal(false);
      setRecurringForm({ title: '', caseId: '', recurrence: 'monthly', nextRunAt: '' });
    } catch {
      // ignore
    } finally {
      setRecurringSaving(false);
    }
  };

  const applySavedView = (v: SavedViewItem) => {
    setSelectedViewId(v.id);
    const f = v.filters || {};
    setFilterStatus(f.status ?? '');
    setFilterFrom(f.from ?? '');
    setFilterTo(f.to ?? '');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.taskCreate(), {
        method: 'POST',
        body: JSON.stringify({ title: formTitle.trim(), caseId: formCaseId.trim() || null, status: 'pending' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      setFormTitle('');
      setFormCaseId('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal buat task');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await adminFetch(adminEndpoints.taskUpdate(id), {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(res.statusText);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal update');
    }
  };

  return (
    <div>
      <p className="text-gray-600 mb-2">W3 — Advanced Task Workflow</p>
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <Filter className="w-4 h-4 text-slate-500" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">Semua status</option>
          <option value="pending">pending</option>
          <option value="in_progress">in_progress</option>
          <option value="done">done</option>
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
        <h2 className="font-semibold text-gray-800 mb-3">Buat Task</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Judul</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-64"
              placeholder="Nama task"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Case (opsional)</label>
            <select value={formCaseId} onChange={(e) => setFormCaseId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 w-64">
              <option value="">— Pilih case —</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.title} {c.caseNumber ? `(${c.caseNumber})` : ''}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm disabled:opacity-50"
          >
            {saving ? '...' : 'Buat Task'}
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Repeat className="w-5 h-5" />
          Recurring Task Templates
        </h2>
        <button type="button" onClick={() => setRecurringModal(true)} className="mb-3 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-sm hover:bg-slate-200">
          Tambah Template
        </button>
        {recurringTemplates.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada template recurring.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {recurringTemplates.map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-1 border-b border-gray-100">
                <span className="font-medium">{r.title}</span>
                <span className="text-gray-500">{r.recurrence}</span>
                {r.nextRunAt && <span className="text-gray-400">{new Date(r.nextRunAt).toLocaleDateString('id-ID')}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h2 className="font-semibold text-gray-800 p-4 border-b">Daftar Task</h2>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Belum ada task.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Judul</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Case</th>
                  <th className="text-left p-3">Jatuh tempo</th>
                  <th className="text-left p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="p-3">{t.title}</td>
                    <td className="p-3">{t.status}</td>
                    <td className="p-3 text-sm">{t.case?.title ?? (t.caseId ? `${t.caseId.slice(0, 8)}…` : '—')}</td>
                    <td className="p-3 text-gray-600">{t.dueDate ? new Date(t.dueDate).toLocaleDateString('id-ID') : '—'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openDependencies(t)} className="p-1.5 text-[#1B4965] hover:bg-blue-50 rounded" title="Dependencies">
                          <Link2 size={16} />
                        </button>
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="pending">pending</option>
                          <option value="in_progress">in_progress</option>
                          <option value="done">done</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {depsTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Dependencies — {depsTask.title}</h3>
              <button type="button" onClick={() => setDepsTask(null)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="p-4">
              {depsLoading ? (
                <p className="text-sm text-gray-500">Memuat...</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-2">Task ini bergantung pada:</p>
                  <ul className="mb-4 space-y-1 text-sm">
                    {dependencies.map((d) => (
                      <li key={d.id} className="flex items-center justify-between py-1 border-b border-gray-100">
                        <span>{d.dependsOnTask?.title ?? d.dependsOnTaskId.slice(0, 8)}</span>
                        <button type="button" onClick={() => handleRemoveDependency(d.id)} className="text-red-600 hover:underline text-xs">Hapus</button>
                      </li>
                    ))}
                    {dependencies.length === 0 && <li className="text-gray-500">Tidak ada dependency.</li>}
                  </ul>
                  <form onSubmit={handleAddDependency} className="flex gap-2 items-end">
                    <select value={addDepTaskId} onChange={(e) => setAddDepTaskId(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">— Pilih task (harus selesai dulu) —</option>
                      {list.filter((x) => x.id !== depsTask.id && !dependencies.some((d) => d.dependsOnTaskId === x.id)).map((x) => (
                        <option key={x.id} value={x.id}>{x.title} ({x.status})</option>
                      ))}
                    </select>
                    <button type="submit" disabled={depSaving || !addDepTaskId} className="px-3 py-2 bg-[#1B4965] text-white rounded-lg text-sm disabled:opacity-50">Tambah</button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {recurringModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Tambah Recurring Task Template</h3>
              <button type="button" onClick={() => setRecurringModal(false)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <form onSubmit={handleRecurringCreate} className="p-4 space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
                <input type="text" value={recurringForm.title} onChange={(e) => setRecurringForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Case (opsional)</label>
                <select value={recurringForm.caseId} onChange={(e) => setRecurringForm((f) => ({ ...f, caseId: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">— Pilih case —</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
                <select value={recurringForm.recurrence} onChange={(e) => setRecurringForm((f) => ({ ...f, recurrence: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="monthly">Bulanan</option>
                  <option value="quarterly">Triwulan</option>
                  <option value="weekly">Mingguan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next run (opsional)</label>
                <input type="date" value={recurringForm.nextRunAt} onChange={(e) => setRecurringForm((f) => ({ ...f, nextRunAt: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={recurringSaving} className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm disabled:opacity-50">Simpan</button>
                <button type="button" onClick={() => setRecurringModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
