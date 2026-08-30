// Het klantportaal op /api/portal/*. Alleen lezen.
//
// Dit is de enige plek waar data het systeem verlaat richting een
// buitenstaander. Twee dingen bepalen het ontwerp:
//
// 1. **Er is geen route die ATS-data wijzigt.** Niet uitgeschakeld, niet
//    achter een controle — er bestaat geen code voor. Een klantsessie kan geen
//    stage verzetten omdat er niets is dat dat doet, niet omdat een `if` het
//    tegenhoudt. Eén vergeten tak in een gedeelde router is precies hoe een
//    opdrachtgever schrijfrechten krijgt, en die tak kan hier niet ontstaan.
//
//    Geschreven wordt er wél, op precies één plek: `login` werkt het
//    loginlogboek van de gebruiker zelf bij (laatste login, mislukte
//    pogingen, blokkade). Dat raakt geen kandidaat, geen aanmelding en geen
//    vacature, en het gebeurt buiten elk verzoek van de gebruiker om.
//
// 2. **Elk veld dat naar buiten gaat staat hieronder met de hand genoemd.**
//    Nergens een `...fields`. Zet iemand morgen een veld `Interne notitie` op
//    Aanmeldingen, dan komt dat niet vanzelf mee. Bij de kandidaten gaat het
//    nog een stap verder: de velden die de klant nooit mag zien worden niet
//    eens opgehaald bij Airtable. Wat er niet is, kan ook niet lekken.

import {
  TABLES,
  HttpError,
  listAll,
  getRecord,
  updateRecord,
  json,
  fail,
  today,
} from '../lib/airtable.mjs'
import {
  COOKIE,
  cookieUitHeader,
  hashWachtwoord,
  klopt,
  leesSessie,
  maakSessie,
  nieuweSalt,
  sessieCookie,
  wisCookie,
} from '../lib/portaal.mjs'
import { FUNNEL_STAGES, STAGE_IDS, dagenTussen } from '../../shared/stages.mjs'
import { initialen } from '../../shared/klantweergave.mjs'

export const config = { path: '/api/portal/*' }

/** Vijf missers, dan een kwartier op slot. */
const MAX_POGINGEN = 5
const BLOKKADE_MINUTEN = 15

export default async (req) => {
  try {
    const url = new URL(req.url)
    const segment = url.pathname.replace(/^\/api\/portal\/?/, '').split('/')[0] ?? ''

    switch (`${req.method} ${segment}`) {
      case 'POST login':
        return await login(req)

      case 'POST logout':
        return metCookie(json(200, { ok: true }), wisCookie())

      case 'GET overzicht':
        return json(200, await overzicht(await huidigeGebruiker(req)))

      default:
        throw new HttpError(404, 'Onbekend adres.')
    }
  } catch (error) {
    return fail(error)
  }
}

function metCookie(response, cookie) {
  const headers = new Headers(response.headers)
  headers.append('Set-Cookie', cookie)
  return new Response(response.body, { status: response.status, headers })
}

// ---------------------------------------------------------------------------
// Inloggen
// ---------------------------------------------------------------------------

/**
 * Eén melding voor elke afwijzing die met de inloggegevens te maken heeft.
 * "Dit adres kennen we niet" maakt van het inlogscherm een klantenlijst.
 */
const AFGEWEZEN = 'Onjuiste combinatie van e-mailadres en wachtwoord.'

/**
 * De hele tabel ophalen en in JavaScript zoeken, in plaats van met een
 * filterByFormula op het e-mailadres. Dat adres komt van buiten, en een
 * Airtable-formule is een taal: er hoort geen invoer van een onbekende in
 * geplakt te worden. Het gaat om een handvol records.
 */
async function zoekGebruiker(email) {
  const gezocht = normaliseer(email)
  if (!gezocht) return null
  const alle = await listAll(TABLES.portaalgebruikers)
  return alle.find((g) => normaliseer(g.fields['E-mail']) === gezocht) ?? null
}

const normaliseer = (waarde) => String(waarde ?? '').trim().toLowerCase()

