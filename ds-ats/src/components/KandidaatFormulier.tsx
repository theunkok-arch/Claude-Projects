import { useState } from 'react'
import type { Kandidaat } from '../lib/types'

/**
 * Precies de velden die de server accepteert (`KANDIDAAT_VELDEN` in
 * netlify/functions/ats.mjs). Bewust niet erbij:
 *
 * - `Bewaren tot`, `Bewaartermijn verstreken`, `Dedupe-sleutel` zijn
 *   Airtable-formules en niet schrijfbaar;
 * - `Laatste contact` wordt al gezet door de activiteitenlogger. Twee bronnen
 *   voor één datum betekent dat de AVG-bewaartermijn afhangt van wie het
 *   laatst iets aanraakte;
 * - een stageveld hoort hier sowieso nooit: de stage hoort bij de aanmelding.
 */
const VELDEN = [
  { sleutel: 'Naam', label: 'Naam', type: 'text' },
  { sleutel: 'Huidige rol', label: 'Huidige rol', type: 'text' },
  { sleutel: 'Huidige werkgever', label: 'Huidige werkgever', type: 'text' },
  { sleutel: 'Woonplaats', label: 'Woonplaats', type: 'text' },
  { sleutel: 'LinkedIn-URL', label: 'LinkedIn-URL', type: 'url' },
  { sleutel: 'E-mail', label: 'E-mail', type: 'email' },
  { sleutel: 'Telefoon', label: 'Telefoon', type: 'tel' },
  { sleutel: 'Instagram', label: 'Instagram', type: 'text' },
  { sleutel: 'Opleiding', label: 'Opleiding', type: 'text' },
  { sleutel: 'Talen', label: 'Talen', type: 'text' },
] as const satisfies ReadonlyArray<{ sleutel: keyof Kandidaat; label: string; type: string }>

export const AANVULBARE_VELDEN = VELDEN.map((v) => v.sleutel)

/** Hoeveel van de aanvulbare velden nog leeg zijn. */
export function aantalLeeg(kandidaat: Kandidaat): number {
  return AANVULBARE_VELDEN.filter((sleutel) => !String(kandidaat[sleutel] ?? '').trim()).length
}

/**
 * Ontbrekende gegevens aanvullen. Wat hier wordt ingevuld is vanaf dat moment
 * leidend: de sheets in de Drive vullen de base aan, maar overschrijven nooit
 * wat hier staat.
 */
export default function KandidaatFormulier({
  kandidaat,
  bronnen,
  onBewaar,
  onSluit,
}: {
  kandidaat: Kandidaat
  bronnen: string[]
  onBewaar: (velden: Partial<Kandidaat>) => Promise<void>
  onSluit: () => void
}) {
  const [concept, setConcept] = useState<Record<string, string>>(() =>
    Object.fromEntries([
      ...VELDEN.map((v) => [v.sleutel, String(kandidaat[v.sleutel] ?? '')]),
      ['Bron', String(kandidaat.Bron ?? '')],
      ['Notities', String(kandidaat.Notities ?? '')],
    ]),
  )
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  const zet = (sleutel: string, waarde: string) =>
    setConcept((huidig) => ({ ...huidig, [sleutel]: waarde }))

  async function bewaar(event: React.FormEvent) {
    event.preventDefault()
    // Alleen wat daadwerkelijk veranderd is. Een PATCH met alle velden zou
    // ook de velden overschrijven die iemand anders ondertussen heeft gevuld.
    const gewijzigd: Record<string, string> = {}
    for (const [sleutel, waarde] of Object.entries(concept)) {
      const oud = String(kandidaat[sleutel as keyof Kandidaat] ?? '')
      if (waarde.trim() !== oud.trim()) gewijzigd[sleutel] = waarde.trim()
    }
    if (Object.keys(gewijzigd).length === 0) {
      onSluit()
      return
    }
    if (!gewijzigd.Naam && !kandidaat.Naam) {
      setFout('Naam is verplicht.')
      return
    }

    setBezig(true)
    setFout(null)
    try {
      await onBewaar(gewijzigd as Partial<Kandidaat>)
      onSluit()
    } catch (error) {
      setFout(error instanceof Error ? error.message : 'Opslaan mislukt.')
      setBezig(false)
    }
  }

  // Een bron die al in de base staat maar niet in de keuzelijst zou anders
  // stilzwijgend verdwijnen zodra iemand het formulier opent en opslaat.
  const bronOpties = [...new Set([...bronnen, concept.Bron].filter(Boolean))].sort()

  return (
    <form onSubmit={bewaar} className="mt-3 rounded-2xl border border-lijn bg-white p-4">
      <div className="flex flex-col gap-3">
        {VELDEN.map((veld) => {
          const leeg = !concept[veld.sleutel]?.trim()
          return (
            <label key={veld.sleutel} className="block text-sm">
              <span className={leeg ? 'text-oranje' : 'text-navy-400'}>
                {veld.label}
                {leeg && ' · leeg'}
              </span>
              <input
                type={veld.type}
                value={concept[veld.sleutel] ?? ''}
                onChange={(event) => zet(veld.sleutel, event.target.value)}
                className={`tik mt-1 w-full rounded-xl border bg-white px-3 ${
                  leeg ? 'border-oranje' : 'border-lijn'
                }`}
              />
            </label>
          )
        })}

        <label className="block text-sm">
          <span className={concept.Bron ? 'text-navy-400' : 'text-oranje'}>
            Bron{!concept.Bron && ' · leeg'}
          </span>
          <select
            value={concept.Bron ?? ''}
            onChange={(event) => zet('Bron', event.target.value)}
            className="tik mt-1 w-full rounded-xl border border-lijn bg-white px-3 text-sm"
          >
            <option value="">—</option>
            {bronOpties.map((bron) => (
              <option key={bron} value={bron}>
                {bron}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-navy-400">Notities</span>
          <textarea
            value={concept.Notities ?? ''}
            onChange={(event) => zet('Notities', event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-lijn bg-white px-3 py-2"
          />
        </label>
      </div>

      {fout && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={bezig}
          className="tik flex-1 rounded-xl bg-navy px-4 text-sm font-medium text-cream disabled:opacity-50"
        >
          {bezig ? 'Opslaan…' : 'Opslaan'}
        </button>
        <button
          type="button"
          onClick={onSluit}
          className="tik rounded-xl border border-lijn px-4 text-sm text-navy-400"
        >
          Annuleren
        </button>
      </div>
    </form>
  )
}
