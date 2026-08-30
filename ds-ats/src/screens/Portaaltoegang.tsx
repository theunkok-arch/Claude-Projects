import { useEffect, useRef, useState } from 'react'
import { useAts } from '../store/AtsProvider'
import { api } from '../lib/api'
import { datum } from '../lib/format'
import Terug from '../components/Terug'
import type { Portaalgebruiker } from '../lib/types'

/**
 * Beheer van de klanttoegang tot /klant.
 *
 * Het wachtwoord is het lastige deel van dit scherm. Het bestaat precies één
 * moment: de server genereert het, hasht het, en stuurt de leesbare versie één
 * keer terug. Daarna staat er alleen nog een hash in de base, en die is niet
 * terug te rekenen — ook niet door Dominique, ook niet door mij. Het scherm
 * moet dat dus zeggen op het moment dat het ertoe doet, niet in een
 * hulpteksten-zijstraat achteraf.
 */
export default function Portaaltoegang() {
  const { data } = useAts()
  const [gebruikers, setGebruikers] = useState<Portaalgebruiker[] | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [nieuw, setNieuw] = useState(false)

  /**
   * Het laatst gegenereerde wachtwoord, bovenaan het scherm.
   *
   * Het stond eerst in de kaart van de gebruiker zelf, wat logisch lijkt maar
   * in de praktijk misging: een nieuwe gebruiker komt onderaan de lijst, dus
   * het wachtwoord verscheen buiten beeld. Dat is het ene moment waarop het
   * ertoe doet — daarna bestaat het niet meer. Het hoort dus op de plek waar je
   * sowieso kijkt, en niet op de plek waar het thuishoort.
   */
  const [getoond, setGetoond] = useState<{ naam: string; wachtwoord: string } | null>(null)

  useEffect(() => {
    api
      .haalPortaalgebruikers()
      .then((res) => setGebruikers(res.portaalgebruikers))
      .catch((error: Error) => setFout(error.message))
  }, [])

  const opdrachtgevers = data?.opdrachtgevers ?? []
  const vacatures = data?.vacatures ?? []

  function toon(naam: string | null | undefined, wachtwoord: string | null) {
    if (wachtwoord) setGetoond({ naam: naam ?? 'deze gebruiker', wachtwoord })
  }

  return (
    <div>
      <Terug naar="/" label="Maandagoverzicht" />
      <h1 className="mt-1 text-2xl font-semibold">Klanttoegang</h1>
      <p className="mt-1 text-sm text-navy-400">
        Wie van je opdrachtgevers mag meekijken op het portaal, en bij welke vacatures. Alleen lezen;
        een klant kan niets wijzigen.
      </p>

      {fout && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {fout}
        </p>
      )}

      {getoond && (
        <Wachtwoordkaart
          naam={getoond.naam}
          wachtwoord={getoond.wachtwoord}
          onSluit={() => setGetoond(null)}
        />
      )}

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Gebruikers</h2>
        <button
          type="button"
          onClick={() => setNieuw((aan) => !aan)}
          className="tik inline-flex shrink-0 items-center rounded-xl border border-lijn bg-white px-4 text-sm font-medium"
        >
          {nieuw ? 'Sluiten' : 'Toevoegen'}
        </button>
      </div>

      {nieuw && (
        <Formulier
          opdrachtgevers={opdrachtgevers}
          vacatures={vacatures}
          onBewaar={async (velden) => {
            const res = await api.maakPortaalgebruiker(velden)
            setGebruikers((lijst) => [res.portaalgebruiker, ...(lijst ?? [])])
            toon(res.portaalgebruiker.Naam, res.wachtwoord)
            setNieuw(false)
          }}
          onSluit={() => setNieuw(false)}
        />
      )}

      {gebruikers === null ? (
        <p className="mt-3 text-sm text-navy-400">Laden…</p>
      ) : gebruikers.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-lijn bg-white p-4 text-sm text-navy-400">
          Er is nog niemand die op het portaal kan inloggen.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {gebruikers.map((gebruiker) => (
            <li key={gebruiker.id}>
              <Kaart
                gebruiker={gebruiker}
                opdrachtgevers={opdrachtgevers}
                vacatures={vacatures}
                onWijzig={async (velden) => {
                  const res = await api.wijzigPortaalgebruiker(gebruiker.id, velden)
                  setGebruikers((lijst) =>
                    (lijst ?? []).map((g) => (g.id === gebruiker.id ? res.portaalgebruiker : g)),
                  )
                  toon(res.portaalgebruiker.Naam, res.wachtwoord)
                }}
                onVerwijder={async () => {
                  await api.verwijderPortaalgebruiker(gebruiker.id)
                  setGebruikers((lijst) => (lijst ?? []).filter((g) => g.id !== gebruiker.id))
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface Klant {
  id: string
  Naam?: string
}
interface Rol {
  id: string
  Titel?: string
  Opdrachtgever?: string[]
}

function Kaart({
  gebruiker,
  opdrachtgevers,
  vacatures,
  onWijzig,
  onVerwijder,
}: {
  gebruiker: Portaalgebruiker
  opdrachtgevers: Klant[]
  vacatures: Rol[]
  onWijzig: (velden: Partial<Portaalgebruiker> & { nieuwWachtwoord?: true }) => Promise<void>
  onVerwijder: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  const klant = opdrachtgevers.find((o) => o.id === (gebruiker.Opdrachtgever ?? [])[0])
  const eigen = (gebruiker.Vacatures ?? [])
    .map((id) => vacatures.find((v) => v.id === id)?.Titel)
    .filter(Boolean)

  const verlopen = Boolean(gebruiker['Verloopt op'] && gebruiker['Verloopt op'] < new Date().toISOString().slice(0, 10))
  const geblokkeerd = gebruiker.Status === 'Geblokkeerd'

  async function doe(actie: () => Promise<void>) {
    setBezig(true)
    setFout(null)
    try {
      await actie()
    } catch (error) {
      setFout(error instanceof Error ? error.message : 'Er ging iets mis.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <article className="rounded-2xl border border-lijn bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{gebruiker.Naam ?? '—'}</p>
          <p className="text-sm text-navy-400">{gebruiker['E-mail'] ?? '—'}</p>
          <p className="mt-1 text-sm text-navy-400">
            {klant?.Naam ?? 'Geen opdrachtgever'} ·{' '}
            {eigen.length === 0 ? 'geen vacatures' : eigen.join(', ')}
          </p>
        </div>
        {(geblokkeerd || verlopen) && (
          <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {geblokkeerd ? 'Geblokkeerd' : 'Verlopen'}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-navy-400">
        Verloopt {datum(gebruiker['Verloopt op'])} · laatste login{' '}
        {gebruiker['Laatste login'] ? datum(gebruiker['Laatste login']) : 'nooit'}
      </p>

      {fout && <p className="mt-2 text-sm text-red-700">{fout}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Knop onClick={() => setOpen((aan) => !aan)}>{open ? 'Sluiten' : 'Bewerken'}</Knop>
        <Knop bezig={bezig} onClick={() => doe(() => onWijzig({ nieuwWachtwoord: true }))}>
          Nieuw wachtwoord
        </Knop>
        <Knop
          bezig={bezig}
          onClick={() => doe(() => onWijzig({ Status: geblokkeerd ? 'Actief' : 'Geblokkeerd' }))}
        >
          {geblokkeerd ? 'Deblokkeren' : 'Blokkeren'}
        </Knop>
        <Knop
          bezig={bezig}
          gevaar
          onClick={() => {
            if (confirm(`${gebruiker.Naam ?? 'Deze gebruiker'} verwijderen? De toegang vervalt meteen.`)) {
              void doe(onVerwijder)
            }
          }}
        >
          Verwijderen
        </Knop>
      </div>

      {open && (
        <Formulier
          gebruiker={gebruiker}
          opdrachtgevers={opdrachtgevers}
          vacatures={vacatures}
          onBewaar={async (velden) => {
            await onWijzig(velden)
            setOpen(false)
          }}
          onSluit={() => setOpen(false)}
        />
      )}
    </article>
  )
}

/**
 * Het wachtwoord, één keer.
 *
 * Dit blok is met opzet luid. Wie het wegklikt zonder te kopiëren is het kwijt,
 * en dan is er geen "even opzoeken" — alleen een nieuw wachtwoord genereren,
 * wat betekent dat het oude niet meer werkt bij een klant die misschien net is
 * ingelogd. Dat mag niet als een terloopse mededeling langskomen.
 */
function Wachtwoordkaart({
  wachtwoord,
  naam,
  onSluit,
}: {
  wachtwoord: string
  naam: string
  onSluit: () => void
}) {
  const [gekopieerd, setGekopieerd] = useState(false)
  const kaart = useRef<HTMLDivElement>(null)

  // Zichzelf in beeld halen. Bovenaan de pagina staan is niet genoeg: op het
  // moment dat dit verschijnt staat het scherm gescrold bij het formulier
  // waarmee de gebruiker net is aangemaakt, dus stond het wachtwoord tachtig
  // pixels boven de bovenrand. Gemeten, niet aangenomen — en dat is precies
  // hoe je een wachtwoord kwijtraakt dat maar één keer bestaat.
  useEffect(() => {
    kaart.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [wachtwoord])

  return (
    <div ref={kaart} className="mt-4 scroll-mt-20 rounded-2xl border border-oranje bg-oranje-50 p-4">
      <p className="text-sm font-semibold text-oranje">Wachtwoord voor {naam}</p>
      <p className="mt-1 font-mono text-lg tracking-wide break-all select-all">{wachtwoord}</p>
      <p className="mt-1 text-xs text-navy-400">
        Dit is de enige keer dat je dit ziet. Er staat alleen een versleutelde versie in de base, en
        die is niet terug te rekenen. Kwijt betekent een nieuw wachtwoord maken.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(wachtwoord)
              setGekopieerd(true)
            } catch {
              // Zonder klembordrechten blijft de tekst gewoon te selecteren staan.
              setGekopieerd(false)
            }
          }}
          className="tik inline-flex items-center rounded-xl border border-oranje bg-white px-4 text-sm font-medium text-oranje"
        >
          {gekopieerd ? 'Gekopieerd' : 'Kopieer'}
        </button>
        <button
          type="button"
          onClick={onSluit}
          className="tik inline-flex items-center rounded-xl px-4 text-sm font-medium text-navy-400"
        >
          Doorgegeven
        </button>
      </div>
    </div>
  )
}

function Knop({
  children,
  onClick,
  bezig = false,
  gevaar = false,
}: {
  children: React.ReactNode
  onClick: () => void
  bezig?: boolean
  gevaar?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={bezig}
      className={`tik inline-flex items-center rounded-xl border px-4 text-sm font-medium disabled:opacity-40 ${
        gevaar ? 'border-red-200 bg-red-50 text-red-700' : 'border-lijn bg-white'
      }`}
    >
      {children}
    </button>
  )
}

function Formulier({
  gebruiker,
  opdrachtgevers,
  vacatures,
  onBewaar,
  onSluit,
}: {
  gebruiker?: Portaalgebruiker
  opdrachtgevers: Klant[]
  vacatures: Rol[]
  onBewaar: (velden: Partial<Portaalgebruiker>) => Promise<void>
  onSluit: () => void
}) {
  const [naam, setNaam] = useState(gebruiker?.Naam ?? '')
  const [email, setEmail] = useState(gebruiker?.['E-mail'] ?? '')
  const [klantId, setKlantId] = useState((gebruiker?.Opdrachtgever ?? [])[0] ?? '')
  const [gekozen, setGekozen] = useState<string[]>(gebruiker?.Vacatures ?? [])
  const [verlooptOp, setVerlooptOp] = useState(gebruiker?.['Verloopt op'] ?? '')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  // Alleen de vacatures van de gekozen klant. Kiest Dominique een andere klant,
  // dan vervalt de selectie: die vacatures horen niet meer bij deze gebruiker,
  // en de server zou ze toch weigeren.
  const eigen = vacatures.filter((v) => (v.Opdrachtgever ?? []).includes(klantId))

  async function verstuur(event: React.FormEvent) {
    event.preventDefault()
    setBezig(true)
    setFout(null)
    try {
      await onBewaar({
        Naam: naam,
        'E-mail': email,
        Opdrachtgever: klantId ? [klantId] : [],
        Vacatures: gekozen,
        'Verloopt op': verlooptOp || null,
      })
    } catch (error) {
      setFout(error instanceof Error ? error.message : 'Er ging iets mis.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <form onSubmit={verstuur} className="mt-3 rounded-2xl border border-lijn bg-cream p-4">
      <Veld label="Naam">
        <input
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          className="tik w-full rounded-xl border border-lijn bg-white px-3 py-2 text-base"
        />
      </Veld>

      <Veld label="E-mailadres" hulp="Hiermee logt deze persoon in.">
        <input
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="tik w-full rounded-xl border border-lijn bg-white px-3 py-2 text-base"
        />
      </Veld>

      <Veld label="Opdrachtgever">
        <select
          value={klantId}
          onChange={(e) => {
            setKlantId(e.target.value)
            setGekozen([])
          }}
          className="tik w-full rounded-xl border border-lijn bg-white px-3 py-2 text-base"
        >
          <option value="">Kies een opdrachtgever</option>
          {opdrachtgevers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.Naam}
            </option>
          ))}
        </select>
      </Veld>

      <Veld
        label="Vacatures"
        hulp="Niets aangevinkt betekent geen toegang tot iets, niet toegang tot alles."
      >
        {klantId === '' ? (
          <p className="text-sm text-navy-400">Kies eerst een opdrachtgever.</p>
        ) : eigen.length === 0 ? (
          <p className="text-sm text-navy-400">Deze opdrachtgever heeft nog geen vacatures.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {eigen.map((v) => (
              <li key={v.id}>
                <label className="tik flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={gekozen.includes(v.id)}
                    onChange={(e) =>
                      setGekozen((huidig) =>
                        e.target.checked ? [...huidig, v.id] : huidig.filter((id) => id !== v.id),
                      )
                    }
                    className="h-5 w-5 shrink-0 rounded border-lijn"
                  />
                  {v.Titel}
                </label>
              </li>
            ))}
          </ul>
        )}
      </Veld>

      <Veld label="Verloopt op" hulp="Leeg laten betekent dat de toegang blijft tot je hem intrekt.">
        <input
          type="date"
          value={verlooptOp ? String(verlooptOp).slice(0, 10) : ''}
          onChange={(e) => setVerlooptOp(e.target.value)}
          className="tik w-full rounded-xl border border-lijn bg-white px-3 py-2 text-base"
        />
      </Veld>

      {fout && <p className="mb-2 text-sm text-red-700">{fout}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={bezig}
          className="tik flex-1 rounded-xl bg-navy px-4 font-semibold text-white disabled:opacity-40"
        >
          {bezig ? 'Bezig…' : gebruiker ? 'Opslaan' : 'Aanmaken'}
        </button>
        <button
          type="button"
          onClick={onSluit}
          className="tik rounded-xl border border-lijn bg-white px-4 text-sm font-medium"
        >
          Annuleren
        </button>
      </div>

      {!gebruiker && (
        <p className="mt-2 text-xs text-navy-400">
          Bij het aanmaken krijg je één keer een wachtwoord te zien om door te geven.
        </p>
      )}
    </form>
  )
}

function Veld({
  label,
  hulp,
  children,
}: {
  label: string
  hulp?: string
  children: React.ReactNode
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hulp && <span className="mt-1 block text-xs text-navy-400">{hulp}</span>}
    </label>
  )
}
