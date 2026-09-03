// Toets op het klantportaal. Draait met `npm test`, zonder netwerk en zonder
// de echte base: alles wat hier getoetst wordt is bewust losgetrokken van het
// ophalen.
//
// De belangrijkste toets is niet dat de goede velden erin zitten. Dat is met
// het oog te zien. De belangrijkste toets is dat de verboden velden er niet
// uit komen, ook niet als er nieuwe velden in de base bij komen, en ook niet
// bij een gebruiker die verkeerd is ingesteld. Daar staat de lijst
// VERBODEN voor: die zoekt de waarden zelf terug in het antwoord, niet de
// veldnamen. Een veld hernoemen laat deze toets dus niet stil worden.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { bouwOverzicht } from '../../netlify/functions/portal.mjs'
import {
  genereerWachtwoord,
  hashWachtwoord,
  klopt,
  leesSessie,
  maakSessie,
  nieuweSalt,
  cookieUitHeader,
  sessieCookie,
  SESSIE_SECONDEN,
} from '../../netlify/lib/portaal.mjs'

process.env.PORTAL_SESSION_SECRET ??= 'toets-geheim-dat-lang-genoeg-is-om-te-gebruiken'

// --- opstelling ------------------------------------------------------------

const RS = 'recOpdrachtgeverRS'
const NM = 'recOpdrachtgeverNM'

const gebruiker = (velden) => ({ id: 'recGebruiker00001', fields: { Naam: 'Jeroen de Wit', ...velden } })

const opdrachtgever = { id: RS, fields: { Naam: 'Royal Sanders' } }

const vacatures = [
  { id: 'recVacFT', fields: { Titel: 'Formulation Technologist', Status: 'Actief', Standplaats: 'Vlijmen', Opdrachtgever: [RS], 'Salaris min': 4000, 'Salaris max': 5500, Scoringsdrempel: 70, Jobspec: 'intern', Validatie: 'iets interns' } },
  { id: 'recVacBM', fields: { Titel: 'Brand Manager', Status: 'Actief', Opdrachtgever: [RS] } },
  { id: 'recVacSNA', fields: { Titel: 'SNA inspecteur', Status: 'Actief', Opdrachtgever: [NM] } },
]

const kandidaten = [
  { id: 'recK1', fields: { Naam: 'Yurita Yona Boodhram', 'Huidige rol': 'Formulator', 'Huidige werkgever': 'Concurrent BV', Woonplaats: 'Eindhoven' } },
  { id: 'recK2', fields: { Naam: 'Jan de Vries', 'Huidige rol': 'Lab Technician', 'Huidige werkgever': 'Ander BV', Woonplaats: 'Tilburg' } },
  { id: 'recK3', fields: { Naam: 'Chen', 'Huidige rol': 'R&D Chemist', 'Huidige werkgever': 'Derde BV', Woonplaats: 'Breda' } },
]

const GEHEIME_TEKST = 'INTERNE ONDERBOUWING DIE NOOIT NAAR BUITEN MAG'

const aanmeldingen = [
  { id: 'recA1', fields: { Vacature: ['recVacFT'], Kandidaat: ['recK1'], Stage: 'Aanbod', 'Score totaal': 88, 'Zichtbaar voor klant': true, 'Datum in huidige stage': '2026-08-20', 'Score-onderbouwing': GEHEIME_TEKST, 'Outreach-concept': GEHEIME_TEKST, Opmerkingen: GEHEIME_TEKST, Concurrent: true, 'Reistijd minuten': 45 } },
  { id: 'recA2', fields: { Vacature: ['recVacFT'], Kandidaat: ['recK2'], Stage: 'Gescoord', 'Score totaal': 71, 'Datum in huidige stage': '2026-08-25', 'Score-onderbouwing': GEHEIME_TEKST } },
  { id: 'recA3', fields: { Vacature: ['recVacFT'], Kandidaat: ['recK3'], Stage: 'Afgevallen', 'Reden afvallen': 'Salariswens te hoog', 'Score totaal': 64 } },
  { id: 'recA4', fields: { Vacature: ['recVacFT'], Kandidaat: ['recK2'], Stage: 'Afgevallen', 'Reden afvallen': 'Salariswens te hoog' } },
  { id: 'recA5', fields: { Vacature: ['recVacSNA'], Kandidaat: ['recK3'], Stage: 'Voorgesteld', 'Zichtbaar voor klant': true } },
]

