'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';
import { Shield, Check, Loader2 } from 'lucide-react';

type Role = {
  id: string;
  name: string;
  _count?: { permissions: number; users: number };
  permissions?: { permission: { id: string; key: string; description: string | null } }[];
};

type Permission = {
  id: string;
  key: string;
  description: string | null;
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadRoles = async () => {
    const res = await adminFetch(adminEndpoints.rolesList());
    if (!res.ok) throw new Error(res.statusText);
    const json = await res.json();
    setRoles(json.data ?? []);
  };

  const loadPermissions = async () => {
    const res = await adminFetch(adminEndpoints.permissionsList());
    if (!res.ok) throw new Error(res.statusText);
    const json = await res.json();
    setPermissions(json.data ?? []);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([loadRoles(), loadPermissions()])
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat'))
      .finally(() => setLoading(false));
  }, []);

  const openEdit = async (role: Role) => {
    try {
      const res = await adminFetch(adminEndpoints.roleDetail(role.id));
      if (!res.ok) return;
      const detail: Role = await res.json();
      setEditingRole(detail);
      const ids = new Set((detail.permissions ?? []).map((rp) => rp.permission.id));
      setSelectedIds(ids);
    } catch {
      setError('Gagal memuat detail role');
    }
  };

  const togglePermission = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveRolePermissions = async () => {
    if (!editingRole) return;
    setSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.rolePermissions(editingRole.id), {
        method: 'PUT',
        body: JSON.stringify({ permissionIds: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error(res.statusText);
      await loadRoles();
      setEditingRole(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRoleName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await adminFetch(adminEndpoints.rolesList(), {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(res.statusText);
      setNewRoleName('');
      await loadRoles();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat role');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Memuat roles & permissions…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-slate-500 text-sm">Kelola role dan hak akses per modul (R0.1 RBAC).</p>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <form onSubmit={createRole} className="flex gap-2">
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="Nama role baru"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-48"
          />
          <button
            type="submit"
            disabled={creating || !newRoleName.trim()}
            className="px-4 py-2 bg-[#0c1929] text-white rounded-lg text-sm font-medium hover:bg-[#132337] disabled:opacity-50"
          >
            {creating ? '...' : 'Tambah Role'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Role</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Permissions</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Users</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-700">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="py-3 px-4">
                  <span className="font-medium text-slate-800">{role.name}</span>
                </td>
                <td className="py-3 px-4 text-slate-600">{role._count?.permissions ?? 0}</td>
                <td className="py-3 px-4 text-slate-600">{role._count?.users ?? 0}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => openEdit(role)}
                    className="text-[#0c1929] hover:underline font-medium"
                  >
                    Edit permissions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingRole && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#c9a227]" />
                Permissions — {editingRole.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-slate-500 text-sm mb-4">Centang permission yang boleh untuk role ini.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {permissions.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => togglePermission(p.id)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-slate-800 font-mono text-xs">{p.key}</span>
                    {p.description && (
                      <span className="text-slate-500 text-xs truncate" title={p.description}>
                        {p.description}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveRolePermissions}
                disabled={saving}
                className="px-4 py-2 bg-[#0c1929] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
