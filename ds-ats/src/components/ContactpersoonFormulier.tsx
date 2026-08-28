import { useState } from 'react'
import type { Contactpersoon } from '../lib/types'

/**
 * Precies de tekstvelden die de server accepteert (`CONTACTPERSOON_VELDEN` in
 * netlify/functions/ats.mjs). `Is hiring manager` staat er ook in, maar is een
 * selectievakje en loopt daarom hieronder apart; `Opdrachtgever` is het
 * koppelveld en wordt door de server gezet uit het meegegeven id.
 */
const VELDEN = [
  { sleutel: 'Naam', label: 'Naam', type: 'text' },
  { sleutel: 'Rol', label: 'Rol', type: 'text' },
  { sleutel: 'E-mail', label: 'E-mail', type: 'email' },
  { sleutel: 'Telefoon', label: 'Telefoon', type: 'tel' },
] as const satisfies ReadonlyArray<{
  sleutel: 'Naam' | 'Rol' | 'E-mail' | 'Telefoon'
  label: string
  type: string
}>

/**
 * Een contactpersoon aanmaken of bijwerken. Dezelfde component voor allebei:
 * de velden zijn identiek, en twee formulieren die uit elkaar lopen is precies
 * hoe je later een veld in één van beide vergeet.
 *
 * Zonder `contactpersoon` is dit het aanmaakformulier.
 */
export default function ContactpersoonFormulier({
  contactpersoon,
  onBewaar,
  onSluit,
}: {
  contactpersoon?: Contactpersoon
  onBewaar: (velden: Partial<Contactpersoon>) => Promise<void>
  onSluit: () => void
}) {
  const [concept, setConcept] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      VELDEN.map((veld) => [veld.sleutel, String(contactpersoon?.[veld.sleutel] ?? '')]),
    ),
  )
  const [hiringManager, setHiringManager] = useState(
    () => contactpersoon?.['Is hiring manager'] ?? false,
  )
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

    // Alleen wat daadwerkelijk veranderd is, zodat een bewerking nooit een veld
    // wist dat iemand anders ondertussen heeft gevuld. Bij een nieuwe
    // contactpersoon is er niets om mee te vergelijken en gaat alleen mee wat
    // is ingevuld.
    const gewijzigd: Record<string, string | boolean> = {}
    for (const veld of VELDEN) {
      const nieuw = (concept[veld.sleutel] ?? '').trim()
      if (nieuw !== String(contactpersoon?.[veld.sleutel] ?? '').trim()) {
        gewijzigd[veld.sleutel] = nieuw
      }
    }
    if (hiringManager !== (contactpersoon?.['Is hiring manager'] ?? false)) {
      gewijzigd['Is hiring manager'] = hiringManager
    }
    if (Object.keys(gewijzigd).length === 0) {
      onSluit()
      return
    }

    setBezig(true)
    setFout(null)
    try {
      await onBewaar(gewijzigd as Partial<Contactpersoon>)
      onSluit()
    } catch (error) {
      setFout(error instanceof Error ? error.message : 'Opslaan mislukt.')
      setBezig(false)
    }
  }

  return (
    <form onSubmit={bewaar} className="rounded-2xl border border-lijn bg-white p-4">
      <h3 className="font-semibold">
        {contactpersoon ? 'Contactpersoon bewerken' : 'Nieuwe contactpersoon'}
      </h3>

      <div className="mt-3 flex flex-col gap-3">
        {VELDEN.map((veld) => (
          <label key={veld.sleutel} className="block text-sm">
            <span className="text-navy-400">
              {veld.label}
              {veld.sleutel === 'Naam' && ' · verplicht'}
            </span>
            <input
              type={veld.type}
              value={concept[veld.sleutel] ?? ''}
              onChange={(event) => zet(veld.sleutel, event.target.value)}
              className="tik mt-1 w-full rounded-xl border border-lijn bg-white px-3"
            />
          </label>
        ))}

        {/*
          Het hele label is het raakvlak, niet alleen het vinkje van 16px: op
          een telefoon mis je zo'n vakje. `tik` zet de 44px op de rij.
        */}
        <label className="tik flex items-center gap-3 rounded-xl border border-lijn bg-white px-3 text-sm">
          <input
            type="checkbox"
            checked={hiringManager}
            onChange={(event) => setHiringManager(event.target.checked)}
            className="h-5 w-5 accent-oranje"
          />
          <span>Is hiring manager</span>
        </label>
      </div>

      {fout && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={bezig}
          className="tik flex-1 rounded-xl bg-navy px-4 text-sm font-medium text-cream disabled:opacity-50"
        >
          {bezig ? 'Opslaan…' : contactpersoon ? 'Opslaan' : 'Aanmaken'}
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