const stagelog = [
  { id: 'recL1', fields: { Aanmelding: ['recA1'], 'Naar stage': 'Benaderd' } },
  { id: 'recL2', fields: { Aanmelding: ['recA1'], 'Naar stage': 'Voorgesteld' } },
  { id: 'recL3', fields: { Aanmelding: ['recA3'], 'Naar stage': 'Gesproken' } },
]

const bouw = (velden) =>
  bouwOverzicht({
    gebruiker: gebruiker(velden),
    opdrachtgever,
    vacatures,
    aanmeldingen,
    kandidaten,
    stagelog,
    vandaag: '2026-08-29',
  })

const VOLLE_TOEGANG = { Opdrachtgever: [RS], Vacatures: ['recVacFT'] }

/**
 * Waarden die nooit in een antwoord mogen staan. Er wordt op de waarde gezocht
 * en niet op de veldnaam, zodat hernoemen deze toets niet stilzwijgend uitzet.
 */
const VERBODEN = [
  GEHEIME_TEKST,
  'SNA inspecteur',        // vacature van een andere opdrachtgever
  'Chen',                  // naam van een niet-vrijgegeven kandidaat
  'Ander BV',              // werkgever van een niet-vrijgegeven kandidaat
  'Tilburg',               // woonplaats van een niet-vrijgegeven kandidaat
]

function eisGeenVerbodenWaarden(payload, wat) {
  const tekst = JSON.stringify(payload)
  for (const verboden of VERBODEN) {
    assert.equal(tekst.includes(verboden), false, `${wat}: "${verboden}" staat in het antwoord`)
  }
}

// --- de veldfilter ---------------------------------------------------------

test('geen enkel intern veld komt naar buiten', () => {
  eisGeenVerbodenWaarden(bouw(VOLLE_TOEGANG), 'volle toegang')
})

test('salarisband, scoringsdrempel en validatie blijven binnen', () => {
  const vacature = bouw(VOLLE_TOEGANG).vacatures[0]
  for (const sleutel of ['Salaris min', 'Salaris max', 'salaris', 'scoringsdrempel', 'validatie', 'jobspec']) {
    assert.equal(sleutel in vacature, false, `${sleutel} zit in het vacatureantwoord`)
  }
  assert.deepEqual(Object.keys(vacature).sort(), [
    'afgevallen', 'funnel', 'id', 'kandidaten', 'standplaats',
    'startdatum', 'status', 'streefdatumShortlist', 'titel', 'totaal',
  ])
})

test('een kandidaat levert precies elf velden, niet meer', () => {
  const kandidaat = bouw(VOLLE_TOEGANG).vacatures[0].kandidaten[0]
  assert.deepEqual(Object.keys(kandidaat).sort(), [
    'dagenInFase', 'fase', 'huidigeRol', 'huidigeWerkgever', 'id',
    'initialen', 'naam', 'score', 'vrijgegeven', 'woonplaats',
  ])
})

// --- anonimisering ---------------------------------------------------------

test('vrijgegeven kandidaat toont naam, werkgever en woonplaats', () => {
  const kandidaat = bouw(VOLLE_TOEGANG).vacatures[0].kandidaten.find((k) => k.id === 'recA1')
  assert.equal(kandidaat.naam, 'Yurita Yona Boodhram')
  assert.equal(kandidaat.huidigeWerkgever, 'Concurrent BV')
  assert.equal(kandidaat.woonplaats, 'Eindhoven')
  assert.equal(kandidaat.vrijgegeven, true)
})

