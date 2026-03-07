export default function Loading() {
  return (
    <>
      <div className="global-loading-bar" aria-hidden />
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-[var(--corporate)] border-t-transparent animate-spin"
            aria-hidden
          />
          <p className="text-sm text-[var(--text-secondary)] animate-pulse">Memuat…</p>
        </div>
      </div>
    </>
  );
}
