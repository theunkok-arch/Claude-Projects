import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, AuthFout, bewaardeSleutel, bewaarSleutel, wisSleutel } from '../lib/api'
import { bouwRegels } from '../lib/metrics'
import type {
  Aanmelding,
  Activiteit,
  Bootstrap,
  Contactpersoon,
  Kandidaat,
  Opdrachtgever,
  Regel,
  Vacature,
} from '../lib/types'
import type { StageId } from '../../shared/stages.mjs'

interface AtsContext {
  data: Bootstrap | null
  regels: Regel[]
  laden: boolean
  fout: string | null
  ingelogd: boolean
  verbergFout: () => void
  logIn: (sleutel: string) => Promise<void>
  logUit: () => void
  herlaad: () => Promise<void>
  wijzigStage: (
    aanmeldingId: string,
    naarStage: StageId,
    opties?: { redenAfvallen?: string; volgendeActie?: string },
  ) => Promise<void>
  wijzigAanmelding: (id: string, velden: Partial<Aanmelding>) => Promise<void>
  wijzigKandidaat: (id: string, velden: Partial<Kandidaat>) => Promise<void>
  verwijderKandidaat: (id: string) => Promise<void>
  logActiviteit: (aanmeldingId: string, type: string, samenvatting: string) => Promise<void>
  maakOpdrachtgever: (velden: Partial<Opdrachtgever>) => Promise<Opdrachtgever>
  wijzigOpdrachtgever: (id: string, velden: Partial<Opdrachtgever>) => Promise<void>
  maakVacature: (opdrachtgeverId: string, velden: Partial<Vacature>) => Promise<Vacature>
  wijzigVacature: (id: string, velden: Partial<Vacature>) => Promise<void>
  maakContactpersoon: (
    opdrachtgeverId: string,
    velden: Partial<Contactpersoon>,
  ) => Promise<Contactpersoon>
  wijzigContactpersoon: (id: string, velden: Partial<Contactpersoon>) => Promise<void>
}

const Context = createContext<AtsContext | null>(null)

/**
 * Airtable stuurt een leeggemaakt veld niet terug in het antwoord. Een kale
 * merge over de bestaande gegevens laat zo'n veld daarom lokaal staan terwijl
 * het in de base wél weg is: je blijft een score zien die niet meer bestaat,
 * tot de volgende keer verversen.
 *
 * `geschreven` zegt welke velden deze aanroep heeft weggeschreven. Noemt het
 * antwoord er daarvan één niet, dan is hij leeggemaakt en hoort hij ook lokaal
 * weg. Zonder die lijst kunnen we leeg niet onderscheiden van onveranderd.
 */
function samenvoeg<T extends { id: string }>(oud: T, nieuw: Partial<T>, geschreven?: string[]): T {
  const uit = { ...oud, ...nieuw, id: oud.id }
  for (const sleutel of geschreven ?? []) {
    if (!(sleutel in nieuw)) delete (uit as Record<string, unknown>)[sleutel]
  }
  return uit
}

