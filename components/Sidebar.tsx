'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Shield,
  Briefcase,
  ListTodo,
  FolderOpen,
  DollarSign,
  BarChart3,
  FileCheck,
  BookOpen,
  Settings,
  UserPlus,
  Calendar,
} from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'User & Role', icon: Users },
  { href: '/roles', label: 'Roles & Permissions', icon: Shield },
  { href: '/leads', label: 'Intake & Lead', icon: UserPlus },
  { href: '/cases', label: 'Case Management', icon: Briefcase },
  { href: '/tasks', label: 'Task Workflow', icon: ListTodo },
  { href: '/documents', label: 'Dokumen', icon: FolderOpen },
  { href: '/billing', label: 'Billing', icon: DollarSign },
  { href: '/events', label: 'Kalender & Event', icon: Calendar },
  { href: '/reports', label: 'Reporting', icon: BarChart3 },
  { href: '/audit', label: 'Audit', icon: FileCheck },
  { href: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] min-h-screen flex flex-col bg-[#0a1628] shrink-0 border-r border-[#1e3a5f]/60 shadow-xl">
      <div className="p-5 border-b border-[#1e3a5f]/50">
        <Link href="/dashboard" className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 rounded-lg">
          <Image
            src="/logoapplagio.png"
            alt="LEGALTECH"
            width={44}
            height={44}
            className="object-contain shrink-0"
            priority
          />
          <div className="min-w-0">
            <span className="font-semibold text-white block leading-tight text-[15px] tracking-tight">
              LEGALTECH
            </span>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
              Admin Panel
            </span>
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto sidebar-scroll">
        <ul className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 border ${
                    isActive
                      ? 'bg-gold/15 text-gold border-gold/40'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-transparent'
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
      <div className="p-3 border-t border-[#1e3a5f]/50 bg-[#071018]/50">
        <p className="px-3 text-[11px] text-slate-500 font-medium">Panel operasional</p>
      </div>
    </aside>
  );
}
