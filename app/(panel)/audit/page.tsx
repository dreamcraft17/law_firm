export default function AuditPage() {
  return (
    <div>
      <p className="text-gray-600 mb-4">W7 — Audit & Compliance</p>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Fitur</h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>• View audit logs</li>
          <li>• Filter by user / Filter by case</li>
          <li>• Data export</li>
          <li>• Legal hold flag</li>
          <li>• GDPR/PDPA export</li>
        </ul>
        <div className="mt-4">
          <button type="button" className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Export Audit Log
          </button>
        </div>
      </div>
    </div>
  );
}
