// Terugkoppeling van de outreach naar de ATS, op POST /api/outreach.
//
// De outreach-skill draait in Cowork en logde tot nu toe elke verzending in
// kandidaten.xlsx. Daardoor stond de waarheid over "is deze persoon al
// benaderd" op twee plekken, en liep de base stil achter zodra er een
// follow-upronde was gedraaid. Dit eindpunt is de brug.
//
// Waarom een eigen functie met een eigen sleutel, en niet gewoon een route in
// ats.mjs:
//
// 1. **De Airtable-key blijft waar hij hoort.** Het alternatief was de skill
//    rechtstreeks met Airtable laten praten, maar dan staat er een tweede
//    kopie van een token met lees- en schrijfrechten op honderden
//    kandidaatdossiers in een omgeving buiten Netlify. Dat is precies wat de
//    README verbiedt.
//
// 2. **Zo min mogelijk macht per sleutel.** `ATS_APP_PASSWORD` opent de hele
//    interne API: alle kandidaten lezen, alles wijzigen, alles verwijderen.
//    Die in een scriptomgeving leggen is erger dan het probleem. `OUTREACH_KEY`
//    kan precies één ding: de fase van een bestaande aanmelding verzetten en
//    dat loggen. Lekt hij, dan kan iemand kandidaten als benaderd markeren.
//    Vervelend, en van een andere orde dan vijfhonderd dossiers.
//
// 3. **Er is geen tweede route.** Het pad is `/api/outreach`, zonder sterretje.
//    Er valt niets anders aan te roepen.

import {
  TABLES,
  HttpError,
  listAll,
  json,
  fail,
  requireKey,
  today,
} from '../lib/airtable.mjs'
import { wijzigStage } from './ats.mjs'
import { ALLE_AFVAL_REDENEN } from '../../shared/stages.mjs'

export const config = { path: '/api/outreach' }

/**
 * De vertaaltabel tussen het framework en de ATS, op één plek.
 *
 * Deze twee spreken niet dezelfde taal. Het framework kent `Reactie` en
 * `Gesprek` waar de ATS `Gereageerd` en `Gesproken` zegt, en `Shortlist`
 * betekent in de twee lijsten iets heel anders: in het framework is het een
 * kandidaat die nog benaderd moet worden, in de ATS iemand die al gesproken is.
 * Die verwarring heeft eerder 25 kandidaten in de verkeerde fase gezet.
 *
 * Daarom accepteert dit eindpunt geen ATS-fasenamen maar gebeurtenissen: wat
 * er is gebeurd, niet waar iemand daarna hoort te staan. De vertaling gebeurt
 * hier, één keer, in code die je kunt lezen.
 */
const GEBEURTENISSEN = {
  'eerste bericht': 'Benaderd',
  'follow-up': 'Opgevolgd',
  reactie: 'Gereageerd',
  gesproken: 'Gesproken',
  afgevallen: 'Afgevallen',
}

export default async (req) => {
  try {
    requireKey(req, 'x-outreach-key', 'OUTREACH_KEY')
    if (req.method !== 'POST') throw new HttpError(405, 'Alleen POST.')
    return json(200, await verwerk(await req.json().catch(() => ({}))))
  } catch (error) {
    return fail(error)
  }
}

/**
 * Twee LinkedIn-URL's die dezelfde persoon aanwijzen zien er zelden hetzelfde
 * uit: met of zonder `www`, met een `?utm_source=` erachter, met of zonder
 * afsluitende schuine streep. De base bewaart wat de search er ooit in zette,
 * de skill stuurt wat er in de sheet staat, en een letterlijke vergelijking
 * zou daar stilzwijgend op stuklopen — het eindpunt zou dan netjes antwoorden
 * dat de kandidaat niet bestaat, en niemand die het merkt.
 */
