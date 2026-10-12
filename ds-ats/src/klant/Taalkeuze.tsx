import { TALEN, useTaal } from './i18n'
import type { TaalCode } from './i18n'

/**
 * De taalkeuze van het klantportaal.
 *
 * Twee knoppen en geen keuzelijst: bij twee talen kost een `select` evenveel
 * ruimte en een tik extra. Komt er Duits bij, dan is dit de plek om dat om te
 * zetten.
 *
 * De knop van de huidige taal blijft aantikbaar en draagt `aria-pressed`, zodat
 * een schermlezer de stand voorleest in plaats van alleen twee namen.
 */
export default function Taalkeuze() {
  const { taal, zet, t } = useTaal()

  return (
    <div
      role="group"
      aria-label={t.taal.label}
      className="flex shrink-0 overflow-hidden rounded-lg border border-lijn bg-white"
    >
      {(Object.keys(TALEN) as TaalCode[]).map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={taal === code}
          onClick={() => zet(code)}
          className={`tik px-2.5 text-xs font-medium uppercase ${
            taal === code ? 'bg-navy text-white' : 'text-navy-400'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
