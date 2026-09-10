export interface Ronde {
  /** De naam van de zoekronde, zoals "Ronde 3". */
  ronde: string
  aantal: number
}

export declare function rondes(
  aanmeldingen: ReadonlyArray<{ Zoekronde?: string } | null | undefined> | null | undefined,
): Ronde[]

export declare const MAX_RONDES: number
