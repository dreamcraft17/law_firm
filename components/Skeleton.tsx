'use client';

export function SkeletonLine(props: { className?: string }) {
  return (
    <div
      className={`h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse ${props.className ?? ''}`}
      aria-hidden
    />
  );
}

export default function TableSkeleton(props: { rows?: number; cols?: number }) {
  const rows = props.rows ?? 5;
  const cols = props.cols ?? 5;
  return (
    <div className="space-y-3" role="status" aria-label="Memuat data">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonLine key={j} className={j === 0 ? 'flex-1' : 'w-24'} />
          ))}
        </div>
      ))}
    </div>
  );
}
