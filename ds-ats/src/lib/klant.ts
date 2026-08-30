/**
 * De verbinding met /api/portal, los van api.ts.
 *
 * Bewust een apart bestand. `api.ts` haalt bij elk verzoek de gedeelde
 * ATS-sleutel uit `localStorage` en plakt hem in een header; als het
 * klantportaal daaruit zou putten, zou één verkeerde import genoeg zijn om
 * die sleutel op het scherm van een opdrachtgever te laten belanden.
 *
 * Hier is geen sleutel te vinden. De sessie zit in een cookie dat de server
 * zet met `HttpOnly`, dus deze code kan hem niet lezen, niet doorgeven en niet
 * per ongeluk ergens anders naartoe sturen. De browser stuurt hem alleen mee
 * naar /api/portal, en verder nergens heen.
 */

export interface KlantFunnelTrede {
  fase: string
  bereikt: number
  nuHier: number
}

export interface KlantKandidaat {
  id: string
  initialen: string
  huidigeRol: string | null
  fase: string | null
  score: number | null
  dagenInFase: number | null
  /** Heeft Do Solutions deze kandidaat vrijgegeven? Zo niet, blijven de drie velden hieronder leeg. */
  vrijgegeven: boolean
  naam: string | null
  huidigeWerkgever: string | null
  woonplaats: string | null
}

export interface KlantVacature {
  id: string
  titel: string | null
  status: string | null
  standplaats: string | null
  startdatum: string | null
  streefdatumShortlist: string | null
  totaal: number
  funnel: KlantFunnelTrede[]
  afgevallen: Array<{ reden: string; aantal: number }>
  kandidaten: KlantKandidaat[]
}

export interface KlantOverzicht {
  gebruiker: string | null
  opdrachtgever: string | null
  vandaag: string
  vacatures: KlantVacature[]
}

/** Een 401 of 403. De aanroeper valt hierop terug op het inlogscherm. */
export class GeenToegang extends Error {}

async function vraag<T>(pad: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api/portal/${pad}`, {
      ...init,
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    })
  } catch {
    // Zonder verbinding gooit fetch een Engelse TypeError ("Failed to fetch").
    throw new Error('Geen verbinding. Controleer je internet en probeer het opnieuw.')
  }

  const tekst = await res.text()
  const data = tekst ? JSON.parse(tekst) : {}

  if (res.status === 401 || res.status === 403) throw new GeenToegang(data.error ?? 'Geen toegang.')
  if (!res.ok) throw new Error(data.error ?? 'Er ging iets mis.')
  return data as T
}

export function logIn(email: string, wachtwoord: string) {
  return vraag<{ naam: string | null }>('login', {
    method: 'POST',
    body: JSON.stringify({ email, wachtwoord }),
  })
}

export function logUit() {
  return vraag<{ ok: true }>('logout', { method: 'POST' })
}

export function haalOverzicht() {
  return vraag<KlantOverzicht>('overzicht')
}
