'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'User & Role Management',
  '/roles': 'Roles & Permissions',
  '/cases': 'Case Management',
  '/tasks': 'Task Workflow',
  '/documents': 'Document Management',
  '/billing': 'Billing & Finance',
  '/reports': 'Reporting & Analytics',
  '/audit': 'Audit & Compliance',
  '/knowledge-base': 'Knowledge Base',
  '/settings': 'System Configuration',
};

export default function PanelShell(props: { children: React.ReactNode }) {
  const pathname = usePathname();
  const base = '/' + pathname.split('/').filter(Boolean)[0] || 'dashboard';
  const title = titles[base] || 'Admin Panel';

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {props.children}
          </div>
        </main>
      </div>
    </div>
  );
}
