// Interne API van de ATS. Alles achter één gedeeld wachtwoord (x-ats-key).
// De Airtable-key blijft server-side; de frontend kent alleen deze routes.

import {
  TABLES,
  HttpError,
  listAll,
  getRecord,
  createRecords,
  updateRecord,
  deleteRecords,
  json,
  fail,
  requireAppKey,
  today,
  plusDays,
} from '../lib/airtable.mjs'
import {
  STAGE_IDS,
  ALLE_AFVAL_REDENEN,
  isKlantZichtbaar,
  dagenTussen,
} from '../../shared/stages.mjs'

export const config = { path: '/api/ats/*' }

/** Velden die de client op een aanmelding mag bijwerken. Stage loopt via /stage. */
const AANMELDING_VELDEN = new Set([
  'Volgende actie',
  'Opmerkingen',
  'Score totaal',
  'Score-onderbouwing',
  'Outreach-concept',
  'Reistijd minuten',
  'Concurrent',
  'Zichtbaar voor klant',
  'Eigenaar',
])

const KANDIDAAT_VELDEN = new Set([
  'Naam',
  'LinkedIn-URL',
  'E-mail',
  'Telefoon',
  'Instagram',
  'Woonplaats',
  'Huidige rol',
  'Huidige werkgever',
  'Opleiding',
  'Talen',
  'Bron',
  'Notities',
  'AVG-verwijderverzoek',
  'Laatste contact',
])

/**
 * `Portal-token` staat hier bewust niet in. Dat is de sleutel waarmee een klant
 * zijn rapport ziet — wie de link heeft, ziet het rapport. Een veld dat de
 * client mag zetten nodigt uit tot een kort of raadbaar token; de server maakt
 * hem daarom zelf aan en accepteert hem nooit van buiten. `Aantal vacatures` is
 * een count-veld en niet schrijfbaar.
 */
const OPDRACHTGEVER_VELDEN = new Set(['Naam', 'Status', 'Notities'])

const CONTACTPERSOON_VELDEN = new Set([
  'Naam',
  'Rol',
  'E-mail',
  'Telefoon',
  'Is hiring manager',
])

/**
 * `Validatie` en de rollups zijn formules en dus niet schrijfbaar. `Status` wél:
 * de base bewaakt zelf dat een vacature pas op Actief mag met een salarisband.
 */
const VACATURE_VELDEN = new Set([
  'Titel',
  'Status',
  'Startdatum',
  'Streefdatum shortlist',
  'Standplaats',
  'Salaris min',
  'Salaris max',
  'Scoringsdrempel',
  'Jobspec',
])

function pick(body, toegestaan) {
  const fields = {}
  for (const [key, value] of Object.entries(body ?? {})) {
    if (toegestaan.has(key)) fields[key] = value
  }
  if (Object.keys(fields).length === 0) throw new HttpError(400, 'Geen bij te werken velden meegegeven.')
  return fields
}

const first = (value) => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null))

export default async (req) => {
  try {
    requireAppKey(req)

    const url = new URL(req.url)
    const segments = url.pathname.replace(/^\/api\/ats\/?/, '').split('/').filter(Boolean)
    const route = `${req.method} ${segments[0] ?? ''}`

    switch (route) {
      case 'GET bootstrap':
        return json(200, await bootstrap())

      case 'POST stage':
        return json(200, await wijzigStage(await req.json()))

      case 'PATCH aanmelding': {
        const id = segments[1]
        if (!id) throw new HttpError(400, 'Aanmelding-id ontbreekt.')
        const record = await updateRecord(TABLES.aanmeldingen, id, pick(await req.json(), AANMELDING_VELDEN))
        return json(200, { aanmelding: record })
      }

      case 'POST aanmelding':
        return json(201, await maakAanmelding(await req.json()))

      case 'POST kandidaat':
        return json(201, await maakKandidaat(await req.json()))

      case 'PATCH kandidaat': {
        const id = segments[1]
        if (!id) throw new HttpError(400, 'Kandidaat-id ontbreekt.')
        const record = await updateRecord(TABLES.kandidaten, id, pick(await req.json(), KANDIDAAT_VELDEN))
        return json(200, { kandidaat: record })
      }

      case 'DELETE kandidaat': {
        const id = segments[1]
        if (!id) throw new HttpError(400, 'Kandidaat-id ontbreekt.')
        return json(200, await verwijderKandidaat(id))
      }

      case 'POST activiteit':
        return json(201, await logActiviteit(await req.json()))

      case 'POST opdrachtgever':
        return json(201, await maakOpdrachtgever(await req.json()))

      case 'PATCH opdrachtgever': {
        const id = segments[1]
        if (!id) throw new HttpError(400, 'Opdrachtgever-id ontbreekt.')
        const record = await updateRecord(
          TABLES.opdrachtgevers,
          id,
          pick(await req.json(), OPDRACHTGEVER_VELDEN),
        )
        return json(200, { opdrachtgever: record })
      }

      case 'POST vacature':
        return json(201, await maakVacature(await req.json()))

      case 'PATCH vacature': {
        const id = segments[1]
        if (!id) throw new HttpError(400, 'Vacature-id ontbreekt.')
        return json(200, { vacature: await wijzigVacature(id, await req.json()) })
      }

      case 'POST contactpersoon':
        return json(201, await maakContactpersoon(await req.json()))

      case 'PATCH contactpersoon': {
        const id = segments[1]
        if (!id) throw new HttpError(400, 'Contactpersoon-id ontbreekt.')
        const record = await updateRecord(
          TABLES.contactpersonen,
          id,
          pick(await req.json(), CONTACTPERSOON_VELDEN),
        )
        return json(200, { contactpersoon: record })
      }

      default:
        throw new HttpError(404, `Onbekende route ${route}.`)
    }
  } catch (error) {
    return fail(error)
  }
}

