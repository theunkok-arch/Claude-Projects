// Tests op shared/stages.mjs, de enige bron voor de pipeline-definitie.
//
// Wat hier fout gaat, gaat stil fout: een typefout in een stagenaam levert geen
// foutmelding op maar een knop die niets doet, en een reden die Airtable niet
// kent belandt als afvaller zonder reden in de base.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ALLE_AFVAL_REDENEN,
  STAGES,
  STAGE_IDS,
  dagenTussen,
  normOverschreden,
  werkdagenTussen,
} from '../../shared/stages.mjs'

test('elke volgendeStage wijst naar een bestaande stage', () => {
  for (const stage of STAGES) {
    if (!stage.volgendeStage) continue
    assert.ok(
      STAGE_IDS.includes(stage.volgendeStage),
      `${stage.id} wijst naar onbekende stage ${stage.volgendeStage}`,
    )
  }
})

test('elke volgendeStage heeft een label voor op de knop', () => {
  for (const stage of STAGES) {
    if (!stage.volgendeStage) continue
    assert.ok(stage.volgendeLabel, `${stage.id} heeft geen volgendeLabel`)
  }
})

test('een volgendeReden hoort bij Afgevallen en staat in de redenlijst', () => {
  for (const stage of STAGES) {
    if (!stage.volgendeReden) continue
    assert.equal(stage.volgendeStage, 'Afgevallen', `${stage.id} geeft een reden zonder af te vallen`)
    assert.ok(
      ALLE_AFVAL_REDENEN.includes(stage.volgendeReden),
      `${stage.id} gebruikt onbekende reden ${stage.volgendeReden}`,
    )
  }
})

test('een stap naar Afgevallen draagt altijd een reden mee', () => {
  // De bottom sheet dwingt een reden af; de knop omzeilt die sheet en zou dus
  // een afvaller zonder reden kunnen maken.
  for (const stage of STAGES) {
    if (stage.volgendeStage !== 'Afgevallen') continue
    assert.ok(stage.volgendeReden, `${stage.id} valt af zonder reden`)
  }
})

test('geen enkele stage wijst naar zichzelf', () => {
  for (const stage of STAGES) {
    assert.notEqual(stage.volgendeStage, stage.id, `${stage.id} wijst naar zichzelf`)
  }
})

// ── De oranje rand en "Over de norm" ────────────────────────────────────────
//
// De kaartrand hing aan een vaste tien kalenderdagen, terwijl de lijst "Over de
// norm" rekent met werkdagen tegen de norm van die stage. De twee tests
// hieronder leggen precies de gevallen vast waarin die twee uit elkaar liepen.

test('elf kalenderdagen op Opgevolgd is binnen de norm van twaalf werkdagen', () => {
  // Maandag 17 augustus tot en met vrijdag 28 augustus 2026.
  assert.equal(dagenTussen('2026-08-17', '2026-08-28'), 11)
  assert.equal(werkdagenTussen('2026-08-17', '2026-08-28'), 9)
  // Onder de oude regel (meer dan tien kalenderdagen) kreeg deze kaart een
  // oranje rand, terwijl hij drie werkdagen speling had.
  assert.equal(normOverschreden('Opgevolgd', '2026-08-17', '2026-08-28'), false)
})

test('zes kalenderdagen op Gereageerd is over de norm van drie werkdagen', () => {
  // Maandag 17 augustus tot en met zondag 23 augustus 2026.
  assert.equal(dagenTussen('2026-08-17', '2026-08-23'), 6)
  assert.equal(werkdagenTussen('2026-08-17', '2026-08-23'), 4)
  // Onder de oude regel bleef deze kaart grijs, terwijl hij wel in de lijst
  // "Over de norm" stond.
  assert.equal(normOverschreden('Gereageerd', '2026-08-17', '2026-08-23'), true)
})

test('stages zonder norm slaan nooit alarm', () => {
  for (const stage of STAGES) {
    if (stage.norm !== 0) continue
    assert.equal(normOverschreden(stage.id, '2020-01-01', '2026-08-28'), false, stage.id)
  }
})
