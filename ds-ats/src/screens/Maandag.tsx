import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import { actieveRegels, opUrgentie } from '../lib/metrics'
import { FUNNEL_STAGES } from '../../shared/stages.mjs'
import type { StageId } from '../../shared/stages.mjs'
import AanmeldingKaart from '../components/AanmeldingKaart'
import StageBadge from '../components/StageBadge'
import StageTegels, { type StageTelling } from '../components/StageTegels'
import StageSheet from '../components/StageSheet'
import type { Regel } from '../lib/types'

/** Pseudo-stage in de URL: alles wat de servicenorm overschrijdt, ongeacht stage. */
const NORM = 'norm'

/**
 * Scherm 1, template 2 uit het playbook. Het beginscherm toont de tellingen per
 * stage; pas na doorklikken krijg je de kandidaten van één stage te zien.
 *
 * De keuze staat in de URL (`?stage=Benaderd`, `?vacature=rec…`), zodat de
 * terugknop werkt en een weergave deelbaar is.
 */
export default function Maandag() {
  const { regels, data, wijzigStage } = useAts()
  const [zoek, setZoek] = useSearchParams()
  const [sheetVoor, setSheetVoor] = useState<Regel | null>(null)

  const vacatureFilter = zoek.get('vacature') ?? 'alle'
  const stage = zoek.get('stage')

  const zetZoek = (sleutel: string, waarde: string | null) => {
    const volgende = new URLSearchParams(zoek)
    if (waarde === null) volgende.delete(sleutel)
    else volgende.set(sleutel, waarde)
    setZoek(volgende)
  }

  /** Alles wat op dit scherm hoort: actief, en binnen de gekozen vacature. */
  const inScope = useMemo(() => {
    const actief = actieveRegels(regels)
    return vacatureFilter === 'alle'
      ? actief
      : actief.filter((r) => r.vacature?.id === vacatureFilter)
  }, [regels, vacatureFilter])

  const teLang = useMemo(() => inScope.filter((r) => r.overschreden), [inScope])

  const tellingen: StageTelling[] = useMemo(
    () =>
      (FUNNEL_STAGES as StageId[])
        .map((s) => ({
          stage: s,
          aantal: inScope.filter((r) => r.aanmelding.Stage === s).length,
          overschreden: inScope.filter((r) => r.aanmelding.Stage === s && r.overschreden).length,
        }))
        .filter((rij) => rij.aantal > 0),
    [inScope],
  )

  const lijst = useMemo(() => {
    if (!stage) return []
    const selectie = stage === NORM ? teLang : inScope.filter((r) => r.aanmelding.Stage === stage)
    return [...selectie].sort(opUrgentie)
  }, [stage, inScope, teLang])

  const actieveVacatures = (data?.vacatures ?? []).filter(
    (v) => v.Status === 'Actief' || v.Status === 'Intake',
  )
  const vacatureNaam =
    vacatureFilter === 'alle'
      ? null
      : (actieveVacatures.find((v) => v.id === vacatureFilter)?.Titel ?? null)

  const linkNaarStage = (s: string) => {
    const volgende = new URLSearchParams(zoek)
    volgende.set('stage', s)
    return `/?${volgende.toString()}`
  }

  // ── Doorgeklikt: de kandidaten van één stage ────────────────────────────────
  if (stage) {
    const terug = new URLSearchParams(zoek)
    terug.delete('stage')
    const terugPad = terug.toString() ? `/?${terug.toString()}` : '/'

    return (
      <div>
        <Link to={terugPad} className="text-sm text-navy-400">
          ← Maandagoverzicht
        </Link>

        <div className="mt-1 flex items-center gap-3">
          {stage === NORM ? (
            <h1 className="text-2xl font-semibold text-oranje">Over de norm</h1>
          ) : (
            <StageBadge stage={stage as StageId} />
          )}
          <span className="text-2xl font-semibold tabular-nums">{lijst.length}</span>
        </div>
        {vacatureNaam && <p className="text-sm text-navy-400">{vacatureNaam}</p>}

        <div className="mt-4 flex flex-col gap-2">
          {lijst.map((regel) => (
            <AanmeldingKaart
              key={regel.aanmelding.id}
              regel={regel}
              toonVacature={vacatureFilter === 'alle'}
              onStage={() => setSheetVoor(regel)}
            />
          ))}
          {lijst.length === 0 && <p className="mt-4 text-navy-400">Niemand in deze weergave.</p>}
        </div>

        <StageSheet
          open={sheetVoor !== null}
          huidigeStage={sheetVoor?.aanmelding.Stage}
          naam={sheetVoor?.kandidaat?.Naam ?? ''}
          onSluit={() => setSheetVoor(null)}
          onKies={async (naar, reden) => {
            if (sheetVoor) await wijzigStage(sheetVoor.aanmelding.id, naar, { redenAfvallen: reden })
          }}
        />
      </div>
    )
  }

  // ── Beginscherm: alleen tellingen ───────────────────────────────────────────
  return (
    <div>
      <h1 className="text-2xl font-semibold">Maandagoverzicht</h1>
      <p className="mt-1 text-sm text-navy-400">
        {inScope.length} actief in {tellingen.length} {tellingen.length === 1 ? 'stage' : 'stages'}
      </p>

      <div className="sticky top-[57px] z-20 -mx-4 mt-3 border-b border-lijn bg-cream/95 px-4 py-2 backdrop-blur">
        <select
          value={vacatureFilter}
          onChange={(event) =>
            zetZoek('vacature', event.target.value === 'alle' ? null : event.target.value)
          }
          aria-label="Filter op vacature"
          className="tik w-full rounded-xl border border-lijn bg-white px-3 text-sm"
        >
          <option value="alle">Alle vacatures</option>
          {actieveVacatures.map((vacature) => (
            <option key={vacature.id} value={vacature.id}>
              {vacature.Titel}
            </option>
          ))}
        </select>
      </div>

      {teLang.length > 0 && (
        <Link
          to={linkNaarStage(NORM)}
          className="tik mt-4 flex items-center gap-3 rounded-2xl border border-oranje bg-oranje/10 px-4 py-3"
        >
          <span className="flex-1 font-semibold text-oranje">Over de norm</span>
          <span className="text-2xl font-semibold tabular-nums text-oranje">{teLang.length}</span>
          <span aria-hidden className="text-oranje">
            ›
          </span>
        </Link>
      )}

      <h2 className="mt-6 mb-2 font-semibold">Per stage</h2>
      {tellingen.length === 0 ? (
        <p className="mt-8 text-center text-navy-400">Nog geen actieve aanmeldingen.</p>
      ) : (
        <StageTegels tellingen={tellingen} hrefVoor={linkNaarStage} />
      )}
    </div>
  )
}
