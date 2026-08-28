export interface StageOptie {
  waarde: string
  label: string
  aantal: number
}

/**
 * Filter op één stage. Tot nu toe kon je alleen op "over de norm" filteren,
 * maar de vraag op maandag is net zo vaak "wie staat er op Benaderd".
 *
 * De opties komen van de aanroeper, want wat "alles" betekent verschilt per
 * scherm: op het maandagoverzicht zijn dat de actieve stages, op een vacature
 * hoort Afgevallen er ook bij.
 */
export default function StageFilter({
  waarde,
  onKies,
  opties,
}: {
  waarde: string
  onKies: (keuze: string) => void
  opties: StageOptie[]
}) {
  return (
    <select
      value={waarde}
      onChange={(event) => onKies(event.target.value)}
      aria-label="Filter op stage"
      className="tik min-w-0 flex-1 rounded-xl border border-lijn bg-white px-3 text-sm"
    >
      {opties.map((optie) => (
        <option key={optie.waarde} value={optie.waarde}>
          {optie.label} ({optie.aantal})
        </option>
      ))}
    </select>
  )
}
