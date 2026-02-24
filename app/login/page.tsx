'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, ArrowRight, Shield, BarChart3, FileCheck } from 'lucide-react';
import { apiBaseUrl } from '@/lib/api-paths';
import { adminEndpoints } from '@/lib/api-paths';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/${adminEndpoints.authLogin()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Login gagal');
        return;
      }
      if (data.access_token) {
        try {
          localStorage.setItem('admin_token', data.access_token);
          if (data.permissions) localStorage.setItem('admin_permissions', JSON.stringify(data.permissions));
          if (data.roleId) localStorage.setItem('admin_roleId', data.roleId);
        } catch (_) {}
      }
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-[48%] bg-[#0a1628] flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1929] via-[#0a1628] to-[#071018] opacity-100" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[#c9a227]/8 blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#1e3a5f]/20 blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden backdrop-blur-sm">
                <Image
                  src="/logoapplagio.png"
                  alt="LEGALTECH"
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">LEGALTECH</h1>
              <p className="text-slate-400 text-sm font-medium">Firma Hukum & Konsultan</p>
            </div>
          </div>
          <div className="mt-16">
            <h2 className="text-2xl font-semibold text-white tracking-tight">Admin Panel</h2>
            <p className="mt-3 text-slate-400 text-[15px] leading-relaxed max-w-sm">
              Kelola perkara, billing, dan laporan dalam satu dashboard terpadu.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                { icon: Shield, text: 'Akses aman & terenkripsi' },
                { icon: BarChart3, text: 'Reporting & analytics real-time' },
                { icon: FileCheck, text: 'Manajemen dokumen terpusat' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-slate-300 text-sm">
                  <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#c9a227]" strokeWidth={2} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="relative z-10 px-12 pb-10">
          <p className="text-slate-500 text-sm">© LEGALTECH — Panel operasional</p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-slate-50/80">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <Image
                  src="/logoapplagio.png"
                  alt="LEGALTECH"
                  width={36}
                  height={36}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <span className="font-bold text-slate-800 text-base block">LEGALTECH</span>
                <span className="text-slate-500 text-xs">Admin</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-8 sm:p-10">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Masuk ke Admin</h2>
              <p className="text-slate-500 text-sm mt-1">Gunakan akun Anda untuk mengakses dashboard</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#0c1929]/10 focus:border-[#0c1929] transition-all text-sm bg-slate-50/50 hover:bg-white"
                    placeholder="nama@firma.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#0c1929]/10 focus:border-[#0c1929] transition-all text-sm bg-slate-50/50 hover:bg-white"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#0c1929] text-white font-semibold rounded-xl hover:bg-[#132337] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0c1929]/20"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-slate-400 text-xs">
              Hubungi administrator jika Anda lupa kredensial.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
