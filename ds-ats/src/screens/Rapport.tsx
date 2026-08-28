import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { haalRapport } from '../lib/api'
import { datum } from '../lib/format'
import StageBadge from '../components/StageBadge'

interface RapportFunnel {
  stage: string
  bereikt: number
  nuHier: number
}

interface RapportVacature {
  titel: string
  status: string | null
  standplaats: string | null
  startdatum: string | null
  streefdatumShortlist: string | null
  totaal: number
  funnel: RapportFunnel[]
  redenen: Array<{ reden: string; aantal: number }>
  doorlooptijd: {
    benaderdTotVoorgesteld: { dagen: number; aantal: number } | null
    voorgesteldTotGeplaatst: { dagen: number; aantal: number } | null
  }
  voorgedragen: Array<{
    naam: string
    huidigeRol: string | null
    huidigeWerkgever: string | null
    woonplaats: string | null
    stage: string
    dagenInStage: number | null
  }>
}

interface RapportData {
  opdrachtgever: string
  gegenereerdOp: string
  vacatures: RapportVacature[]
}

/**
 * Scherm 5. Geen login, de token in de URL is de toegang. De filtering gebeurt
 * server-side in netlify/functions/rapport.mjs — deze pagina toont alleen wat
 * ze al binnenkrijgt.
 */
export default function Rapport() {
  const { token } = useParams()
  const [data, setData] = useState<RapportData | null>(null)
  const [fout, setFout] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    haalRapport(token)
      .then(setData)
      .catch((error: Error) => setFout(error.message))
  }, [token])

  if (fout) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="text-navy-400">{fout}</p>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="text-navy-400">Rapport laden…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 print:max-w-none">
      <header className="border-b border-lijn pb-4">
        <p className="font-semibold tracking-tight">
          Do <span className="text-oranje">Solutions</span>
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{data.opdrachtgever}</h1>
        <p className="text-sm text-navy-400">Voortgangsrapport · {datum(data.gegenereerdOp)}</p>
      </header>

      <button
        type="button"
        onClick={() => window.print()}
        className="tik mt-4 rounded-xl border border-lijn bg-white px-4 py-2 text-sm font-medium print:hidden"
      >
        Opslaan als PDF
      </button>

      {data.vacatures.map((vacature) => (
        <section key={vacature.titel} className="mt-10 break-inside-avoid">
          <h2 className="text-xl font-semibold">{vacature.titel}</h2>
          <p className="text-sm text-navy-400">
            {[vacature.standplaats, vacature.status].filter(Boolean).join(' · ')} · {vacature.totaal}{' '}
            kandidaten in het proces
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Kaart
              label="Van benaderd tot voorgesteld"
              waarde={vacature.doorlooptijd.benaderdTotVoorgesteld}
            />
            <Kaart
              label="Van voorgesteld tot geplaatst"
              waarde={vacature.doorlooptijd.voorgesteldTotGeplaatst}
            />
          </div>

          <h3 className="mt-6 mb-2 font-semibold">Funnel</h3>
          <ol className="flex flex-col gap-1.5">
            {vacature.funnel.map((trede) => {
              const top = Math.max(1, ...vacature.funnel.map((t) => t.bereikt))
              return (
                <li key={trede.stage} className="flex items-center gap-2">
                  <div className="w-32 shrink-0">
                    <StageBadge stage={trede.stage} klein />
                  </div>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-cream">
                    <div
                      className="h-full rounded-md bg-navy/15"
                      style={{ width: `${Math.round((trede.bereikt / top) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm tabular-nums">{trede.bereikt}</span>
                </li>
              )
            })}
          </ol>

          {vacature.redenen.length > 0 && (
            <>
              <h3 className="mt-6 mb-2 font-semibold">Waarom kandidaten afvielen</h3>
              <ol className="flex flex-col gap-1.5">
                {vacature.redenen.map((rij) => {
                  const top = Math.max(...vacature.redenen.map((r) => r.aantal))
                  return (
                    <li key={rij.reden} className="flex items-center gap-2">
                      <span className="w-48 shrink-0 truncate text-sm">{rij.reden}</span>
                      <div className="h-5 flex-1 overflow-hidden rounded-md bg-cream">
                        <div
                          className="h-full rounded-md bg-oranje"
                          style={{ width: `${Math.round((rij.aantal / top) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-sm tabular-nums">{rij.aantal}</span>
                    </li>
                  )
                })}
              </ol>
            </>
          )}

          {vacature.voorgedragen.length > 0 && (
            <>
              <h3 className="mt-6 mb-2 font-semibold">Voorgedragen kandidaten</h3>
              <div className="flex flex-col gap-2">
                {vacature.voorgedragen.map((kandidaat) => (
                  <div
                    key={`${kandidaat.naam}-${kandidaat.stage}`}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-lijn bg-white p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{kandidaat.naam}</p>
                      <p className="truncate text-sm text-navy-400">
                        {[kandidaat.huidigeRol, kandidaat.huidigeWerkgever, kandidaat.woonplaats]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </div>
                    <StageBadge stage={kandidaat.stage} klein />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      ))}

      <footer className="mt-12 border-t border-lijn pt-4 text-xs text-navy-400">
        Dit rapport toont de voortgang van de zoekopdracht. Kandidaten die niet zijn voorgedragen worden
        niet bij naam genoemd.
      </footer>
    </main>
  )
}

function Kaart({ label, waarde }: { label: string; waarde: { dagen: number; aantal: number } | null }) {
  return (
    <div className="rounded-2xl border border-lijn bg-white p-4">
      <p className="text-sm text-navy-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">
        {waarde ? `${waarde.dagen} dagen` : 'Nog geen data'}
      </p>
      {waarde && <p className="text-xs text-navy-400">mediaan over {waarde.aantal} kandidaten</p>}
    </div>
  )
}
