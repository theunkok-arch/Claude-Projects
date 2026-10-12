// Toets op de vertalingen van het klantportaal.
//
// De typecheck bewaakt al dat `en.ts` dezelfde sleutels heeft als `nl.ts`: een
// ontbrekende regel laat `npx tsc` en dus de build vallen. Wat de typecheck
// niet ziet, bewaakt deze toets:
//
// 1. Of elke stage, afvalreden en scoreband uit de gedeelde bron ook echt een
//    vertaling heeft. Voegt iemand een dertiende stage toe aan stages.mjs, dan
//    valt dat nergens op: `vertaalWaarde` laat een onbekende waarde staan zoals
//    hij is, dus een Engelse klant krijgt er stilzwijgend een Nederlands woord
//    bij.
// 2. Of elke foutcode die portal.mjs gooit, ook te vertalen is.
//
// Node 22 strippt types zelf, dus de .ts-bestanden zijn hier gewoon te laden.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { nl } from '../../src/klant/i18n/nl.ts'
import { en } from '../../src/klant/i18n/en.ts'
import { ALLE_AFVAL_REDENEN, STAGE_IDS } from '../../shared/stages.mjs'
import { SCORE_BANDEN } from '../../shared/score.mjs'

const WORTEL = fileURLToPath(new URL('../..', import.meta.url))
const lees = (pad) => readFileSync(`${WORTEL}${pad}`, 'utf8')

const TALEN = { nl, en }

/** Alle sleutelpaden van een object, als 'a.b.c'. */
function paden(waarde, prefix = '') {
  if (typeof waarde !== 'object' || waarde === null) return [prefix]
  return Object.entries(waarde).flatMap(([k, v]) => paden(v, prefix ? `${prefix}.${k}` : k))
}

test('Engels heeft precies dezelfde sleutels als Nederlands', () => {
  // De typecheck dekt dit ook, maar die draait niet mee in npm test. Twee
  // sloten op een deur die stilletjes open kan staan bij een opdrachtgever.
  assert.deepEqual(paden(en).sort(), paden(nl).sort())
})

test('wat in het Nederlands een zin met een getal is, is dat in het Engels ook', () => {
  // Anders wordt `t.vacature.dagenInFase(3)` in het Engels een vaste zin en
  // verdwijnt het getal.
  for (const pad of paden(nl)) {
    const bij = (boom) => pad.split('.').reduce((o, k) => o[k], boom)
    assert.equal(
      typeof bij(en),
      typeof bij(nl),
      `${pad} is ${typeof bij(nl)} in nl en ${typeof bij(en)} in en`,
    )
    if (typeof bij(nl) === 'function') {
      assert.equal(bij(en).length, bij(nl).length, `${pad} heeft een ander aantal invullingen`)
    }
  }
})

test('geen lege vertaling', () => {
  for (const [taal, boom] of Object.entries(TALEN)) {
    for (const pad of paden(boom)) {
      const waarde = pad.split('.').reduce((o, k) => o[k], boom)
      if (typeof waarde === 'string') {
        assert.ok(waarde.trim().length > 0, `${taal}: ${pad} is leeg`)
      }
    }
  }
})

test('elke stage uit de gedeelde bron heeft een vertaling', () => {
  for (const [taal, boom] of Object.entries(TALEN)) {
    for (const stage of STAGE_IDS) {
      assert.ok(boom.stage[stage], `${taal}: stage "${stage}" ontbreekt`)
    }
    assert.equal(
      Object.keys(boom.stage).length,
      STAGE_IDS.length,
      `${taal}: de stagelijst loopt uit de pas met stages.mjs`,
    )
  }
})

test('elke afvalreden uit de gedeelde bron heeft een vertaling', () => {
  for (const [taal, boom] of Object.entries(TALEN)) {
    for (const reden of ALLE_AFVAL_REDENEN) {
      assert.ok(boom.reden[reden], `${taal}: afvalreden "${reden}" ontbreekt`)
    }
    assert.equal(Object.keys(boom.reden).length, ALLE_AFVAL_REDENEN.length)
  }
})

test('elke scoreband heeft een vertaling', () => {
  for (const [taal, boom] of Object.entries(TALEN)) {
    for (const band of SCORE_BANDEN) {
      assert.ok(boom.score.banden[band.id], `${taal}: band "${band.id}" ontbreekt`)
    }
  }
})

test('elke vacaturestatus uit types.ts heeft een vertaling', () => {
  // Binnen het blok van Vacature zoeken: Opdrachtgever en Portaalgebruiker
  // hebben ook een Status, met andere waarden.
  const bron = lees('src/lib/types.ts')
  const blok = /export interface Vacature[\s\S]*?\n}/.exec(bron)
  assert.ok(blok, 'de interface Vacature is niet meer te vinden in types.ts')
  const regel = /Status\?: ('[^']+'(?:\s*\|\s*'[^']+')+)/.exec(blok[0])
  assert.ok(regel, 'de statuslijst van Vacature is niet meer te vinden')
  const statussen = [...regel[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  assert.ok(statussen.length >= 5)
  for (const [taal, boom] of Object.entries(TALEN)) {
    for (const status of statussen) {
      assert.ok(boom.vacaturestatus[status], `${taal}: status "${status}" ontbreekt`)
    }
  }
})

test('elke foutcode die portal.mjs gooit is te vertalen', () => {
  const bron = lees('netlify/functions/portal.mjs')
  const codes = [...bron.matchAll(/new HttpError\([0-9]+,[^,)]*(?:,\s*'([a-zA-Z]+)')?/g)]
    .map((m) => m[1])
    .filter(Boolean)

  assert.ok(codes.length >= 9, `maar ${codes.length} codes gevonden, dat lijkt te weinig`)
  for (const [taal, boom] of Object.entries(TALEN)) {
    for (const code of new Set(codes)) {
      assert.ok(boom.fout[code], `${taal}: foutcode "${code}" heeft geen tekst`)
    }
  }
})

test('de woordenlijsten zijn echt vertaald en niet overgeschreven', () => {
  // Een kopie van het Nederlands is geen vertaling. Een enkel woord mag gelijk
  // blijven (Timing, Intake, On hold), maar als de hele lijst gelijk is, heeft
  // iemand hem geplakt in plaats van vertaald.
  const stagesGelijk = STAGE_IDS.filter((stage) => en.stage[stage] === nl.stage[stage])
  assert.ok(
    stagesGelijk.length <= 2,
    `te veel stages onvertaald: ${stagesGelijk.join(', ')}`,
  )

  const redenenGelijk = ALLE_AFVAL_REDENEN.filter((r) => en.reden[r] === nl.reden[r])
  assert.ok(
    redenenGelijk.length <= 2,
    `te veel afvalredenen onvertaald: ${redenenGelijk.join(', ')}`,
  )
})
