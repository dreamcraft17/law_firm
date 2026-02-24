'use client';

import { useRouter } from 'next/navigation';
import { LogOut, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Header(props: { title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-panel">
      <h1 className="text-lg font-semibold text-slate-800">{props.title}</h1>
      <div className="flex items-center gap-4" ref={ref}>
        <div className="hidden sm:block text-sm text-slate-500">Panel Admin</div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
              A
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-white rounded-xl border border-slate-200 shadow-card z-50">
              <button
                type="button"
                onClick={() => { setOpen(false); router.push('/login'); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
