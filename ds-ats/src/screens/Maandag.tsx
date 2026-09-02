import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import { AuthFout } from '../lib/api'
import { actieveRegels, bronVan, opUrgentie } from '../lib/metrics'
import { FUNNEL_STAGES, dagenTussen } from '../../shared/stages.mjs'
import type { StageId } from '../../shared/stages.mjs'
import AanmeldingKaart from '../components/AanmeldingKaart'
import StageBadge from '../components/StageBadge'
import StageTegels, { type StageTelling } from '../components/StageTegels'
import StageSheet from '../components/StageSheet'
import { FilterTerug } from '../components/Terug'
import type { Regel } from '../lib/types'

/** Pseudo-stage in de URL: alles wat de servicenorm overschrijdt, ongeacht stage. */
const NORM = 'norm'

/**
 * Sinds wanneer een aanmelding meetelt, in dagen terug vanaf vandaag.
 * `null` is alles.
 *
 * Dit filtert op `Datum aangemaakt` van de aanmelding, niet van de kandidaat:
 * iemand die al een jaar in de base staat maar vandaag pas aan deze vacature is
 * gekoppeld, is voor deze opdracht wel degelijk nieuw.
 */
const PERIODES = [
  { dagen: null, label: 'Alles' },
  { dagen: 0, label: 'Vandaag' },
  { dagen: 7, label: '7 dagen' },
  { dagen: 30, label: '30 dagen' },
] as const

/**
 * Scherm 1, template 2 uit het playbook. Het beginscherm toont de tellingen per
 * stage; pas na doorklikken krijg je de kandidaten van één stage te zien.
 *
 * De keuze staat in de URL (`?stage=Benaderd`, `?vacature=rec…`), zodat de
 * terugknop werkt en een weergave deelbaar is.
 */