export function AtsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap | null>(null)
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [ingelogd, setIngelogd] = useState(() => Boolean(bewaardeSleutel()))

  const herlaad = useCallback(async () => {
    setLaden(true)
    setFout(null)
    try {
      setData(await api.bootstrap())
      setIngelogd(true)
    } catch (error) {
      if (error instanceof AuthFout) {
        setIngelogd(false)
        setData(null)
      }
      // Bootstrap is ook de inlogpoging, dus hier blijft de melding van api.ts
      // staan ("Onjuist wachtwoord.") en niet de sessietekst uit bewaakSessie.
      setFout(error instanceof Error ? error.message : 'Onbekende fout.')
    } finally {
      setLaden(false)
    }
  }, [])

  useEffect(() => {
    if (ingelogd && !data) void herlaad()
  }, [ingelogd, data, herlaad])

  const logIn = useCallback(
    async (sleutel: string) => {
      bewaarSleutel(sleutel)
      await herlaad()
    },
    [herlaad],
  )

  const logUit = useCallback(() => {
    wisSleutel()
    setData(null)
    setIngelogd(false)
  }, [])

  const verbergFout = useCallback(() => setFout(null), [])

  /**
   * Om elke actie heen. Vangt uitsluitend een AuthFout af: bij een 401 heeft
   * api.ts de sleutel al gewist, dus zonder dit blijft de app denken dat je
   * ingelogd bent terwijl elke volgende aanroep stil faalt. Nu val je terug op
   * het inlogscherm, ongeacht welke actie de 401 opliep.
   *
   * De fout wordt daarna opnieuw gegooid, en dat is geen detail: StageSheet en
   * KandidaatFormulier vangen hem zelf en tonen hem in de sheet respectievelijk
   * het formulier — precies waar de gebruiker staat te kijken. Slikt deze
   * wrapper de fout in, dan verdwijnt juist die melding.
   */
  const bewaakSessie = useCallback(async function <T>(actie: () => Promise<T>): Promise<T> {
    try {
      return await actie()
    } catch (error) {
      if (error instanceof AuthFout) {
        setIngelogd(false)
        setData(null)
        setFout('Je sessie is verlopen. Log opnieuw in.')
      }
      throw error
    }
  }, [])

  /** Vervangt één aanmelding in de lokale state, zodat de lijst niet hoeft te herladen. */
  const vervangAanmelding = useCallback(
    (id: string, velden: Aanmelding, geschreven?: string[]) => {
      setData((huidig) =>
        huidig
          ? {
              ...huidig,
              aanmeldingen: huidig.aanmeldingen.map((a) =>
                a.id === id ? samenvoeg(a, velden, geschreven) : a,
              ),
            }
          : huidig,
      )
    },
    [],
  )

  const voegActiviteitToe = useCallback((activiteit: Activiteit) => {
    setData((huidig) =>
      huidig ? { ...huidig, activiteiten: [activiteit, ...huidig.activiteiten] } : huidig,
    )
  }, [])

  const wijzigStage = useCallback<AtsContext['wijzigStage']>(
    (aanmeldingId, naarStage, opties) =>
      bewaakSessie(async () => {
        const res = await api.wijzigStage({ aanmeldingId, naarStage, ...opties })
        // De server zet zelf 'Reden afvallen' leeg buiten Afgevallen en
        // 'Volgende actie' leeg bij Afgevallen; die twee moeten dus ook lokaal
        // kunnen verdwijnen.
        vervangAanmelding(aanmeldingId, res.aanmelding.fields, ['Reden afvallen', 'Volgende actie'])
        voegActiviteitToe(res.activiteit)
      }),
    [bewaakSessie, vervangAanmelding, voegActiviteitToe],
  )

  const wijzigAanmelding = useCallback<AtsContext['wijzigAanmelding']>(
    (id, velden) =>
      bewaakSessie(async () => {
        const res = await api.wijzigAanmelding(id, velden)
        vervangAanmelding(id, res.aanmelding.fields, Object.keys(velden))
      }),
    [bewaakSessie, vervangAanmelding],
  )

  const wijzigKandidaat = useCallback<AtsContext['wijzigKandidaat']>(
    (id, velden) =>
      bewaakSessie(async () => {
        const res = await api.wijzigKandidaat(id, velden)
        setData((huidig) =>
          huidig
            ? {
                ...huidig,
                kandidaten: huidig.kandidaten.map((k) =>
                  k.id === id ? samenvoeg(k, res.kandidaat.fields, Object.keys(velden)) : k,
                ),
              }
            : huidig,
        )
      }),
    [bewaakSessie],
  )

  const verwijderKandidaat = useCallback<AtsContext['verwijderKandidaat']>(
    (id) =>
      bewaakSessie(async () => {
        await api.verwijderKandidaat(id)
        setData((huidig) => {
          if (!huidig) return huidig
          const aanmeldingIds = new Set(
            huidig.aanmeldingen.filter((a) => a.Kandidaat?.[0] === id).map((a) => a.id),
          )
          return {
            ...huidig,
            kandidaten: huidig.kandidaten.filter((k) => k.id !== id),
            aanmeldingen: huidig.aanmeldingen.filter((a) => !aanmeldingIds.has(a.id)),
            activiteiten: huidig.activiteiten.filter(
              (a) => !aanmeldingIds.has(a.Aanmelding?.[0] ?? ''),
            ),
          }
        })
      }),
    [bewaakSessie],
  )

  const logActiviteit = useCallback<AtsContext['logActiviteit']>(
    (aanmeldingId, type, samenvatting) =>
      bewaakSessie(async () => {
        const res = await api.logActiviteit({ aanmeldingId, type, samenvatting })
        voegActiviteitToe(res.activiteit)
        if (res.kandidaat) {
          const bijgewerkt = res.kandidaat
          setData((huidig) =>
            huidig
              ? {
                  ...huidig,
                  kandidaten: huidig.kandidaten.map((k) =>
                    k.id === bijgewerkt.id ? { ...k, ...bijgewerkt } : k,
                  ),
                }
              : huidig,
          )
        }
      }),
    [bewaakSessie, voegActiviteitToe],
  )

  /**
   * Opdrachtgevers, vacatures en contactpersonen konden alleen in Airtable zelf
   * worden aangemaakt. Dat blokkeerde het toevoegen van nieuwe klanten, want de
   * import koppelt elke aanmelding op naam aan een vacature die er al moet zijn.
   *
   * De aanmaakacties geven het nieuwe record terug: het formulier heeft dat id
   * nodig om er meteen een vacature of contactpersoon onder te hangen.
   */
  const maakOpdrachtgever = useCallback<AtsContext['maakOpdrachtgever']>(
    (velden) =>
      bewaakSessie(async () => {
        const res = await api.maakOpdrachtgever(velden)
        setData((huidig) =>
          huidig ? { ...huidig, opdrachtgevers: [...huidig.opdrachtgevers, res.opdrachtgever] } : huidig,
        )
        return res.opdrachtgever
      }),
    [bewaakSessie],
  )

  const wijzigOpdrachtgever = useCallback<AtsContext['wijzigOpdrachtgever']>(
    (id, velden) =>
      bewaakSessie(async () => {
        const res = await api.wijzigOpdrachtgever(id, velden)
        setData((huidig) =>
          huidig
            ? {
                ...huidig,
                opdrachtgevers: huidig.opdrachtgevers.map((o) =>
                  o.id === id ? samenvoeg(o, res.opdrachtgever.fields, Object.keys(velden)) : o,
                ),
              }
            : huidig,
        )
      }),
    [bewaakSessie],
  )

  const maakVacature = useCallback<AtsContext['maakVacature']>(
    (opdrachtgeverId, velden) =>
      bewaakSessie(async () => {
        const res = await api.maakVacature(opdrachtgeverId, velden)
        setData((huidig) => (huidig ? { ...huidig, vacatures: [...huidig.vacatures, res.vacature] } : huidig))
        return res.vacature
      }),
    [bewaakSessie],
  )

  const wijzigVacature = useCallback<AtsContext['wijzigVacature']>(
    (id, velden) =>
      bewaakSessie(async () => {
        const res = await api.wijzigVacature(id, velden)
        setData((huidig) =>
          huidig
            ? {
                ...huidig,
                vacatures: huidig.vacatures.map((v) =>
                  v.id === id ? samenvoeg(v, res.vacature.fields, Object.keys(velden)) : v,
                ),
              }
            : huidig,
        )
      }),
    [bewaakSessie],
  )

  const maakContactpersoon = useCallback<AtsContext['maakContactpersoon']>(
    (opdrachtgeverId, velden) =>
      bewaakSessie(async () => {
        const res = await api.maakContactpersoon(opdrachtgeverId, velden)
        setData((huidig) =>
          huidig ? { ...huidig, contactpersonen: [...huidig.contactpersonen, res.contactpersoon] } : huidig,
        )
        return res.contactpersoon
      }),
    [bewaakSessie],
  )

  const wijzigContactpersoon = useCallback<AtsContext['wijzigContactpersoon']>(
    (id, velden) =>
      bewaakSessie(async () => {
        const res = await api.wijzigContactpersoon(id, velden)
        setData((huidig) =>
          huidig
            ? {
                ...huidig,
                contactpersonen: huidig.contactpersonen.map((c) =>
                  c.id === id ? samenvoeg(c, res.contactpersoon.fields, Object.keys(velden)) : c,
                ),
              }
            : huidig,
        )
      }),
    [bewaakSessie],
  )

  const regels = useMemo(() => (data ? bouwRegels(data) : []), [data])

  const waarde = useMemo<AtsContext>(
    () => ({
      data,
      regels,
      laden,
      fout,
      ingelogd,
      verbergFout,
      logIn,
      logUit,
      herlaad,
      wijzigStage,
      wijzigAanmelding,
      wijzigKandidaat,
      maakOpdrachtgever,
      wijzigOpdrachtgever,
      maakVacature,
      wijzigVacature,
      maakContactpersoon,
      wijzigContactpersoon,
      verwijderKandidaat,
      logActiviteit,
    }),
    [
      data,
      regels,
      laden,
      fout,
      ingelogd,
      verbergFout,
      logIn,
      logUit,
      herlaad,
      wijzigStage,
      wijzigAanmelding,
      wijzigKandidaat,
      maakOpdrachtgever,
      wijzigOpdrachtgever,
      maakVacature,
      wijzigVacature,
      maakContactpersoon,
      wijzigContactpersoon,
      verwijderKandidaat,
      logActiviteit,
    ],
  )

  return <Context.Provider value={waarde}>{children}</Context.Provider>
}

export function useAts() {
  const context = useContext(Context)
  if (!context) throw new Error('useAts moet binnen AtsProvider gebruikt worden.')
  return context
}
