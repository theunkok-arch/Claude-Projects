// Vertaaltabel uit paragraaf 10 van de bouwspecificatie. Sleutels zijn
// genormaliseerd: lowercase, zonder accenten, zonder dubbele spaties.

/** @type {Record<string, { stage: string, reden?: string }>} */
export const STATUS_MAP = {
  // → Gescoord
  lead: { stage: 'Gescoord' },
  gescoord: { stage: 'Gescoord' },
  longlist: { stage: 'Gescoord' },
  'te verifieren': { stage: 'Gescoord' },
  nieuw: { stage: 'Gescoord' },

  // → Shortlist
  shortlist: { stage: 'Shortlist' },
  'te contacten': { stage: 'Shortlist' },
  warm: { stage: 'Shortlist' },
  twijfel: { stage: 'Shortlist' },
  'wacht op akkoord': { stage: 'Shortlist' },

  // → Benaderd
  inmail: { stage: 'Benaderd' },
  benaderd: { stage: 'Benaderd' },
  'bericht gestuurd': { stage: 'Benaderd' },
  instagram: { stage: 'Benaderd' },
  linkedin: { stage: 'Benaderd' },
  connectie: { stage: 'Benaderd' },

  // → Opgevolgd
  'reminder sturen': { stage: 'Opgevolgd' },
  reminder: { stage: 'Opgevolgd' },

  // → Gereageerd
  reageert: { stage: 'Gereageerd' },

  // → Gesproken
  gesprek: { stage: 'Gesproken' },
  'gesprek/wachten': { stage: 'Gesproken' },
  'gesprek wachten': { stage: 'Gesproken' },
  teamsgesprek: { stage: 'Gesproken' },
  belafspraak: { stage: 'Gesproken' },

  // → Voorgesteld
  voorstellen: { stage: 'Voorgesteld' },
  voorgesteld: { stage: 'Voorgesteld' },

  // → Afgevallen
  afgewezen: { stage: 'Afgevallen', reden: 'Afgewezen door ons (profielcheck)' },
  'te vroeg': { stage: 'Afgevallen', reden: 'Timing' },
}

export function normaliseer(waarde) {
  return String(waarde ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Vertaalt een oude status naar de nieuwe pipeline. Null als de status onbekend is. */
export function vertaalStatus(oud) {
  const sleutel = normaliseer(oud)
  if (!sleutel) return null
  if (STATUS_MAP[sleutel]) return STATUS_MAP[sleutel]

  // Sheets bevatten varianten als "inmail 2" of "gesprek gepland".
  const treffer = Object.keys(STATUS_MAP).find(
    (kandidaat) => sleutel.startsWith(`${kandidaat} `) || sleutel === kandidaat,
  )
  return treffer ? STATUS_MAP[treffer] : null
}

/** Kolomnamen zoals ze in de acht RA-lijsten en de Brand Manager-lijst voorkomen. */
export const KOLOM_SYNONIEMEN = {
  Naam: ['naam', 'kandidaat', 'volledige naam', 'name', 'full name'],
  'LinkedIn-URL': ['linkedin', 'linkedin url', 'linkedin-url', 'profiel', 'profile url', 'url'],
  'E-mail': ['e-mail', 'email', 'mail', 'e-mailadres'],
  Telefoon: ['telefoon', 'telefoonnummer', 'tel', 'mobiel', 'phone'],
  Instagram: ['instagram', 'insta', 'ig'],
  Woonplaats: ['woonplaats', 'plaats', 'stad', 'locatie', 'location', 'city'],
  'Huidige rol': ['huidige rol', 'functie', 'titel', 'rol', 'huidige functie', 'title'],
  'Huidige werkgever': ['huidige werkgever', 'werkgever', 'bedrijf', 'company', 'organisatie'],
  Opleiding: ['opleiding', 'studie', 'education'],
  Talen: ['talen', 'taal', 'languages'],
  Bron: ['bron', 'source', 'kanaal'],
  __status: ['status', 'stage', 'fase', 'actie', 'voortgang'],
  __score: ['score', 'totaalscore', 'score totaal', 'match'],
  __onderbouwing: ['onderbouwing', 'score-onderbouwing', 'toelichting', 'motivatie', 'opmerking scoring'],
  __opmerkingen: ['opmerkingen', 'notities', 'notes', 'commentaar'],
  __reistijd: ['reistijd', 'reisafstand', 'reistijd minuten'],
  __concurrent: ['concurrent', 'concurrentie'],
  __outreach: ['outreach', 'outreach-concept', 'inmail concept', 'bericht'],
  __datum: ['datum', 'laatste contact', 'laatst benaderd', 'datum benaderd'],
}