async function bootstrap() {
  const [opdrachtgevers, vacatures, kandidaten, aanmeldingen, activiteiten, contactpersonen] =
    await Promise.all([
      listAll(TABLES.opdrachtgevers),
      listAll(TABLES.vacatures),
      listAll(TABLES.kandidaten),
      listAll(TABLES.aanmeldingen),
      listAll(TABLES.activiteiten, { sort: [{ field: 'Datum', direction: 'desc' }] }),
      listAll(TABLES.contactpersonen),
    ])

  return {
    vandaag: today(),
    opdrachtgevers: opdrachtgevers.map(plat),
    vacatures: vacatures.map(plat),
    kandidaten: kandidaten.map(plat),
    aanmeldingen: aanmeldingen.map(plat),
    activiteiten: activiteiten.map(plat),
    contactpersonen: contactpersonen.map(plat),
  }
}

/**
 * Een vacature mag pas op Actief met een salarisbandbreedte.
 *
 * Dit is de enige plek waar die regel echt wordt afgedwongen. Het veld
 * `Validatie` in de base is een formule, en formules berekenen een waarde:
 * ze weigeren geen invoer. Wie erop vertrouwt dat "de base het wel tegenhoudt"
 * krijgt een vacature op Actief met de tekst "Salarisbandbreedte ontbreekt" in
 * een kolom waar niemand kijkt.
 */
function bewaakSalarisband(effectief) {
  if (effectief.Status !== 'Actief') return
  if (effectief['Salaris min'] == null || effectief['Salaris max'] == null) {
    throw new HttpError(400, 'Een vacature mag pas op Actief met een salarisband.')
  }
}

/**
 * Bij een wijziging stuurt de app alleen wat er veranderd is. Wie alleen de
 * status op Actief zet, stuurt dus geen salarisvelden mee — en een controle op
 * dat ene veld zou die vacature weigeren terwijl de band er al jaren in staat.
 * Daarom eerst het bestaande record ophalen en de regel op de samengevoegde
 * waarden toepassen.
 */
async function wijzigVacature(id, body) {
  const fields = pick(body, VACATURE_VELDEN)
  const huidig = await getRecord(TABLES.vacatures, id)
  bewaakSalarisband({ ...huidig.fields, ...fields })
  return updateRecord(TABLES.vacatures, id, fields)
}

const plat = (record) => ({ id: record.id, ...record.fields })

/**
 * Automations 1 tot en met 5 in één handeling: stagelog schrijven, de klok
 * resetten, klantzichtbaarheid zetten, de reden afdwingen en bij Geplaatst
 * de Ingewerkt-check inplannen.
 */
