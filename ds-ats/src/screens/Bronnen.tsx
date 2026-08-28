import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import { bronEffectiviteit } from '../lib/metrics'

/**
 * Metric 3: welk kanaal levert plaatsingen, niet alleen namen. Per vacature te
 * filteren, want over alle opdrachten heen gemiddeld zegt het weinig.
 *
 * Elke bron is een link naar het maandagoverzicht met `?bron=`, net zoals de
 * funnel doorlinkt naar `?stage=`. Dit scherm was het enige waar een getal
 * nergens heen ging: je zag dat LinkedIn twaalf mensen opleverde en kon niet
 * zien wie dat waren. De tabel is een rij per bron geworden, in dezelfde vorm
 * als de stagetegels, want daar leest de gebruiker "dit getal brengt me ergens"
 * al aan af — en vier kolommen naast elkaar zijn op 390px toch te smal.
 */
export default function Bronnen() {
  const { data, regels } = useAts()
  const [vacatureFilter, setVacatureFilter] = useState('alle')

  const rijen = useMemo(() => {
    const selectie =
      vacatureFilter === 'alle' ? regels : regels.filter((r) => r.vacature?.id === vacatureFilter)
    return bronEffectiviteit(selectie)
  }, [regels, vacatureFilter])

  if (!data) return null

  // De vacaturekeuze gaat mee de link in, anders staat er straks een lijst over
  // alle opdrachten heen onder een getal van één opdracht.
  const linkNaarBron = (bron: string) => {
    const zoek = new URLSearchParams({ bron })
    if (vacatureFilter !== 'alle') zoek.set('vacature', vacatureFilter)
    return `/?${zoek.toString()}`
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Bron-effectiviteit</h1>
      <p className="mt-1 text-sm text-navy-400">
        Van gescoord naar voorgesteld naar geplaatst. Tik een bron voor wie er nu van dat kanaal in
        de pipeline loopt.
      </p>

      <select
        value={vacatureFilter}
        onChange={(event) => setVacatureFilter(event.target.value)}
        aria-label="Filter op vacature"
        className="tik mt-3 w-full rounded-xl border border-lijn bg-white px-3 text-sm"
      >
        <option value="alle">Alle vacatures</option>
        {data.vacatures.map((vacature) => (
          <option key={vacature.id} value={vacature.id}>
            {vacature.Titel}
          </option>
        ))}
      </select>

      <ol className="mt-4 flex flex-col gap-2">
        {rijen.map((rij) => (
          <li key={rij.bron}>
            <Link
              to={linkNaarBron(rij.bron)}
              className="tik flex items-center gap-3 rounded-2xl border border-lijn bg-white px-4 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{rij.bron}</p>
                <p className="mt-0.5 text-sm text-navy-400 tabular-nums">
                  {rij.gescoord} gescoord · {rij.voorgesteld} voorgesteld
                </p>
              </div>
              <span className="shrink-0 text-right">
                <span className="block text-2xl leading-tight font-semibold tabular-nums">
                  {rij.geplaatst}
                </span>
                <span className="block text-xs text-navy-400">geplaatst</span>
              </span>
              <span aria-hidden className="shrink-0 text-navy-400">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {rijen.length === 0 && <p className="mt-6 text-center text-navy-400">Nog geen data.</p>}
    </div>
  )
}