async function login(req) {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '')
  const wachtwoord = String(body.wachtwoord ?? '')

  if (!email || !wachtwoord) throw new HttpError(400, 'Vul je e-mailadres en wachtwoord in.')

  const gebruiker = await zoekGebruiker(email)

  if (gebruiker && opSlot(gebruiker)) {
    throw new HttpError(429, `Te veel pogingen. Probeer het over ${BLOKKADE_MINUTEN} minuten opnieuw.`)
  }

  // Ook zonder gevonden gebruiker één keer scrypt draaien. Zonder dit is het
  // verschil in antwoordtijd tussen een bestaand en een onbekend adres groot
  // genoeg om de klantenlijst mee af te lezen.
  const juist = gebruiker
    ? await klopt(wachtwoord, gebruiker.fields.Salt, gebruiker.fields['Wachtwoord-hash'])
    : await hashWachtwoord(wachtwoord, nieuweSalt()).then(() => false)

  if (!juist) {
    if (gebruiker) await telMisserOp(gebruiker)
    throw new HttpError(401, AFGEWEZEN)
  }

  // Pas ná een juist wachtwoord mag het antwoord specifiek worden. Wie het
  // wachtwoord kent, mag horen waarom hij er alsnog niet in komt — dat scheelt
  // een telefoontje, en het verraadt niets aan iemand die zit te raden.
  if (gebruiker.fields.Status === 'Geblokkeerd') {
    throw new HttpError(403, 'Deze toegang is ingetrokken. Neem contact op met Do Solutions.')
  }
  const verloopt = gebruiker.fields['Verloopt op']
  if (verloopt && verloopt < today()) {
    throw new HttpError(403, `Deze toegang is verlopen op ${verloopt}. Vraag Do Solutions om een nieuwe.`)
  }

  await updateRecord(TABLES.portaalgebruikers, gebruiker.id, {
    'Mislukte pogingen': 0,
    'Geblokkeerd tot': null,
    'Laatste login': today(),
  })

  return metCookie(
    json(200, { naam: gebruiker.fields.Naam ?? null }),
    sessieCookie(maakSessie(gebruiker.id)),
  )
}

function opSlot(gebruiker) {
  const tot = gebruiker.fields['Geblokkeerd tot']
  return Boolean(tot) && new Date(tot).getTime() > Date.now()
}

async function telMisserOp(gebruiker) {
  const pogingen = Number(gebruiker.fields['Mislukte pogingen'] ?? 0) + 1
  const velden = { 'Mislukte pogingen': pogingen }
  if (pogingen >= MAX_POGINGEN) {
    velden['Geblokkeerd tot'] = new Date(Date.now() + BLOKKADE_MINUTEN * 60_000).toISOString()
    velden['Mislukte pogingen'] = 0
  }
  await updateRecord(TABLES.portaalgebruikers, gebruiker.id, velden)
}

// ---------------------------------------------------------------------------
// De sessie omzetten naar een gebruiker
// ---------------------------------------------------------------------------

/**
 * Het record wordt bij elk verzoek opnieuw gelezen, niet uit het cookie
 * afgeleid. Daardoor werkt intrekken meteen: zet de status op Geblokkeerd en
 * de eerstvolgende klik is de laatste, ook al loopt de sessie nog acht uur.
 */
async function huidigeGebruiker(req) {
  const id = leesSessie(cookieUitHeader(req.headers.get('cookie'), COOKIE))
  if (!id) throw new HttpError(401, 'Je bent niet ingelogd.')

  const gebruiker = await getRecord(TABLES.portaalgebruikers, id).catch(() => null)
  if (!gebruiker) throw new HttpError(401, 'Je bent niet ingelogd.')
  if (gebruiker.fields.Status === 'Geblokkeerd') throw new HttpError(403, 'Deze toegang is ingetrokken.')

  const verloopt = gebruiker.fields['Verloopt op']
  if (verloopt && verloopt < today()) throw new HttpError(403, 'Deze toegang is verlopen.')

  return gebruiker
}

// ---------------------------------------------------------------------------
// Het overzicht
// ---------------------------------------------------------------------------

/**
 * Velden van Kandidaten die het portaal ooit kan tonen. Alles daarbuiten —
 * e-mail, telefoon, LinkedIn, Instagram, opleiding, bron, notities, de
 * AVG-velden — wordt niet opgehaald. Niet gefilterd: niet opgehaald.
 */
