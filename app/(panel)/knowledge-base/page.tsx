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
      <p className="text-slate-500 mb-6">W8 — Knowledge Base & Template Manager</p>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-semibold text-slate-800">Template & Referensi</h2>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-light transition-colors shadow-panel"
          >
            Tambah Entri
          </button>
        </div>
        {loading ? (
          <div className="text-slate-500">Memuat...</div>
        ) : list.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada entri. Klik &quot;Tambah Entri&quot; untuk menambah template dokumen, clause library, atau precedent.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {list.map((item) => (
              <li key={item.id} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                <div>
                  <span className="font-medium text-slate-800">{item.key}</span>
                  {item.description && <span className="text-slate-500 ml-2">— {item.description}</span>}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(item)} className="text-primary hover:underline font-medium">
                    Edit
                  </button>
                  <button type="button" onClick={() => setDeleteConfirm(item)} className="text-red-600 hover:underline font-medium">
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">{editing ? 'Edit entri' : 'Tambah entri'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Key (slug)</label>
                <input
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-slate-100"
                  placeholder="contoh: template-gugatan"
                  required
                  disabled={!!editing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Deskripsi</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  placeholder="Deskripsi singkat"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Value (JSON atau teks)</label>
                <textarea
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 h-32 font-mono text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  placeholder='{"content": "..."} atau teks biasa'
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-sm">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <p className="text-slate-700 mb-4">Hapus &quot;{deleteConfirm.key}&quot;?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                Ya, hapus
              </button>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-sm">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