test('niet-vrijgegeven kandidaat toont alleen initialen en functietitel', () => {
  const kandidaat = bouw(VOLLE_TOEGANG).vacatures[0].kandidaten.find((k) => k.id === 'recA2')
  assert.equal(kandidaat.naam, null)
  assert.equal(kandidaat.huidigeWerkgever, null)
  assert.equal(kandidaat.woonplaats, null)
  assert.equal(kandidaat.initialen, 'J.V.')
  assert.equal(kandidaat.huidigeRol, 'Lab Technician')
})

test('initialen laten tussenvoegsels weg en gaan om met één naam', () => {
  const regels = bouw(VOLLE_TOEGANG).vacatures[0].kandidaten
  assert.equal(regels.find((k) => k.id === 'recA1').initialen, 'Y.B.')
  assert.equal(regels.find((k) => k.id === 'recA2').initialen, 'J.V.')
})

// --- afgevallen ------------------------------------------------------------

test('afgevallen kandidaten verschijnen geteld, nooit als rij', () => {
  const vacature = bouw(VOLLE_TOEGANG).vacatures[0]
  assert.deepEqual(vacature.afgevallen, [{ reden: 'Salariswens te hoog', aantal: 2 }])
  assert.equal(
    vacature.kandidaten.some((k) => k.fase === 'Afgevallen'),
    false,
    'een afgevallen kandidaat staat als rij in de lijst',
  )
  assert.equal(vacature.totaal, 4, 'het totaal telt de afgevallen kandidaten wel mee')
})

// --- de dubbele grendel ----------------------------------------------------

test('een vacature van een andere opdrachtgever valt af, ook als hij is toegewezen', () => {
  const payload = bouw({ Opdrachtgever: [RS], Vacatures: ['recVacFT', 'recVacSNA'] })
  assert.deepEqual(payload.vacatures.map((v) => v.titel), ['Formulation Technologist'])
  eisGeenVerbodenWaarden(payload, 'vacature van een andere klant toegewezen')
})

test('een lege vacaturelijst geeft geen toegang, niet alle toegang', () => {
  assert.deepEqual(bouw({ Opdrachtgever: [RS], Vacatures: [] }).vacatures, [])
  assert.deepEqual(bouw({ Opdrachtgever: [RS] }).vacatures, [])
})

test('zonder opdrachtgever geen toegang, ook met toegewezen vacatures', () => {
  assert.deepEqual(bouw({ Vacatures: ['recVacFT', 'recVacBM'] }).vacatures, [])
})

test('alleen de toegewezen vacature komt door, niet alles van die klant', () => {
  const titels = bouw(VOLLE_TOEGANG).vacatures.map((v) => v.titel)
  assert.deepEqual(titels, ['Formulation Technologist'])
  assert.equal(titels.includes('Brand Manager'), false)
})

// --- funnel ----------------------------------------------------------------

test('de funnel telt cumulatief en gebruikt de stagelog voor afgevallen', () => {
  const funnel = bouw(VOLLE_TOEGANG).vacatures[0].funnel
  const bij = (fase) => funnel.find((f) => f.fase === fase)
  assert.equal(bij('Gescoord').bereikt, 4, 'iedereen is minstens gescoord')
  assert.equal(bij('Gesproken').bereikt, 2, 'de een staat op Aanbod, de ander kwam via de log tot Gesproken')
  assert.equal(bij('Aanbod').bereikt, 1)
  assert.equal(bij('Aanbod').nuHier, 1)
  assert.equal(
    funnel.some((f) => f.fase === 'Afgevallen'),
    false,
    'Afgevallen is een eindstatus en geen trede',
  )
})

// --- wachtwoorden ----------------------------------------------------------

