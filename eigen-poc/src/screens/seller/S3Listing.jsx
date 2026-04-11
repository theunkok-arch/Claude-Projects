import AppShell from '../../components/layout/AppShell'

export default function S3Listing() {
  return (
    <AppShell title="Listing Description" step={3} totalSteps={8} flow="sell">
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <h2 className="text-xl font-semibold text-eigen-navy">S3: Listing Description</h2>
        <p className="text-gray-500 mt-2">Coming soon</p>
      </div>
    </AppShell>
  )
}
