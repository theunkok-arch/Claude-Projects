import { Link } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import { funnel } from '../lib/metrics'
import { band, datum } from '../lib/format'
import Funnel from '../components/Funnel'

export default function Vacatures() {
  const { data, regels } = useAts()
  if (!data) return null

  const opdrachtgevers = new Map(data.opdrachtgevers.map((o) => [o.id, o]))

  return (
    <div>
      <h1 className="text-2xl font-semibold">Vacatures</h1>

      <div className="mt-4 flex flex-col gap-3">
        {data.vacatures.map((vacature) => {
          const eigen = regels.filter((r) => r.vacature?.id === vacature.id)
          const teLang = eigen.filter((r) => r.overschreden).length

          return (
            <Link
              key={vacature.id}
              to={`/vacature/${vacature.id}`}
              className="rounded-2xl border border-lijn bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{vacature.Titel}</p>
                  <p className="truncate text-sm text-navy-400">
                    {opdrachtgevers.get(vacature.Opdrachtgever?.[0] ?? '')?.Naam ?? 'Geen opdrachtgever'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-cream px-2.5 py-1 text-xs font-medium">
                  {vacature.Status ?? '—'}
                </span>
              </div>

              {vacature.Validatie && (
                <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-sm text-red-700">
                  {vacature.Validatie}
                </p>
              )}

              <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-navy-400">Salarisband</dt>
                <dd className="text-right">{band(vacature['Salaris min'], vacature['Salaris max'])}</dd>
                <dt className="text-navy-400">Streefdatum shortlist</dt>
                <dd className="text-right">{datum(vacature['Streefdatum shortlist'])}</dd>
                <dt className="text-navy-400">Over de norm</dt>
                <dd className={`text-right ${teLang > 0 ? 'font-semibold text-oranje' : ''}`}>{teLang}</dd>
              </dl>

              <div className="mt-3 border-t border-lijn pt-3">
                <Funnel tredes={funnel(eigen)} />
              </div>
            </Link>
          )
        })}

        {data.vacatures.length === 0 && (
          <p className="mt-8 text-center text-navy-400">Nog geen vacatures in de base.</p>
        )}
      </div>
    </div>
  )
}
