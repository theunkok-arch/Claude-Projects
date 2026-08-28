#!/usr/bin/env node
// Bouwt het importplan en zet het om in batches die je via de Airtable-koppeling
// (MCP) kunt wegschrijven. Bedoeld voor de situatie waarin er geen Airtable-token
// op de machine staat maar er wél een Airtable-connector beschikbaar is.
//
// Heb je een token? Gebruik dan import.mjs — die is sneller en compleet.
//
//   node scripts/import/mcp-batches.mjs plan --bm <csv> --ra <csv>
//   node scripts/import/mcp-batches.mjs status
//   node scripts/import/mcp-batches.mjs kandidaten <batchnummer>
//   node scripts/import/mcp-batches.mjs aanmeldingen <batchnummer>
//
// Al bestaande kandidaten overslaan: zet hun namen, één per regel, in
// bestaand.txt naast plan.json. Namen zijn uniek over beide lijsten.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { bouwPlan, leesRijen } from './lees.mjs'
import { normaliseer } from './status-map.mjs'

const HIER = dirname(fileURLToPath(import.meta.url))
const WERKMAP = join(HIER, '.batches')
const PLAN = join(WERKMAP, 'plan.json')
const BESTAAND = join(WERKMAP, 'bestaand.txt')
const PER_BATCH = 50

/** Veld-id's van de ATS-base appSAz5sjFyPm4e0g. */
const KANDIDAAT_VELDEN = {
  Naam: 'fldQIFur9mv4iEW3o',
  'LinkedIn-URL': 'fldyIJfhaSHN73NvY',
  Woonplaats: 'fldEnhEWMNzMMsEMK',
  'Huidige rol': 'fldghxszbfwFZT3vL',
  'Huidige werkgever': 'fldAO15vFPzDf9QGU',
  Bron: 'fldhw1ZEIgH6pzNU1',
}

/**
 * Kernvelden van een aanmelding: genoeg om elk scherm in de app te vullen.
 * De lange teksten blijven eruit; die maken een batch vier keer zo groot en
 * zijn niet nodig voor funnels, stages of dagen in stage.
 */
const AANMELDING_VELDEN = {
  Aanmelding: 'fldrokgT9ocqlxIMM',
  Stage: 'fldxhOfwK0xJuLmvJ',
  'Reden afvallen': 'fldoppqbtmIYs9QOR',
  Eigenaar: 'fldWjFTYVtdMThlBs',
  'Datum in huidige stage': 'fld3r0aWsAVVFHPql',
  'Datum aangemaakt': 'fldH0XlZaSPJOFGug',
  'Score totaal': 'fldA5l5QCqwcxqXU8',
  Concurrent: 'fldBrXKLqvGelxUDl',
}
const LINK_KANDIDAAT = 'fldEdzzoV2QZ0B1hC'
const LINK_VACATURE = 'fldrGEsSZZrZPmJCL'

const [commando, ...rest] = process.argv.slice(2)

if (commando === 'plan') {
  const { values } = parseArgs({
    args: rest,
    options: { bm: { type: 'string' }, ra: { type: 'string' }, vandaag: { type: 'string' } },
  })
  if (!values.bm || !values.ra) {
    console.error('Gebruik: plan --bm <brand-manager.csv> --ra <ra-officer.csv>')
    process.exit(1)
  }

  const vandaag = values.vandaag ?? new Date().toISOString().slice(0, 10)
  const lijsten = [
    { pad: values.bm, titel: 'Brand Manager' },
    { pad: values.ra, titel: 'Regulatory Affairs Officer' },
  ]

  const kandidaten = []
  const aanmeldingen = []
  for (const lijst of lijsten) {
    const plan = bouwPlan(await leesRijen(lijst.pad), {
      vacatureTitel: lijst.titel,
      vandaag,
      // Vastgesteld door Dominique op 28-08-2026.
      inGesprek: 'Gesproken',
    })
    for (const [sleutel, velden] of plan.kandidaten) kandidaten.push({ sleutel, velden })
    for (const a of plan.aanmeldingen) {
      aanmeldingen.push({ sleutel: a.sleutel, vacature: lijst.titel, velden: a.velden })
    }
    console.error(
      `${lijst.titel.padEnd(28)} ${plan.kandidaten.size} kandidaten, ${plan.aanmeldingen.length} aanmeldingen, ` +
        `${plan.onbekendeStatus.size} onbekende statussen, ${plan.onbekendeReden.size} onbekende redenen`,
    )
  }

  mkdirSync(WERKMAP, { recursive: true })
  writeFileSync(PLAN, JSON.stringify({ kandidaten, aanmeldingen }))
  console.error(`\nplan.json geschreven: ${kandidaten.length} kandidaten, ${aanmeldingen.length} aanmeldingen`)
} else if (commando === 'status') {
  const { kandidaten, aanmeldingen } = laadPlan()
  const nieuw = nogTeDoen(kandidaten)
  console.log(`kandidaten in plan   : ${kandidaten.length}`)
  console.log(`al in de base        : ${kandidaten.length - nieuw.length}`)
  console.log(`nog aan te maken     : ${nieuw.length}  -> ${batches(nieuw.length)} batches`)
  console.log(`aanmeldingen in plan : ${aanmeldingen.length}  -> ${batches(aanmeldingen.length)} batches`)
} else if (commando === 'kandidaten') {
  const nieuw = nogTeDoen(laadPlan().kandidaten)
  console.log(JSON.stringify(schijf(nieuw, rest[0]).map(({ velden }) => ({ fields: velden2fields(velden, KANDIDAAT_VELDEN) }))))
} else if (commando === 'aanmeldingen') {
  const { kandidaten, aanmeldingen } = laadPlan()
  const naamVanSleutel = new Map(kandidaten.map((k) => [k.sleutel, k.velden.Naam]))
  console.log(
    JSON.stringify(
      schijf(aanmeldingen, rest[0]).map((a) => ({
        fields: {
          // Koppelen op naam: met typecast zoekt Airtable het bestaande record erbij.
          [LINK_KANDIDAAT]: [naamVanSleutel.get(a.sleutel)],
          [LINK_VACATURE]: [a.vacature],
          ...velden2fields(a.velden, AANMELDING_VELDEN),
        },
      })),
    ),
  )
} else {
  console.error(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 18).join('\n'))
  process.exit(1)
}

function batches(aantal) {
  return Math.ceil(aantal / PER_BATCH)
}

function laadPlan() {
  if (!existsSync(PLAN)) {
    console.error(`${PLAN} bestaat niet. Draai eerst: mcp-batches.mjs plan --bm <csv> --ra <csv>`)
    process.exit(1)
  }
  return JSON.parse(readFileSync(PLAN, 'utf8'))
}

function nogTeDoen(kandidaten) {
  if (!existsSync(BESTAAND)) return kandidaten
  const bekend = new Set(
    readFileSync(BESTAAND, 'utf8').split('\n').map((r) => normaliseer(r)).filter(Boolean),
  )
  return kandidaten.filter((k) => !bekend.has(normaliseer(k.velden.Naam)))
}

function schijf(lijst, nummer) {
  const n = Number(nummer)
  if (!Number.isInteger(n) || n < 0) {
    console.error('Geef een batchnummer op, bijvoorbeeld: kandidaten 0')
    process.exit(1)
  }
  return lijst.slice(n * PER_BATCH, (n + 1) * PER_BATCH)
}

function velden2fields(velden, kaart) {
  const fields = {}
  for (const [naam, id] of Object.entries(kaart)) {
    if (velden[naam] !== undefined && velden[naam] !== '') fields[id] = velden[naam]
  }
  return fields
}
