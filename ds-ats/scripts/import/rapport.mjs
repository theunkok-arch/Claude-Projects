// De importcheck: wat gaat deze import doen, en mag hij door?
//
// Dit is de JS-tweeling van ds-framework/scripts/ats_importcheck.py. Die kan
// alleen een kandidaten.xlsx lezen en draait op Python; de route via
// mcp-batches.mjs werkt met een CSV en zonder Python, en had daardoor helemaal
// geen check. Dat is precies mis: de duurste fout tot nu toe was een
// stagevertaling (xlsx-Shortlist landde op ATS-Shortlist en zette 25 mensen
// vier treden te ver), en juist die zie je alleen in de kolom "ATS Stage" per
// kandidaat.
//
// De secties en de strengheid volgen het Python-script, zodat het rapport
// hetzelfde leest ongeacht welke route je rijdt. Waar de twee routes echt van
// elkaar verschillen staat dat in het rapport zelf, niet in een voetnoot.
//
// Het schrijft niets naar de ATS en niets naar het bronbestand.

import { createHash } from 'node:crypto'

import { STAGE_IDS } from '../../shared/stages.mjs'

/**
 * Kijkt een plan na en geeft fouten, waarschuwingen en de tabel terug.
 *
 * Blokkerend is alles wat de ATS weigert of wat stilzwijgend de verkeerde data
 * oplevert. Waarschuwingen zijn dingen die je wilt weten maar die een bewuste
 * keuze kunnen zijn.
 */
export function controleer(plan, { vandaag }) {
  const fouten = []
  const waarschuwingen = []
  const rijen = []

  // Onbekende status is blokkerend, ook al valt hij in lees.mjs terug op
  // Gescoord. Die terugval is een vangnet tegen een verkeerde stage, geen
  // toestemming om te raden: waar iemand in de trechter staat is een
  // beslissing van Dominique, niet van een default.
  for (const [status, aantal] of plan.onbekendeStatus) {
    fouten.push(`Onbekende Status "${status}" (${aantal}x). Valt terug op Gescoord; bevestig dat of vul status-map.mjs aan.`)
  }

  // Twee verschillende mensen met dezelfde naam. De aanmelding krijgt "Naam —
  // Vacature" als primaire waarde en koppelt daarop; met een botsing hangt de
  // aanmelding aan de verkeerde persoon.
  for (const botsing of plan.naamBotsingen) {
    fouten.push(`Naam "${botsing.naam}" komt ${botsing.aantal}x voor met verschillende dedupe-sleutels. Koppelen op naam wijst dan de verkeerde persoon aan.`)
  }

  for (const overgeslagen of plan.overgeslagen) {
    if (overgeslagen.reden.startsWith('dubbel in het bestand')) {
      fouten.push(`Rij ${overgeslagen.rij}: ${overgeslagen.reden}. Deze rij komt er niet in.`)
    }
  }

  for (const [reden, aantal] of plan.onbekendeReden) {
    waarschuwingen.push(`Onbekende afvalreden "${String(reden).slice(0, 60)}" (${aantal}x), wordt leeggelaten.`)
  }

  for (const [url, aantal] of plan.nietIdentificerendeUrls) {
    waarschuwingen.push(`URL wijst geen persoon aan (${aantal}x), dedupe valt terug op naam plus woonplaats: ${url.slice(0, 64)}`)
  }

  for (const kolom of plan.genegeerdMetInhoud ?? []) {
    waarschuwingen.push(`Kolom "${kolom}" is gevuld maar wordt niet geimporteerd.`)
  }

  // Per aanmelding: wat landt waar. Dit is de kern van het rapport.
  const kandidaatVan = new Map([...plan.kandidaten].map(([sleutel, velden]) => [sleutel, velden]))
  const stages = new Map()
  const bronnen = new Map()
  const rondes = new Map()

  for (const aanmelding of plan.aanmeldingen) {
    const kandidaat = kandidaatVan.get(aanmelding.sleutel) ?? {}
    const naam = aanmelding.velden.Aanmelding ?? kandidaat.Naam ?? '(zonder naam)'
    const stage = aanmelding.velden.Stage
    const reden = aanmelding.velden['Reden afvallen'] ?? ''
    const datum = aanmelding.velden['Datum in huidige stage']
    const score = aanmelding.velden['Score totaal']
    const bron = kandidaat.Bron ?? 'Overig'
    const ronde = aanmelding.velden.Zoekronde ?? ''
    const opUrl = typeof aanmelding.sleutel === 'string' && aanmelding.sleutel.startsWith('http')

    if (stage === 'Afgevallen' && !reden) {
      fouten.push(`${naam}: Afgevallen zonder reden. De ATS markeert dat als incompleet.`)
    }
    if (datum && vandaag && datum > vandaag) {
      fouten.push(`${naam}: Datum in huidige stage ligt in de toekomst (${datum}).`)
    }
    if (score === undefined || score === null) {
      fouten.push(`${naam}: Score totaal is leeg.`)
    }
    if (!opUrl) {
      const woonplaats = kandidaat.Woonplaats
      waarschuwingen.push(
        `${naam}: geen LinkedIn-URL, dedupe op naam plus woonplaats` +
          (woonplaats ? '.' : ' en Woonplaats is LEEG, dus kans op een dubbel record.'),
      )
    }
    if (bron === 'Overig') {
      waarschuwingen.push(`${naam}: Bron niet herkend, wordt Overig.`)
    }

    stages.set(stage, (stages.get(stage) ?? 0) + 1)
    bronnen.set(bron, (bronnen.get(bron) ?? 0) + 1)
    if (ronde) rondes.set(ronde, (rondes.get(ronde) ?? 0) + 1)

    rijen.push({ naam, stage, reden, bron, ronde, dedupe: opUrl ? 'LinkedIn' : 'naam+woonplaats' })
  }

  return { fouten, waarschuwingen, rijen, stages, bronnen, rondes }
}