export function normaliseerUrl(ruw) {
  return String(ruw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[?#]/)[0]
    .replace(/\/+$/, '')
}

async function verwerk(body) {
  const gebeurtenis = String(body?.gebeurtenis ?? '').trim().toLowerCase()
  const naarStage = GEBEURTENISSEN[gebeurtenis]
  if (!naarStage) {
    throw new HttpError(
      400,
      `Onbekende gebeurtenis "${body?.gebeurtenis}". Kies uit: ${Object.keys(GEBEURTENISSEN).join(', ')}.`,
    )
  }

  const url = normaliseerUrl(body?.linkedinUrl)
  if (!url) throw new HttpError(400, 'linkedinUrl ontbreekt.')

  if (naarStage === 'Afgevallen' && !ALLE_AFVAL_REDENEN.includes(body?.redenAfvallen)) {
    throw new HttpError(
      400,
      'Afgevallen kan alleen met een reden uit de vaste lijst. Verzin er nooit zelf een.',
    )
  }

  const aanmelding = await zoekAanmelding(url, body?.opdrachtgever, body?.vacature)

  // Al in de juiste fase is geen fout maar een herhaling. Een cron die
  // opnieuw draait, of een follow-up die twee keer wordt gelogd, hoort geen
  // rood scherm op te leveren — dan gaat iemand het script "repareren".
  if (aanmelding.fields.Stage === naarStage) {
    return { ongewijzigd: true, aanmelding: aanmelding.id, fase: naarStage }
  }

  const resultaat = await wijzigStage({
    aanmeldingId: aanmelding.id,
    naarStage,
    redenAfvallen: body?.redenAfvallen,
    notitie: notitie(body, gebeurtenis),
  })

  return { ongewijzigd: false, aanmelding: aanmelding.id, van: aanmelding.fields.Stage ?? null, naar: naarStage, ...resultaat }
}

function notitie(body, gebeurtenis) {
  const delen = [
    `Outreach: ${gebeurtenis}`,
    body?.kanaal ? `via ${body.kanaal}` : null,
    body?.datum ? `op ${body.datum}` : `op ${today()}`,
  ].filter(Boolean)
  const kop = delen.join(' ')
  return body?.notitie ? `${kop}\n\n${body.notitie}` : kop
}

/**
 * Van een LinkedIn-URL naar precies één aanmelding.
 *
 * Een kandidaat kan bij meerdere vacatures lopen — dat is het hele punt van
 * het datamodel. Staat hij er meer dan één, dan moet de aanroeper zeggen
 * welke; raden zou betekenen dat een follow-up voor de ene rol de fase van de
 * andere verzet.
 */
async function zoekAanmelding(url, opdrachtgeverNaam, vacatureTitel) {
  const kandidaten = await listAll(TABLES.kandidaten, { fields: ['Naam', 'LinkedIn-URL'] })
  const kandidaat = kandidaten.find((k) => normaliseerUrl(k.fields['LinkedIn-URL']) === url)
  if (!kandidaat) throw new HttpError(404, `Geen kandidaat met LinkedIn-URL ${url} in de ATS.`)

  const [aanmeldingen, vacatures, opdrachtgevers] = await Promise.all([
    listAll(TABLES.aanmeldingen, { fields: ['Aanmelding', 'Stage', 'Kandidaat', 'Vacature'] }),
    listAll(TABLES.vacatures, { fields: ['Titel', 'Opdrachtgever'] }),
    listAll(TABLES.opdrachtgevers, { fields: ['Naam'] }),
  ])

  const vacatureById = new Map(vacatures.map((v) => [v.id, v]))
  const klantById = new Map(opdrachtgevers.map((o) => [o.id, o.fields.Naam ?? '']))
  const gelijk = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()

  let eigen = aanmeldingen.filter((a) => (a.fields.Kandidaat ?? []).includes(kandidaat.id))

  if (vacatureTitel) {
    eigen = eigen.filter((a) => gelijk(vacatureById.get((a.fields.Vacature ?? [])[0])?.fields?.Titel, vacatureTitel))
  }
  if (opdrachtgeverNaam) {
    eigen = eigen.filter((a) => {
      const vacature = vacatureById.get((a.fields.Vacature ?? [])[0])
      return gelijk(klantById.get((vacature?.fields?.Opdrachtgever ?? [])[0]), opdrachtgeverNaam)
    })
  }

  if (eigen.length === 0) {
    throw new HttpError(
      404,
      `${kandidaat.fields.Naam ?? url} staat in de ATS, maar niet bij deze vacature. Is de lijst al geïmporteerd?`,
    )
  }
  if (eigen.length > 1) {
    const namen = eigen.map((a) => a.fields.Aanmelding ?? a.id).join(', ')
    throw new HttpError(
      409,
      `${kandidaat.fields.Naam ?? url} loopt bij meerdere vacatures (${namen}). Geef opdrachtgever en vacature mee.`,
    )
  }
  return eigen[0]
}
