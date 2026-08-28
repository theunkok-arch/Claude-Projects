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
import type { Aanmelding, Activiteit, Bootstrap, Kandidaat, Regel } from '../lib/types'
import type { StageId } from '../../shared/stages.mjs'

interface AtsContext {
  data: Bootstrap | null
  regels: Regel[]
  laden: boolean
  fout: string | null
  ingelogd: boolean
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
}

const Context = createContext<AtsContext | null>(null)

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

  /** Vervangt één aanmelding in de lokale state, zodat de lijst niet hoeft te herladen. */
  const vervangAanmelding = useCallback((id: string, velden: Aanmelding) => {
    setData((huidig) =>
      huidig
        ? {
            ...huidig,
            aanmeldingen: huidig.aanmeldingen.map((a) => (a.id === id ? { ...a, ...velden, id } : a)),
          }
        : huidig,
    )
  }, [])

  const voegActiviteitToe = useCallback((activiteit: Activiteit) => {
    setData((huidig) =>
      huidig ? { ...huidig, activiteiten: [activiteit, ...huidig.activiteiten] } : huidig,
    )
  }, [])

  const wijzigStage = useCallback<AtsContext['wijzigStage']>(
    async (aanmeldingId, naarStage, opties) => {
      const res = await api.wijzigStage({ aanmeldingId, naarStage, ...opties })
      vervangAanmelding(aanmeldingId, res.aanmelding.fields)
      voegActiviteitToe(res.activiteit)
    },
    [vervangAanmelding, voegActiviteitToe],
  )

  const wijzigAanmelding = useCallback<AtsContext['wijzigAanmelding']>(
    async (id, velden) => {
      const res = await api.wijzigAanmelding(id, velden)
      vervangAanmelding(id, res.aanmelding.fields)
    },
    [vervangAanmelding],
  )

  const wijzigKandidaat = useCallback<AtsContext['wijzigKandidaat']>(async (id, velden) => {
    const res = await api.wijzigKandidaat(id, velden)
    setData((huidig) =>
      huidig
        ? {
            ...huidig,
            kandidaten: huidig.kandidaten.map((k) => (k.id === id ? { ...k, ...res.kandidaat.fields, id } : k)),
          }
        : huidig,
    )
  }, [])

  const verwijderKandidaat = useCallback<AtsContext['verwijderKandidaat']>(async (id) => {
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
        activiteiten: huidig.activiteiten.filter((a) => !aanmeldingIds.has(a.Aanmelding?.[0] ?? '')),
      }
    })
  }, [])

  const logActiviteit = useCallback<AtsContext['logActiviteit']>(
    async (aanmeldingId, type, samenvatting) => {
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
    },
    [voegActiviteitToe],
  )

  const regels = useMemo(() => (data ? bouwRegels(data) : []), [data])

  const waarde = useMemo<AtsContext>(
    () => ({
      data,
      regels,
      laden,
      fout,
      ingelogd,
      logIn,
      logUit,
      herlaad,
      wijzigStage,
      wijzigAanmelding,
      wijzigKandidaat,
      verwijderKandidaat,
      logActiviteit,
    }),
    [
      data,
      regels,
      laden,
      fout,
      ingelogd,
      logIn,
      logUit,
      herlaad,
      wijzigStage,
      wijzigAanmelding,
      wijzigKandidaat,
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
