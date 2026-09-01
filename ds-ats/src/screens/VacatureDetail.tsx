import { useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import { REDEN_ONTBREEKT, afvalRedenen, funnel, opUrgentie } from '../lib/metrics'
import { band, datum } from '../lib/format'
import { useHerkomst } from '../lib/herkomst'
import { FUNNEL_STAGES } from '../../shared/stages.mjs'
import type { StageId } from '../../shared/stages.mjs'
import AanmeldingKaart from '../components/AanmeldingKaart'
import Funnel from '../components/Funnel'
import StageBadge from '../components/StageBadge'
import StageSheet from '../components/StageSheet'
import Terug, { FilterTerug } from '../components/Terug'
import VacatureFormulier, { aantalLeeg as aantalLeegVacature } from '../components/VacatureFormulier'
import type { Regel } from '../lib/types'
import BewerkKnop from '../components/BewerkKnop'

export default function VacatureDetail() {
  const { id } = useParams()
  const { state } = useLocation()
  const herkomst = useHerkomst()
  const { data, regels, wijzigStage, wijzigVacature } = useAts()
  const [sheetVoor, setSheetVoor] = useState<Regel | null>(null)
  // Bewerken hoort hier en niet op het vacature-overzicht: dit is het scherm
  // waar de salarisband en de streefdatum staan, dus waar je ziet dat er iets
  // ontbreekt.
  const [bewerken, setBewerken] = useState(false)

  // De stagekeuze staat in de URL, zodat een aangeklikte funnel-trede een
  // deelbare link is en de terugknop van de browser gewoon werkt. Geen stage
  // in de URL betekent: toon de cijfers, nog niet de namen.
  const [zoek, setZoek] = useSearchParams()
  const stage = zoek.get('stage')
  // Het sub-filter op afvalreden. Alleen zinnig binnen Afgevallen: rijen in een
  // andere stage hebben per definitie geen reden, dus zouden ze allemaal onder
  // "Reden ontbreekt" vallen en zou dat filter juist de lopende kandidaten
  // opleveren. Vandaar dat kiezen altijd Afgevallen meezet, en dat de lijst
  // hieronder er ook op controleert.
  const reden = stage === 'Afgevallen' ? zoek.get('reden') : null
  const kiesStage = (keuze: string | null) => {
    const volgende = new URLSearchParams(zoek)
    if (keuze === null) volgende.delete('stage')
    else volgende.set('stage', keuze)
    // Een andere trede kiezen laat het sub-filter niet staan: anders krijg je
    // een lijst met een reden in de kop die op niets meer slaat.
    volgende.delete('reden')
    // De herkomst blijft meelopen: het filter wisselen is geen nieuw scherm, en
    // zonder dit zou de terugknop na één filterwissel weer gaan gokken.
    setZoek(volgende, { state })
  }
  const kiesReden = (keuze: string) => {
    const volgende = new URLSearchParams(zoek)
    volgende.set('stage', 'Afgevallen')
    volgende.set('reden', keuze)
    setZoek(volgende, { state })
  }

  const vacature = data?.vacatures.find((v) => v.id === id)
  const eigen = useMemo(() => regels.filter((r) => r.vacature?.id === id), [regels, id])
  const lopend = useMemo(() => eigen.filter((r) => r.aanmelding.Stage !== 'Afgevallen'), [eigen])

  const lijst = useMemo(() => {
    if (!stage) return []
    const opStage =
      stage === 'lopend' ? lopend : stage === 'alles' ? eigen : eigen.filter((r) => r.aanmelding.Stage === stage)
    const selectie = reden
      ? opStage.filter((r) => (r.aanmelding['Reden afvallen'] ?? REDEN_ONTBREEKT) === reden)
      : opStage

    return [...selectie].sort((a, b) => {
      const verschil =
        FUNNEL_STAGES.indexOf(b.aanmelding.Stage as never) -
        FUNNEL_STAGES.indexOf(a.aanmelding.Stage as never)
      return verschil !== 0 ? verschil : opUrgentie(a, b)
    })
  }, [eigen, lopend, stage, reden])

  if (!data) return null
  if (!vacature) return <p className="text-navy-400">Deze vacature bestaat niet (meer).</p>

  const opdrachtgever = data.opdrachtgevers.find((o) => o.id === vacature.Opdrachtgever?.[0])
  const redenen = afvalRedenen(eigen)
  const afgevallen = eigen.length - lopend.length

  // ── Doorgeklikt: de kandidaten van één stage ────────────────────────────────
  if (stage) {
    const kop =
      stage === 'lopend' ? 'Lopend' : stage === 'alles' ? 'Alle kandidaten' : null
    // "Lopend" en "Alles" lopen over meerdere stages heen; daar zegt de badge per
    // kaart iets. Bij één gekozen stage staat hij al in de kop.
    const gemengd = kop !== null

    return (
      <div>
        <FilterTerug onWis={() => kiesStage(null)} />

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          {kop ? (
            <h1 className="text-2xl font-semibold">{kop}</h1>
          ) : (
            <StageBadge stage={stage as StageId} />
          )}
          {/*
            De reden staat naast de badge en niet in de regel eronder: hij is
            hier de kop van de lijst, niet de context erbij. Op 390px valt hij
            desnoods op een eigen regel, vandaar flex-wrap.
          */}
          {reden && (
            <span
              className={`rounded-full border px-2 py-0.5 text-sm ${
                reden === REDEN_ONTBREEKT
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-lijn bg-white'
              }`}
            >
              {reden}
            </span>
          )}
          <span className="text-2xl font-semibold tabular-nums">{lijst.length}</span>
        </div>
        <p className="text-sm text-navy-400">
          {vacature.Titel}
          {opdrachtgever && ` · ${opdrachtgever.Naam}`}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {lijst.map((regel) => (
            <AanmeldingKaart
              key={regel.aanmelding.id}
              regel={regel}
              toonStage={gemengd}
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

  // ── Beginscherm: de cijfers ─────────────────────────────────────────────────
  return (
    <div>
      <Terug naar="/vacatures" label="Vacatures" />
      <h1 className="mt-1 text-2xl font-semibold">{vacature.Titel}</h1>
      {opdrachtgever ? (
        <Link
          to={`/opdrachtgever/${opdrachtgever.id}`}
          state={herkomst}
          className="text-sm text-navy-400 underline"
        >
          {opdrachtgever.Naam}
        </Link>
      ) : (
        <p className="text-sm text-navy-400">Geen opdrachtgever</p>
      )}

      {vacature.Validatie && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{vacature.Validatie}</p>
      )}

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Gegevens</h2>
        <BewerkKnop
          open={bewerken}
          leeg={aantalLeegVacature(vacature)}
          onClick={() => setBewerken((aan) => !aan)}
        />
      </div>

      {bewerken ? (
        <VacatureFormulier
          vacature={vacature}
          onBewaar={(velden) => wijzigVacature(vacature.id, velden)}
          onSluit={() => setBewerken(false)}
        />
      ) : (
      <dl className="mt-2 grid grid-cols-2 gap-y-1 rounded-2xl border border-lijn bg-white p-4 text-sm">
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
        <dt className="text-navy-400">Scoringsdrempel</dt>
        <dd className="text-right">{vacature.Scoringsdrempel ?? '—'}</dd>
      </dl>
      )}

      <section className="mt-5 rounded-2xl border border-lijn bg-cream p-4">
        <h2 className="mb-3 font-semibold">Funnel</h2>
        <Funnel tredes={funnel(eigen)} onKies={kiesStage} />
        <p className="mt-2 text-xs text-navy-400">
          nu in deze stage / ooit tot hier gekomen — tik een trede voor die kandidaten
        </p>
      </section>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => kiesStage('lopend')}
          className="tik flex-1 rounded-xl border border-lijn bg-white px-3 text-sm font-medium"
        >
          Lopend ({lopend.length})
        </button>
        <button
          type="button"
          onClick={() => kiesStage('alles')}
          className="tik flex-1 rounded-xl border border-lijn bg-white px-3 text-sm text-navy-400"
        >
          Alles ({eigen.length})
        </button>
      </div>

      {redenen.length > 0 && (
        <section className="mt-5 rounded-2xl border border-lijn bg-white p-4">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Waarom ze afvielen</h2>
            <button
              type="button"
              onClick={() => kiesStage('Afgevallen')}
              className="tik text-sm text-navy-400 underline"
            >
              {afgevallen} bekijken
            </button>
          </div>
          {/*
            Elke reden is een knop naar precies die afvallers. Een getal waar je
            niet doorheen kunt is een dood eind: je ziet dat er zes op Timing
            afvielen en moet vervolgens de hele lijst Afgevallen doorzoeken om te
            weten wie. De hele regel is het raakvlak, niet alleen het woord.
          */}
          <ul className="flex flex-col text-sm">
            {redenen.map((rij) => (
              <li key={rij.reden}>
                <button
                  type="button"
                  onClick={() => kiesReden(rij.reden)}
                  className="tik flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className={rij.reden === REDEN_ONTBREEKT ? 'text-red-700' : ''}>{rij.reden}</span>
                  <span className="tabular-nums text-navy-400">{rij.aantal}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
