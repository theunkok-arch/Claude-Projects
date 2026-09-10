import { test } from 'node:test'
import assert from 'node:assert/strict'

import { MAX_RONDES, rondes } from '../../shared/rondes.mjs'

const aanmelding = (Zoekronde) => ({ Zoekronde })

test('telt per ronde', () => {
  const uit = rondes([aanmelding('Ronde 1'), aanmelding('Ronde 3'), aanmelding('Ronde 1')])
  assert.deepEqual(uit, [
    { ronde: 'Ronde 3', aantal: 1 },
    { ronde: 'Ronde 1', aantal: 2 },
  ])
})

test('hoogste ronde eerst, ook voorbij de tien', () => {
  // Op tekst sorteren zou "Ronde 10" tussen 1 en 2 zetten. Dit is de toets die
  // dat merkt; zonder deze regel valt het pas op bij een lange search.
  const uit = rondes([aanmelding('Ronde 2'), aanmelding('Ronde 10'), aanmelding('Ronde 1')])
  assert.deepEqual(
    uit.map((r) => r.ronde),
    ['Ronde 10', 'Ronde 2', 'Ronde 1'],
  )
})

test('een ronde zonder nummer zakt naar achteren en blijft op zijn plek', () => {
  const uit = rondes([aanmelding('Herstart najaar'), aanmelding('Ronde 1'), aanmelding('Alumni-actie')])
  assert.deepEqual(
    uit.map((r) => r.ronde),
    ['Ronde 1', 'Alumni-actie', 'Herstart najaar'],
  )
})

test('leeg, wit en ontbrekend tellen niet mee', () => {
  // Leeg betekent "niet vastgelegd", niet ronde 1. Een verzamelbak-chip zou
  // suggereren dat die aanmeldingen ergens bij horen.
  const uit = rondes([
    aanmelding('Ronde 1'),
    aanmelding(''),
    aanmelding('   '),
    aanmelding(undefined),
    {},
    null,
  ])
  assert.deepEqual(uit, [{ ronde: 'Ronde 1', aantal: 1 }])
})

test('spaties eromheen maken geen tweede ronde', () => {
  const uit = rondes([aanmelding('Ronde 2'), aanmelding(' Ronde 2 ')])
  assert.deepEqual(uit, [{ ronde: 'Ronde 2', aantal: 2 }])
})

test('geen aanmeldingen geeft een lege lijst en valt niet om', () => {
  assert.deepEqual(rondes([]), [])
  assert.deepEqual(rondes(undefined), [])
  assert.deepEqual(rondes(null), [])
})

test('de chiprij blijft kort genoeg voor één regel op een telefoon', () => {
  assert.ok(MAX_RONDES >= 2 && MAX_RONDES <= 6)
})
