import { test } from 'node:test'
import assert from 'node:assert/strict'

import { alsMarkdown, controleer, poortOordeel, vingerafdruk } from '../import/rapport.mjs'
import { bouwPlan } from '../import/lees.mjs'
import { KOLOM_SYNONIEMEN } from '../import/status-map.mjs'

const VANDAAG = '2026-09-10'

/** Een plan uit losse rijen, zoals leesRijen ze aanlevert. */
const plan = (rijen, opties = {}) =>
  bouwPlan(rijen, { vacatureTitel: 'SNA Inspecteur', vandaag: VANDAAG, ...opties })

const rij = (extra = {}) => ({
  Naam: 'Anne Jansen',
  'Bron-URL': 'https://www.linkedin.com/in/anne',
  Bron: 'linkedin',
  Woonplaats: 'Delft',
  'Totaal (100)': '80',
  Status: 'Gescoord',
  'Datum status': '2026-09-01',
  ...extra,
})

test('een schone rij levert geen enkele blokkade op', () => {
  const uit = controleer(plan([rij()]), { vandaag: VANDAAG })
  assert.deepEqual(uit.fouten, [])
  assert.equal(uit.rijen.length, 1)
  assert.equal(uit.rijen[0].stage, 'Gescoord')
})

test('Datum status wordt gelezen en niet vervangen door de importdatum', () => {
  // Deze kolomnaam uit schema 1.1 ontbrak in de synoniemen, waardoor elke
  // aanmelding de importdatum kreeg en de servicenormklok opnieuw begon.
  assert.ok(KOLOM_SYNONIEMEN.__datum.includes('datum status'))
  const p = plan([rij({ 'Datum status': '2026-08-26' })])
  assert.equal(p.aanmeldingen[0].velden['Datum in huidige stage'], '2026-08-26')
  assert.equal([...p.kandidaten.values()][0]['Laatste contact'], '2026-08-26')
})

test('een datum in de toekomst blokkeert', () => {
  const uit = controleer(plan([rij({ 'Datum status': '2027-01-01' })]), { vandaag: VANDAAG })
  assert.ok(uit.fouten.some((f) => f.includes('toekomst')))
})

test('een lege score blokkeert', () => {
  const uit = controleer(plan([rij({ 'Totaal (100)': '' })]), { vandaag: VANDAAG })
  assert.ok(uit.fouten.some((f) => f.includes('Score totaal')))
})

test('een onbekende status blokkeert, ook al valt hij terug op Gescoord', () => {
  const p = plan([rij({ Status: 'Connectieverzoek' })])
  assert.equal(p.aanmeldingen[0].velden.Stage, 'Gescoord')
  const uit = controleer(p, { vandaag: VANDAAG })
  assert.ok(uit.fouten.some((f) => f.includes('Connectieverzoek')))
})

test('twee mensen met dezelfde naam blokkeren, want koppelen gaat op naam', () => {
  const uit = controleer(
    plan([rij(), rij({ 'Bron-URL': 'https://www.linkedin.com/in/anne2' })]),
    { vandaag: VANDAAG },
  )
  assert.ok(uit.fouten.some((f) => f.toLowerCase().includes('anne jansen')))
})

test('een dubbele rij in hetzelfde bestand blokkeert in plaats van stil te verdwijnen', () => {
  const p = plan([rij(), rij()])
  assert.equal(p.aanmeldingen.length, 1)
  const uit = controleer(p, { vandaag: VANDAAG })
  assert.ok(uit.fouten.some((f) => f.includes('dubbel in het bestand')))
})

test('geen LinkedIn-URL is een waarschuwing, en zonder woonplaats scherper', () => {
  const zonderUrl = controleer(plan([rij({ 'Bron-URL': '' })]), { vandaag: VANDAAG })
  assert.equal(zonderUrl.fouten.length, 0)
  assert.ok(zonderUrl.waarschuwingen.some((w) => w.includes('naam plus woonplaats')))

  const zonderBeide = controleer(plan([rij({ 'Bron-URL': '', Woonplaats: '' })]), { vandaag: VANDAAG })
  assert.ok(zonderBeide.waarschuwingen.some((w) => w.includes('Woonplaats is LEEG')))
})

test('een onbekende bron is een waarschuwing en landt op Overig', () => {
  const uit = controleer(plan([rij({ Bron: 'iets nieuws' })]), { vandaag: VANDAAG })
  assert.equal(uit.fouten.length, 0)
  assert.ok(uit.waarschuwingen.some((w) => w.includes('Overig')))
  assert.equal(uit.rijen[0].bron, 'Overig')
})

