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
  const regels = tekst.split(/\r?\n/).filter((regel) => regel.trim().length > 0)
  if (regels.length === 0) return []
  const scheider = tel(regels[0], ';') > tel(regels[0], ',') ? ';' : ','
  return naarObjecten(regels.map((regel) => splitsCsvRegel(regel, scheider)))
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

function splitsCsvRegel(regel, scheider) {
  const cellen = []
  let huidig = ''
  let inAanhaling = false
  for (let i = 0; i < regel.length; i++) {
    const teken = regel[i]
    if (teken === '"') {
      if (inAanhaling && regel[i + 1] === '"') {
        huidig += '"'
        i++
      } else inAanhaling = !inAanhaling
    } else if (teken === scheider && !inAanhaling) {
      cellen.push(huidig.trim())
      huidig = ''
    } else huidig += teken
  }
  cellen.push(huidig.trim())
  return cellen
}

/** Koppelt de kolomkoppen van de sheet aan de velden van de base. */
export function bouwKolomIndex(rijen) {
  const koppen = Object.keys(rijen[0] ?? {})
  const index = {}
  for (const [veld, synoniemen] of Object.entries(KOLOM_SYNONIEMEN)) {
    const treffer = koppen.find((kop) => synoniemen.includes(normaliseer(kop)))
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

const WAAR = ['ja', 'x', 'waar', 'true', '1']

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

  for (const [nummer, rij] of rijen.entries()) {
    const naam = waarde(rij, index, 'Naam')
    if (!naam) {
      overgeslagen.push({ rij: nummer + 2, reden: 'geen naam' })
      continue
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
      'Laatste contact': waarde(rij, index, '__datum'),
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
        'Datum in huidige stage': waarde(rij, index, '__datum') ?? vandaag,
        'Datum aangemaakt': vandaag,
        'Score totaal': Number.isFinite(score) ? score : undefined,
        'Reistijd minuten': Number.isFinite(reistijd) ? reistijd : undefined,
        'Score-onderbouwing': waarde(rij, index, '__onderbouwing'),
        Opmerkingen: [waarde(rij, index, '__signaal'), waarde(rij, index, '__opmerkingen')]
          .filter(Boolean)
          .join('\n\n') || undefined,
        'Outreach-concept': waarde(rij, index, '__outreach'),
        Concurrent: WAAR.includes(normaliseer(waarde(rij, index, '__concurrent'))) || undefined,
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
