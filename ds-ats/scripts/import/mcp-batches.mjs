#!/usr/bin/env node
// Bouwt het importplan en zet het om in batches die je via de Airtable-koppeling
// (MCP) kunt wegschrijven. Bedoeld voor de situatie waarin er geen Airtable-token
// op de machine staat maar er wél een Airtable-connector beschikbaar is.
//
// Heb je een token? Gebruik dan import.mjs — die is sneller en compleet.
//
//   node scripts/import/mcp-batches.mjs plan --bestand <csv> --vacature "<titel>"
//   node scripts/import/mcp-batches.mjs status
//   node scripts/import/mcp-batches.mjs kandidaten <batchnummer> [batchgrootte]
//   node scripts/import/mcp-batches.mjs aanmeldingen <batchnummer> [batchgrootte]
//   node scripts/import/mcp-batches.mjs stagelog <batchnummer> [batchgrootte]
//
// Airtable neemt maximaal 50 records per verzoek. Aanmeldingen dragen de hele
// score-onderbouwing en het outreach-concept, dus daar is een kleinere batch
// soms praktischer: `aanmeldingen 0 20`.
//
// --bestand en --vacature mogen allebei meerdere keren, op volgorde gepaard:
//   plan --bestand a.csv --vacature "Brand Manager" --bestand b.csv --vacature "RA Officer"
//
// Al bestaande kandidaten overslaan: zet hun dedupe-sleutels, één per regel, in
// bestaand.txt naast plan.json. Dat is de kolom Dedupe-sleutel uit de tabel
// Kandidaten — niet de naam. Twee mensen kunnen dezelfde naam hebben, en één
// persoon kan onder twee namen staan; de sleutel is waar de base zelf op
// dedupet, dus daar hoort dit ook op te matchen.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { bouwPlan, leesRijen } from './lees.mjs'
import { normaliseer } from './status-map.mjs'
import {
  AANMELDING_VELDEN,
  KANDIDAAT_VELDEN,
  LINK_AANMELDING,
  LINK_KANDIDAAT,
  LINK_VACATURE,
  STAGELOG_VELDEN,
} from './velden.mjs'

const HIER = dirname(fileURLToPath(import.meta.url))
const WERKMAP = join(HIER, '.batches')
const PLAN = join(WERKMAP, 'plan.json')
const BESTAAND = join(WERKMAP, 'bestaand.txt')
const PER_BATCH = 50

// Veld-id's: zie velden.mjs. Bewust niet hier herhaald.

const [commando, ...rest] = process.argv.slice(2)

