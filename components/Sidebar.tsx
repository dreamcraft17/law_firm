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
  { href: '/documents', label: 'Document Mgmt', icon: FolderOpen },
  { href: '/billing', label: 'Billing & Finance', icon: DollarSign },
  { href: '/reports', label: 'Reporting', icon: BarChart3 },
  { href: '/audit', label: 'Audit & Compliance', icon: FileCheck },
  { href: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { href: '/settings', label: 'System Config', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#1B4965] text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Scale className="w-8 h-8" />
          <span>Admin Panel</span>
        </Link>
      </div>
      <nav className="flex-1 p-2 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-sm">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
