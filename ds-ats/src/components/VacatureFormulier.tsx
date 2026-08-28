import type { Vacature } from '../lib/types'

/**
 * PLAATSHOUDER — WEGGOOIEN BIJ HET SAMENVOEGEN.
 *
 * Het echte vacatureformulier komt uit een parallelle taak, met exact deze
 * signatuur. Dit bestand staat er alleen zodat de knop "Nieuwe vacature" op
 * `OpdrachtgeverDetail` compileert; vervang het één-op-één door de echte
 * versie en verwijder deze plaatshouder.
 */
export default function VacatureFormulier({
  onSluit,
}: {
  vacature?: Vacature
  onBewaar: (velden: Partial<Vacature>) => Promise<void>
  onSluit: () => void
}) {
  return (
    <div className="rounded-2xl border border-oranje bg-oranje-50 p-4 text-sm">
      <p className="font-medium">Plaatshouder — het vacatureformulier hoort hier nog te komen.</p>
      <button
        type="button"
        onClick={onSluit}
        className="tik mt-3 rounded-xl border border-lijn bg-white px-4 text-sm text-navy-400"
      >
        Sluiten
      </button>
    </div>
  )
}
