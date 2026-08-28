// Publiek klantrapport op /api/rapport/{token}. Geen login, wel een lange
// willekeurige token en noindex.
//
// Deze functie is de enige plek waar klantdata het systeem verlaat. Alles wat
// de klant niet mag zien (interne scores, concurrent-vlaggen, salarisinschat-
// tingen, outreach-concepten, namen van afgewezen kandidaten) wordt hier
// weggelaten in plaats van in de frontend verborgen.

import { TABLES, HttpError, listAll, json, fail, safeEqual, today } from '../lib/airtable.mjs'
import { FUNNEL_STAGES, isKlantZichtbaar, dagenTussen } from '../../shared/stages.mjs'

export const config = { path: '/api/rapport/*' }

const MIN_TOKENLENGTE = 24

export default async (req) => {
  try {
    const url = new URL(req.url)
    const token = decodeURIComponent(url.pathname.replace(/^\/api\/rapport\/?/, '').split('/')[0] ?? '')

    if (token.length < MIN_TOKENLENGTE) throw new HttpError(404, 'Rapport niet gevonden.')

    const opdrachtgevers = await listAll(TABLES.opdrachtgevers, {
      fields: ['Naam', 'Portal-token', 'Status'],
    })
    const opdrachtgever = opdrachtgevers.find((o) => safeEqual(o.fields['Portal-token'] ?? '', token))
    if (!opdrachtgever) throw new HttpError(404, 'Rapport niet gevonden.')

    return json(200, await bouwRapport(opdrachtgever))
  } catch (error) {
    return fail(error)
  }
}

async function bouwRapport(opdrachtgever) {
  const [alleVacatures, alleAanmeldingen, alleKandidaten, alleStagelog] = await Promise.all([
    listAll(TABLES.vacatures),
    listAll(TABLES.aanmeldingen),
    listAll(TABLES.kandidaten, { fields: ['Naam', 'Huidige rol', 'Huidige werkgever', 'Woonplaats'] }),
    listAll(TABLES.stagelog, { fields: ['Aanmelding', 'Naar stage', 'Datum'] }),
  ])

  const vacatures = alleVacatures.filter((v) =>
    (v.fields.Opdrachtgever ?? []).includes(opdrachtgever.id),
  )
  const kandidaatById = new Map(alleKandidaten.map((k) => [k.id, k.fields]))
  const logPerAanmelding = groepeer(alleStagelog, (r) => (r.fields.Aanmelding ?? [])[0])
  const vandaag = today()

  return {
    opdrachtgever: opdrachtgever.fields.Naam,
    gegenereerdOp: vandaag,
    vacatures: vacatures.map((vacature) => {
      const aanmeldingen = alleAanmeldingen.filter((a) =>
        (a.fields.Vacature ?? []).includes(vacature.id),
      )

      return {
        titel: vacature.fields.Titel,
        status: vacature.fields.Status ?? null,
        standplaats: vacature.fields.Standplaats ?? null,
        startdatum: vacature.fields.Startdatum ?? null,
        streefdatumShortlist: vacature.fields['Streefdatum shortlist'] ?? null,
        totaal: aanmeldingen.length,
        funnel: funnel(aanmeldingen, logPerAanmelding),
        redenen: redenAnalyse(aanmeldingen),
        doorlooptijd: doorlooptijd(aanmeldingen, logPerAanmelding),
        voorgedragen: voorgedragen(aanmeldingen, kandidaatById, vandaag),
      }
    }),
  }
}

/**
 * Cumulatieve funnel: wie op Voorgesteld staat is ook een keer Benaderd
 * geweest, dus telt in elke trede daaronder mee. Zonder dat leest de funnel
 * als een momentopname in plaats van als een trechter.
 */
function funnel(aanmeldingen, logPerAanmelding) {
  const hoogste = new Map(
    aanmeldingen.map((a) => [a.id, hoogsteBereikteStage(a, logPerAanmelding.get(a.id) ?? [])]),
  )

  return FUNNEL_STAGES.map((stage, index) => ({
    stage,
    bereikt: aanmeldingen.filter((a) => hoogste.get(a.id) >= index).length,
    nuHier: aanmeldingen.filter((a) => a.fields.Stage === stage).length,
  }))
}

