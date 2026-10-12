import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { nl } from './nl'
import { en } from './en'
import type { Woordenboek } from './nl'

export const TALEN = { nl, en }
export type TaalCode = keyof typeof TALEN

const BEWAARD = 'ds-klant-taal'

/**
 * De taal van het klantportaal.
 *
 * Alleen hier. De interne app blijft Nederlands: Dominique werkt in het
 * Nederlands en een tweede taal daar zou alleen maar uit de pas gaan lopen.
 *
 * De keuze leeft in de browser van de opdrachtgever, niet in Airtable. Dat kan
 * omdat de server geen zinnen meer stuurt maar codes: niets aan de serverkant
 * hoeft te weten welke taal iemand leest. Scheelt een veld in de base en een
 * ronde naar de server bij het omzetten.
 */
function gekozenTaal(): TaalCode {
  try {
    const bewaard = localStorage.getItem(BEWAARD)
    if (bewaard === 'nl' || bewaard === 'en') return bewaard
  } catch {
    // Privacyvenster of geblokkeerde opslag. Dan maar de browsertaal.
  }
  // Niet "alles wat geen nl is wordt Engels": alleen een browser die expliciet
  // Engels vraagt. Een Duitse opdrachtgever krijgt zo Nederlands, en dat is
  // eerlijker dan een halve vertaling tot Duits erbij komt.
  const voorkeur = typeof navigator === 'undefined' ? '' : (navigator.language ?? '')
  return voorkeur.toLowerCase().startsWith('en') ? 'en' : 'nl'
}

interface TaalContext {
  taal: TaalCode
  zet: (taal: TaalCode) => void
  t: Woordenboek
}

const Context = createContext<TaalContext | null>(null)

export function TaalProvider({ children }: { children: ReactNode }) {
  const [taal, setTaal] = useState<TaalCode>(gekozenTaal)

  const zet = useCallback((nieuw: TaalCode) => {
    setTaal(nieuw)
    try {
      localStorage.setItem(BEWAARD, nieuw)
    } catch {
      // Niet kunnen onthouden is vervelend, niet fataal: de keuze geldt deze sessie.
    }
  }, [])

  const waarde = useMemo(() => ({ taal, zet, t: TALEN[taal] }), [taal, zet])
  return <Context.Provider value={waarde}>{children}</Context.Provider>
}

export function useTaal(): TaalContext {
  const context = useContext(Context)
  if (!context) throw new Error('useTaal buiten TaalProvider gebruikt')
  return context
}

/** Kortere haak voor schermen die alleen tekst nodig hebben. */
export function useT(): Woordenboek {
  return useTaal().t
}

/**
 * Vertaal een waarde die uit de base komt.
 *
 * Staat de waarde niet in de lijst, dan komt hij ongewijzigd terug. Dat is met
 * opzet: een nieuwe keuzeoptie in Airtable hoort zichtbaar te blijven, ook
 * onvertaald, in plaats van leeg of weggelaten.
 */
export function vertaalWaarde<S extends Record<string, string>>(
  lijst: S,
  waarde: string | null | undefined,
): string | null {
  if (!waarde) return null
  return lijst[waarde] ?? waarde
}

/**
 * De foutmelding bij een code van de server.
 *
 * Zonder code valt hij terug op de Nederlandse zin die de server meestuurde, en
 * anders op "er ging iets mis". Nooit een lege melding.
 */
export function foutTekst(
  t: Woordenboek,
  code: string | undefined,
  vars: Record<string, unknown> | undefined,
  terugval?: string,
): string {
  const regel = code ? (t.fout as Record<string, unknown>)[code] : undefined
  if (typeof regel === 'function') return (regel as (v: unknown) => string)(vars ?? {})
  if (typeof regel === 'string') return regel
  return terugval || t.fout.algemeen
}
