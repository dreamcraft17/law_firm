'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Pencil, Trash2, UserPlus, CheckCircle, Calendar, AlertTriangle } from 'lucide-react';

type LeadItem = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  serviceCategory?: string | null;
  problemSummary?: string | null;
  status: string;
  clientId?: string | null;
  caseId?: string | null;
  createdAt: string;
  client?: { id: string; name: string } | null;
  case?: { id: string; title: string } | null;
};

const SOURCES = ['referral', 'website', 'partner', 'event', 'other'];
const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

export default function LeadsPage() {
  const [list, setList] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeadItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formServiceCategory, setFormServiceCategory] = useState('');
  const [formProblemSummary, setFormProblemSummary] = useState('');
  const [formStatus, setFormStatus] = useState('new');
  const [deleteConfirm, setDeleteConfirm] = useState<LeadItem | null>(null);
  const [convertModal, setConvertModal] = useState<LeadItem | null>(null);
  const [convertTitle, setConvertTitle] = useState('');
  const [convertPartiesPlaintiff, setConvertPartiesPlaintiff] = useState('');
  const [convertPartiesDefendant, setConvertPartiesDefendant] = useState('');
  const [conflictResult, setConflictResult] = useState<{ hasConflict: boolean; conflicts: { caseId: string; title: string; reason: string }[] } | null>(null);
  const [consultationModal, setConsultationModal] = useState<LeadItem | null>(null);
  const [consultationStart, setConsultationStart] = useState('');
  const [consultationEnd, setConsultationEnd] = useState('');

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.leadsList());
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
    fetchLeads();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormSource('');
    setFormServiceCategory('');
    setFormProblemSummary('');
    setFormStatus('new');
    setModalOpen(true);
  };

  const openEdit = (c: LeadItem) => {
    setEditing(c);
    setFormName(c.name);
    setFormEmail(c.email ?? '');
    setFormPhone(c.phone ?? '');
    setFormSource(c.source ?? '');
    setFormServiceCategory(c.serviceCategory ?? '');
    setFormProblemSummary(c.problemSummary ?? '');
    setFormStatus(c.status);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: formName.trim(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        source: formSource.trim() || null,
        serviceCategory: formServiceCategory.trim() || null,
        problemSummary: formProblemSummary.trim() || null,
        status: formStatus,
      };
      if (editing) {
        const res = await adminFetch(adminEndpoints.leadUpdate(editing.id), { method: 'PUT', body: JSON.stringify(payload) });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
      } else {
        const res = await adminFetch(adminEndpoints.leadCreate(), { method: 'POST', body: JSON.stringify(payload) });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
      }
      setModalOpen(false);
      fetchLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: LeadItem) => {
    if (!deleteConfirm || deleteConfirm.id !== item.id) return;
    setSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.leadDelete(item.id), { method: 'DELETE' });
      if (!res.ok) throw new Error(res.statusText);
      setDeleteConfirm(null);
      fetchLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus');
    } finally {
      setSaving(false);
    }
  };

  const runConflictCheck = async () => {
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.leadConflictCheck(), {
        method: 'POST',
        body: JSON.stringify({
          parties: {
            plaintiff: convertPartiesPlaintiff.trim() || undefined,
            defendant: convertPartiesDefendant.trim() || undefined,
          },
        }),
      });
      const json = await res.json();
      setConflictResult({ hasConflict: json.hasConflict ?? false, conflicts: json.conflicts ?? [] });
    } catch (e) {
      setConflictResult({ hasConflict: false, conflicts: [] });
      setError(e instanceof Error ? e.message : 'Conflict check gagal');
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertModal) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.leadConvert(convertModal.id), {
        method: 'POST',
        body: JSON.stringify({
          title: convertTitle.trim() || undefined,
          parties: {
            plaintiff: convertPartiesPlaintiff.trim() || undefined,
            defendant: convertPartiesDefendant.trim() || undefined,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      setConvertModal(null);
      setConflictResult(null);
      fetchLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Konversi gagal');
    } finally {
      setSaving(false);
    }
  };

  const openConvert = (item: LeadItem) => {
    setConvertModal(item);
    setConvertTitle('');
    setConvertPartiesPlaintiff('');
    setConvertPartiesDefendant('');
    setConflictResult(null);
  };

  const openConsultation = (item: LeadItem) => {
    setConsultationModal(item);
    setConsultationStart('');
    setConsultationEnd('');
  };

  const handleConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultationModal || !consultationStart) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.leadConsultation(consultationModal.id), {
        method: 'POST',
        body: JSON.stringify({
          action: 'request',
          startAt: consultationStart,
          endAt: consultationEnd || undefined,
          title: `Konsultasi: ${consultationModal.name}`,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      setConsultationModal(null);
      fetchLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Jadwal konsultasi gagal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Intake & Lead</h1>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <UserPlus size={18} />
          Tambah Lead
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Belum ada lead. Klik Tambah Lead.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Nama</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Kontak</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Sumber</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Kategori Layanan</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Case</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-gray-900 font-medium">{item.name}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {item.email || item.phone || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{item.source || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{item.serviceCategory || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          item.status === 'converted'
                            ? 'bg-green-100 text-green-700'
                            : item.status === 'lost'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {item.case ? (
                        <a href={`/cases?highlight=${item.case.id}`} className="text-[#1B4965] hover:underline">
                          {item.case.title?.slice(0, 30)}…
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        {!item.caseId && (
                          <>
                            <button
                              type="button"
                              onClick={() => openConvert(item)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Konversi ke Case"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openConsultation(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Jadwal Konsultasi"
                            >
                              <Calendar size={16} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(item)}
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

      {/* Form Tambah/Edit Lead */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Lead' : 'Tambah Lead'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sumber lead</label>
                <select
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">— Pilih —</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori layanan</label>
                <input
                  type="text"
                  value={formServiceCategory}
                  onChange={(e) => setFormServiceCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Contoh: Perdata, Pidana, Korporasi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ringkasan masalah</label>
                <textarea
                  value={formProblemSummary}
                  onChange={(e) => setFormProblemSummary(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 resize-none"
                  placeholder="Ringkasan singkat masalah hukum..."
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
                  {saving ? 'Menyimpan...' : editing ? 'Simpan' : 'Tambah Lead'}
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

      {/* Modal Konversi Lead → Case */}
      {convertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Konversi ke Case</h2>
              <p className="text-sm text-gray-500 mt-1">{convertModal.name}</p>
            </div>
            <form onSubmit={handleConvert} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul case (opsional)</label>
                <input
                  type="text"
                  value={convertTitle}
                  onChange={(e) => setConvertTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Kosongkan = otomatis dari lead"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pihak (untuk conflict check)</label>
                <input
                  type="text"
                  value={convertPartiesPlaintiff}
                  onChange={(e) => setConvertPartiesPlaintiff(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2"
                  placeholder="Penggugat / Plaintiff"
                />
                <input
                  type="text"
                  value={convertPartiesDefendant}
                  onChange={(e) => setConvertPartiesDefendant(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Tergugat / Defendant"
                />
              </div>
              {conflictResult && (
                <div className={`p-3 rounded-lg text-sm ${conflictResult.hasConflict ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {conflictResult.hasConflict ? (
                    <>
                      <p className="font-medium">Ditemukan konflik:</p>
                      <ul className="list-disc list-inside mt-1">
                        {conflictResult.conflicts.map((c) => (
                          <li key={c.caseId}>{c.title} ({c.reason})</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    'Tidak ada konflik terdeteksi.'
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={runConflictCheck}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cek konflik
                </button>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-[#1B4965] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? 'Mengonversi...' : 'Konversi ke Case'}
                </button>
                <button
                  type="button"
                  onClick={() => { setConvertModal(null); setConflictResult(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Jadwal Konsultasi */}
      {consultationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Jadwal Konsultasi</h2>
              <p className="text-sm text-gray-500 mt-1">{consultationModal.name}</p>
            </div>
            <form onSubmit={handleConsultation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mulai *</label>
                <input
                  type="datetime-local"
                  value={consultationStart}
                  onChange={(e) => setConsultationStart(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selesai (opsional)</label>
                <input
                  type="datetime-local"
                  value={consultationEnd}
                  onChange={(e) => setConsultationEnd(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving || !consultationStart}
                  className="flex-1 py-2 bg-[#1B4965] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Buat Jadwal'}
                </button>
                <button
                  type="button"
                  onClick={() => setConsultationModal(null)}
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
              Hapus lead <strong>{deleteConfirm.name}</strong>?
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
