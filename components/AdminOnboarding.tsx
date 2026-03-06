'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ArrowRight, LayoutDashboard, Briefcase, FolderOpen, BarChart3 } from 'lucide-react';

const STORAGE_KEY = 'admin_tour_done';

const steps = [
  { id: 'dashboard', title: 'Dashboard', href: '/dashboard', desc: 'Ringkasan aktivitas dan statistik singkat.', icon: LayoutDashboard },
  { id: 'cases', title: 'Case Management', href: '/cases', desc: 'Kelola perkara, klien, SLA, dan tim.', icon: Briefcase },
  { id: 'documents', title: 'Dokumen', href: '/documents', desc: 'Unggah dan kelola dokumen serta e-sign.', icon: FolderOpen },
  { id: 'reports', title: 'Reporting', href: '/reports', desc: 'Laporan dan analitik, termasuk SLA breach.', icon: BarChart3 },
];

export default function AdminOnboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') return;
      setOpen(true);
    } catch {
      setOpen(false);
    }
  }, []);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!open) return null;

  const current = steps[step];
  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-desc"
    >
      <div className="bg-[var(--surface-card)] rounded-xl shadow-xl w-full max-w-md border border-[var(--border)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Langkah {step + 1} dari {steps.length}
          </span>
          <button
            type="button"
            onClick={finish}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="Lewati tur"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <div className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-[var(--accent)] mb-4">
            <current.icon className="h-6 w-6" aria-hidden />
          </div>
          <h2 id="onboarding-title" className="text-lg font-semibold text-[var(--text-primary)]">
            {current.title}
          </h2>
          <p id="onboarding-desc" className="mt-2 text-sm text-[var(--text-secondary)]">
            {current.desc}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={current.href}
              onClick={finish}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-lg text-sm font-medium hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              Buka {current.title}
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                Lanjut
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                Selesai
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1 p-4 border-t border-[var(--border)]">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i === step ? 'bg-[var(--accent)]' : 'bg-slate-200 dark:bg-slate-600'
              }`}
              aria-label={`Langkah ${i + 1}`}
              aria-current={i === step ? 'step' : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
