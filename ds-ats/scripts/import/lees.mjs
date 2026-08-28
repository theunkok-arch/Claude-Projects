// Het lees- en vertaalgedeelte van de import, zonder netwerk. Alles hier is
// puur, zodat je het kunt draaien en nakijken zonder Airtable-credentials.

import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { ALLE_AFVAL_REDENEN, STAGE_IDS } from '../../shared/stages.mjs'
import {
  KOLOM_SYNONIEMEN,
  isIdentificerendeUrl,
  normaliseer,
  vertaalBron,
  vertaalReden,
  vertaalStatus,
} from './status-map.mjs'

/** Leest xlsx of csv en geeft een array objecten met de kolomkoppen als sleutel. */
export async function leesRijen(pad, tabnaam) {
  if (extname(pad).toLowerCase() === '.csv') return leesCsv(readFileSync(pad, 'utf8'))

  const { read, utils } = await import('xlsx')
  const werkboek = read(readFileSync(pad), { cellDates: true })
  const blad = tabnaam ?? werkboek.SheetNames[0]
  if (!werkboek.Sheets[blad]) {
    throw new Error(`Tab "${blad}" bestaat niet. Beschikbaar: ${werkboek.SheetNames.join(', ')}`)
  }
  const matrix = utils.sheet_to_json(werkboek.Sheets[blad], { header: 1, defval: '', raw: false })
  return naarObjecten(matrix)
}

export function leesCsv(tekst) {
  const zonderBom = tekst.replace(/^\uFEFF/, '')
  const scheider = kiesScheider(zonderBom)
  return naarObjecten(splitsCsv(zonderBom, scheider))
}

/**
 * Volledige CSV-parser (RFC 4180). Scant teken voor teken in plaats van eerst
 * op regels te splitsen: de score-onderbouwingen in de kandidatenlijsten
 * bevatten regelafbrekingen binnen aanhalingstekens, en een regel-splitsing
 * maakt van één kandidaat er dan stilzwijgend meerdere.
 */
export function splitsCsv(tekst, scheider) {
  const rijen = []
  let rij = []
  let cel = ''
  let inAanhaling = false

  for (let i = 0; i < tekst.length; i++) {
    const teken = tekst[i]

    if (inAanhaling) {
      if (teken === '"') {
        if (tekst[i + 1] === '"') {
          cel += '"'
          i++
        } else inAanhaling = false
      } else cel += teken
      continue
    }

    if (teken === '"') {
      inAanhaling = true
    } else if (teken === scheider) {
      rij.push(cel.trim())
      cel = ''
    } else if (teken === '\r') {
      // \r\n telt als één regeleinde; een losse \r ook.
      if (tekst[i + 1] === '\n') i++
      rij.push(cel.trim())
      rijen.push(rij)
      rij = []
      cel = ''
    } else if (teken === '\n') {
      rij.push(cel.trim())
      rijen.push(rij)
      rij = []
      cel = ''
    } else {
      cel += teken
    }
  }

  if (cel.length > 0 || rij.length > 0) {
    rij.push(cel.trim())
    rijen.push(rij)
  }

  return rijen.filter((r) => r.some((c) => c.length > 0))
}

/**
 * Bepaalt het scheidingsteken op de kopregel, niet op de eerste regel: de
 * titelregel erboven bevat vaak zelf komma's of puntkomma's.
 */
function kiesScheider(tekst) {
  const eersteRegels = tekst.split(/\r?\n/).slice(0, 20)
  const kop = eersteRegels.find((regel) => /(^|[,;\t])naam([,;\t]|$)/i.test(regel)) ?? eersteRegels[0] ?? ''
  const kandidaten = [',', ';', '\t']
  return kandidaten.reduce((beste, teken) => (tel(kop, teken) > tel(kop, beste) ? teken : beste), ',')
}

const tel = (tekst, teken) => tekst.split(teken).length - 1

