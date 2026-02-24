'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';

type KnowledgeItem = {
  id: string;
  key: string;
  value: unknown;
  category: string;
  description?: string | null;
};

export default function KnowledgeBasePage() {
  const [list, setList] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formValue, setFormValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<KnowledgeItem | null>(null);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.knowledgeBaseList());
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setList(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setFormKey('');
    setFormDescription('');
    setFormValue('');
    setModalOpen(true);
  };

  const openEdit = (item: KnowledgeItem) => {
    setEditing(item);
    setFormKey(item.key);
    setFormDescription(item.description ?? '');
    setFormValue(typeof item.value === 'string' ? item.value : JSON.stringify(item.value ?? '', null, 2));
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim()) return;
    setSaving(true);
    try {
      let value: unknown = formValue.trim();
      try {
        value = JSON.parse(formValue.trim() || 'null');
      } catch {
        value = formValue.trim();
      }
      const url = editing ? adminEndpoints.knowledgeBaseUpdate(editing.key) : adminEndpoints.knowledgeBaseCreate();
      const res = await adminFetch(url, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({
          key: formKey.trim(),
          description: formDescription.trim() || null,
          value,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setModalOpen(false);
      fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: KnowledgeItem) => {
    try {
      const res = await adminFetch(adminEndpoints.knowledgeBaseDelete(item.key), { method: 'DELETE' });
      if (!res.ok) throw new Error(res.statusText);
      setDeleteConfirm(null);
      fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus');
    }
  };

  return (
    <div>
      <p className="text-gray-600 mb-4">W8 — Knowledge Base & Template Manager</p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-800">Template & Referensi</h2>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm hover:opacity-90"
          >
            Tambah Entri
          </button>
        </div>
        {loading ? (
          <div className="text-gray-500">Memuat...</div>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada entri. Klik &quot;Tambah Entri&quot; untuk menambah template dokumen, clause library, atau precedent.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {list.map((item) => (
              <li key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <span className="font-medium">{item.key}</span>
                  {item.description && <span className="text-gray-500 ml-2">— {item.description}</span>}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(item)} className="text-[#1B4965] hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => setDeleteConfirm(item)} className="text-red-600 hover:underline">
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="font-semibold text-gray-800 mb-4">{editing ? 'Edit entri' : 'Tambah entri'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Key (slug)</label>
                <input
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="contoh: template-gugatan"
                  required
                  disabled={!!editing}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Deskripsi singkat"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Value (JSON atau teks)</label>
                <textarea
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 font-mono text-sm"
                  placeholder='{"content": "..."} atau teks biasa'
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
            <p className="text-gray-700 mb-4">Hapus &quot;{deleteConfirm.key}&quot;?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
                Ya, hapus
              </button>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
