import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import { funnel } from '../lib/metrics'
import { band, datum } from '../lib/format'
import { useHerkomst } from '../lib/herkomst'
import { isActief } from '../../shared/stages.mjs'
import type { StageId } from '../../shared/stages.mjs'
import Funnel from '../components/Funnel'
import Terug from '../components/Terug'
import OpdrachtgeverFormulier from '../components/OpdrachtgeverFormulier'
import ContactpersoonFormulier from '../components/ContactpersoonFormulier'
import VacatureFormulier from '../components/VacatureFormulier'
import BewerkKnop from '../components/BewerkKnop'

/** Wat er open staat in de contactpersonenlijst: niets, het aanmaakformulier, of één id. */
type ContactOpen = { soort: 'geen' } | { soort: 'nieuw' } | { soort: 'bewerk'; id: string }

/**
 * Scherm per opdrachtgever: zijn contactpersonen en zijn vacatures, elk met de
 * eigen funnel. Elke trede linkt door naar de kandidatenlijst van die vacature,
 * gefilterd op die stage.
 *
 * Dit is ook de plek waar een klant wordt onderhouden. Alles wat je vlak na het
 * aanmaken wil doen — wie is de hiring manager, welke vacature loopt er — hangt
 * hieronder, dus staan die knoppen hier en niet op de klantenlijst.
 */
