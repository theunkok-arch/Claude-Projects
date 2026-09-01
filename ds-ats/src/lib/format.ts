const DATUM = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
const DATUM_KORT = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })

export function datum(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? '—' : DATUM.format(d)
}

export function datumKort(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? '—' : DATUM_KORT.format(d)
}

export function euro(bedrag?: number | null): string {
  if (bedrag === undefined || bedrag === null) return '—'
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(bedrag)
}

export function band(min?: number | null, max?: number | null): string {
  if (min === undefined || min === null || max === undefined || max === null) return 'Niet vastgesteld'
  return `${euro(min)} – ${euro(max)}`
}

export function dagen(aantal: number | null): string {
  if (aantal === null) return '—'
  return aantal === 1 ? '1 dag' : `${aantal} dagen`
}

/**
 * Het dimensielabel voor de score: "Senioriteit 15/15:", "Branche-fit 0/10".
 * Lui gekwantificeerd, zodat het bij "Senioriteit 15/15" op "Senioriteit"
 * stopt en niet het cijfer meeneemt dat erachter moet blijven staan.
 */
const DIMENSIELABEL = /^[^:.]{2,40}?\s\d{1,3}\/\d{1,3}\s*:?\s*/
const MAX_WOORDEN = 8

/**
 * De kern van de score-onderbouwing, kort genoeg voor één kaartregel.
 *
 * Vat niets samen en verzint niets: het pakt de eerste zin die na het
 * weghalen van het dimensielabel nog iets zegt, en kapt af op acht woorden.
 *
 * Het label moet eraf omdat "Senioriteit 15/15:" twee van de acht woorden kost
 * en dat cijfer al rechtsboven op de kaart staat. Zinnen die daarna leeg
 * overblijven ("Senioriteit 12/15.") worden overgeslagen — anders leest de
 * halve lijst als "12/15". En zinnen van één woord ook: op de 200
 * onderbouwingen in de base leverden die 25 keer een regel op als "onbekend",
 * "Randstad" of "direct", waar de volgende dimensie wél iets zei. In vijf
 * gevallen blijft er zo niets over; dan toont de kaart deze regel niet.
 *
 * Geen lookbehind in de splitsing: Safari kent die pas vanaf 16.4, en één
 * regex die de parser niet aankan neemt de hele bundel mee. Het punt gaat er
 * bij het splitsen af en wordt aan het eind toch weggehaald.
 */
export function scoringKern(onderbouwing?: string | null): string | null {
  const tekst = String(onderbouwing ?? '').trim()
  if (!tekst) return null

  for (const zin of tekst.split(/\.\s+/)) {
    const kaal = zin.replace(DIMENSIELABEL, '').trim().replace(/\.$/, '').trim()
    const woorden = kaal ? kaal.split(/\s+/) : []
    if (woorden.length < 2) continue
    return woorden.length > MAX_WOORDEN ? `${woorden.slice(0, MAX_WOORDEN).join(' ')}…` : kaal
  }
  return null
}