async function wijzigStage(body) {
  const { aanmeldingId, naarStage, redenAfvallen, volgendeActie, notitie } = body ?? {}

  if (!aanmeldingId) throw new HttpError(400, 'Aanmelding-id ontbreekt.')
  if (!STAGE_IDS.includes(naarStage)) throw new HttpError(400, `Onbekende stage ${naarStage}.`)
  if (naarStage === 'Afgevallen' && !ALLE_AFVAL_REDENEN.includes(redenAfvallen)) {
    throw new HttpError(400, 'Afgevallen kan alleen met een geldige reden.')
  }

  const huidig = await getRecord(TABLES.aanmeldingen, aanmeldingId)
  const vanStage = huidig.fields.Stage ?? null
  const datumInStage = huidig.fields['Datum in huidige stage'] ?? null
  const vandaag = today()

  if (vanStage === naarStage) throw new HttpError(400, 'De aanmelding staat al in deze stage.')

  const fields = {
    Stage: naarStage,
    'Datum in huidige stage': vandaag,
    'Reden afvallen': naarStage === 'Afgevallen' ? redenAfvallen : null,
  }

  if (isKlantZichtbaar(naarStage)) fields['Zichtbaar voor klant'] = true

  if (volgendeActie !== undefined) fields['Volgende actie'] = volgendeActie
  else if (naarStage === 'Geplaatst') fields['Volgende actie'] = `Ingewerkt-check op ${plusDays(30)}`
  else if (naarStage === 'Afgevallen') fields['Volgende actie'] = null

  const aanmelding = await updateRecord(TABLES.aanmeldingen, aanmeldingId, fields)
  const label = huidig.fields.Aanmelding ?? aanmeldingId

  const [stagelog, activiteit] = await Promise.all([
    createRecords(TABLES.stagelog, [
      {
        Omschrijving: `${label}: ${vanStage ?? 'nieuw'} → ${naarStage}`,
        Aanmelding: [aanmeldingId],
        'Van stage': vanStage,
        'Naar stage': naarStage,
        Datum: vandaag,
        'Dagen in vorige stage': dagenTussen(datumInStage, vandaag),
      },
    ]),
    createRecords(TABLES.activiteiten, [
      {
        Samenvatting: `${vanStage ?? 'nieuw'} → ${naarStage}${redenAfvallen ? ` (${redenAfvallen})` : ''}`,
        Aanmelding: [aanmeldingId],
        Datum: vandaag,
        Type: 'Statuswijziging',
        'Door wie': 'Dominique',
        Toelichting: notitie ?? '',
      },
    ]),
  ])

  return { aanmelding, stagelog: stagelog[0], activiteit: plat(activiteit[0]) }
}

async function maakAanmelding(body) {
  const { kandidaatId, vacatureId, stage = 'Gescoord', score, onderbouwing } = body ?? {}
  if (!kandidaatId || !vacatureId) throw new HttpError(400, 'Kandidaat en vacature zijn beide verplicht.')
  if (!STAGE_IDS.includes(stage)) throw new HttpError(400, `Onbekende stage ${stage}.`)

  const [kandidaat, vacature] = await Promise.all([
    getRecord(TABLES.kandidaten, kandidaatId),
    getRecord(TABLES.vacatures, vacatureId),
  ])

  // Dezelfde kandidaat twee keer op dezelfde vacature is de dubbeling die dit
  // model juist moest oplossen. Op een andere vacature mag het wel.
  const alAangemeld = (kandidaat.fields.Aanmeldingen ?? []).find((id) =>
    (vacature.fields.Aanmeldingen ?? []).includes(id),
  )
  if (alAangemeld) throw new HttpError(409, 'Deze kandidaat staat al op deze vacature.')

  const vandaag = today()
  const [record] = await createRecords(TABLES.aanmeldingen, [
    {
      Aanmelding: `${kandidaat.fields.Naam} — ${vacature.fields.Titel}`,
      Kandidaat: [kandidaatId],
      Vacature: [vacatureId],
      Stage: stage,
      'Datum in huidige stage': vandaag,
      'Datum aangemaakt': vandaag,
      Eigenaar: 'Dominique',
      ...(score !== undefined ? { 'Score totaal': score } : {}),
      ...(onderbouwing ? { 'Score-onderbouwing': onderbouwing } : {}),
    },
  ])

  return { aanmelding: plat(record) }
}

async function maakKandidaat(body) {
  const fields = pick(body, KANDIDAAT_VELDEN)
  if (!fields.Naam) throw new HttpError(400, 'Naam is verplicht.')

  // Dedupe op LinkedIn-URL, anders op naam plus woonplaats — zelfde regel als het importscript.
  const sleutel = (fields['LinkedIn-URL'] ?? `${fields.Naam}|${fields.Woonplaats ?? ''}`).trim().toLowerCase()
  const bestaand = await listAll(TABLES.kandidaten, {
    filterByFormula: `LOWER({Dedupe-sleutel}) = '${sleutel.replace(/'/g, "\\'")}'`,
  })
  if (bestaand.length > 0) return { kandidaat: plat(bestaand[0]), bestond: true }

  const [record] = await createRecords(TABLES.kandidaten, [fields])
  return { kandidaat: plat(record), bestond: false }
}

