import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import StageBadge from './StageBadge'

/** Lowercase, zonder accenten. "Désirée" moet ook op "desiree" te vinden zijn. */
function plat(waarde: string | null | undefined): string {
  return String(waarde ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const MIN_LETTERS = 2
const MAX_TREFFERS = 20

/**
 * Zoeken op naam, rol of werkgever.
 *
 * Alle kandidaten staan al in de browser, dus dit hoeft niet langs de server.
 * Het scherm gaat open over de app heen: op 390px is een zoekveld naast de
 * knoppen in de kop te smal om in te typen, en een volledig scherm laat ook de
 * treffers zien zonder dat er iets weggedrukt hoeft te worden.
 */
export default function Zoek({ open, onSluit }: { open: boolean; onSluit: () => void }) {
  const { data, regels } = useAts()
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const veld = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTerm('')
    // Direct kunnen typen; anders kost zoeken twee taps in plaats van één.
    veld.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const opToets = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSluit()
    }
    window.addEventListener('keydown', opToets)
    return () => window.removeEventListener('keydown', opToets)
  }, [open, onSluit])

  /** Eén regel per kandidaat, met de aanmeldingen die eronder hangen. */
  const treffers = useMemo(() => {
    const gezocht = plat(term)
    if (gezocht.length < MIN_LETTERS) return []

    const gevonden = (data?.kandidaten ?? []).filter((kandidaat) =>
      plat(
        `${kandidaat.Naam} ${kandidaat['Huidige rol'] ?? ''} ${kandidaat['Huidige werkgever'] ?? ''}`,
      ).includes(gezocht),
    )

    return gevonden
      .map((kandidaat) => ({
        id: kandidaat.id,
        naam: kandidaat.Naam ?? 'Naamloos',
        rol: kandidaat['Huidige rol'],
        werkgever: kandidaat['Huidige werkgever'],
        aanmeldingen: regels.filter((regel) => regel.kandidaat?.id === kandidaat.id),
      }))
      // Wie vooraan in de naam matcht staat boven wie ergens in het midden matcht.
      .sort((a, b) => {
        const aVoor = plat(a.naam).startsWith(gezocht) ? 0 : 1
        const bVoor = plat(b.naam).startsWith(gezocht) ? 0 : 1
        return aVoor - bVoor || a.naam.localeCompare(b.naam, 'nl')
      })
      .slice(0, MAX_TREFFERS)
  }, [term, data, regels])

  if (!open) return null

  const totaal = data?.kandidaten.length ?? 0
  const kort = plat(term).length < MIN_LETTERS

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cream">
      <div className="flex items-center gap-2 border-b border-lijn px-4 py-3">
        <input
          ref={veld}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder={`Zoek in ${totaal} kandidaten`}
          aria-label="Zoek een kandidaat"
          className="tik min-w-0 flex-1 rounded-xl border border-lijn bg-white px-3 text-base"
        />
        <button type="button" onClick={onSluit} className="tik shrink-0 px-2 text-sm text-navy-400">
          Sluiten
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {kort ? (
          <p className="text-sm text-navy-400">Typ twee letters van een naam, rol of werkgever.</p>
        ) : treffers.length === 0 ? (
          <p className="text-sm text-navy-400">Niemand gevonden op “{term}”.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {treffers.map((treffer) => (
              <li key={treffer.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSluit()
                    navigate(`/kandidaat/${treffer.id}`)
                  }}
                  className="tik w-full rounded-2xl border border-lijn bg-white px-4 py-3 text-left"
                >
                  <span className="block font-semibold">{treffer.naam}</span>
                  <span className="block text-sm text-navy-400">
                    {[treffer.rol, treffer.werkgever].filter(Boolean).join(' · ') || '—'}
                  </span>
                  {treffer.aanmeldingen.length > 0 && (
                    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      {treffer.aanmeldingen.map((regel) => (
                        <span key={regel.aanmelding.id} className="flex items-center gap-1.5">
                          <StageBadge stage={regel.aanmelding.Stage} klein />
                          <span className="text-xs text-navy-400">{regel.vacature?.Titel ?? '—'}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        )}

        {treffers.length === MAX_TREFFERS && (
          <p className="mt-3 text-sm text-navy-400">
            Alleen de eerste {MAX_TREFFERS} staan hier. Typ verder om te verfijnen.
          </p>
        )}
      </div>
    </div>
  )
}