export default function OpdrachtgeverDetail() {
  const { id } = useParams()
  const herkomst = useHerkomst()
  const { data, regels, wijzigOpdrachtgever, maakContactpersoon, wijzigContactpersoon, maakVacature } =
    useAts()
  const [bewerken, setBewerken] = useState(false)
  const [contactOpen, setContactOpen] = useState<ContactOpen>({ soort: 'geen' })
  const [nieuweVacature, setNieuweVacature] = useState(false)

  const opdrachtgever = data?.opdrachtgevers.find((o) => o.id === id)
  const vacatures = useMemo(
    () => (data?.vacatures ?? []).filter((v) => v.Opdrachtgever?.[0] === id),
    [data, id],
  )
  const contactpersonen = useMemo(
    () => (data?.contactpersonen ?? []).filter((c) => c.Opdrachtgever?.[0] === id),
    [data, id],
  )

  if (!data) return null
  if (!opdrachtgever) return <p className="text-navy-400">Deze opdrachtgever bestaat niet (meer).</p>

  const ids = new Set(vacatures.map((v) => v.id))
  const alle = regels.filter((r) => r.vacature && ids.has(r.vacature.id))
  const actief = alle.filter((r) => isActief(r.aanmelding.Stage)).length
  const teLang = alle.filter((r) => r.overschreden).length

  return (
    <div>
      <Terug naar="/opdrachtgevers" label="Opdrachtgevers" />

      <div className="mt-1 flex items-start justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-semibold">{opdrachtgever.Naam}</h1>
        <BewerkKnop open={bewerken} onClick={() => setBewerken((aan) => !aan)} />
      </div>
      <p className="text-sm text-navy-400">
        {opdrachtgever.Status ?? '—'} · {alle.length} aanmeldingen · {actief} actief
        {teLang > 0 && <span className="font-medium text-oranje"> · {teLang} over de norm</span>}
      </p>

      {bewerken && (
        <div className="mt-3">
          <OpdrachtgeverFormulier
            opdrachtgever={opdrachtgever}
            onBewaar={(velden) => wijzigOpdrachtgever(opdrachtgever.id, velden)}
            onSluit={() => setBewerken(false)}
          />
        </div>
      )}

      {!bewerken && opdrachtgever.Notities && (
        <p className="mt-3 rounded-2xl border border-lijn bg-white p-4 text-sm whitespace-pre-wrap">
          {opdrachtgever.Notities}
        </p>
      )}

      <h2 className="mt-6 font-semibold">Contactpersonen ({contactpersonen.length})</h2>

      <div className="mt-2 flex flex-col gap-3">
        {contactpersonen.map((persoon) =>
          contactOpen.soort === 'bewerk' && contactOpen.id === persoon.id ? (
            <ContactpersoonFormulier
              key={persoon.id}
              contactpersoon={persoon}
              onBewaar={(velden) => wijzigContactpersoon(persoon.id, velden)}
              onSluit={() => setContactOpen({ soort: 'geen' })}
            />
          ) : (
            <section key={persoon.id} className="rounded-2xl border border-lijn bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{persoon.Naam ?? 'Naamloos'}</p>
                  <p className="truncate text-sm text-navy-400">{persoon.Rol || '—'}</p>
                </div>
                <BewerkKnop
                  open={false}
                  onClick={() => setContactOpen({ soort: 'bewerk', id: persoon.id })}
                />
              </div>

              {/* Dit is de persoon die beslist; dat hoort op de kaart te staan en
                  niet alleen in het formulier. */}
              {persoon['Is hiring manager'] && (
                <p className="mt-2 inline-block rounded-full bg-oranje-100 px-2.5 py-1 text-xs font-medium">
                  Hiring manager
                </p>
              )}

              {/* Mailen en bellen zijn één tik. `tik` alleen is niet genoeg op een
                  <a>: min-height doet niets op een inline element, dus inline-flex. */}
              {(persoon['E-mail'] || persoon.Telefoon) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {persoon['E-mail'] && (
                    <a
                      href={`mailto:${persoon['E-mail']}`}
                      className="tik inline-flex items-center rounded-xl border border-lijn bg-white px-4 py-2 text-sm font-medium"
                    >
                      Mail
                    </a>
                  )}
                  {persoon.Telefoon && (
                    <a
                      href={`tel:${persoon.Telefoon}`}
                      className="tik inline-flex items-center rounded-xl border border-lijn bg-white px-4 py-2 text-sm font-medium"
                    >
                      Bellen
                    </a>
                  )}
                </div>
              )}
            </section>
          ),
        )}

        {contactpersonen.length === 0 && (
          <p className="text-sm text-navy-400">Nog geen contactpersoon bij deze opdrachtgever.</p>
        )}

        {contactOpen.soort === 'nieuw' ? (
          <ContactpersoonFormulier
            onBewaar={async (velden) => {
              await maakContactpersoon(opdrachtgever.id, velden)
            }}
            onSluit={() => setContactOpen({ soort: 'geen' })}
          />
        ) : (
          <button
            type="button"
            onClick={() => setContactOpen({ soort: 'nieuw' })}
            className="tik w-full rounded-xl border border-lijn bg-white px-4 text-sm font-medium"
          >
            + Contactpersoon toevoegen
          </button>
        )}
      </div>

      <h2 className="mt-6 font-semibold">Vacatures ({vacatures.length})</h2>

      <div className="mt-2 flex flex-col gap-3">
        {nieuweVacature ? (
          <VacatureFormulier
            onBewaar={async (velden) => {
              await maakVacature(opdrachtgever.id, velden)
            }}
            onSluit={() => setNieuweVacature(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setNieuweVacature(true)}
            className="tik w-full rounded-xl border border-lijn bg-white px-4 text-sm font-medium"
          >
            + Nieuwe vacature
          </button>
        )}

        {vacatures.map((vacature) => {
          const eigen = regels.filter((r) => r.vacature?.id === vacature.id)
          const eigenTeLang = eigen.filter((r) => r.overschreden).length

          return (
            <section key={vacature.id} className="rounded-2xl border border-lijn bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <Link
                  to={`/vacature/${vacature.id}`}
                  state={herkomst}
                  className="min-w-0 font-semibold underline"
                >
                  {vacature.Titel}
                </Link>
                <span className="shrink-0 rounded-full bg-cream px-2.5 py-1 text-xs font-medium">
                  {vacature.Status ?? '—'}
                </span>
              </div>

              {vacature.Validatie && (
                <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-sm text-red-700">
                  {vacature.Validatie}
                </p>
              )}

              <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-navy-400">Salarisband</dt>
                <dd className="text-right">{band(vacature['Salaris min'], vacature['Salaris max'])}</dd>
                <dt className="text-navy-400">Streefdatum shortlist</dt>
                <dd className="text-right">{datum(vacature['Streefdatum shortlist'])}</dd>
                <dt className="text-navy-400">Over de norm</dt>
                <dd className={`text-right ${eigenTeLang > 0 ? 'font-semibold text-oranje' : ''}`}>
                  {eigenTeLang}
                </dd>
              </dl>

              <div className="mt-3 border-t border-lijn pt-3">
                <Funnel
                  tredes={funnel(eigen)}
                  hrefVoor={(stage: StageId) => `/vacature/${vacature.id}?stage=${encodeURIComponent(stage)}`}
                />
              </div>
            </section>
          )
        })}

        {vacatures.length === 0 && (
          <p className="text-sm text-navy-400">Deze opdrachtgever heeft nog geen vacatures.</p>
        )}
      </div>
    </div>
  )
}
