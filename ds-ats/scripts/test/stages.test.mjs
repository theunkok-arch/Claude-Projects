// Tests op shared/stages.mjs, de enige bron voor de pipeline-definitie.
//
// Wat hier fout gaat, gaat stil fout: een typefout in een stagenaam levert geen
// foutmelding op maar een knop die niets doet, en een reden die Airtable niet
// kent belandt als afvaller zonder reden in de base.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ALLE_AFVAL_REDENEN,
  MEEST_GEBRUIKTE_REDENEN,
  STAGES,
  STAGE_IDS,
  dagenTussen,
  normOverschreden,
  werkdagenTussen,
  onbekendeStages,
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

// ── De snelkoppeling naar de meestgebruikte afvalredenen ────────────────────

test('elke meestgebruikte reden bestaat ook echt', () => {
  // De waarde gaat rechtstreeks naar het singleSelect "Reden afvallen" in
  // Airtable. Een reden die hier anders is gespeld dan in AFVAL_REDENEN levert
  // geen foutmelding op maar een tweede optie in de base, en daarmee tellingen
  // die niet meer optellen.
  for (const reden of MEEST_GEBRUIKTE_REDENEN) {
    assert.ok(ALLE_AFVAL_REDENEN.includes(reden), `onbekende reden ${reden}`)
  }
})

test('de snelkoppeling is korter dan de volledige lijst', () => {
  // Zou hij even lang worden, dan is het geen snelkoppeling meer maar een
  // tweede kopie van dezelfde lijst.
  assert.ok(MEEST_GEBRUIKTE_REDENEN.length < ALLE_AFVAL_REDENEN.length)
  assert.equal(new Set(MEEST_GEBRUIKTE_REDENEN).size, MEEST_GEBRUIKTE_REDENEN.length)
})

test('een stage die hier niet staat wordt geteld in plaats van genegeerd', () => {
  // Op 12-10-2026 stonden zeven aanmeldingen op "Nieuw", een optie die wel in de
  // base zat en niet in dit bestand. Ze telden als actief, maar hadden geen
  // tegel, geen groep en geen norm. Stil verdwenen is de ergste uitkomst.
  const uit = onbekendeStages(['Gescoord', 'Nieuw', 'Nieuw', 'Benaderd'])
  assert.deepEqual(uit, [{ stage: 'Nieuw', aantal: 2 }])
})

test('bekende stages leveren niets op, Afgevallen incluis', () => {
  // Afgevallen staat niet in de trechter maar wel in STAGE_IDS. Hem hier
  // meetellen zou bij elke vacature een valse melding geven.
  assert.deepEqual(onbekendeStages(STAGE_IDS), [])
  assert.deepEqual(onbekendeStages(['Afgevallen', 'Ingewerkt']), [])
})

test('leeg en ontbrekend zijn geen onbekende stage', () => {
  assert.deepEqual(onbekendeStages(['', null, undefined]), [])
  assert.deepEqual(onbekendeStages([]), [])
  assert.deepEqual(onbekendeStages(undefined), [])
})

test('meerdere onbekende stages staan op aantal, grootste eerst', () => {
  const uit = onbekendeStages(['Zzz', 'Aaa', 'Aaa', 'Zzz', 'Aaa'])
  assert.deepEqual(uit, [
    { stage: 'Aaa', aantal: 3 },
    { stage: 'Zzz', aantal: 2 },
  ])
})
