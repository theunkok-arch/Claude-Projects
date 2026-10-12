import { Link } from 'react-router-dom'
import StageBadge from '../components/StageBadge'
import { ScoreBadge, ScoreLegenda } from '../components/Score'
import { datum } from '../lib/format'
import type { KlantKandidaat, KlantVacature as Vacature } from '../lib/klant'
import { useT, vertaalWaarde } from './i18n'
import type { Woordenboek } from './i18n/nl'

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
  const t = useT()
  const afgevallen = vacature.afgevallen.reduce((som, r) => som + r.aantal, 0)
  const scoreTeksten = { legenda: t.score.legenda, nogNiet: t.score.nogNiet, banden: t.score.banden }

  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <Link to="/klant" className="tik inline-flex items-center text-sm text-navy-400">
        ← {t.vacature.terug}
      </Link>

      <h1 className="mt-1 text-2xl font-semibold">{vacature.titel ?? t.portaal.vacature}</h1>
      <p className="text-sm text-navy-400">
        {[vacature.standplaats, vertaalWaarde(t.vacaturestatus, vacature.status)]
          .filter(Boolean)
          .join(' · ') || '—'}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-y-1 rounded-2xl border border-lijn bg-white p-4 text-sm">
        <dt className="text-navy-400">{t.vacature.inProces}</dt>
        <dd className="text-right tabular-nums">{vacature.totaal - afgevallen}</dd>
        <dt className="text-navy-400">{t.vacature.afgevallen}</dt>
        <dd className="text-right tabular-nums">{afgevallen}</dd>
        <dt className="text-navy-400">{t.vacature.startdatum}</dt>
        <dd className="text-right">{datum(vacature.startdatum)}</dd>
        <dt className="text-navy-400">{t.vacature.streefdatum}</dt>
        <dd className="text-right">{datum(vacature.streefdatumShortlist)}</dd>
      </dl>

      <Funnel tredes={vacature.funnel} t={t} />

      {vacature.afgevallen.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 font-semibold">{t.vacature.waarom}</h2>
          <p className="mb-3 text-sm text-navy-400">{t.vacature.waaromUitleg}</p>
          <Redenen rijen={vacature.afgevallen} t={t} />
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-semibold">{t.vacature.kandidaten}</h2>
        <p className="mt-1 mb-3 text-sm text-navy-400">{t.vacature.kandidatenUitleg}</p>

        {vacature.kandidaten.length === 0 ? (
          <p className="rounded-2xl border border-lijn bg-white p-4 text-sm text-navy-400">
            {t.vacature.niemand}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {/*
              De legenda hoort op dit scherm en niet in een toelichting ergens
              anders: de opdrachtgever leest dit zonder ons erbij, en "Score 67"
              zegt zonder uitleg niet of dat goed nieuws is.
            */}
            <li>
              <ScoreLegenda teksten={scoreTeksten} />
            </li>
            {vacature.kandidaten.map((kandidaat) => (
              <li key={kandidaat.id}>
                <Kandidaatkaart kandidaat={kandidaat} t={t} scoreTeksten={scoreTeksten} />
              </li>
            ))}
          </ul>
        )}

        {/*
          Kandidaten onder de drempel komen niet als regel terug. Het aantal wel,
          want het werk is gedaan en de trechter telt ze ook: zonder deze regel
          klopt de optelsom op dit scherm niet meer.
        */}
        {vacature.onderDrempel > 0 && (
          <p className="mt-2 rounded-2xl border border-lijn bg-white p-4 text-sm text-navy-400">
            {t.vacature.onderDrempel(vacature.onderDrempel)}
          </p>
        )}
      </section>
    </main>
  )
}

function Kandidaatkaart({
  kandidaat,
  t,
  scoreTeksten,
}: {
  kandidaat: KlantKandidaat
  t: Woordenboek
  scoreTeksten: { legenda: string; nogNiet: string; banden: Record<string, string> }
}) {
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
        <StageBadge
          stage={kandidaat.fase ?? undefined}
          label={vertaalWaarde(t.stage, kandidaat.fase) ?? t.vacature.geenStage}
          klein
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <ScoreBadge score={kandidaat.score} teksten={scoreTeksten} />
        {kandidaat.dagenInFase !== null && (
          <span className="text-xs text-navy-400 tabular-nums">
            {t.vacature.dagenInFase(kandidaat.dagenInFase)}
          </span>
        )}
      </div>
    </article>
  )
}

/**
 * De trechter is cumulatief: wie nu op Aanbod staat, is ooit benaderd geweest
 * en telt dus in elke trede daaronder mee. Dat is wat het beeld van een
 * trechter geeft in plaats van een momentopname.
 */
function Funnel({
  tredes,
  t,
}: {
  tredes: Array<{ fase: string; bereikt: number; nuHier: number }>
  t: Woordenboek
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-1 font-semibold">{t.vacature.verloop}</h2>
      <p className="mb-3 text-sm text-navy-400">{t.vacature.verloopUitleg}</p>
      <Balken
        rijen={tredes.map((trede) => ({
          fase: trede.fase,
          label: vertaalWaarde(t.stage, trede.fase) ?? trede.fase,
          waarde: trede.bereikt,
          bijschrift: trede.nuHier > 0 ? `(${trede.nuHier})` : '',
        }))}
      />
    </section>
  )
}

interface Trede {
  /** De canonieke waarde uit de base, voor de kleur en als sleutel. */
  fase: string
  /** Wat erop staat, vertaald. */
  label: string
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
            <StageBadge stage={rij.fase} label={rij.label} klein />
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
function Redenen({
  rijen,
  t,
}: {
  rijen: Array<{ reden: string; aantal: number }>
  t: Woordenboek
}) {
  const top = Math.max(1, ...rijen.map((r) => r.aantal))

  return (
    <ol className="flex flex-col gap-3">
      {rijen.map((rij) => (
        <li key={rij.reden}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm">{vertaalWaarde(t.reden, rij.reden)}</span>
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
