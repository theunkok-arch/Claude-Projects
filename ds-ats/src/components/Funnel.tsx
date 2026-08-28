import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { StageId } from '../../shared/stages.mjs'
import type { FunnelTrede } from '../lib/metrics'
import { useHerkomst } from '../lib/herkomst'
import StageBadge from './StageBadge'

interface FunnelProps {
  tredes: FunnelTrede[]
  /** Maakt elke trede een link naar de kandidaten van die stage. */
  hrefVoor?: (stage: StageId) => string
  /** Maakt elke trede een knop, voor als de lijst op hetzelfde scherm staat. */
  onKies?: (stage: StageId) => void
  /** De stage die nu als filter aan staat, krijgt een oranje rand. */
  actief?: StageId | null
}

/**
 * De funnel per vacature. Nu-hier is de momentopname, bereikt is cumulatief —
 * pas dat tweede getal laat zien waar het lekt.
 *
 * Elke trede is aan te klikken: tik op "Benaderd 71" en je krijgt die 71
 * kandidaten. Zonder `hrefVoor` of `onKies` blijft het een leesbaar staafje.
 */
export default function Funnel({ tredes, hrefVoor, onKies, actief }: FunnelProps) {
  const top = Math.max(1, ...tredes.map((t) => t.bereikt))

  return (
    <ol className="flex flex-col gap-1.5">
      {tredes.map((trede) => (
        <li key={trede.stage}>
          <TredeWrapper
            stage={trede.stage}
            hrefVoor={hrefVoor}
            onKies={onKies}
            aan={actief === trede.stage}
            leeg={trede.nuHier === 0 && trede.bereikt === 0}
          >
            <div className="w-32 shrink-0">
              <StageBadge stage={trede.stage} klein />
            </div>
            <div className="h-6 flex-1 overflow-hidden rounded-md bg-white">
              <div
                className="h-full rounded-md bg-navy/15"
                style={{ width: `${Math.round((trede.bereikt / top) * 100)}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-sm tabular-nums">
              <span className="font-semibold">{trede.nuHier}</span>
              <span className="text-navy-400"> / {trede.bereikt}</span>
            </span>
          </TredeWrapper>
        </li>
      ))}
    </ol>
  )
}

/**
 * Een trede is een link, een knop of gewoon een rij. De opmaak is identiek,
 * zodat de funnel er hetzelfde uitziet of hij nu klikbaar is of niet.
 */
function TredeWrapper({
  stage,
  hrefVoor,
  onKies,
  aan,
  leeg,
  children,
}: {
  stage: StageId
  hrefVoor?: (stage: StageId) => string
  onKies?: (stage: StageId) => void
  aan: boolean
  leeg: boolean
  children: ReactNode
}) {
  const herkomst = useHerkomst()
  const klas = `tik -mx-1 flex w-full items-center gap-2 rounded-lg px-1 text-left ${
    aan ? 'ring-2 ring-oranje' : ''
  }`

  // Een lege trede aanklikken levert een lege lijst op; dat is geen filter waard.
  if (leeg || (!hrefVoor && !onKies)) {
    return <div className={`${klas} ${leeg ? 'opacity-50' : ''}`}>{children}</div>
  }

  if (hrefVoor) {
    return (
      <Link
        to={hrefVoor(stage)}
        state={herkomst}
        className={klas}
        aria-label={`Toon kandidaten in ${stage}`}
      >
        {children}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onKies?.(stage)}
      className={klas}
      aria-pressed={aan}
      aria-label={`Toon kandidaten in ${stage}`}
    >
      {children}
    </button>
  )
}
