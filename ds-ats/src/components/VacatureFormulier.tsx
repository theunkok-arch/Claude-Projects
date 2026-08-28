import { useState } from 'react'
import type { Vacature } from '../lib/types'

interface Veld {
  sleutel: keyof Vacature
  label: string
  soort: 'tekst' | 'keuze' | 'datum' | 'getal' | 'alinea'
  /** Alleen bij `keuze`: de toegestane waarden, in de volgorde van de base. */
  opties?: readonly string[]
  /** Alleen bij `getal`: de bovengrens. */
  max?: number
  /** Eén regel onder het veld, voor wat een label zelf niet kan uitleggen. */
  hulp?: string
}

/** De keuzelijst van de base. `satisfies` laat het misgaan zodra types.ts wijzigt. */
const STATUSSEN = [
  'Intake',
  'Actief',
  'On hold',
  'Vervuld',
  'Gestopt',
] as const satisfies readonly NonNullable<Vacature['Status']>[]

/**
 * Precies de velden die de server accepteert (`VACATURE_VELDEN` in
 * netlify/functions/ats.mjs). Bewust niet erbij:
 *
 * - `Validatie` en de rollups (`Op te volgen`, de aantallen) zijn
 *   Airtable-formules en niet schrijfbaar;
 * - `Opdrachtgever` is de koppeling zelf. Die zet de server bij het aanmaken;
 *   een vacature naar een andere klant verhuizen is iets anders dan hem
 *   bewerken, en zou de rollups van twee klanten tegelijk verzetten.
 *
 * De volgorde is die van het intakegesprek: wat de rol is, waar hij staat, wat
 * hij betaalt, wanneer hij moet lopen.
 */
const VELDEN: readonly Veld[] = [
  { sleutel: 'Titel', label: 'Titel', soort: 'tekst' },
  { sleutel: 'Status', label: 'Status', soort: 'keuze', opties: STATUSSEN },
  { sleutel: 'Standplaats', label: 'Standplaats', soort: 'tekst' },
  { sleutel: 'Salaris min', label: 'Salaris min', soort: 'getal' },
  { sleutel: 'Salaris max', label: 'Salaris max', soort: 'getal' },
  { sleutel: 'Startdatum', label: 'Startdatum', soort: 'datum' },
  { sleutel: 'Streefdatum shortlist', label: 'Streefdatum shortlist', soort: 'datum' },
  {
    sleutel: 'Scoringsdrempel',
    label: 'Scoringsdrempel',
    soort: 'getal',
    max: 100,
    hulp: 'Vanaf deze score (0-100) hoort een kandidaat op de shortlist.',
  },
  { sleutel: 'Jobspec', label: 'Jobspec', soort: 'alinea' },
]

/**
 * Hoeveel invulbare velden nog leeg zijn. Titel telt niet mee: die is verplicht
 * en dus per definitie gevuld. Status evenmin, want die heeft altijd een waarde.
 */
export function aantalLeeg(vacature: Vacature): number {
  return VELDEN.filter(
    (veld) =>
      veld.sleutel !== 'Titel' &&
      veld.sleutel !== 'Status' &&
      String(vacature[veld.sleutel] ?? '').trim() === '',
  ).length
}

/**
 * Airtable geeft een datum soms met tijd terug ("2026-08-28T00:00:00.000Z").
 * Een `input type="date"` toont zo'n waarde helemaal niet, en dan lijkt het veld
 * leeg terwijl er een datum staat — vandaar de eerste tien tekens.
 */
const alsTekst = (vacature: Vacature | undefined, veld: Veld): string => {
  const tekst = String(vacature?.[veld.sleutel] ?? '')
  return veld.soort === 'datum' ? tekst.slice(0, 10) : tekst
}

/**
 * Een vacature aanmaken of bewerken. Zonder dit formulier moest elke
 * salarisbandbreedte via een ontwikkelaar de base in, en bleven vacatures op
 * Intake staan terwijl er al kandidaten op liepen.
 *
 * De aanroeper kiest zelf of `onBewaar` naar `maakVacature` of naar
 * `wijzigVacature` gaat. Deze component weet alleen of er al een vacature ligt,
 * en bepaalt daarmee wát er meegaat: bij een nieuwe alles wat is ingevuld, bij
 * een bestaande alleen wat is veranderd.
 */
