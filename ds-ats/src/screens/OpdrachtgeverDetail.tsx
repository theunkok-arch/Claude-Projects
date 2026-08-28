import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import { funnel } from '../lib/metrics'
import { band, datum } from '../lib/format'
import { useHerkomst } from '../lib/herkomst'
import { isActief } from '../../shared/stages.mjs'
import type { StageId } from '../../shared/stages.mjs'
import Funnel from '../components/Funnel'
import Terug from '../components/Terug'

/**
 * Scherm per opdrachtgever: zijn vacatures, elk met de eigen funnel. Elke trede
 * linkt door naar de kandidatenlijst van die vacature, gefilterd op die stage.
 */
export default function OpdrachtgeverDetail() {
  const { id } = useParams()
  const herkomst = useHerkomst()
  const { data, regels } = useAts()

  const opdrachtgever = data?.opdrachtgevers.find((o) => o.id === id)
  const vacatures = useMemo(
    () => (data?.vacatures ?? []).filter((v) => v.Opdrachtgever?.[0] === id),
    [data, id],
  )
  const contactpersonen = useMemo(
    () => (data?.contactpersonen ?? []).filter((c) => c.Opdrachtgever?.[0] === id),
    [data, id],
  )

  if (!data) return null
  if (!opdrachtgever) return <p className="text-navy-400">Deze opdrachtgever bestaat niet (meer).</p>

  const ids = new Set(vacatures.map((v) => v.id))
  const alle = regels.filter((r) => r.vacature && ids.has(r.vacature.id))
  const actief = alle.filter((r) => isActief(r.aanmelding.Stage)).length
  const teLang = alle.filter((r) => r.overschreden).length

  return (
    <div>
      <Terug naar="/opdrachtgevers" label="Opdrachtgevers" />
      <h1 className="mt-1 text-2xl font-semibold">{opdrachtgever.Naam}</h1>
      <p className="text-sm text-navy-400">
        {opdrachtgever.Status ?? '—'} · {alle.length} aanmeldingen · {actief} actief
        {teLang > 0 && <span className="font-medium text-oranje"> · {teLang} over de norm</span>}
      </p>

      {contactpersonen.length > 0 && (
        <section className="mt-4 rounded-2xl border border-lijn bg-white p-4">
          <h2 className="mb-2 font-semibold">Contact</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {contactpersonen.map((persoon) => (
              <li key={persoon.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {persoon.Naam}
                  {persoon['Is hiring manager'] && <span className="text-navy-400"> · hiring manager</span>}
                </span>
                <span className="shrink-0 text-navy-400">{persoon.Rol ?? ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mt-6 font-semibold">Vacatures ({vacatures.length})</h2>

      <div className="mt-2 flex flex-col gap-3">
        {vacatures.map((vacature) => {
          const eigen = regels.filter((r) => r.vacature?.id === vacature.id)
          const eigenTeLang = eigen.filter((r) => r.overschreden).length

          return (
            <section key={vacature.id} className="rounded-2xl border border-lijn bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <Link
                  to={`/vacature/${vacature.id}`}
                  state={herkomst}
                  className="min-w-0 font-semibold underline"
                >
                  {vacature.Titel}
                </Link>
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
                <dd className={`text-right ${eigenTeLang > 0 ? 'font-semibold text-oranje' : ''}`}>
                  {eigenTeLang}
                </dd>
              </dl>

              <div className="mt-3 border-t border-lijn pt-3">
                <Funnel
                  tredes={funnel(eigen)}
                  hrefVoor={(stage: StageId) => `/vacature/${vacature.id}?stage=${encodeURIComponent(stage)}`}
                />
              </div>
            </section>
          )
        })}

        {vacatures.length === 0 && (
          <p className="mt-4 text-navy-400">Deze opdrachtgever heeft nog geen vacatures.</p>
        )}
      </div>
    </div>
  )
}
