export default function UsersPage() {
  return (
    <div>
      <p className="text-gray-600 mb-4">W1 — User & Role Management (Partner, Admin)</p>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Fitur</h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>• Create / edit / delete user</li>
          <li>• Assign role</li>
          <li>• Custom permission</li>
          <li>• Disable account</li>
          <li>• View login history</li>
          <li>• Force logout</li>
        </ul>
        <div className="mt-4">
          <button type="button" className="px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm hover:opacity-90">
            Tambah User
          </button>
        </div>
      </div>
    </div>
  );
}
