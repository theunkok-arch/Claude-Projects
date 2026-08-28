import { Link } from 'react-router-dom'
import type { Regel } from '../lib/types'
import { dagen } from '../lib/format'
import StageBadge from './StageBadge'

/** Boven de tien dagen krijgt de kaart een oranje rand. Dat is het signaal. */
const RANDGRENS_DAGEN = 10

interface Props {
  regel: Regel
  toonVacature?: boolean
  onStage?: () => void
}

export default function AanmeldingKaart({ regel, toonVacature = false, onStage }: Props) {
  const { aanmelding, kandidaat, vacature, dagenInStage, overschreden, standaardActie } = regel
  const opvallend = (dagenInStage ?? 0) > RANDGRENS_DAGEN

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        opvallend ? 'border-oranje' : 'border-lijn'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <Link
          to={`/kandidaat/${kandidaat?.id ?? ''}`}
          className="min-w-0 flex-1"
          aria-label={`Open ${kandidaat?.Naam ?? 'kandidaat'}`}
        >
          <p className="truncate font-semibold">{kandidaat?.Naam ?? 'Onbekende kandidaat'}</p>
          <p className="truncate text-sm text-navy-400">
            {[kandidaat?.['Huidige rol'], kandidaat?.['Huidige werkgever']].filter(Boolean).join(' · ') ||
              'Rol onbekend'}
          </p>
          {toonVacature && (
            <p className="mt-0.5 truncate text-xs text-navy-400">{vacature?.Titel ?? 'Geen vacature'}</p>
          )}
        </Link>
        <StageBadge stage={aanmelding.Stage} klein onClick={onStage} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className={overschreden ? 'font-semibold text-oranje' : 'text-navy-400'}>
          {dagen(dagenInStage)} in stage
        </span>
        {aanmelding.Concurrent && (
          <span className="rounded-full bg-oranje-50 px-2 py-0.5 text-xs font-medium text-oranje">
            Concurrent
          </span>
        )}
        {typeof aanmelding['Score totaal'] === 'number' && (
          <span className="text-navy-400">score {aanmelding['Score totaal']}</span>
        )}
      </div>

      {(aanmelding['Volgende actie'] || (overschreden && standaardActie)) && (
        <p className="mt-2 border-t border-lijn pt-2 text-sm">
          <span className="text-navy-400">Volgende actie: </span>
          {aanmelding['Volgende actie'] || standaardActie}
        </p>
      )}

      {aanmelding.Stage === 'Afgevallen' && !aanmelding['Reden afvallen'] && (
        <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-sm text-red-700">Reden ontbreekt</p>
      )}
    </article>
  )
}
