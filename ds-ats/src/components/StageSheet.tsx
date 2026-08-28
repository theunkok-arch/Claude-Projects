import { useEffect, useState } from 'react'
import { AFVAL_REDENEN, STAGES } from '../../shared/stages.mjs'
import type { StageId } from '../../shared/stages.mjs'
import StageBadge from './StageBadge'

interface Props {
  huidigeStage?: string
  naam: string
  open: boolean
  onSluit: () => void
  onKies: (stage: StageId, redenAfvallen?: string) => Promise<void>
}

/**
 * Twee taps: stage kiezen en klaar. Kiest de gebruiker Afgevallen, dan komt de
 * redenlijst er direct achteraan en is die verplicht — geen afvaller zonder reden.
 */
export default function StageSheet({ huidigeStage, naam, open, onSluit, onKies }: Props) {
  const [redenVoor, setRedenVoor] = useState<StageId | null>(null)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setRedenVoor(null)
      setBezig(false)
      setFout(null)
    }
  }, [open])

  if (!open) return null

  async function kies(stage: StageId, reden?: string) {
    if (stage === 'Afgevallen' && !reden) {
      setRedenVoor(stage)
      return
    }
    setBezig(true)
    setFout(null)
    try {
      await onKies(stage, reden)
      onSluit()
    } catch (error) {
      setFout(error instanceof Error ? error.message : 'Wijzigen mislukt.')
      setBezig(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Sluiten"
        className="absolute inset-0 bg-navy/50"
        onClick={onSluit}
      />
      <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl">
        <div className="sticky top-0 border-b border-lijn bg-white px-5 pt-4 pb-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-lijn" />
          <p className="text-sm text-navy-400">{redenVoor ? 'Reden van afvallen' : 'Verplaats naar'}</p>
          <p className="truncate font-semibold">{naam}</p>
        </div>

        {fout && <p className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}

        {redenVoor ? (
          <div className="px-5 py-3">
            {Object.entries(AFVAL_REDENEN).map(([kop, redenen]) => (
              <div key={kop} className="mb-4">
                <p className="mb-2 text-xs font-semibold tracking-wide text-navy-400 uppercase">{kop}</p>
                <div className="flex flex-col gap-1">
                  {redenen.map((reden) => (
                    <button
                      key={reden}
                      type="button"
                      disabled={bezig}
                      onClick={() => kies('Afgevallen', reden)}
                      className="tik rounded-xl px-3 py-2.5 text-left text-[15px] active:bg-cream disabled:opacity-50"
                    >
                      {reden}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRedenVoor(null)}
              className="tik w-full rounded-xl border border-lijn py-3 font-medium"
            >
              Terug
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-5 py-3">
            {STAGES.map((stage) => (
              <button
                key={stage.id}
                type="button"
                disabled={bezig || stage.id === huidigeStage}
                onClick={() => kies(stage.id)}
                className="tik flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-left active:bg-cream disabled:opacity-40"
              >
                <StageBadge stage={stage.id} klein />
                <span className="flex-1 truncate text-sm text-navy-400">{stage.actie}</span>
                {stage.norm > 0 && (
                  <span className="shrink-0 text-xs text-navy-400">{stage.norm} wd</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
