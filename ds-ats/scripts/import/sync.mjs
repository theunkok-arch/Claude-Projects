#!/usr/bin/env node
// Leest een kandidatensheet uit de Drive-map van een opdrachtgever en zet hem
// naast wat er al in Airtable staat. Het verschil is de opbrengst: wie is
// nieuw, wiens stage is opgeschoven, en waar spreken sheet en base elkaar tegen.
//
// Dit is nadrukkelijk geen tweede import. import.mjs en mcp-batches.mjs vullen
// een lege base; sync.mjs draait op een base die al in gebruik is en mag daarom
// nooit blind overschrijven wat Dominique in de app heeft gezet.
//
//   node scripts/import/sync.mjs plan \
//     --sheet <csv> --vacature "Brand Manager" --huidig huidig.json \
//     --bestand-id <driveId> --bestand-naam "<naam>" --gewijzigd <iso>
//   node scripts/import/sync.mjs kandidaten <n>   --nieuwste
//   node scripts/import/sync.mjs aanmeldingen <n> --nieuwste
//   node scripts/import/sync.mjs wijzigingen <n>  --bevestigd-door "Dominique"
//
// huidig.json is een uitdraai van de base, op te halen met de Airtable-
// koppeling. Vorm:
//   { "kandidaten":   [{ "id": "rec…", "Naam": "…", "LinkedIn-URL": "…", "Woonplaats": "…" }],
//     "aanmeldingen": [{ "id": "rec…", "kandidaatId": "rec…", "vacature": "Brand Manager",
//                        "Stage": "Benaderd", "Reden afvallen": null }] }

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { bouwPlan, dedupeSleutel, leesRijen } from './lees.mjs'
import { normaliseer } from './status-map.mjs'
import { FUNNEL_STAGES } from '../../shared/stages.mjs'

const HIER = dirname(fileURLToPath(import.meta.url))
const WERKMAP = join(HIER, '.batches')
const SYNC = join(WERKMAP, 'sync.json')
const PER_BATCH = 50

/** Veld-id's van de ATS-base appSAz5sjFyPm4e0g. Gelijk aan mcp-batches.mjs. */
const KANDIDAAT_VELDEN = {
  Naam: 'fldQIFur9mv4iEW3o',
  'LinkedIn-URL': 'fldyIJfhaSHN73NvY',
  Woonplaats: 'fldEnhEWMNzMMsEMK',
  'Huidige rol': 'fldghxszbfwFZT3vL',
  'Huidige werkgever': 'fldAO15vFPzDf9QGU',
  Bron: 'fldhw1ZEIgH6pzNU1',
}
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

/**
 * Positie in de trechter. Afgevallen staat er bewust buiten: dat is geen
 * stap terug of vooruit maar een aparte uitkomst.
 */
const positie = (stage) => FUNNEL_STAGES.indexOf(stage)

/**
 * Zet de sheet naast de base.
 *
 * De regel die alles bepaalt: een sheet mag iemand vooruit zetten, nooit
 * terug. Dominique werkt in twee systemen tegelijk — als zij in de app iemand
 * op Gesproken zet en het blad staat nog op Benaderd, dan is de app bij en het
 * blad achter. Zo'n verschil wordt gemeld, niet toegepast. Andersom, waar het
 * blad vooruit is gelopen, is de wijziging veilig.
 */
