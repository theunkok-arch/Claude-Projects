import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import { useHerkomst } from '../lib/herkomst'
import { isActief } from '../../shared/stages.mjs'
import OpdrachtgeverFormulier from '../components/OpdrachtgeverFormulier'

/**
 * De klantenlijst. Eén regel per opdrachtgever met wat er voor hem loopt,
 * zodat je vanuit "hoe staat Royal Sanders ervoor" kunt beginnen in plaats van
 * vanuit een losse vacature.
 */
export default function Opdrachtgevers() {
  const { data, regels, maakOpdrachtgever } = useAts()
  const herkomst = useHerkomst()
  const navigate = useNavigate()
  const [nieuw, setNieuw] = useState(false)
  if (!data) return null

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">Opdrachtgevers</h1>
        {/*
          Geen vijfde tab in de balk onderaan. Klanttoegang beheer je een paar
          keer per jaar; die vier tabs zijn er voor wat dagelijks is, en op 390
          pixels kost een vijfde ze allemaal ruimte. Hij hoort hier, want dit is
          het scherm waar je aan je klanten denkt.
        */}
        <Link
          to="/klanttoegang"
          className="tik inline-flex shrink-0 items-center rounded-xl border border-lijn bg-white px-4 text-sm font-medium"
        >
          Klanttoegang
        </Link>
      </div>

      <div className="mt-3">
        {nieuw ? (
          <OpdrachtgeverFormulier
            onBewaar={async (velden) => {
              const gemaakt = await maakOpdrachtgever(velden)
              // Meteen door naar zijn detailscherm. Een lege klantenlijst met
              // een naam erin helpt niemand: het eerstvolgende werk is er een
              // vacature of contactpersoon onder hangen, en dat kan alleen daar.
              navigate(`/opdrachtgever/${gemaakt.id}`, { state: herkomst })
            }}
            onSluit={() => setNieuw(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setNieuw(true)}
            className="tik w-full rounded-xl border border-lijn bg-white px-4 text-sm font-medium"
          >
            + Nieuwe opdrachtgever
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {data.opdrachtgevers.map((opdrachtgever) => {
          const vacatures = data.vacatures.filter((v) => v.Opdrachtgever?.[0] === opdrachtgever.id)
          const ids = new Set(vacatures.map((v) => v.id))
          const eigen = regels.filter((r) => r.vacature && ids.has(r.vacature.id))
          const actief = eigen.filter((r) => isActief(r.aanmelding.Stage)).length
          const teLang = eigen.filter((r) => r.overschreden).length

          return (
            <Link
              key={opdrachtgever.id}
              to={`/opdrachtgever/${opdrachtgever.id}`}
              state={herkomst}
              className="rounded-2xl border border-lijn bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate font-semibold">{opdrachtgever.Naam ?? 'Naamloos'}</p>
                <span className="shrink-0 rounded-full bg-cream px-2.5 py-1 text-xs font-medium">
                  {opdrachtgever.Status ?? '—'}
                </span>
              </div>
              <p className="mt-1 text-sm text-navy-400">
                {vacatures.length} {vacatures.length === 1 ? 'vacature' : 'vacatures'} · {actief} actief
                {teLang > 0 && <span className="font-medium text-oranje"> · {teLang} over de norm</span>}
              </p>
            </Link>
          )
        })}

        {data.opdrachtgevers.length === 0 && (
          <p className="mt-8 text-center text-navy-400">Nog geen opdrachtgevers in de base.</p>
        )}
      </div>
    </div>
  )
}
