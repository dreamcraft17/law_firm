'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Pencil, Trash2, UserPlus, History, LogOut } from 'lucide-react';

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

const ROLES = ['admin', 'partner', 'lawyer', 'staff', 'client', 'finance', 'management'] as const;

export default function UsersPage() {
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<string>('staff');
  const [formPassword, setFormPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [loginHistoryUser, setLoginHistoryUser] = useState<User | null>(null);
  const [loginHistory, setLoginHistory] = useState<{ createdAt: string; details?: unknown }[]>([]);
  const [forceLogoutLoading, setForceLogoutLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(adminEndpoints.usersList());
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
    fetchUsers();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setFormEmail('');
    setFormName('');
    setFormRole('staff');
    setFormPassword('');
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setFormEmail(u.email);
    setFormName(u.name ?? '');
    setFormRole(u.role);
    setFormPassword('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const res = await adminFetch(adminEndpoints.userUpdate(editing.id), {
          method: 'PUT',
          body: JSON.stringify({
            name: formName.trim() || null,
            role: formRole,
            ...(formPassword ? { password: formPassword } : {}),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
      } else {
        const res = await adminFetch(adminEndpoints.userCreate(), {
          method: 'POST',
          body: JSON.stringify({
            email: formEmail.trim(),
            name: formName.trim() || null,
            role: formRole,
            password: formPassword,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
      }
      setModalOpen(false);
      fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (!deleteConfirm || deleteConfirm.id !== u.id) return;
    setSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.userDelete(u.id), { method: 'DELETE' });
      if (!res.ok) throw new Error(res.statusText);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus');
    } finally {
      setSaving(false);
    }
  };

  const openLoginHistory = async (u: User) => {
    setLoginHistoryUser(u);
    setLoginHistory([]);
    try {
      const res = await adminFetch(adminEndpoints.userLoginHistory(u.id));
      if (res.ok) {
        const json = await res.json();
        setLoginHistory(Array.isArray(json.data) ? json.data : []);
      }
    } catch {
      setLoginHistory([]);
    }
  };

  const handleForceLogout = async (u: User) => {
    setForceLogoutLoading(u.id);
    try {
      const res = await adminFetch(adminEndpoints.userForceLogout(u.id), { method: 'POST' });
      if (!res.ok) throw new Error(res.statusText);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal force logout');
    } finally {
      setForceLogoutLoading(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">User & Role Management</h1>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <UserPlus size={18} />
          Tambah User
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
          <div className="p-8 text-center text-gray-500">Belum ada user. Klik Tambah User.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Nama</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-gray-900">{u.email}</td>
                    <td className="py-3 px-4 text-gray-600">{u.name ?? '-'}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openLoginHistory(u)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                          title="Riwayat login"
                        >
                          <History size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleForceLogout(u)}
                          disabled={forceLogoutLoading === u.id}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded disabled:opacity-50"
                          title="Force logout"
                        >
                          <LogOut size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(u)}
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

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Edit User' : 'Tambah User'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  disabled={!!editing}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editing ? '(kosongkan jika tidak diubah)' : ''}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required={!editing}
                  minLength={6}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-[#1B4965] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : editing ? 'Simpan' : 'Buat User'}
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

      {/* Modal konfirmasi hapus */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <p className="text-gray-700 mb-4">
              Hapus user <strong>{deleteConfirm.email}</strong>? Tindakan ini tidak dapat dibatalkan
              (soft delete).
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

      {/* Modal riwayat login */}
      {loginHistoryUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Riwayat login — {loginHistoryUser.email}</h3>
              <button type="button" onClick={() => setLoginHistoryUser(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-4 overflow-auto">
              {loginHistory.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada riwayat login (atau user belum login via mobile).</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {loginHistory.map((log, i) => (
                    <li key={i} className="py-2 border-b border-gray-100 last:border-0">
                      <span className="text-gray-600">{new Date(log.createdAt).toLocaleString('id-ID')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