export function bouwSync(rijen, huidig, { vacatureTitel, bron, vandaag, inGesprek }) {
  const plan = bouwPlan(rijen, { vacatureTitel, bron, vandaag, inGesprek })

  const kandidaatPerSleutel = new Map()
  for (const kandidaat of huidig.kandidaten ?? []) {
    kandidaatPerSleutel.set(dedupeSleutel(kandidaat), kandidaat)
  }
  const aanmeldingPerKandidaat = new Map()
  for (const aanmelding of huidig.aanmeldingen ?? []) {
    if (aanmelding.vacature !== vacatureTitel) continue
    aanmeldingPerKandidaat.set(aanmelding.kandidaatId, aanmelding)
  }

  // "In gesprek" dekt zowel Gereageerd als Gesproken. Bij de import moest daar
  // een knoop over worden doorgehakt, want er was verder niets. Bij een sync
  // staat er wél iets: een stage die iemand heeft gezet. Een gok laten winnen
  // van een beslissing is precies verkeerd om, dus zulke rijen wijzigen niets
  // meer aan een bestaande aanmelding — ze gelden alleen nog voor kandidaten
  // die nieuw zijn.
  const onbeslisteNamen = new Set(plan.onbeslist.map((o) => normaliseer(o.naam)))

  const nieuweKandidaten = []
  const nieuweAanmeldingen = []
  const wijzigingen = []
  const onbeslistBestaand = []
  const teruggezet = []
  const herleefd = []
  const redenOntbreekt = []
  let ongewijzigd = 0
  const gezien = new Set()

  for (const aanmelding of plan.aanmeldingen) {
    const kandidaat = plan.kandidaten.get(aanmelding.sleutel)
    const naam = kandidaat.Naam
    const bestaand = kandidaatPerSleutel.get(aanmelding.sleutel)

    if (!bestaand) {
      nieuweKandidaten.push({ sleutel: aanmelding.sleutel, velden: kandidaat })
      nieuweAanmeldingen.push({ ...aanmelding, naam })
      continue
    }

    gezien.add(bestaand.id)
    const oud = aanmeldingPerKandidaat.get(bestaand.id)
    if (!oud) {
      // De kandidaat bestaat al, maar nog niet voor deze vacature. Dat gebeurt
      // zodra dezelfde persoon op twee lijsten staat.
      nieuweAanmeldingen.push({ ...aanmelding, naam, kandidaatId: bestaand.id })
      continue
    }

    const naar = aanmelding.velden.Stage
    const van = oud.Stage
    const reden = aanmelding.velden['Reden afvallen'] ?? null
    const regel = { aanmeldingId: oud.id, naam, van, naar, reden }

    if (van === naar) {
      ongewijzigd += 1
      continue
    }
    if (onbeslisteNamen.has(normaliseer(naam))) {
      onbeslistBestaand.push(regel)
      continue
    }
    if (van === 'Afgevallen') {
      // Iemand terughalen die is afgevallen is een besluit, geen verversing.
      herleefd.push(regel)
      continue
    }
    if (naar === 'Afgevallen') {
      if (!reden) redenOntbreekt.push(regel)
      else wijzigingen.push(regel)
      continue
    }
    if (positie(naar) < positie(van)) {
      teruggezet.push(regel)
      continue
    }
    wijzigingen.push(regel)
  }

  const nietInSheet = (huidig.aanmeldingen ?? [])
    .filter((a) => a.vacature === vacatureTitel && !gezien.has(a.kandidaatId))
    .map((a) => ({ aanmeldingId: a.id, kandidaatId: a.kandidaatId, stage: a.Stage }))

  return {
    plan,
    nieuweKandidaten,
    nieuweAanmeldingen,
    wijzigingen,
    teruggezet,
    herleefd,
    onbeslistBestaand,
    redenOntbreekt,
    ongewijzigd,
    nietInSheet,
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const [commando, ...rest] = process.argv.slice(2)

if (commando === 'plan') {
  const { values } = parseArgs({
    args: rest,
    options: {
      sheet: { type: 'string' },
      vacature: { type: 'string' },
      huidig: { type: 'string' },
      tab: { type: 'string' },
      bron: { type: 'string', default: 'LinkedIn Sales Navigator' },
      vandaag: { type: 'string', default: new Date().toISOString().slice(0, 10) },
      'in-gesprek': { type: 'string' },
      'bestand-id': { type: 'string' },
      'bestand-naam': { type: 'string' },
      gewijzigd: { type: 'string' },
    },
  })
  for (const vereist of ['sheet', 'vacature', 'huidig', 'bestand-id', 'bestand-naam', 'gewijzigd']) {
    if (!values[vereist]) stop(`--${vereist} ontbreekt.`)
  }

  const rijen = await leesRijen(values.sheet, values.tab)
  const huidig = JSON.parse(readFileSync(values.huidig, 'utf8'))
  const uitkomst = bouwSync(rijen, huidig, {
    vacatureTitel: values.vacature,
    bron: values.bron,
    vandaag: values.vandaag,
    inGesprek: values['in-gesprek'],
  })

  rapporteer(values, uitkomst)
  schrijf(values, uitkomst)
} else if (['kandidaten', 'aanmeldingen', 'wijzigingen'].includes(commando)) {
  const nummer = Number.parseInt(rest[0], 10)
  const { values } = parseArgs({
    args: rest.slice(1),
    options: { 'bevestigd-door': { type: 'string' }, nieuwste: { type: 'boolean' } },
  })
  // Er moet vastliggen waaróm dit bestand is gekozen: een naam, of expliciet
  // "de meest recent bewerkte". Die keuze komt boven elke batch te staan, dus
  // is later na te lopen welke stand waar vandaan komt.
  const herkomst = values['bevestigd-door'] ?? (values.nieuwste ? 'meest recent bewerkt' : null)
  if (!herkomst) {
    stop(
      'Geef --bevestigd-door "<naam>" of --nieuwste. Zonder een van de twee ligt niet vast waarom dit bestand is gekozen.',
    )
  }
  if (!existsSync(SYNC)) stop('Geen sync.json. Draai eerst: sync.mjs plan …')
  const sync = JSON.parse(readFileSync(SYNC, 'utf8'))
  toonBatch(sync, commando, nummer, herkomst)
} else {
  console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 23).join('\n'))
  process.exit(commando ? 1 : 0)
}

