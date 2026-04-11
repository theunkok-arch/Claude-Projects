import AppShell from '../../components/layout/AppShell'
import { useParams } from 'react-router-dom'

export default function B3PropertyDetail() {
  const { id } = useParams()
  return (
    <AppShell title="Property Detail" flow="buy">
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <h2 className="text-xl font-semibold text-eigen-navy">B3: Property Detail</h2>
        <p className="text-gray-500 mt-2">Property #{id} — Coming soon</p>
      </div>
    </AppShell>
  )
}