async function logActiviteit(body) {
  const { aanmeldingId, type, samenvatting, toelichting, datum } = body ?? {}
  if (!aanmeldingId) throw new HttpError(400, 'Aanmelding-id ontbreekt.')
  if (!samenvatting) throw new HttpError(400, 'Samenvatting is verplicht.')

  const datumISO = datum ?? today()
  const [record] = await createRecords(TABLES.activiteiten, [
    {
      Samenvatting: samenvatting,
      Aanmelding: [aanmeldingId],
      Datum: datumISO,
      Type: type ?? 'Notitie',
      'Door wie': 'Dominique',
      Toelichting: toelichting ?? '',
    },
  ])

  // Echt contact verschuift de AVG-bewaartermijn; een losse notitie niet.
  let kandidaat = null
  if (['InMail', 'Reminder', 'Telefoon', 'Teams', 'E-mail'].includes(type)) {
    const aanmelding = await getRecord(TABLES.aanmeldingen, aanmeldingId)
    const kandidaatId = first(aanmelding.fields.Kandidaat)
    if (kandidaatId) {
      kandidaat = plat(await updateRecord(TABLES.kandidaten, kandidaatId, { 'Laatste contact': datumISO }))
    }
  }

  return { activiteit: plat(record), kandidaat }
}

/** AVG-verwijdering: kandidaat en alles wat aan hem hangt, onherstelbaar. */
/**
 * Een token dat de klant zijn eigen rapport laat zien en dat van een ander niet.
 * 32 hex-tekens uit de systeem-CSPRNG; de rapportfunctie weigert alles onder de
 * 24 tekens. De client mag hem niet meesturen — zie OPDRACHTGEVER_VELDEN.
 */
function nieuwToken() {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function maakOpdrachtgever(body) {
  const fields = pick(body, OPDRACHTGEVER_VELDEN)
  if (!fields.Naam) throw new HttpError(400, 'Naam is verplicht.')

  const naam = fields.Naam.trim().toLowerCase()
  const bestaand = await listAll(TABLES.opdrachtgevers, { fields: ['Naam'] })
  if (bestaand.some((o) => (o.fields.Naam ?? '').trim().toLowerCase() === naam)) {
    throw new HttpError(409, `Opdrachtgever "${fields.Naam}" bestaat al.`)
  }

  const [record] = await createRecords(TABLES.opdrachtgevers, [
    { fields: { ...fields, 'Portal-token': nieuwToken() } },
  ])
  return { opdrachtgever: plat(record) }
}

async function maakVacature(body) {
  const { opdrachtgeverId } = body ?? {}
  if (!opdrachtgeverId) throw new HttpError(400, 'Opdrachtgever-id ontbreekt.')
  const fields = pick(body, VACATURE_VELDEN)
  if (!fields.Titel) throw new HttpError(400, 'Titel is verplicht.')

  bewaakSalarisband(fields)

  const [record] = await createRecords(TABLES.vacatures, [
    { fields: { ...fields, Opdrachtgever: [opdrachtgeverId] } },
  ])
  return { vacature: plat(record) }
}

async function maakContactpersoon(body) {
  const { opdrachtgeverId } = body ?? {}
  if (!opdrachtgeverId) throw new HttpError(400, 'Opdrachtgever-id ontbreekt.')
  const fields = pick(body, CONTACTPERSOON_VELDEN)
  if (!fields.Naam) throw new HttpError(400, 'Naam is verplicht.')

  const [record] = await createRecords(TABLES.contactpersonen, [
    { fields: { ...fields, Opdrachtgever: [opdrachtgeverId] } },
  ])
  return { contactpersoon: plat(record) }
}

async function verwijderKandidaat(kandidaatId) {
  const kandidaat = await getRecord(TABLES.kandidaten, kandidaatId)
  const aanmeldingIds = kandidaat.fields.Aanmeldingen ?? []

  if (aanmeldingIds.length > 0) {
    const [activiteiten, stagelog, beoordelingen] = await Promise.all([
      listAll(TABLES.activiteiten, { fields: ['Aanmelding'] }),
      listAll(TABLES.stagelog, { fields: ['Aanmelding'] }),
      listAll(TABLES.beoordelingen, { fields: ['Aanmelding'] }),
    ])

    const raaktAanmelding = (record) =>
      (record.fields.Aanmelding ?? []).some((id) => aanmeldingIds.includes(id))

    await deleteRecords(TABLES.activiteiten, activiteiten.filter(raaktAanmelding).map((r) => r.id))
    await deleteRecords(TABLES.stagelog, stagelog.filter(raaktAanmelding).map((r) => r.id))
    await deleteRecords(TABLES.beoordelingen, beoordelingen.filter(raaktAanmelding).map((r) => r.id))
    await deleteRecords(TABLES.aanmeldingen, aanmeldingIds)
  }

  await deleteRecords(TABLES.kandidaten, [kandidaatId])
  return { verwijderd: kandidaatId, aanmeldingen: aanmeldingIds.length }
}