/**
 * De kopregel staat niet altijd bovenaan. Beide master-sheets beginnen met een
 * titelregel en een toelichting op de scoring; pas daaronder staan de kolomnamen.
 * Zoek dus de eerste rij die een naamkolom bevat in plaats van rij 1 aan te nemen.
 */
function naarObjecten(matrix) {
  if (matrix.length === 0) return []

  const isKop = (rij) =>
    rij.some((cel) => KOLOM_SYNONIEMEN.Naam.includes(normaliseer(cel))) &&
    rij.filter((cel) => String(cel ?? '').trim().length > 0).length >= 3

  const kopIndex = matrix.findIndex(isKop)
  if (kopIndex === -1) {
    throw new Error(
      'Geen kopregel gevonden: geen enkele rij bevat een kolom Naam. Controleer of je het juiste tabblad exporteert.',
    )
  }

  const koppen = matrix[kopIndex].map((cel) => String(cel ?? '').trim())
  return matrix
    .slice(kopIndex + 1)
    .map((rij) => Object.fromEntries(koppen.map((kop, i) => [kop, rij[i] ?? ''])))
    // Lege regels en losse toelichtingen onderaan het blad horen er niet bij.
    .filter((rij) => Object.values(rij).some((waarde) => String(waarde).trim().length > 0))
}

/**
 * Koppelt de kolomkoppen van de sheet aan de velden van de base.
 *
 * Twee passes. Eerst exact, over alle kolommen: zo wint "Totaal (100)" van
 * "Score core (60)" voor het scoreveld. Pas daarna wordt de toelichting tussen
 * haakjes weggelaten, voor de velden die nog niets gevonden hebben. Dat is
 * nodig omdat niet elke opdrachtgever dezelfde koppen gebruikt — de
 * Verhaeg-lijst schrijft "Score (totaal)" waar Royal Sanders "Totaal (100)"
 * schrijft. Zonder die tweede pass verdwijnt de score zonder foutmelding.
 */
export function bouwKolomIndex(rijen) {
  const koppen = Object.keys(rijen[0] ?? {})
  const index = {}
  const zonderHaakjes = (kop) => normaliseer(kop).replace(/\s*\(.*?\)\s*/g, ' ').trim()

  for (const [veld, synoniemen] of Object.entries(KOLOM_SYNONIEMEN)) {
    const treffer = koppen.find((kop) => synoniemen.includes(normaliseer(kop)))
    if (treffer) index[veld] = treffer
  }
  for (const [veld, synoniemen] of Object.entries(KOLOM_SYNONIEMEN)) {
    if (index[veld]) continue
    const treffer = koppen.find(
      (kop) => !Object.values(index).includes(kop) && synoniemen.includes(zonderHaakjes(kop)),
    )
    if (treffer) index[veld] = treffer
  }
  const genegeerd = koppen.filter((kop) => !Object.values(index).includes(kop))
  return { index, koppen, genegeerd }
}

const waarde = (rij, index, veld) => {
  const kop = index[veld]
  const tekst = String((kop ? rij[kop] : undefined) ?? '').trim()
  return tekst.length > 0 ? tekst : undefined
}

/**
 * Dedupe op LinkedIn-URL, anders op genormaliseerde naam plus woonplaats.
 * Een URL telt alleen mee als hij een persoon aanwijst: de Brand Manager-lijst
 * staat vol Sales Navigator-links, en een kale /sales/ zonder lead-id zou
 * anders tientallen kandidaten tot één record samenvouwen.
 */
export const dedupeSleutel = (kandidaat) => {
  const url = kandidaat['LinkedIn-URL']
  if (url && isIdentificerendeUrl(url)) return url.trim().toLowerCase()
  return normaliseer(`${kandidaat.Naam ?? ''}|${kandidaat.Woonplaats ?? ''}`)
}

