'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/api-client';
import { ApiPaths, adminEndpoints } from '@/lib/api-paths';

type Setting = {
  id: string;
  key: string;
  value: unknown;
  category: string;
  description?: string | null;
};

type SessionItem = {
  id: string;
  source: string;
  userAgent?: string | null;
  deviceLabel?: string | null;
  ipAddress?: string | null;
  lastActiveAt?: string | null;
  createdAt: string;
  expiresAt: string;
};

export default function SettingsPage() {
  const [list, setList] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpDisablePassword, setTotpDisablePassword] = useState('');
  const [totpSaving, setTotpSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await adminFetch(adminEndpoints.sessionsMe());
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setSessions(Array.isArray(json.data) ? json.data : []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

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

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleTotpSetup = async () => {
    setTotpSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.authTotpSetup(), { method: 'POST' });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setTotpSetup({ secret: data.secret, uri: data.uri });
      setTotpCode('');
    } catch {
      setTotpSetup(null);
    } finally {
      setTotpSaving(false);
    }
  };

  const handleTotpEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode.trim()) return;
    setTotpSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.authTotpEnable(), { method: 'POST', body: JSON.stringify({ code: totpCode.trim() }) });
      if (!res.ok) throw new Error(res.statusText);
      setTotpSetup(null);
      setTotpCode('');
    } catch {
      // keep form
    } finally {
      setTotpSaving(false);
    }
  };

  const handleTotpDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpDisablePassword) return;
    setTotpSaving(true);
    try {
      const res = await adminFetch(adminEndpoints.authTotpDisable(), { method: 'POST', body: JSON.stringify({ password: totpDisablePassword }) });
      if (!res.ok) throw new Error(res.statusText);
      setTotpDisablePassword('');
    } catch {
      // keep form
    } finally {
      setTotpSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await adminFetch(adminEndpoints.sessionRevoke(sessionId), { method: 'DELETE' });
      if (!res.ok) throw new Error(res.statusText);
      loadSessions();
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <p className="text-slate-500 mb-6">W9 — System Configuration & Enterprise Security</p>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card mb-6">
        <h2 className="font-semibold text-slate-800 mb-2">2FA (TOTP)</h2>
        <p className="text-sm text-slate-500 mb-4">Aktifkan authenticator app untuk login admin web.</p>
        {!totpSetup ? (
          <div className="space-y-2">
            <button type="button" onClick={handleTotpSetup} disabled={totpSaving} className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm disabled:opacity-50">
              {totpSaving ? '...' : 'Setup 2FA (dapatkan QR code)'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleTotpEnable} className="space-y-2">
            <p className="text-sm text-slate-600">Pindai QR dengan Google Authenticator / Authy, lalu masukkan kode 6 digit.</p>
            <input type="text" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="000000" maxLength={6} className="border border-slate-300 rounded-lg px-3 py-2 w-32" />
            <div className="flex gap-2">
              <button type="submit" disabled={totpSaving || totpCode.length !== 6} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">Aktifkan</button>
              <button type="button" onClick={() => setTotpSetup(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm">Batal</button>
            </div>
          </form>
        )}
        <form onSubmit={handleTotpDisable} className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-600 mb-2">Nonaktifkan 2FA (masukkan password):</p>
          <input type="password" value={totpDisablePassword} onChange={(e) => setTotpDisablePassword(e.target.value)} placeholder="Password" className="border border-slate-300 rounded-lg px-3 py-2 w-48 mr-2" />
          <button type="submit" disabled={totpSaving || !totpDisablePassword} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm disabled:opacity-50">Nonaktifkan 2FA</button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card mb-6">
        <h2 className="font-semibold text-slate-800 mb-2">Sesi / Perangkat</h2>
        <p className="text-sm text-slate-500 mb-4">Daftar perangkat yang sedang login. Cabut sesi untuk logout dari perangkat tersebut.</p>
        {sessionsLoading ? (
          <div className="text-slate-500">Memuat...</div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500">Tidak ada sesi aktif.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                <div>
                  <span className="font-medium text-slate-800">{s.deviceLabel || s.userAgent || s.source || s.id.slice(0, 8)}</span>
                  {s.ipAddress && <span className="text-slate-500 ml-2">({s.ipAddress})</span>}
                  <span className="text-slate-400 ml-2">{new Date(s.createdAt).toLocaleString('id-ID')}</span>
                </div>
                <button type="button" onClick={() => handleRevokeSession(s.id)} className="text-red-600 hover:underline text-xs">Cabut</button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
