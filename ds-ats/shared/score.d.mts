export interface ScoreBand {
  id: 'top' | 'sterk' | 'goed' | 'grens' | 'laag'
  /** Ondergrens, inclusief. */
  vanaf: number
  label: string
  kleur: string
  tint: string
}

export interface ScoreDimensie {
  naam: string
  behaald: number
  max: number
  toelichting: string
  /** behaald gedeeld door max, voor de balk. */
  deel: number
}

export declare const SCORE_BANDEN: ScoreBand[]

export declare function scoreBand(score: number | null | undefined): ScoreBand | null

export declare function scoreRegels(onderbouwing: string | null | undefined): {
  dimensies: ScoreDimensie[]
  rest: string
}