const KANDIDAAT_VELDEN = ['Naam', 'Huidige rol', 'Huidige werkgever', 'Woonplaats']

async function overzicht(gebruiker) {
  const eigenaar = (gebruiker.fields.Opdrachtgever ?? [])[0]

  // Geen opdrachtgever of een lege vacaturelijst betekent geen toegang tot
  // iets. Dat is de veilige kant: een half ingevuld record hoort niets te
  // openen in plaats van alles. Ook scheelt het vier verzoeken aan Airtable.
  if (!eigenaar || (gebruiker.fields.Vacatures ?? []).length === 0) {
    return bouwOverzicht({ gebruiker, opdrachtgever: null, vandaag: today() })
  }

  const [opdrachtgever, vacatures, aanmeldingen, kandidaten, stagelog] = await Promise.all([
    getRecord(TABLES.opdrachtgevers, eigenaar).catch(() => null),
    listAll(TABLES.vacatures),
    listAll(TABLES.aanmeldingen),
    listAll(TABLES.kandidaten, { fields: KANDIDAAT_VELDEN }),
    listAll(TABLES.stagelog, { fields: ['Aanmelding', 'Naar stage'] }),
  ])

  return bouwOverzicht({
    gebruiker,
    opdrachtgever,
    vacatures,
    aanmeldingen,
    kandidaten,
    stagelog,
    vandaag: today(),
  })
}

/**
 * Het antwoord opbouwen uit records die er al zijn.
 *
 * Los van het ophalen, en daarom als enige deel van dit bestand te testen
 * zonder de echte base aan te raken. Dat is geen nettigheid: dít is de functie
 * die bepaalt welk veld een buitenstaander te zien krijgt, en die verdient een
 * toets die de verboden velden er expliciet in zoekt.
 */
export function bouwOverzicht({
  gebruiker,
  opdrachtgever,
  vacatures = [],
  aanmeldingen = [],
  kandidaten = [],
  stagelog = [],
  vandaag,
}) {
  const eigenaar = (gebruiker.fields.Opdrachtgever ?? [])[0]
  const toegestaan = new Set(gebruiker.fields.Vacatures ?? [])

  const kop = {
    gebruiker: gebruiker.fields.Naam ?? null,
    opdrachtgever: opdrachtgever?.fields?.Naam ?? null,
    vandaag,
  }
  if (!eigenaar || toegestaan.size === 0) return { ...kop, vacatures: [] }

  // De dubbele grendel: in de toegestane lijst *én* van de eigen opdrachtgever.
  // Belandt er door een vergissing een vacature van een andere klant in de
  // lijst, dan valt die hier alsnog af.
  const eigen = vacatures.filter(
    (v) => toegestaan.has(v.id) && (v.fields.Opdrachtgever ?? []).includes(eigenaar),
  )

  const kandidaatById = new Map(kandidaten.map((k) => [k.id, k.fields]))
  const logPerAanmelding = groepeer(stagelog, (r) => (r.fields.Aanmelding ?? [])[0])

  return {
    ...kop,
    vacatures: eigen.map((vacature) => {
      const eigenAanmeldingen = aanmeldingen.filter((a) =>
        (a.fields.Vacature ?? []).includes(vacature.id),
      )
      const lopend = eigenAanmeldingen.filter((a) => a.fields.Stage !== 'Afgevallen')

      return {
        id: vacature.id,
        titel: vacature.fields.Titel ?? null,
        status: vacature.fields.Status ?? null,
        standplaats: vacature.fields.Standplaats ?? null,
        startdatum: vacature.fields.Startdatum ?? null,
        streefdatumShortlist: vacature.fields['Streefdatum shortlist'] ?? null,
        totaal: eigenAanmeldingen.length,
        funnel: funnel(eigenAanmeldingen, logPerAanmelding),
        afgevallen: afvalRedenen(eigenAanmeldingen),
        kandidaten: lopend
          .map((a) => kandidaatregel(a, kandidaatById, vandaag))
          .sort(
            (a, b) =>
              STAGE_IDS.indexOf(b.fase) - STAGE_IDS.indexOf(a.fase) || (b.score ?? -1) - (a.score ?? -1),
          ),
      }
    }),
  }
}

