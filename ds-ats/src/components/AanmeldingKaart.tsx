import { Link } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { stageConfig } from '../../shared/stages.mjs'
import type { StageId } from '../../shared/stages.mjs'
import type { Regel } from '../lib/types'
import { dagen, scoringKern } from '../lib/format'
import { useHerkomst } from '../lib/herkomst'
import StageBadge from './StageBadge'

/** Boven de tien dagen krijgt de kaart een oranje rand. Dat is het signaal. */
const RANDGRENS_DAGEN = 10

interface Props {
  regel: Regel
  /**
   * Uit op een lijst die al op één stage filtert: daar draagt de badge geen
   * informatie meer, terwijl hij wel de opvallendste kleur op het scherm is.
   */
  toonStage?: boolean
  /**
   * Uit op een lijst die al op één vacature filtert. Dezelfde afweging als
   * hierboven: daar herhaalt "vacature · opdrachtgever" alleen de kop, en die
   * regel is beter besteed aan waaróm deze kandidaat op de lijst staat. Op het
   * maandagoverzicht staat hij wel aan — daar lopen alle vacatures door elkaar
   * en is het het enige dat de kaarten uit elkaar houdt.
   */
  toonVacature?: boolean
  onStage?: () => void
  /**
   * Selectiemodus. De kaart is dan geen doorgang meer naar de kandidaat maar
   * een vinkje: de hele kaart is het raakvlak, de naam linkt niet en de
   * stage-chip doet niets. Dat laatste is geen detail. Wie een rij aantikt om
   * hem aan te vinken en per ongeluk de chip raakt, zou anders midden in een
   * selectie een losse kandidaat verplaatsen.
   */
  selecteerbaar?: boolean
  gekozen?: boolean
  onKiesSelectie?: () => void
  /**
   * De standaardstap vooruit, in één tik. Ontbreekt hij, dan blijft de kaart
   * zoals hij was en loopt elke wijziging via de stage-chip.
   */
  onVolgende?: (naar: StageId, reden?: string) => Promise<void>
}

