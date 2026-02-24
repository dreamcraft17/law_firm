'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ListTodo,
  FolderOpen,
  DollarSign,
  BarChart3,
  FileCheck,
  BookOpen,
  Settings,
  Scale,
} from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'User & Role', icon: Users },
  { href: '/cases', label: 'Case Management', icon: Briefcase },
  { href: '/tasks', label: 'Task Workflow', icon: ListTodo },
  { href: '/documents', label: 'Dokumen', icon: FolderOpen },
  { href: '/billing', label: 'Billing', icon: DollarSign },
  { href: '/reports', label: 'Reporting', icon: BarChart3 },
  { href: '/audit', label: 'Audit', icon: FileCheck },
  { href: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] min-h-screen flex flex-col bg-navy shrink-0">
      <div className="p-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gold flex items-center justify-center text-navy shadow-lg">
            <Scale className="w-6 h-6" strokeWidth={2.2} />
          </div>
          <div>
            <span className="font-bold text-white block leading-tight text-[15px]">Firma Hukum</span>
            <span className="text-[11px] text-slate-400 uppercase tracking-widest">Admin</span>
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-3 pb-4 overflow-y-auto sidebar-scroll">
        <ul className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-gold/20 text-gold-light border border-gold/30'
                      : 'text-slate-300 hover:bg-navy-light hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-3 border-t border-navy-border">
        <p className="px-3 text-[11px] text-slate-500">Panel operasional</p>
      </div>
    </aside>
  );
}
