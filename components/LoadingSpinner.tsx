'use client';

export default function LoadingSpinner(props: { className?: string }) {
  return (
    <div
      className={`inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] ${props.className ?? ''}`}
      role="status"
      aria-label="Memuat"
    />
  );
}
