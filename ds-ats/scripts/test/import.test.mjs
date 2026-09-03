// Tests voor het lees- en vertaalgedeelte van de import. Alles hier is puur:
// geen netwerk, geen Airtable-sleutel.
//
// De twee gevallen die hieronder het meest gedetailleerd staan, komen uit de
// kandidatenlijst voor Account Assistant Sales bij Royal Sanders. Die lijst
// heeft twee kolommen "Bron-URL" en zet bij tien rijen dezelfde Indeed-
// zoekopdracht in de URL-kolom. Beide eigenaardigheden lieten de import stil
// gegevens verliezen — niet crashen, verliezen. Daar zijn tests voor.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bouwKolomIndex, bouwPlan, dedupeSleutel, leesCsv } from '../import/lees.mjs'
import {
  isIdentificerendeUrl,
  vertaalBron,
  vertaalReden,
  vertaalStatus,
} from '../import/status-map.mjs'
import { ALLE_AFVAL_REDENEN } from '../../shared/stages.mjs'
import { GEBEURTENISSEN } from '../../shared/mapping.mjs'

const INDEED_ZOEK =
  'https://resumes.indeed.com/search?q=sales+support+OR+%22project+coordinator%22&l=Vlijmen'

test('dubbele kolomkop overschrijft de eerste kolom niet', () => {
  const rijen = leesCsv(
    'Naam,Bron-URL,Bron-URL\n' +
      'Chelsea Kuijper,https://www.linkedin.com/sales/lead/ACwAABvf1d4,\n' +
      'Nick Koks,,https://www.linkedin.com/in/nick-koks/\n',
  )
  assert.deepEqual(Object.keys(rijen[0]), ['Naam', 'Bron-URL', 'Bron-URL (2)'])
  assert.equal(rijen[0]['Bron-URL'], 'https://www.linkedin.com/sales/lead/ACwAABvf1d4')
  assert.equal(rijen[1]['Bron-URL (2)'], 'https://www.linkedin.com/in/nick-koks/')
})

test('de tweede kolom belandt in genegeerd en wordt met inhoud gemeld', () => {
  const rijen = leesCsv(
    'Naam,Bron-URL,Bron-URL,Status\n' +
      'Chelsea Kuijper,https://www.linkedin.com/sales/lead/ACwAABvf1d4,,Benaderd\n' +
      'Nick Koks,,https://www.linkedin.com/in/nick-koks/,Benaderd\n',
  )
  const { genegeerd } = bouwKolomIndex(rijen)
  assert.ok(genegeerd.includes('Bron-URL (2)'))

  const plan = bouwPlan(rijen, { vacatureTitel: 'X', vandaag: '2026-08-31' })
  assert.deepEqual(
    plan.genegeerdMetInhoud.find((k) => k.kop === 'Bron-URL (2)'),
    { kop: 'Bron-URL (2)', gevuld: 1 },
  )
})

test('naamloze kolommen krijgen geen (2) achter zich', () => {
  const rijen = leesCsv('Naam,Status,Werkgever,,\nChelsea Kuijper,Benaderd,A.S. Watson,a,b\n')
  assert.deepEqual(Object.keys(rijen[0]), ['Naam', 'Status', 'Werkgever', ''])
})

test('een zoekresultaten-URL wijst geen persoon aan', () => {
  assert.equal(isIdentificerendeUrl(INDEED_ZOEK), false)
  assert.equal(isIdentificerendeUrl('https://voorbeeld.nl/search'), false)
  assert.equal(isIdentificerendeUrl('https://voorbeeld.nl/cv/jan-jansen'), true)
})

test('LinkedIn blijft gelden zoals het gold', () => {
  assert.equal(isIdentificerendeUrl('https://www.linkedin.com/in/jan-jansen/'), true)
  assert.equal(isIdentificerendeUrl('https://www.linkedin.com/sales/lead/ACwAABvf1d4'), true)
  assert.equal(isIdentificerendeUrl('https://www.linkedin.com/sales/'), false)
  assert.equal(isIdentificerendeUrl(''), false)
})

test('tien rijen met dezelfde zoek-URL blijven tien kandidaten', () => {
  const namen = ['Derya Demiral', 'Mariette Cabannes', 'Johan Beaard', 'Michelle van Beek']
  const rijen = leesCsv(
    'Naam,Bron-URL,Locatie + reisafstand,Status\n' +
      namen.map((naam, i) => `${naam},${INDEED_ZOEK},Plaats ${i}\\, ca. 10 min,Benaderd`).join('\n'),
  )
  const plan = bouwPlan(rijen, { vacatureTitel: 'X', vandaag: '2026-08-31' })
  assert.equal(plan.kandidaten.size, namen.length)
  assert.deepEqual(plan.overgeslagen, [])
  assert.equal(new Set([...plan.kandidaten.values()].map(dedupeSleutel)).size, namen.length)
})

