// Toets op POST /api/outreach, het eindpunt waarmee de Cowork-skills melden
// wat er met een kandidaat is gebeurd.
//
// Alles hier draait zonder netwerk en zonder de base: de regels die ertoe doen
// (mag deze stap, hoort dit veld bij deze gebeurtenis, wat komt eruit) zijn
// losgetrokken van het ophalen, precies zoals in portal.test.mjs.
//
// De drie blokken hieronder volgen de drie gevallen onder "Testen" in
// ATS-ENDPOINT-UITBREIDING.md.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  VOLGORDE,
  activiteitTypeVoor,
  antwoord,
  controleerVelden,
  controleerVolgorde,
  notitie,
} from '../../netlify/functions/outreach.mjs'
import { STAGE_IDS, isKlantZichtbaar } from '../../shared/stages.mjs'

/**
 * assert.throws geeft de fout zelf niet terug, en juist daar gaat het hier om:
 * de statuscode en de Nederlandse tekst zijn wat de skill te zien krijgt.
 */
function vang(actie) {
  try {
    actie()
  } catch (fout) {
    return fout
  }
  assert.fail('Er werd geen fout gegooid.')
}

// ── Geval 1: vooruit ────────────────────────────────────────────────────────
// meld_ats.py --gebeurtenis voorgesteld --zichtbaar-voor-klant --notitie "test"
// verwacht: ok, fase Voorgesteld, zichtbaarVoorKlant true

test('vooruit naar Voorgesteld mag, en levert ok met fase en zichtbaarVoorKlant', () => {
  assert.equal(controleerVolgorde('Gesproken', 'Voorgesteld'), 'vooruit')

  const { genegeerd } = controleerVelden('voorgesteld', 'Voorgesteld', {
    zichtbaarVoorKlant: true,
    notitie: 'test',
  })
  assert.deepEqual(genegeerd, [], 'zichtbaarVoorKlant hoort hier wel thuis')

  const uit = antwoord({
    ongewijzigd: false,
    aanmelding: 'recA1',
    fase: 'Voorgesteld',
    van: 'Gesproken',
    naar: 'Voorgesteld',
    genegeerd,
    zichtbaarVoorKlant: true,
  })
  assert.equal(uit.ok, true)
  assert.equal(uit.fase, 'Voorgesteld')
  assert.equal(uit.zichtbaarVoorKlant, true)
  assert.ok(!('genegeerd' in uit), 'niets genegeerd, dus geen lege lijst in het antwoord')
})

test('een trede overslaan mag ook', () => {
  // Gesproken naar Voorgesteld zonder Shortlist ertussen: dat gebeurt echt,
  // en het eindpunt hoort daar niet over te struikelen.
  assert.equal(controleerVolgorde('Gesproken', 'Voorgesteld'), 'vooruit')
  assert.equal(controleerVolgorde('Gescoord', 'Geplaatst'), 'vooruit')
})

test('dezelfde stage is geen fout maar een herhaling', () => {
  assert.equal(controleerVolgorde('Voorgesteld', 'Voorgesteld'), 'ongewijzigd')
})

// ── Geval 2: terug ──────────────────────────────────────────────────────────
// meld_ats.py --gebeurtenis gesproken (terwijl de kandidaat al verder staat)
// verwacht: 409 met Nederlandse fouttekst

test('terugzetten geeft 409 met een Nederlandse tekst die de huidige stage noemt', () => {
  const fout = vang(() => controleerVolgorde('Interview klant', 'Gesproken'))
  assert.equal(fout.status, 409)
  assert.equal(
    fout.message,
    'Aanmelding staat al op Interview klant; terugzetten doe je in de ATS zelf.',
  )
})

test('vanuit Afgevallen terug de pijplijn in geeft 409', () => {
  const fout = vang(() => controleerVolgorde('Afgevallen', 'Gesproken'))
  assert.equal(fout.status, 409)
  assert.equal(fout.message, 'Kandidaat is afgevallen; heropenen doe je in de ATS zelf.')
})

test('afvallen mag vanuit elke stage', () => {
  for (const stage of VOLGORDE) {
    assert.equal(controleerVolgorde(stage, 'Afgevallen'), 'vooruit', stage)
  }
})

