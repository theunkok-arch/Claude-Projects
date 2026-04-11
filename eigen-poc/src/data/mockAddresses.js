// 86 real Dutch addresses for Kadaster-style autocomplete
// Each enriched with property data and valuation for S1

// City-level price multipliers (€/m²)
const CITY_PRICE = {
  Amsterdam: 7200, Rotterdam: 4400, 'Den Haag': 5000, Utrecht: 5800,
  Haarlem: 5500, Leiden: 5200, Delft: 4800, Eindhoven: 3800,
  Groningen: 3200, Maastricht: 3500, Arnhem: 3600, Nijmegen: 3400,
  Breda: 3300, Tilburg: 3000, Amersfoort: 4600, Almere: 3900,
  Hilversum: 4800, Zaandam: 4000, Zwolle: 3500,
}

const TYPES = ['Bovenwoning', 'Benedenwoning', 'Appartement', 'Tussenwoning', 'Hoekwoning', 'Herenhuis', 'Villa', 'Twee-onder-een-kap']
const LABELS = ['A', 'A', 'B', 'B', 'C', 'C', 'C', 'D', 'D', 'E', 'F']

// Seeded pseudo-random for consistent data
function seeded(seed) {
  let s = seed
  return () => { s = (s * 16807 + 7) % 2147483647; return (s & 0x7fffffff) / 0x7fffffff }
}

function enrichAddress(addr) {
  const r = seeded(addr.id * 137)
  const pricePerM2 = CITY_PRICE[addr.city] || 4000
  const typeIdx = Math.floor(r() * 6) // favor apartments/bovenwoningen
  const type = typeIdx < 2 ? 'Bovenwoning' : typeIdx < 4 ? 'Appartement' : TYPES[Math.floor(r() * TYPES.length)]
  const isLarge = type === 'Villa' || type === 'Herenhuis'
  const m2Living = isLarge ? 140 + Math.floor(r() * 140) : 55 + Math.floor(r() * 65)
  const floors = isLarge ? 2 + Math.floor(r() * 2) : 1 + Math.floor(r() * 2)
  const buildYear = addr.city === 'Almere' ? 1985 + Math.floor(r() * 35) : 1880 + Math.floor(r() * 130)
  const labelIdx = buildYear > 2010 ? Math.floor(r() * 3) : buildYear > 1970 ? 2 + Math.floor(r() * 4) : 5 + Math.floor(r() * 4)
  const energyLabel = LABELS[Math.min(labelIdx, LABELS.length - 1)]
  const wozValue = Math.round(m2Living * pricePerM2 * (0.85 + r() * 0.3))

  // Valuation
  const estimate = Math.round(wozValue * (1.0 + r() * 0.12))
  const confidence = 82 + Math.floor(r() * 13)
  const nearby = [`${addr.street.slice(0, 12)} ${100 + Math.floor(r() * 200)}`, `${addr.street.slice(0, 12)} ${10 + Math.floor(r() * 90)}`, `Nearby street ${Math.floor(r() * 300)}`]
  const priceM2 = CITY_PRICE[addr.city] || 4000

  const valuation = {
    estimate,
    rangeLow: Math.round(estimate * 0.95),
    rangeHigh: Math.round(estimate * 1.05),
    confidence,
    comparables: nearby.map((a, i) => {
      const compM2 = m2Living + Math.floor((r() - 0.5) * 20)
      const compPrice = Math.round(estimate * (0.9 + r() * 0.2))
      const compPricePerM2 = Math.round(compPrice / compM2)
      const distance = Math.round(50 + r() * 450)
      const matchScore = Math.max(65, Math.min(98, Math.round(95 - Math.abs(compM2 - m2Living) * 0.5 - Math.abs(compPrice - estimate) / estimate * 30 - r() * 8)))
      const soldMonth = 1 + Math.floor(r() * 12)
      const soldYear = 2025 + Math.floor(r() * 2)
      return {
        address: a,
        price: compPrice,
        m2: compM2,
        date: `${soldYear}-${String(soldMonth).padStart(2, '0')}`,
        soldDate: `${String(soldMonth).padStart(2, '0')}-${soldYear}`,
        pricePerM2: compPricePerM2,
        distance,
        matchScore,
      }
    }),
    aiInsight: generateInsight(addr, type, m2Living, buildYear, estimate),
  }

  return { ...addr, type, buildYear, m2Living, floors, energyLabel, wozValue, valuation }
}

