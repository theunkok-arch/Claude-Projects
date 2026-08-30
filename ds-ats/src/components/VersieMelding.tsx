import { useEffect, useState } from 'react'
import { nieuweVersie, herstart, ruimHerstartOp } from '../lib/versie'

/**
 * Een strook onder de kopbalk zodra er nieuwer werk is uitgerold.
 *
 * Twee momenten van kijken, en met opzet niet meer. Bij het openen van de app,
 * en zodra het tabblad weer op de voorgrond komt — dat laatste is precies wat
 * er op een telefoon gebeurt: de app blijft dagen open staan en wordt 's
 * ochtends weer opgepakt. Een klok die elke minuut tikt zou hetzelfde doen maar
 * dan honderd keer voor niets.
 *
 * Hij vervangt zichzelf niet automatisch. Wie midden in een formulier zit
 * verliest bij een herstart wat er nog niet bewaard is, en dat mag de app niet
 * voor iemand beslissen.
 */
export default function VersieMelding() {
  const [nieuw, setNieuw] = useState(false)

  useEffect(() => {
    ruimHerstartOp()

    let levend = true
    const kijk = () => {
      if (document.visibilityState !== 'visible') return
      void nieuweVersie().then((er) => {
        if (levend && er) setNieuw(true)
      })
    }

    kijk()
    document.addEventListener('visibilitychange', kijk)
    return () => {
      levend = false
      document.removeEventListener('visibilitychange', kijk)
    }
  }, [])

  if (!nieuw) return null

  return (
    <button
      type="button"
      onClick={herstart}
      className="tik flex w-full items-center justify-center gap-2 border-t border-oranje bg-oranje-50 px-4 text-sm font-medium text-oranje"
    >
      Er is een nieuwe versie — tik om te vernieuwen
    </button>
  )
}
