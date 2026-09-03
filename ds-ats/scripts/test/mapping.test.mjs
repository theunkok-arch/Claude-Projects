// Toets op config/ats-mapping.json en shared/mapping.mjs.
//
// Dit bestand bestaat omdat het importscript en /api/outreach hun vertaling uit
// elkaar lieten lopen. De toetsen hieronder bewaken dat ze weer één bron delen,
// en dat die bron alleen namen bevat die de ATS kent.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  BRON_DEFAULT,
  BRON_PATRONEN,
  GEBEURTENISSEN,
  IMPORT_STAGES,
  MAPPING_VERSIE,
  NIET_IMPORTEREN,
  XLSX_STATUS,
} from '../../shared/mapping.mjs'
import { STAGE_IDS } from '../../shared/stages.mjs'
import { STATUS_MAP, vertaalBron, vertaalStatus } from '../import/status-map.mjs'

const bestand = JSON.parse(
  readFileSync(new URL('../../config/ats-mapping.json', import.meta.url), 'utf8'),
)

test('het bestand is de bron, niet een kopie in code', () => {
  assert.equal(MAPPING_VERSIE, bestand.versie)
  assert.equal(Object.keys(GEBEURTENISSEN).length, 11)
  for (const [gebeurtenis, stage] of Object.entries(GEBEURTENISSEN)) {
    assert.equal(stage, bestand.gebeurtenissen[gebeurtenis], gebeurtenis)
  }
})

test('geen enkele vertaling wijst naar een fase die de ATS niet kent', () => {
  // Airtable maakt met typecast stilzwijgend een nieuwe keuze-optie van een
  // onbekende waarde. Een typefout in de JSON zou dus geen fout geven maar een
  // twaalfde stage, en die telt in geen enkel overzicht mee.
  for (const [sleutel, stage] of Object.entries({ ...GEBEURTENISSEN, ...IMPORT_STAGES })) {
    assert.ok(STAGE_IDS.includes(stage), `${sleutel} wijst naar "${stage}"`)
  }
})

test('de terugvertaling dekt elke ATS-fase', () => {
  // ats_naar_xlsx houdt de werkkopie in de pas. Ontbreekt er een fase, dan
  // weet log_outreach niet wat het in de xlsx moet zetten.
  for (const stage of STAGE_IDS) {
    assert.ok(XLSX_STATUS[stage], `geen xlsx-status voor ${stage}`)
  }
})

test('het bestand wint van de aliassen in code', () => {
  // status-map.mjs kent schrijfwijzen die het bestand niet heeft ("inmail 2",
  // "gesprek/wachten"). Die vullen aan; ze mogen nooit overschrijven.
  for (const [status, stage] of Object.entries(IMPORT_STAGES)) {
    const sleutel = status.toLowerCase()
    assert.equal(STATUS_MAP[sleutel]?.stage, stage, status)
  }
  // En de aliassen zijn er nog wel.
  assert.equal(vertaalStatus('inmail 2').stage, 'Benaderd')
  assert.equal(vertaalStatus('gesprek/wachten').stage, 'Gesproken')
})

test('de bronpatronen worden op volgorde gelegd', () => {
  // Volgorde telt: "linkedin-salesnav-direct" bevat allebei, en moet op
  // Sales Navigator uitkomen en niet op LinkedIn regulier.
  assert.equal(vertaalBron('linkedin-salesnav-direct'), 'LinkedIn Sales Navigator')
  assert.equal(vertaalBron('LinkedIn regulier zoekopdracht'), 'LinkedIn regulier')
  const salesnav = BRON_PATRONEN.findIndex((p) => p.bevat === 'salesnav')
  const linkedin = BRON_PATRONEN.findIndex((p) => p.bevat === 'linkedin')
  assert.ok(salesnav < linkedin, 'salesnav hoort vóór linkedin te staan')
})

test('een bron zonder treffer valt op de default en niet op niets', () => {
  assert.equal(vertaalBron('praatje bij de bakker'), BRON_DEFAULT)
  assert.equal(BRON_DEFAULT, 'Overig')
  // Leeg blijft leeg: dat is "niet ingevuld", geen bron met de naam Overig.
  assert.equal(vertaalBron(''), null)
  assert.equal(vertaalBron(undefined), null)
})

test('de patronen zijn substrings en geen reguliere expressies', () => {
  // Het bestand wordt ook door Python gelezen. Een regex die daar net anders
  // werkt is precies het verschil dat één gedeeld bestand moet uitsluiten.
  for (const { bevat, ats } of BRON_PATRONEN) {
    assert.equal(typeof bevat, 'string')
    assert.equal(bevat, bevat.toLowerCase(), `${bevat} hoort in kleine letters`)
    assert.ok(!/[\\^$*+?()[\]{}|]/.test(bevat), `${bevat} ziet eruit als een regex`)
    assert.equal(typeof ats, 'string')
  }
})

test('niet_importeren is een lijst en geen losse waarde', () => {
  // Het importscript leest hem als verzameling; een string zou karakter voor
  // karakter worden doorlopen zonder dat iemand dat merkt.
  assert.ok(Array.isArray(NIET_IMPORTEREN))
  assert.deepEqual(NIET_IMPORTEREN, ['Twijfel'])
})
