// Vertaaltabellen voor de import. Sleutels zijn genormaliseerd: lowercase,
// zonder accenten, zonder dubbele spaties.
//
// De kolomnamen en waarden hieronder zijn afgeleid van de twee master-sheets
// (090826_kandidaten_shortlist_compleet en
// Royal_Sanders_RA_Officer_kandidatenlijst_samengevoegd), niet verzonnen.

/**
 * Oude status → nieuwe stage. Beide sheets gebruiken grotendeels de nieuwe
 * woordenschat al; de oude termen uit paragraaf 10 staan er voor de lijsten
 * die nog niet zijn bijgewerkt.
 * @type {Record<string, { stage: string, reden?: string }>}
 */
export const STATUS_MAP = {
  // Nieuwe woordenschat — mapt op zichzelf. Zonder deze regels zou een sheet
  // die al is bijgewerkt terugvallen op Gescoord.
  gescoord: { stage: 'Gescoord' },
  benaderd: { stage: 'Benaderd' },
  opgevolgd: { stage: 'Opgevolgd' },
  gereageerd: { stage: 'Gereageerd' },
  gesproken: { stage: 'Gesproken' },
  shortlist: { stage: 'Shortlist' },
  voorgesteld: { stage: 'Voorgesteld' },
  'interview klant': { stage: 'Interview klant' },
  aanbod: { stage: 'Aanbod' },
  geplaatst: { stage: 'Geplaatst' },
  ingewerkt: { stage: 'Ingewerkt' },
  afgevallen: { stage: 'Afgevallen' },

  // Oude woordenschat, paragraaf 10.
  lead: { stage: 'Gescoord' },
  longlist: { stage: 'Gescoord' },
  'te verifieren': { stage: 'Gescoord' },
  nieuw: { stage: 'Gescoord' },

  'te benaderen': { stage: 'Gescoord' },
  'nog niet benaderd': { stage: 'Gescoord' },

  'te contacten': { stage: 'Shortlist' },
  warm: { stage: 'Shortlist' },
  twijfel: { stage: 'Shortlist' },
  'wacht op akkoord': { stage: 'Shortlist' },

  inmail: { stage: 'Benaderd' },
  'bericht gestuurd': { stage: 'Benaderd' },
  instagram: { stage: 'Benaderd' },
  linkedin: { stage: 'Benaderd' },
  connectie: { stage: 'Benaderd' },

  'reminder sturen': { stage: 'Opgevolgd' },
  reminder: { stage: 'Opgevolgd' },

  reageert: { stage: 'Gereageerd' },

  gesprek: { stage: 'Gesproken' },
  'gesprek/wachten': { stage: 'Gesproken' },
  'gesprek wachten': { stage: 'Gesproken' },
  teamsgesprek: { stage: 'Gesproken' },
  belafspraak: { stage: 'Gesproken' },

  voorstellen: { stage: 'Voorgesteld' },

  afgewezen: { stage: 'Afgevallen', reden: 'Afgewezen door ons (profielcheck)' },
  'te vroeg': { stage: 'Afgevallen', reden: 'Timing' },
}

/**
 * "In gesprek" is de enige status die niet automatisch te vertalen is: hij
 * dekt zowel iemand die alleen heeft geantwoord (Gereageerd) als iemand die je
 * echt hebt gesproken (Gesproken). Dat onderscheid is precies wat het
 * conversiecijfer bruikbaar maakt, dus raadt het script er niet naar.
 */
export const ONBESLIST = 'in gesprek'

