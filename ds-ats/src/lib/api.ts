import type {
  Aanmelding,
  Activiteit,
  Bootstrap,
  Contactpersoon,
  Kandidaat,
  Opdrachtgever,
  Vacature,
} from './types'
import type { StageId } from '../../shared/stages.mjs'

const SLEUTEL_OPSLAG = 'ds-ats-sleutel'

/**
 * Een 401. De sleutel is op dat moment al gewist, dus de aanroeper moet hierop
 * terugvallen op het inlogscherm: blijft de app "ingelogd", dan faalt elke
 * volgende actie stil omdat er geen sleutel meer meegaat.
 */
export class AuthFout extends Error {}

export function bewaardeSleutel(): string | null {
  try {
    return localStorage.getItem(SLEUTEL_OPSLAG)
  } catch {
    return null
  }
}

export function bewaarSleutel(sleutel: string) {
  try {
    localStorage.setItem(SLEUTEL_OPSLAG, sleutel)
  } catch {
    /* private mode: dan vraagt de app elke sessie opnieuw */
  }
}

export function wisSleutel() {
  try {
    localStorage.removeItem(SLEUTEL_OPSLAG)
  } catch {
    /* niets te wissen */
  }
}

async function vraag<T>(pad: string, init: RequestInit = {}): Promise<T> {
  const sleutel = bewaardeSleutel()

  let res: Response
  try {
    res = await fetch(`/api/ats/${pad}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(sleutel ? { 'x-ats-key': sleutel } : {}),
        ...init.headers,
      },
    })
  } catch {
    // Zonder verbinding gooit fetch een Engelse TypeError ("Failed to fetch").
    // Die viel niet op toen fouten werden ingeslikt, maar komt nu wel bij de
    // knop te staan waar de gebruiker op wacht — en de app is Nederlands.
    throw new Error('Geen verbinding met de server. Probeer het opnieuw.')
  }

  if (res.status === 401) {
    wisSleutel()
    throw new AuthFout('Onjuist wachtwoord.')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Verzoek mislukt (${res.status}).`)
  }
  return res.json() as Promise<T>
}

export const api = {
  bootstrap: () => vraag<Bootstrap>('bootstrap'),

  wijzigStage: (body: {
    aanmeldingId: string
    naarStage: StageId
    redenAfvallen?: string
    volgendeActie?: string
    notitie?: string
  }) =>
    vraag<{ aanmelding: { id: string; fields: Aanmelding }; activiteit: Activiteit }>('stage', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  wijzigAanmelding: (id: string, velden: Partial<Aanmelding>) =>
    vraag<{ aanmelding: { id: string; fields: Aanmelding } }>(`aanmelding/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(velden),
    }),

  wijzigKandidaat: (id: string, velden: Partial<Kandidaat>) =>
    vraag<{ kandidaat: { id: string; fields: Kandidaat } }>(`kandidaat/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(velden),
    }),

  maakOpdrachtgever: (velden: Partial<Opdrachtgever>) =>
    vraag<{ opdrachtgever: Opdrachtgever }>('opdrachtgever', {
      method: 'POST',
      body: JSON.stringify(velden),
    }),

  wijzigOpdrachtgever: (id: string, velden: Partial<Opdrachtgever>) =>
    vraag<{ opdrachtgever: { id: string; fields: Opdrachtgever } }>(`opdrachtgever/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(velden),
    }),

  maakVacature: (opdrachtgeverId: string, velden: Partial<Vacature>) =>
    vraag<{ vacature: Vacature }>('vacature', {
      method: 'POST',
      body: JSON.stringify({ opdrachtgeverId, ...velden }),
    }),

  wijzigVacature: (id: string, velden: Partial<Vacature>) =>
    vraag<{ vacature: { id: string; fields: Vacature } }>(`vacature/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(velden),
    }),

  maakContactpersoon: (opdrachtgeverId: string, velden: Partial<Contactpersoon>) =>
    vraag<{ contactpersoon: Contactpersoon }>('contactpersoon', {
      method: 'POST',
      body: JSON.stringify({ opdrachtgeverId, ...velden }),
    }),

  wijzigContactpersoon: (id: string, velden: Partial<Contactpersoon>) =>
    vraag<{ contactpersoon: { id: string; fields: Contactpersoon } }>(`contactpersoon/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(velden),
    }),

  verwijderKandidaat: (id: string) =>
    vraag<{ verwijderd: string; aanmeldingen: number }>(`kandidaat/${id}`, { method: 'DELETE' }),

  maakAanmelding: (body: { kandidaatId: string; vacatureId: string; stage?: StageId }) =>
    vraag<{ aanmelding: Aanmelding }>('aanmelding', { method: 'POST', body: JSON.stringify(body) }),

  logActiviteit: (body: {
    aanmeldingId: string
    type: string
    samenvatting: string
    toelichting?: string
  }) =>
    vraag<{ activiteit: Activiteit; kandidaat: Kandidaat | null }>('activiteit', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

/** Het klantrapport heeft geen sleutel; de token in de URL is de toegang. */
export async function haalRapport(token: string) {
  const res = await fetch(`/api/rapport/${encodeURIComponent(token)}`)
  if (!res.ok) throw new Error('Dit rapport bestaat niet of is niet meer geldig.')
  return res.json()
}