export default function VacatureFormulier({
  vacature,
  onBewaar,
  onSluit,
}: {
  vacature?: Vacature
  onBewaar: (velden: Partial<Vacature>) => Promise<void>
  onSluit: () => void
}) {
  const [concept, setConcept] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      VELDEN.map((veld) => [
        veld.sleutel,
        // Een nieuwe vacature begint op Intake: dat is de status waar de base
        // geen salarisband voor eist, dus de enige die altijd lukt.
        alsTekst(vacature, veld) || (veld.sleutel === 'Status' && !vacature ? 'Intake' : ''),
      ]),
    ),
  )
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  const zet = (sleutel: string, waarde: string) =>
    setConcept((huidig) => ({ ...huidig, [sleutel]: waarde }))

  /**
   * `null` is "niet ingevuld", en dat is iets anders dan 0: een salaris van nul
   * is een bewering, een leeg salarisveld niet. Staat er iets wat geen getal is,
   * dan komt daar `NaN` uit; dat moet hier stranden en niet als een ander getal
   * in de base belanden.
   */
  const getal = (sleutel: string): number | null => {
    const tekst = (concept[sleutel] ?? '').trim()
    if (!tekst) return null
    return Number(tekst.replace(',', '.'))
  }

  const bandOntbreekt =
    concept.Status === 'Actief' && (getal('Salaris min') === null || getal('Salaris max') === null)

  async function bewaar(event: React.FormEvent) {
    event.preventDefault()
    setFout(null)

    if (!concept.Titel?.trim()) {
      setFout('Titel is verplicht.')
      return
    }

    for (const veld of VELDEN) {
      if (veld.soort !== 'getal') continue
      const waarde = getal(veld.sleutel)
      if (waarde === null) continue
      if (!Number.isFinite(waarde) || waarde < 0) {
        setFout(`${veld.label} moet een getal van 0 of hoger zijn.`)
        return
      }
      if (veld.max !== undefined && waarde > veld.max) {
        setFout(`${veld.label} kan niet hoger zijn dan ${veld.max}.`)
        return
      }
    }

    const min = getal('Salaris min')
    const max = getal('Salaris max')
    if (min !== null && max !== null && min > max) {
      setFout('Salaris min kan niet hoger zijn dan Salaris max.')
      return
    }

    // Dit hier zeggen scheelt een mislukte opslag waarvan de oorzaak twee velden
    // hoger staat. De server controleert het ook, en dat is geen dubbelop: het
    // veld Validatie in de base is een formule, en formules berekenen een
    // waarde in plaats van invoer te weigeren. De base houdt dus niets tegen.
    if (bandOntbreekt) {
      setFout(
        'Een vacature mag pas op Actief met een salarisbandbreedte. Vul Salaris min en Salaris max in, of laat de status voorlopig op Intake staan.',
      )
      return
    }

    const velden: Record<string, string | number | null> = {}
    for (const veld of VELDEN) {
      const nieuw = (concept[veld.sleutel] ?? '').trim()
      const waarde = veld.soort === 'getal' ? getal(veld.sleutel) : nieuw

      if (!vacature) {
        // Aanmaken: alles wat is ingevuld gaat mee. Een leeg veld laten we weg
        // in plaats van leeg mee te sturen, zodat Airtable zijn eigen
        // standaardwaarden houdt.
        if (waarde !== null && waarde !== '') velden[veld.sleutel] = waarde
        continue
      }

      // Bewerken: alleen wat daadwerkelijk veranderd is. Een PATCH met alle
      // velden zou ook overschrijven wat iemand anders ondertussen heeft gevuld.
      if (nieuw === alsTekst(vacature, veld).trim()) continue
      velden[veld.sleutel] = waarde
    }

    if (Object.keys(velden).length === 0) {
      onSluit()
      return
    }

    setBezig(true)
    try {
      await onBewaar(velden as Partial<Vacature>)
      onSluit()
    } catch (error) {
      setFout(error instanceof Error ? error.message : 'Opslaan mislukt.')
      setBezig(false)
    }
  }

  return (
    <form onSubmit={bewaar} className="mt-3 rounded-2xl border border-lijn bg-white p-4">
      <div className="flex flex-col gap-3">
        {VELDEN.map((veld) => {
          const waarde = concept[veld.sleutel] ?? ''
          // Bij een bestaande vacature is een leeg veld een gat in de gegevens
          // en verdient het aandacht. Bij een nieuwe is nog alles leeg en zou
          // dezelfde markering alleen ruis zijn — behalve op de salarisvelden
          // zodra Actief is gekozen, want die blokkeren dan het opslaan.
          const salaris = veld.sleutel === 'Salaris min' || veld.sleutel === 'Salaris max'
          const leeg = !waarde.trim() && (Boolean(vacature) || (salaris && bandOntbreekt))
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
                  rows={4}
                  className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 ${
                    leeg ? 'border-oranje' : 'border-lijn'
                  }`}
                />
              ) : veld.soort === 'keuze' ? (
                <select
                  value={waarde}
                  onChange={(event) => zet(veld.sleutel, event.target.value)}
                  className="tik mt-1 w-full rounded-xl border border-lijn bg-white px-3 text-sm"
                >
                  {/* Een bestaande vacature zonder status zou anders Intake
                      tonen zonder het te zijn: de select laat bij een lege
                      waarde altijd de eerste optie zien. */}
                  {!waarde && <option value="">—</option>}
                  {veld.opties?.map((optie) => (
                    <option key={optie} value={optie}>
                      {optie}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={veld.soort === 'getal' ? 'number' : veld.soort === 'datum' ? 'date' : 'text'}
                  inputMode={veld.soort === 'getal' ? 'numeric' : undefined}
                  min={veld.soort === 'getal' ? 0 : undefined}
                  max={veld.soort === 'getal' ? veld.max : undefined}
                  value={waarde}
                  onChange={(event) => zet(veld.sleutel, event.target.value)}
                  className={`tik mt-1 w-full rounded-xl border bg-white px-3 ${
                    leeg ? 'border-oranje' : 'border-lijn'
                  }`}
                />
              )}
              {veld.hulp && <span className="mt-1 block text-xs text-navy-400">{veld.hulp}</span>}
            </label>
          )
        })}
      </div>

      {bandOntbreekt && (
        <p className="mt-3 rounded-xl bg-oranje-50 px-3 py-2 text-sm text-navy-700">
          Op Actief zijn Salaris min en Salaris max allebei verplicht. Zonder band houdt de base de
          vacature op Intake.
        </p>
      )}

      {fout && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={bezig}
          className="tik flex-1 rounded-xl bg-navy px-4 text-sm font-medium text-cream disabled:opacity-50"
        >
          {bezig ? 'Opslaan…' : vacature ? 'Opslaan' : 'Vacature aanmaken'}
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
