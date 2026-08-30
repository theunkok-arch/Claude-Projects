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
import { genereerWachtwoord, hashWachtwoord, nieuweSalt } from '../lib/portaal.mjs'
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
 * `Portal-token` staat hier bewust niet in. Dat veld hoorde bij het oude
 * tokenrapport op /rapport/{token} en wordt nergens meer gelezen; klanttoegang
 * loopt nu via `Portaalgebruikers` met een eigen wachtwoord per persoon. Het
 * veld staat nog in de base zodat oude records niet stilzwijgend leeglopen,
 * maar er hangt geen route meer aan. `Aantal vacatures` is een count-veld en
 * niet schrijfbaar.
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

      case 'GET portaalgebruikers':
        return json(200, { portaalgebruikers: await leesPortaalgebruikers() })

      case 'POST portaalgebruiker':
        return json(201, await maakPortaalgebruiker(await req.json()))

      case 'PATCH portaalgebruiker': {
        const id = segments[1]
        if (!id) throw new HttpError(400, 'Portaalgebruiker-id ontbreekt.')
        return json(200, await wijzigPortaalgebruiker(id, await req.json()))
      }

      case 'DELETE portaalgebruiker': {
        const id = segments[1]
        if (!id) throw new HttpError(400, 'Portaalgebruiker-id ontbreekt.')
        await deleteRecords(TABLES.portaalgebruikers, [id])
        return json(200, { verwijderd: id })
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
async function maakOpdrachtgever(body) {
  const fields = pick(body, OPDRACHTGEVER_VELDEN)
  if (!fields.Naam) throw new HttpError(400, 'Naam is verplicht.')

  const naam = fields.Naam.trim().toLowerCase()
  const bestaand = await listAll(TABLES.opdrachtgevers, { fields: ['Naam'] })
  if (bestaand.some((o) => (o.fields.Naam ?? '').trim().toLowerCase() === naam)) {
    throw new HttpError(409, `Opdrachtgever "${fields.Naam}" bestaat al.`)
  }

  const [record] = await createRecords(TABLES.opdrachtgevers, [{ fields }])
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

// ---------------------------------------------------------------------------
// Portaalgebruikers: het beheer van de klanttoegang
// ---------------------------------------------------------------------------

/**
 * Wat er van een portaalgebruiker terug mag naar het beheerscherm.
 *
 * `Wachtwoord-hash` en `Salt` staan hier met opzet niet in, en dat is geen
 * overdreven voorzichtigheid: die twee horen de base nooit te verlaten. Ze
 * zeggen niets tegen Dominique — een hash is niet terug te rekenen — maar ze
 * zijn wel precies wat iemand nodig heeft om offline op wachtwoorden te gaan
 * raden. Een `plat()` met een spread zou ze hebben meegestuurd.
 */
export const platteGebruiker = (record) => ({
  id: record.id,
  Naam: record.fields.Naam ?? null,
  'E-mail': record.fields['E-mail'] ?? null,
  Opdrachtgever: record.fields.Opdrachtgever ?? [],
  Vacatures: record.fields.Vacatures ?? [],
  Status: record.fields.Status ?? 'Actief',
  'Verloopt op': record.fields['Verloopt op'] ?? null,
  'Laatste login': record.fields['Laatste login'] ?? null,
  'Geblokkeerd tot': record.fields['Geblokkeerd tot'] ?? null,
})

/** Standaard drie maanden. Toegang die nooit verloopt, verloopt nooit. */
const STANDAARD_GELDIGHEID_DAGEN = 90

async function leesPortaalgebruikers() {
  const records = await listAll(TABLES.portaalgebruikers)
  return records.map(platteGebruiker)
}

const genormaliseerd = (waarde) => String(waarde ?? '').trim().toLowerCase()

/**
 * Airtable kent geen uniciteit op een veld, dus de server bewaakt het.
 * Twee gebruikers met hetzelfde adres zou betekenen dat de login altijd bij de
 * eerste uitkomt en de tweede stilzwijgend nooit werkt.
 */
async function eisUniekAdres(email, behalveId = null) {
  const bestaand = await listAll(TABLES.portaalgebruikers, { fields: ['E-mail'] })
  const botsing = bestaand.find(
    (g) => g.id !== behalveId && genormaliseerd(g.fields['E-mail']) === genormaliseerd(email),
  )
  if (botsing) throw new HttpError(409, 'Er bestaat al een portaalgebruiker met dit e-mailadres.')
}

/**
 * De vacatures moeten van de opgegeven opdrachtgever zijn.
 *
 * De portal controleert dit bij het uitserveren nog een keer, dus een fout hier
 * lekt niets. Maar stil laten vallen wat niet klopt, is de slechtste van de
 * drie opties: dan vinkt Dominique iets aan, ziet ze het aangevinkt staan, en
 * belt de klant later dat hij die vacature niet ziet. Liever hier weigeren.
 */
async function eisEigenVacatures(opdrachtgeverId, vacatureIds) {
  if (vacatureIds.length === 0) return
  const vacatures = await listAll(TABLES.vacatures, { fields: ['Titel', 'Opdrachtgever'] })
  const perId = new Map(vacatures.map((v) => [v.id, v]))

  for (const id of vacatureIds) {
    const vacature = perId.get(id)
    if (!vacature) throw new HttpError(400, `Vacature ${id} bestaat niet.`)
    if (!(vacature.fields.Opdrachtgever ?? []).includes(opdrachtgeverId)) {
      throw new HttpError(
        400,
        `De vacature "${vacature.fields.Titel ?? id}" hoort bij een andere opdrachtgever.`,
      )
    }
  }
}

export function eisAdres(email) {
  const tekst = String(email ?? '').trim()
  // Bewust ruim: een adres afkeuren dat de klant wél gebruikt is erger dan er
  // een doorlaten dat nooit post ontvangt. Dit veld is een inlognaam.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tekst)) throw new HttpError(400, 'Vul een geldig e-mailadres in.')
  return tekst
}

/**
 * Het gegenereerde wachtwoord gaat één keer terug naar het scherm en wordt
 * nergens bewaard. Dominique geeft het door; daarna bestaat het alleen nog in
 * het hoofd of de wachtwoordkluis van de klant. Kwijt is opnieuw genereren, en
 * dat is met opzet zo: een wachtwoord dat op te zoeken is, is een wachtwoord
 * dat iedereen met base-toegang kan opzoeken.
 */
async function nieuwWachtwoordVelden() {
  const wachtwoord = genereerWachtwoord()
  const salt = nieuweSalt()
  return {
    wachtwoord,
    velden: {
      Salt: salt,
      'Wachtwoord-hash': await hashWachtwoord(wachtwoord, salt),
      'Mislukte pogingen': 0,
      'Geblokkeerd tot': null,
    },
  }
}

async function maakPortaalgebruiker(body) {
  const naam = String(body?.Naam ?? '').trim()
  const email = eisAdres(body?.['E-mail'])
  const opdrachtgeverId = first(body?.Opdrachtgever)
  const vacatureIds = Array.isArray(body?.Vacatures) ? body.Vacatures : []

  if (!naam) throw new HttpError(400, 'Vul een naam in.')
  if (!opdrachtgeverId) throw new HttpError(400, 'Kies een opdrachtgever.')

  await eisUniekAdres(email)
  await eisEigenVacatures(opdrachtgeverId, vacatureIds)

  const { wachtwoord, velden } = await nieuwWachtwoordVelden()

  const [record] = await createRecords(TABLES.portaalgebruikers, [
    {
      Naam: naam,
      'E-mail': email,
      Opdrachtgever: [opdrachtgeverId],
      Vacatures: vacatureIds,
      Status: 'Actief',
      'Verloopt op': body?.['Verloopt op'] || plusDays(STANDAARD_GELDIGHEID_DAGEN),
      ...velden,
    },
  ])

  return { portaalgebruiker: platteGebruiker(record), wachtwoord }
}

async function wijzigPortaalgebruiker(id, body) {
  const huidig = await getRecord(TABLES.portaalgebruikers, id)
  const fields = {}

  if (body?.Naam !== undefined) {
    const naam = String(body.Naam).trim()
    if (!naam) throw new HttpError(400, 'Vul een naam in.')
    fields.Naam = naam
  }

  if (body?.['E-mail'] !== undefined) {
    const email = eisAdres(body['E-mail'])
    await eisUniekAdres(email, id)
    fields['E-mail'] = email
  }

  if (body?.Status !== undefined) {
    if (!['Actief', 'Geblokkeerd'].includes(body.Status)) {
      throw new HttpError(400, 'Status moet Actief of Geblokkeerd zijn.')
    }
    fields.Status = body.Status
  }

  if (body?.['Verloopt op'] !== undefined) fields['Verloopt op'] = body['Verloopt op'] || null

  // De opdrachtgever en de vacatures horen bij elkaar: verhuist de een, dan
  // moet de ander opnieuw worden gecontroleerd. Ze worden daarom samen getoetst
  // tegen de eindsituatie, niet los tegen de oude.
  const opdrachtgeverId = body?.Opdrachtgever !== undefined
    ? first(body.Opdrachtgever)
    : first(huidig.fields.Opdrachtgever)
  const vacatureIds = body?.Vacatures !== undefined
    ? body.Vacatures
    : (huidig.fields.Vacatures ?? [])

  if (body?.Opdrachtgever !== undefined || body?.Vacatures !== undefined) {
    if (!opdrachtgeverId) throw new HttpError(400, 'Kies een opdrachtgever.')
    await eisEigenVacatures(opdrachtgeverId, vacatureIds)
    fields.Opdrachtgever = [opdrachtgeverId]
    fields.Vacatures = vacatureIds
  }

  // Een nieuw wachtwoord heft een tijdelijke blokkade op. Wie een nieuw
  // wachtwoord doorgeeft wil dat de klant er meteen in kan, niet pas na een
  // kwartier wachten op een teller die van iemand anders is.
  let wachtwoord = null
  if (body?.nieuwWachtwoord === true) {
    const nieuw = await nieuwWachtwoordVelden()
    wachtwoord = nieuw.wachtwoord
    Object.assign(fields, nieuw.velden)
  }

  if (Object.keys(fields).length === 0) throw new HttpError(400, 'Geen bij te werken velden meegegeven.')

  const record = await updateRecord(TABLES.portaalgebruikers, id, fields)
  return { portaalgebruiker: platteGebruiker(record), wachtwoord }
}
