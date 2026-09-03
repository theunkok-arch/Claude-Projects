// De vertaaltabellen tussen kandidaten.xlsx en de ATS, uit één bestand.
//
// config/ats-mapping.json is een kopie van ds-framework/config/ats-mapping.json.
// Daar staat de canonieke versie; hier staat hij zodat het importscript en het
// Netlify-eindpunt dezelfde vertaling gebruiken. Ze deden dat niet: het
// eindpunt had zijn eigen lijst gebeurtenissen en het importscript zijn eigen
// STATUS_MAP, en die twee zijn uit elkaar gelopen. De duurste afwijking was
// xlsx-Status "Shortlist", die hier op Gescoord hoort te landen en in de import
// op Shortlist terechtkwam — vier treden te ver, precies de verwisseling die
// eerder 25 kandidaten in de verkeerde fase zette.
//
// Het bestand wordt als module geïmporteerd en niet van schijf gelezen. Een
// Netlify Function draait uit een bundel; readFileSync zou daar een pad zoeken
// dat niet bestaat, en dan pas in productie omvallen.

import mapping from '../config/ats-mapping.json' with { type: 'json' }
import { STAGE_IDS } from './stages.mjs'

export const MAPPING_VERSIE = mapping.versie

/** Sleutels die uitleg zijn en geen vertaling. */
const GEEN_VERTALING = new Set(['toelichting'])

const zonderUitleg = (object) =>
  Object.fromEntries(Object.entries(object ?? {}).filter(([sleutel]) => !GEEN_VERTALING.has(sleutel)))

/** Wat een skill meldt → de stage die het eindpunt zet. Elf gebeurtenissen. */
export const GEBEURTENISSEN = zonderUitleg(mapping.gebeurtenissen)

/** xlsx-Status → ATS-Stage, alleen bij import. */
export const IMPORT_STAGES = zonderUitleg(mapping.stage_mapping?.xlsx_naar_ats_bij_import)

/** ATS-Stage → xlsx-Status, voor het terugschrijven naar de werkkopie. */
export const XLSX_STATUS = zonderUitleg(mapping.stage_mapping?.ats_naar_xlsx)

/**
 * Bronpatronen, op volgorde. Dit zijn substrings en geen reguliere
 * expressies: het bestand wordt ook door Python gelezen, en een regex die in
 * de ene taal werkt en in de andere net anders is, is precies het soort
 * verschil dat dit bestand moet uitsluiten.
 */
export const BRON_PATRONEN = mapping.bron_mapping?.patronen ?? []
export const BRON_DEFAULT = mapping.bron_mapping?._default ?? 'Overig'

/** xlsx-statussen die niet vanzelf mee mogen in een import. */
export const NIET_IMPORTEREN = mapping.stage_mapping?.niet_importeren?.statussen ?? []

/*
  Een typefout in een stagenaam in de JSON levert geen foutmelding op maar een
  waarde die Airtable niet kent, en die belandt dan als nieuwe optie in de
  keuzelijst of stilzwijgend nergens. Beter meteen omvallen, bij het laden, dan
  halverwege een import van vijfhonderd rijen.
*/
for (const [naam, tabel] of [
  ['gebeurtenissen', GEBEURTENISSEN],
  ['stage_mapping.xlsx_naar_ats_bij_import', IMPORT_STAGES],
]) {
  for (const [sleutel, stage] of Object.entries(tabel)) {
    if (!STAGE_IDS.includes(stage)) {
      throw new Error(
        `ats-mapping.json: ${naam}."${sleutel}" wijst naar "${stage}", en dat is geen stage van de ATS.`,
      )
    }
  }
}
