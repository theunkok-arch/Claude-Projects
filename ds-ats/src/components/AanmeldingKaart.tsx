import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
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
}

export default function AanmeldingKaart({
  regel,
  toonStage = true,
  toonVacature = true,
  onStage,
}: Props) {
  const { aanmelding, kandidaat, vacature, opdrachtgever, dagenInStage, overschreden, standaardActie } =
    regel
  const herkomst = useHerkomst()
  const opvallend = (dagenInStage ?? 0) > RANDGRENS_DAGEN
  const score = aanmelding['Score totaal']
  const kern = toonVacature ? null : scoringKern(aanmelding['Score-onderbouwing'])

  /*
    Een kaart zonder kandidaat linkte naar `/kandidaat/` en dus naar "Pagina
    niet gevonden", terwijl er "Onbekende kandidaat" op stond. Zonder doel geen
    link: dezelfde kaart, maar hij belooft niets meer.
  */
  const kop = (inhoud: ReactNode) =>
    kandidaat ? (
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

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        opvallend ? 'border-oranje' : 'border-lijn'
      }`}
    >
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
          <StageBadge stage={aanmelding.Stage} klein onClick={onStage} />
        ) : (
          onStage && (
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