test('een juist wachtwoord klopt en elke variatie erop niet', async () => {
  const salt = nieuweSalt()
  const wachtwoord = genereerWachtwoord()
  const hash = await hashWachtwoord(wachtwoord, salt)

  assert.equal(await klopt(wachtwoord, salt, hash), true)
  assert.equal(await klopt(`${wachtwoord} `, salt, hash), false)
  assert.equal(await klopt(wachtwoord.toUpperCase(), salt, hash), false)
  assert.equal(await klopt(wachtwoord, nieuweSalt(), hash), false)
})

test('een half ingevuld record laat niemand binnen en gooit niets', async () => {
  assert.equal(await klopt('wat dan ook', undefined, undefined), false)
  assert.equal(await klopt('wat dan ook', 'zout', 'te-kort'), false)
  assert.equal(await klopt('wat dan ook', 'zout', ''), false)
})

test('gegenereerde wachtwoorden zijn leesbaar en niet te verwarren', () => {
  for (let i = 0; i < 50; i++) {
    const w = genereerWachtwoord()
    assert.match(w, /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/)
    assert.equal(/[lio01]/.test(w), false, `${w} bevat een teken dat door de telefoon misgaat`)
  }
  const veel = new Set(Array.from({ length: 200 }, genereerWachtwoord))
  assert.equal(veel.size, 200, 'twee gegenereerde wachtwoorden waren gelijk')
})

// --- sessies ---------------------------------------------------------------

test('een eigen sessie is geldig en een geknoeide niet', () => {
  const nu = 1_700_000_000
  const token = maakSessie('recGebruiker00001', nu)

  assert.equal(leesSessie(token, nu), 'recGebruiker00001')
  assert.equal(leesSessie(token, nu + SESSIE_SECONDEN), null, 'verlopen sessie wordt geaccepteerd')
  assert.equal(leesSessie(token.replace('recGebruiker00001', 'recIemandAnders01'), nu), null)

  const [id, , handtekening] = token.split('.')
  assert.equal(leesSessie(`${id}.9999999999.${handtekening}`, nu), null, 'looptijd is op te rekken')
  assert.equal(leesSessie(`${id}.${nu + 60}.${'0'.repeat(64)}`, nu), null)
  assert.equal(leesSessie('', nu), null)
  assert.equal(leesSessie('a.b.c.d', nu), null)
  assert.equal(leesSessie('nietEenId.9999999999.abc', nu), null)
})

test('een sessie met een ander geheim wordt niet geaccepteerd', () => {
  const nu = 1_700_000_000
  const token = maakSessie('recGebruiker00001', nu)
  const eigen = process.env.PORTAL_SESSION_SECRET
  process.env.PORTAL_SESSION_SECRET = 'een-heel-ander-geheim-dat-ook-lang-genoeg-is'
  try {
    assert.equal(leesSessie(token, nu), null)
  } finally {
    process.env.PORTAL_SESSION_SECRET = eigen
  }
})

test('het cookie gaat nooit naar /api/ats en is niet uit script te lezen', () => {
  const cookie = sessieCookie('x')
  assert.match(cookie, /Path=\/api\/portal/)
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /Secure/)
  assert.match(cookie, /SameSite=Strict/)
})

test('het cookie wordt tussen andere cookies teruggevonden', () => {
  assert.equal(cookieUitHeader('a=1; ds-portaal=abc; b=2'), 'abc')
  assert.equal(cookieUitHeader('ds-portaal=abc'), 'abc')
  assert.equal(cookieUitHeader('anders-portaal=abc'), null)
  assert.equal(cookieUitHeader(''), null)
  assert.equal(cookieUitHeader(undefined), null)
})

// --- de grens tussen klant en kantoor ---------------------------------------