if (commando === 'plan') {
  const { values } = parseArgs({
    args: rest,
    options: {
      bestand: { type: 'string', multiple: true },
      vacature: { type: 'string', multiple: true },
      bron: { type: 'string' },
      'in-gesprek': { type: 'string' },
      vandaag: { type: 'string' },
    },
  })
  const paden = values.bestand ?? []
  const titels = values.vacature ?? []
  if (paden.length === 0 || paden.length !== titels.length) {
    console.error('Gebruik: plan --bestand <csv> --vacature "<titel>"  (beide even vaak)')
    process.exit(1)
  }

  const vandaag = values.vandaag ?? new Date().toISOString().slice(0, 10)
  const lijsten = paden.map((pad, i) => ({ pad, titel: titels[i] }))

  const kandidaten = []
  const aanmeldingen = []
  for (const lijst of lijsten) {
    const plan = bouwPlan(await leesRijen(lijst.pad), {
      vacatureTitel: lijst.titel,
      bron: values.bron,
      vandaag,
      inGesprek: values['in-gesprek'],
    })
    for (const [sleutel, velden] of plan.kandidaten) kandidaten.push({ sleutel, velden })
    for (const a of plan.aanmeldingen) {
      aanmeldingen.push({ sleutel: a.sleutel, vacature: lijst.titel, velden: a.velden })
    }
    console.error(
      `${lijst.titel.padEnd(28)} ${plan.kandidaten.size} kandidaten, ${plan.aanmeldingen.length} aanmeldingen, ` +
        `${plan.onbekendeStatus.size} onbekende statussen, ${plan.onbekendeReden.size} onbekende redenen`,
    )
    // Een rij op "In gesprek" levert zonder --in-gesprek helemaal geen
    // aanmelding op. Stil doorgaan zou een gat in de import maken dat je pas
    // maanden later opvalt.
    if (plan.onbeslist.length > 0 && !values['in-gesprek']) {
      console.error(
        `\nGestopt: ${plan.onbeslist.length} rijen staan op "In gesprek" en leveren zo geen aanmelding op.\n` +
          'Werk de sheet bij, of draai opnieuw met --in-gesprek Gereageerd (of Gesproken).',
      )
      process.exit(1)
    }
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
  console.log(`stagelog-regels      : ${aanmeldingen.length}  -> ${batches(aanmeldingen.length)} batches`)
} else if (commando === 'kandidaten') {
  const nieuw = nogTeDoen(laadPlan().kandidaten)
  console.log(JSON.stringify(schijf(nieuw, rest[0], rest[1]).map(({ velden }) => ({ fields: velden2fields(velden, KANDIDAAT_VELDEN) }))))
} else if (commando === 'aanmeldingen') {
  const { kandidaten, aanmeldingen } = laadPlan()
  const naamVanSleutel = new Map(kandidaten.map((k) => [k.sleutel, k.velden.Naam]))
  console.log(
    JSON.stringify(
      schijf(aanmeldingen, rest[0], rest[1]).map((a) => ({
        fields: {
          // Koppelen op naam: met typecast zoekt Airtable het bestaande record erbij.
          [LINK_KANDIDAAT]: [naamVanSleutel.get(a.sleutel)],
          [LINK_VACATURE]: [a.vacature],
          ...velden2fields(a.velden, AANMELDING_VELDEN),
        },
      })),
    ),
  )
} else if (commando === 'stagelog') {
  // Startregel per aanmelding. Zonder deze regels blijven doorlooptijd en
  // conversie leeg tot iemand met de hand een stage verzet.
  const { aanmeldingen } = laadPlan()
  console.log(
    JSON.stringify(
      schijf(aanmeldingen, rest[0], rest[1]).map((a) => ({
        fields: {
          [STAGELOG_VELDEN.Omschrijving]: `${a.velden.Aanmelding}: import → ${a.velden.Stage}`,
          [STAGELOG_VELDEN['Naar stage']]: a.velden.Stage,
          [STAGELOG_VELDEN.Datum]: a.velden['Datum in huidige stage'],
          [LINK_AANMELDING]: [a.velden.Aanmelding],
        },
      })),
    ),
  )
} else {
  console.error(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 25).join('\n'))
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

/**
 * Filtert de kandidaten die al in de base staan.
 *
 * Matcht op dedupe-sleutel, niet op naam. Dat is dezelfde sleutel als de
 * formulekolom Dedupe-sleutel in Airtable: de LinkedIn-URL als die er is,
 * anders genormaliseerde naam plus woonplaats. Op naam matchen zou twee
 * naamgenoten samentrekken en dezelfde persoon onder twee schrijfwijzen missen
 * — en het gevolg van allebei is een dubbel kandidaatrecord, wat de base juist
 * niet hoort te hebben.
 *
 * URL's worden aan beide kanten kleingemaakt en van hun trailing slash ontdaan,
 * want de formule in Airtable doet dat niet en de sheets zijn daar niet
 * consequent in.
 */
function nogTeDoen(kandidaten) {
  if (!existsSync(BESTAAND)) return kandidaten
  const bekend = new Set(
    readFileSync(BESTAAND, 'utf8').split('\n').map(sleutel).filter(Boolean),
  )
  return kandidaten.filter((k) => !bekend.has(sleutel(k.sleutel)))
}

function sleutel(waarde) {
  return normaliseer(waarde).replace(/\/+$/, '')
}

function schijf(lijst, nummer, grootte) {
  const n = Number(nummer)
  if (!Number.isInteger(n) || n < 0) {
    console.error('Geef een batchnummer op, bijvoorbeeld: kandidaten 0')
    process.exit(1)
  }
  const per = grootte === undefined ? PER_BATCH : Number(grootte)
  if (!Number.isInteger(per) || per < 1 || per > PER_BATCH) {
    console.error(`Batchgrootte moet tussen 1 en ${PER_BATCH} liggen; Airtable neemt niet meer.`)
    process.exit(1)
  }
  return lijst.slice(n * per, (n + 1) * per)
}

function velden2fields(velden, kaart) {
  const fields = {}
  for (const [naam, id] of Object.entries(kaart)) {
    if (velden[naam] !== undefined && velden[naam] !== '') fields[id] = velden[naam]
  }
  return fields
}
