#!/usr/bin/env node
// Eenmalige import van de bestaande kandidatenlijsten naar de ATS-base.
//
//   AIRTABLE_API_KEY=pat_xxx AIRTABLE_BASE_ID=appSAz5sjFyPm4e0g \
//   node scripts/import/import.mjs \
//     --bestand ../lijsten/brand-manager.xlsx \
//     --vacature "Brand Manager" --opdrachtgever "Royal Sanders" [--tab Blad1] [--echt]
//
// Zonder --echt draait het script droog: het leest, vertaalt en rapporteert,
// maar schrijft niets. Doe dat eerst en kijk de tabel Onbekende statussen na.

import { basename } from 'node:path'
import { parseArgs } from 'node:util'
import { STAGE_IDS } from '../../shared/stages.mjs'
import { normaliseer } from './status-map.mjs'
import { bouwPlan, leesRijen } from './lees.mjs'

const API = 'https://api.airtable.com/v0'

const { values: opties } = parseArgs({
  options: {
    bestand: { type: 'string' },
    vacature: { type: 'string' },
    opdrachtgever: { type: 'string' },
    tab: { type: 'string' },
    bron: { type: 'string' },
    'in-gesprek': { type: 'string' },
    echt: { type: 'boolean', default: false },
  },
})

const BASE_ID = process.env.AIRTABLE_BASE_ID
const API_KEY = process.env.AIRTABLE_API_KEY

if (!opties.bestand || !opties.vacature || !opties.opdrachtgever) {
  console.error(
    'Gebruik: --bestand <pad> --vacature "<titel>" --opdrachtgever "<naam>"\n' +
      '         [--tab <blad>] [--bron <bron>] [--in-gesprek Gereageerd|Gesproken] [--echt]',
  )
  process.exit(1)
}

const IN_GESPREK = opties['in-gesprek']
if (IN_GESPREK && !['Gereageerd', 'Gesproken'].includes(IN_GESPREK)) {
  console.error('--in-gesprek accepteert alleen Gereageerd of Gesproken.')
  process.exit(1)
}
if (!BASE_ID || !API_KEY) {
  console.error('Zet AIRTABLE_BASE_ID en AIRTABLE_API_KEY in de omgeving.')
  process.exit(1)
}

const vandaag = new Date().toISOString().slice(0, 10)

async function airtable(method, pad, { query, body } = {}) {
  const url = new URL(`${API}/${BASE_ID}/${pad}`)
  for (const [sleutel, waarde] of Object.entries(query ?? {})) {
    if (Array.isArray(waarde)) waarde.forEach((v) => url.searchParams.append(sleutel, v))
    else if (waarde != null) url.searchParams.set(sleutel, String(waarde))
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) throw new Error(`Airtable ${method} ${pad}: ${res.status} ${await res.text()}`)
  // Vijf verzoeken per seconde per base; blijf daar met marge onder.
  await new Promise((klaar) => setTimeout(klaar, 220))
  return res.json()
}

async function alleRecords(tabel, velden) {
  const records = []
  let offset
  do {
    const query = { pageSize: 100, ...(offset ? { offset } : {}) }
    if (velden) query['fields[]'] = velden
    const pagina = await airtable('GET', encodeURIComponent(tabel), { query })
    records.push(...pagina.records)
    offset = pagina.offset
  } while (offset)
  return records
}

async function maakRecords(tabel, rijen) {
  const gemaakt = []
  for (let i = 0; i < rijen.length; i += 10) {
    const batch = rijen.slice(i, i + 10).map((fields) => ({ fields }))
    const res = await airtable('POST', encodeURIComponent(tabel), {
      body: { records: batch, typecast: true },
    })
    gemaakt.push(...res.records)
  }
  return gemaakt
}

async function main() {
  const rijen = await leesRijen(opties.bestand, opties.tab)
  if (rijen.length === 0) throw new Error('Geen rijen gevonden.')

  // Vacature en opdrachtgever moeten al bestaan; aanmaken hoort bij de intake,
  // niet bij een import.
  const [opdrachtgevers, vacatures, bestaandeKandidaten] = await Promise.all([
    alleRecords('Opdrachtgevers', ['Naam']),
    alleRecords('Vacatures', ['Titel', 'Opdrachtgever']),
    alleRecords('Kandidaten', ['Naam', 'Dedupe-sleutel']),
  ])

  const opdrachtgever = opdrachtgevers.find(
    (o) => normaliseer(o.fields.Naam) === normaliseer(opties.opdrachtgever),
  )
  if (!opdrachtgever) throw new Error(`Opdrachtgever "${opties.opdrachtgever}" staat niet in de base.`)

  const vacature = vacatures.find(
    (v) =>
      normaliseer(v.fields.Titel) === normaliseer(opties.vacature) &&
      (v.fields.Opdrachtgever ?? []).includes(opdrachtgever.id),
  )
  if (!vacature) throw new Error(`Vacature "${opties.vacature}" bestaat niet bij deze opdrachtgever.`)

  const plan = bouwPlan(rijen, {
    vacatureTitel: vacature.fields.Titel,
    bron: opties.bron,
    vandaag,
    inGesprek: IN_GESPREK,
  })
  const bekend = new Map(
    bestaandeKandidaten.map((k) => [(k.fields['Dedupe-sleutel'] ?? '').trim().toLowerCase(), k.id]),
  )
  const nieuw = [...plan.kandidaten].filter(([sleutel]) => !bekend.has(sleutel))

  rapporteer(plan, nieuw.length)

  if (plan.onbeslist.length > 0 && !IN_GESPREK) {
    console.log(
      `\nGestopt: ${plan.onbeslist.length} rijen staan op "In gesprek" en zijn hierboven overgeslagen.`,
    )
    console.log('Bepaal per kandidaat of dat Gereageerd of Gesproken is en werk de sheet bij,')
    console.log('of draai opnieuw met --in-gesprek Gereageerd (of Gesproken) voor alle rijen tegelijk.\n')
    if (opties.echt) process.exit(1)
    return
  }

  if (!opties.echt) {
    console.log('\nDroge run. Voeg --echt toe om daadwerkelijk te schrijven.\n')
    return
  }

  console.log('\nSchrijven naar Airtable…')
  const gemaakt = await maakRecords('Kandidaten', nieuw.map(([, velden]) => velden))
  gemaakt.forEach((record, i) => bekend.set(nieuw[i][0], record.id))
  console.log(`  ${gemaakt.length} kandidaten aangemaakt`)

  const gemaakteAanmeldingen = await maakRecords(
    'Aanmeldingen',
    plan.aanmeldingen.map((a) => ({
      ...a.velden,
      Kandidaat: [bekend.get(a.sleutel)],
      Vacature: [vacature.id],
    })),
  )
  console.log(`  ${gemaakteAanmeldingen.length} aanmeldingen aangemaakt`)

  // Startpunt voor doorlooptijd en conversie: zonder deze regels is de stagelog leeg.
  await maakRecords(
    'Stagelog',
    gemaakteAanmeldingen.map((record) => ({
      Omschrijving: `${record.fields.Aanmelding}: import → ${record.fields.Stage}`,
      Aanmelding: [record.id],
      'Naar stage': record.fields.Stage,
      Datum: record.fields['Datum in huidige stage'] ?? vandaag,
    })),
  )
  console.log(`  ${gemaakteAanmeldingen.length} stagelog-regels aangemaakt`)
  console.log('\nKlaar.\n')
}

