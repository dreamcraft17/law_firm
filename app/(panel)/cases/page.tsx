'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Pencil, Trash2, FolderPlus } from 'lucide-react';

type CaseItem = {
  id: string;
  title: string;
  status: string;
  clientId: string | null;
  createdAt: string;
  client?: { id: string; email: string; name: string | null } | null;
};

const STATUSES = ['open', 'in_progress', 'closed', 'archived'] as const;

export default function CasesPage() {
  const [list, setList] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CaseItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formStatus, setFormStatus] = useState<string>('open');
  const [deleteConfirm, setDeleteConfirm] = useState<CaseItem | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.casesList());
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setList(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setFormTitle('');
    setFormStatus('open');
    setModalOpen(true);
  };

  const openEdit = (c: CaseItem) => {
    setEditing(c);
    setFormTitle(c.title);
    setFormStatus(c.status);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const res = await adminFetch(adminEndpoints.caseUpdate(editing.id), {
          method: 'PUT',
          body: JSON.stringify({ title: formTitle.trim(), status: formStatus }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
      } else {
        const res = await adminFetch(adminEndpoints.caseCreate(), {
          method: 'POST',
          body: JSON.stringify({ title: formTitle.trim(), status: formStatus }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
      }
      setModalOpen(false);
      fetchCases();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: CaseItem) => {
    if (!deleteConfirm || deleteConfirm.id !== c.id) return;
    setSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.caseDelete(c.id), { method: 'DELETE' });
      if (!res.ok) throw new Error(res.statusText);
      setDeleteConfirm(null);
      fetchCases();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Case Management</h1>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <FolderPlus size={18} />
          Buat Perkara
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Belum ada perkara. Klik Buat Perkara.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Judul</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Klien</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-gray-900">{c.title}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {c.client ? (c.client.name || c.client.email) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(c)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Edit Perkara' : 'Buat Perkara'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-[#1B4965] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : editing ? 'Simpan' : 'Buat Perkara'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <p className="text-gray-700 mb-4">
              Hapus perkara <strong>{deleteConfirm.title}</strong>? (soft delete)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={saving}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-60"
              >
                {saving ? 'Menghapus...' : 'Hapus'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
