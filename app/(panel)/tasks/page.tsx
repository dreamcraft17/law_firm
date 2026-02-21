export default function TasksPage() {
  return (
    <div>
      <p className="text-gray-600 mb-4">W3 — Advanced Task Workflow</p>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Fitur</h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>Task template builder, Workflow automation</li>
          <li>SLA monitoring dashboard, Bulk task assign, Task analytics</li>
        </ul>
        <button type="button" className="mt-4 px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm">SLA Dashboard</button>
      </div>
    </div>
  );
}
