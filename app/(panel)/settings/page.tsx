export default function SettingsPage() {
  return (
    <div>
      <p className="text-gray-600 mb-4">W9 — System Configuration</p>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Fitur</h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>• Payment gateway config</li>
          <li>• Email template config</li>
          <li>• Notification rules</li>
          <li>• Case type configuration</li>
          <li>• Custom field builder</li>
          <li>• Backup config</li>
          <li>• Feature toggles</li>
        </ul>
      </div>
    </div>
  );
}
