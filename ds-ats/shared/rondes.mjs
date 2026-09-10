// Aanmeldingen gegroepeerd op de zoekronde waarin ze binnenkwamen.
//
// Zusje van partijen.mjs, en bewust een apart bestand: een partij is de dag
// waarop een agent aanleverde, een ronde is de search waar de kandidaat uit
// komt. Die twee lopen uiteen zodra je een oudere ronde alsnog importeert. Op
// 10-09 kwamen er 83 aanmeldingen binnen op één dag: 37 uit ronde 1, die er per
// abuis nooit in waren gezet, en 46 uit de verse ronde 3. Eén partijchip, twee
// totaal verschillende lijsten. Zonder dit onderscheid moet je ze op naam uit
// elkaar houden.
//
// De ronde hoort bij de aanmelding en niet bij de kandidaat: dezelfde persoon
// kan bij een andere vacature in een andere ronde terugkomen, en dat is dan
// echt een andere aanmelding.
//
// Los van Bron. Bron is het kanaal (Sales Navigator, Indeed), de ronde is het
// moment. Ze door elkaar halen vervuilt het bronrapport: in ronde 1 en ronde 3
// is Sales Navigator allebei het kanaal.

/** Wat de ronde-chips tonen: een label en hoeveel er onder vallen. */

/**
 * Tel de aanmeldingen per zoekronde, hoogste ronde eerst.
 *
 * Aanmeldingen zonder ronde vallen buiten elke groep, net als bij partijen.
 * Een chip "onbekend" beantwoordt de vraag "wat kwam er uit ronde 3" niet, en
 * leeg betekent hier "niet vastgelegd", niet "ronde 1".
 */
export function rondes(aanmeldingen) {
  const per = new Map()
  for (const aanmelding of aanmeldingen ?? []) {
    const ronde = aanmelding?.Zoekronde
    if (typeof ronde !== 'string' || ronde.trim() === '') continue
    const naam = ronde.trim()
    per.set(naam, (per.get(naam) ?? 0) + 1)
  }
  return [...per].map(([ronde, aantal]) => ({ ronde, aantal })).sort(vergelijk)
}

/**
 * Hoogste ronde eerst, want de nieuwste search is waar je aan werkt.
 *
 * Sorteren op tekst zou "Ronde 10" tussen 1 en 2 zetten. Daarom eerst op het
 * getal in de naam, en pas als dat er niet is (of gelijk) op de tekst zelf.
 * Zo blijft een ronde met een naam in plaats van een nummer ook op een vaste
 * plek staan in plaats van te zwerven.
 */
function vergelijk(a, b) {
  const na = nummer(a.ronde)
  const nb = nummer(b.ronde)
  if (na !== null && nb !== null && na !== nb) return nb - na
  if (na !== null && nb === null) return -1
  if (na === null && nb !== null) return 1
  return a.ronde.localeCompare(b.ronde, 'nl')
}

/** Het eerste getal in de naam, of null. "Ronde 3" -> 3. */
function nummer(ronde) {
  const treffer = /\d+/.exec(ronde)
  return treffer ? Number.parseInt(treffer[0], 10) : null
}

/**
 * Hoeveel ronde-chips op het scherm passen.
 *
 * Lager dan MAX_PARTIJEN: een vacature krijgt er een paar rondes bij, geen
 * tientallen, en deze rij staat onder die van de partijen. Twee rijen die
 * allebei horizontaal scrollen kosten meer eerste scherm dan ze opleveren.
 */
export const MAX_RONDES = 4
