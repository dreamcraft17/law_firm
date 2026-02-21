export default function ReportsPage() {
  return (
    <div>
      <p className="text-gray-600 mb-4">W6 — Reporting & Analytics Dashboard</p>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Dashboard</h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>• Active cases / Closed cases / Revenue per month</li>
          <li>• Utilization rate / Average case duration</li>
          <li>• Client acquisition trend / Outstanding invoice chart</li>
          <li>• Case success rate</li>
        </ul>
      </div>
    </div>
  );
}