export default function Maandag() {
  const { regels, data, wijzigStage } = useAts()
  // De datum van de server, niet van de telefoon. Een toestel met een verkeerd
  // ingestelde klok zou anders een andere selectie "nieuw" noemen dan de base.
  const vandaag = data?.vandaag ?? ''
  const [zoek, setZoek] = useSearchParams()
  const [sheetVoor, setSheetVoor] = useState<Regel | null>(null)
  /*
    Selectiemodus. Na een outreach-ronde staan er veertien mensen op Benaderd
    die allemaal dezelfde kant op moeten; die stuk voor stuk aantikken is waarom
    het in de praktijk achteraf in Airtable werd rechtgezet.
  */
  const [selectieAan, setSelectieAan] = useState(false)
  const [gekozen, setGekozen] = useState<Set<string>>(new Set())
  const [groepSheet, setGroepSheet] = useState(false)
  const [voortgang, setVoortgang] = useState<string | null>(null)

  const klantFilter = zoek.get('klant') ?? 'alle'
  const vacatureFilter = zoek.get('vacature') ?? 'alle'
  // `?bron=` komt van het bronscherm: daar was een getal een doodlopend eind.
  // Het werkt als klant en vacature — een filter op de scope, in de URL, dus
  // deelbaar en met een werkende terugknop.
  const bronFilter = zoek.get('bron')
  // `?sinds=7` — alleen wat in de laatste zeven dagen is toegevoegd. Na elke
  // nieuwe importronde is dit hoe je ziet wat erbij is gekomen zonder de hele
  // lijst opnieuw door te lopen.
  const sindsRuw = zoek.get('sinds')
  const sindsFilter = sindsRuw === null ? null : Number(sindsRuw)
  const stage = zoek.get('stage')

  const zetZoek = (sleutel: string, waarde: string | null) => {
    const volgende = new URLSearchParams(zoek)
    if (waarde === null) volgende.delete(sleutel)
    else volgende.set(sleutel, waarde)
    setZoek(volgende)
  }

  /** Alles wat op dit scherm hoort: actief, binnen de gekozen klant en vacature. */
  const inScope = useMemo(() => {
    let actief = actieveRegels(regels)
    if (klantFilter !== 'alle') {
      actief = actief.filter((r) => r.vacature?.Opdrachtgever?.[0] === klantFilter)
    }
    if (vacatureFilter !== 'alle') {
      actief = actief.filter((r) => r.vacature?.id === vacatureFilter)
    }
    if (bronFilter) {
      actief = actief.filter((r) => bronVan(r) === bronFilter)
    }
    if (sindsFilter !== null && Number.isFinite(sindsFilter)) {
      actief = actief.filter((r) => {
        const oud = dagenTussen(r.aanmelding['Datum aangemaakt'], vandaag)
        // Zonder datum weet je niet of het nieuw is. Die aanmeldingen vallen
        // buiten het filter in plaats van erin: een lijst "nieuw sinds vandaag"
        // die stiekem ook datumloze regels toont, is geen antwoord op de vraag.
        return oud !== null && oud <= sindsFilter
      })
    }
    return actief
  }, [regels, klantFilter, vacatureFilter, bronFilter, sindsFilter, vandaag])

  const teLang = useMemo(() => inScope.filter((r) => r.overschreden), [inScope])

  /*
    Een andere stage of een ander filter betekent andere kaarten. Een selectie
    die dat overleeft, verwijst naar rijen die niet meer op het scherm staan, en
    "Verplaats naar" zou dan mensen raken die je niet ziet.
  */
  useEffect(() => {
    setSelectieAan(false)
    setGekozen(new Set())
  }, [stage, klantFilter, vacatureFilter, bronFilter, sindsFilter])

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

  /** Wat er op het beginscherm onder de tellingen staat, in dezelfde volgorde. */
  const werklijst = useMemo(() => [...teLang].sort(opUrgentie), [teLang])

  const lijst = useMemo(() => {
    if (!stage) return []
    const selectie = stage === NORM ? teLang : inScope.filter((r) => r.aanmelding.Stage === stage)
    return [...selectie].sort(opUrgentie)
  }, [stage, inScope, teLang])

  const alleActieveVacatures = (data?.vacatures ?? []).filter(
    (v) => v.Status === 'Actief' || v.Status === 'Intake',
  )
  const actieveVacatures =
    klantFilter === 'alle'
      ? alleActieveVacatures
      : alleActieveVacatures.filter((v) => v.Opdrachtgever?.[0] === klantFilter)

  // Wie via het bronscherm binnenkomt neemt de vacaturekeuze van dáár mee, en
  // die lijst kent ook gesloten vacatures. Staat die keuze niet in de lijst,
  // dan toont de keuzelijst niets terwijl er wel op gefilterd wordt.
  const gekozenVacature = (data?.vacatures ?? []).find((v) => v.id === vacatureFilter)
  const vacatureOpties =
    gekozenVacature && !actieveVacatures.some((v) => v.id === gekozenVacature.id)
      ? [gekozenVacature, ...actieveVacatures]
      : actieveVacatures

  // Alleen klanten met werk in de trechter; een lege naam in een keuzelijst
  // kost een tik en levert een leeg scherm op.
  const klanten = (data?.opdrachtgevers ?? []).filter((o) =>
    alleActieveVacatures.some((v) => v.Opdrachtgever?.[0] === o.id),
  )
  const klantNaam =
    klantFilter === 'alle' ? null : (klanten.find((o) => o.id === klantFilter)?.Naam ?? null)
  const vacatureNaam = vacatureFilter === 'alle' ? null : (gekozenVacature?.Titel ?? null)
  // In de doorgeklikte lijst staan de keuzelijsten niet meer op het scherm.
  // Zonder deze regel zie je een korter lijstje en weet je niet waarom.
  const periodeNaam =
    sindsFilter === null
      ? null
      : sindsFilter === 0
        ? 'vandaag toegevoegd'
        : `toegevoegd in ${sindsFilter} dagen`

  const linkNaarStage = (s: string) => {
    const volgende = new URLSearchParams(zoek)
    volgende.set('stage', s)
    return `/?${volgende.toString()}`
  }

  const zetSelectie = (id: string) =>
    setGekozen((huidig) => {
      const volgende = new Set(huidig)
      if (volgende.has(id)) volgende.delete(id)
      else volgende.add(id)
      return volgende
    })

  /**
   * De groepsverplaatsing. Eén voor één en niet parallel: Airtable knijpt op
   * vijf verzoeken per seconde, en veertien tegelijk levert daar een handvol
   * mislukte wijzigingen op zonder dat je ziet welke.
   *
   * Faalt er een, dan gaat de rest wél door. Halverwege stoppen laat de lijst
   * achter in een toestand die niemand kan overzien; nu is de uitkomst altijd
   * "deze zijn verplaatst, deze niet, en die staan nog aangevinkt".
   */
  async function verplaatsGroep(naar: StageId, reden?: string) {
    const rijen = lijst.filter((r) => gekozen.has(r.aanmelding.id))
    const mislukt: Regel[] = []

    try {
      for (const [index, regel] of rijen.entries()) {
        setVoortgang(`${index + 1} van ${rijen.length}`)
        try {
          await wijzigStage(regel.aanmelding.id, naar, { redenAfvallen: reden })
        } catch (error) {
          // Een verlopen sessie treft niet deze ene aanmelding maar alle
          // volgende. Doorgaan levert dertien keer dezelfde fout op en zou hem
          // hier melden als "deze kandidaten zijn niet gelukt", terwijl het
          // inlogscherm het echte antwoord is.
          if (error instanceof AuthFout) throw error
          mislukt.push(regel)
        }
      }
    } finally {
      setVoortgang(null)
    }

    if (mislukt.length > 0) {
      const namen = mislukt.map((r) => r.kandidaat?.Naam ?? 'kandidaat zonder naam').join(', ')
      setGekozen(new Set(mislukt.map((r) => r.aanmelding.id)))
      throw new Error(
        `${mislukt.length} van de ${rijen.length} niet gelukt: ${namen}. Ze staan nog geselecteerd, dus je kunt het opnieuw proberen.`,
      )
    }

    setSelectieAan(false)
    setGekozen(new Set())
  }

  /*
    Dezelfde bottom sheet op allebei de schermen: het beginscherm toont nu ook
    kaarten, en die moeten net zo goed te verplaatsen zijn als in de
    doorgeklikte lijst.
  */
  const kandidaatSheet = (
    <StageSheet
      open={sheetVoor !== null}
      huidigeStage={sheetVoor?.aanmelding.Stage}
      naam={sheetVoor?.kandidaat?.Naam ?? ''}
      onSluit={() => setSheetVoor(null)}
      onKies={async (naar, reden) => {
        if (sheetVoor) await wijzigStage(sheetVoor.aanmelding.id, naar, { redenAfvallen: reden })
      }}
    />
  )

  // ── Doorgeklikt: de kandidaten van één stage ────────────────────────────────
  if (stage) {
    return (
      <div>
        <FilterTerug onWis={() => zetZoek('stage', null)} />

        <div className="mt-1 flex items-center gap-3">
          {stage === NORM ? (
            <h1 className="text-2xl font-semibold text-oranje">Over de norm</h1>
          ) : (
            <StageBadge stage={stage as StageId} />
          )}
          <span className="text-2xl font-semibold tabular-nums">{lijst.length}</span>
          {lijst.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (selectieAan) setGekozen(new Set(lijst.map((r) => r.aanmelding.id)))
                else setSelectieAan(true)
              }}
              className="tik ml-auto shrink-0 rounded-xl border border-lijn bg-white px-3 text-sm"
            >
              {selectieAan ? 'Alles selecteren' : 'Selecteren'}
            </button>
          )}
        </div>
        {(klantNaam || vacatureNaam || bronFilter || periodeNaam) && (
          <p className="text-sm text-navy-400">
            {[klantNaam, vacatureNaam, bronFilter && `via ${bronFilter}`, periodeNaam]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {lijst.map((regel) => (
            <AanmeldingKaart
              key={regel.aanmelding.id}
              regel={regel}
              // Deze lijst is één stage, op "Over de norm" na: daar staat de kop
              // al boven het scherm en zou elke kaart dezelfde badge dragen.
              toonStage={stage === NORM}
              onStage={() => setSheetVoor(regel)}
              onVolgende={(naar, reden) =>
                wijzigStage(regel.aanmelding.id, naar, { redenAfvallen: reden })
              }
              selecteerbaar={selectieAan}
              gekozen={gekozen.has(regel.aanmelding.id)}
              onKiesSelectie={() => zetSelectie(regel.aanmelding.id)}
            />
          ))}
          {lijst.length === 0 && <p className="mt-4 text-navy-400">Niemand in deze weergave.</p>}
        </div>

        {/* Ruimte onder de laatste kaart, zodat de actiebalk hem niet afdekt. */}
        {selectieAan && <div aria-hidden className="h-16" />}

        {selectieAan && (
          /*
            Boven de tabbalk en niet erover: die vier tabs blijven bereikbaar,
            en de duim komt hier toch al langs. 2,75rem is de hoogte van de
            tabbalk zelf (`tik`), de veilige zone van de telefoon komt daar
            bovenop. Dezelfde vorm als de foutbanner in App.tsx, inclusief de
            `0px`-fallback: zonder die fallback laat een browser zonder env()
            de hele calc vallen, en dan zweeft de balk ergens midden op de
            pagina in plaats van onderaan.
          */
          <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+2.75rem)] z-40 border-t border-lijn bg-white px-4 py-2">
            <div className="mx-auto flex max-w-2xl items-center gap-2">
              <span className="text-sm font-medium tabular-nums">{gekozen.size} geselecteerd</span>
              <button
                type="button"
                disabled={gekozen.size === 0}
                onClick={() => setGroepSheet(true)}
                className="tik ml-auto shrink-0 rounded-xl bg-navy px-4 text-sm font-medium text-cream disabled:opacity-40"
              >
                Verplaats naar
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectieAan(false)
                  setGekozen(new Set())
                }}
                className="tik shrink-0 rounded-xl border border-lijn px-4 text-sm text-navy-400"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}

        {kandidaatSheet}

        {/*
          Hetzelfde paneel, dezelfde stagelijst, dezelfde redenlijst. Geen
          huidige stage: een selectie kan uit meerdere stages komen, en dan valt
          er niets uit te grijzen.
        */}
        <StageSheet
          open={groepSheet}
          naam={`${gekozen.size} ${gekozen.size === 1 ? 'kandidaat' : 'kandidaten'}`}
          voortgang={voortgang}
          onSluit={() => setGroepSheet(false)}
          onKies={(naar, reden) => verplaatsGroep(naar, reden)}
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
        {klantNaam && ` · ${klantNaam}`}
      </p>

      {/*
        De klant en de vacature hebben een keuzelijst; de bron komt van buiten,
        via een link op het bronscherm. Zonder deze knop is hij alleen kwijt te
        raken met de terugknop van de browser, en dan blijf je je afvragen
        waarom de aantallen lager zijn dan je gewend bent.
      */}
      {bronFilter && (
        <button
          type="button"
          onClick={() => zetZoek('bron', null)}
          className="tik mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-lijn bg-white px-3 text-sm"
        >
          <span className="min-w-0 truncate">
            Bron: <span className="font-medium">{bronFilter}</span>
          </span>
          <span aria-hidden className="text-navy-400">
            ✕
          </span>
          <span className="sr-only">bronfilter wissen</span>
        </button>
      )}

      <div className="sticky top-[57px] z-20 -mx-4 mt-3 flex gap-2 border-b border-lijn bg-cream/95 px-4 py-2 backdrop-blur">
        <select
          value={klantFilter}
          onChange={(event) => {
            // Een vacature van klant A hoort niet te blijven staan als je naar
            // klant B springt; dat levert een leeg scherm zonder uitleg op.
            const volgende = new URLSearchParams(zoek)
            volgende.delete('vacature')
            if (event.target.value === 'alle') volgende.delete('klant')
            else volgende.set('klant', event.target.value)
            setZoek(volgende)
          }}
          aria-label="Filter op opdrachtgever"
          className="tik min-w-0 flex-1 rounded-xl border border-lijn bg-white px-3 text-sm"
        >
          <option value="alle">Alle klanten</option>
          {klanten.map((klant) => (
            <option key={klant.id} value={klant.id}>
              {klant.Naam}
            </option>
          ))}
        </select>
        <select
          value={vacatureFilter}
          onChange={(event) =>
            zetZoek('vacature', event.target.value === 'alle' ? null : event.target.value)
          }
          aria-label="Filter op vacature"
          className="tik min-w-0 flex-1 rounded-xl border border-lijn bg-white px-3 text-sm"
        >
          <option value="alle">Alle vacatures</option>
          {vacatureOpties.map((vacature) => (
            <option key={vacature.id} value={vacature.id}>
              {vacature.Titel}
            </option>
          ))}
        </select>
      </div>

      {/*
        Chips en geen derde keuzelijst: op 390px houden drie selects naast elkaar
        elk zo'n 120px over, en dan past geen enkel label er nog in. Vier chips
        op een rij zijn bovendien in één tik te wisselen, en je ziet zonder open
        te klappen welke aan staat.
      */}
      <div
        role="group"
        aria-label="Filter op wanneer de aanmelding is toegevoegd"
        className="mt-2 flex gap-2 overflow-x-auto"
      >
        {PERIODES.map((periode) => {
          const aan = sindsFilter === periode.dagen || (periode.dagen === null && sindsRuw === null)
          return (
            <button
              key={periode.label}
              type="button"
              aria-pressed={aan}
              onClick={() => zetZoek('sinds', periode.dagen === null ? null : String(periode.dagen))}
              className={`tik shrink-0 rounded-full border px-3 text-sm ${
                aan ? 'border-oranje bg-oranje/10 font-medium text-oranje' : 'border-lijn bg-white'
              }`}
            >
              {periode.label}
            </button>
          )
        })}
      </div>

      <h2 className="mt-6 mb-2 font-semibold">Per stage</h2>
      {tellingen.length === 0 ? (
        <p className="mt-8 text-center text-navy-400">Nog geen actieve aanmeldingen.</p>
      ) : (
        <StageTegels tellingen={tellingen} hrefVoor={linkNaarStage} />
      )}

      {/*
        De werklijst zelf, direct onder de tellingen. Je landde hier op cijfers
        en moest altijd eerst een stage of "Over de norm" aantikken voordat er
        iemand in beeld kwam die je kon bijwerken. Nu staat de eerste kandidaat
        er al, met de knop van de standaardactie eronder.

        Dezelfde volgorde als de doorgeklikte lijst, want het is dezelfde
        selectie door dezelfde sortering: het langst over de norm bovenaan.
      */}
      {tellingen.length > 0 && (
        <section className="mt-6">
          {teLang.length === 0 ? (
            <>
              <h2 className="mb-2 font-semibold">Over de norm</h2>
              <p className="text-navy-400">Niemand over de norm.</p>
            </>
          ) : (
            <>
              {/*
                De oranje balk stond hierboven als losse doorverwijzing en zou
                naast een kop "Over de norm" twee keer hetzelfde zeggen. Hij is
                nu de kop van zijn eigen lijst: hetzelfde getal, dezelfde link
                naar ?stage=norm (waar selecteren zit), maar direct boven de
                kaarten waar hij over gaat.
              */}
              <Link
                to={linkNaarStage(NORM)}
                className="tik flex items-center gap-3 rounded-2xl border border-oranje bg-oranje/10 px-4 py-3"
              >
                <span className="flex-1 font-semibold text-oranje">Over de norm</span>
                <span className="text-2xl font-semibold tabular-nums text-oranje">{teLang.length}</span>
                <span aria-hidden className="text-oranje">
                  ›
                </span>
              </Link>
              <div className="mt-2 flex flex-col gap-2">
                {werklijst.map((regel) => (
                  <AanmeldingKaart
                    key={regel.aanmelding.id}
                    regel={regel}
                    onStage={() => setSheetVoor(regel)}
                    onVolgende={(naar, redenAfvallen) =>
                      wijzigStage(regel.aanmelding.id, naar, { redenAfvallen })
                    }
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {kandidaatSheet}
    </div>
  )
}
