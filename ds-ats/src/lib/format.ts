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

export function initialen(naam?: string): string {
  if (!naam) return '?'
  return naam
    .split(/\s+/)
    .filter((deel) => deel.length > 1)
    .slice(0, 2)
    .map((deel) => deel[0]?.toUpperCase())
    .join('')
}