test('een zoek-URL komt niet in het veld dat Airtable als dedupe-sleutel leest', () => {
  const rijen = leesCsv(
    'Naam,Bron-URL,Locatie + reisafstand,Status\n' +
      `Derya Demiral,${INDEED_ZOEK},Waalwijk\\, ca. 10 min,Benaderd\n` +
      `Mariette Cabannes,${INDEED_ZOEK},Hurwenen\\, ca. 15 min,Benaderd\n` +
      'Chelsea Kuijper,https://www.linkedin.com/sales/lead/ACwAABvf1d4,Tiel,Benaderd\n',
  )
  const plan = bouwPlan(rijen, { vacatureTitel: 'X', vandaag: '2026-08-31' })
  const kandidaten = [...plan.kandidaten.values()]

  // Twee zonder URL, één met. Anders zouden die twee in Airtable dezelfde
  // Dedupe-sleutel krijgen: die formule kent isIdentificerendeUrl niet.
  assert.deepEqual(
    kandidaten.map((k) => k['LinkedIn-URL']),
    [undefined, undefined, 'https://www.linkedin.com/sales/lead/ACwAABvf1d4'],
  )
  assert.deepEqual([...plan.nietIdentificerendeUrls], [[INDEED_ZOEK, 2]])
  assert.equal(plan.kandidaten.size, 3)
})

test('Achtergrondverificatie is een geldige afvalreden en blijft staan', () => {
  assert.equal(
    vertaalReden('Achtergrondverificatie', ALLE_AFVAL_REDENEN),
    'Achtergrondverificatie',
  )
  const rijen = leesCsv(
    'Naam,Status,Reden afvallen\nJohan Beaard,Afgewezen,Achtergrondverificatie\n',
  )
  const plan = bouwPlan(rijen, { vacatureTitel: 'X', vandaag: '2026-08-31' })
  assert.equal(plan.aanmeldingen[0].velden.Stage, 'Afgevallen')
  assert.equal(plan.aanmeldingen[0].velden['Reden afvallen'], 'Achtergrondverificatie')
  assert.deepEqual([...plan.onbekendeReden], [])
})

test('de bronkolom van deze lijst vouwt terug op de keuzelijst', () => {
  assert.equal(vertaalBron('indeed-cv'), 'Indeed CV-database')
  assert.equal(vertaalBron('Indeed CV-database'), 'Indeed CV-database')
  assert.equal(vertaalBron('linkedin-salesnav-direct'), 'LinkedIn Sales Navigator')
  // Sales Navigator wint van LinkedIn, en Indeed mag daar niet tussen komen.
  assert.equal(vertaalBron('LinkedIn search junior RA (batch 17-07)'), 'LinkedIn regulier')
})

test('een reden bij een kandidaat die niet is afgevallen gaat niet mee', () => {
  const rijen = leesCsv('Naam,Status,Reden afvallen\nJob van der Velden,Benaderd,Timing\n')
  const plan = bouwPlan(rijen, { vacatureTitel: 'X', vandaag: '2026-08-31' })
  assert.equal(plan.aanmeldingen[0].velden.Stage, 'Benaderd')
  assert.equal(plan.aanmeldingen[0].velden['Reden afvallen'], null)
})

test('de statussen uit deze lijst vertalen naar de ATS-trechter', () => {
  for (const [ruw, stage] of [
    ['Afgewezen', 'Afgevallen'],
    ['Benaderd', 'Benaderd'],
    ['Gesproken', 'Gesproken'],
    ['Interview klant', 'Interview klant'],
  ]) {
    assert.equal(vertaalStatus(ruw).stage, stage, ruw)
  }
})

test('xlsx-Status Shortlist landt op Gescoord en niet op Shortlist', () => {
  /*
    Het woord betekent aan de twee kanten iets anders. In kandidaten.xlsx is
    Shortlist "hoog gescoord, nog te benaderen"; in de ATS is het "gesproken en
    geschikt", vier treden verderop. Deze code zette hem tot 03-09-2026 op
    Shortlist, en dat is precies de verwisseling die eerder 25 kandidaten in de
    verkeerde fase zette. config/ats-mapping.json noemt dit zijn belangrijkste
    regel; deze toets houdt hem vast.
  */
  assert.equal(vertaalStatus('Shortlist').stage, 'Gescoord')
  assert.equal(vertaalStatus('shortlist').stage, 'Gescoord')

  // De gebeurtenis shortlist is iets anders en blijft wel op Shortlist zetten:
  // die komt van een skill die iemand al gesproken heeft.
  assert.equal(GEBEURTENISSEN.shortlist, 'Shortlist')
})
