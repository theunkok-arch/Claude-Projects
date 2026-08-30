import { useState } from 'react'
import type { Opdrachtgever } from '../lib/types'

interface Veld {
  sleutel: 'Naam' | 'Status' | 'Notities'
  label: string
  soort: 'tekst' | 'keuze' | 'alinea'
}

/**
 * Precies de velden die de server accepteert (`OPDRACHTGEVER_VELDEN` in
 * netlify/functions/ats.mjs). Bewust niet erbij:
 *
 * - `Portal-token` hoorde bij het oude tokenrapport en wordt nergens meer
 *   gelezen. Klanttoegang loopt nu via het scherm Klanttoegang, met een eigen
 *   wachtwoord per persoon;
 * - `Vacatures` en `Contactpersonen` zijn koppelvelden; die worden vanaf de
 *   andere kant gezet, bij het aanmaken van de vacature of de contactpersoon.
 */
const VELDEN = [
  { sleutel: 'Naam', label: 'Naam', soort: 'tekst' },
  { sleutel: 'Status', label: 'Status', soort: 'keuze' },
  { sleutel: 'Notities', label: 'Notities', soort: 'alinea' },
] as const satisfies ReadonlyArray<Veld>

/** De keuzelijst van `Status` in de base, zie `Opdrachtgever` in src/lib/types.ts. */
const STATUSSEN = ['Prospect', 'Actief', 'On hold', 'Afgerond'] as const

/**
 * Een opdrachtgever aanmaken of bijwerken. Zonder dit scherm moest elke nieuwe
 * klant via een ontwikkelaar de base in, terwijl de import elke aanmelding op
 * naam koppelt aan een vacature die er al moet zijn.
 *
 * Zonder `opdrachtgever` is dit het aanmaakformulier. Een nieuwe klant begint
 * op Prospect: je legt hem meestal vast vóórdat de opdracht rond is, en het is
 * één tik om dat anders te zetten.
 */
export default function OpdrachtgeverFormulier({
  opdrachtgever,
  onBewaar,
  onSluit,
}: {
  opdrachtgever?: Opdrachtgever
  onBewaar: (velden: Partial<Opdrachtgever>) => Promise<void>
  onSluit: () => void
}) {
  const [concept, setConcept] = useState<Record<string, string>>(() => ({
    Naam: opdrachtgever?.Naam ?? '',
    Status: opdrachtgever?.Status ?? (opdrachtgever ? '' : 'Prospect'),
    Notities: opdrachtgever?.Notities ?? '',
  }))
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  const zet = (sleutel: string, waarde: string) =>
    setConcept((huidig) => ({ ...huidig, [sleutel]: waarde }))

  async function bewaar(event: React.FormEvent) {
    event.preventDefault()

    if (!concept.Naam?.trim()) {
      setFout('Naam is verplicht.')
      return
    }

    // Alleen wat daadwerkelijk veranderd is. Een PATCH met alle velden zou ook
    // overschrijven wat iemand anders ondertussen heeft gevuld. Bij een nieuwe
    // klant is er niets om mee te vergelijken, dus gaat alles mee wat is
    // ingevuld — en niets wat leeg bleef.
    const gewijzigd: Record<string, string> = {}
    for (const veld of VELDEN) {
      const nieuw = (concept[veld.sleutel] ?? '').trim()
      if (nieuw !== String(opdrachtgever?.[veld.sleutel] ?? '').trim()) {
        gewijzigd[veld.sleutel] = nieuw
      }
    }
    if (Object.keys(gewijzigd).length === 0) {
      onSluit()
      return
    }

    setBezig(true)
    setFout(null)
    try {
      await onBewaar(gewijzigd as Partial<Opdrachtgever>)
      onSluit()
    } catch (error) {
      setFout(error instanceof Error ? error.message : 'Opslaan mislukt.')
      setBezig(false)
    }
  }

  return (
    <form onSubmit={bewaar} className="rounded-2xl border border-lijn bg-white p-4">
      <h3 className="font-semibold">
        {opdrachtgever ? 'Opdrachtgever bewerken' : 'Nieuwe opdrachtgever'}
      </h3>

      <div className="mt-3 flex flex-col gap-3">
        {VELDEN.map((veld) => (
          <label key={veld.sleutel} className="block text-sm">
            <span className="text-navy-400">
              {veld.label}
              {veld.sleutel === 'Naam' && ' · verplicht'}
            </span>

            {veld.soort === 'tekst' && (
              <input
                type="text"
                value={concept[veld.sleutel] ?? ''}
                onChange={(event) => zet(veld.sleutel, event.target.value)}
                className="tik mt-1 w-full rounded-xl border border-lijn bg-white px-3"
              />
            )}

            {veld.soort === 'keuze' && (
              <select
                value={concept[veld.sleutel] ?? ''}
                onChange={(event) => zet(veld.sleutel, event.target.value)}
                className="tik mt-1 w-full rounded-xl border border-lijn bg-white px-3 text-sm"
              >
                <option value="">—</option>
                {STATUSSEN.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            )}

            {veld.soort === 'alinea' && (
              <textarea
                value={concept[veld.sleutel] ?? ''}
                onChange={(event) => zet(veld.sleutel, event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-lijn bg-white px-3 py-2"
              />
            )}
          </label>
        ))}
      </div>

      {fout && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={bezig}
          className="tik flex-1 rounded-xl bg-navy px-4 text-sm font-medium text-cream disabled:opacity-50"
        >
          {bezig ? 'Opslaan…' : opdrachtgever ? 'Opslaan' : 'Aanmaken'}
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
