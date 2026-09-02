import { useState } from 'react'
import type { Aanmelding } from '../lib/types'

interface Veld {
  sleutel: keyof Aanmelding
  label: string
  soort: 'tekst' | 'getal' | 'alinea'
  /** Alleen bij `getal`: de bovengrens en of er decimalen mogen. */
  max?: number
  heel?: boolean
}

/**
 * Precies de velden die de server accepteert (`AANMELDING_VELDEN` in
 * netlify/functions/ats.mjs). Bewust niet erbij:
 *
 * - `Zichtbaar voor klant` bepaalt of de opdrachtgever de naam en werkgever van
 *   deze kandidaat op het portaal ziet in plaats van alleen initialen, en wordt
 *   gezet zodra een aanmelding een klantzichtbare stage bereikt. Daar met de
 *   hand overheen kunnen is een privacybesluit dat een eigen ontwerp verdient,
 *   geen selectievakje tussen de dagelijkse invoer;
 * - `Concurrent` is een signaal uit de sourcing, geen dagelijkse invoer;
 * - `Outreach-concept` en `Eigenaar` horen bij respectievelijk de outreach en
 *   een tweede gebruiker; geen van beide loopt vandaag via dit scherm;
 * - een stageveld hoort hier nooit. De stage wijzig je via de bottom sheet, die
 *   bij Afgevallen de reden verplicht afdwingt; een vrij veld zou die controle
 *   omzeilen.
 */
const VELDEN: readonly Veld[] = [
  { sleutel: 'Volgende actie', label: 'Volgende actie', soort: 'tekst' },
  { sleutel: 'Score totaal', label: 'Score totaal', soort: 'getal', max: 100 },
  // Reisafstand is bij meerdere opdrachten een hard criterium, en het is typisch
  // iets wat je tijdens een telefoontje hoort. Vijf uur enkele reis is de
  // bovengrens: daarboven is het geen reistijd meer maar een typefout, en zonder
  // grens belandt een verdwaalde 3000 ongemerkt in de base.
  { sleutel: 'Reistijd minuten', label: 'Reistijd in minuten', soort: 'getal', heel: true, max: 300 },
  { sleutel: 'Score-onderbouwing', label: 'Score-onderbouwing', soort: 'alinea' },
  { sleutel: 'Opmerkingen', label: 'Opmerkingen', soort: 'alinea' },
]

const alsTekst = (aanmelding: Aanmelding, sleutel: keyof Aanmelding) =>
  String(aanmelding[sleutel] ?? '')

/** Hoeveel van de bewerkbare velden nog leeg zijn. */
export function aantalLeeg(aanmelding: Aanmelding): number {
  return VELDEN.filter((veld) => !alsTekst(aanmelding, veld.sleutel).trim()).length
}

/**
 * De velden van één aanmelding bijwerken. Zelfde opzet als het
 * kandidaatformulier: wat hier staat is leidend, en alleen gewijzigde velden
 * gaan mee zodat twee mensen elkaars werk niet wissen.
 */
export default function AanmeldingFormulier({
  aanmelding,
  onBewaar,
  onSluit,
}: {
  aanmelding: Aanmelding
  onBewaar: (velden: Partial<Aanmelding>) => Promise<void>
  onSluit: () => void
}) {
  const [concept, setConcept] = useState<Record<string, string>>(() =>
    Object.fromEntries(VELDEN.map((veld) => [veld.sleutel, alsTekst(aanmelding, veld.sleutel)])),
  )
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  const zet = (sleutel: string, waarde: string) =>
    setConcept((huidig) => ({ ...huidig, [sleutel]: waarde }))

  async function bewaar(event: React.FormEvent) {
    event.preventDefault()
    // Alleen wat daadwerkelijk veranderd is. Een PATCH met alle velden zou ook
    // overschrijven wat iemand anders ondertussen heeft gevuld.
    const gewijzigd: Record<string, string | number | null> = {}

    for (const veld of VELDEN) {
      const nieuw = (concept[veld.sleutel] ?? '').trim()
      if (nieuw === alsTekst(aanmelding, veld.sleutel).trim()) continue

      if (veld.soort !== 'getal') {
        gewijzigd[veld.sleutel] = nieuw
        continue
      }

      // Een leeg getalveld betekent "niet ingevuld", geen nul: null wist het in
      // Airtable, terwijl 0 een verzonnen score of reistijd in de cijfers zet.
      if (!nieuw) {
        gewijzigd[veld.sleutel] = null
        continue
      }
      // De server typecast wat hij krijgt, dus onzin moet hier stranden en niet
      // stilzwijgend als een ander getal in de base belanden.
      const getal = Number(nieuw.replace(',', '.'))
      if (!Number.isFinite(getal) || getal < 0) {
        setFout(`${veld.label} moet een getal van 0 of hoger zijn.`)
        return
      }
      if (veld.heel && !Number.isInteger(getal)) {
        setFout(`${veld.label} moet een heel getal zijn.`)
        return
      }
      if (veld.max !== undefined && getal > veld.max) {
        setFout(`${veld.label} kan niet hoger zijn dan ${veld.max}.`)
        return
      }
      gewijzigd[veld.sleutel] = getal
    }

    if (Object.keys(gewijzigd).length === 0) {
      onSluit()
      return
    }

    setBezig(true)
    setFout(null)
    try {
      await onBewaar(gewijzigd as Partial<Aanmelding>)
      onSluit()
    } catch (error) {
      setFout(error instanceof Error ? error.message : 'Opslaan mislukt.')
      setBezig(false)
    }
  }

  return (
    <form onSubmit={bewaar} className="mt-3 border-t border-lijn pt-3">
      <div className="flex flex-col gap-3">
        {VELDEN.map((veld) => {
          const waarde = concept[veld.sleutel] ?? ''
          const leeg = !waarde.trim()
          return (
            <label key={veld.sleutel} className="block text-sm">
              <span className={leeg ? 'text-oranje' : 'text-navy-400'}>
                {veld.label}
                {leeg && ' · leeg'}
              </span>
              {veld.soort === 'alinea' ? (
                <textarea
                  value={waarde}
                  onChange={(event) => zet(veld.sleutel, event.target.value)}
                  rows={3}
                  className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 ${
                    leeg ? 'border-oranje' : 'border-lijn'
                  }`}
                />
              ) : (
                <input
                  type={veld.soort === 'getal' ? 'number' : 'text'}
                  inputMode={veld.soort === 'getal' ? (veld.heel ? 'numeric' : 'decimal') : undefined}
                  min={veld.soort === 'getal' ? 0 : undefined}
                  max={veld.max}
                  step={veld.soort === 'getal' ? (veld.heel ? 1 : 'any') : undefined}
                  value={waarde}
                  onChange={(event) => zet(veld.sleutel, event.target.value)}
                  className={`tik mt-1 w-full rounded-xl border bg-white px-3 ${
                    leeg ? 'border-oranje' : 'border-lijn'
                  }`}
                />
              )}
            </label>
          )
        })}
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