test('het klantscherm importeert niets uit de interne app', async () => {
  const { readdirSync, readFileSync } = await import('node:fs')
  const { join } = await import('node:path')

  // api.ts haalt bij elk verzoek de gedeelde ATS-sleutel uit localStorage en
  // plakt hem in een header. Eén import daarvan in src/klant/ is genoeg om die
  // sleutel op het scherm van een opdrachtgever te laten belanden. Dezelfde
  // reden voor AtsProvider: die houdt de complete base in het geheugen.
  const VERBODEN_IMPORTS = ['lib/api', 'store/AtsProvider', 'screens/']

  const map = new URL('../../src/klant/', import.meta.url).pathname
  const bestanden = readdirSync(map).filter((n) => n.endsWith('.tsx') || n.endsWith('.ts'))
  assert.ok(bestanden.length > 0, 'src/klant/ is leeg — is het portaal verplaatst?')

  for (const bestand of bestanden) {
    const inhoud = readFileSync(join(map, bestand), 'utf8')
    for (const regel of inhoud.split('\n')) {
      if (!/^\s*import\b/.test(regel)) continue
      for (const verboden of VERBODEN_IMPORTS) {
        assert.equal(
          regel.includes(verboden),
          false,
          `${bestand} importeert uit ${verboden}: ${regel.trim()}`,
        )
      }
    }
  }
})

// --- het beheer van portaalgebruikers ---------------------------------------

test('een portaalgebruiker gaat nooit met hash of salt terug naar het scherm', async () => {
  const { platteGebruiker } = await import('../../netlify/functions/ats.mjs')

  const HASH = 'a'.repeat(128)
  const SALT = 'b'.repeat(32)
  const uit = platteGebruiker({
    id: 'recGebruiker00001',
    fields: {
      Naam: 'Jeroen de Wit',
      'E-mail': 'jeroen@klant.nl',
      'Wachtwoord-hash': HASH,
      Salt: SALT,
      Opdrachtgever: ['recOpdrachtgeverRS'],
      Vacatures: ['recVacFT'],
      Status: 'Actief',
      // Een veld dat morgen in de base bij komt en dat niemand hier verwacht.
      'Interne notitie': 'GEHEIM',
    },
  })

  const tekst = JSON.stringify(uit)
  assert.equal(tekst.includes(HASH), false, 'de wachtwoord-hash staat in het antwoord')
  assert.equal(tekst.includes(SALT), false, 'de salt staat in het antwoord')
  assert.equal(tekst.includes('GEHEIM'), false, 'een onbekend veld lift mee naar buiten')

  assert.deepEqual(Object.keys(uit).sort(), [
    'E-mail', 'Geblokkeerd tot', 'Laatste login', 'Naam',
    'Opdrachtgever', 'Status', 'Vacatures', 'Verloopt op', 'id',
  ])
})

test('het e-mailadres wordt gecontroleerd maar niet overdreven streng', async () => {
  const { eisAdres } = await import('../../netlify/functions/ats.mjs')

  assert.equal(eisAdres('  jeroen@royalsanders.nl '), 'jeroen@royalsanders.nl', 'spaties eromheen')
  assert.equal(eisAdres('j.de-wit+ats@sub.example.co.uk'), 'j.de-wit+ats@sub.example.co.uk')

  for (const fout of ['', '   ', 'jeroen', 'jeroen@', '@klant.nl', 'jeroen@klant', 'a b@klant.nl']) {
    assert.throws(() => eisAdres(fout), /geldig e-mailadres/i, `${JSON.stringify(fout)} werd geaccepteerd`)
  }
})

// --- de terugkoppeling van de outreach ---------------------------------------