/**
 * Anoniem, tenzij de aanmelding is vrijgegeven.
 *
 * Standaard krijgt de klant initialen en een functietitel. Zet Dominique op de
 * aanmelding `Zichtbaar voor klant` aan, dan komen naam, werkgever en
 * woonplaats erbij — per kandidaat, bewust, en pas als de kandidaat weet dat
 * hij wordt voorgedragen. Dezelfde afspraak die de kandidaat-profiel skill al
 * hanteert.
 *
 * Contactgegevens komen er in geen van beide standen bij; die staan niet eens
 * in `kandidaatById`.
 */
function kandidaatregel(aanmelding, kandidaatById, vandaag) {
  const kandidaat = kandidaatById.get((aanmelding.fields.Kandidaat ?? [])[0]) ?? {}
  const vrijgegeven = Boolean(aanmelding.fields['Zichtbaar voor klant'])

  return {
    id: aanmelding.id,
    initialen: initialen(kandidaat.Naam),
    huidigeRol: kandidaat['Huidige rol'] ?? null,
    fase: aanmelding.fields.Stage ?? null,
    score: aanmelding.fields['Score totaal'] ?? null,
    dagenInFase: dagenTussen(aanmelding.fields['Datum in huidige stage'], vandaag),
    vrijgegeven,
    naam: vrijgegeven ? (kandidaat.Naam ?? null) : null,
    huidigeWerkgever: vrijgegeven ? (kandidaat['Huidige werkgever'] ?? null) : null,
    woonplaats: vrijgegeven ? (kandidaat.Woonplaats ?? null) : null,
  }
}

/**
 * Cumulatieve funnel: wie op Voorgesteld staat is ooit Benaderd geweest en telt
 * dus in elke trede daaronder mee. Zonder dat leest de trechter als een
 * momentopname. Bij Afgevallen zegt het veld Stage niets meer over hoe ver
 * iemand kwam; de stagelog wel.
 */
function funnel(aanmeldingen, logPerAanmelding) {
  const hoogste = new Map(
    aanmeldingen.map((a) => {
      const indices = (logPerAanmelding.get(a.id) ?? [])
        .map((r) => FUNNEL_STAGES.indexOf(r.fields['Naar stage']))
        .filter((i) => i >= 0)
      const nu = FUNNEL_STAGES.indexOf(a.fields.Stage)
      if (nu >= 0) indices.push(nu)
      // Terugvallen op 0 en niet op -1. Een aanmelding die is afgevallen
      // voordat er ooit een stagewijziging werd gelogd, staat op `Afgevallen`
      // — en dat is geen trede, dus levert de zoekactie hierboven niets op.
      // Zonder deze ondergrens verdwijnt zo iemand uit de hele trechter,
      // terwijl elke aanmelding per definitie een keer is gescoord.
      return [a.id, indices.length > 0 ? Math.max(...indices) : 0]
    }),
  )

  return FUNNEL_STAGES.map((stage, index) => ({
    fase: stage,
    bereikt: aanmeldingen.filter((a) => hoogste.get(a.id) >= index).length,
    nuHier: aanmeldingen.filter((a) => a.fields.Stage === stage).length,
  }))
}

/**
 * Afgevallen kandidaten alleen als telling per reden, nooit als rij.
 *
 * Een afvalreden is een oordeel over een persoon. Geteld laat het zien waar de
 * search op stukloopt — dat is precies wat een opdrachtgever moet weten. Per
 * naam zou het iets heel anders zijn.
 */
function afvalRedenen(aanmeldingen) {
  const tellingen = new Map()
  for (const a of aanmeldingen) {
    if (a.fields.Stage !== 'Afgevallen') continue
    const reden = a.fields['Reden afvallen'] ?? 'Niet vastgelegd'
    tellingen.set(reden, (tellingen.get(reden) ?? 0) + 1)
  }
  return [...tellingen.entries()]
    .map(([reden, aantal]) => ({ reden, aantal }))
    .sort((a, b) => b.aantal - a.aantal)
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
