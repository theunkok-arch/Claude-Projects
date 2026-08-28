import { Link } from 'react-router-dom'
import type { StageId } from '../../shared/stages.mjs'
import StageBadge from './StageBadge'

export interface StageTelling {
  stage: StageId
  aantal: number
  overschreden: number
}

/**
 * Het beginscherm toont tellingen, geen namen. Wie een stage aantikt krijgt pas
 * de lijst. Zo is in dertig seconden te zien waar het werk zit, zonder eerst
 * langs tweehonderd kaarten te scrollen.
 */
export default function StageTegels({
  tellingen,
  hrefVoor,
}: {
  tellingen: StageTelling[]
  hrefVoor: (stage: StageId) => string
}) {
  return (
    <ol className="flex flex-col gap-2">
      {tellingen.map((rij) => (
        <li key={rij.stage}>
          <Link
            to={hrefVoor(rij.stage)}
            className="tik flex items-center gap-3 rounded-2xl border border-lijn bg-white px-4 py-3 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <StageBadge stage={rij.stage} klein />
              {rij.overschreden > 0 && (
                <p className="mt-1 text-sm font-medium text-oranje">
                  {rij.overschreden} over de norm
                </p>
              )}
            </div>
            <span className="shrink-0 text-2xl font-semibold tabular-nums">{rij.aantal}</span>
            <span aria-hidden className="shrink-0 text-navy-400">
              ›
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}
