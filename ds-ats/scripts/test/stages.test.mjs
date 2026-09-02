// Tests op shared/stages.mjs, de enige bron voor de pipeline-definitie.
//
// Wat hier fout gaat, gaat stil fout: een typefout in een stagenaam levert geen
// foutmelding op maar een knop die niets doet, en een reden die Airtable niet
// kent belandt als afvaller zonder reden in de base.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ALLE_AFVAL_REDENEN, STAGES, STAGE_IDS } from '../../shared/stages.mjs'

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
