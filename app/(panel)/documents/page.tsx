export default function DocumentsPage() {
  return (
    <div>
      <p className="text-gray-600 mb-4">W4 — Advanced Document Management</p>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Fitur</h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>Folder structure control, Bulk upload, Version compare</li>
          <li>Access permission override, Legal hold, Redaction tool</li>
          <li>Retention policy config, Storage usage monitoring</li>
        </ul>
        <button type="button" className="mt-4 px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm">Bulk Upload</button>
      </div>
    </div>
  );
}