function rapporteer(values, u) {
  const { plan } = u
  console.log(`\nBestand   ${values['bestand-naam']}  (${values['bestand-id']})`)
  console.log(`Gewijzigd ${values.gewijzigd}`)
  console.log(`Vacature  ${values.vacature}\n`)
  console.log(`  ${plan.aanmeldingen.length} rijen gelezen, ${plan.genegeerd.length} kolommen genegeerd`)
  console.log(`  ${u.nieuweKandidaten.length} nieuwe kandidaten`)
  console.log(`  ${u.nieuweAanmeldingen.length} nieuwe aanmeldingen`)
  console.log(`  ${u.wijzigingen.length} stagewijzigingen`)
  console.log(`  ${u.ongewijzigd} ongewijzigd`)
  console.log(`  ${u.nietInSheet.length} in de base maar niet in dit blad`)

  const meld = (lijst, kop) => {
    if (lijst.length === 0) return
    console.log(`\n${kop} (${lijst.length}) — niet toegepast:`)
    for (const r of lijst.slice(0, 15)) console.log(`  ${r.naam}: ${r.van} → ${r.naar}`)
    if (lijst.length > 15) console.log(`  … en nog ${lijst.length - 15}`)
  }
  meld(u.teruggezet, 'Blad wijst terug in de trechter')
  meld(u.herleefd, 'Blad haalt een afvaller terug')
  meld(u.onbeslistBestaand, 'Blad staat op "In gesprek", base is verder')
  meld(u.redenOntbreekt, 'Afgevallen zonder geldige reden')

  if (plan.onbekendeStatus.size > 0) {
    console.log(`\nOnbekende statussen: ${[...plan.onbekendeStatus.keys()].join(', ')}`)
  }
  if (plan.onbeslist.length > 0) {
    console.log(`\n${plan.onbeslist.length}× "In gesprek" — kies met --in-gesprek Gereageerd|Gesproken`)
  }
  if (plan.genegeerd.length > 0) console.log(`\nGenegeerde kolommen: ${plan.genegeerd.join(', ')}`)
}

