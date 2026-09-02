import {
  FUNNEL_STAGES,
  dagenTussen,
  isActief,
  normOverschreden,
  stageConfig,
  werkdagenTussen,
} from '../../shared/stages.mjs'
import type { StageId } from '../../shared/stages.mjs'
import type { Bootstrap, Regel } from './types'

/** Plakt kandidaat, vacature en opdrachtgever aan elke aanmelding en rekent de norm uit. */
export function bouwRegels(data: Bootstrap): Regel[] {
  const kandidaten = new Map(data.kandidaten.map((k) => [k.id, k]))
  const vacatures = new Map(data.vacatures.map((v) => [v.id, v]))
  const opdrachtgevers = new Map(data.opdrachtgevers.map((o) => [o.id, o]))

  return data.aanmeldingen.map((aanmelding) => {
    const vacature = vacatures.get(aanmelding.Vacature?.[0] ?? '')
    const config = stageConfig(aanmelding.Stage)
    const datumInStage = aanmelding['Datum in huidige stage']

    return {
      aanmelding,
      kandidaat: kandidaten.get(aanmelding.Kandidaat?.[0] ?? ''),
      vacature,
      opdrachtgever: opdrachtgevers.get(vacature?.Opdrachtgever?.[0] ?? ''),
      dagenInStage: dagenTussen(datumInStage, data.vandaag),
      werkdagenInStage: werkdagenTussen(datumInStage, data.vandaag),
      overschreden: normOverschreden(aanmelding.Stage, datumInStage, data.vandaag),
      norm: config?.norm ?? 0,
    }
  })
}

export const actieveRegels = (regels: Regel[]) => regels.filter((r) => isActief(r.aanmelding.Stage))

/**
 * Sortering van het maandagoverzicht: eerst wat de norm overschrijdt, daarbinnen
 * het langst stilstaand bovenaan. Dat is de volgorde waarin je moet bellen.
 *
 * Daarachter de score aflopend. Na de import staat iedereen op dezelfde datum in
 * huidige stage, dus de eerste twee sleutels beslissen nu vrijwel nooit iets en
 * zou de volgorde willekeurig zijn; met de score erbij staat de beste kandidaat
 * altijd bovenaan.
 */
export function opUrgentie(a: Regel, b: Regel): number {
  if (a.overschreden !== b.overschreden) return a.overschreden ? -1 : 1
  const stilstand = (b.dagenInStage ?? 0) - (a.dagenInStage ?? 0)
  if (stilstand !== 0) return stilstand
  return (b.aanmelding['Score totaal'] ?? 0) - (a.aanmelding['Score totaal'] ?? 0)
}

export function groepeerPerStage(regels: Regel[]): Array<{ stage: StageId; regels: Regel[] }> {
  return FUNNEL_STAGES.map((stage) => ({
    stage,
    regels: regels.filter((r) => r.aanmelding.Stage === stage).sort(opUrgentie),
  })).filter((groep) => groep.regels.length > 0)
}

export interface FunnelTrede {
  stage: StageId
  nuHier: number
  bereikt: number
}

/**
 * Momentopname per stage plus het cumulatieve bereik. Bereikt telt iedereen die
 * minstens tot deze trede is gekomen — afgevallen kandidaten dus tot de trede
 * waar ze afvielen, voor zover de huidige stage dat nog laat zien.
 */
export function funnel(regels: Regel[]): FunnelTrede[] {
  return FUNNEL_STAGES.map((stage, index) => ({
    stage,
    nuHier: regels.filter((r) => r.aanmelding.Stage === stage).length,
    bereikt: regels.filter((r) => {
      const huidig = FUNNEL_STAGES.indexOf(r.aanmelding.Stage as StageId)
      return huidig >= index
    }).length,
  }))
}

/**
 * Waaronder een afvaller zonder ingevulde reden wordt geteld — en waarop het
 * scherm erachter filtert. Eén constante, om dezelfde reden als BRON_ONBEKEND
 * hieronder: zouden de telling en het filter uiteenlopen, dan klopt het getal
 * in de lijst niet meer met de namen die je eronder krijgt.
 */
export const REDEN_ONTBREEKT = 'Reden ontbreekt'

export function afvalRedenen(regels: Regel[]): Array<{ reden: string; aantal: number }> {
  const tellingen = new Map<string, number>()
  for (const regel of regels) {
    if (regel.aanmelding.Stage !== 'Afgevallen') continue
    const reden = regel.aanmelding['Reden afvallen'] ?? REDEN_ONTBREEKT
    tellingen.set(reden, (tellingen.get(reden) ?? 0) + 1)
  }
  return [...tellingen].map(([reden, aantal]) => ({ reden, aantal })).sort((a, b) => b.aantal - a.aantal)
}

/**
 * Onder welke bron een aanmelding wordt geteld. Eén functie, want het
 * bronscherm telt ermee en het maandagoverzicht filtert ermee: zouden die twee
 * uiteenlopen, dan klopt het getal op de bron niet meer met de lijst erachter.
 */
export function bronVan(regel: Regel): string {
  return regel.kandidaat?.Bron ?? BRON_ONBEKEND
}

/** Kandidaten zonder ingevulde bron vallen hieronder, ook in de URL. */
export const BRON_ONBEKEND = 'Onbekend'

/**
 * Bron-effectiviteit: welk kanaal levert plaatsingen, niet alleen namen.
 * Fout nummer zeven uit het playbook.
 */
export function bronEffectiviteit(regels: Regel[]) {
  const perBron = new Map<string, { gescoord: number; voorgesteld: number; geplaatst: number }>()

  for (const regel of regels) {
    const bron = bronVan(regel)
    const rij = perBron.get(bron) ?? { gescoord: 0, voorgesteld: 0, geplaatst: 0 }
    rij.gescoord += 1
    const index = FUNNEL_STAGES.indexOf(regel.aanmelding.Stage as StageId)
    if (index >= FUNNEL_STAGES.indexOf('Voorgesteld')) rij.voorgesteld += 1
    if (index >= FUNNEL_STAGES.indexOf('Geplaatst')) rij.geplaatst += 1
    perBron.set(bron, rij)
  }

  return [...perBron.entries()]
    .map(([bron, rij]) => ({ bron, ...rij }))
    .sort((a, b) => b.geplaatst - a.geplaatst || b.voorgesteld - a.voorgesteld || b.gescoord - a.gescoord)
}