test('een aanmelding zonder stage wordt niet als stap terug gelezen', () => {
  // indexOf geeft daar -1, en zonder deze regel zou elke stap "terug" heten.
  assert.equal(controleerVolgorde(null, 'Benaderd'), 'vooruit')
  assert.equal(controleerVolgorde('Iets ouds', 'Benaderd'), 'vooruit')
})

// ── Geval 3: interviewdatum bij de verkeerde gebeurtenis ────────────────────
// meld_ats.py --gebeurtenis aanbod --interviewdatum 2026-09-10
// Het script hoort dit zelf al te weigeren; het eindpunt is de tweede sluis.

test('interviewdatum bij aanbod geeft 400 met een Nederlandse tekst', () => {
  const fout = vang(() => controleerVelden('aanbod', 'Aanbod', { interviewdatum: '2026-09-10' }))
  assert.equal(fout.status, 400)
  assert.equal(fout.message, 'interviewdatum hoort alleen bij de gebeurtenis "interview klant".')
})

test('interviewdatum bij interview klant mag, maar moet een datum zijn', () => {
  const goed = controleerVelden('interview klant', 'Interview klant', {
    interviewdatum: '2026-09-10',
  })
  assert.equal(goed.interviewdatum, '2026-09-10')

  const fout = vang(() =>
    controleerVelden('interview klant', 'Interview klant', { interviewdatum: '10-09-2026' }),
  )
  assert.equal(fout.status, 400)
  assert.equal(fout.message, 'interviewdatum moet een datum zijn in de vorm JJJJ-MM-DD.')
})

test('de interviewdatum komt in de toelichting terecht', () => {
  const tekst = notitie({ notitie: 'Dennis kan die ochtend' }, 'interview klant', '2026-09-10', '2026-09-03')
  assert.ok(tekst.includes('2026-09-10'), tekst)
  assert.ok(tekst.includes('Dennis kan die ochtend'), tekst)
})

// ── zichtbaarVoorKlant bij een te vroege gebeurtenis ────────────────────────

test('zichtbaarVoorKlant voor Voorgesteld wordt genegeerd en gemeld', () => {
  const { genegeerd } = controleerVelden('gesproken', 'Gesproken', { zichtbaarVoorKlant: true })
  assert.deepEqual(genegeerd, ['zichtbaarVoorKlant'])

  const uit = antwoord({ ongewijzigd: false, fase: 'Gesproken', genegeerd })
  assert.deepEqual(uit.genegeerd, ['zichtbaarVoorKlant'])
  assert.equal(uit.zichtbaarVoorKlant, false, 'en het vinkje staat dus ook echt uit')
})

test('het antwoord draagt altijd zichtbaarVoorKlant, ook zonder dat veld in de payload', () => {
  assert.equal(antwoord({ ongewijzigd: true, fase: 'Aanbod' }).zichtbaarVoorKlant, true)
  assert.equal(antwoord({ ongewijzigd: true, fase: 'Benaderd' }).zichtbaarVoorKlant, false)
})

// ── Kanaal naar activiteitsoort ─────────────────────────────────────────────

test('het kanaal bepaalt het soort activiteit, en onbekend valt terug op Statuswijziging', () => {
  assert.equal(activiteitTypeVoor('InMail'), 'InMail')
  assert.equal(activiteitTypeVoor('e-mail'), 'E-mail')
  assert.equal(activiteitTypeVoor('telefoon'), 'Telefoon')
  assert.equal(activiteitTypeVoor(undefined), 'Statuswijziging')
  assert.equal(activiteitTypeVoor('duivenpost'), 'Statuswijziging')
})

// ── De volgorde zelf ────────────────────────────────────────────────────────

test('de volgorde is de pijplijn zonder Afgevallen', () => {
  assert.deepEqual(VOLGORDE, STAGE_IDS.filter((s) => s !== 'Afgevallen'))
  assert.equal(VOLGORDE.length, 11)
  // De grens waarop het portaal de kandidaat gaat tonen, ligt op Voorgesteld.
  assert.equal(isKlantZichtbaar(VOLGORDE[VOLGORDE.indexOf('Voorgesteld')]), true)
  assert.equal(isKlantZichtbaar('Gesproken'), false)
})
