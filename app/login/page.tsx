'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, ArrowRight, Shield, BarChart3, FileCheck, Eye, EyeOff } from 'lucide-react';
import { apiBaseUrl } from '@/lib/api-paths';
import { adminEndpoints } from '@/lib/api-paths';

const REMEMBER_EMAIL_KEY = 'admin_remember_email';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    try {
      const res = await fetch(`${apiBaseUrl}/${adminEndpoints.authLogin()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          remember_me: rememberMe,
        }),
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
          if (rememberMe) localStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail);
          else localStorage.removeItem(REMEMBER_EMAIL_KEY);
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
      <div className="hidden lg:flex lg:w-[48%] bg-[#1e3a8a] flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#172e70] opacity-100" />
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#3b82f6]/15 blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#172e70]/60 blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full bg-[#60a5fa]/8 blur-3xl -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 p-12">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden backdrop-blur-sm">
              <Image
                src="/logoapplagio.png"
                alt="LEGALTECH"
                width={44}
                height={44}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">LEGALTECH</h1>
              <p className="text-blue-200 text-sm font-medium">Firma Hukum & Konsultan</p>
            </div>
          </div>

          {/* Tagline */}
          <div className="mt-16">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" />
              <span className="text-blue-200 text-xs font-medium tracking-wide">Satu platform operasional firma</span>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight leading-snug">
              Panel Operasional<br />
              <span className="text-blue-200">untuk Tim Firma</span>
            </h2>
            <p className="mt-4 text-blue-100/80 text-[15px] leading-relaxed max-w-sm">
              Perkara, keuangan, dan laporan dalam satu dashboard.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                { icon: Shield, text: 'Keamanan & enkripsi data' },
                { icon: BarChart3, text: 'Laporan dan analitik real-time' },
                { icon: FileCheck, text: 'Dokumen dan arsip terpusat' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-blue-100 text-sm">
                  <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-blue-300" strokeWidth={2} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative z-10 px-12 pb-10">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <p className="text-blue-300/70 text-sm">© LEGALTECH — Panel operasional</p>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-slate-50">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#1e3a8a] flex items-center justify-center overflow-hidden shadow-md">
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

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-8 sm:p-10">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Masuk ke Panel</h2>
              <p className="text-slate-500 text-sm mt-1">Masukkan email dan kata sandi untuk mengakses dashboard</p>
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
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-slate-50/50 hover:bg-white"
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
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-11 pr-11 py-3 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-slate-50/50 hover:bg-white"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#1e3a8a] focus:ring-blue-500"
                />
                <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer select-none">
                  Ingat saya
                </label>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#1e3a8a] text-white font-semibold rounded-xl hover:bg-[#1d4ed8] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25"
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
              Lupa kata sandi? Hubungi administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
