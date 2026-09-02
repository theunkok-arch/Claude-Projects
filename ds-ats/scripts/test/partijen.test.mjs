// Tests op shared/partijen.mjs. Wat hier fout gaat, gaat stil fout: een
// verkeerde volgorde levert geen foutmelding op maar de verkeerde partij onder
// de knop "Nieuw te beoordelen", en dan beoordeelt Dominique de lijst van
// vorige week.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_PARTIJEN, nieuwstePartij, partijen } from '../../shared/partijen.mjs'

/** De echte verdeling in de base op 02-09-2026, gemeten op 644 aanmeldingen. */
const ECHT = [
  ...Array.from({ length: 497 }, () => ({ 'Datum aangemaakt': '2026-08-28' })),
  ...Array.from({ length: 54 }, () => ({ 'Datum aangemaakt': '2026-08-31' })),
  ...Array.from({ length: 49 }, () => ({ 'Datum aangemaakt': '2026-09-02' })),
]

test('telt per dag en zet de nieuwste vooraan', () => {
  assert.deepEqual(partijen(ECHT), [
    { datum: '2026-09-02', aantal: 49 },
    { datum: '2026-08-31', aantal: 54 },
    { datum: '2026-08-28', aantal: 497 },
  ])
})

test('de nieuwste partij is de laatste aanlevering, niet de grootste', () => {
  // 28-08 heeft tien keer zoveel rijen. Zou de sortering op aantal gaan, dan
  // wees "Nieuw te beoordelen" naar de oudste partij van allemaal.
  assert.equal(nieuwstePartij(ECHT), '2026-09-02')
})

test('sorteert op datum en niet op tekstvolgorde van invoer', () => {
  const doorelkaar = [
    { 'Datum aangemaakt': '2026-01-05' },
    { 'Datum aangemaakt': '2026-12-31' },
    { 'Datum aangemaakt': '2026-02-10' },
  ]
  assert.deepEqual(
    partijen(doorelkaar).map((p) => p.datum),
    ['2026-12-31', '2026-02-10', '2026-01-05'],
  )
})

test('een jaargrens gaat goed', () => {
  const overJaar = [{ 'Datum aangemaakt': '2025-12-31' }, { 'Datum aangemaakt': '2026-01-01' }]
  assert.equal(nieuwstePartij(overJaar), '2026-01-01')
})

test('aanmeldingen zonder bruikbare datum vormen geen partij', () => {
  const rommel = [
    { 'Datum aangemaakt': '2026-09-02' },
    {},
    { 'Datum aangemaakt': null },
    { 'Datum aangemaakt': '' },
    { 'Datum aangemaakt': 'gisteren' },
    { 'Datum aangemaakt': '2026-09-02T10:00:00Z' },
    null,
  ]
  assert.deepEqual(partijen(rommel), [{ datum: '2026-09-02', aantal: 1 }])
})

test('leeg blijft leeg, zonder te struikelen', () => {
  assert.deepEqual(partijen([]), [])
  assert.deepEqual(partijen(null), [])
  assert.equal(nieuwstePartij([]), null)
})

test('er passen genoeg partijen op het scherm om een week terug te kijken', () => {
  assert.ok(MAX_PARTIJEN >= 5 && MAX_PARTIJEN <= 10)
})