test('LinkedIn-URLs die dezelfde persoon aanwijzen worden gelijk gemaakt', async () => {
  const { normaliseerUrl } = await import('../../netlify/functions/outreach.mjs')

  // Allemaal dezelfde persoon. Zonder normalisering zou het eindpunt netjes
  // antwoorden dat de kandidaat niet bestaat, en niemand die het merkt.
  const zelfde = [
    'https://www.linkedin.com/in/jan-de-vries-123',
    'http://linkedin.com/in/jan-de-vries-123',
    'https://linkedin.com/in/jan-de-vries-123/',
    'https://www.linkedin.com/in/jan-de-vries-123?utm_source=share',
    'https://www.linkedin.com/in/jan-de-vries-123#profiel',
    '  https://WWW.LinkedIn.com/in/Jan-De-Vries-123/  ',
  ]
  const genormaliseerd = new Set(zelfde.map(normaliseerUrl))
  assert.equal(genormaliseerd.size, 1, `verschillende uitkomsten: ${[...genormaliseerd].join(' | ')}`)
  assert.equal([...genormaliseerd][0], 'linkedin.com/in/jan-de-vries-123')

  // Twee verschillende mensen blijven verschillend.
  assert.notEqual(
    normaliseerUrl('https://linkedin.com/in/jan-de-vries-123'),
    normaliseerUrl('https://linkedin.com/in/jan-de-vries-124'),
  )
  assert.equal(normaliseerUrl(''), '')
  assert.equal(normaliseerUrl(undefined), '')
  assert.equal(normaliseerUrl(null), '')
})

test('elke gebeurtenis vertaalt naar een bestaande ATS-fase', async () => {
  const { STAGE_IDS } = await import('../../shared/stages.mjs')
  const { GEBEURTENISSEN } = await import('../../shared/mapping.mjs')

  // Deze toets las de tabel vroeger uit de brontekst van outreach.mjs, omdat
  // hij nergens werd geëxporteerd. Nu komt hij uit config/ats-mapping.json en
  // is hij gewoon te importeren. Het punt is ongewijzigd: er mag nooit een
  // fase in staan die shared/stages.mjs niet kent, want Airtable maakt daar
  // met typecast stilzwijgend een nieuwe keuze-optie van.
  const fasen = Object.values(GEBEURTENISSEN)
  assert.ok(fasen.length >= 11, `te weinig gebeurtenissen gevonden: ${fasen.length}`)
  for (const fase of fasen) {
    assert.ok(STAGE_IDS.includes(fase), `"${fase}" is geen bestaande ATS-fase`)
  }

  // Het framework kent Reactie/Gesprek/Shortlist; die namen mogen hier niet
  // rechtstreeks in staan, want in de ATS betekenen ze iets anders.
  for (const val of ['Reactie', 'Gesprek', 'Nieuw', 'Twijfel', 'Wacht op akkoord']) {
    assert.equal(fasen.includes(val), false, `frameworknaam "${val}" lekt de ATS in`)
  }

  // De gebeurtenis heet wel shortlist, en zet in de ATS ook Shortlist. Dat is
  // iets anders dan de xlsx-Status Shortlist, die bij import op Gescoord
  // landt; zie de toets in import.test.mjs.
  assert.equal(GEBEURTENISSEN.shortlist, 'Shortlist')
})

test('elke ingang heeft zijn eigen sleutel en header', async () => {
  const { requireKey, HttpError } = await import('../../netlify/lib/airtable.mjs')
  const verzoek = (headers) => ({ headers: { get: (n) => headers[n] ?? null } })

  process.env.TOETS_SLEUTEL = 'het-juiste-geheim'
  assert.doesNotThrow(() => requireKey(verzoek({ 'x-toets': 'het-juiste-geheim' }), 'x-toets', 'TOETS_SLEUTEL'))
  assert.throws(() => requireKey(verzoek({ 'x-toets': 'fout' }), 'x-toets', 'TOETS_SLEUTEL'), HttpError)
  assert.throws(() => requireKey(verzoek({}), 'x-toets', 'TOETS_SLEUTEL'), HttpError)

  // Een sleutel die niet is ingesteld laat niemand binnen, ook niet met een
  // lege header — anders opent een vergeten variabele de deur.
  delete process.env.TOETS_SLEUTEL
  assert.throws(() => requireKey(verzoek({ 'x-toets': '' }), 'x-toets', 'TOETS_SLEUTEL'), /TOETS_SLEUTEL/)
})

// --- wat de klant van een kandidaat ziet --------------------------------------

