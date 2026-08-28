/**
 * De knop waarmee een detailscherm in bewerkmodus gaat.
 *
 * Hij was op alle vijf de plekken een klein grijs onderstreept tekstje naast een
 * kop. Dat leest op een telefoon niet als een knop: je moet weten dat hij er is
 * om hem te zien, en op cream met navy-400 valt hij bovendien nauwelijks op.
 * Het is nu een omrande knop met een witte vulling, hetzelfde als de knoppen
 * LinkedIn, Mail en Bellen op het kandidaatscherm — daar twijfelt niemand over.
 *
 * `leeg` telt de invulbare velden die nog leeg zijn. Staat dat getal boven nul,
 * dan zegt de knop dat: het scherm vraagt dan om aanvulling in plaats van alleen
 * de mogelijkheid te bieden. Op het vacaturescherm ontbrak die telling helemaal,
 * waardoor daar niet te zien was dat er nog iets miste.
 */
export default function BewerkKnop({
  open,
  leeg = 0,
  onClick,
  label = 'Bewerken',
}: {
  open: boolean
  leeg?: number
  onClick: () => void
  label?: string
}) {
  const tekst = open ? 'Sluiten' : leeg > 0 ? `${label} · ${leeg} leeg` : label

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`tik inline-flex shrink-0 items-center rounded-xl border px-4 text-sm font-medium ${
        leeg > 0 && !open ? 'border-oranje bg-oranje-50 text-oranje' : 'border-lijn bg-white'
      }`}
    >
      {tekst}
    </button>
  )
}
