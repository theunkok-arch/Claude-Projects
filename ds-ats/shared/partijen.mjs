// Aanmeldingen gegroepeerd op de dag waarop ze zijn toegevoegd.
//
// De agents leveren in partijen aan, niet druppelsgewijs: op 28-08 kwamen er
// 497 binnen, op 31-08 nog 54 en op 02-09 nog 49. Een venster als "de laatste
// zeven dagen" valt daar steeds naast. De ochtend na een run is "7 dagen" de
// hele base en "vandaag" nul, terwijl de vraag "wat heeft mijn agent gisteren
// gebracht" precies één van die dagen bedoelt.
//
// Vandaar de dag zelf als filter. `Datum aangemaakt` staat op de aanmelding en
// niet op de kandidaat: iemand die al een jaar in de base staat maar vandaag
// pas aan deze vacature is gekoppeld, is voor deze opdracht wel degelijk nieuw.

/** Een ISO-datum zonder tijd. Alles wat daar niet aan voldoet is geen partij. */
const ISO_DAG = /^\d{4}-\d{2}-\d{2}$/

/**
 * Tel de aanmeldingen per dag, nieuwste eerst.
 *
 * Aanmeldingen zonder datum vallen buiten elke partij in plaats van in een
 * verzamelbak: een chip "onbekend" is geen antwoord op "wat kwam er gisteren
 * binnen", en zou de telling van de echte dagen vertroebelen.
 */
export function partijen(aanmeldingen) {
  const per = new Map()
  for (const aanmelding of aanmeldingen ?? []) {
    const datum = aanmelding?.['Datum aangemaakt']
    if (typeof datum !== 'string' || !ISO_DAG.test(datum)) continue
    per.set(datum, (per.get(datum) ?? 0) + 1)
  }
  // ISO-datums sorteren als tekst in dezelfde volgorde als in de tijd.
  return [...per]
    .map(([datum, aantal]) => ({ datum, aantal }))
    .sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0))
}

/** De dag van de laatste aanlevering, of null als er geen bruikbare datum is. */
export function nieuwstePartij(aanmeldingen) {
  return partijen(aanmeldingen)[0]?.datum ?? null
}

/**
 * Hoeveel partijen als chip op het scherm passen.
 *
 * Er komt er een bij per agent-run, dus zonder grens groeit die rij eindeloos.
 * Zes dekt de recente runs; wat ouder is bereik je met "Alles". Ze staan toch
 * al in een rij die horizontaal scrollt, maar een rij van tweehonderd chips is
 * geen filter meer.
 */
export const MAX_PARTIJEN = 6