test('afgevallen zonder reden blokkeert', () => {
  // Via een status die zelf geen reden meebrengt, anders vult de mapping hem.
  const p = plan([rij({ Status: 'Gescoord' })])
  p.aanmeldingen[0].velden.Stage = 'Afgevallen'
  p.aanmeldingen[0].velden['Reden afvallen'] = null
  const uit = controleer(p, { vandaag: VANDAAG })
  assert.ok(uit.fouten.some((f) => f.includes('Afgevallen zonder reden')))
})

test('het rapport meldt het oordeel bovenaan', () => {
  const schoon = alsMarkdown(controleer(plan([rij()]), { vandaag: VANDAAG }), {
    bestand: 'lijst.csv',
    vacature: 'SNA Inspecteur',
    vandaag: VANDAAG,
    overgeslagen: 0,
  })
  assert.match(schoon, /\*\*Resultaat: klaar voor import\*\*/)
  assert.match(schoon, /\| Aanmelding \| ATS Stage \|/)

  const stuk = alsMarkdown(controleer(plan([rij({ 'Totaal (100)': '' })]), { vandaag: VANDAAG }), {
    bestand: 'lijst.csv',
    vacature: 'SNA Inspecteur',
    vandaag: VANDAAG,
    overgeslagen: 0,
  })
  assert.match(stuk, /\*\*Resultaat: BLOKKEREND/)
  assert.match(stuk, /## Blokkerende fouten/)
})

test('de zoekronde staat in het rapport zodra hij is meegegeven', () => {
  const uit = controleer(plan([rij()], { ronde: 'Ronde 3' }), { vandaag: VANDAAG })
  assert.equal(uit.rondes.get('Ronde 3'), 1)
  const md = alsMarkdown(uit, { bestand: 'x.csv', vacature: 'SNA Inspecteur', vandaag: VANDAAG, overgeslagen: 0 })
  assert.match(md, /Zoekronde:/)
})

test('de poort laat niets door zonder importcheck', () => {
  const uit = poortOordeel(null, { afdruk: 'aaa' })
  assert.equal(uit.door, false)
  assert.equal(uit.reden, 'geen-check')
})

test('de poort laat een groen oordeel door', () => {
  const uit = poortOordeel({ blokkerend: [], vingerafdruk: 'aaa' }, { afdruk: 'aaa' })
  assert.equal(uit.door, true)
})

test('de poort weigert bij blokkerende punten en noemt ze', () => {
  const uit = poortOordeel({ blokkerend: ['Anne: Score totaal is leeg.'], vingerafdruk: 'aaa' }, { afdruk: 'aaa' })
  assert.equal(uit.door, false)
  assert.equal(uit.reden, 'blokkerend')
  assert.deepEqual(uit.blokkerend, ['Anne: Score totaal is leeg.'])
})

test('een groen oordeel over een ander plan telt niet', () => {
  // plan schrijft eerst plan.json en pas daarna het oordeel. Breekt hij
  // daartussen af, dan bewaakt een oud oordeel een nieuw plan.
  const uit = poortOordeel({ blokkerend: [], vingerafdruk: 'oud' }, { afdruk: 'nieuw' })
  assert.equal(uit.door, false)
  assert.equal(uit.reden, 'ander-plan')
})

test('--akkoord opent de poort, ook met blokkades en zonder check', () => {
  assert.equal(poortOordeel(null, { akkoord: true, afdruk: 'aaa' }).door, true)
  assert.equal(poortOordeel({ blokkerend: ['x'], vingerafdruk: 'oud' }, { akkoord: true, afdruk: 'nieuw' }).door, true)
})

test('de vingerafdruk verandert zodra het plan verandert', () => {
  const een = vingerafdruk(JSON.stringify({ kandidaten: [], aanmeldingen: [1] }))
  assert.equal(een, vingerafdruk(JSON.stringify({ kandidaten: [], aanmeldingen: [1] })))
  assert.notEqual(een, vingerafdruk(JSON.stringify({ kandidaten: [], aanmeldingen: [2] })))
})

test('de stagetelling staat in trechtervolgorde, niet op aantal', () => {
  // Zo zie je in een blik of er iets te ver naar rechts is geland.
  const uit = controleer(
    plan([
      rij({ Status: 'Benaderd', Naam: 'A', 'Bron-URL': 'https://www.linkedin.com/in/a' }),
      rij({ Naam: 'B', 'Bron-URL': 'https://www.linkedin.com/in/b' }),
      rij({ Naam: 'C', 'Bron-URL': 'https://www.linkedin.com/in/c' }),
    ]),
    { vandaag: VANDAAG },
  )
  const md = alsMarkdown(uit, { bestand: 'x.csv', vacature: 'SNA Inspecteur', vandaag: VANDAAG, overgeslagen: 0 })
  const regels = md.split('\n').filter((r) => /^- (Gescoord|Benaderd):/.test(r))
  assert.deepEqual(
    regels.map((r) => r.split(':')[0].slice(2)),
    ['Gescoord', 'Benaderd'],
  )
})
