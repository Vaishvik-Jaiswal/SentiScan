export default function Dashboard() {
  // dummy stats
  const stats = [
    { label: 'Users', value: 128 },
    { label: 'Posts', value: 54 },
    { label: 'Comments', value: 342 },
  ]

  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <h2 className="text-2xl font-semibold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-6 rounded-2xl shadow flex flex-col items-center">
            <span className="text-4xl font-bold">{s.value}</span>
            <span className="text-gray-600 mt-2">{s.label}</span>
          </div>
        ))}
      </div>
    </main>
  )
}