function generateInsight(addr, type, m2, year, estimate) {
  const insights = [
    `Your ${type.toLowerCase()} on the ${addr.street} benefits from a prime ${addr.city} location. With ${m2}m² of living space in a building dating to ${year}, this property commands strong interest. Recent sales in the area show consistent demand with moderate overbidding.`,
    `Located in one of ${addr.city}'s most desirable streets, your ${m2}m² ${type.toLowerCase()} shows strong value retention. The ${year} build year adds character, and comparable sales within 500m support our estimate. Buyer activity in this postcode is above average.`,
    `The ${addr.street} corridor in ${addr.city} has seen steady appreciation over the past 12 months. Your ${type.toLowerCase()} offers ${m2}m² in a well-connected area, and our AI model identifies a ${Math.floor(2 + Math.random() * 6)}% location premium compared to the city average.`,
  ]
  return insights[addr.id % insights.length]
}

const rawAddresses = [
  // Amsterdam (14)
  { id: 1, street: 'Prinsengracht', number: '263', postcode: '1016 GV', city: 'Amsterdam', lat: 52.3752, lng: 4.8840 },
  { id: 2, street: 'Keizersgracht', number: '174', postcode: '1016 DW', city: 'Amsterdam', lat: 52.3711, lng: 4.8866 },
  { id: 3, street: 'Herengracht', number: '502', postcode: '1017 CB', city: 'Amsterdam', lat: 52.3647, lng: 4.8936 },
  { id: 4, street: 'Singel', number: '36', postcode: '1015 AB', city: 'Amsterdam', lat: 52.3784, lng: 4.8912 },
  { id: 5, street: 'Damrak', number: '1', postcode: '1012 LG', city: 'Amsterdam', lat: 52.3759, lng: 4.8953 },
  { id: 6, street: 'Rokin', number: '92', postcode: '1012 KZ', city: 'Amsterdam', lat: 52.3696, lng: 4.8919 },
  { id: 7, street: 'Overtoom', number: '301', postcode: '1054 HN', city: 'Amsterdam', lat: 52.3620, lng: 4.8650 },
  { id: 8, street: 'Ferdinand Bolstraat', number: '45', postcode: '1072 LA', city: 'Amsterdam', lat: 52.3540, lng: 4.8930 },
  { id: 9, street: 'Ceintuurbaan', number: '158', postcode: '1073 EN', city: 'Amsterdam', lat: 52.3530, lng: 4.8960 },
  { id: 10, street: 'Beethovenstraat', number: '12', postcode: '1077 JH', city: 'Amsterdam', lat: 52.3470, lng: 4.8790 },
  { id: 11, street: 'Museumplein', number: '6', postcode: '1071 DJ', city: 'Amsterdam', lat: 52.3573, lng: 4.8793 },
  { id: 12, street: 'Vondelstraat', number: '77', postcode: '1054 GL', city: 'Amsterdam', lat: 52.3610, lng: 4.8710 },
  { id: 13, street: 'Westerstraat', number: '20', postcode: '1015 MN', city: 'Amsterdam', lat: 52.3820, lng: 4.8810 },
  { id: 14, street: 'Haarlemmerdijk', number: '134', postcode: '1013 JJ', city: 'Amsterdam', lat: 52.3830, lng: 4.8830 },
  // Rotterdam (10)
  { id: 15, street: 'Coolsingel', number: '42', postcode: '3011 AD', city: 'Rotterdam', lat: 51.9225, lng: 4.4792 },
  { id: 16, street: 'Witte de Withstraat', number: '78', postcode: '3012 BR', city: 'Rotterdam', lat: 51.9165, lng: 4.4750 },
  { id: 17, street: 'Meent', number: '100', postcode: '3011 JR', city: 'Rotterdam', lat: 51.9210, lng: 4.4830 },
  { id: 18, street: 'Lijnbaan', number: '56', postcode: '3012 EL', city: 'Rotterdam', lat: 51.9208, lng: 4.4765 },
  { id: 19, street: 'Nieuwe Binnenweg', number: '225', postcode: '3021 GK', city: 'Rotterdam', lat: 51.9150, lng: 4.4600 },
  { id: 20, street: 'Kralingse Plaslaan', number: '18', postcode: '3061 DA', city: 'Rotterdam', lat: 51.9280, lng: 4.5090 },
  { id: 21, street: 'Mathenesserlaan', number: '300', postcode: '3021 HV', city: 'Rotterdam', lat: 51.9165, lng: 4.4570 },
  { id: 22, street: 'Schiedamsesingel', number: '52', postcode: '3012 BA', city: 'Rotterdam', lat: 51.9180, lng: 4.4730 },
  { id: 23, street: 'Boompjes', number: '40', postcode: '3011 XB', city: 'Rotterdam', lat: 51.9200, lng: 4.4900 },
  { id: 24, street: 'Wilhelminakade', number: '137', postcode: '3072 AP', city: 'Rotterdam', lat: 51.9050, lng: 4.4890 },
  // Den Haag (8)
  { id: 25, street: 'Lange Voorhout', number: '8', postcode: '2514 ED', city: 'Den Haag', lat: 52.0836, lng: 4.3137 },
  { id: 26, street: 'Noordeinde', number: '64', postcode: '2514 GL', city: 'Den Haag', lat: 52.0840, lng: 4.3100 },
  { id: 27, street: 'Denneweg', number: '12', postcode: '2514 CG', city: 'Den Haag', lat: 52.0825, lng: 4.3115 },
  { id: 28, street: 'Frederikstraat', number: '88', postcode: '2514 LK', city: 'Den Haag', lat: 52.0850, lng: 4.3060 },
  { id: 29, street: 'Laan van Meerdervoort', number: '520', postcode: '2563 AV', city: 'Den Haag', lat: 52.0690, lng: 4.2870 },
  { id: 30, street: 'Statenlaan', number: '24', postcode: '2582 GM', city: 'Den Haag', lat: 52.0900, lng: 4.2890 },
  { id: 31, street: 'Van Stolkweg', number: '10', postcode: '2585 JL', city: 'Den Haag', lat: 52.0960, lng: 4.2860 },
  { id: 32, street: 'Scheveningseweg', number: '52', postcode: '2584 AD', city: 'Den Haag', lat: 52.0950, lng: 4.2900 },
  // Utrecht (8)
  { id: 33, street: 'Oudegracht', number: '130', postcode: '3511 AW', city: 'Utrecht', lat: 52.0907, lng: 5.1180 },
  { id: 34, street: 'Twijnstraat', number: '14', postcode: '3511 ZL', city: 'Utrecht', lat: 52.0860, lng: 5.1230 },
  { id: 35, street: 'Voorstraat', number: '78', postcode: '3512 AT', city: 'Utrecht', lat: 52.0930, lng: 5.1200 },
  { id: 36, street: 'Nachtegaalstraat', number: '32', postcode: '3581 AD', city: 'Utrecht', lat: 52.0830, lng: 5.1130 },
  { id: 37, street: 'Maliebaan', number: '45', postcode: '3581 CD', city: 'Utrecht', lat: 52.0880, lng: 5.1310 },
  { id: 38, street: 'Wittevrouwenstraat', number: '11', postcode: '3512 CS', city: 'Utrecht', lat: 52.0940, lng: 5.1250 },
  { id: 39, street: 'Biltstraat', number: '200', postcode: '3572 BL', city: 'Utrecht', lat: 52.0920, lng: 5.1400 },
  { id: 40, street: 'Catharijnesingel', number: '56', postcode: '3511 GE', city: 'Utrecht', lat: 52.0890, lng: 5.1100 },
  // Haarlem (5)
  { id: 41, street: 'Grote Markt', number: '2', postcode: '2011 RD', city: 'Haarlem', lat: 52.3814, lng: 4.6360 },
  { id: 42, street: 'Barteljorisstraat', number: '18', postcode: '2012 JC', city: 'Haarlem', lat: 52.3800, lng: 4.6370 },
  { id: 43, street: 'Kruisstraat', number: '50', postcode: '2011 LC', city: 'Haarlem', lat: 52.3810, lng: 4.6330 },
  { id: 44, street: 'Wagenweg', number: '88', postcode: '2012 NE', city: 'Haarlem', lat: 52.3770, lng: 4.6340 },
  { id: 45, street: 'Zijlweg', number: '125', postcode: '2013 DK', city: 'Haarlem', lat: 52.3850, lng: 4.6250 },
  // Leiden (5)
  { id: 46, street: 'Breestraat', number: '83', postcode: '2311 CJ', city: 'Leiden', lat: 52.1585, lng: 4.4890 },
  { id: 47, street: 'Rapenburg', number: '70', postcode: '2311 EZ', city: 'Leiden', lat: 52.1575, lng: 4.4870 },
  { id: 48, street: 'Haarlemmerstraat', number: '116', postcode: '2312 GA', city: 'Leiden', lat: 52.1610, lng: 4.4850 },
  { id: 49, street: 'Hooigracht', number: '44', postcode: '2312 KW', city: 'Leiden', lat: 52.1560, lng: 4.4910 },
  { id: 50, street: 'Rijnsburgerweg', number: '22', postcode: '2334 BA', city: 'Leiden', lat: 52.1600, lng: 4.4720 },
  // Delft (4)
  { id: 51, street: 'Markt', number: '85', postcode: '2611 GS', city: 'Delft', lat: 52.0116, lng: 4.3571 },
  { id: 52, street: 'Oude Delft', number: '146', postcode: '2611 BG', city: 'Delft', lat: 52.0090, lng: 4.3570 },
  { id: 53, street: 'Voldersgracht', number: '21', postcode: '2611 EV', city: 'Delft', lat: 52.0120, lng: 4.3560 },
  { id: 54, street: 'Phoenixstraat', number: '38', postcode: '2611 AL', city: 'Delft', lat: 52.0095, lng: 4.3580 },
  // Eindhoven (5)
  { id: 55, street: 'Stratumseind', number: '20', postcode: '5611 ET', city: 'Eindhoven', lat: 51.4370, lng: 5.4810 },
  { id: 56, street: 'Vestdijk', number: '115', postcode: '5611 CB', city: 'Eindhoven', lat: 51.4350, lng: 5.4780 },
  { id: 57, street: 'Keizersgracht', number: '8', postcode: '5611 GD', city: 'Eindhoven', lat: 51.4380, lng: 5.4790 },
  { id: 58, street: 'Dommelstraat', number: '2', postcode: '5611 CK', city: 'Eindhoven', lat: 51.4360, lng: 5.4800 },
  { id: 59, street: 'Strijpsestraat', number: '150', postcode: '5616 GS', city: 'Eindhoven', lat: 51.4440, lng: 5.4610 },
  // Groningen (4)
  { id: 60, street: 'Grote Markt', number: '1', postcode: '9711 LV', city: 'Groningen', lat: 53.2194, lng: 6.5665 },
  { id: 61, street: 'Herestraat', number: '48', postcode: '9711 LM', city: 'Groningen', lat: 53.2170, lng: 6.5680 },
  { id: 62, street: 'Folkingestraat', number: '22', postcode: '9711 JW', city: 'Groningen', lat: 53.2160, lng: 6.5710 },
  { id: 63, street: 'Oosterstraat', number: '36', postcode: '9711 NR', city: 'Groningen', lat: 53.2180, lng: 6.5720 },
  // Maastricht (4)
  { id: 64, street: 'Vrijthof', number: '15', postcode: '6211 LD', city: 'Maastricht', lat: 50.8496, lng: 5.6888 },
  { id: 65, street: 'Stokstraat', number: '7', postcode: '6211 GA', city: 'Maastricht', lat: 50.8480, lng: 5.6890 },
  { id: 66, street: 'Rechtstraat', number: '52', postcode: '6221 EJ', city: 'Maastricht', lat: 50.8440, lng: 5.6920 },
  { id: 67, street: 'Wycker Brugstraat', number: '30', postcode: '6221 EC', city: 'Maastricht', lat: 50.8470, lng: 5.6930 },
  // Arnhem (3)
  { id: 68, street: 'Korenmarkt', number: '3', postcode: '6811 GV', city: 'Arnhem', lat: 51.9837, lng: 5.9108 },
  { id: 69, street: 'Bakkerstraat', number: '44', postcode: '6811 EG', city: 'Arnhem', lat: 51.9830, lng: 5.9120 },
  { id: 70, street: 'Sonsbeekweg', number: '85', postcode: '6814 BC', city: 'Arnhem', lat: 51.9870, lng: 5.9020 },
  // Nijmegen (2)
  { id: 71, street: 'Lange Hezelstraat', number: '14', postcode: '6511 CE', city: 'Nijmegen', lat: 51.8460, lng: 5.8610 },
  { id: 72, street: 'Molenstraat', number: '36', postcode: '6511 HD', city: 'Nijmegen', lat: 51.8445, lng: 5.8620 },
  // Breda (2)
  { id: 73, street: 'Ginnekenweg', number: '210', postcode: '4835 NH', city: 'Breda', lat: 51.5780, lng: 4.7850 },
  { id: 74, street: 'Haven', number: '8', postcode: '4811 WK', city: 'Breda', lat: 51.5880, lng: 4.7760 },
  // Tilburg (2)
  { id: 75, street: 'Heuvelstraat', number: '100', postcode: '5038 AA', city: 'Tilburg', lat: 51.5574, lng: 5.0840 },
  { id: 76, street: 'Korte Heuvel', number: '22', postcode: '5038 AG', city: 'Tilburg', lat: 51.5580, lng: 5.0850 },
  // Amersfoort (2)
  { id: 77, street: 'Langestraat', number: '56', postcode: '3811 NJ', city: 'Amersfoort', lat: 52.1556, lng: 5.3878 },
  { id: 78, street: 'Utrechtseweg', number: '130', postcode: '3818 EP', city: 'Amersfoort', lat: 52.1490, lng: 5.3830 },
  // Almere (2)
  { id: 79, street: 'Stadshuisplein', number: '1', postcode: '1315 HR', city: 'Almere', lat: 52.3750, lng: 5.2170 },
  { id: 80, street: 'Filmwijk Boulevard', number: '24', postcode: '1325 AA', city: 'Almere', lat: 52.3680, lng: 5.2080 },
  // Hilversum (2)
  { id: 81, street: 'Kerkstraat', number: '75', postcode: '1211 CL', city: 'Hilversum', lat: 52.2240, lng: 5.1760 },
  { id: 82, street: 'Groest', number: '22', postcode: '1211 EA', city: 'Hilversum', lat: 52.2230, lng: 5.1780 },
  // Zaandam (2)
  { id: 83, street: 'Gedempte Gracht', number: '54', postcode: '1506 CJ', city: 'Zaandam', lat: 52.4380, lng: 4.8260 },
  { id: 84, street: 'Westzijde', number: '118', postcode: '1506 GJ', city: 'Zaandam', lat: 52.4420, lng: 4.8230 },
  // Zwolle (2)
  { id: 85, street: 'Diezerstraat', number: '40', postcode: '8011 RE', city: 'Zwolle', lat: 52.5115, lng: 6.0940 },
  { id: 86, street: 'Sassenstraat', number: '18', postcode: '8011 PB', city: 'Zwolle', lat: 52.5120, lng: 6.0960 },
]

// Enrich all addresses with property + valuation data
const mockAddresses = rawAddresses.map(enrichAddress)

export default mockAddresses

export function searchAddresses(query) {
  if (!query || query.length < 3) return []
  const q = query.toLowerCase()
  return mockAddresses
    .filter(
      (a) =>
        a.street.toLowerCase().includes(q) ||
        a.postcode.toLowerCase().replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        a.city.toLowerCase().includes(q) ||
        `${a.street} ${a.number}`.toLowerCase().includes(q)
    )
    .slice(0, 8)
}

export function formatAddress(addr) {
  return `${addr.street} ${addr.number}, ${addr.postcode} ${addr.city}`
}
