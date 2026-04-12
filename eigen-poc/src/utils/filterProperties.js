// Shared property filter logic used by both B1Search (live count preview)
// and B2Results (actual filtering). Handles region expansion so that e.g.
// searching "Utrecht" also surfaces properties in Bilthoven/De Bilt/Zeist.

export const CITY_REGIONS = {
  'Utrecht': ['Utrecht', 'Bilthoven', 'De Bilt', 'Zeist', 'Amersfoort'],
  'Amsterdam': ['Amsterdam', 'Amstelveen', 'Diemen'],
  'Rotterdam': ['Rotterdam', 'Schiedam', 'Capelle'],
  'Den Haag': ['Den Haag', 'Rijswijk', 'Voorburg'],
  'Maastricht': ['Maastricht'],
  'Groningen': ['Groningen'],
  'Bilthoven': ['Bilthoven', 'Utrecht', 'De Bilt', 'Zeist'],
}

function expandCities(cities) {
  const expanded = new Set()
  for (const c of cities) {
    const region = CITY_REGIONS[c] || [c]
    region.forEach((r) => expanded.add(r))
  }
  return [...expanded]
}

function hasAnyFilter(f) {
  return (
    (f.cities && f.cities.length > 0) ||
    (f.propertyTypes && f.propertyTypes.length > 0) ||
    f.minPrice != null ||
    f.maxPrice != null ||
    f.minBedrooms != null
  )
}

// Apply filters strictly. Returns the narrowed list.
export function applyFilters(properties, filters) {
  let results = [...properties]
  const f = filters || {}

  if (f.cities && f.cities.length > 0) {
    const allowed = expandCities(f.cities)
    results = results.filter((p) => allowed.includes(p.city))
  }
  if (f.propertyTypes && f.propertyTypes.length > 0) {
    results = results.filter((p) => f.propertyTypes.includes(p.type))
  }
  if (f.minPrice != null) results = results.filter((p) => p.askingPrice >= f.minPrice)
  if (f.maxPrice != null) results = results.filter((p) => p.askingPrice <= f.maxPrice)
  if (f.minBedrooms != null) results = results.filter((p) => p.bedrooms >= f.minBedrooms)

  return results
}

// Always-return-something filter: if strict filtering yields zero results,
// progressively relax filters in priority order until at least one match is
// found. Returns { results, relaxed: [keys that were dropped] }.
export function applyFiltersWithFallback(properties, filters) {
  const strict = applyFilters(properties, filters)
  if (strict.length > 0 || !hasAnyFilter(filters)) {
    return { results: strict, relaxed: [] }
  }

  // Relax order: drop maxPrice, then minPrice, then minBedrooms, then propertyTypes, then cities
  const relaxOrder = ['maxPrice', 'minPrice', 'minBedrooms', 'propertyTypes', 'cities']
  let working = { ...filters }
  const relaxed = []
  for (const key of relaxOrder) {
    if (key === 'cities' || key === 'propertyTypes') {
      if (!working[key] || working[key].length === 0) continue
      working = { ...working, [key]: [] }
    } else {
      if (working[key] == null) continue
      working = { ...working, [key]: null }
    }
    relaxed.push(key)
    const candidate = applyFilters(properties, working)
    if (candidate.length > 0) {
      return { results: candidate, relaxed }
    }
  }
  // Last resort — return everything
  return { results: [...properties], relaxed: ['all'] }
}

export function countActiveFilters(filters) {
  const f = filters || {}
  let n = 0
  if (f.cities && f.cities.length > 0) n += f.cities.length
  if (f.propertyTypes && f.propertyTypes.length > 0) n += f.propertyTypes.length
  if (f.minPrice != null) n += 1
  if (f.maxPrice != null) n += 1
  if (f.minBedrooms != null) n += 1
  return n
}