const MAANDEN = {
  januari: 1, jan: 1, februari: 2, feb: 2, maart: 3, mrt: 3, april: 4, apr: 4,
  mei: 5, juni: 6, jun: 6, juli: 7, jul: 7, augustus: 8, aug: 8,
  september: 9, sep: 9, sept: 9, oktober: 10, okt: 10,
  november: 11, nov: 11, december: 12, dec: 12,
}

const pad = (n) => String(n).padStart(2, '0')

/**
 * Datumtekst naar ISO, of niets.
 *
 * De datumkolom is vrije tekst en elke opdrachtgever vult hem anders: de
 * Verhaeg-lijst heeft "13 juli 2026" staan. Dat ging ongewijzigd door naar een
 * datumveld, en met `typecast: true` maakt Airtable daar zelf iets van — je
 * krijgt dus geen foutmelding maar stilzwijgend een verkeerde datum. Liever
 * niets dan iets verzonnens: wat hier niet uitkomt valt terug op de
 * importdatum en wordt gemeld.
 */
export function naarISO(ruw) {
  const tekst = String(ruw ?? '').trim()
  if (!tekst) return undefined

  const iso = tekst.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return tekst

  const woord = normaliseer(tekst).match(/^(\d{1,2})\s+([a-z.]+)\s+(\d{4})$/)
  if (woord) {
    const maand = MAANDEN[woord[2].replace(/\.$/, '')]
    if (maand) return `${woord[3]}-${pad(maand)}-${pad(woord[1])}`
  }

  // Dag-eerst, zoals overal in Nederland geschreven. 13-07-2026 en 13/7/2026.
  const cijfers = tekst.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (cijfers) {
    const [, dag, maand, jaar] = cijfers
    if (Number(maand) >= 1 && Number(maand) <= 12 && Number(dag) >= 1 && Number(dag) <= 31) {
      return `${jaar}-${pad(maand)}-${pad(dag)}`
    }
  }

  return undefined
}

const WAAR = ['ja', 'x', 'waar', 'true', '1']
/** Waarden die "geen concurrent" betekenen. Alles daarbuiten telt wél. */
const GEEN_CONCURRENT = ['', '-', 'nee', 'n', 'geen', 'false', '0', 'nvt', 'n.v.t.']

/**
 * De concurrent-kolom is niet overal een vinkje. ds-framework schrijft
 * `direct` / `adjacent` / `niche` voor (kandidaten-schema.json, kolom I), en
 * die vielen tegen een ja/nee-lijst allemaal weg — stil, want een lege waarde
 * ziet er niet uit als een fout. Airtable heeft er een vinkje van gemaakt, dus
 * de nuance tussen direct en niche gaat alsnog verloren; het onderscheid
 * concurrent/niet-concurrent blijft nu wel staan. Dat is het onderscheid dat
 * de outreach-gate gebruikt.
 */
function isConcurrent(ruw) {
  const tekst = normaliseer(ruw)
  if (GEEN_CONCURRENT.includes(tekst)) return undefined
  return WAAR.includes(tekst) || tekst.length > 0 || undefined
}

/**
 * Niet elk blad heeft een concurrent-kolom. De Verhaeg-lijst zet het oordeel
 * vooraan in de notitie: "CONCURRENT DIRECT. Werkt Hilversum, woont Almere."
 * Zonder deze regel blijft het vinkje leeg terwijl de informatie er staat — en
 * dat vinkje voedt de outreach-gate, dus dat is geen detail.
 *
 * Alleen aan het begin van de tekst, en alleen als de kolom zelf niets zei:
 * "geen concurrent van ons" ergens in een lange notitie mag geen vinkje zetten.
 */
function concurrentUitTekst(tekst) {
  const kop = normaliseer(tekst).slice(0, 40)
  if (/^niet-?\s*concurrent/.test(kop)) return undefined
  if (/^concurrent\b/.test(kop)) return true
  return undefined
}

