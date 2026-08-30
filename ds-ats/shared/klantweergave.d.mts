export interface Klantzicht {
  /** De naam of de initialen, afhankelijk van of de kandidaat is vrijgegeven. */
  kop: string
  /** Functietitel, en bij een vrijgegeven kandidaat ook werkgever en woonplaats. */
  regel: string | null
  anoniem: boolean
}

export declare function initialen(naam?: string | null): string

export declare function klantZiet(
  kandidaat:
    | {
        Naam?: string | null
        'Huidige rol'?: string | null
        'Huidige werkgever'?: string | null
        Woonplaats?: string | null
      }
    | undefined
    | null,
  vrijgegeven: boolean | undefined,
): Klantzicht