test('de initialen zijn overal dezelfde, en laten tussenvoegsels weg', async () => {
  const { initialen } = await import('../../shared/klantweergave.mjs')

  // Er stonden twee implementaties in de repo die het oneens waren: die in
  // format.ts maakte van "Jan de Vries" JD en van "Jaap Jan van der Berg" JJ.
  // Op het scherm van Dominique zou dan iets anders staan dan bij de klant.
  assert.equal(initialen('Jan de Vries'), 'J.V.')
  assert.equal(initialen('Jaap Jan van der Berg'), 'J.B.')
  assert.equal(initialen('Yurita Yona Boodhram'), 'Y.B.')
  assert.equal(initialen('Chen'), 'C.')
  assert.equal(initialen('  fatima   yildiz '), 'F.Y.')
  assert.equal(initialen(''), '?')
  assert.equal(initialen(null), '?')
  assert.equal(initialen(undefined), '?')
})

test('een niet-vrijgegeven kandidaat levert nergens een naam op', async () => {
  const { klantZiet } = await import('../../shared/klantweergave.mjs')

  const kandidaat = {
    Naam: 'Jan de Vries',
    'Huidige rol': 'Lab Technician',
    'Huidige werkgever': 'Ander BV',
    Woonplaats: 'Tilburg',
  }

  const anoniem = klantZiet(kandidaat, false)
  const tekst = JSON.stringify(anoniem)
  for (const verboden of ['Jan', 'Vries', 'Ander BV', 'Tilburg']) {
    assert.equal(tekst.includes(verboden), false, `"${verboden}" staat in de anonieme weergave`)
  }
  assert.equal(anoniem.kop, 'J.V.')
  assert.equal(anoniem.regel, 'Lab Technician')
  assert.equal(anoniem.anoniem, true)

  const vrij = klantZiet(kandidaat, true)
  assert.equal(vrij.kop, 'Jan de Vries')
  assert.equal(vrij.regel, 'Lab Technician · Ander BV · Tilburg')
  assert.equal(vrij.anoniem, false)

  // Een kandidaat die er niet is mag geen lege plek opleveren.
  assert.equal(klantZiet(undefined, false).kop, '?')
  assert.equal(klantZiet(null, true).kop, '?')
})

test('de portal en het ATS-scherm tonen dezelfde kop', async () => {
  const { bouwOverzicht } = await import('../../netlify/functions/portal.mjs')
  const { klantZiet } = await import('../../shared/klantweergave.mjs')

  // Beide kanten met dezelfde gegevens voeden en de uitkomst vergelijken. Deze
  // twee moeten het eens zijn; zo niet, dan staat er bij Dominique iets anders
  // op het scherm dan bij haar klant.
  const KLANT = 'recKlant000000001'
  const kandidaat = { Naam: 'Jaap Jan van der Berg', 'Huidige rol': 'Formulator' }

  for (const vrijgegeven of [false, true]) {
    const payload = bouwOverzicht({
      gebruiker: { id: 'recG', fields: { Opdrachtgever: [KLANT], Vacatures: ['recV'] } },
      opdrachtgever: { id: KLANT, fields: { Naam: 'Royal Sanders' } },
      vacatures: [{ id: 'recV', fields: { Titel: 'Rol', Opdrachtgever: [KLANT] } }],
      aanmeldingen: [
        {
          id: 'recA',
          fields: {
            Vacature: ['recV'],
            Kandidaat: ['recK'],
            Stage: 'Voorgesteld',
            'Zichtbaar voor klant': vrijgegeven,
          },
        },
      ],
      kandidaten: [{ id: 'recK', fields: kandidaat }],
      vandaag: '2026-08-30',
    })

    const rij = payload.vacatures[0].kandidaten[0]
    const opScherm = klantZiet(kandidaat, vrijgegeven)
    const inPortal = rij.vrijgegeven && rij.naam ? rij.naam : rij.initialen

    assert.equal(
      inPortal,
      opScherm.kop,
      `portal toont "${inPortal}" en het ATS-scherm "${opScherm.kop}" (vrijgegeven: ${vrijgegeven})`,
    )
  }
})
