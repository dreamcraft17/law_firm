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
    <aside className="w-[260px] min-h-screen flex flex-col bg-white border-r border-slate-200 shrink-0">
      <div className="p-5 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-panel">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-slate-800 block leading-tight">Firma Hukum</span>
            <span className="text-xs text-slate-500">Admin Panel</span>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-3 overflow-y-auto sidebar-scroll">
        <p className="px-3 mb-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Menu</p>
        <ul className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-50 text-amber-800 border-l-4 border-amber-500 border-y-0 border-r-0 -ml-[3px] pl-[13px]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-3 border-t border-slate-100">
        <div className="px-3 py-2 text-xs text-slate-400">
          Panel operasional firma
        </div>
      </div>
    </aside>
  );
}
