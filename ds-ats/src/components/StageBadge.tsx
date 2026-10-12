import { stageConfig } from '../../shared/stages.mjs'
import type { StageToon } from '../../shared/stages.mjs'

const TOON: Record<StageToon, string> = {
  grijs: 'bg-slate-200 text-slate-700',
  blauw: 'bg-sky-100 text-sky-900',
  oranje: 'bg-oranje-100 text-oranje',
  'oranje-op': 'bg-oranje text-white',
  donkerblauw: 'bg-navy text-white',
  groen: 'bg-emerald-100 text-emerald-900',
}

interface Props {
  stage?: string
  onClick?: () => void
  klein?: boolean
  /**
   * Wat er op de badge staat. Standaard de stage zelf.
   *
   * Het klantportaal geeft hier de vertaling mee. De kleur en de vorm blijven
   * op `stage` staan, de canonieke waarde uit Airtable, want daar hangt de hele
   * sortering aan. Vertalen is weergave, nooit een hernoeming.
   */
  label?: string
}

export default function StageBadge({ stage, onClick, klein = false, label }: Props) {
  const config = stageConfig(stage)
  const tekst = label ?? stage ?? 'Geen stage'
  const classes = `inline-flex items-center justify-center rounded-full font-semibold ${
    klein ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  } ${config ? TOON[config.toon] : 'bg-slate-200 text-slate-700'}`

  if (!onClick) return <span className={classes}>{tekst}</span>

  return (
    <button type="button" onClick={onClick} className={`${classes} tik gap-1`}>
      {tekst}
      <span aria-hidden className="opacity-60">▾</span>
    </button>
  )
}
