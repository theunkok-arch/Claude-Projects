// Het lees- en vertaalgedeelte van de import, zonder netwerk. Alles hier is
// puur, zodat je het kunt draaien en nakijken zonder Airtable-credentials.

import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { ALLE_AFVAL_REDENEN, STAGE_IDS } from '../../shared/stages.mjs'
import { KOLOM_SYNONIEMEN, normaliseer, vertaalStatus } from './status-map.mjs'

/** Leest xlsx of csv en geeft een array objecten met de kolomkoppen als sleutel. */
export async function leesRijen(pad, tabnaam) {
  if (extname(pad).toLowerCase() === '.csv') return leesCsv(readFileSync(pad, 'utf8'))

  const { read, utils } = await import('xlsx')
  const werkboek = read(readFileSync(pad), { cellDates: true })
  const blad = tabnaam ?? werkboek.SheetNames[0]
  if (!werkboek.Sheets[blad]) {
    throw new Error(`Tab "${blad}" bestaat niet. Beschikbaar: ${werkboek.SheetNames.join(', ')}`)
  }
  return utils.sheet_to_json(werkboek.Sheets[blad], { defval: '', raw: false })
}

export function leesCsv(tekst) {
  const regels = tekst.split(/\r?\n/).filter((regel) => regel.trim().length > 0)
  if (regels.length === 0) return []
  const scheider = regels[0].includes(';') ? ';' : ','
  const koppen = splitsCsvRegel(regels[0], scheider)
  return regels.slice(1).map((regel) => {
    const cellen = splitsCsvRegel(regel, scheider)
    return Object.fromEntries(koppen.map((kop, i) => [kop, cellen[i] ?? '']))
  })
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

export const dedupeSleutel = (kandidaat) =>
  (kandidaat['LinkedIn-URL'] ?? `${kandidaat.Naam ?? ''}|${kandidaat.Woonplaats ?? ''}`)
    .trim()
    .toLowerCase()

const WAAR = ['ja', 'x', 'waar', 'true', '1']

/**
 * Zet de ruwe rijen om in kandidaten en aanmeldingen. Schrijft niets; geeft
 * terug wat er zou gebeuren, inclusief wat het niet kon plaatsen.
 */
export function bouwPlan(rijen, { vacatureTitel, bron, vandaag }) {
  const { index, genegeerd } = bouwKolomIndex(rijen)
  const kandidaten = new Map()
  const aanmeldingen = []
  const onbekendeStatus = new Map()
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
      Bron: waarde(rij, index, 'Bron') ?? bron,
      'Laatste contact': waarde(rij, index, '__datum'),
    })

    const sleutel = dedupeSleutel(kandidaat)
    if (kandidaten.has(sleutel)) {
      overgeslagen.push({ rij: nummer + 2, reden: `dubbel in het bestand: ${naam}` })
      continue
    }
    kandidaten.set(sleutel, kandidaat)

    const ruweStatus = waarde(rij, index, '__status')
    const vertaald = vertaalStatus(ruweStatus)
    if (ruweStatus && !vertaald) {
      onbekendeStatus.set(ruweStatus, (onbekendeStatus.get(ruweStatus) ?? 0) + 1)
    }

    // Onbekend valt terug op Gescoord: liever een kandidaat die je nog moet
    // beoordelen dan een verkeerde stage die de klok verkeerd zet.
    const stage = vertaald?.stage ?? 'Gescoord'
    const reden = vertaald?.reden
    if (!STAGE_IDS.includes(stage)) throw new Error(`Vertaling leverde onbekende stage ${stage}.`)
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
        Opmerkingen: waarde(rij, index, '__opmerkingen'),
        'Outreach-concept': waarde(rij, index, '__outreach'),
        Concurrent: WAAR.includes(normaliseer(waarde(rij, index, '__concurrent'))) || undefined,
      }),
    })
  }

  return { index, genegeerd, kandidaten, aanmeldingen, onbekendeStatus, overgeslagen }
}

function schoon(object) {
  return Object.fromEntries(Object.entries(object).filter(([, v]) => v !== undefined))
}
