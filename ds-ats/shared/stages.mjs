// Eén bron voor de pipeline-definitie. Wordt gebruikt door de frontend (src/),
// de Netlify Functions (netlify/) en het importscript (scripts/).
// Plain JS met een .d.ts ernaast, zodat alle drie hem kunnen importeren.

/**
 * De elf stages plus de eindstatus, in volgorde. Uit paragraaf 3.1 en 3.3.
 *
 * `volgendeStage` en `volgendeReden` zijn de standaardstap vooruit: waar de
 * meeste kandidaten vanaf hier heen gaan. De kaart maakt daar één knop van, en
 * `volgendeLabel` is wat erop staat. Dat derde veld is nodig omdat het label
 * niet uit de doelstage valt af te leiden: Shortlist wordt "Op shortlist",
 * Voorgesteld wordt "Voordragen" en Afgevallen wordt "Afvallen: geen reactie".
 * Een aparte lijst met labels zou hetzelfde zijn als een veld, maar dan op een
 * tweede plek, en dat is precies wat dit bestand moet voorkomen.
 *
 * Stages zonder `volgendeStage` hebben geen standaardstap: Ingewerkt en
 * Afgevallen zijn eindstations.
 */
export const STAGES = [
  { id: 'Gescoord',        norm: 5,  actie: 'Benaderen of afvoeren',                          toon: 'grijs',       volgendeStage: 'Benaderd',        volgendeLabel: 'Benaderen'              },
  { id: 'Benaderd',        norm: 5,  actie: 'Opvolgen',                                       toon: 'blauw',       volgendeStage: 'Opgevolgd',       volgendeLabel: 'Opvolgen'               },
  { id: 'Opgevolgd',       norm: 12, actie: 'Afvallen met reden Geen reactie',                toon: 'blauw',       volgendeStage: 'Afgevallen',      volgendeLabel: 'Afvallen: geen reactie', volgendeReden: 'Geen reactie' },
  { id: 'Gereageerd',      norm: 3,  actie: 'Gesprek inplannen',                              toon: 'oranje',      volgendeStage: 'Gesproken',       volgendeLabel: 'Gesproken'              },
  { id: 'Gesproken',       norm: 5,  actie: 'Op shortlist zetten of afwijzen, met bericht',   toon: 'oranje',      volgendeStage: 'Shortlist',       volgendeLabel: 'Op shortlist'           },
  { id: 'Shortlist',       norm: 5,  actie: 'Voordragen, of terug naar de klant',             toon: 'oranje-op',   volgendeStage: 'Voorgesteld',     volgendeLabel: 'Voordragen'             },
  { id: 'Voorgesteld',     norm: 5,  actie: 'Opdrachtgever nabellen',                         toon: 'donkerblauw', volgendeStage: 'Interview klant', volgendeLabel: 'Interview gepland'      },
  { id: 'Interview klant', norm: 10, actie: 'Terugkoppeling opeisen',                         toon: 'donkerblauw', volgendeStage: 'Aanbod',          volgendeLabel: 'Aanbod uit'             },
  { id: 'Aanbod',          norm: 0,  actie: '',                                               toon: 'donkerblauw', volgendeStage: 'Geplaatst',       volgendeLabel: 'Geplaatst'              },
  { id: 'Geplaatst',       norm: 0,  actie: '',                                               toon: 'groen',       volgendeStage: 'Ingewerkt',       volgendeLabel: 'Ingewerkt'              },
  { id: 'Ingewerkt',       norm: 0,  actie: '',                                               toon: 'groen'       },
  { id: 'Afgevallen',      norm: 0,  actie: '',                                               toon: 'grijs'       },
]

export const STAGE_IDS = STAGES.map((s) => s.id)

/** Stages die meetellen in de funnel — Afgevallen is een eindstatus, geen trede. */
export const FUNNEL_STAGES = STAGE_IDS.filter((id) => id !== 'Afgevallen')

export const EIND_STAGES = ['Geplaatst', 'Ingewerkt', 'Afgevallen']

