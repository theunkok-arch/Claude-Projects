import { useMemo, useState } from 'react'
import { useAts } from '../store/AtsProvider'
import { aantalPerStage, actieveRegels, groepeerPerStage, opUrgentie } from '../lib/metrics'
import { FUNNEL_STAGES } from '../../shared/stages.mjs'
import type { StageId } from '../../shared/stages.mjs'
import AanmeldingKaart from '../components/AanmeldingKaart'
import StageBadge from '../components/StageBadge'
import StageFilter from '../components/StageFilter'
import StageSheet from '../components/StageSheet'
import type { Regel } from '../lib/types'

/**
 * Scherm 1, template 2 uit het playbook. Per stage de actieve kandidaten met
 * dagen in stage en volgende actie. Dit moet in dertig seconden te lezen zijn,
 * dus staat wat de norm overschrijdt bovenaan.
 */
export default function Maandag() {
  const { regels, data, wijzigStage } = useAts()
  const [vacatureFilter, setVacatureFilter] = useState('alle')
  const [stageFilter, setStageFilter] = useState<string>('alle')
  const [alleen, setAlleen] = useState(false)
  const [sheetVoor, setSheetVoor] = useState<Regel | null>(null)

  /** Alles wat op dit scherm hoort: actief, en binnen de gekozen vacature. */
  const inScope = useMemo(() => {
    const actief = actieveRegels(regels)
    return vacatureFilter === 'alle'
      ? actief
      : actief.filter((r) => r.vacature?.id === vacatureFilter)
  }, [regels, vacatureFilter])

  // De aantallen in het stagefilter volgen de vacaturekeuze, niet andersom.
  // Stages zonder kandidaten laten we weg: een leeg filter is een dood spoor.
  const stageOpties = useMemo(() => {
    const perStage = aantalPerStage(inScope)
    return [
      { waarde: 'alle', label: 'Alle stages', aantal: inScope.length },
      ...(FUNNEL_STAGES as StageId[])
        .filter((stage) => (perStage.get(stage) ?? 0) > 0)
        .map((stage) => ({ waarde: stage, label: stage, aantal: perStage.get(stage) ?? 0 })),
    ]
  }, [inScope])

  const zichtbaar = useMemo(() => {
    let selectie = inScope
    if (stageFilter !== 'alle') selectie = selectie.filter((r) => r.aanmelding.Stage === stageFilter)
    if (alleen) selectie = selectie.filter((r) => r.overschreden)
    return selectie
  }, [inScope, stageFilter, alleen])

  const groepen = useMemo(() => groepeerPerStage(zichtbaar), [zichtbaar])
  const teLang = useMemo(() => actieveRegels(regels).filter((r) => r.overschreden), [regels])
  const actieveVacatures = (data?.vacatures ?? []).filter((v) => v.Status === 'Actief' || v.Status === 'Intake')

  const gefilterd = vacatureFilter !== 'alle' || stageFilter !== 'alle' || alleen

  return (
    <div>
      <h1 className="text-2xl font-semibold">Maandagoverzicht</h1>
      <p className="mt-1 text-sm text-navy-400">
        {zichtbaar.length} actief · {teLang.length} over de norm
      </p>

      <div className="sticky top-[57px] z-20 -mx-4 mt-3 border-b border-lijn bg-cream/95 px-4 py-2 backdrop-blur">
        <div className="flex gap-2">
          <select
            value={vacatureFilter}
            onChange={(event) => setVacatureFilter(event.target.value)}
            aria-label="Filter op vacature"
            className="tik min-w-0 flex-1 rounded-xl border border-lijn bg-white px-3 text-sm"
          >
            <option value="alle">Alle vacatures</option>
            {actieveVacatures.map((vacature) => (
              <option key={vacature.id} value={vacature.id}>
                {vacature.Titel}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setAlleen((huidig) => !huidig)}
            className={`tik shrink-0 rounded-xl border px-3 text-sm font-medium ${
              alleen ? 'border-oranje bg-oranje text-white' : 'border-lijn bg-white text-navy-400'
            }`}
          >
            Over de norm
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          <StageFilter waarde={stageFilter} onKies={setStageFilter} opties={stageOpties} />
          {gefilterd && (
            <button
              type="button"
              onClick={() => {
                setVacatureFilter('alle')
                setStageFilter('alle')
                setAlleen(false)
              }}
              className="tik shrink-0 rounded-xl border border-lijn bg-white px-3 text-sm text-navy-400"
            >
              Wis
            </button>
          )}
        </div>
      </div>

      {groepen.length === 0 ? (
        <p className="mt-8 text-center text-navy-400">
          {alleen ? 'Niets staat te lang stil. Mooie week.' : 'Nog geen actieve aanmeldingen.'}
        </p>
      ) : (
        groepen.map((groep) => (
          <section key={groep.stage} className="mt-6">
            <div className="mb-2 flex items-center gap-2">
              <StageBadge stage={groep.stage} klein />
              <span className="text-sm text-navy-400">{groep.regels.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {groep.regels.sort(opUrgentie).map((regel) => (
                <AanmeldingKaart
                  key={regel.aanmelding.id}
                  regel={regel}
                  toonVacature={vacatureFilter === 'alle'}
                  onStage={() => setSheetVoor(regel)}
                />
              ))}
            </div>
          </section>
        ))
      )}

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
