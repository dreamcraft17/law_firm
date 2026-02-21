export default function KnowledgeBasePage() {
  return (
    <div>
      <p className="text-gray-600 mb-4">W8 — Knowledge Base & Template Manager</p>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Fitur</h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>• Manage document template</li>
          <li>• Manage clause library</li>
          <li>• Precedent repository</li>
          <li>• Upload legal research material</li>
          <li>• Tagging & categorization</li>
        </ul>
        <div className="mt-4">
          <button type="button" className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm hover:opacity-90">
            Tambah Template
          </button>
        </div>
      </div>
    </div>
  );
}
