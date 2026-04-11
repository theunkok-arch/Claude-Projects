import AppShell from '../../components/layout/AppShell'

export default function S8Closed() {
  return (
    <AppShell title="Deal Closed" step={8} totalSteps={8} flow="sell">
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <h2 className="text-xl font-semibold text-eigen-navy">S8: Deal Closed</h2>
        <p className="text-gray-500 mt-2">Coming soon</p>
      </div>
    </AppShell>
  )
}