/**
 * Zet de ruwe rijen om in kandidaten en aanmeldingen. Schrijft niets; geeft
 * terug wat er zou gebeuren, inclusief wat het niet kon plaatsen.
 */
export function bouwPlan(rijen, { vacatureTitel, bron, vandaag, inGesprek }) {
  const { index, genegeerd } = bouwKolomIndex(rijen)
  const kandidaten = new Map()
  const aanmeldingen = []
  const onbekendeStatus = new Map()
  const onbekendeReden = new Map()
  const bronVertaling = new Map()
  const onbeslist = []
  const overgeslagen = []
  const onleesbareDatums = new Map()

  for (const [nummer, rij] of rijen.entries()) {
    const naam = waarde(rij, index, 'Naam')
    if (!naam) {
      overgeslagen.push({ rij: nummer + 2, reden: 'geen naam' })
      continue
    }

    const ruweDatum = waarde(rij, index, '__datum')
    const datum = naarISO(ruweDatum)
    if (ruweDatum && !datum) {
      onleesbareDatums.set(ruweDatum, (onleesbareDatums.get(ruweDatum) ?? 0) + 1)
    }

    const kandidaat = schoon({
      Naam: naam,
      'LinkedIn-URL': waarde(rij, index, 'LinkedIn-URL'),
      'E-mail': waarde(rij, index, 'E-mail'),
      Telefoon: waarde(rij, index, 'Telefoon'),
      Instagram: waarde(rij, index, 'Instagram'),
      Woonplaats: waarde(rij, index, 'Woonplaats'),
      'Huidige rol': waarde(rij, index, 'Huidige rol'),
      'Huidige werkgever': waarde(rij, index, 'Huidige werkgever'),
      Opleiding: waarde(rij, index, 'Opleiding'),
      Talen: waarde(rij, index, 'Talen'),
      Bron: bronVan(rij, index, bron, bronVertaling),
      'Laatste contact': datum,
    })

    const ruweStatus = waarde(rij, index, '__status')
    const vertaald = vertaalStatus(ruweStatus)
    if (ruweStatus && !vertaald) {
      onbekendeStatus.set(ruweStatus, (onbekendeStatus.get(ruweStatus) ?? 0) + 1)
    }

    // In gesprek dekt zowel Gereageerd als Gesproken. Raden zou juist het
    // conversiecijfer bederven waar de splitsing voor bedoeld is, dus dat
    // vraagt om een expliciete keuze via --in-gesprek.
    let stage
    if (vertaald?.onbeslist) {
      onbeslist.push({ rij: nummer + 2, naam })
      if (!inGesprek) continue
      stage = inGesprek
    } else {
      // Onbekend valt terug op Gescoord: liever een kandidaat die je nog moet
      // beoordelen dan een verkeerde stage die de klok verkeerd zet.
      stage = vertaald?.stage ?? 'Gescoord'
    }
    if (!STAGE_IDS.includes(stage)) throw new Error(`Vertaling leverde onbekende stage ${stage}.`)

    // Pas registreren als vaststaat dat deze rij een aanmelding oplevert;
    // anders houd je een kandidaat zonder aanmelding over.
    const sleutel = dedupeSleutel(kandidaat)
    if (kandidaten.has(sleutel)) {
      overgeslagen.push({ rij: nummer + 2, reden: `dubbel in het bestand: ${naam}` })
      continue
    }
    kandidaten.set(sleutel, kandidaat)

    // De sheets hebben een eigen kolom Reden afvallen; die wint van de reden
    // die uit de statusvertaling zou rollen.
    const ruweReden = waarde(rij, index, '__reden')
    let reden = vertaalReden(ruweReden, ALLE_AFVAL_REDENEN) ?? vertaald?.reden ?? null
    if (ruweReden && !vertaalReden(ruweReden, ALLE_AFVAL_REDENEN)) {
      onbekendeReden.set(ruweReden, (onbekendeReden.get(ruweReden) ?? 0) + 1)
    }
    // Een reden hoort alleen bij een afvaller.
    if (stage !== 'Afgevallen') reden = null
    if (reden && !ALLE_AFVAL_REDENEN.includes(reden)) {
      throw new Error(`Vertaling leverde onbekende afvalreden ${reden}.`)
    }

    const score = Number.parseFloat(String(waarde(rij, index, '__score') ?? '').replace(',', '.'))
    const reistijd = Number.parseInt(String(waarde(rij, index, '__reistijd') ?? ''), 10)

    aanmeldingen.push({
      sleutel,
      velden: schoon({
        Aanmelding: `${naam} — ${vacatureTitel}`,
        Stage: stage,
        'Reden afvallen': reden,
        Eigenaar: 'Dominique',
        // De sheets kennen geen stagedatum; de import is het startpunt van de klok.
        'Datum in huidige stage': datum ?? vandaag,
        'Datum aangemaakt': vandaag,
        'Score totaal': Number.isFinite(score) ? score : undefined,
        'Reistijd minuten': Number.isFinite(reistijd) ? reistijd : undefined,
        'Score-onderbouwing': waarde(rij, index, '__onderbouwing'),
        Opmerkingen: [waarde(rij, index, '__signaal'), waarde(rij, index, '__opmerkingen')]
          .filter(Boolean)
          .join('\n\n') || undefined,
        'Outreach-concept': waarde(rij, index, '__outreach'),
        Concurrent:
          isConcurrent(waarde(rij, index, '__concurrent')) ??
          concurrentUitTekst(waarde(rij, index, '__opmerkingen')),
      }),
    })
  }

  return {
    index,
    genegeerd,
    kandidaten,
    aanmeldingen,
    onbekendeStatus,
    onbekendeReden,
    bronVertaling,
    onbeslist,
    overgeslagen,
    onleesbareDatums,
    genegeerdMetInhoud: gevuldeGenegeerdeKolommen(rijen, genegeerd),
    naamBotsingen: naamBotsingen(kandidaten),
  }
}

