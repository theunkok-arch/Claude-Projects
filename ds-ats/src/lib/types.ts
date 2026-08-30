import type { StageId } from '../../shared/stages.mjs'

export interface AirtableRecord {
  id: string
}

export interface Opdrachtgever extends AirtableRecord {
  Naam?: string
  Status?: 'Prospect' | 'Actief' | 'On hold' | 'Afgerond'
  'Portal-token'?: string
  Notities?: string
  Vacatures?: string[]
  Contactpersonen?: string[]
}

export interface Contactpersoon extends AirtableRecord {
  Naam?: string
  Rol?: string
  'E-mail'?: string
  Telefoon?: string
  Opdrachtgever?: string[]
  'Is hiring manager'?: boolean
}

export interface Vacature extends AirtableRecord {
  Titel?: string
  Status?: 'Intake' | 'Actief' | 'On hold' | 'Vervuld' | 'Gestopt'
  Opdrachtgever?: string[]
  Startdatum?: string
  'Streefdatum shortlist'?: string
  Standplaats?: string
  'Salaris min'?: number
  'Salaris max'?: number
  Scoringsdrempel?: number
  Jobspec?: string
  Aanmeldingen?: string[]
  Validatie?: string
  'Op te volgen'?: number
}

export interface Kandidaat extends AirtableRecord {
  Naam?: string
  'LinkedIn-URL'?: string
  'E-mail'?: string
  Telefoon?: string
  Instagram?: string
  Woonplaats?: string
  'Huidige rol'?: string
  'Huidige werkgever'?: string
  Opleiding?: string
  Talen?: string
  Bron?: string
  'Laatste contact'?: string
  'Bewaren tot'?: string
  'AVG-verwijderverzoek'?: boolean
  'Bewaartermijn verstreken'?: number
  Notities?: string
  Aanmeldingen?: string[]
}

export interface Aanmelding extends AirtableRecord {
  Aanmelding?: string
  Kandidaat?: string[]
  Vacature?: string[]
  Stage?: StageId
  'Reden afvallen'?: string
  Eigenaar?: string
  'Datum in huidige stage'?: string
  'Datum aangemaakt'?: string
  'Reistijd minuten'?: number
  'Score totaal'?: number
  'Score-onderbouwing'?: string
  Concurrent?: boolean
  'Outreach-concept'?: string
  'Zichtbaar voor klant'?: boolean
  'Volgende actie'?: string
  Opmerkingen?: string
}

/**
 * Een klantgebruiker van het portaal op /klant.
 *
 * `Wachtwoord-hash` en `Salt` staan hier niet in en horen hier ook nooit in te
 * komen: de server stuurt ze niet mee, en een type dat ze kent nodigt uit tot
 * een scherm dat ze verwacht.
 */
export interface Portaalgebruiker extends AirtableRecord {
  Naam?: string | null
  'E-mail'?: string | null
  Opdrachtgever?: string[]
  Vacatures?: string[]
  Status?: 'Actief' | 'Geblokkeerd'
  'Verloopt op'?: string | null
  'Laatste login'?: string | null
  'Geblokkeerd tot'?: string | null
}

export interface Activiteit extends AirtableRecord {
  Samenvatting?: string
  Aanmelding?: string[]
  Datum?: string
  Type?: string
  'Door wie'?: string
  Toelichting?: string
}

export interface Bootstrap {
  vandaag: string
  opdrachtgevers: Opdrachtgever[]
  vacatures: Vacature[]
  kandidaten: Kandidaat[]
  aanmeldingen: Aanmelding[]
  activiteiten: Activiteit[]
  contactpersonen: Contactpersoon[]
}

/** Aanmelding met de kandidaat en vacature er al aan vast, plus de afgeleide signalering. */
export interface Regel {
  aanmelding: Aanmelding
  kandidaat?: Kandidaat
  vacature?: Vacature
  opdrachtgever?: Opdrachtgever
  dagenInStage: number | null
  werkdagenInStage: number | null
  overschreden: boolean
  norm: number
  standaardActie: string
}
