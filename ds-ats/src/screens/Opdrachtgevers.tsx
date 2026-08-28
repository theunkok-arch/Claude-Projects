import { Link } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import { useHerkomst } from '../lib/herkomst'
import { isActief } from '../../shared/stages.mjs'

/**
 * De klantenlijst. Eén regel per opdrachtgever met wat er voor hem loopt,
 * zodat je vanuit "hoe staat Royal Sanders ervoor" kunt beginnen in plaats van
 * vanuit een losse vacature.
 */
export default function Opdrachtgevers() {
  const { data, regels } = useAts()
  const herkomst = useHerkomst()
  if (!data) return null

  return (
    <div>
      <h1 className="text-2xl font-semibold">Opdrachtgevers</h1>

      <div className="mt-4 flex flex-col gap-3">
        {data.opdrachtgevers.map((opdrachtgever) => {
          const vacatures = data.vacatures.filter((v) => v.Opdrachtgever?.[0] === opdrachtgever.id)
          const ids = new Set(vacatures.map((v) => v.id))
          const eigen = regels.filter((r) => r.vacature && ids.has(r.vacature.id))
          const actief = eigen.filter((r) => isActief(r.aanmelding.Stage)).length
          const teLang = eigen.filter((r) => r.overschreden).length

          return (
            <Link
              key={opdrachtgever.id}
              to={`/opdrachtgever/${opdrachtgever.id}`}
              state={herkomst}
              className="rounded-2xl border border-lijn bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate font-semibold">{opdrachtgever.Naam ?? 'Naamloos'}</p>
                <span className="shrink-0 rounded-full bg-cream px-2.5 py-1 text-xs font-medium">
                  {opdrachtgever.Status ?? '—'}
                </span>
              </div>
              <p className="mt-1 text-sm text-navy-400">
                {vacatures.length} {vacatures.length === 1 ? 'vacature' : 'vacatures'} · {actief} actief
                {teLang > 0 && <span className="font-medium text-oranje"> · {teLang} over de norm</span>}
              </p>
            </Link>
          )
        })}

        {data.opdrachtgevers.length === 0 && (
          <p className="mt-8 text-center text-navy-400">Nog geen opdrachtgevers in de base.</p>
        )}
      </div>
    </div>
  )
}
