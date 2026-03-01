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
  Clock,
  Timer,
  Siren,
  PiggyBank,
  Globe,
  DatabaseZap,
  Activity,
} from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'User & Role', icon: Users },
  { href: '/roles', label: 'Roles & Permissions', icon: Shield },
  { href: '/leads', label: 'Intake & Lead', icon: UserPlus },
  { href: '/cases', label: 'Case Management', icon: Briefcase },
  { href: '/sla-rules', label: 'SLA & Deadline', icon: Timer },
  { href: '/escalations', label: 'Escalation', icon: Siren },
  { href: '/budget', label: 'Matter Budget', icon: PiggyBank },
  { href: '/client-portal', label: 'Client Portal', icon: Globe },
  { href: '/tasks', label: 'Task Workflow', icon: ListTodo },
  { href: '/time-entries', label: 'Time Tracking', icon: Clock },
  { href: '/documents', label: 'Dokumen', icon: FolderOpen },
  { href: '/billing', label: 'Billing', icon: DollarSign },
  { href: '/events', label: 'Kalender & Event', icon: Calendar },
  { href: '/reports', label: 'Reporting', icon: BarChart3 },
  { href: '/audit', label: 'Audit', icon: FileCheck },
  { href: '/data-governance', label: 'Data Governance', icon: DatabaseZap },
  { href: '/observability', label: 'Observability', icon: Activity },
  { href: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] min-h-screen flex flex-col bg-[#1e3a8a] shrink-0 border-r border-[#1d4ed8]/40 shadow-xl">
      {/* Logo */}
      <div className="p-5 border-b border-[#1d4ed8]/40">
        <Link href="/dashboard" className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50 rounded-lg">
          <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden backdrop-blur-sm shrink-0">
            <Image
              src="/logoapplagio.png"
              alt="LEGALTECH"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-white block leading-tight text-[15px] tracking-tight">
              LEGALTECH
            </span>
            <span className="text-[11px] text-blue-300 uppercase tracking-wider font-medium">
              Admin Panel
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto sidebar-scroll">
        <p className="px-3 mb-2 text-[10px] font-semibold text-blue-300/60 uppercase tracking-widest">Menu</p>
        <ul className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-[#1e3a8a] shadow-sm'
                      : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-[#2563eb]' : ''}`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span>{label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3b82f6] shrink-0" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[#1d4ed8]/40 bg-[#172e70]/60">
        <p className="px-3 text-[11px] text-blue-300/60 font-medium">Panel operasional</p>
      </div>
    </aside>
  );
}
