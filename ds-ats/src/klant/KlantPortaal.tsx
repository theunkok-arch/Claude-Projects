import { useCallback, useEffect, useState } from 'react'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import { GeenToegang, PortaalFout, haalOverzicht, logUit } from '../lib/klant'
import type { KlantOverzicht } from '../lib/klant'
import KlantLogin from './KlantLogin'
import KlantVacature from './KlantVacature'
import VersieMelding from '../components/VersieMelding'
import Taalkeuze from './Taalkeuze'
import { TaalProvider, foutTekst, useT, useTaal, vertaalWaarde } from './i18n'

/**
 * Het klantportaal op /klant. Alleen lezen.
 *
 * Deze boom staat buiten `AtsProvider`, net als de privacypagina. Dat is geen
 * ordening maar een grens: er is geen pad van hier naar de interne data, en de
 * gedeelde ATS-sleutel komt niet in beeld.
 *
 * Er is geen aparte "ben ik ingelogd"-vraag aan de server. Het portaal
 * probeert gewoon het overzicht op te halen; lukt dat niet, dan verschijnt het
 * inlogscherm. Eén verzoek in plaats van twee, en geen tweede plek waar de
 * frontend een eigen mening over de sessie kan krijgen die van de server
 * afwijkt.
 */
export default function KlantPortaal() {
  return (
    <TaalProvider>
      <Portaal />
    </TaalProvider>
  )
}

function Portaal() {
  const { t } = useTaal()
  const [data, setData] = useState<KlantOverzicht | null>(null)
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState<string | null>(null)
  const [ingelogd, setIngelogd] = useState(true)

  const laad = useCallback(async () => {
    setLaden(true)
    setFout(null)
    try {
      setData(await haalOverzicht())
      setIngelogd(true)
    } catch (error) {
      if (error instanceof GeenToegang) {
        setIngelogd(false)
        setData(null)
        // De melding alleen tonen als hij iets uitlegt. "Je bent niet ingelogd"
        // boven een inlogscherm is ruis. Op de code en niet op de zin: anders
        // breekt de vertaling deze afhandeling stilletjes.
        setFout(error.code === 'nietIngelogd' ? null : foutTekst(t, error.code, error.vars, error.message))
      } else if (error instanceof PortaalFout) {
        setFout(foutTekst(t, error.code, error.vars, error.message))
      } else {
        setFout(foutTekst(t, undefined, undefined, error instanceof Error ? error.message : ''))
      }
    } finally {
      setLaden(false)
    }
  }, [t])

  useEffect(() => {
    void laad()
  }, [laad])

  if (!ingelogd) {
    return (
      <>
        {fout && (
          <p role="alert" className="mx-auto max-w-sm px-6 pt-6 text-sm text-red-700">
            {fout}
          </p>
        )}
        <KlantLogin onBinnen={() => void laad()} />
      </>
    )
  }

  if (laden && !data) return <Wachten tekst={t.portaal.laden} />
  if (fout && !data) return <Wachten tekst={fout} />
  if (!data) return <Wachten tekst={t.portaal.geenGegevens} />

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-lijn bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <p className="font-semibold tracking-tight">
              Do <span className="text-oranje">Solutions</span>
            </p>
            <p className="truncate text-xs text-navy-400">
              {[data.opdrachtgever, data.gebruiker].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Taalkeuze />
            <button
              type="button"
              onClick={async () => {
                await logUit().catch(() => {})
                setIngelogd(false)
                setData(null)
              }}
              className="tik rounded-lg px-3 text-sm text-navy-400"
            >
              {t.portaal.uitloggen}
            </button>
          </div>
        </div>
        <VersieMelding />
      </header>

      <Routes>
        <Route path="/" element={<Lijst data={data} />} />
        <Route path="vacature/:id" element={<Detail data={data} />} />
        <Route path="*" element={<Onbekend />} />
      </Routes>

      <p className="px-5 pb-6 text-center text-xs text-navy-400">{t.portaal.versie(__VERSIE__)}</p>
    </div>
  )
}

function Lijst({ data }: { data: KlantOverzicht }) {
  const t = useT()
  if (data.vacatures.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-2xl font-semibold">{t.portaal.geenOpdrachten}</h1>
        <p className="mt-2 text-sm text-navy-400">{t.portaal.geenOpdrachtenUitleg}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <h1 className="text-2xl font-semibold">{t.portaal.opdrachten}</h1>
      <p className="mt-1 mb-4 text-sm text-navy-400">{t.portaal.opdrachtenUitleg}</p>

      <ul className="flex flex-col gap-2">
        {data.vacatures.map((vacature) => {
          const afgevallen = vacature.afgevallen.reduce((som, r) => som + r.aantal, 0)
          return (
            <li key={vacature.id}>
              <Link
                to={`/klant/vacature/${vacature.id}`}
                className="tik block rounded-2xl border border-lijn bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{vacature.titel ?? t.portaal.vacature}</p>
                    <p className="truncate text-sm text-navy-400">
                      {[vacature.standplaats, vertaalWaarde(t.vacaturestatus, vacature.status)]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                  <span aria-hidden className="shrink-0 text-navy-400">
                    ›
                  </span>
                </div>
                <p className="mt-2 text-xs text-navy-400 tabular-nums">
                  {t.portaal.samenvatting(vacature.kandidaten.length, afgevallen)}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

function Detail({ data }: { data: KlantOverzicht }) {
  const { id } = useParams()
  const vacature = data.vacatures.find((v) => v.id === id)

  // Een onbekend id is hier geen fout maar een grens: het portaal kent alleen
  // de vacatures die deze gebruiker mag zien, dus een geraden adres levert
  // hetzelfde op als een verouderde link.
  if (!vacature) return <Onbekend />
  return <KlantVacature vacature={vacature} />
}

function Onbekend() {
  const t = useT()
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-center">
      <p className="text-navy-400">{t.portaal.onbekendePagina}</p>
      <Link
        to="/klant"
        className="tik mt-4 inline-flex items-center rounded-xl border border-lijn bg-white px-4 py-2 text-sm font-medium"
      >
        {t.portaal.naarOpdrachten}
      </Link>
    </main>
  )
}

function Wachten({ tekst }: { tekst: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 text-center">
      <p className="text-navy-400">{tekst}</p>
    </main>
  )
}
