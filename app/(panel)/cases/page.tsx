'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Pencil, Trash2, FolderPlus, Filter, Save, Flag } from 'lucide-react';

type CaseItem = {
  id: string;
  title: string;
  caseNumber?: string | null;
  description?: string | null;
  status: string;
  stage?: string;
  clientId: string | null;
  createdAt: string;
  client?: { id: string; email?: string; name: string | null } | null;
};

type SavedViewItem = { id: string; name: string; entityType: string; filters: Record<string, string> };

const STAGES = ['intake', 'active', 'on_hold', 'closed'] as const;

export default function CasesPage() {
  const searchParams = useSearchParams();
  const [list, setList] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CaseItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCaseNumber, setFormCaseNumber] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<string>('pending');
  const [deleteConfirm, setDeleteConfirm] = useState<CaseItem | null>(null);
  const [filterStage, setFilterStage] = useState<string>('');
  const [filterClientId, setFilterClientId] = useState<string>('');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [savedViews, setSavedViews] = useState<SavedViewItem[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string>('');
  const [saveViewModal, setSaveViewModal] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [milestonesCase, setMilestonesCase] = useState<CaseItem | null>(null);
  const [milestones, setMilestones] = useState<{ id: string; name: string; dueDate?: string | null; sortOrder: number }[]>([]);
  const [milestoneForm, setMilestoneForm] = useState({ name: '', dueDate: '', sortOrder: '0' });
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [milestoneSaving, setMilestoneSaving] = useState(false);

  const buildParams = useCallback(() => {
    const p: { stage?: string; clientId?: string; from?: string; to?: string } = {};
    if (filterStage) p.stage = filterStage;
    if (filterClientId) p.clientId = filterClientId;
    if (filterFrom) p.from = filterFrom;
    if (filterTo) p.to = filterTo;
    return p;
  }, [filterStage, filterClientId, filterFrom, filterTo]);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams();
      const res = await adminFetch(adminEndpoints.casesList(params));
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setList(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (clientId) setFilterClientId(clientId);
  }, [searchParams]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    adminFetch(adminEndpoints.savedViewsList()).then((r) => r.ok && r.json()).then((j) => {
      const data = (j?.data ?? []).filter((v: SavedViewItem) => v.entityType === 'case');
      setSavedViews(data);
    }).catch(() => {});
    adminFetch(adminEndpoints.clientsList()).then((r) => r.ok && r.json()).then((j) => {
      setClients(Array.isArray(j?.data) ? j.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : []);
    }).catch(() => {});
  }, []);

  const applySavedView = (v: SavedViewItem) => {
    setSelectedViewId(v.id);
    const f = v.filters || {};
    setFilterStage(f.stage ?? '');
    setFilterClientId(f.clientId ?? '');
    setFilterFrom(f.from ?? '');
    setFilterTo(f.to ?? '');
  };

  const handleSaveView = async () => {
    if (!saveViewName.trim()) return;
    setSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.savedViewCreate(), {
        method: 'POST',
        body: JSON.stringify({
          name: saveViewName.trim(),
          entityType: 'case',
          filters: buildParams(),
        }),
      });
      if (!res.ok) throw new Error('Gagal simpan');
      const created = await res.json();
      setSavedViews((prev) => [...prev, { ...created, filters: created.filters || {} }]);
      setSaveViewModal(false);
      setSaveViewName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal simpan tampilan');
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setFormTitle('');
    setFormCaseNumber('');
    setFormClientName('');
    setFormDescription('');
    setFormStatus('pending');
    setModalOpen(true);
  };

  const openEdit = (c: CaseItem) => {
    setEditing(c);
    setFormTitle(c.title);
    setFormCaseNumber(c.caseNumber || '');
    setFormClientName(c.client?.name || '');
    setFormDescription(c.description || '');
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
          body: JSON.stringify({ 
            title: formTitle.trim(), 
            caseNumber: formCaseNumber.trim(),
            description: formDescription.trim(),
            status: formStatus 
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
      } else {
        const res = await adminFetch(adminEndpoints.caseCreate(), {
          method: 'POST',
          body: JSON.stringify({ 
            title: formTitle.trim(), 
            caseNumber: formCaseNumber.trim(),
            client_name: formClientName.trim(),
            description: formDescription.trim(),
            status: formStatus 
          }),
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

  const openMilestones = async (c: CaseItem) => {
    setMilestonesCase(c);
    setMilestones([]);
    setMilestoneForm({ name: '', dueDate: '', sortOrder: '0' });
    setMilestonesLoading(true);
    try {
      const res = await adminFetch(adminEndpoints.caseMilestones(c.id));
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setMilestones(Array.isArray(json.data) ? json.data : []);
    } catch {
      setMilestones([]);
    } finally {
      setMilestonesLoading(false);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestonesCase || !milestoneForm.name.trim()) return;
    setMilestoneSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.caseMilestones(milestonesCase.id), {
        method: 'POST',
        body: JSON.stringify({
          name: milestoneForm.name.trim(),
          dueDate: milestoneForm.dueDate || null,
          sortOrder: parseInt(milestoneForm.sortOrder, 10) || 0,
        }),
      });
      if (!res.ok) throw new Error(res.statusText);
      const created = await res.json();
      setMilestones((prev) => [...prev, { ...created, name: created.name ?? milestoneForm.name, dueDate: created.dueDate, sortOrder: created.sortOrder ?? 0 }]);
      setMilestoneForm({ name: '', dueDate: '', sortOrder: String(milestones.length) });
    } catch {
      // ignore
    } finally {
      setMilestoneSaving(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!milestonesCase) return;
    try {
      const res = await adminFetch(adminEndpoints.caseMilestoneDetail(milestonesCase.id, milestoneId), { method: 'DELETE' });
      if (!res.ok) throw new Error(res.statusText);
      setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
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

      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <Filter className="w-4 h-4 text-slate-500" />
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Semua stage</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterClientId}
          onChange={(e) => setFilterClientId(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Semua klien</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          placeholder="Dari"
        />
        <input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          placeholder="Sampai"
        />
        <select
          value={selectedViewId}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedViewId(id);
            const v = savedViews.find((x) => x.id === id);
            if (v) applySavedView(v);
          }}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Tampilan tersimpan</option>
          {savedViews.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSaveViewModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100"
        >
          <Save className="w-4 h-4" />
          Simpan tampilan
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
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Nomor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Stage</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Klien</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-gray-900">{c.title}</td>
                    <td className="py-3 px-4 text-gray-600">{c.caseNumber || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{(c as CaseItem).stage ?? '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        c.status === 'aktif' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {c.status === 'aktif' ? 'Aktif' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {c.client ? (c.client.name || c.client.email) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openMilestones(c)}
                          className="p-1.5 text-[#1B4965] hover:bg-blue-50 rounded"
                          title="Milestones"
                        >
                          <Flag size={16} />
                        </button>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Perkara</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Klien</label>
                <input
                  type="text"
                  value={formClientName}
                  onChange={(e) => setFormClientName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Nama klien"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Perkara</label>
                <input
                  type="text"
                  value={formCaseNumber}
                  onChange={(e) => setFormCaseNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Nomor perkara (opsional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status Awal</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormStatus('aktif')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      formStatus === 'aktif'
                        ? 'bg-[#1B4965] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('pending')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      formStatus === 'pending'
                        ? 'bg-[#1B4965] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Pending
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 resize-none"
                  placeholder="Opsional - ringkasan singkat perkara ini..."
                />
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

      {milestonesCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Milestones — {milestonesCase.title}</h3>
              <button type="button" onClick={() => setMilestonesCase(null)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="p-4">
              {milestonesLoading ? (
                <p className="text-sm text-gray-500">Memuat...</p>
              ) : (
                <>
                  <ul className="mb-4 space-y-1 text-sm">
                    {milestones.map((m) => (
                      <li key={m.id} className="flex items-center justify-between py-1 border-b border-gray-100">
                        <span>{m.name} {m.dueDate ? `— ${new Date(m.dueDate).toLocaleDateString('id-ID')}` : ''}</span>
                        <button type="button" onClick={() => handleDeleteMilestone(m.id)} className="text-red-600 hover:underline text-xs">Hapus</button>
                      </li>
                    ))}
                    {milestones.length === 0 && <li className="text-gray-500">Belum ada milestone.</li>}
                  </ul>
                  <form onSubmit={handleAddMilestone} className="flex flex-wrap gap-2 items-end">
                    <input type="text" value={milestoneForm.name} onChange={(e) => setMilestoneForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama milestone" className="border border-gray-300 rounded-lg px-3 py-2 w-40" />
                    <input type="date" value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm((f) => ({ ...f, dueDate: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-2" />
                    <input type="number" value={milestoneForm.sortOrder} onChange={(e) => setMilestoneForm((f) => ({ ...f, sortOrder: e.target.value }))} placeholder="Urutan" className="border border-gray-300 rounded-lg px-3 py-2 w-16" min={0} />
                    <button type="submit" disabled={milestoneSaving} className="px-3 py-2 bg-[#1B4965] text-white rounded-lg text-sm disabled:opacity-50">Tambah</button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {saveViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Simpan tampilan</h3>
            <p className="text-sm text-gray-600 mb-3">Simpan filter saat ini sebagai tampilan (mis. My Active Cases).</p>
            <input
              type="text"
              value={saveViewName}
              onChange={(e) => setSaveViewName(e.target.value)}
              placeholder="Nama tampilan"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveView}
                disabled={saving || !saveViewName.trim()}
                className="flex-1 py-2 bg-[#1B4965] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => { setSaveViewModal(false); setSaveViewName(''); }}
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
