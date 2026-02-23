'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api-client';
import { ApiPaths } from '@/lib/api-paths';

type Setting = {
  id: string;
  key: string;
  value: unknown;
  category: string;
  description?: string | null;
};

export default function SettingsPage() {
  const [list, setList] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch(ApiPaths.settings);
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
      <p className="text-gray-600 mb-4">W9 — System Configuration</p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Pengaturan Sistem</h2>
        {loading ? (
          <div className="text-gray-500">Memuat...</div>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada pengaturan. Konfigurasi disimpan di backend (system_settings).</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {list.map((s) => (
              <li key={s.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-medium">{s.key}</span>
                <span className="text-gray-500">{s.category}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
