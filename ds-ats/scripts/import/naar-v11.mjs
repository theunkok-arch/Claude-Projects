#!/usr/bin/env node
// Zet een oude kandidatenlijst om naar de kolomindeling van kandidaten-schema
// v1.1, zonder iets weg te gooien.
//
//   node scripts/import/naar-v11.mjs <bron.csv> > uit.csv
//
// Waarom dit bestaat: de sheets in de Drive volgen drie verschillende
// indelingen, en de importer moet per bestand raden welke kolom wat betekent.
// Eén keer omzetten naar de canonieke indeling is goedkoper dan bij elke
// import opnieuw synoniemen bijhouden.
//
// Twee dingen doet dit script bewust NIET:
//
// 1. Het verzint geen waarden. Kolommen die het schema kent maar de bron niet
//    heeft (Bron, E-mail, Telefoon, Reistijd minuten, Concurrent, Datum status)
//    blijven leeg. Een lege cel is zichtbaar; een verzonnen datum niet, en die
//    voedt wel de servicenormklok.
//
// 2. Het vertaalt de statuswaarden niet. De v1.1-lijst kent `Interview klant`,
//    `Aanbod`, `Geplaatst` en `Ingewerkt` niet; die stopt bij `Voorgesteld`.
//    Een kandidaat met een openstaand aanbod zou daarmee terugvallen naar
//    "voorgesteld", en dat is geen omzetting maar verlies. De statuskolom gaat
//    daarom ongewijzigd mee en de ATS-importer vertaalt hem verderop.

import { readFileSync } from 'node:fs'
import { leesCsv } from './lees.mjs'

/** De 21 kolommen van kandidaten-schema v1.1, in volgorde. */
const V11 = [
  'Naam',
  'Bron-URL',
  'Bron',
  'E-mail',
  'Telefoon',
  'Huidige rol',
  'Werkgever',
  'Tenure',
  'Woonplaats',
  'Reistijd minuten',
  'Signaal/observatie',
  'Concurrent',
  'Score core (60)',
  'Score custom (40)',
  'Totaal (100)',
  'Onderbouwing',
  'Outreach-concept',
  'Status',
  'Datum status',
  'Reden afvallen',
  'Opmerkingen',
]

/**
 * De vijf core- en twee custom-dimensies van het oude Royal Sanders-blad.
 * Ze tellen op tot exact 60 en 40; dat is gecontroleerd voor het omzetten,
 * en het script controleert het per rij opnieuw.
 */
const CORE = [
  'Senioriteit (15)',
  'Locatie (15)',
  'Branche-fit (10)',
  'Switching-signaal (10)',
  'Kerncriterium-match (10)',
]
const CUSTOM = ['Domein-ervaring (formulering / lab) (25)', 'Opleiding en certificering (15)']

/** Kolommen die het schema niet kent maar die wel inhoud dragen. */
const NAAR_SIGNAAL = ['Vorige rollen', 'Activiteit/OTW']
const NAAR_OPMERKINGEN = ['Oude fase (backup)']

const getal = (waarde) => {
  const n = Number.parseFloat(String(waarde ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/**
 * "Eindhoven, Noord-Brabant. ca. 35-40 km Vlijmen." wordt Woonplaats
 * "Eindhoven, Noord-Brabant" plus een opmerking met de rest.
 *
 * De reisafstand staat in kilometers en het schema vraagt minuten. Die twee
 * zijn niet in elkaar om te rekenen zonder de route te kennen, dus blijft
 * Reistijd minuten leeg en gaat de oorspronkelijke tekst mee als opmerking.
 * Liever een lege kolom dan een verzonnen getal waar iemand op plant.
 */
function splitsLocatie(ruw) {
  const tekst = String(ruw ?? '').trim()
  if (!tekst) return { woonplaats: '', rest: '' }
  const grens = tekst.search(/[.(]/)
  if (grens === -1) return { woonplaats: tekst, rest: '' }
  return { woonplaats: tekst.slice(0, grens).trim(), rest: tekst.slice(grens).replace(/^[.\s]+/, '').trim() }
}

const bron = process.argv[2]
if (!bron) {
  console.error('Gebruik: node scripts/import/naar-v11.mjs <bron.csv> > uit.csv')
  process.exit(1)
}

const rijen = leesCsv(readFileSync(bron, 'utf8'))
const uit = []
const gemist = []

for (const rij of rijen) {
  if (!String(rij.Naam ?? '').trim()) continue

  const core = CORE.reduce((som, k) => som + getal(rij[k]), 0)
  const custom = CUSTOM.reduce((som, k) => som + getal(rij[k]), 0)
  const totaal = getal(rij['Totaal (100)'])
  if (core + custom !== totaal) {
    gemist.push(`${rij.Naam}: ${core} + ${custom} = ${core + custom}, maar Totaal is ${totaal}`)
  }

  const { woonplaats, rest } = splitsLocatie(rij['Locatie + reisafstand'])

  const signaal = [rij['Signaal/observatie'], ...NAAR_SIGNAAL.map((k) => rij[k])]
    .map((w) => String(w ?? '').trim())
    .filter(Boolean)
    .join(' | ')

  const opmerkingen = [...NAAR_OPMERKINGEN.map((k) => rij[k]), rest && `Locatie-notitie: ${rest}`]
    .map((w) => String(w ?? '').trim())
    .filter(Boolean)
    .join('\n\n')

  uit.push({
    Naam: rij.Naam,
    'Bron-URL': rij['Bron-URL'] ?? '',
    Bron: '',
    'E-mail': '',
    Telefoon: '',
    'Huidige rol': rij['Huidige rol'] ?? '',
    Werkgever: rij.Werkgever ?? '',
    Tenure: rij.Tenure ?? '',
    Woonplaats: woonplaats,
    'Reistijd minuten': '',
    'Signaal/observatie': signaal,
    Concurrent: '',
    'Score core (60)': core,
    'Score custom (40)': custom,
    'Totaal (100)': totaal,
    Onderbouwing: rij.Onderbouwing ?? '',
    'Outreach-concept': rij['Outreach-concept'] ?? '',
    Status: rij.Status ?? '',
    'Datum status': '',
    'Reden afvallen': rij['Reden afvallen'] ?? '',
    Opmerkingen: opmerkingen,
  })
}

const veld = (waarde) => {
  const tekst = String(waarde ?? '')
  return /[",\n\r]/.test(tekst) ? `"${tekst.replace(/"/g, '""')}"` : tekst
}

const regels = [V11.join(','), ...uit.map((r) => V11.map((k) => veld(r[k])).join(','))]
process.stdout.write(regels.join('\r\n') + '\r\n')

console.error(`${uit.length} rijen omgezet naar de v1.1-indeling.`)
if (gemist.length) {
  console.error(`\nLET OP, score telt niet op bij ${gemist.length} rijen:`)
  for (const g of gemist) console.error(`  ${g}`)
}
console.error('\nLeeg gelaten omdat de bron ze niet heeft: Bron, E-mail, Telefoon,')
console.error('Reistijd minuten, Concurrent, Datum status.')
