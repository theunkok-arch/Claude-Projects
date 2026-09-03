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
  updateRecord,
  json,
  fail,
  requireKey,
  today,
} from '../lib/airtable.mjs'
import { wijzigStage } from './ats.mjs'
import { ALLE_AFVAL_REDENEN, STAGE_IDS, isKlantZichtbaar } from '../../shared/stages.mjs'
import { GEBEURTENISSEN } from '../../shared/mapping.mjs'

export const config = { path: '/api/outreach' }

/**
 * De vertaaltabel tussen het framework en de ATS, uit config/ats-mapping.json.
 *
 * Deze twee spreken niet dezelfde taal. Het framework kent `Reactie` en
 * `Gesprek` waar de ATS `Gereageerd` en `Gesproken` zegt, en `Shortlist`
 * betekent in de twee lijsten iets heel anders: in het framework is het een
 * kandidaat die nog benaderd moet worden, in de ATS iemand die al gesproken is.
 * Die verwarring heeft eerder 25 kandidaten in de verkeerde fase gezet.
 *
 * Daarom accepteert dit eindpunt geen ATS-fasenamen maar gebeurtenissen: wat
 * er is gebeurd, niet waar iemand daarna hoort te staan. De vertaling stond
 * hier in code en staat nu in het bestand dat het importscript ook leest, want
 * twee kopieën van dezelfde tabel is hoe ze uit elkaar lopen.
 */


/**
 * De natuurlijke volgorde van de pijplijn. Afgevallen staat er bewust buiten:
 * daar kun je vanuit elke stage heen, en er is geen weg terug via dit
 * eindpunt.
 */
export const VOLGORDE = STAGE_IDS.filter((stage) => stage !== 'Afgevallen')

/** Een datum zonder tijd, zoals Airtable hem in een datumveld wil. */
const ISO_DAG = /^\d{4}-\d{2}-\d{2}$/

/**
 * Mag deze stap? Vooruit wel, ook meerdere treden tegelijk: een kandidaat die
 * rechtstreeks van Gesproken naar Voorgesteld gaat heeft de shortlist gewoon
 * overgeslagen, en dat is een echte gang van zaken en geen fout.
 *
 * Terug niet. Een agent die een oude melding opnieuw verstuurt zou anders een
 * kandidaat die al bij de klant op gesprek is geweest terugzetten naar
 * Gesproken, en de servicenormklok opnieuw laten lopen. Terugzetten is een
 * beslissing van een mens, in de ATS zelf.
 */
export function controleerVolgorde(vanStage, naarStage) {
  if (vanStage === naarStage) return 'ongewijzigd'
  if (naarStage === 'Afgevallen') return 'vooruit'
  if (vanStage === 'Afgevallen') {
    throw new HttpError(409, 'Kandidaat is afgevallen; heropenen doe je in de ATS zelf.')
  }

  const van = VOLGORDE.indexOf(vanStage)
  const naar = VOLGORDE.indexOf(naarStage)
  // Een aanmelding zonder stage, of met een stage die de app niet kent, is
  // geen stap terug. Die laten we vooruit gaan in plaats van hem te blokkeren
  // op een vergelijking met -1.
  if (van === -1) return 'vooruit'
  if (naar < van) {
    throw new HttpError(409, `Aanmelding staat al op ${vanStage}; terugzetten doe je in de ATS zelf.`)
  }
  return 'vooruit'
}

/**
 * De twee nieuwe velden horen bij bepaalde gebeurtenissen en niet bij andere.
 *
 * Ze gaan verschillend om met een misplaatste waarde, en dat is met opzet.
 * `interviewdatum` bij `aanbod` is een vergissing met gevolgen: de datum zou
 * nergens landen en de agent denkt dat hij hem heeft doorgegeven. Dat wordt
 * een 400. `zichtbaarVoorKlant` bij een vroege gebeurtenis is niet gevaarlijk
 * maar wel zinloos, want het vinkje gaat pas aan bij Voorgesteld; dat wordt
 * genegeerd, en het antwoord zegt dat erbij zodat het niet stil gebeurt.
 */
export function controleerVelden(gebeurtenis, naarStage, body) {
  const genegeerd = []

  const interviewdatum = String(body?.interviewdatum ?? '').trim()
  if (interviewdatum) {
    if (gebeurtenis !== 'interview klant') {
      throw new HttpError(
        400,
        'interviewdatum hoort alleen bij de gebeurtenis "interview klant".',
      )
    }
    if (!ISO_DAG.test(interviewdatum)) {
      throw new HttpError(400, 'interviewdatum moet een datum zijn in de vorm JJJJ-MM-DD.')
    }
  }

  if (body?.zichtbaarVoorKlant !== undefined && !isKlantZichtbaar(naarStage)) {
    genegeerd.push('zichtbaarVoorKlant')
  }

  return { genegeerd, interviewdatum: interviewdatum || null }
}

