'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';

type TaskItem = {
  id: string;
  title: string;
  status: string;
  caseId?: string | null;
  createdAt: string;
};

export default function TasksPage() {
  const [list, setList] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCaseId, setFormCaseId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.tasksList());
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setList(Array.isArray(json.data) ? json.data : []);
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
      <p className="text-gray-600 mb-4">W3 — Advanced Task Workflow</p>
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
            <label className="block text-sm text-gray-600 mb-1">Case ID (opsional)</label>
            <input
              type="text"
              value={formCaseId}
              onChange={(e) => setFormCaseId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-64"
              placeholder="UUID"
            />
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
                  <th className="text-left p-3">Case ID</th>
                  <th className="text-left p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="p-3">{t.title}</td>
                    <td className="p-3">{t.status}</td>
                    <td className="p-3 font-mono text-xs">{t.caseId?.slice(0, 8) ?? '—'}…</td>
                    <td className="p-3">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="pending">pending</option>
                        <option value="in_progress">in_progress</option>
                        <option value="done">done</option>
                      </select>
                    </td>
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
