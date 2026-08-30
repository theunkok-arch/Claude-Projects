import { Link, Route, Routes } from 'react-router-dom'
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
import Privacy from './screens/Privacy'
import Portaaltoegang from './screens/Portaaltoegang'
import KlantPortaal from './klant/KlantPortaal'

export default function App() {
  return (
    <Routes>
      {/* Publiek: kandidaten moeten dit kunnen lezen zonder inlog. */}
      <Route path="/privacy" element={<Privacy />} />
      {/*
        Het klantportaal staat buiten de provider. Dat is geen ordening maar
        een grens: er loopt geen pad van hier naar de interne data, en de
        gedeelde ATS-sleutel komt op dit scherm niet voor.
      */}
      <Route path="/klant/*" element={<KlantPortaal />} />
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
  const { ingelogd, data, laden, fout, verbergFout } = useAts()

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
      {fout && <Foutbanner tekst={fout} onSluit={verbergFout} />}
      <Routes>
        <Route path="/" element={<Maandag />} />
        <Route path="/vacatures" element={<Vacatures />} />
        <Route path="/vacature/:id" element={<VacatureDetail />} />
        <Route path="/opdrachtgevers" element={<Opdrachtgevers />} />
        <Route path="/opdrachtgever/:id" element={<OpdrachtgeverDetail />} />
        <Route path="/kandidaat/:id" element={<KandidaatDetail />} />
        <Route path="/bronnen" element={<Bronnen />} />
        <Route path="/klanttoegang" element={<Portaaltoegang />} />
        <Route path="*" element={<NietGevonden />} />
      </Routes>
    </AppShell>
  )
}

/**
 * Kale tekst zonder weg terug was hier een doodlopend eind: de tabbalk staat
 * onderaan, maar wie hier belandt is iets kwijt en hoort één duidelijke uitweg
 * te krijgen naar het scherm waar de dag begint.
 */
function NietGevonden() {
  return (
    <div className="mt-8 text-center">
      <p className="text-navy-400">Pagina niet gevonden.</p>
      <Link
        to="/"
        className="tik mt-4 inline-flex items-center rounded-xl border border-lijn bg-white px-4 py-2 text-sm font-medium"
      >
        Naar het maandagoverzicht
      </Link>
    </div>
  )
}

/**
 * De banner stond bovenaan de inhoud en scrolde dus weg: op een lijst van
 * zestig kaarten zag je nooit dat er iets was misgegaan. Hij zweeft nu vlak
 * boven de tabbalk — altijd in beeld, en met de duim te bereiken om hem weg te
 * tikken.
 */
function Foutbanner({ tekst, onSluit }: { tekst: string; onSluit: () => void }) {
  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+3.75rem)] z-40 px-4"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2 pr-1 pl-3 shadow-lg">
        <p className="min-w-0 flex-1 text-sm text-red-700">{tekst}</p>
        <button
          type="button"
          onClick={onSluit}
          aria-label="Melding sluiten"
          className="tik shrink-0 rounded-lg text-lg leading-none text-red-700"
        >
          ×
        </button>
      </div>
    </div>
  )
}
