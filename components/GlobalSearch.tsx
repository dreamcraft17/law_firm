'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Briefcase, User, FileText, ListTodo } from 'lucide-react';
import { adminFetch } from '@/lib/api-client';
import { adminEndpoints } from '@/lib/api-paths';

type SearchResults = {
  cases: Array<{ id: string; title: string; caseNumber?: string | null; client?: { id: string; name: string | null } | null }>;
  clients: Array<{ id: string; name: string }>;
  documents: Array<{ id: string; name: string; case?: { id: string; title: string } | null }>;
  tasks: Array<{ id: string; title: string; case?: { id: string; title: string } | null }>;
};

export default function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await adminFetch(adminEndpoints.search({ q: term, types: 'case,client,document,task', limit: 10 }));
      if (!res.ok) return setResults(null);
      const json = await res.json();
      setResults(json.data ?? null);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(q), 300);
    return () => clearTimeout(t);
  }, [q, doSearch]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  }, []);

  const hasResults = results && (results.cases?.length || results.clients?.length || results.documents?.length || results.tasks?.length);
  const showDropdown = open && (q.trim() !== '');

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          placeholder="Cari case, klien, dokumen, task..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          aria-label="Cari case, klien, dokumen, atau task"
        />
      </div>
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface-card)] rounded-lg border border-[var(--border)] shadow-lg z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-[var(--text-secondary)]">Memuat...</div>
          ) : !hasResults ? (
            <div className="p-4 text-sm text-[var(--text-secondary)]">Tidak ada hasil.</div>
          ) : (
            <div className="py-1">
              {results!.cases?.length > 0 && (
                <div className="px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase">Perkara</div>
              )}
              {results!.cases?.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setOpen(false); router.push(`/cases`); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <Briefcase className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
                  <span className="truncate">{c.title}</span>
                  {c.caseNumber && <span className="text-slate-400 text-xs shrink-0">{c.caseNumber}</span>}
                </button>
              ))}
              {results!.clients?.length > 0 && (
                <div className="px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase mt-1">Klien</div>
              )}
              {results!.clients?.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setOpen(false); router.push(`/cases?clientId=${c.id}`); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <User className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
              {results!.documents?.length > 0 && (
                <div className="px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase mt-1">Dokumen</div>
              )}
              {results!.documents?.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { setOpen(false); router.push(`/documents`); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
                  <span className="truncate">{d.name}</span>
                </button>
              ))}
              {results!.tasks?.length > 0 && (
                <div className="px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase mt-1">Task</div>
              )}
              {results!.tasks?.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setOpen(false); router.push(`/tasks`); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <ListTodo className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
                  <span className="truncate">{t.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