/** Het rapport als markdown, met dezelfde koppen als ats_importcheck.py. */
export function alsMarkdown(uitkomst, { bestand, vacature, vandaag, overgeslagen }) {
  const { fouten, waarschuwingen, rijen, stages, bronnen, rondes } = uitkomst
  const L = [`# Importcheck ${bestand}`, '', `Datum: ${vandaag}`, `Vacature: ${vacature}`, '']
  L.push(`**Resultaat: ${fouten.length > 0 ? 'BLOKKEREND, eerst fixen' : 'klaar voor import'}**`, '')

  if (fouten.length > 0) L.push('## Blokkerende fouten', '', ...fouten.map((f) => `- ${f}`), '')
  if (waarschuwingen.length > 0) {
    L.push('## Waarschuwingen', '', ...waarschuwingen.map((w) => `- ${w}`), '')
  }

  L.push('## Samenvatting', '', `- Rijen die de ATS in gaan: ${rijen.length}`, `- Overgeslagen: ${overgeslagen}`, '')
  if (stages.size > 0) {
    L.push('Stage bij import:', '')
    // Op de volgorde van de trechter en niet op aantal: zo zie je in één blik
    // of er iets te ver naar rechts is geland.
    for (const stage of STAGE_IDS) {
      if (stages.has(stage)) L.push(`- ${stage}: ${stages.get(stage)}`)
    }
    L.push('')
  }
  if (rondes.size > 0) {
    L.push('Zoekronde:', '', ...[...rondes].map(([r, n]) => `- ${r}: ${n}`), '')
  }
  if (bronnen.size > 0) {
    const opAantal = [...bronnen].sort((a, b) => b[1] - a[1])
    L.push('Bron in de ATS:', '', ...opAantal.map(([b, n]) => `- ${b}: ${n}`), '')
  }

  L.push(
    '## Per kandidaat',
    '',
    '| Aanmelding | ATS Stage | Reden afvallen | ATS Bron | Zoekronde | Dedupe |',
    '|---|---|---|---|---|---|',
    ...rijen.map((r) => `| ${r.naam} | ${r.stage} | ${r.reden} | ${r.bron} | ${r.ronde} | ${r.dedupe} |`),
    '',
  )
  return L.join('\n')
}

/**
 * De vingerafdruk van een plan, zodat een oordeel bij één plan hoort.
 *
 * Het oordeel staat in een apart bestand naast plan.json, want plannen en
 * schrijven zijn losse aanroepen. Daardoor kan het uit de pas lopen: plan
 * schrijft eerst plan.json en pas daarna het oordeel, dus breekt hij daartussen
 * af, dan bewaakt een oud oordeel een nieuw plan. Met deze afdruk erbij merkt
 * de poort dat en weigert hij alsnog.
 */
export function vingerafdruk(planTekst) {
  return createHash('sha256').update(planTekst).digest('hex').slice(0, 16)
}

/**
 * Mag er geschreven worden? Het besluit los van het lezen van bestanden,
 * zodat het te toetsen is zonder een halve importmap na te bouwen.
 *
 * `oordeel` is null als er nog geen importcheck is gedraaid.
 */
export function poortOordeel(oordeel, { akkoord = false, afdruk } = {}) {
  if (akkoord) return { door: true, reden: 'akkoord', blokkerend: [] }
  if (!oordeel) return { door: false, reden: 'geen-check', blokkerend: [] }
  if (afdruk && oordeel.vingerafdruk !== afdruk) {
    return { door: false, reden: 'ander-plan', blokkerend: [] }
  }
  const blokkerend = oordeel.blokkerend ?? []
  if (blokkerend.length > 0) return { door: false, reden: 'blokkerend', blokkerend }
  return { door: true, reden: 'groen', blokkerend: [] }
}
