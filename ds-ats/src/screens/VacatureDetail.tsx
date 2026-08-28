import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import { aantalPerStage, afvalRedenen, funnel, opUrgentie } from '../lib/metrics'
import { band, datum } from '../lib/format'
import { FUNNEL_STAGES, STAGE_IDS } from '../../shared/stages.mjs'
import type { StageId } from '../../shared/stages.mjs'
import AanmeldingKaart from '../components/AanmeldingKaart'
import Funnel from '../components/Funnel'
import StageFilter from '../components/StageFilter'
import StageSheet from '../components/StageSheet'
import type { Regel } from '../lib/types'

export default function VacatureDetail() {
  const { id } = useParams()
  const { data, regels, wijzigStage } = useAts()
  const [sheetVoor, setSheetVoor] = useState<Regel | null>(null)

  // De stagekeuze staat in de URL, zodat een aangeklikte funnel-trede een
  // deelbare link is en de terugknop van de browser gewoon werkt.
  const [zoek, setZoek] = useSearchParams()
  const stageFilter = zoek.get('stage') ?? 'lopend'
  const kiesStage = (keuze: string) => {
    const volgende = new URLSearchParams(zoek)
    if (keuze === 'lopend') volgende.delete('stage')
    else volgende.set('stage', keuze)
    setZoek(volgende, { replace: true })
  }

  const vacature = data?.vacatures.find((v) => v.id === id)
  const eigen = useMemo(() => regels.filter((r) => r.vacature?.id === id), [regels, id])

  const stageOpties = useMemo(() => {
    const perStage = aantalPerStage(eigen)
    const lopend = eigen.filter((r) => r.aanmelding.Stage !== 'Afgevallen').length
    return [
      { waarde: 'lopend', label: 'Lopend', aantal: lopend },
      { waarde: 'alles', label: 'Alles', aantal: eigen.length },
      ...(STAGE_IDS as StageId[])
        .filter((stage) => (perStage.get(stage) ?? 0) > 0)
        .map((stage) => ({ waarde: stage, label: stage, aantal: perStage.get(stage) ?? 0 })),
    ]
  }, [eigen])

  const lijst = useMemo(() => {
    const selectie =
      stageFilter === 'lopend'
        ? eigen.filter((r) => r.aanmelding.Stage !== 'Afgevallen')
        : stageFilter === 'alles'
          ? eigen
          : eigen.filter((r) => r.aanmelding.Stage === stageFilter)

    return [...selectie].sort((a, b) => {
      const verschil =
        FUNNEL_STAGES.indexOf(b.aanmelding.Stage as never) -
        FUNNEL_STAGES.indexOf(a.aanmelding.Stage as never)
      return verschil !== 0 ? verschil : opUrgentie(a, b)
    })
  }, [eigen, stageFilter])

  if (!data) return null
  if (!vacature) return <p className="text-navy-400">Deze vacature bestaat niet (meer).</p>

  const opdrachtgever = data.opdrachtgevers.find((o) => o.id === vacature.Opdrachtgever?.[0])
  const redenen = afvalRedenen(eigen)

  return (
    <div>
      <Link to="/vacatures" className="text-sm text-navy-400">
        ← Vacatures
      </Link>
      <h1 className="mt-1 text-2xl font-semibold">{vacature.Titel}</h1>
      {opdrachtgever ? (
        <Link to={`/opdrachtgever/${opdrachtgever.id}`} className="text-sm text-navy-400 underline">
          {opdrachtgever.Naam}
        </Link>
      ) : (
        <p className="text-sm text-navy-400">Geen opdrachtgever</p>
      )}

      {vacature.Validatie && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{vacature.Validatie}</p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-y-1 rounded-2xl border border-lijn bg-white p-4 text-sm">
        <dt className="text-navy-400">Status</dt>
        <dd className="text-right">{vacature.Status ?? '—'}</dd>
        <dt className="text-navy-400">Standplaats</dt>
        <dd className="text-right">{vacature.Standplaats ?? '—'}</dd>
        <dt className="text-navy-400">Salarisband</dt>
        <dd className="text-right">{band(vacature['Salaris min'], vacature['Salaris max'])}</dd>
        <dt className="text-navy-400">Start</dt>
        <dd className="text-right">{datum(vacature.Startdatum)}</dd>
        <dt className="text-navy-400">Streefdatum shortlist</dt>
        <dd className="text-right">{datum(vacature['Streefdatum shortlist'])}</dd>
      </dl>

      <section className="mt-5 rounded-2xl border border-lijn bg-cream p-4">
        <h2 className="mb-3 font-semibold">Funnel</h2>
        <Funnel
          tredes={funnel(eigen)}
          onKies={kiesStage}
          actief={(STAGE_IDS as string[]).includes(stageFilter) ? (stageFilter as StageId) : null}
        />
        <p className="mt-2 text-xs text-navy-400">
          nu in deze stage / ooit tot hier gekomen — tik een trede voor die kandidaten
        </p>
      </section>

      {redenen.length > 0 && (
        <section className="mt-4 rounded-2xl border border-lijn bg-white p-4">
          <h2 className="mb-2 font-semibold">Waarom ze afvielen</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {redenen.map((rij) => (
              <li key={rij.reden} className="flex justify-between gap-3">
                <span className={rij.reden === 'Reden ontbreekt' ? 'text-red-700' : ''}>{rij.reden}</span>
                <span className="tabular-nums text-navy-400">{rij.aantal}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 flex items-center justify-between gap-2">
        <h2 className="shrink-0 font-semibold">Kandidaten ({lijst.length})</h2>
        <StageFilter waarde={stageFilter} onKies={kiesStage} opties={stageOpties} />
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {lijst.map((regel) => (
          <AanmeldingKaart
            key={regel.aanmelding.id}
            regel={regel}
            onStage={() => setSheetVoor(regel)}
          />
        ))}
        {lijst.length === 0 && <p className="mt-4 text-navy-400">Niets in deze weergave.</p>}
      </div>

      <StageSheet
        open={sheetVoor !== null}
        huidigeStage={sheetVoor?.aanmelding.Stage}
        naam={sheetVoor?.kandidaat?.Naam ?? ''}
        onSluit={() => setSheetVoor(null)}
        onKies={async (stage, reden) => {
          if (sheetVoor) await wijzigStage(sheetVoor.aanmelding.id, stage, { redenAfvallen: reden })
        }}
      />
    </div>
  )
}
