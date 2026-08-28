import type { FunnelTrede } from '../lib/metrics'
import StageBadge from './StageBadge'

/**
 * De funnel per vacature. Nu-hier is de momentopname, bereikt is cumulatief —
 * pas dat tweede getal laat zien waar het lekt.
 */
export default function Funnel({ tredes }: { tredes: FunnelTrede[] }) {
  const top = Math.max(1, ...tredes.map((t) => t.bereikt))

  return (
    <ol className="flex flex-col gap-1.5">
      {tredes.map((trede) => (
        <li key={trede.stage} className="flex items-center gap-2">
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
        </li>
      ))}
    </ol>
  )
}
