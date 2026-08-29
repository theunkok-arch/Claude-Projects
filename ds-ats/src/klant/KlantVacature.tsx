import { Link } from 'react-router-dom'
import StageBadge from '../components/StageBadge'
import { dagen, datum } from '../lib/format'
import type { KlantKandidaat, KlantVacature as Vacature } from '../lib/klant'

/**
 * Eén vacature, uitgeklapt: de trechter, waarom kandidaten afvielen, en de
 * lijst met wie er nog in zit.
 *
 * Alles op dit scherm komt zo uit de server. Er wordt hier niets gefilterd en
 * niets verborgen — wat niet mag worden getoond is er domweg niet, en dat is
 * met opzet zo: filtering in de frontend is filtering die je met de
 * ontwikkelaarsgereedschappen omzeilt.
 */
export default function KlantVacature({ vacature }: { vacature: Vacature }) {
  const afgevallen = vacature.afgevallen.reduce((som, r) => som + r.aantal, 0)

  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <Link to="/klant" className="tik inline-flex items-center text-sm text-navy-400">
        ← Alle opdrachten
      </Link>

      <h1 className="mt-1 text-2xl font-semibold">{vacature.titel ?? 'Vacature'}</h1>
      <p className="text-sm text-navy-400">
        {[vacature.standplaats, vacature.status].filter(Boolean).join(' · ') || '—'}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-y-1 rounded-2xl border border-lijn bg-white p-4 text-sm">
        <dt className="text-navy-400">In het proces</dt>
        <dd className="text-right tabular-nums">{vacature.totaal - afgevallen}</dd>
        <dt className="text-navy-400">Afgevallen</dt>
        <dd className="text-right tabular-nums">{afgevallen}</dd>
        <dt className="text-navy-400">Startdatum</dt>
        <dd className="text-right">{datum(vacature.startdatum)}</dd>
        <dt className="text-navy-400">Streefdatum shortlist</dt>
        <dd className="text-right">{datum(vacature.streefdatumShortlist)}</dd>
      </dl>

      <Funnel tredes={vacature.funnel} />

      {vacature.afgevallen.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 font-semibold">Waarom kandidaten afvielen</h2>
          <p className="mb-3 text-sm text-navy-400">
            Geteld, niet per persoon. Een afvalreden is een oordeel over iemand; als aantal laat het
            zien waar de zoekopdracht op stuit.
          </p>
          <Redenen rijen={vacature.afgevallen} />
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-semibold">Kandidaten in het proces</h2>
        <p className="mt-1 mb-3 text-sm text-navy-400">
          Kandidaten staan op initialen tot ze weten dat ze bij jullie worden voorgedragen. Vanaf dat
          moment zie je de volledige naam en werkgever.
        </p>

        {vacature.kandidaten.length === 0 ? (
          <p className="rounded-2xl border border-lijn bg-white p-4 text-sm text-navy-400">
            Er zit op dit moment niemand in het proces voor deze vacature.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {vacature.kandidaten.map((kandidaat) => (
              <li key={kandidaat.id}>
                <Kandidaatkaart kandidaat={kandidaat} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function Kandidaatkaart({ kandidaat }: { kandidaat: KlantKandidaat }) {
  const regel = kandidaat.vrijgegeven
    ? [kandidaat.huidigeRol, kandidaat.huidigeWerkgever, kandidaat.woonplaats].filter(Boolean).join(' · ')
    : kandidaat.huidigeRol

  return (
    <article className="rounded-2xl border border-lijn bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {kandidaat.vrijgegeven && kandidaat.naam ? kandidaat.naam : kandidaat.initialen}
          </p>
          {/*
            Laten afbreken in plaats van afkappen. "R&D Chemist · Werkgever 8 BV
            · Eindhoven" past op geen enkele telefoon op één regel, en met
            `truncate` verdween juist de werkgever — voor een opdrachtgever het
            meest zeggende deel.
          */}
          <p className="text-sm text-navy-400">{regel || '—'}</p>
        </div>
        <StageBadge stage={kandidaat.fase ?? undefined} klein />
      </div>

      <p className="mt-2 text-xs text-navy-400 tabular-nums">
        {[
          kandidaat.score !== null ? `Score ${kandidaat.score}` : null,
          kandidaat.dagenInFase !== null ? `${dagen(kandidaat.dagenInFase)} in deze fase` : null,
        ]
          .filter(Boolean)
          .join(' · ') || ' '}
      </p>
    </article>
  )
}

/**
 * De trechter is cumulatief: wie nu op Aanbod staat, is ooit benaderd geweest
 * en telt dus in elke trede daaronder mee. Dat is wat het beeld van een
 * trechter geeft in plaats van een momentopname.
 */
function Funnel({ tredes }: { tredes: Array<{ fase: string; bereikt: number; nuHier: number }> }) {
  return (
    <section className="mt-8">
      <h2 className="mb-1 font-semibold">Verloop</h2>
      <p className="mb-3 text-sm text-navy-400">
        Hoeveel kandidaten deze fase ooit hebben bereikt. Het getal tussen haakjes is wie er nu staat.
      </p>
      <Balken
        rijen={tredes.map((t) => ({
          fase: t.fase,
          waarde: t.bereikt,
          bijschrift: t.nuHier > 0 ? `(${t.nuHier})` : '',
        }))}
      />
    </section>
  )
}

interface Trede {
  fase: string
  waarde: number
  bijschrift: string
}

/** De trechter: een fasebadge van vaste breedte, dan de balk. */
function Balken({ rijen }: { rijen: Trede[] }) {
  const top = Math.max(1, ...rijen.map((r) => r.waarde))

  return (
    <ol className="flex flex-col gap-1.5">
      {rijen.map((rij) => (
        <li key={rij.fase} className="flex items-center gap-2">
          <div className="w-32 shrink-0 sm:w-40">
            <StageBadge stage={rij.fase} klein />
          </div>
          <div className="h-6 flex-1 overflow-hidden rounded-md bg-cream">
            <div
              className="h-full rounded-md bg-navy/15"
              style={{ width: `${Math.round((rij.waarde / top) * 100)}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-sm tabular-nums">
            {rij.waarde}
            {rij.bijschrift ? <span className="text-navy-400"> {rij.bijschrift}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  )
}

/**
 * De afvalredenen krijgen hun label op een eigen regel boven de balk.
 *
 * In een kolom naast de balk paste het niet: op een telefoon van 390 pixels
 * werd "Salariswens te hoog" afgekapt tot "Salariswens te …" en
 * "Overgekwalificeerd" tot "Overgekwalifice…". Dat is precies de informatie
 * waarvoor een opdrachtgever hier komt kijken. De fasebadges hierboven mogen
 * wel in een kolom, want die zijn kort en komen uit een vaste woordenlijst.
 */
function Redenen({ rijen }: { rijen: Array<{ reden: string; aantal: number }> }) {
  const top = Math.max(1, ...rijen.map((r) => r.aantal))

  return (
    <ol className="flex flex-col gap-3">
      {rijen.map((rij) => (
        <li key={rij.reden}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm">{rij.reden}</span>
            <span className="shrink-0 text-sm tabular-nums">{rij.aantal}</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-md bg-cream">
            <div
              className="h-full rounded-md bg-oranje"
              style={{ width: `${Math.round((rij.aantal / top) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}
