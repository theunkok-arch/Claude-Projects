import { Link, useLocation } from 'react-router-dom'
import { useAts } from '../store/AtsProvider'
import { herkomstUit, naamVoorPad } from '../lib/herkomst'

// `tik` alleen is niet genoeg op een <a>: min-height doet niets op een inline
// element. inline-flex maakt er een blokje van, en dan geldt de 44px wel.
const KLAS = 'tik -ml-1 inline-flex items-center px-1 text-sm text-navy-400'

/**
 * De terugknop van de app. Er waren er vijf: een link naar een herbouwde URL,
 * een knop die een filter wist, twee hardgecodeerde links en één navigate(-1),
 * met vier verschillende labels voor hetzelfde gebaar.
 *
 * De keuze: één link, met de bestemming uit de router-state die het vorige
 * scherm meegaf (`useHerkomst`). Een link en geen navigate(-1), want de
 * bestemming hoort zichtbaar te zijn — je moet vóór de tik kunnen lezen waar je
 * uitkomt, en dat kan de geschiedenis je niet vertellen. Wie rechtstreeks
 * binnenkomt — een gedeelde link, een ververste pagina — heeft geen herkomst en
 * valt terug op `naar`: het overzicht waar dit scherm onder hangt.
 *
 * Het label noemt altijd de bestemming, dus "← Royal Sanders" en niet "← Terug".
 */
export default function Terug({ naar, label }: { naar: string; label: string }) {
  const { state } = useLocation()
  const { data } = useAts()

  const herkomst = herkomstUit(state)
  const doel = herkomst ?? naar
  const naam = herkomst ? naamVoorPad(herkomst, data) : label

  return (
    <Link to={doel} className={KLAS}>
      ← {naam}
    </Link>
  )
}

/**
 * De terugknop van een doorgeklikte lijst doet iets wezenlijk anders: hij wist
 * het stagefilter en blijft op hetzelfde scherm staan, bij de cijfers waar de
 * lijst uit voortkwam. Daarom een kruisje en een werkwoord in plaats van een
 * pijl en een schermnaam — anders lijkt het een stap terug in de app terwijl je
 * blijft waar je bent.
 */
export function FilterTerug({ onWis }: { onWis: () => void }) {
  return (
    <button type="button" onClick={onWis} className={KLAS}>
      ✕ Filter wissen
    </button>
  )
}
