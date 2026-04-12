// -------------------------------------------------------------------
// filterProperties.js — EIGEN filter + AI scoring engine
//
// Part 1: Traditional filters (CITY_REGIONS, applyFilters, applyFiltersWithFallback)
//         Used by B1 live count preview and B2 broader-results fallback.
// Part 2: AI scoring engine (parseNaturalQuery, scoreProperty, filterAndScore,
//         generateSmartFilters, applySmartFilters)
//         Used by the conversational search flow.
// -------------------------------------------------------------------

// =====================================================================
// PART 1 — Traditional filter logic (region expansion + progressive relax)
// =====================================================================

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

export function applyFiltersWithFallback(properties, filters) {
  const strict = applyFilters(properties, filters)
  if (strict.length > 0 || !hasAnyFilter(filters)) {
    return { results: strict, relaxed: [] }
  }

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

// =====================================================================
// PART 2 — AI scoring engine (conversational search)
// =====================================================================

// ---- City name normalization ----
const CITY_MAP = {
  amsterdam: 'Amsterdam',
  rotterdam: 'Rotterdam',
  utrecht: 'Utrecht',
  'den haag': 'Den Haag',
  'the hague': 'Den Haag',
  "'s-gravenhage": 'Den Haag',
  maastricht: 'Maastricht',
  groningen: 'Groningen',
}

// ---- Property type normalization ----
const TYPE_MAP = {
  apartment: 'Appartement',
  appartement: 'Appartement',
  flat: 'Appartement',
  condo: 'Appartement',
  house: 'Tussenwoning',
  'family home': 'Tussenwoning',
  'terraced house': 'Tussenwoning',
  tussenwoning: 'Tussenwoning',
  rijtjeshuis: 'Tussenwoning',
  villa: 'Villa',
  detached: 'Villa',
  vrijstaand: 'Villa',
  townhouse: 'Herenhuis',
  herenhuis: 'Herenhuis',
  'semi-detached': 'Twee-onder-een-kap',
  'twee-onder-een-kap': 'Twee-onder-een-kap',
  '2-onder-1-kap': 'Twee-onder-een-kap',
}

const TYPE_GROUPS = {
  houses: ['Tussenwoning', 'Herenhuis', 'Villa', 'Twee-onder-een-kap'],
  apartments: ['Appartement'],
}

// ---- Feature keywords ----
const FEATURE_KEYWORDS = {
  garden: ['garden', 'tuin', 'south garden'],
  balcony: ['balcony', 'balkon'],
  parking: ['parking', 'garage', 'driveway', 'carport'],
  solar: ['solar', 'zonnepanelen'],
  'heat pump': ['heat pump', 'warmtepomp'],
  elevator: ['elevator', 'lift'],
  fireplace: ['fireplace', 'open haard'],
  storage: ['storage', 'berging', 'shed'],
  'canal view': ['canal view', 'grachtenpand'],
}

// ---- Parse natural language query ----
export function parseNaturalQuery(text) {
  const q = text.toLowerCase().trim()
  const criteria = {
    city: null,
    propertyType: null,
    minPrice: null,
    maxPrice: null,
    minBedrooms: null,
    features: [],
    energyLabel: null,
    minArea: null,
  }

  // City extraction
  for (const [keyword, city] of Object.entries(CITY_MAP)) {
    if (q.includes(keyword)) {
      criteria.city = city
      break
    }
  }

  // Price extraction
  const betweenMatch = q.match(/between\s+(\d+)\s*k?\s*[-–and]+\s*(\d+)\s*k/i)
  if (betweenMatch) {
    let lo = parseInt(betweenMatch[1])
    let hi = parseInt(betweenMatch[2])
    if (lo < 10000) lo *= 1000
    if (hi < 10000) hi *= 1000
    criteria.minPrice = lo
    criteria.maxPrice = hi
  } else {
    const underMatch = q.match(/(?:under|max|below|tot|maximaal)\s+[€]?\s*(\d[\d.,]*)\s*k?/i)
    if (underMatch) {
      let val = parseFloat(underMatch[1].replace(/[.,]/g, ''))
      if (val < 10000) val *= 1000
      criteria.maxPrice = val
    }

    const aboveMatch = q.match(/(?:above|min|from|vanaf|minimaal)\s+[€]?\s*(\d[\d.,]*)\s*k?/i)
    if (aboveMatch) {
      let val = parseFloat(aboveMatch[1].replace(/[.,]/g, ''))
      if (val < 10000) val *= 1000
      criteria.minPrice = val
    }

    if (!criteria.minPrice && !criteria.maxPrice) {
      const approxMatch = q.match(/(?:~|around|about|circa|ca\.?\s*)?\s*[€]?\s*(\d[\d.,]*)\s*k\b/i)
      if (approxMatch) {
        let val = parseFloat(approxMatch[1].replace(/[.,]/g, ''))
        if (val < 10000) val *= 1000
        criteria.minPrice = Math.round(val * 0.85)
        criteria.maxPrice = Math.round(val * 1.15)
      } else {
        const plainMatch = q.match(/[€]\s*(\d{3}[.,]\d{3})\b/)
        if (plainMatch) {
          const val = parseInt(plainMatch[1].replace(/[.,]/g, ''))
          criteria.minPrice = Math.round(val * 0.85)
          criteria.maxPrice = Math.round(val * 1.15)
        }
      }
    }
  }

  // Property type
  const sortedTypes = Object.entries(TYPE_MAP).sort((a, b) => b[0].length - a[0].length)
  for (const [keyword, type] of sortedTypes) {
    if (q.includes(keyword)) {
      criteria.propertyType = type
      break
    }
  }

  // Bedrooms
  const bedMatch = q.match(/(\d+)\s*(?:\+\s*)?(?:bed|bedroom|slaapkamer|br|kamer)/i)
  if (bedMatch) criteria.minBedrooms = parseInt(bedMatch[1])
  const atLeastBedMatch = q.match(/at\s+least\s+(\d+)\s*(?:bed|bedroom|slaapkamer)/i)
  if (atLeastBedMatch) criteria.minBedrooms = parseInt(atLeastBedMatch[1])

  // Features
  for (const [feature, keywords] of Object.entries(FEATURE_KEYWORDS)) {
    if (keywords.some((kw) => q.includes(kw))) {
      criteria.features.push(feature)
    }
  }

  // Energy label
  const energyMatch = q.match(/energy\s*(?:label)?\s*([a-g])\b/i)
  if (energyMatch) criteria.energyLabel = energyMatch[1].toUpperCase()

  // Area
  const areaMatch = q.match(/(\d+)\s*(?:m2|m²|sqm|vierkante\s*meter)/i)
  if (areaMatch) criteria.minArea = parseInt(areaMatch[1])

  return criteria
}

// ---- Score a single property against criteria ----
export function scoreProperty(property, criteria) {
  const breakdown = {}
  const NEUTRAL = 70

  // City (weight: 30)
  if (criteria.city) {
    // Use CITY_REGIONS for fuzzy city matching
    const regionCities = CITY_REGIONS[criteria.city] || [criteria.city]
    breakdown.city = regionCities.includes(property.city) ? 100 : 0
  } else {
    breakdown.city = NEUTRAL
  }

  // Price (weight: 25)
  if (criteria.minPrice || criteria.maxPrice) {
    const price = property.price
    const min = criteria.minPrice || 0
    const max = criteria.maxPrice || Infinity
    if (price >= min && price <= max) {
      breakdown.price = 100
    } else {
      const mid = max === Infinity ? min : min === 0 ? max : (min + max) / 2
      const range = max === Infinity ? min * 0.3 : max - min || mid * 0.3
      const deviation = price < min ? (min - price) / range : (price - max) / range
      if (deviation <= 0.1) breakdown.price = 75
      else if (deviation <= 0.2) breakdown.price = 45
      else if (deviation <= 0.3) breakdown.price = 20
      else breakdown.price = 5
    }
  } else {
    breakdown.price = NEUTRAL
  }

  // Property type (weight: 15)
  if (criteria.propertyType) {
    if (property.type === criteria.propertyType) {
      breakdown.type = 100
    } else {
      const sameGroup = Object.values(TYPE_GROUPS).some(
        (group) => group.includes(property.type) && group.includes(criteria.propertyType)
      )
      breakdown.type = sameGroup ? 60 : 10
    }
  } else {
    breakdown.type = NEUTRAL
  }

  // Bedrooms (weight: 10)
  if (criteria.minBedrooms) {
    const diff = property.bedrooms - criteria.minBedrooms
    if (diff >= 0) breakdown.bedrooms = 100
    else if (diff === -1) breakdown.bedrooms = 55
    else breakdown.bedrooms = 15
  } else {
    breakdown.bedrooms = NEUTRAL
  }

  // Features (weight: 10)
  if (criteria.features.length > 0) {
    const propFeatsLower = property.features.map((f) => f.toLowerCase())
    let matched = 0
    for (const wantedFeature of criteria.features) {
      const keywords = FEATURE_KEYWORDS[wantedFeature] || [wantedFeature]
      if (keywords.some((kw) => propFeatsLower.some((pf) => pf.includes(kw)))) {
        matched++
      }
    }
    breakdown.features = Math.round((matched / criteria.features.length) * 100)
  } else {
    breakdown.features = NEUTRAL
  }

  // Energy (weight: 5)
  if (criteria.energyLabel) {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    const wanted = labels.indexOf(criteria.energyLabel)
    const actual = labels.indexOf(property.energyLabel)
    if (actual <= wanted) breakdown.energy = 100
    else if (actual === wanted + 1) breakdown.energy = 60
    else breakdown.energy = 25
  } else {
    breakdown.energy = property.energyLabel === 'A' ? 90 : property.energyLabel === 'B' ? 80 : NEUTRAL
  }

  // Freshness (weight: 5)
  const dom = property.daysOnMarket
  if (dom <= 3) breakdown.freshness = 100
  else if (dom <= 7) breakdown.freshness = 85
  else if (dom <= 14) breakdown.freshness = 65
  else if (dom <= 30) breakdown.freshness = 40
  else breakdown.freshness = 20

  // Weighted average
  const weights = { city: 30, price: 25, type: 15, bedrooms: 10, features: 10, energy: 5, freshness: 5 }
  let totalScore = 0
  let totalWeight = 0
  for (const [dim, weight] of Object.entries(weights)) {
    totalScore += (breakdown[dim] || NEUTRAL) * weight
    totalWeight += weight
  }
  const matchScore = Math.round(totalScore / totalWeight)

  return { matchScore, matchBreakdown: breakdown }
}

// ---- Score all properties, sort by score ----
export function filterAndScore(properties, criteria) {
  const scored = properties.map((p) => {
    const { matchScore, matchBreakdown } = scoreProperty(p, criteria)
    return { ...p, matchScore, matchBreakdown }
  })
  scored.sort((a, b) => b.matchScore - a.matchScore)
  return scored
}

// ---- Smart filter definitions ----
const SMART_FILTER_DEFS = [
  { key: 'garden', label: 'Has garden', test: (p) => p.features.some((f) => /garden|tuin/i.test(f)) },
  { key: 'balcony', label: 'Has balcony', test: (p) => p.features.some((f) => /balcon/i.test(f)) },
  { key: 'parking', label: 'Has parking', test: (p) => p.features.some((f) => /parking|garage|driveway/i.test(f)) },
  { key: 'energy-ab', label: 'Energy A/B', test: (p) => p.energyLabel === 'A' || p.energyLabel === 'B' },
  { key: 'new-listing', label: 'New listing', test: (p) => p.daysOnMarket <= 7 },
  { key: 'large', label: '100+ m\u00B2', test: (p) => p.area >= 100 },
  { key: 'modern', label: 'Built after 2000', test: (p) => p.yearBuilt >= 2000 },
  { key: 'sustainable', label: 'Sustainable', test: (p) => p.features.some((f) => /solar|heat pump|warmtepomp|zonnepanelen/i.test(f)) },
  { key: 'beds-3plus', label: '3+ bedrooms', test: (p) => p.bedrooms >= 3 },
  { key: 'beds-4plus', label: '4+ bedrooms', test: (p) => p.bedrooms >= 4 },
  { key: 'low-competition', label: 'Low overbid', test: (p) => p.overbidPercentage < 3 },
]

// ---- Generate smart filters from result set ----
export function generateSmartFilters(scoredProperties) {
  const total = scoredProperties.length
  if (total === 0) return []

  const filters = []
  for (const def of SMART_FILTER_DEFS) {
    const count = scoredProperties.filter(def.test).length
    if (count > 0 && count < total) {
      filters.push({ key: def.key, label: def.label, count, active: false })
    }
  }

  filters.sort((a, b) => b.count - a.count)
  return filters.slice(0, 8)
}

// ---- Apply active smart filters (AND logic) ----
export function applySmartFilters(scoredProperties, activeFilterKeys) {
  if (!activeFilterKeys || activeFilterKeys.length === 0) return scoredProperties

  return scoredProperties.filter((p) =>
    activeFilterKeys.every((key) => {
      const def = SMART_FILTER_DEFS.find((d) => d.key === key)
      return def ? def.test(p) : true
    })
  )
}

// ---- Determine if we need a clarifying question ----
export function determineClarification(criteria) {
  const hasCity = !!criteria.city
  const hasPrice = !!(criteria.minPrice || criteria.maxPrice)
  const hasType = !!criteria.propertyType
  const hasFeatures = criteria.features && criteria.features.length > 0

  if (hasCity || hasPrice) return null

  if (hasType || hasFeatures) {
    return {
      text: "Great taste! Which area are you looking in? Or I can show you results across the Netherlands.",
      options: ['Amsterdam', 'Utrecht', 'Rotterdam', 'Den Haag', 'Show all cities'],
    }
  }

  return {
    text: "I'd love to help you find your perfect home! What city or area are you interested in?",
    options: ['Amsterdam', 'Utrecht', 'Rotterdam', 'Den Haag', 'Surprise me'],
  }
}

// ---- Sort helpers ----
export function sortProperties(properties, sortBy) {
  const sorted = [...properties]
  switch (sortBy) {
    case 'price-asc':
    case 'price_asc':
      sorted.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
    case 'price_desc':
      sorted.sort((a, b) => b.price - a.price)
      break
    case 'newest':
      sorted.sort((a, b) => a.daysOnMarket - b.daysOnMarket)
      break
    case 'match':
    default:
      sorted.sort((a, b) => b.matchScore - a.matchScore)
      break
  }
  return sorted
}

// ---- Generate match reason text ----
export function generateMatchReason(property, breakdown) {
  const strengths = []
  const weaknesses = []

  if (breakdown.city === 100) strengths.push('location')
  else if (breakdown.city === 0) weaknesses.push('different city')

  if (breakdown.price >= 75) strengths.push('price')
  else if (breakdown.price <= 45) weaknesses.push('over budget')

  if (breakdown.type === 100) strengths.push('property type')
  if (breakdown.bedrooms === 100) strengths.push('bedrooms')
  if (breakdown.features === 100) strengths.push('features')
  else if (breakdown.features > 0 && breakdown.features < 100) strengths.push('some features')

  if (breakdown.energy >= 90) strengths.push('energy efficient')
  if (breakdown.freshness >= 85) strengths.push('newly listed')

  if (strengths.length === 0) return 'Partial match based on available criteria.'

  const strong = strengths.slice(0, 3).join(', ')
  let reason = `Strong on ${strong}.`
  if (weaknesses.length > 0) {
    reason += ` Note: ${weaknesses[0]}.`
  }
  return reason
}
