'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scale } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[45%] bg-navy flex-col justify-between p-12">
        <div>
          <div className="w-14 h-14 rounded-2xl bg-gold flex items-center justify-center text-navy shadow-lg">
            <Scale className="w-8 h-8" strokeWidth={2.2} />
          </div>
          <h1 className="mt-8 text-2xl font-bold text-white tracking-tight">Firma Hukum</h1>
          <p className="mt-2 text-slate-400 text-[15px] max-w-[280px]">
            Panel admin untuk operasional, manajemen perkara, billing, dan reporting.
          </p>
        </div>
        <p className="text-slate-500 text-sm">Login untuk mengakses dashboard</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gold flex items-center justify-center text-navy">
              <Scale className="w-6 h-6" strokeWidth={2.2} />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Masuk ke Admin</h2>
          <p className="text-slate-500 text-sm mt-1 mb-8">Gunakan akun Anda untuk login</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-gold/25 focus:border-gold transition-all"
                placeholder="nama@firma.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-gold/25 focus:border-gold transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-navy text-white font-semibold rounded-xl hover:bg-navy-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