function schrijf(values, u) {
  mkdirSync(WERKMAP, { recursive: true })
  writeFileSync(
    SYNC,
    JSON.stringify(
      {
        // De herkomst hoort bij het resultaat: over een maand moet nog te zien
        // zijn wélk blad deze stand heeft gezet.
        bron: {
          bestandId: values['bestand-id'],
          bestandNaam: values['bestand-naam'],
          gewijzigd: values.gewijzigd,
          gelezenOp: new Date().toISOString(),
        },
        vacature: values.vacature,
        vandaag: values.vandaag,
        nieuweKandidaten: u.nieuweKandidaten,
        nieuweAanmeldingen: u.nieuweAanmeldingen,
        wijzigingen: u.wijzigingen,
        teruggezet: u.teruggezet,
        herleefd: u.herleefd,
        onbeslistBestaand: u.onbeslistBestaand,
        redenOntbreekt: u.redenOntbreekt,
        ongewijzigd: u.ongewijzigd,
        nietInSheet: u.nietInSheet,
      },
      null,
      2,
    ),
  )
  console.log(`\nsync.json geschreven naar ${SYNC}`)
  console.log('Batches opvragen: sync.mjs kandidaten 1 --bevestigd-door "Dominique"')
}

function toonBatch(sync, soort, nummer, herkomst) {
  const bronregel = `${sync.bron.bestandNaam} (${sync.bron.bestandId}), gewijzigd ${sync.bron.gewijzigd}, gekozen: ${herkomst}`

  if (soort === 'kandidaten') {
    const batch = deel(sync.nieuweKandidaten, nummer)
    toon(soort, nummer, sync.nieuweKandidaten.length, bronregel)
    console.log(
      JSON.stringify(
        { typecast: true, records: batch.map((k) => ({ fields: velden(k.velden, KANDIDAAT_VELDEN) })) },
        null,
        2,
      ),
    )
  } else if (soort === 'aanmeldingen') {
    const batch = deel(sync.nieuweAanmeldingen, nummer)
    toon(soort, nummer, sync.nieuweAanmeldingen.length, bronregel)
    console.log(
      JSON.stringify(
        {
          typecast: true,
          records: batch.map((a) => ({
            fields: {
              ...velden(a.velden, AANMELDING_VELDEN),
              // Op naam koppelen werkt alleen met typecast; bestaat de
              // kandidaat al, dan is het record-id preciezer.
              [LINK_KANDIDAAT]: a.kandidaatId ? [a.kandidaatId] : [a.naam],
              [LINK_VACATURE]: [sync.vacature],
            },
          })),
        },
        null,
        2,
      ),
    )
  } else {
    const batch = deel(sync.wijzigingen, nummer)
    toon(soort, nummer, sync.wijzigingen.length, bronregel)
    console.log(
      JSON.stringify(
        {
          typecast: true,
          records: batch.map((w) => ({
            id: w.aanmeldingId,
            fields: schoon({
              [AANMELDING_VELDEN.Stage]: w.naar,
              [AANMELDING_VELDEN['Reden afvallen']]: w.naar === 'Afgevallen' ? w.reden : null,
              // De klok hoort opnieuw te lopen zodra de stage verandert.
              [AANMELDING_VELDEN['Datum in huidige stage']]: sync.vandaag,
            }),
          })),
        },
        null,
        2,
      ),
    )
  }
}

function toon(soort, nummer, totaal, bronregel) {
  const laatste = Math.max(1, Math.ceil(totaal / PER_BATCH))
  console.error(`# ${soort} batch ${nummer}/${laatste} van ${totaal}`)
  console.error(`# bron: ${bronregel}`)
}

function deel(lijst, nummer) {
  if (!Number.isInteger(nummer) || nummer < 1) stop('Geef een batchnummer vanaf 1.')
  return lijst.slice((nummer - 1) * PER_BATCH, nummer * PER_BATCH)
}

/**
 * Bij het aanmaken hoort een leeg veld weggelaten te worden. Bij een wijziging
 * juist niet: daar is `null` de manier om een oude afvalreden te wissen, en die
 * gaat dus buiten deze functie om.
 */
function velden(bron, tabel) {
  return Object.fromEntries(
    Object.entries(tabel)
      .map(([naam, id]) => [id, bron[naam]])
      .filter(([, v]) => v !== undefined && v !== null),
  )
}

function schoon(object) {
  return Object.fromEntries(Object.entries(object).filter(([, v]) => v !== undefined))
}

function stop(bericht) {
  console.error(bericht)
  process.exit(1)
}