/** Vanaf Voorgesteld is de kandidaat zichtbaar voor de opdrachtgever (automation 3). */
export const EERSTE_KLANT_ZICHTBARE_STAGE = 'Voorgesteld'

export const AFVAL_REDENEN = {
  'Afgewezen door ons of de klant': [
    'Overgekwalificeerd',
    'Ondergekwalificeerd',
    'Geen match met team of cultuur',
    'Salariswens te hoog',
    'Afgewezen door ons (profielcheck)',
    // Afgewezen na een referentie- of achtergrondcheck. Toegevoegd 31-08-2026
    // op verzoek van Dominique: twee kandidaten op de lijst voor Account
    // Assistant Sales vielen hierop af, en zonder deze regel vielen ze terug op
    // de profielcheck hierboven — dat is een ander moment in het proces en een
    // ander gesprek met de klant.
    'Achtergrondverificatie',
  ],
  'Afgehaakt door de kandidaat': [
    'Geen interesse',
    'Geen reactie',
    'Tevreden in huidige rol',
    'Timing',
    'Reisafstand',
    'Voorwaarden',
    'Elders geaccepteerd',
    'Teruggetrokken tijdens proces',
  ],
}

/**
 * De drie die de lijst in de praktijk domineren. Ze staan als apart blok
 * bovenaan het redenscherm, en blijven daarnaast gewoon in hun eigen groep
 * hieronder staan: dubbel in de lijst is goedkoper dan veertien opties
 * doorzoeken op een telefoon.
 *
 * Exact dezelfde tekst als hierboven, want deze waarde gaat naar Airtable.
 * Een test in scripts/test/stages.test.mjs bewaakt dat.
 */
export const MEEST_GEBRUIKTE_REDENEN = [
  'Geen reactie',
  'Geen interesse',
  'Afgewezen door ons (profielcheck)',
]

export const ALLE_AFVAL_REDENEN = Object.values(AFVAL_REDENEN).flat()

export function stageIndex(stage) {
  return STAGE_IDS.indexOf(stage)
}

export function stageConfig(stage) {
  return STAGES.find((s) => s.id === stage)
}

/** True zodra de kandidaat is voorgedragen; bepaalt wat de klant in het rapport ziet. */
export function isKlantZichtbaar(stage) {
  const i = stageIndex(stage)
  return i >= stageIndex(EERSTE_KLANT_ZICHTBARE_STAGE) && stage !== 'Afgevallen'
}

export function isActief(stage) {
  return Boolean(stage) && stage !== 'Afgevallen' && stage !== 'Ingewerkt'
}

/** Werkdagen tussen twee ISO-datums, zaterdag en zondag niet meegeteld. */
export function werkdagenTussen(vanISO, totISO) {
  if (!vanISO) return null
  const van = new Date(`${vanISO}T00:00:00Z`)
  const tot = new Date(`${totISO}T00:00:00Z`)
  if (Number.isNaN(van.getTime()) || Number.isNaN(tot.getTime())) return null
  let dagen = 0
  const cursor = new Date(van)
  while (cursor < tot) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    const dag = cursor.getUTCDay()
    if (dag !== 0 && dag !== 6) dagen++
  }
  return dagen
}

/** Kalenderdagen — dit is het getal dat op de kaart staat. */
export function dagenTussen(vanISO, totISO) {
  if (!vanISO) return null
  const van = new Date(`${vanISO}T00:00:00Z`)
  const tot = new Date(`${totISO}T00:00:00Z`)
  if (Number.isNaN(van.getTime()) || Number.isNaN(tot.getTime())) return null
  return Math.round((tot - van) / 86400000)
}

/** De signalering uit 3.3: staat deze aanmelding te lang stil? */
export function normOverschreden(stage, datumInStage, vandaagISO) {
  const config = stageConfig(stage)
  if (!config || config.norm === 0) return false
  const werkdagen = werkdagenTussen(datumInStage, vandaagISO)
  return werkdagen !== null && werkdagen > config.norm
}
