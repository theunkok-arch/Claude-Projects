import AppShell from '../../components/layout/AppShell'
import { useParams } from 'react-router-dom'

export default function B4Viewing() {
  const { id } = useParams()
  return (
    <AppShell title="Viewing Preparation" flow="buy">
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <h2 className="text-xl font-semibold text-eigen-navy">B4: Viewing Preparation</h2>
        <p className="text-gray-500 mt-2">Property #{id} — Coming soon</p>
      </div>
    </AppShell>
  )
}
