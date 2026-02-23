'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';

type AuditLog = {
  id: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: unknown;
  createdAt: string;
};

export default function AuditPage() {
  const [list, setList] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch(adminEndpoints.auditLogs());
        if (!res.ok) throw new Error(res.statusText);
        const json = await res.json();
        if (!cancelled) setList(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <p className="text-gray-600 mb-4">W7 — Audit & Compliance</p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h2 className="font-semibold text-gray-800 p-4 border-b">Audit Log</h2>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Belum ada log. Aksi create/update/delete perkara akan tercatat di sini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Waktu</th>
                  <th className="text-left p-3">Aksi</th>
                  <th className="text-left p-3">Entitas</th>
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {list.map((log) => (
                  <tr key={log.id} className="border-t border-gray-100">
                    <td className="p-3 text-gray-600">{new Date(log.createdAt).toLocaleString('id-ID')}</td>
                    <td className="p-3">{log.action}</td>
                    <td className="p-3">{log.entity}</td>
                    <td className="p-3 font-mono text-xs">{log.entityId?.slice(0, 8) ?? '—'}…</td>
                    <td className="p-3 text-gray-500">{JSON.stringify(log.details ?? {})}</td>
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
