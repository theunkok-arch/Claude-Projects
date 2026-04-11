import AppShell from '../../components/layout/AppShell'

export default function S4Pricing() {
  return (
    <AppShell title="Set Your Price" step={4} totalSteps={8} flow="sell">
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <h2 className="text-xl font-semibold text-eigen-navy">S4: Set Your Price</h2>
        <p className="text-gray-500 mt-2">Coming soon</p>
      </div>
    </AppShell>
  )
}
