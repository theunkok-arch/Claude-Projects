// Vertaaltabellen voor de import. Sleutels zijn genormaliseerd: lowercase,
// zonder accenten, zonder dubbele spaties.
//
// De vertaling zelf komt uit config/ats-mapping.json, hetzelfde bestand dat
// /api/outreach leest. Wat hier in code staat zijn alleen de schrijfwijzen uit
// de echte sheets die dat bestand niet kent, plus de kolomsynoniemen: die
// gaan over rommelige koppen in een xlsx en staan niet in de mapping.
//
// De kolomnamen hieronder zijn afgeleid van de twee master-sheets
// (090826_kandidaten_shortlist_compleet en
// Royal_Sanders_RA_Officer_kandidatenlijst_samengevoegd), niet verzonnen.

import {
  BRON_DEFAULT,
  BRON_PATRONEN,
  IMPORT_STAGES,
  NIET_IMPORTEREN,
} from '../../shared/mapping.mjs'

/**
 * Oude status → nieuwe stage.
 *
 * De basis komt uit config/ats-mapping.json (`stage_mapping`), want dat is de
 * enige plek waar die vertaling hoort te staan en het eindpunt leest hem ook.
 * Wat hieronder in AANVULLENDE_ALIASSEN staat, kent dat bestand niet: dat zijn
 * schrijfwijzen die in de echte sheets voorkomen ("inmail 2", "gesprek/wachten",
 * "reminder sturen") en die het framework nooit zelf produceert. Ze vullen aan,
 * ze overschrijven nooit: bij een botsing wint het bestand.
 *
 * De belangrijkste regel die daarmee verandert: xlsx-Status "Shortlist" landt
 * op Gescoord en niet op Shortlist. In de xlsx betekent Shortlist "hoog
 * gescoord, nog te benaderen", in de ATS "gesproken en geschikt" — vier treden
 * verderop. Deze code zette hem tot nu toe op Shortlist.
 *
 * @type {Record<string, { stage: string, reden?: string }>}
 */
const AANVULLENDE_ALIASSEN = {
  // Oude woordenschat, paragraaf 10.
  lead: { stage: 'Gescoord' },
  longlist: { stage: 'Gescoord' },
  'te verifieren': { stage: 'Gescoord' },
  'te benaderen': { stage: 'Gescoord' },
  'nog niet benaderd': { stage: 'Gescoord' },
  'te contacten': { stage: 'Gescoord' },
  warm: { stage: 'Gescoord' },

  inmail: { stage: 'Benaderd' },
  'bericht gestuurd': { stage: 'Benaderd' },
  instagram: { stage: 'Benaderd' },
  linkedin: { stage: 'Benaderd' },
  connectie: { stage: 'Benaderd' },

  opgevolgd: { stage: 'Opgevolgd' },
  'reminder sturen': { stage: 'Opgevolgd' },
  reminder: { stage: 'Opgevolgd' },

  gereageerd: { stage: 'Gereageerd' },
  reageert: { stage: 'Gereageerd' },

  gesproken: { stage: 'Gesproken' },
  'gesprek/wachten': { stage: 'Gesproken' },
  'gesprek wachten': { stage: 'Gesproken' },
  teamsgesprek: { stage: 'Gesproken' },
  belafspraak: { stage: 'Gesproken' },

  voorstellen: { stage: 'Voorgesteld' },
  'interview klant': { stage: 'Interview klant' },
  aanbod: { stage: 'Aanbod' },
  geplaatst: { stage: 'Geplaatst' },
  ingewerkt: { stage: 'Ingewerkt' },

  afgevallen: { stage: 'Afgevallen' },
  afgewezen: { stage: 'Afgevallen', reden: 'Afgewezen door ons (profielcheck)' },
  'te vroeg': { stage: 'Afgevallen', reden: 'Timing' },
}

export const STATUS_MAP = {
  ...AANVULLENDE_ALIASSEN,
  // Het bestand als laatste, zodat het wint waar het iets zegt.
  ...Object.fromEntries(
    Object.entries(IMPORT_STAGES).map(([status, stage]) => [
      normaliseer(status),
      stage === 'Afgevallen'
        ? { stage, reden: 'Afgewezen door ons (profielcheck)' }
        : { stage },
    ]),
  ),
}

/** xlsx-statussen die het bestand niet vanzelf mee wil nemen in een import. */
export const NIET_VANZELF_IMPORTEREN = new Set(NIET_IMPORTEREN.map(normaliseer))


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
 * De bronkolom is vrije tekst — 44 varianten in de RA-lijst alleen al. De
 * patronen komen uit config/ats-mapping.json en worden op volgorde als
 * substring gelegd; de eerste treffer wint. Volgorde telt: salesnav vóór
 * linkedin, branche vóór linkedin.
 *
 * Substrings en geen reguliere expressies, want dit bestand wordt ook door
 * Python gelezen en een regex die daar net anders werkt is precies het
 * verschil dat één gedeeld bestand moet uitsluiten.
 */

export function vertaalBron(ruw) {
  const tekst = normaliseer(ruw)
  if (!tekst) return null
  for (const { bevat, ats } of BRON_PATRONEN) {
    if (tekst.includes(normaliseer(bevat))) return ats
  }
  return BRON_DEFAULT
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
const ZOEK_URL = /[?&](q|query|keywords|search)=|\/search(\b|\/)/

export function isIdentificerendeUrl(url) {
  const tekst = normaliseer(url)
  if (!tekst.includes('linkedin.com')) {
    if (!tekst.includes('://')) return false
    // Een zoekresultaten-URL wijst een verzameling aan, geen persoon. Dezelfde
    // reden als hierboven, maar buiten LinkedIn stond die deur nog open: de
    // Account Assistant Sales-lijst zet bij tien indeed-cv-rijen exact dezelfde
    // zoekopdracht in de URL-kolom ("resumes.indeed.com/search?q=..."), en die
    // tien vielen daarmee tot één kandidaat samen. Negen mensen weg, zonder
    // melding, want een rij die er niet meer is ziet er niet uit als een fout.
    return !ZOEK_URL.test(tekst)
  }
  return /linkedin\.com\/(in\/[^/\s]+|sales\/lead\/[^/\s?]+)/.test(tekst)
}
