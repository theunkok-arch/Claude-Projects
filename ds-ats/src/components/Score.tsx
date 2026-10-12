import { SCORE_BANDEN, scoreBand, scoreRegels } from '../../shared/score.mjs'

/**
 * De totaalscore als cijfer plus de betekenis ervan.
 *
 * Het cijfer alleen zegt een opdrachtgever niets: is 67 goed? Daarom staat de
 * bandnaam er altijd naast, en nooit alleen de kleur. Wie kleuren niet
 * onderscheidt leest hetzelfde verhaal.
 */
export function ScoreBadge({ score, groot = false }: { score?: number | null; groot?: boolean }) {
  const band = scoreBand(score ?? null)
  if (!band) {
    return <span className="text-sm text-navy-400">Nog niet gescoord</span>
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl ${groot ? 'px-3 py-1.5' : 'px-2.5 py-1'}`}
      style={{ backgroundColor: band.tint, color: band.kleur }}
    >
      <span className={`font-semibold tabular-nums ${groot ? 'text-2xl' : 'text-base'}`}>{score}</span>
      <span className={groot ? 'text-sm font-medium' : 'text-xs font-medium'}>{band.label}</span>
    </span>
  )
}

/**
 * Wat de cijfers betekenen. Staat altijd op het scherm, ook als er maar een
 * kandidaat is: de opdrachtgever leest dit scherm zonder ons erbij.
 */
export function ScoreLegenda() {
  return (
    <div className="rounded-xl border border-lijn bg-white p-3">
      <p className="mb-2 text-xs font-medium text-navy-400">Wat de score betekent</p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
        {SCORE_BANDEN.map((band, i) => {
          const boven = SCORE_BANDEN[i - 1]
          const bereik = !boven
            ? `${band.vanaf}+`
            : band.vanaf === 0
              ? `< ${boven.vanaf}`
              : `${band.vanaf}-${boven.vanaf - 1}`
          return (
            <li key={band.id} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: band.kleur }}
              />
              <span className="tabular-nums text-navy-400">{bereik}</span>
              <span style={{ color: band.kleur }} className="font-medium">
                {band.label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * De score-onderbouwing als bullets in plaats van een alinea.
 *
 * De tekst in de base volgt geen vast formaat, dus wat niet te ontleden valt
 * komt eronder te staan als gewone tekst. Niets weglaten: een onderbouwing die
 * half wordt getoond is erger dan een alinea die lastig leest.
 */
export function ScoreOnderbouwing({
  onderbouwing,
  score,
}: {
  onderbouwing?: string | null
  score?: number | null
}) {
  const { dimensies, rest } = scoreRegels(onderbouwing ?? '')
  if (dimensies.length === 0 && !rest) return null

  const band = scoreBand(score ?? null)
  const kleur = band?.kleur ?? 'var(--color-navy-400)'

  return (
    <div className="mt-2">
      {dimensies.length > 0 && (
        <ul className="flex flex-col gap-2">
          {dimensies.map((d, i) => (
            <li key={`${d.naam}-${i}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-sm font-medium">{d.naam}</span>
                <span className="shrink-0 text-sm tabular-nums text-navy-400">
                  {d.behaald}/{d.max}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-lijn">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, d.deel * 100))}%`, backgroundColor: kleur }}
                />
              </div>
              {d.toelichting && <p className="mt-1 text-xs text-navy-400">{d.toelichting}</p>}
            </li>
          ))}
        </ul>
      )}
      {rest && (
        <p className={`text-sm whitespace-pre-line ${dimensies.length > 0 ? 'mt-3 text-navy-400' : ''}`}>
          {rest}
        </p>
      )}
    </div>
  )
}
