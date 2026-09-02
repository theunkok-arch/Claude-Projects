export type StageId =
  | 'Gescoord'
  | 'Benaderd'
  | 'Opgevolgd'
  | 'Gereageerd'
  | 'Gesproken'
  | 'Shortlist'
  | 'Voorgesteld'
  | 'Interview klant'
  | 'Aanbod'
  | 'Geplaatst'
  | 'Ingewerkt'
  | 'Afgevallen'

export type StageToon = 'grijs' | 'blauw' | 'oranje' | 'oranje-op' | 'donkerblauw' | 'groen'

export interface StageConfig {
  id: StageId
  /** Servicenorm in werkdagen. 0 betekent: geen norm. */
  norm: number
  actie: string
  toon: StageToon
  /** De standaardstap vooruit. Ontbreekt op de eindstations. */
  volgendeStage?: StageId
  /** Wat er op de knop staat. Staat er een volgendeStage, dan staat dit er ook. */
  volgendeLabel?: string
  /** Alleen bij een stap naar Afgevallen: de reden die dan wordt meegeschreven. */
  volgendeReden?: string
}

export declare const STAGES: StageConfig[]
export declare const STAGE_IDS: StageId[]
export declare const FUNNEL_STAGES: StageId[]
export declare const EIND_STAGES: StageId[]
export declare const EERSTE_KLANT_ZICHTBARE_STAGE: StageId
export declare const AFVAL_REDENEN: Record<string, string[]>
export declare const MEEST_GEBRUIKTE_REDENEN: string[]
export declare const ALLE_AFVAL_REDENEN: string[]
export declare function stageIndex(stage: string | null | undefined): number
export declare function stageConfig(stage: string | null | undefined): StageConfig | undefined
export declare function isKlantZichtbaar(stage: string | null | undefined): boolean
export declare function isActief(stage: string | null | undefined): boolean
export declare function werkdagenTussen(vanISO: string | null | undefined, totISO: string): number | null
export declare function dagenTussen(vanISO: string | null | undefined, totISO: string): number | null
export declare function normOverschreden(
  stage: string | null | undefined,
  datumInStage: string | null | undefined,
  vandaagISO: string,
): boolean