export default function AanmeldingKaart({
  regel,
  toonStage = true,
  toonVacature = true,
  onStage,
  selecteerbaar = false,
  gekozen = false,
  onKiesSelectie,
  onVolgende,
}: Props) {
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const { aanmelding, kandidaat, vacature, opdrachtgever, dagenInStage, overschreden } = regel
  const herkomst = useHerkomst()
  const opvallend = (dagenInStage ?? 0) > RANDGRENS_DAGEN
  const score = aanmelding['Score totaal']
  const kern = toonVacature ? null : scoringKern(aanmelding['Score-onderbouwing'])

  /*
    De standaardstap uit shared/stages.mjs. In selectiemodus niet: daar is de
    hele kaart één vinkje, en een knop erin zou dat vinkje omzeilen.
  */
  const config = stageConfig(aanmelding.Stage)
  const volgende = !selecteerbaar && onVolgende && config?.volgendeStage ? config : null

  async function zetVolgende() {
    if (!volgende?.volgendeStage || !onVolgende) return
    setBezig(true)
    setFout(null)
    try {
      await onVolgende(volgende.volgendeStage, volgende.volgendeReden)
    } catch (error) {
      // De kaart blijft staan met de melding eronder. Een mislukking die alleen
      // in een banner verschijnt raak je op een lijst van zestig kaarten kwijt,
      // en dan denk je dat de stap gelukt is.
      setFout(error instanceof Error ? error.message : 'Verplaatsen mislukt.')
      setBezig(false)
    }
  }

  /*
    Een kaart zonder kandidaat linkte naar `/kandidaat/` en dus naar "Pagina
    niet gevonden", terwijl er "Onbekende kandidaat" op stond. Zonder doel geen
    link: dezelfde kaart, maar hij belooft niets meer.
  */
  const kop = (inhoud: ReactNode) =>
    kandidaat && !selecteerbaar ? (
      <Link
        to={`/kandidaat/${kandidaat.id}`}
        state={herkomst}
        className="min-w-0 flex-1"
        aria-label={`Open ${kandidaat.Naam ?? 'kandidaat'}`}
      >
        {inhoud}
      </Link>
    ) : (
      <div className="min-w-0 flex-1">{inhoud}</div>
    )

  const binnenkant = (
    <>
      <div className="flex items-start justify-between gap-3">
        {kop(
          <>
            <p className="truncate font-semibold">{kandidaat?.Naam ?? 'Onbekende kandidaat'}</p>
            <p className="truncate text-sm text-navy-400">
              {[kandidaat?.['Huidige rol'], kandidaat?.['Huidige werkgever']].filter(Boolean).join(' · ') ||
                'Rol onbekend'}
            </p>
            {/*
              Waar de aanmelding bij hoort, of — op een lijst die daar al op
              filtert — de kern van de score-onderbouwing. De klantnaam hangt
              achter de vacaturetitel in plaats van bovenaan te staan, want hij
              is context, geen kop. Twee regels ruimte: acht woorden passen op
              390px niet altijd op één.
            */}
            {toonVacature ? (
              <p className="mt-0.5 truncate text-xs text-navy-400">
                {[vacature?.Titel, opdrachtgever?.Naam].filter(Boolean).join(' · ') || 'Geen vacature'}
              </p>
            ) : (
              kern && <p className="mt-0.5 line-clamp-2 text-xs text-navy-400">{kern}</p>
            )}
          </>,
        )}
        {toonStage ? (
          <StageBadge stage={aanmelding.Stage} klein onClick={selecteerbaar ? undefined : onStage} />
        ) : (
          onStage &&
          !selecteerbaar && (
            /*
              De badge is tegelijk de knop naar de bottom sheet. Staat hij uit, dan
              blijft die functie hier als grijze tekstknop staan: hetzelfde raakvlak
              en dezelfde twee taps, zonder de kleur te herhalen die op zo'n lijst
              voor elke kaart gelijk is.
            */
            <button
              type="button"
              onClick={onStage}
              aria-label={`Verplaats ${kandidaat?.Naam ?? 'kandidaat'} naar een andere stage`}
              className="tik -my-2 -mr-2 flex shrink-0 items-center justify-center gap-1 rounded-xl px-2 text-sm text-navy-400"
            >
              Verplaats
              <span aria-hidden className="opacity-60">
                ▾
              </span>
            </button>
          )
        )}
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
        {/*
          De score is de sleutel waarop de lijst na urgentie geordend is. Daarom
          rechts uitgelijnd en in tabelcijfers: zo vormt hij over de kaarten heen
          één kolom die je van boven naar beneden afleest.
        */}
        {typeof score === 'number' && (
          <span className="ml-auto shrink-0 tabular-nums">
            <span className="text-base font-semibold">{score}</span>
            <span className="text-xs text-navy-400">/100</span>
          </span>
        )}
      </div>

      {/*
        Wat de recruiter er zelf bij heeft getypt. Dat is een notitie ("bellen na
        drie uur"), geen stap in de pijplijn, dus die blijft tekst. De
        standaardactie eronder was wél altijd dezelfde stap, en is daarom een
        knop geworden.
      */}
      {aanmelding['Volgende actie'] && (
        <p className="mt-2 border-t border-lijn pt-2 text-sm">
          <span className="text-navy-400">Volgende actie: </span>
          {aanmelding['Volgende actie']}
        </p>
      )}

      {volgende && (
        <button
          type="button"
          disabled={bezig}
          onClick={() => void zetVolgende()}
          /*
            Afvallen krijgt een eigen kleur. De andere knoppen zetten iemand een
            trede verder en zijn met de chip terug te draaien; deze zet iemand
            uit de running, en er is bewust geen ongedaan maken. Dan hoort hij
            er niet uit te zien als de rest.
          */
          className={`tik mt-3 w-full rounded-xl border px-3 text-sm font-medium disabled:opacity-50 ${
            volgende.volgendeStage === 'Afgevallen'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-navy/15 bg-cream'
          }`}
        >
          {bezig ? 'Bezig…' : volgende.volgendeLabel}
        </button>
      )}

      {fout && <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-sm text-red-700">{fout}</p>}

      {aanmelding.Stage === 'Afgevallen' && !aanmelding['Reden afvallen'] && (
        <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-sm text-red-700">Reden ontbreekt</p>
      )}
    </>
  )

  const rand = opvallend ? 'border-oranje' : 'border-lijn'

  /*
    In selectiemodus is de kaart één groot label om een echt selectievakje heen.
    Dat is met opzet geen div met een klikafhandelaar: een label geeft de hele
    kaart als raakvlak, het toetsenbord en de schermlezer krijgen een vinkje dat
    ze kennen, en de aan/uit-stand hoeft nergens te worden nagebouwd.
  */
  if (selecteerbaar) {
    return (
      <label
        className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm ${
          gekozen ? 'border-navy ring-1 ring-navy' : rand
        }`}
      >
        <input
          type="checkbox"
          checked={gekozen}
          onChange={() => onKiesSelectie?.()}
          className="mt-0.5 h-6 w-6 shrink-0 accent-navy"
          aria-label={`Selecteer ${kandidaat?.Naam ?? 'kandidaat'}`}
        />
        <div className="min-w-0 flex-1">{binnenkant}</div>
      </label>
    )
  }

  return <article className={`rounded-2xl border bg-white p-4 shadow-sm ${rand}`}>{binnenkant}</article>
}
