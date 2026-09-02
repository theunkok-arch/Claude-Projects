export interface Partij {
  /** ISO-dag waarop deze aanmeldingen zijn toegevoegd. */
  datum: string
  aantal: number
}

export declare function partijen(
  aanmeldingen: ReadonlyArray<{ 'Datum aangemaakt'?: string } | null | undefined> | null | undefined,
): Partij[]

export declare function nieuwstePartij(
  aanmeldingen: ReadonlyArray<{ 'Datum aangemaakt'?: string } | null | undefined> | null | undefined,
): string | null

export declare const MAX_PARTIJEN: number