function bronVan(rij, index, terugval, logboek) {
  const ruw = waarde(rij, index, 'Bron')
  const vertaald = vertaalBron(ruw) ?? terugval
  if (ruw) logboek.set(ruw, vertaald)
  return vertaald
}

/**
 * Twee kandidaten met dezelfde naam maar een andere URL worden niet
 * samengevoegd — dat zou stil de verkeerde mensen samentrekken. Ze worden wel
 * gemeld, zodat je zelf kunt kijken.
 */
function naamBotsingen(kandidaten) {
  const perNaam = new Map()
  for (const kandidaat of kandidaten.values()) {
    const naam = normaliseer(kandidaat.Naam)
    if (!perNaam.has(naam)) perNaam.set(naam, [])
    perNaam.get(naam).push(kandidaat)
  }
  return [...perNaam.entries()]
    .filter(([, groep]) => groep.length > 1)
    .map(([naam, groep]) => ({ naam, aantal: groep.length }))
}

function schoon(object) {
  return Object.fromEntries(Object.entries(object).filter(([, v]) => v !== undefined))
}


/**
 * Een genegeerde kolom die leeg is, is ruis. Een genegeerde kolom met inhoud is
 * verlies: dat is informatie die iemand heeft ingevuld en die nergens terechtkomt.
 * De Verhaeg-lijst heeft zo zeventien ingevulde ervaringsjaren die verdwijnen.
 * Alleen die eerste soort hoort in een terzijde; deze hoort opgemerkt te worden.
 */
function gevuldeGenegeerdeKolommen(rijen, genegeerd) {
  return genegeerd
    .map((kop) => ({
      kop,
      gevuld: rijen.filter((rij) => String(rij[kop] ?? '').trim().length > 0).length,
    }))
    .filter((rij) => rij.gevuld > 0)
    .sort((a, b) => b.gevuld - a.gevuld)
}
