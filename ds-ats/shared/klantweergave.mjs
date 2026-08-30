// Wat een opdrachtgever van een kandidaat te zien krijgt.
//
// Eén bron, om dezelfde reden als shared/stages.mjs: dit wordt op twee plekken
// gebruikt die het eens moeten zijn. De portal bouwt er zijn antwoord mee, en
// het aanmeldingsscherm in de ATS laat er Dominique mee zien wat de klant nu
// werkelijk ziet. Zouden die twee uit elkaar lopen, dan staat er op haar scherm
// iets anders dan bij de klant — en dat is precies het soort verschil waar
// niemand achter komt tot een kandidaat belt.
//
// Er stond al een `initialen` in src/lib/format.ts, met een andere uitkomst:
// die maakt van "Jan de Vries" JD en van "Jaap Jan van der Berg" JJ, want hij
// pakt de eerste twee woorden. Dat is bruikbaar voor een avatar, niet voor een
// kandidaat die anoniem hoort te blijven — daar hoort de achternaam bij, niet
// het tussenvoegsel. Die functie werd nergens gebruikt en is verwijderd.

/**
 * "Jan de Vries" wordt "J.V." — voornaam en achternaam, tussenvoegsels eruit.
 * Eén naam wordt "C." Een lege naam wordt "?", want een lege plek op het scherm
 * leest als een fout in de app in plaats van als een ontbrekend gegeven.
 */
export function initialen(naam) {
  const delen = String(naam ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (delen.length === 0) return '?'
  const eerste = delen[0][0]
  const laatste = delen.length > 1 ? delen[delen.length - 1][0] : ''
  return [eerste, laatste]
    .filter(Boolean)
    .map((letter) => `${letter.toUpperCase()}.`)
    .join('')
}

/**
 * De regel die de opdrachtgever van deze kandidaat ziet.
 *
 * `vrijgegeven` is het veld `Zichtbaar voor klant` op de aanmelding. Staat het
 * uit, dan komen naam, werkgever en woonplaats er niet in voor — niet verborgen
 * in de opmaak, maar afwezig in de tekst.
 */
export function klantZiet(kandidaat, vrijgegeven) {
  const velden = kandidaat ?? {}
  const rol = velden['Huidige rol'] ?? null

  if (!vrijgegeven) {
    return { kop: initialen(velden.Naam), regel: rol, anoniem: true }
  }
  return {
    kop: velden.Naam ?? initialen(velden.Naam),
    regel: [rol, velden['Huidige werkgever'], velden.Woonplaats].filter(Boolean).join(' · ') || null,
    anoniem: false,
  }
}
