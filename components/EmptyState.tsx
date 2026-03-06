'use client';

import { ReactNode } from 'react';

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({ icon, title, description, action, className = '' }: Props) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-8 text-center ${className}`}
      role="status"
    >
      {icon && <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{icon}</div>}
      <h3 className="text-base font-medium text-[var(--text-primary)]">{title}</h3>
      {description && <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
