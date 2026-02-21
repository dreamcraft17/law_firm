export default function DashboardPage() {
  const cards = [
    { label: 'Active Cases', value: '124', sub: 'Perkara aktif' },
    { label: 'Closed Cases', value: '89', sub: 'Bulan ini' },
    { label: 'Revenue (Bulan)', value: 'Rp 2.4B', sub: 'Revenue per month' },
    { label: 'Utilization Rate', value: '78%', sub: 'Lawyer utilization' },
    { label: 'Avg Case Duration', value: '42 hari', sub: 'Rata-rata' },
    { label: 'Outstanding Invoice', value: 'Rp 340Jt', sub: 'Belum tertagih' },
  ];

  return (
    <div>
      <p className="text-gray-600 mb-6">Reporting & Analytics Dashboard — W6</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold text-[#1B4965] mt-1">{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Fitur Dashboard</h2>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>Active cases / Closed cases / Revenue per month / Utilization rate</li>
          <li>Average case duration / Client acquisition trend / Outstanding invoice chart / Case success rate</li>
        </ul>
      </div>
    </div>
  );
}
