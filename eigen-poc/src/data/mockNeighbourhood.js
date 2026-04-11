const mockNeighbourhoods = {
  'Jordaan': {
    name: 'Jordaan',
    city: 'Amsterdam',
    avgPrice: 6850,
    avgPriceUnit: '€/m²',
    priceChange12m: 8.2,
    ratings: {
      overall: 8.7,
      safety: 8.5,
      transport: 9.2,
      shops: 8.8,
      schools: 7.5,
      greenSpace: 6.8,
      restaurants: 9.4,
    },
    demographics: { avgAge: 38, families: '22%', singles: '45%', couples: '33%' },
    transport: ['Tram 13, 17', 'Bus 18, 21', 'Metro 52 (10 min walk)'],
    nearby: ['Anne Frank House', 'Westerkerk', 'Noordermarkt', 'Westerpark'],
    overbidHistory: [
      { quarter: 'Q1 2024', percentage: 5.2, count: 34 },
      { quarter: 'Q4 2023', percentage: 4.8, count: 28 },
      { quarter: 'Q3 2023', percentage: 6.1, count: 31 },
      { quarter: 'Q2 2023', percentage: 7.3, count: 39 },
    ],
  },
  'Centrum': {
    name: 'Centrum',
    city: 'Rotterdam',
    avgPrice: 4200,
    avgPriceUnit: '€/m²',
    priceChange12m: 5.4,
    ratings: {
      overall: 8.1,
      safety: 7.8,
      transport: 9.5,
      shops: 9.0,
      schools: 7.0,
      greenSpace: 6.2,
      restaurants: 8.9,
    },
    demographics: { avgAge: 34, families: '18%', singles: '52%', couples: '30%' },
    transport: ['Metro A, B, C, D, E', 'Tram 21, 23, 25', 'Rotterdam Centraal'],
    nearby: ['Markthal', 'Cube Houses', 'Erasmus Bridge', 'Witte de With'],
    overbidHistory: [
      { quarter: 'Q1 2024', percentage: 2.8, count: 22 },
      { quarter: 'Q4 2023', percentage: 3.1, count: 19 },
      { quarter: 'Q3 2023', percentage: 3.5, count: 25 },
      { quarter: 'Q2 2023', percentage: 4.2, count: 30 },
    ],
  },
  'Binnenstad': {
    name: 'Binnenstad',
    city: 'Utrecht',
    avgPrice: 5500,
    avgPriceUnit: '€/m²',
    priceChange12m: 6.8,
    ratings: {
      overall: 8.5,
      safety: 8.2,
      transport: 9.0,
      shops: 8.6,
      schools: 7.8,
      greenSpace: 7.0,
      restaurants: 9.1,
    },
    demographics: { avgAge: 36, families: '20%', singles: '48%', couples: '32%' },
    transport: ['Bus 2, 3, 8, 28', 'Utrecht Centraal (5 min walk)'],
    nearby: ['Dom Tower', 'Oudegracht', 'Centraal Museum', 'Botanical Gardens'],
    overbidHistory: [
      { quarter: 'Q1 2024', percentage: 6.5, count: 18 },
      { quarter: 'Q4 2023', percentage: 5.9, count: 15 },
      { quarter: 'Q3 2023', percentage: 7.2, count: 21 },
      { quarter: 'Q2 2023', percentage: 8.1, count: 26 },
    ],
  },
  'Zuid': {
    name: 'Zuid',
    city: 'Amsterdam',
    avgPrice: 8200,
    avgPriceUnit: '€/m²',
    priceChange12m: 10.1,
    ratings: {
      overall: 9.0,
      safety: 9.1,
      transport: 8.8,
      shops: 8.5,
      schools: 9.0,
      greenSpace: 8.2,
      restaurants: 8.7,
    },
    demographics: { avgAge: 42, families: '35%', singles: '28%', couples: '37%' },
    transport: ['Tram 5, 24', 'Metro 52', 'Bus 62, 65'],
    nearby: ['Vondelpark', 'Rijksmuseum', 'Concertgebouw', 'P.C. Hooftstraat'],
    overbidHistory: [
      { quarter: 'Q1 2024', percentage: 8.8, count: 12 },
      { quarter: 'Q4 2023', percentage: 7.5, count: 10 },
      { quarter: 'Q3 2023', percentage: 9.2, count: 14 },
      { quarter: 'Q2 2023', percentage: 10.5, count: 16 },
    ],
  },
  'Kralingen': {
    name: 'Kralingen',
    city: 'Rotterdam',
    avgPrice: 5100,
    avgPriceUnit: '€/m²',
    priceChange12m: 6.2,
    ratings: {
      overall: 8.4,
      safety: 8.6,
      transport: 7.8,
      shops: 7.5,
      schools: 8.5,
      greenSpace: 9.0,
      restaurants: 7.8,
    },
    demographics: { avgAge: 40, families: '38%', singles: '25%', couples: '37%' },
    transport: ['Tram 24', 'Bus 32, 44', 'Metro D (10 min walk)'],
    nearby: ['Kralingse Plas', 'Kralingse Bos', 'Erasmus University', 'Het Park'],
    overbidHistory: [
      { quarter: 'Q1 2024', percentage: 5.5, count: 9 },
      { quarter: 'Q4 2023', percentage: 4.8, count: 7 },
      { quarter: 'Q3 2023', percentage: 6.0, count: 11 },
      { quarter: 'Q2 2023', percentage: 6.8, count: 13 },
    ],
  },
}

export default mockNeighbourhoods

export function getNeighbourhood(name) {
  return mockNeighbourhoods[name] || null
}

// Get neighbourhood data by city, falling back to a sensible default
export function getNeighbourhoodByCity(city) {
  const entry = Object.values(mockNeighbourhoods).find((n) => n.city === city)
  if (entry) return entry
  // Default neighbourhood data for cities not in the map
  return {
    name: 'Centrum',
    city: city || 'Unknown',
    avgPrice: 4500,
    avgPriceUnit: '€/m²',
    priceChange12m: 5.0,
    overbidHistory: [
      { quarter: 'Q1 2024', percentage: 4.0, count: 20 },
      { quarter: 'Q4 2023', percentage: 3.5, count: 18 },
      { quarter: 'Q3 2023', percentage: 4.5, count: 22 },
      { quarter: 'Q2 2023', percentage: 5.0, count: 25 },
    ],
  }
}
