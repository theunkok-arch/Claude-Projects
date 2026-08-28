#!/usr/bin/env node
// Kiest de actuele kandidatensheet uit een maplisting: de meest recent
// bewerkte, met de bekende afleiders eruit.
//
//   node scripts/import/kies-bestand.mjs < maplisting.json
//
// De invoer is de ruwe uitvoer van een Drive-maplisting: een array met per
// bestand id, title, mimeType en modifiedTime.
//
// Waarom een maplisting en niet een naamzoekopdracht: Drive's
// `title contains 'kandidaten'` vindt "Royal_Sanders_RA_Officer_
// kandidatenlijst_samengevoegd" níet — underscores breken de tokenisatie, en
// dat is uitgerekend het bestand waarmee deze base gevuld is. Een zoekopdracht
// op naam mist dus stilzwijgend bestanden. Een maplisting op parentId niet.

/**
 * Wat de importer kan lezen. Een Google Sheet exporteer je naar CSV, een
 * geüploade xlsx leest `leesRijen` rechtstreeks.
 *
 * Deze lijst stond eerst alleen op Google Sheets, en dat was fout. In de
 * Normec-map staat de actuele kandidatenlijst als xlsx-upload, zes uur nieuwer
 * dan de Google Sheet ernaast — die viel af op zijn bestandstype, niet op zijn
 * inhoud. Een filter dat het nieuwste bestand weggooit is erger dan geen filter.
 */
const LEESBAAR = new Set([
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
])

/**
 * Namen die in deze Drive voorkomen en nooit de werkversie zijn. Bewust op
 * naam en niet op inhoud: een `_OLD` die toevallig als laatste is aangeraakt
 * (bijvoorbeeld door hem te openen en te sluiten) zou anders winnen.
 */
export const AFLEIDERS = [
  { patroon: /(^|[\s_-])old([\s_-]|$)/i, reden: 'heet OLD' },
  { patroon: /dont-?_?use/i, reden: 'heet DONTUSE' },
  { patroon: /^kopie van /i, reden: 'is een kopie' },
  { patroon: /^copy of /i, reden: 'is een kopie' },
  { patroon: /(^|[\s_-])backup([\s_-]|$)/i, reden: 'is een backup' },
]

/**
 * De meest recent bewerkte sheet uit een maplisting.
 *
 * Geeft ook terug wat er is afgevallen en waarom, en of de keuze krap was.
 * Krap betekent hier: de nummer twee is binnen een uur van de winnaar bewerkt.
 * Dan is "de laatste" geen betekenisvol onderscheid meer en hoort er iemand
 * naar te kijken.
 */
export function kiesNieuwste(bestanden, { krapUren = 1 } = {}) {
  const afgewezen = []
  const kandidaten = []

  for (const bestand of bestanden) {
    if (bestand.mimeType && !LEESBAAR.has(bestand.mimeType)) {
      afgewezen.push({ bestand, reden: 'geen leesbaar werkblad' })
      continue
    }
    const afleider = AFLEIDERS.find((a) => a.patroon.test(bestand.title ?? ''))
    if (afleider) {
      afgewezen.push({ bestand, reden: afleider.reden })
      continue
    }
    if (!bestand.modifiedTime) {
      afgewezen.push({ bestand, reden: 'geen wijzigingsdatum' })
      continue
    }
    kandidaten.push(bestand)
  }

  kandidaten.sort((a, b) => Date.parse(b.modifiedTime) - Date.parse(a.modifiedTime))

  const gekozen = kandidaten[0] ?? null
  const tweede = kandidaten[1] ?? null
  const krap =
    gekozen && tweede
      ? Date.parse(gekozen.modifiedTime) - Date.parse(tweede.modifiedTime) < krapUren * 3600_000
      : false

  return { gekozen, tweede, krap, kandidaten, afgewezen }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const invoer = await new Response(process.stdin).text()
  const ruw = JSON.parse(invoer)
  const bestanden = Array.isArray(ruw) ? ruw : (ruw.files ?? [])
  const { gekozen, krap, tweede, kandidaten, afgewezen } = kiesNieuwste(bestanden)

  if (!gekozen) {
    console.error(`Geen bruikbare sheet in ${bestanden.length} bestanden.`)
    process.exit(1)
  }

  for (const [i, k] of kandidaten.entries()) {
    console.error(`${i === 0 ? '→' : ' '} ${k.modifiedTime}  ${k.title}`)
  }
  for (const { bestand, reden } of afgewezen) {
    console.error(`  ${'—'.padEnd(24)}  ${bestand.title}  (${reden})`)
  }
  if (krap) {
    console.error(
      `\nLet op: "${tweede.title}" is binnen een uur van de winnaar bewerkt. "De laatste" zegt hier weinig.`,
    )
  }

  console.log(
    JSON.stringify(
      { id: gekozen.id, naam: gekozen.title, gewijzigd: gekozen.modifiedTime, uit: kandidaten.length },
      null,
      2,
    ),
  )
}
