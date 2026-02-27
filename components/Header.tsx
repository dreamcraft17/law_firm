'use client';

import { useRouter } from 'next/navigation';
import { LogOut, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import GlobalSearch from '@/components/GlobalSearch';

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
    <header className="h-14 bg-white flex items-center justify-between gap-4 px-6 shrink-0 border-b border-slate-200/90 shadow-sm">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <h1 className="text-[15px] font-semibold text-slate-800 tracking-tight shrink-0">{props.title}</h1>
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-2 shrink-0" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 pl-2.5 pr-2 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          aria-expanded={open}
          aria-haspopup="true"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0c1929] flex items-center justify-center text-[#c9a227] text-xs font-semibold">
            A
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute right-6 top-14 mt-0.5 py-1 w-44 bg-white rounded-lg border border-slate-200 shadow-dropdown z-50">
            <button
              type="button"
              onClick={() => { setOpen(false); router.push('/login'); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-md mx-1 text-left"
            >
              <LogOut className="w-4 h-4 text-slate-500 shrink-0" />
              Keluar
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
