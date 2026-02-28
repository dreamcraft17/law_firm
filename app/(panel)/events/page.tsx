'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Calendar, Plus } from 'lucide-react';

type EventItem = {
  id: string;
  title: string;
  startAt: string;
  endAt?: string | null;
  type?: string | null;
  caseId?: string | null;
  taskId?: string | null;
  location?: string | null;
  reminderMinutes?: number | null;
  case_?: {
    id: string;
    title: string;
    caseNumber?: string | null;
    teamMembers?: Array<{ user: { id: string; name: string | null } }>;
    client?: { id: string; name: string } | null;
  } | null;
  task?: { id: string; title: string } | null;
  lead?: {
    id: string;
    name: string;
    email?: string | null;
    client?: { id: string; name: string } | null;
    case?: {
      id: string;
      teamMembers?: Array<{ user: { id: string; name: string | null } }>;
    } | null;
  } | null;
};

export default function EventsPage() {
  const [list, setList] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [caseId, setCaseId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formCaseId, setFormCaseId] = useState('');
  const [formTaskId, setFormTaskId] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formReminder, setFormReminder] = useState('');
  const [saving, setSaving] = useState(false);
  const [cases, setCases] = useState<Array<{ id: string; title: string; caseNumber?: string | null }>>([]);
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; caseId?: string | null }>>([]);

  useEffect(() => {
    adminFetch(adminEndpoints.casesList()).then((r) => r.ok && r.json()).then((j) => setCases(Array.isArray(j?.data) ? j.data : [])).catch(() => {});
    adminFetch(adminEndpoints.tasksList()).then((r) => r.ok && r.json()).then((j) => setTasks(Array.isArray(j?.data) ? j.data : [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { from?: string; to?: string; caseId?: string } = { from, to };
      if (caseId) params.caseId = caseId;
      const res = await adminFetch(adminEndpoints.eventsList(params));
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setList(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formStart) return;
    setSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.eventCreate(), {
        method: 'POST',
        body: JSON.stringify({
          title: formTitle.trim(),
          startAt: formStart,
          endAt: formEnd || null,
          caseId: formCaseId || null,
          taskId: formTaskId || null,
          location: formLocation.trim() || null,
          reminderMinutes: formReminder ? parseInt(formReminder, 10) : null,
        }),
      });
      if (!res.ok) throw new Error('Gagal buat event');
      setModalOpen(false);
      setFormTitle('');
      setFormStart('');
      setFormEnd('');
      setFormCaseId('');
      setFormTaskId('');
      setFormLocation('');
      setFormReminder('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal buat event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Kalender & Event</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus size={18} />
          Tambah Event
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <Calendar className="w-4 h-4 text-slate-500" />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
        <span className="text-slate-500">s/d</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
        <select value={caseId} onChange={(e) => setCaseId(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-56">
          <option value="">Semua case</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Tidak ada event dalam rentang ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Judul</th>
                  <th className="text-left p-3">Pengaju</th>
                  <th className="text-left p-3">Pengacara</th>
                  <th className="text-left p-3">Mulai</th>
                  <th className="text-left p-3">Selesai</th>
                  <th className="text-left p-3">Case / Task</th>
                  <th className="text-left p-3">Lokasi</th>
                  <th className="text-left p-3">Reminder</th>
                </tr>
              </thead>
              <tbody>
                {list.map((ev) => {
                  const pengaju = ev.lead
                    ? ev.lead.client?.name ?? ev.lead.name
                    : ev.case_?.client?.name ?? null;
                  const teamFromCase = ev.case_?.teamMembers;
                  const teamFromLeadCase = ev.lead?.case?.teamMembers;
                  const pengacara =
                    teamFromCase?.length && teamFromCase[0]?.user?.name
                      ? teamFromCase.map((m) => m.user.name).filter(Boolean).join(', ')
                      : teamFromLeadCase?.length && teamFromLeadCase[0]?.user?.name
                        ? teamFromLeadCase.map((m) => m.user.name).filter(Boolean).join(', ')
                        : null;
                  return (
                    <tr key={ev.id} className="border-t border-gray-100">
                      <td className="p-3 font-medium">{ev.title}</td>
                      <td className="p-3 text-gray-600">{pengaju ?? '—'}</td>
                      <td className="p-3 text-gray-600">{pengacara ?? 'Belum dipilih'}</td>
                      <td className="p-3 text-gray-600">{new Date(ev.startAt).toLocaleString('id-ID')}</td>
                      <td className="p-3 text-gray-600">{ev.endAt ? new Date(ev.endAt).toLocaleString('id-ID') : '—'}</td>
                      <td className="p-3 text-gray-600">
                        {ev.case_ ? `${ev.case_.title}${ev.case_.caseNumber ? ` (${ev.case_.caseNumber})` : ''}` : ev.task ? ev.task.title : '—'}
                      </td>
                      <td className="p-3 text-gray-600">{ev.location || '—'}</td>
                      <td className="p-3 text-gray-600">{ev.reminderMinutes != null ? `${ev.reminderMinutes} menit` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Tambah Event</h2>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mulai *</label>
                  <input type="datetime-local" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selesai</label>
                  <input type="datetime-local" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Case (opsional)</label>
                <select value={formCaseId} onChange={(e) => setFormCaseId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">— Pilih case —</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>{c.title} {c.caseNumber ? `(${c.caseNumber})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task (opsional)</label>
                <select value={formTaskId} onChange={(e) => setFormTaskId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">— Pilih task —</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                <input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reminder (menit)</label>
                <input type="number" value={formReminder} onChange={(e) => setFormReminder(e.target.value)} placeholder="15" className="w-full border border-gray-300 rounded-lg px-3 py-2" min={0} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-[#1B4965] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-60">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