export function normaliseer(waarde) {
  return String(waarde ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Vertaalt een oude status naar de nieuwe pipeline.
 * Geeft `{ onbeslist: true }` bij In gesprek en null bij een onbekende status.
 */
export function vertaalStatus(oud) {
  const sleutel = normaliseer(oud)
  if (!sleutel) return null
  if (sleutel === ONBESLIST) return { onbeslist: true }
  if (STATUS_MAP[sleutel]) return STATUS_MAP[sleutel]

  // Sheets bevatten varianten als "inmail 2" of "gesprek gepland".
  const treffer = Object.keys(STATUS_MAP).find((kandidaat) => sleutel.startsWith(`${kandidaat} `))
  return treffer ? STATUS_MAP[treffer] : null
}

/**
 * De sheets hebben al een kolom Reden afvallen met vrijwel de juiste waarden,
 * maar sommige dragen een toelichting tussen haakjes:
 * "Timing (net nieuwe baan, niet op zoek)" → "Timing".
 */
export function vertaalReden(ruw, geldigeRedenen) {
  const tekst = String(ruw ?? '').trim()
  if (!tekst) return null

  const exact = geldigeRedenen.find((reden) => normaliseer(reden) === normaliseer(tekst))
  if (exact) return exact

  const zonderHaakjes = tekst.replace(/\s*\(.*$/, '').trim()
  const kort = geldigeRedenen.find((reden) => normaliseer(reden) === normaliseer(zonderHaakjes))
  return kort ?? null
}

/**
 * De bronkolom is vrije tekst — 44 varianten in de RA-lijst alleen al. Deze
 * regels vouwen dat terug op de keuzelijst in Airtable. Volgorde telt:
 * salesnav vóór linkedin, brancheorganisatie vóór linkedin.
 */
const BRON_REGELS = [
  [/salesnav|sales navigator|sales nav/, 'LinkedIn Sales Navigator'],
  [/alumni/, 'Alumni-netwerk'],
  [/\bncv\b|branchevereniging|brancheorganisatie/, 'Brancheorganisatie'],
  [/instagram/, 'Instagram'],
  [/referral|doorverwijz|aanbevol/, 'Referral'],
  [/eigen search|eigen netwerk|dominique/, 'Eigen netwerk'],
  [/website|inbound|contactformulier/, 'Website inbound'],
  [/linkedin/, 'LinkedIn regulier'],
]

export function vertaalBron(ruw) {
  const tekst = normaliseer(ruw)
  if (!tekst) return null
  for (const [patroon, bron] of BRON_REGELS) {
    if (patroon.test(tekst)) return bron
  }
  return 'Overig'
}

/**
 * Kolomkoppen zoals ze werkelijk in de sheets staan, plus de varianten uit de
 * oudere batchlijsten.
 */
export const KOLOM_SYNONIEMEN = {
  Naam: ['naam', 'kandidaat', 'volledige naam', 'name', 'full name'],
  'LinkedIn-URL': ['bron-url', 'linkedin', 'linkedin url', 'linkedin-url', 'profiel', 'profile url', 'url'],
  'E-mail': ['e-mail', 'email', 'mail', 'e-mailadres'],
  Telefoon: ['telefoon', 'telefoonnummer', 'tel', 'mobiel', 'phone'],
  Instagram: ['instagram', 'insta', 'ig', 'instagram/facebook account', 'instagram account'],
  Woonplaats: ['locatie + reisafstand', 'woonplaats', 'plaats', 'stad', 'locatie', 'location', 'city'],
  'Huidige rol': ['huidige rol', 'functie', 'titel', 'rol', 'huidige functie', 'title'],
  'Huidige werkgever': ['werkgever', 'huidige werkgever', 'bedrijf', 'company', 'organisatie'],
  Opleiding: ['opleiding', 'studie', 'education'],
  Talen: ['talen', 'taal', 'languages'],
  Bron: ['bron', 'source', 'kanaal'],
  __status: ['status', 'stage', 'fase', 'voortgang'],
  __reden: ['reden afvallen', 'reden', 'afvalreden', 'reden van afvallen'],
  __score: ['totaal (100)', 'totaal', 'score', 'totaalscore', 'score totaal', 'score (totaal)', 'match'],
  __onderbouwing: ['onderbouwing', 'score-onderbouwing', 'toelichting', 'motivatie'],
  __opmerkingen: ['opmerkingen', 'notities', 'notes', 'commentaar'],
  __signaal: ['signaal/observatie', 'signaal', 'observatie'],
  __reistijd: ['reistijd', 'reisafstand', 'reistijd minuten'],
  __concurrent: ['concurrent', 'concurrentie'],
  __outreach: ['outreach-concept', 'outreach', 'inmail concept', 'bericht'],
  __datum: ['datum', 'laatste contact', 'laatst benaderd', 'datum benaderd', 'contactdatum'],
}

/**
 * Een URL is alleen een dedupe-sleutel als hij een persoon aanwijst.
 * "https://www.linkedin.com/sales/" zonder lead-id doet dat niet, en zou
 * meerdere kandidaten tot één record samenvouwen.
 */
export function isIdentificerendeUrl(url) {
  const tekst = normaliseer(url)
  if (!tekst.includes('linkedin.com')) return tekst.length > 0 && tekst.includes('://')
  return /linkedin\.com\/(in\/[^/\s]+|sales\/lead\/[^/\s?]+)/.test(tekst)
}
