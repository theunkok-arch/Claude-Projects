import AppShell from '../../components/layout/AppShell'

export default function S2Photos() {
  return (
    <AppShell title="Professional Photos" step={2} totalSteps={8} flow="sell">
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <h2 className="text-xl font-semibold text-eigen-navy">S2: Professional Photos</h2>
        <p className="text-gray-500 mt-2">Coming soon</p>
      </div>
    </AppShell>
  )
}
