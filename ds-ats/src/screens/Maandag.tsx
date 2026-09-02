import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import { AuthFout } from '../lib/api'
import { actieveRegels, bronVan, opUrgentie } from '../lib/metrics'
import { datumKort } from '../lib/format'
import { FUNNEL_STAGES } from '../../shared/stages.mjs'
import { MAX_PARTIJEN, nieuwstePartij, partijen } from '../../shared/partijen.mjs'
import type { StageId } from '../../shared/stages.mjs'
import AanmeldingKaart from '../components/AanmeldingKaart'
import StageBadge from '../components/StageBadge'
import StageTegels, { type StageTelling } from '../components/StageTegels'
import StageSheet from '../components/StageSheet'
import { FilterTerug } from '../components/Terug'
import type { Regel } from '../lib/types'

/** Pseudo-stage in de URL: alles wat de servicenorm overschrijdt, ongeacht stage. */
const NORM = 'norm'

/** De stage waarop de agents alles afleveren, en dus wat nog beoordeeld moet worden. */
const TE_BEOORDELEN = 'Gescoord'

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
  // `?partij=2026-09-02` — precies de kandidaten die op die dag zijn
  // toegevoegd. De agents leveren in partijen aan, dus dat is de eenheid
  // waarin je ze wilt beoordelen; een venster als "7 dagen" valt daar de
  // ochtend na een run juist naast.
  const partijFilter = zoek.get('partij')
  const stage = zoek.get('stage')

  const zetZoek = (sleutel: string, waarde: string | null) => {
    const volgende = new URLSearchParams(zoek)
    if (waarde === null) volgende.delete(sleutel)
    else volgende.set(sleutel, waarde)
    setZoek(volgende)
  }

  /**
   * Alles wat op dit scherm hoort: actief, binnen de gekozen klant en vacature.
   * De partij zit hier bewust nog niet in. De chips worden hieruit opgebouwd,
   * en zouden ze uit de gefilterde lijst komen, dan bleef er na één tik nog
   * maar één chip over en kon je niet meer terug naar een andere dag.
   */
  const inScopeBreed = useMemo(() => {
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
    return actief
  }, [regels, klantFilter, vacatureFilter, bronFilter])

  /** De dagen waarop er is aangeleverd, nieuwste eerst, met hun aantallen. */
  const partijLijst = useMemo(
    () => partijen(inScopeBreed.map((r) => r.aanmelding)).slice(0, MAX_PARTIJEN),
    [inScopeBreed],
  )

  const inScope = useMemo(
    // Zonder datum weet je niet uit welke partij een aanmelding komt. Die
    // vallen buiten het filter in plaats van erin: een lijst "toegevoegd op 2
    // september" die stiekem ook datumloze regels toont, is geen antwoord op
    // de vraag.
    () =>
      partijFilter
        ? inScopeBreed.filter((r) => r.aanmelding['Datum aangemaakt'] === partijFilter)
        : inScopeBreed,
    [inScopeBreed, partijFilter],
  )

  const teLang = useMemo(() => inScope.filter((r) => r.overschreden), [inScope])

  /**
   * De laatste aanlevering van de agents, en wat daarvan nog op Gescoord staat.
   *
   * Bewust de nieuwste partij en niet alles wat ooit op Gescoord bleef liggen:
   * de vraag is "wat heeft mijn agent net gebracht". Restanten van een oudere
   * dag raak je niet kwijt, die staan onder hun eigen chip hierboven.
   */
  const nieuwsteDag = useMemo(
    () => nieuwstePartij(inScopeBreed.map((r) => r.aanmelding)),
    [inScopeBreed],
  )
  /*
    Zonder chip gaat het over de laatste aanlevering. Staat er wél een chip aan,
    dan volgt deze ingang die: de chip bepaalt het hele scherm, en een teller
    die ondertussen naar een andere dag wijst dan de lijst eronder is geen
    ingang maar een valstrik.
  */
  const beoordeelDag = partijFilter ?? nieuwsteDag
  const nieuwTeBeoordelen = useMemo(
    () =>
      beoordeelDag === null
        ? []
        : inScopeBreed.filter(
            (r) =>
              r.aanmelding.Stage === TE_BEOORDELEN &&
              r.aanmelding['Datum aangemaakt'] === beoordeelDag,
          ),
    [inScopeBreed, beoordeelDag],
  )

  /*
    Een andere stage of een ander filter betekent andere kaarten. Een selectie
    die dat overleeft, verwijst naar rijen die niet meer op het scherm staan, en
    "Verplaats naar" zou dan mensen raken die je niet ziet.
  */
  useEffect(() => {
    setSelectieAan(false)
    setGekozen(new Set())
  }, [stage, klantFilter, vacatureFilter, bronFilter, partijFilter])

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
  const partijNaam = partijFilter ? `toegevoegd op ${datumKort(partijFilter)}` : null

  const linkNaarStage = (s: string) => {
    const volgende = new URLSearchParams(zoek)
    volgende.set('stage', s)
    return `/?${volgende.toString()}`
  }

  /** Stage en partij in één keer, voor de ingang "Nieuw te beoordelen". */
  const linkNaarPartij = (s: string, datum: string) => {
    const volgende = new URLSearchParams(zoek)
    volgende.set('stage', s)
    volgende.set('partij', datum)
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
        {(klantNaam || vacatureNaam || bronFilter || partijNaam) && (
          <p className="text-sm text-navy-400">
            {[klantNaam, vacatureNaam, bronFilter && `via ${bronFilter}`, partijNaam]
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
              {/*
                Drie dingen op 390px. Zonder nowrap en de krappere padding brak
                "5 geselecteerd" over twee regels.
              */}
              <span className="shrink-0 whitespace-nowrap text-sm font-medium tabular-nums">
                {gekozen.size} geselecteerd
              </span>
              <button
                type="button"
                disabled={gekozen.size === 0}
                onClick={() => setGroepSheet(true)}
                className="tik ml-auto shrink-0 rounded-xl bg-navy px-3 text-sm font-medium text-cream disabled:opacity-40"
              >
                Verplaats naar
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectieAan(false)
                  setGekozen(new Set())
                }}
                className="tik shrink-0 rounded-xl border border-lijn px-3 text-sm text-navy-400"
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
      {/*
        Een chip per aanleverdag in plaats van vaste vensters. De agents leveren
        in partijen aan, dus "2 sep · 49" is de eenheid waarin je ze beoordeelt;
        "7 dagen" was de ochtend na een run juist de hele base en "vandaag" nul.
        Het aantal staat op de chip, zodat je voor het tikken al ziet wat je
        krijgt.
      */}
      {partijLijst.length > 1 && (
        <div
          role="group"
          aria-label="Filter op de dag waarop de kandidaten zijn toegevoegd"
          className="mt-2 flex gap-2 overflow-x-auto"
        >
          <button
            type="button"
            aria-pressed={!partijFilter}
            onClick={() => zetZoek('partij', null)}
            className={`tik shrink-0 rounded-full border px-3 text-sm ${
              !partijFilter ? 'border-oranje bg-oranje/10 font-medium text-oranje' : 'border-lijn bg-white'
            }`}
          >
            Alles
          </button>
          {partijLijst.map((partij) => {
            const aan = partijFilter === partij.datum
            return (
              <button
                key={partij.datum}
                type="button"
                aria-pressed={aan}
                // Nog een keer op dezelfde chip zet hem uit. Anders is "terug
                // naar alles" een tik naar de andere kant van de rij.
                onClick={() => zetZoek('partij', aan ? null : partij.datum)}
                className={`tik shrink-0 rounded-full border px-3 text-sm whitespace-nowrap ${
                  aan ? 'border-oranje bg-oranje/10 font-medium text-oranje' : 'border-lijn bg-white'
                }`}
              >
                {datumKort(partij.datum)} · <span className="tabular-nums">{partij.aantal}</span>
              </button>
            )
          })}
        </div>
      )}

      {/*
        De telling van wat te lang stilstaat, met de link naar ?stage=norm waar
        selecteren zit. Hij staat hier en niet bij de lijst verderop: met vijf
        stages duwen de tegels die lijst voorbij het eerste scherm, en dan zou
        het dringendste getal van de app pas na scrollen te zien zijn.
      */}
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

      {/*
        De oogst van de laatste agent-run die nog beoordeeld moet worden. Niet
        oranje: dit is werk van vandaag, geen achterstand, en twee alarmkleuren
        onder elkaar maken allebei minder dringend. De link zet stage én partij,
        zodat het scherm erachter precies deze lijst is en niet alles wat ooit
        op Gescoord bleef staan.
      */}
      {nieuwTeBeoordelen.length > 0 && beoordeelDag && (
        <Link
          to={linkNaarPartij(TE_BEOORDELEN, beoordeelDag)}
          className="tik mt-3 flex items-center gap-3 rounded-2xl border border-navy/30 bg-white px-4 py-3"
        >
          <span className="min-w-0 flex-1">
            {/*
              "Nieuw" alleen als het ook echt de laatste aanlevering is. Kiest
              ze de chip van vijf dagen terug, dan staat er "Te beoordelen":
              dezelfde ingang, maar zonder een partij van vorige week nieuw te
              noemen.
            */}
            <span className="block font-semibold">
              {beoordeelDag === nieuwsteDag ? 'Nieuw te beoordelen' : 'Te beoordelen'}
            </span>
            <span className="block text-sm text-navy-400">
              toegevoegd op {datumKort(beoordeelDag)}
            </span>
          </span>
          <span className="text-2xl font-semibold tabular-nums">{nieuwTeBeoordelen.length}</span>
          <span aria-hidden className="text-navy-400">
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
          <h2 className="mb-2 font-semibold text-oranje">Over de norm</h2>
          {teLang.length === 0 ? (
            <p className="text-navy-400">Niemand over de norm.</p>
          ) : (
            <div className="flex flex-col gap-2">
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
          )}
        </section>
      )}

      {kandidaatSheet}
    </div>
  )
}
