// Eén bron voor de pipeline-definitie. Wordt gebruikt door de frontend (src/),
// de Netlify Functions (netlify/) en het importscript (scripts/).
// Plain JS met een .d.ts ernaast, zodat alle drie hem kunnen importeren.

/** De elf stages plus de eindstatus, in volgorde. Uit paragraaf 3.1 en 3.3. */
export const STAGES = [
  { id: 'Gescoord',        norm: 5,  actie: 'Benaderen of afvoeren',                          toon: 'grijs'      },
  { id: 'Benaderd',        norm: 5,  actie: 'Opvolgen',                                       toon: 'blauw'      },
  { id: 'Opgevolgd',       norm: 12, actie: 'Afvallen met reden Geen reactie',                toon: 'blauw'      },
  { id: 'Gereageerd',      norm: 3,  actie: 'Gesprek inplannen',                              toon: 'oranje'     },
  { id: 'Gesproken',       norm: 5,  actie: 'Op shortlist zetten of afwijzen, met bericht',   toon: 'oranje'     },
  { id: 'Shortlist',       norm: 5,  actie: 'Voordragen, of terug naar de klant',             toon: 'oranje-op'  },
  { id: 'Voorgesteld',     norm: 5,  actie: 'Opdrachtgever nabellen',                         toon: 'donkerblauw'},
  { id: 'Interview klant', norm: 10, actie: 'Terugkoppeling opeisen',                         toon: 'donkerblauw'},
  { id: 'Aanbod',          norm: 0,  actie: '',                                               toon: 'donkerblauw'},
  { id: 'Geplaatst',       norm: 0,  actie: '',                                               toon: 'groen'      },
  { id: 'Ingewerkt',       norm: 0,  actie: '',                                               toon: 'groen'      },
  { id: 'Afgevallen',      norm: 0,  actie: '',                                               toon: 'grijs'      },
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
