'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Pencil, Trash2, Plus } from 'lucide-react';

type SlaRuleItem = {
  id: string;
  caseType: string;
  dueDays: number;
  reminderDaysBefore: number[];
  escalationNotifyRole: string | null;
  isActive: boolean;
};

export default function SlaRulesPage() {
  const [list, setList] = useState<SlaRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SlaRuleItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formCaseType, setFormCaseType] = useState('');
  const [formDueDays, setFormDueDays] = useState('30');
  const [formReminderDays, setFormReminderDays] = useState('7, 3, 1');
  const [formEscalationRole, setFormEscalationRole] = useState('partner');
  const [formActive, setFormActive] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<SlaRuleItem | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.slaRulesList());
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setList(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const openAdd = () => {
    setEditing(null);
    setFormCaseType('');
    setFormDueDays('30');
    setFormReminderDays('7, 3, 1');
    setFormEscalationRole('partner');
    setFormActive(true);
    setModalOpen(true);
  };

  const openEdit = (r: SlaRuleItem) => {
    setEditing(r);
    setFormCaseType(r.caseType);
    setFormDueDays(String(r.dueDays));
    setFormReminderDays(Array.isArray(r.reminderDaysBefore) ? r.reminderDaysBefore.join(', ') : '7, 3, 1');
    setFormEscalationRole(r.escalationNotifyRole || 'partner');
    setFormActive(r.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const caseType = formCaseType.trim();
    if (!caseType) return;
    const dueDays = parseInt(formDueDays, 10) || 30;
    const reminderDaysBefore = formReminderDays.split(/[\s,]+/).map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n) && n > 0);
    if (reminderDaysBefore.length === 0) reminderDaysBefore.push(7, 3, 1);
    setSaving(true);
    try {
      if (editing) {
        const res = await adminFetch(adminEndpoints.slaRuleUpdate(editing.id), {
          method: 'PATCH',
          body: JSON.stringify({
            caseType,
            dueDays,
            reminderDaysBefore,
            escalationNotifyRole: formEscalationRole.trim() || null,
            isActive: formActive,
          }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
      } else {
        const res = await adminFetch(adminEndpoints.slaRuleCreate(), {
          method: 'POST',
          body: JSON.stringify({
            caseType,
            dueDays,
            reminderDaysBefore,
            escalationNotifyRole: formEscalationRole.trim() || null,
            isActive: formActive,
          }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
      }
      setModalOpen(false);
      fetchRules();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: SlaRuleItem) => {
    if (deleteConfirm?.id !== r.id) return;
    setSaving(true);
    try {
      await adminFetch(adminEndpoints.slaRuleDelete(r.id), { method: 'DELETE' });
      setDeleteConfirm(null);
      fetchRules();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-gray-600 mb-4">P5 — SLA & Deadline: aturan per tipe perkara, reminder sebelum deadline, escalasi jika lewat due date.</p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Aturan SLA per Tipe Perkara</h2>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm hover:opacity-90"
        >
          <Plus size={18} /> Tambah Aturan
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Belum ada aturan SLA. Klik Tambah Aturan.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Tipe Perkara</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Due (hari)</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Reminder (hari sebelum)</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Escalasi → Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Aktif</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="py-3 px-4 font-medium text-gray-900">{r.caseType}</td>
                  <td className="py-3 px-4 text-gray-600">{r.dueDays}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {Array.isArray(r.reminderDaysBefore) ? r.reminderDaysBefore.join(', ') : '-'}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{r.escalationNotifyRole || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.isActive ? 'Ya' : 'Tidak'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-[#1B4965] hover:bg-blue-50 rounded" title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => setDeleteConfirm(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded ml-1" title="Hapus">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-gray-600">
        <strong>Cron:</strong> Panggil <code className="bg-white px-1 rounded">GET/POST /api/cron/sla</code> (dengan header <code className="bg-white px-1 rounded">Authorization: Bearer CRON_SECRET</code>) setiap hari untuk mengirim reminder dan menandai escalasi. Atur di Vercel Cron atau scheduler lain.
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Aturan SLA' : 'Tambah Aturan SLA'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Perkara</label>
                <input
                  type="text"
                  value={formCaseType}
                  onChange={(e) => setFormCaseType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="litigation, corporate, dll"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due (hari dari buat perkara)</label>
                <input
                  type="number"
                  min={1}
                  value={formDueDays}
                  onChange={(e) => setFormDueDays(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reminder (hari sebelum due, pisah koma)</label>
                <input
                  type="text"
                  value={formReminderDays}
                  onChange={(e) => setFormReminderDays(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="7, 3, 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Escalasi: notifikasi ke role</label>
                <input
                  type="text"
                  value={formEscalationRole}
                  onChange={(e) => setFormEscalationRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="partner"
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sla-active" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
                <label htmlFor="sla-active" className="text-sm text-gray-700">Aturan aktif</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-[#1B4965] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-60">
                  {saving ? 'Menyimpan...' : editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <p className="text-gray-800 mb-4">Hapus aturan SLA untuk tipe &quot;{deleteConfirm.caseType}&quot;?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 border border-gray-300 rounded-lg">Batal</button>
              <button type="button" onClick={() => handleDelete(deleteConfirm)} disabled={saving} className="flex-1 py-2 bg-red-600 text-white rounded-lg disabled:opacity-60">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
