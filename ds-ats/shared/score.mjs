// De score: wat hij betekent, en hoe de onderbouwing leesbaar wordt.
//
// Eén bron voor beide kanten van de app. Het interne kandidaatscherm en het
// klantportaal moeten dezelfde grens trekken bij 80, 70, 60 en 50, anders leest
// dezelfde kandidaat bij ons als "sterke fit" en bij de klant als iets anders.
// Dat is dezelfde reden waarom stages in shared/stages.mjs staan.
//
// De banden zijn op 12-10-2026 door Dominique vastgesteld.

/**
 * De vijf banden, van hoog naar laag.
 *
 * `vanaf` is inclusief: 80 is Top fit, 79 is Sterke fit. Kleur en tint zijn
 * hier vastgelegd en niet in een scherm, want ze horen bij de betekenis.
 *
 * Elke band draagt een naam. Kleur alleen zou de band onleesbaar maken voor wie
 * kleuren niet onderscheidt, en een klant die "oranje" ziet weet nog niets.
 */
export const SCORE_BANDEN = [
  { id: 'top', vanaf: 80, label: 'Top fit', kleur: '#15603c', tint: '#e3f2ea' },
  { id: 'sterk', vanaf: 70, label: 'Sterke fit', kleur: '#2f7a5a', tint: '#e8f4ee' },
  { id: 'goed', vanaf: 60, label: 'Goede fit', kleur: '#ad4e0e', tint: '#fbe9dc' },
  { id: 'grens', vanaf: 50, label: 'Grensgeval', kleur: '#8a6a00', tint: '#fbf2d4' },
  { id: 'laag', vanaf: 0, label: 'Niet passend', kleur: '#5b5b7a', tint: '#eceaf0' },
]

/**
 * De band waar een score in valt, of null als er geen score is.
 *
 * Geen score is iets anders dan een lage score: de eerste betekent "nog niet
 * beoordeeld", de tweede "beoordeeld en niet passend". Die twee mogen er nooit
 * hetzelfde uitzien, dus geeft deze functie null en geen laagste band.
 */
export function scoreBand(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return null
  return SCORE_BANDEN.find((band) => score >= band.vanaf) ?? SCORE_BANDEN.at(-1)
}

/*
  Een dimensie in de onderbouwing: een naam, een behaalde waarde, een maximum en
  soms een toelichting achter een dubbele punt.

  De tekst komt uit de search en is niet in één vorm geschreven. In de base
  staan onder meer:

    "Senioriteit 10/15. Locatie 0/15: Leusden buiten corridor. Switching 4/10."
    "Core 55/60, custom 32/40. A Flexbranche 25/25; B Inspectie/norm 10/15"
    "RA Specialist bij Keune. Directe concurrent. Reistijd ~85 min."

  De eerste twee zijn te ontleden, de derde is gewoon proza. Daarom zoekt deze
  functie naar het enige dat betrouwbaar een dimensie aanwijst, een breuk als
  10/15, en laat al het andere ongemoeid staan als losse tekst. Nooit gokken en
  nooit iets weglaten: wat niet te ontleden valt hoort er nog steeds te staan.
*/
const DIMENSIE = /([^.;,]*?)\s*(\d+(?:[.,]\d+)?)\s*\/\s*(\d+)/g

/**
 * Ontleedt de score-onderbouwing in dimensies plus de rest.
 *
 * Geeft `{ dimensies, rest }`. `rest` is alles wat geen dimensie was, in de
 * volgorde waarin het stond, samengevoegd tot één regel.
 */
export function scoreRegels(onderbouwing) {
  const tekst = typeof onderbouwing === 'string' ? onderbouwing.trim() : ''
  if (!tekst) return { dimensies: [], rest: '' }

  const dimensies = []
  const stukken = []
  let eind = 0

  for (const treffer of tekst.matchAll(DIMENSIE)) {
    const [geheel, naamRuw, behaaldRuw, maxRuw] = treffer
    const naam = naamRuw.trim().replace(/^[-–•*]\s*/, '')
    const behaald = Number(behaaldRuw.replace(',', '.'))
    const max = Number(maxRuw)

    // Een breuk zonder naam of zonder maximum zegt niets. Laat hem dan in de
    // tekst staan in plaats van er een lege bullet van te maken.
    if (!naam || !(max > 0)) continue

    stukken.push(tekst.slice(eind, treffer.index))
    eind = treffer.index + geheel.length

    // Een toelichting staat achter een dubbele punt, tot de volgende scheiding.
    const staart = tekst.slice(eind)
    const uitleg = /^\s*:\s*([^.;]+)/.exec(staart)
    let toelichting = ''
    if (uitleg) {
      toelichting = uitleg[1].trim()
      eind += uitleg[0].length
    }

    dimensies.push({ naam, behaald, max, toelichting, deel: max > 0 ? behaald / max : 0 })
  }

  stukken.push(tekst.slice(eind))
  const rest = stukken
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)[.;,]+(?=\s|$)/g, '')
    .replace(/\s+([.,;])/g, '$1')
    .trim()
    .replace(/^[.;,\s]+/, '')

  return { dimensies, rest }
}