/**
 * Bij Afgevallen zegt het veld Stage niets meer over hoe ver iemand kwam.
 * De stagelog wel: daar staat elke trede die de aanmelding heeft geraakt.
 */
function hoogsteBereikteStage(aanmelding, log) {
  const indices = log
    .map((r) => FUNNEL_STAGES.indexOf(r.fields['Naar stage']))
    .filter((i) => i >= 0)
  const huidig = FUNNEL_STAGES.indexOf(aanmelding.fields.Stage)
  if (huidig >= 0) indices.push(huidig)
  return indices.length > 0 ? Math.max(...indices) : 0
}

function redenAnalyse(aanmeldingen) {
  const tellingen = new Map()
  for (const a of aanmeldingen) {
    if (a.fields.Stage !== 'Afgevallen') continue
    const reden = a.fields['Reden afvallen'] ?? 'Onbekend'
    tellingen.set(reden, (tellingen.get(reden) ?? 0) + 1)
  }
  return [...tellingen.entries()]
    .map(([reden, aantal]) => ({ reden, aantal }))
    .sort((a, b) => b.aantal - a.aantal)
}

/** Mediaan doorlooptijd in dagen, gemeten op de stagelog. */
function doorlooptijd(aanmeldingen, logPerAanmelding) {
  const benaderdTotVoorgesteld = []
  const voorgesteldTotGeplaatst = []

  for (const a of aanmeldingen) {
    const log = logPerAanmelding.get(a.id) ?? []
    const eersteKeer = (stage) => {
      const datums = log
        .filter((r) => r.fields['Naar stage'] === stage && r.fields.Datum)
        .map((r) => r.fields.Datum)
        .sort()
      return datums[0] ?? null
    }

    const benaderd = eersteKeer('Benaderd')
    const voorgesteld = eersteKeer('Voorgesteld')
    const geplaatst = eersteKeer('Geplaatst')

    if (benaderd && voorgesteld) benaderdTotVoorgesteld.push(dagenTussen(benaderd, voorgesteld))
    if (voorgesteld && geplaatst) voorgesteldTotGeplaatst.push(dagenTussen(voorgesteld, geplaatst))
  }

  return {
    benaderdTotVoorgesteld: mediaan(benaderdTotVoorgesteld),
    voorgesteldTotGeplaatst: mediaan(voorgesteldTotGeplaatst),
  }
}

function mediaan(waarden) {
  const geldig = waarden.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b)
  if (geldig.length === 0) return null
  const midden = Math.floor(geldig.length / 2)
  const waarde =
    geldig.length % 2 === 0 ? (geldig[midden - 1] + geldig[midden]) / 2 : geldig[midden]
  return { dagen: Math.round(waarde), aantal: geldig.length }
}

/**
 * Alleen kandidaten die daadwerkelijk zijn voorgedragen, en alleen de velden
 * die de klant sowieso al in de voordracht heeft gezien.
 */
function voorgedragen(aanmeldingen, kandidaatById, vandaag) {
  return aanmeldingen
    .filter((a) => isKlantZichtbaar(a.fields.Stage) && a.fields['Zichtbaar voor klant'])
    .map((a) => {
      const kandidaat = kandidaatById.get((a.fields.Kandidaat ?? [])[0]) ?? {}
      return {
        naam: kandidaat.Naam ?? 'Onbekend',
        huidigeRol: kandidaat['Huidige rol'] ?? null,
        huidigeWerkgever: kandidaat['Huidige werkgever'] ?? null,
        woonplaats: kandidaat.Woonplaats ?? null,
        stage: a.fields.Stage,
        dagenInStage: dagenTussen(a.fields['Datum in huidige stage'], vandaag),
      }
    })
    .sort((a, b) => FUNNEL_STAGES.indexOf(b.stage) - FUNNEL_STAGES.indexOf(a.stage))
}

function groepeer(records, sleutelVan) {
  const map = new Map()
  for (const record of records) {
    const sleutel = sleutelVan(record)
    if (!sleutel) continue
    if (!map.has(sleutel)) map.set(sleutel, [])
    map.get(sleutel).push(record)
  }
  return map
}
