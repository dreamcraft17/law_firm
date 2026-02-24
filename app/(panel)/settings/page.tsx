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
      <p className="text-slate-500 mb-6">W9 — System Configuration</p>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
        <h2 className="font-semibold text-slate-800 mb-4">Pengaturan Sistem</h2>
        {loading ? (
          <div className="text-slate-500">Memuat...</div>
        ) : list.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada pengaturan. Konfigurasi disimpan di backend (system_settings).</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {list.map((s) => (
              <li key={s.id} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                <span className="font-medium text-slate-800">{s.key}</span>
                <span className="text-slate-500 px-2.5 py-1 rounded-lg bg-slate-100">{s.category}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
