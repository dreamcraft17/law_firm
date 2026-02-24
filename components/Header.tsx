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
    <header className="h-14 bg-white flex items-center justify-between px-6 shrink-0 border-b border-slate-200/80">
      <h1 className="text-[17px] font-semibold text-slate-800">{props.title}</h1>
      <div className="flex items-center gap-2" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center text-gold text-sm font-bold">
            A
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute right-6 top-14 mt-0.5 py-1.5 w-44 bg-white rounded-xl border border-slate-200 shadow-dropdown z-50">
            <button
              type="button"
              onClick={() => { setOpen(false); router.push('/login'); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg mx-1"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              Keluar
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
