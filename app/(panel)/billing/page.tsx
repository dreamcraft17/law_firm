export default function BillingPage() {
  return (
    <div>
      <p className="text-gray-600 mb-4">W5 — Billing and Finance System</p>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Fitur</h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>Create invoice, Approve invoice, Edit tax rate</li>
          <li>Multi-currency, Retainer tracking, Expense approval</li>
          <li>Payment reconciliation, Financial report export, Aging report</li>
          <li>Lawyer revenue analytics</li>
        </ul>
        <button type="button" className="mt-4 px-4 py-2 bg-[#1B4965] text-white rounded-lg text-sm">Buat Invoice</button>
      </div>
    </div>
  );
}