function rapporteer(plan, aantalNieuw) {
  console.log(`\n${basename(opties.bestand)} — ${plan.aanmeldingen.length + plan.overgeslagen.length} rijen`)
  const herkend = Object.keys(plan.index).filter((k) => !k.startsWith('__'))
  console.log(`Kolommen herkend  : ${herkend.join(', ') || 'geen'}`)
  if (plan.genegeerd.length > 0) console.log(`Genegeerd         : ${plan.genegeerd.join(', ')}`)

  console.log('\n— Samenvatting —')
  console.log(`Aanmeldingen      : ${plan.aanmeldingen.length}`)
  console.log(`Nieuwe kandidaten : ${aantalNieuw}`)
  console.log(`Al in de base     : ${plan.kandidaten.size - aantalNieuw}`)
  console.log(`Overgeslagen      : ${plan.overgeslagen.length}`)

  const perStage = new Map()
  for (const a of plan.aanmeldingen) {
    perStage.set(a.velden.Stage, (perStage.get(a.velden.Stage) ?? 0) + 1)
  }
  console.log('\nStageverdeling:')
  for (const stage of STAGE_IDS) {
    if (perStage.has(stage)) console.log(`  ${stage.padEnd(18)} ${perStage.get(stage)}`)
  }

  if (plan.onbekendeStatus.size > 0) {
    console.log('\nOnbekende statussen (deze worden Gescoord):')
    for (const [status, aantal] of [...plan.onbekendeStatus].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${status.padEnd(28)} ${aantal}`)
    }
    console.log('  → vul ze aan in scripts/import/status-map.mjs voordat je met --echt draait.')
  }

  if (plan.bronVertaling.size > 0) {
    console.log('\nBron-vertaling (vrije tekst → keuzelijst):')
    const perDoel = new Map()
    for (const [ruw, doel] of plan.bronVertaling) {
      if (!perDoel.has(doel)) perDoel.set(doel, [])
      perDoel.get(doel).push(ruw)
    }
    for (const [doel, ruwe] of [...perDoel].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${doel.padEnd(26)} ← ${ruwe.length} variant(en), bv. "${ruwe[0].slice(0, 48)}"`)
    }
  }

  if (plan.onbekendeReden.size > 0) {
    console.log('\nOnbekende afvalredenen (worden leeggelaten):')
    for (const [reden, aantal] of [...plan.onbekendeReden].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(reden).slice(0, 50).padEnd(52)} ${aantal}`)
    }
  }

  if (plan.onbeslist.length > 0) {
    console.log(`\nStatus "In gesprek" — ${plan.onbeslist.length} rijen, keuze nodig:`)
    for (const rij of plan.onbeslist) console.log(`  rij ${rij.rij}: ${rij.naam}`)
    console.log('  → alleen geantwoord = Gereageerd, echt gesproken = Gesproken.')
  }

  if (plan.nietIdentificerendeUrls.size > 0) {
    console.log('\nURL\'s die geen persoon aanwijzen (niet overgenomen, dedupe op naam):')
    for (const [url, aantal] of [...plan.nietIdentificerendeUrls].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${aantal}x  ${url.slice(0, 64)}`)
    }
  }

  if (plan.naamBotsingen.length > 0) {
    console.log('\nZelfde naam, andere sleutel — zelf nakijken, niet samengevoegd:')
    for (const botsing of plan.naamBotsingen) {
      console.log(`  ${botsing.naam} (${botsing.aantal}x)`)
    }
  }

  if (plan.overgeslagen.length > 0) {
    console.log('\nOvergeslagen:')
    for (const rij of plan.overgeslagen.slice(0, 20)) console.log(`  rij ${rij.rij}: ${rij.reden}`)
    if (plan.overgeslagen.length > 20) console.log(`  … en nog ${plan.overgeslagen.length - 20}`)
  }
}

main().catch((error) => {
  console.error(`\nFout: ${error.message}\n`)
  process.exit(1)
})
