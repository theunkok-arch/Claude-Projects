import { useMemo, useState } from 'react'
import { useAts } from '../store/AtsProvider'
import { bronEffectiviteit } from '../lib/metrics'

/**
 * Metric 3: welk kanaal levert plaatsingen, niet alleen namen. Per vacature te
 * filteren, want over alle opdrachten heen gemiddeld zegt het weinig.
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

  return (
    <div>
      <h1 className="text-2xl font-semibold">Bron-effectiviteit</h1>
      <p className="mt-1 text-sm text-navy-400">Van gescoord naar voorgesteld naar geplaatst.</p>

      <select
        value={vacatureFilter}
        onChange={(event) => setVacatureFilter(event.target.value)}
        className="tik mt-3 w-full rounded-xl border border-lijn bg-white px-3 text-sm"
      >
        <option value="alle">Alle vacatures</option>
        {data.vacatures.map((vacature) => (
          <option key={vacature.id} value={vacature.id}>
            {vacature.Titel}
          </option>
        ))}
      </select>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-lijn bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-lijn text-left text-navy-400">
              <th className="px-4 py-2 font-medium">Bron</th>
              <th className="px-2 py-2 text-right font-medium">Gescoord</th>
              <th className="px-2 py-2 text-right font-medium">Voorgesteld</th>
              <th className="px-4 py-2 text-right font-medium">Geplaatst</th>
            </tr>
          </thead>
          <tbody>
            {rijen.map((rij) => (
              <tr key={rij.bron} className="border-b border-lijn last:border-0">
                <td className="px-4 py-2.5">{rij.bron}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{rij.gescoord}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{rij.voorgesteld}</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{rij.geplaatst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rijen.length === 0 && <p className="mt-6 text-center text-navy-400">Nog geen data.</p>}
    </div>
  )
}
