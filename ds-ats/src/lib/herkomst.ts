import { useLocation } from 'react-router-dom'
import type { Bootstrap } from './types'

/**
 * Het scherm waar je vandaan komt, mee te geven als router-state aan elke link
 * naar een detailscherm: `<Link to={…} state={useHerkomst()}>`.
 *
 * De terugknop daar brengt je dan terug naar precies deze weergave, inclusief
 * de filters die in de URL staan. Zonder dit weet een detailscherm niet hoe je
 * er kwam en moet het gokken — en die gok zat er naast: `/vacature/:id` stuurde
 * je altijd naar `/vacatures`, ook als je via een klant of via het
 * maandagoverzicht binnenkwam.
 */
export function useHerkomst(): { herkomst: string } {
  const { pathname, search } = useLocation()
  return { herkomst: pathname + search }
}

/** Leest de herkomst terug uit de router-state; null bij een directe binnenkomst. */
export function herkomstUit(state: unknown): string | null {
  const pad = (state as { herkomst?: unknown } | null)?.herkomst
  return typeof pad === 'string' && pad.startsWith('/') ? pad : null
}

/**
 * Hoe een pad heet op de terugknop. De namen komen uit de base, want
 * "← Royal Sanders" zegt meer dan "← Opdrachtgever".
 */
export function naamVoorPad(pad: string, data: Bootstrap | null): string {
  const [, tak, id] = pad.split('?')[0].split('/')
  switch (tak) {
    case '':
      return 'Maandagoverzicht'
    case 'vacatures':
      return 'Vacatures'
    case 'opdrachtgevers':
      return 'Opdrachtgevers'
    case 'bronnen':
      return 'Bronnen'
    case 'vacature':
      return data?.vacatures.find((v) => v.id === id)?.Titel ?? 'Vacature'
    case 'opdrachtgever':
      return data?.opdrachtgevers.find((o) => o.id === id)?.Naam ?? 'Opdrachtgever'
    case 'kandidaat':
      return data?.kandidaten.find((k) => k.id === id)?.Naam ?? 'Kandidaat'
    default:
      return 'Terug'
  }
}
