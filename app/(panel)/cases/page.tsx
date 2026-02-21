export default function CasesPage() {
  return (
    <div>
      <p className="text-gray-600 mb-4">W2 — Full Case Management</p>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Fitur</h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>Create edit delete case</li>
          <li>Assign team Conflict check Case linking</li>
          <li>Risk scoring Case archiving Export case summary</li>
        </ul>
        <button type="button" className="mt-4 px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm">Buat Perkara</button>
      </div>
    </div>
  );
}
