// Toetsen op shared/score.mjs.
//
// De invoer hieronder is letterlijk overgenomen uit de base op 12-10-2026, want
// de onderbouwing is met de hand en door agents geschreven en volgt geen vast
// formaat. Een parser die alleen op verzonnen voorbeelden werkt, werkt niet.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { SCORE_BANDEN, scoreBand, scoreRegels } from '../../shared/score.mjs'

test('de grenzen liggen waar Dominique ze heeft gelegd', () => {
  assert.equal(scoreBand(80).label, 'Top fit')
  assert.equal(scoreBand(79).label, 'Sterke fit')
  assert.equal(scoreBand(70).label, 'Sterke fit')
  assert.equal(scoreBand(69).label, 'Goede fit')
  assert.equal(scoreBand(60).label, 'Goede fit')
  assert.equal(scoreBand(59).label, 'Grensgeval')
  assert.equal(scoreBand(50).label, 'Grensgeval')
  assert.equal(scoreBand(49).label, 'Niet passend')
  assert.equal(scoreBand(0).label, 'Niet passend')
  assert.equal(scoreBand(100).label, 'Top fit')
})

test('geen score is iets anders dan een lage score', () => {
  // Niet beoordeeld mag er nooit uitzien als beoordeeld en afgekeurd.
  assert.equal(scoreBand(null), null)
  assert.equal(scoreBand(undefined), null)
  assert.equal(scoreBand(Number.NaN), null)
})

test('elke band heeft een naam, zodat kleur nooit het enige signaal is', () => {
  for (const band of SCORE_BANDEN) {
    assert.ok(band.label.length > 0, `band ${band.id} zonder label`)
    assert.match(band.kleur, /^#[0-9a-f]{6}$/)
    assert.match(band.tint, /^#[0-9a-f]{6}$/)
  }
})

test('onderbouwing met punten wordt een rij dimensies', () => {
  const uit = scoreRegels(
    'Senioriteit 10/15. Locatie 0/15: Leusden buiten corridor. Branche-fit 0/10. Switching 4/10.',
  )
  assert.deepEqual(
    uit.dimensies.map((d) => [d.naam, d.behaald, d.max, d.toelichting]),
    [
      ['Senioriteit', 10, 15, ''],
      ['Locatie', 0, 15, 'Leusden buiten corridor'],
      ['Branche-fit', 0, 10, ''],
      ['Switching', 4, 10, ''],
    ],
  )
  assert.equal(uit.rest, '')
})

test('onderbouwing met puntkomma en letters ervoor werkt ook', () => {
  const uit = scoreRegels(
    'Core 55/60, custom 32/40. A Flexbranche 25/25; B Inspectie/norm 10/15; C Loon en fiscaal 20/20 (scoring v4)',
  )
  assert.deepEqual(
    uit.dimensies.map((d) => `${d.naam} ${d.behaald}/${d.max}`),
    ['Core 55/60', 'custom 32/40', 'A Flexbranche 25/25', 'B Inspectie/norm 10/15', 'C Loon en fiscaal 20/20'],
  )
  assert.equal(uit.rest, '(scoring v4)')
})

test('een naam met een schuine streep blijft heel', () => {
  // "Merk/NPD 0/12" mag niet als "Merk" plus iets raars eindigen.
  const uit = scoreRegels('FMCG-domein 0/20. Merk/NPD 0/12. Digitaal 0/8.')
  assert.deepEqual(
    uit.dimensies.map((d) => d.naam),
    ['FMCG-domein', 'Merk/NPD', 'Digitaal'],
  )
})

test('proza zonder breuken verdwijnt niet, het wordt de rest', () => {
  const tekst =
    'RA Specialist bij Keune Haircosmetics (Soest). Directe concurrent. Reistijd ~85 min. Score 63.'
  const uit = scoreRegels(tekst)
  assert.deepEqual(uit.dimensies, [])
  assert.ok(uit.rest.includes('Directe concurrent'))
  assert.ok(uit.rest.includes('Reistijd ~85 min'))
})

test('een losse opmerking achter de dimensies blijft staan', () => {
  const uit = scoreRegels('Senioriteit 12/15. Digitaal 0/8. False positive van title-filter.')
  assert.equal(uit.dimensies.length, 2)
  assert.equal(uit.rest, 'False positive van title-filter.')
})

test('het deel klopt, want dat tekent de balk', () => {
  const [eerste] = scoreRegels('Locatie 12/15.').dimensies
  assert.equal(eerste.deel, 0.8)
})

test('leeg levert niets op en valt niet om', () => {
  for (const leeg of ['', '   ', null, undefined]) {
    assert.deepEqual(scoreRegels(leeg), { dimensies: [], rest: '' })
  }
})

test('een breuk zonder naam of zonder maximum wordt geen lege bullet', () => {
  const uit = scoreRegels('Gewerkt 3/0. 10/20 zonder naam.')
  assert.deepEqual(uit.dimensies, [])
  assert.ok(uit.rest.length > 0)
})
