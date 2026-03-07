export default function PanelLoading() {
  return (
    <>
      <div className="global-loading-bar" aria-hidden />
      <div className="min-h-[60vh] flex items-center justify-center p-12 bg-white text-slate-700">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-9 h-9 rounded-full border-2 border-[#1e3a8a] border-t-transparent animate-spin"
            aria-hidden
          />
          <p className="text-sm text-slate-500">Memuat…</p>
        </div>
      </div>
    </>
  );
}
