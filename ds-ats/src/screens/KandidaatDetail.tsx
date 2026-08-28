import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import { datum, dagen } from '../lib/format'
import StageBadge from '../components/StageBadge'
import StageSheet from '../components/StageSheet'
import KandidaatFormulier, { aantalLeeg } from '../components/KandidaatFormulier'
import AanmeldingFormulier, { aantalLeeg as aantalLeegAanmelding } from '../components/AanmeldingFormulier'
import type { Regel } from '../lib/types'

const ACTIVITEIT_TYPES = ['InMail', 'Reminder', 'Telefoon', 'Teams', 'E-mail', 'Notitie']

export default function KandidaatDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, regels, wijzigStage, wijzigAanmelding, wijzigKandidaat, logActiviteit, verwijderKandidaat } =
    useAts()

  const [sheetVoor, setSheetVoor] = useState<Regel | null>(null)
  const [bewerkteAanmelding, setBewerkteAanmelding] = useState<string | null>(null)
  const [type, setType] = useState(ACTIVITEIT_TYPES[0])
  const [samenvatting, setSamenvatting] = useState('')
  const [bezig, setBezig] = useState(false)
  const [bevestigWissen, setBevestigWissen] = useState(false)
  const [bewerken, setBewerken] = useState(false)
  const [logFout, setLogFout] = useState<string | null>(null)
  const [wisFout, setWisFout] = useState<string | null>(null)

  const kandidaat = data?.kandidaten.find((k) => k.id === id)
  const eigen = useMemo(() => regels.filter((r) => r.kandidaat?.id === id), [regels, id])
  const aanmeldingIds = useMemo(() => new Set(eigen.map((r) => r.aanmelding.id)), [eigen])
  const historie = useMemo(
    () =>
      (data?.activiteiten ?? [])
        .filter((a) => aanmeldingIds.has(a.Aanmelding?.[0] ?? ''))
        .sort((a, b) => (b.Datum ?? '').localeCompare(a.Datum ?? '')),
    [data, aanmeldingIds],
  )

  if (!data) return null
  if (!kandidaat) return <p className="text-navy-400">Deze kandidaat bestaat niet (meer).</p>

  const leeg = aantalLeeg(kandidaat)
  // De keuzelijst voor Bron komt uit wat er al in de base staat. Zo kan het
  // formulier geen nieuwe keuze-optie aanmaken die niemand heeft afgesproken.
  const bronnen = [
    ...new Set((data?.kandidaten ?? []).map((k) => k.Bron).filter((b): b is string => Boolean(b))),
  ]

  async function verstuurActiviteit(event: React.FormEvent) {
    event.preventDefault()
    const doel = eigen[0]
    if (!doel || !samenvatting.trim()) return
    setBezig(true)
    setLogFout(null)
    try {
      await logActiviteit(doel.aanmelding.id, type, samenvatting.trim())
      setSamenvatting('')
    } catch (error) {
      // De tekst blijft staan zodat er niets hoeft te worden overgetypt, maar
      // dan moet er wel bij staan dat het níet gelogd is: een knop die weer
      // actief wordt bij een leeggemaakt veld leest als "gelukt", en de tweede
      // tik levert een dubbele activiteit op als de eerste toch aankwam.
      setLogFout(error instanceof Error ? error.message : 'Loggen mislukt.')
    } finally {
      setBezig(false)
    }
  }

  async function wis() {
    if (!kandidaat) return
    setBezig(true)
    setWisFout(null)
    try {
      await verwijderKandidaat(kandidaat.id)
      navigate('/')
    } catch (error) {
      // Onomkeerbare actie: zonder melding is "er is niets gebeurd" niet te
      // onderscheiden van "het is gewist maar de navigatie hing".
      setWisFout(error instanceof Error ? error.message : 'Verwijderen mislukt.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-navy-400">
        ← Terug
      </button>
      <h1 className="mt-1 text-2xl font-semibold">{kandidaat.Naam}</h1>
      <p className="text-sm text-navy-400">
        {[kandidaat['Huidige rol'], kandidaat['Huidige werkgever']].filter(Boolean).join(' · ') || '—'}
      </p>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Gegevens</h2>
        <button
          type="button"
          onClick={() => setBewerken((aan) => !aan)}
          className="tik text-sm text-navy-400 underline"
        >
          {bewerken ? 'Sluiten' : leeg > 0 ? `${leeg} leeg · aanvullen` : 'Bewerken'}
        </button>
      </div>

      {bewerken ? (
        <KandidaatFormulier
          kandidaat={kandidaat}
          bronnen={bronnen}
          onBewaar={(velden) => wijzigKandidaat(kandidaat.id, velden)}
          onSluit={() => setBewerken(false)}
        />
      ) : (
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-2xl border border-lijn bg-white p-4 text-sm">
        <dt className="text-navy-400">Woonplaats</dt>
        <dd className="text-right">{kandidaat.Woonplaats ?? '—'}</dd>
        <dt className="text-navy-400">Opleiding</dt>
        <dd className="truncate text-right">{kandidaat.Opleiding ?? '—'}</dd>
        <dt className="text-navy-400">Talen</dt>
        <dd className="truncate text-right">{kandidaat.Talen ?? '—'}</dd>
        <dt className="text-navy-400">Bron</dt>
        <dd className="text-right">{kandidaat.Bron ?? '—'}</dd>
        <dt className="text-navy-400">Laatste contact</dt>
        <dd className="text-right">{datum(kandidaat['Laatste contact'])}</dd>
        <dt className="text-navy-400">Bewaren tot</dt>
        <dd className="text-right">{datum(kandidaat['Bewaren tot'])}</dd>
      </dl>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {kandidaat['LinkedIn-URL'] && (
          <a
            href={kandidaat['LinkedIn-URL']}
            target="_blank"
            rel="noreferrer noopener"
            className="tik rounded-xl border border-lijn bg-white px-4 py-2 text-sm font-medium"
          >
            LinkedIn
          </a>
        )}
        {kandidaat['E-mail'] && (
          <a
            href={`mailto:${kandidaat['E-mail']}`}
            className="tik rounded-xl border border-lijn bg-white px-4 py-2 text-sm font-medium"
          >
            Mail
          </a>
        )}
        {kandidaat.Telefoon && (
          <a
            href={`tel:${kandidaat.Telefoon}`}
            className="tik rounded-xl border border-lijn bg-white px-4 py-2 text-sm font-medium"
          >
            Bellen
          </a>
        )}
      </div>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">Aanmeldingen ({eigen.length})</h2>
        <div className="flex flex-col gap-2">
          {eigen.map((regel) => {
            const aanmelding = regel.aanmelding
            const open = bewerkteAanmelding === aanmelding.id
            const leegOpAanmelding = aantalLeegAanmelding(aanmelding)
            return (
              <div key={aanmelding.id} className="rounded-2xl border border-lijn bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/vacature/${regel.vacature?.id ?? ''}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium">{regel.vacature?.Titel ?? 'Geen vacature'}</p>
                    <p className="truncate text-sm text-navy-400">{regel.opdrachtgever?.Naam ?? '—'}</p>
                  </Link>
                  <StageBadge stage={aanmelding.Stage} klein onClick={() => setSheetVoor(regel)} />
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <p className="text-sm text-navy-400">
                    {dagen(regel.dagenInStage)} in stage
                    {aanmelding['Reden afvallen'] ? ` · ${aanmelding['Reden afvallen']}` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => setBewerkteAanmelding(open ? null : aanmelding.id)}
                    className="tik shrink-0 text-sm text-navy-400 underline"
                  >
                    {open
                      ? 'Sluiten'
                      : leegOpAanmelding > 0
                        ? `${leegOpAanmelding} leeg · aanvullen`
                        : 'Bewerken'}
                  </button>
                </div>

                {open ? (
                  <AanmeldingFormulier
                    aanmelding={aanmelding}
                    onBewaar={(velden) => wijzigAanmelding(aanmelding.id, velden)}
                    onSluit={() => setBewerkteAanmelding(null)}
                  />
                ) : (
                  <>
                    {aanmelding['Volgende actie'] && (
                      <p className="mt-2 text-sm">
                        <span className="text-navy-400">Volgende actie: </span>
                        {aanmelding['Volgende actie']}
                      </p>
                    )}
                    {aanmelding['Score-onderbouwing'] && (
                      <p className="mt-2 border-t border-lijn pt-2 text-sm whitespace-pre-line">
                        {aanmelding['Score-onderbouwing']}
                      </p>
                    )}
                  </>
                )}
              </div>
            )
          })}
          {eigen.length === 0 && <p className="text-navy-400">Nog geen aanmeldingen.</p>}
        </div>
      </section>

      {eigen.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-semibold">Contact loggen</h2>
          <form onSubmit={verstuurActiviteit} className="rounded-2xl border border-lijn bg-white p-4">
            <p className="mb-2 text-xs text-navy-400">
              Wordt gelogd op {eigen[0].vacature?.Titel ?? 'de eerste aanmelding'}.
            </p>
            <div className="flex gap-2">
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="tik shrink-0 rounded-xl border border-lijn px-3 text-sm"
              >
                {ACTIVITEIT_TYPES.map((optie) => (
                  <option key={optie}>{optie}</option>
                ))}
              </select>
              <input
                value={samenvatting}
                onChange={(event) => setSamenvatting(event.target.value)}
                placeholder="Wat is er gebeurd?"
                className="tik min-w-0 flex-1 rounded-xl border border-lijn px-3 text-sm"
              />
            </div>
            {logFout && (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {logFout}
              </p>
            )}
            <button
              type="submit"
              disabled={bezig || samenvatting.trim().length === 0}
              className="tik mt-3 w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-40"
            >
              Loggen
            </button>
          </form>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">Historie ({historie.length})</h2>
        <ol className="flex flex-col gap-2">
          {historie.map((activiteit) => (
            <li key={activiteit.id} className="rounded-xl border border-lijn bg-white px-3 py-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{activiteit.Type}</span>
                <span className="shrink-0 text-navy-400">{datum(activiteit.Datum)}</span>
              </div>
              <p className="mt-0.5">{activiteit.Samenvatting}</p>
            </li>
          ))}
          {historie.length === 0 && <p className="text-navy-400">Nog niets gelogd.</p>}
        </ol>
      </section>

      <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4">
        <h2 className="font-semibold text-red-800">AVG</h2>
        <p className="mt-1 text-sm text-red-800">
          Verwijdert deze kandidaat en al zijn aanmeldingen, activiteiten en stagelog. Onherstelbaar.{' '}
          <a href="/privacy" target="_blank" rel="noreferrer noopener" className="underline">
            Privacyverklaring
          </a>
          .
        </p>
        {wisFout && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-800"
          >
            {wisFout} Ververs om te controleren of de kandidaat er nog staat.
          </p>
        )}
        {bevestigWissen ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void wis()}
              disabled={bezig}
              className="tik flex-1 rounded-xl bg-red-700 py-3 font-semibold text-white disabled:opacity-50"
            >
              Definitief verwijderen
            </button>
            <button
              type="button"
              onClick={() => setBevestigWissen(false)}
              className="tik flex-1 rounded-xl border border-red-300 py-3 font-medium text-red-800"
            >
              Annuleren
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setBevestigWissen(true)}
            className="tik mt-3 w-full rounded-xl border border-red-300 py-3 font-medium text-red-800"
          >
            Kandidaat verwijderen
          </button>
        )}
      </section>

      <StageSheet
        open={sheetVoor !== null}
        huidigeStage={sheetVoor?.aanmelding.Stage}
        naam={`${kandidaat.Naam} — ${sheetVoor?.vacature?.Titel ?? ''}`}
        onSluit={() => setSheetVoor(null)}
        onKies={async (stage, reden) => {
          if (sheetVoor) await wijzigStage(sheetVoor.aanmelding.id, stage, { redenAfvallen: reden })
        }}
      />
    </div>
  )
}
