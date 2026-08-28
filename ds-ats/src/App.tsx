import { Route, Routes } from 'react-router-dom'
import { AtsProvider, useAts } from './store/AtsProvider'
import AppShell from './components/AppShell'
import LoginGate from './components/LoginGate'
import Maandag from './screens/Maandag'
import Vacatures from './screens/Vacatures'
import VacatureDetail from './screens/VacatureDetail'
import Opdrachtgevers from './screens/Opdrachtgevers'
import OpdrachtgeverDetail from './screens/OpdrachtgeverDetail'
import KandidaatDetail from './screens/KandidaatDetail'
import Bronnen from './screens/Bronnen'
import Rapport from './screens/Rapport'
import Privacy from './screens/Privacy'

export default function App() {
  return (
    <Routes>
      {/* Het klantrapport staat bewust buiten de provider: geen sleutel, geen app-data. */}
      <Route path="/rapport/:token" element={<Rapport />} />
      {/* Publiek: kandidaten moeten dit kunnen lezen zonder inlog. */}
      <Route path="/privacy" element={<Privacy />} />
      <Route
        path="*"
        element={
          <AtsProvider>
            <InterneApp />
          </AtsProvider>
        }
      />
    </Routes>
  )
}

function InterneApp() {
  const { ingelogd, data, laden, fout } = useAts()

  if (!ingelogd) return <LoginGate />

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center">
        <p className="text-navy-400">{laden ? 'Laden…' : (fout ?? 'Geen data.')}</p>
      </div>
    )
  }

  return (
    <AppShell>
      {fout && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}
      <Routes>
        <Route path="/" element={<Maandag />} />
        <Route path="/vacatures" element={<Vacatures />} />
        <Route path="/vacature/:id" element={<VacatureDetail />} />
        <Route path="/opdrachtgevers" element={<Opdrachtgevers />} />
        <Route path="/opdrachtgever/:id" element={<OpdrachtgeverDetail />} />
        <Route path="/kandidaat/:id" element={<KandidaatDetail />} />
        <Route path="/bronnen" element={<Bronnen />} />
        <Route path="*" element={<p className="text-navy-400">Pagina niet gevonden.</p>} />
      </Routes>
    </AppShell>
  )
}