/**
 * Het kanaal bepaalt het soort activiteit. Alleen deze drie: de rest van de
 * keuzelijst (Reminder, Teams, Notitie) hoort bij handmatig loggen in de app,
 * en een onbekend kanaal wordt gewoon een statuswijziging in plaats van een
 * nieuwe optie in Airtable.
 */
export function activiteitTypeVoor(kanaal) {
  const tekst = String(kanaal ?? '').trim().toLowerCase()
  if (tekst === 'inmail') return 'InMail'
  if (tekst === 'e-mail' || tekst === 'email' || tekst === 'mail') return 'E-mail'
  if (tekst === 'telefoon' || tekst === 'bellen' || tekst === 'phone') return 'Telefoon'
  return 'Statuswijziging'
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

  const { genegeerd, interviewdatum } = controleerVelden(gebeurtenis, naarStage, body)

  const { aanmelding, kandidaat } = await zoekAanmelding(url, body?.opdrachtgever, body?.vacature)
  const vanStage = aanmelding.fields.Stage ?? null

  // Al in de juiste fase is geen fout maar een herhaling. Een cron die
  // opnieuw draait, of een follow-up die twee keer wordt gelogd, hoort geen
  // rood scherm op te leveren — dan gaat iemand het script "repareren".
  if (controleerVolgorde(vanStage, naarStage) === 'ongewijzigd') {
    return antwoord({ ongewijzigd: true, aanmelding: aanmelding.id, fase: naarStage, genegeerd })
  }

  const datum = ISO_DAG.test(String(body?.datum ?? '').trim()) ? String(body.datum).trim() : today()

  const resultaat = await wijzigStage({
    aanmeldingId: aanmelding.id,
    naarStage,
    redenAfvallen: body?.redenAfvallen,
    notitie: notitie(body, gebeurtenis, interviewdatum, datum),
    // De afspraak met de klant komt in Volgende actie te staan, zodat hij op
    // de kaart en in het maandagoverzicht zichtbaar is en niet alleen in de
    // historie.
    ...(interviewdatum ? { volgendeActie: `Interview klant op ${interviewdatum}` } : {}),
    doorWie: 'Cowork-agent',
    activiteitType: activiteitTypeVoor(body?.kanaal),
    activiteitDatum: datum,
  })

  // Geplaatst is het laatste echte contactmoment van de search. Zonder deze
  // regel blijft de AVG-bewaartermijn hangen op de dag van de laatste InMail.
  if (naarStage === 'Geplaatst' && kandidaat) {
    await updateRecord(TABLES.kandidaten, kandidaat.id, { 'Laatste contact': datum })
  }

  return antwoord({
    ongewijzigd: false,
    aanmelding: aanmelding.id,
    fase: naarStage,
    van: vanStage,
    naar: naarStage,
    genegeerd,
    zichtbaarVoorKlant: resultaat.aanmelding?.fields?.['Zichtbaar voor klant'] === true,
    ...resultaat,
  })
}

/**
 * Eén vorm voor elk antwoord.
 *
 * `ok` en `fase` zijn wat de skills lezen; `ongewijzigd`, `van` en `naar`
 * stonden er al en blijven staan, zodat wie het eindpunt vandaag aanroept er
 * geen last van heeft. `zichtbaarVoorKlant` staat er altijd in, ook als het
 * veld niet is meegestuurd: de skill wil kunnen bevestigen dat het portaal de
 * kandidaat nu toont, en "niet in het antwoord" is daar geen antwoord op.
 */
export function antwoord({ genegeerd, zichtbaarVoorKlant, fase, ...rest }) {
  return {
    ok: true,
    fase,
    ...rest,
    zichtbaarVoorKlant: zichtbaarVoorKlant ?? isKlantZichtbaar(fase),
    ...(genegeerd?.length ? { genegeerd } : {}),
  }
}

export function notitie(body, gebeurtenis, interviewdatum, datum) {
  const delen = [
    `Outreach: ${gebeurtenis}`,
    body?.kanaal ? `via ${body.kanaal}` : null,
    `op ${datum ?? body?.datum ?? today()}`,
  ].filter(Boolean)
  const kop = interviewdatum ? `${delen.join(' ')}. Interview op ${interviewdatum}` : delen.join(' ')
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
  return { aanmelding: eigen[0], kandidaat }
}
