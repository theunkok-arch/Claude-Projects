# Import van de bestaande lijsten

Eenmalig script dat de Brand Manager-lijst (272 rijen), Formulation Technologist
en de acht RA-lijsten inleest, kandidaten matcht of aanmaakt, aanmeldingen maakt
en de oude statussen vertaalt naar de nieuwe pipeline.

## Wat er in de sheets staat

Geteld op 28-08-2026 op de echte CSV-export van beide sheets:

| Sheet | Vacature | Rijen |
|---|---|---|
| `090826_kandidaten_shortlist_compleet` | Brand Manager | **272** |
| `Royal_Sanders_RA_Officer_kandidatenlijst_samengevoegd` | Regulatory Affairs Officer | **159** |

Geen enkele persoon staat op beide lijsten, dus 431 unieke kandidaten.

Stageverdeling na vertaling:

| | Brand Manager | RA Officer |
|---|---|---|
| Afgevallen | 127 | 41 |
| Benaderd | 71 | 75 |
| Gescoord | 69 | 33 |
| Opgevolgd | 2 | 5 |
| Gesproken | 2 | 4 |
| Voorgesteld | 1 | — |
| Shortlist | — | 1 |

De sheets zijn al vrijwel omgezet naar de nieuwe woordenschat uit 13.3. Het
script draait er schoon doorheen: nul onbekende statussen, nul onbekende
redenen, nul naambotsingen. De twee resterende oude termen worden automatisch
vertaald: `Nieuw` (69x, Brand Manager) wordt Gescoord, en `Afgewezen` (1x) wordt
Afgevallen met reden "Afgewezen door ons (profielcheck)".

De zes rijen op `In gesprek` (2 Brand Manager, 4 RA) zijn op 28-08 door
Dominique vastgesteld als **Gesproken**; draai daarom met
`--in-gesprek Gesproken`.

### Lees de sheet, niet de tekstweergave

Bij het bouwen van dit script zijn de sheets eerst via de natuurlijketaal-weergave
van de Google Drive-koppeling gelezen. Die weergave **liet rijen weg**: 143 in
plaats van 272 en 159. Alle cijfers die daarop gebaseerd waren, klopten niet.

Gebruik dus altijd de echte export:

- in Drive: `download_file_content` met `exportMimeType: text/csv`, niet
  `read_file_content`;
- met de hand: Bestand → Downloaden → CSV.

Beide leveren byte-identieke inhoud; dat is nagerekend.

## Volgorde

1. **Beslis over de vijf "In gesprek"-rijen** hierboven.
2. **Exporteer de sheet** naar `.xlsx` of `.csv`. Het script leest geen Google
   Sheet rechtstreeks.
3. **Zorg dat de opdrachtgever en de vacature in de base staan.** Het script
   maakt die niet aan; dat hoort bij de intake. Royal Sanders met Brand Manager
   en Formulation Technologist staan er al in. De RA-vacature moet nog worden
   aangemaakt.
4. **Draai droog.** Zonder `--echt` wordt er niets geschreven. Kijk het rapport
   na: herkende kolommen, bron-vertaling, onbekende statussen.
5. **Draai met `--echt`.**

## Gebruik

### Windows (CMD)

In CMD bestaat `export` niet en `~` ook niet. Gebruik `set`, en zet elk
commando op één regel.

```bat
:: eenmalig: repo ophalen (of `git pull origin main` als je hem al hebt)
cd /d "%USERPROFILE%\Documents"
git clone https://github.com/theunkok-arch/Claude-Projects.git
cd Claude-Projects\ds-ats
npm install

:: per sessie: variabelen zetten
set AIRTABLE_BASE_ID=appSAz5sjFyPm4e0g
set AIRTABLE_API_KEY=pat_jouw_sleutel_hier

:: droge run, alles op één regel
node scripts/import/import.mjs --bestand "C:\pad\naar\lijst.csv" --vacature "Brand Manager" --opdrachtgever "Royal Sanders" --in-gesprek Gesproken

:: echt wegschrijven: zet --echt er achter
```

Staat er een spatie in het pad, zet het dan tussen aanhalingstekens. Dat geldt
ook voor `"Brand Manager"` en `"Royal Sanders"`.

### Windows (PowerShell)

```powershell
cd "$env:USERPROFILE\Documents\Claude-Projects\ds-ats"
$env:AIRTABLE_BASE_ID = "appSAz5sjFyPm4e0g"
$env:AIRTABLE_API_KEY = "pat_jouw_sleutel_hier"
node scripts/import/import.mjs --bestand "C:\pad\naar\lijst.csv" --vacature "Brand Manager" --opdrachtgever "Royal Sanders" --in-gesprek Gesproken
```

### macOS en Linux

```bash
cd ~/claude-projects/ds-ats
npm install

export AIRTABLE_BASE_ID=appSAz5sjFyPm4e0g
export AIRTABLE_API_KEY=pat_jouw_sleutel_hier

node scripts/import/import.mjs \
  --bestand ~/Downloads/lijst.csv \
  --vacature "Brand Manager" \
  --opdrachtgever "Royal Sanders" \
  --in-gesprek Gesproken
```

### Werkt het niet?

| Melding | Wat er aan de hand is |
|---|---|
| `'export' is not recognized` | Je zit in CMD. Gebruik `set NAAM=waarde`. |
| `'node' is not recognized` | Node.js staat er niet op. Installeer de LTS van nodejs.org en open een nieuwe terminal. |
| `The system cannot find the path specified` | Het pad klopt niet, of er staat een spatie in zonder aanhalingstekens. |
| `Zet AIRTABLE_BASE_ID en AIRTABLE_API_KEY in de omgeving.` | De variabelen zijn leeg. In CMD gelden ze alleen in hetzelfde venster waarin je `set` hebt gedaan. |
| `Opdrachtgever "..." staat niet in de base` | Naam moet exact matchen: `Royal Sanders`. |
| `403 Host not in allowlist` | Alleen binnen de Claude-omgeving; op je eigen machine krijg je dit niet. |

| Optie | Betekenis |
|---|---|
| `--bestand` | pad naar `.xlsx` of `.csv` (puntkomma of komma) |
| `--tab` | tabnaam in de xlsx; standaard het eerste blad |
| `--vacature` | titel zoals hij in de base staat |
| `--opdrachtgever` | naam zoals hij in de base staat |
| `--bron` | terugvalbron als de sheet geen bronkolom heeft |
| `--in-gesprek` | `Gereageerd` of `Gesproken`; zonder deze optie worden die rijen overgeslagen |
| `--echt` | schrijf daadwerkelijk weg |

## Wat het doet

- **Kolommen herkennen** op synoniemen (`status-map.mjs`, `KOLOM_SYNONIEMEN`).
  Het rapport toont welke kolommen zijn herkend en welke genegeerd — kijk die
  lijst na voordat je met `--echt` draait.
- **Dedupen** op LinkedIn-URL, anders op genormaliseerde naam plus woonplaats.
  Zowel binnen het bestand als tegen wat er al in de base staat: een kandidaat
  die op twee lijsten voorkomt wordt één record met twee aanmeldingen.

  Let op de grens hiervan. De Brand Manager-lijst bevat vrijwel alleen Sales
  Navigator-links (`/sales/lead/ACwAAE…`), de RA-lijst een mix van die vorm en
  gewone `/in/`-profielen. Dat zijn twee verschillende id-ruimtes: dezelfde
  persoon onder beide vormen wordt **niet** herkend als dubbel. Vandaar de
  extra melding "zelfde naam, andere sleutel" in het rapport — die voegt niks
  samen, maar wijst je op wat je zelf moet nakijken. In de huidige twee lijsten
  is de naamoverlap nul, dus dit bijt nu nog niet.

  Een URL zonder id (`https://www.linkedin.com/sales/`) telt niet als sleutel;
  die zou anders tientallen mensen tot één record samenvouwen.
- **Statussen vertalen** volgens de tabel uit paragraaf 10. Varianten als
  "InMail 2" of "gesprek gepland" worden op prefix herkend.
- **Stagelog vullen** met een startregel per aanmelding, anders zijn doorlooptijd
  en conversie leeg tot de eerste handmatige wijziging.
- **De klok starten**: `Datum in huidige stage` wordt de datumkolom uit de sheet
  als die er is, anders de importdatum. Zonder datumkolom lijkt op dag één dus
  alles vers — dat klopt niet met de werkelijkheid, maar het alternatief
  (iedereen direct over de norm) is erger.

- **Bron normaliseren.** De bronkolom is vrije tekst — 44 varianten in de
  RA-lijst alleen al ("linkedin-salesnav-direct", "Bron 3 - NCV team",
  "LinkedIn search junior RA (batch 17-07)"). Die worden teruggevouwen op de
  keuzelijst in Airtable, en het dry-run-rapport laat de hele vertaaltabel zien
  zodat je kunt corrigeren voordat je schrijft.
- **Reden overnemen uit de sheet.** De kolom `Reden afvallen` wint van de reden
  die uit de statusvertaling rolt. Toelichtingen tussen haakjes worden
  afgekapt: "Timing (net nieuwe baan, niet op zoek)" wordt "Timing".

## Rate limits en recordaantallen

Airtable staat vijf verzoeken per seconde per base toe. Het script wacht 220ms
tussen verzoeken en schrijft in batches van tien. 431 rijen kost daarmee ruwweg
een halve minuut.

Elke rij kost drie records:

| | Kandidaten | Aanmeldingen | Stagelog | Totaal |
|---|---|---|---|---|
| Brand Manager | 272 | 272 | 272 | 816 |
| RA Officer | 159 | 159 | 159 | 477 |
| Bestaand (opdrachtgever + vacatures) | | | | 4 |
| **Samen** | **431** | **431** | **431** | **1297** |

**Het gratis Airtable-plan stopt bij 1.000 records per base.** Deze twee lijsten
passen daar niet in: je komt 297 records tekort. Upgrade naar het Team-plan
(circa 20 dollar per gebruiker per maand) vóór de import. Halverwege tegen de
limiet aanlopen laat de base in een halve staat achter.

Wil je toch eerst klein beginnen: importeer alleen de RA-lijst (477 records,
past wel), en doe Brand Manager na de upgrade.

---

# Bijwerken vanuit de Drive (`sync.mjs`)

De import hierboven vult een lege base. Daarna verandert de waarheid op twee
plekken tegelijk: Dominique werkt in de app, en zij werkt in de kandidatensheets
in de Drive. `sync.mjs` legt een sheet naast de base en laat het verschil zien.

```bash
node scripts/import/sync.mjs plan \
  --sheet ~/Downloads/090826_kandidaten_shortlist_compleet.csv \
  --vacature "Brand Manager" \
  --huidig huidig.json \
  --bestand-id 1AbC… --bestand-naam "090826_kandidaten_shortlist_compleet" \
  --gewijzigd 2026-08-27T09:12:00Z

node scripts/import/sync.mjs kandidaten 1   --bevestigd-door "Dominique"
node scripts/import/sync.mjs aanmeldingen 1 --bevestigd-door "Dominique"
node scripts/import/sync.mjs wijzigingen 1  --bevestigd-door "Dominique"
```

`huidig.json` is een uitdraai van de base (Airtable-koppeling, of een export):

```json
{ "kandidaten":   [{ "id": "rec…", "Naam": "…", "LinkedIn-URL": "…", "Woonplaats": "…" }],
  "aanmeldingen": [{ "id": "rec…", "kandidaatId": "rec…", "vacature": "Brand Manager",
                     "Stage": "Benaderd", "Reden afvallen": null }] }
```

## Vooruit wel, terug niet

Dat is de hele regel. Een sheet mag iemand verder in de trechter zetten, nooit
terug. Staat de app op Gesproken en het blad nog op Benaderd, dan is de app bij
en het blad achter — dan zou toepassen werk weggooien dat iemand met de hand
heeft gedaan. Drie categorieën worden daarom **gemeld en niet toegepast**:

| Gemeld als | Wanneer |
|---|---|
| Blad wijst terug in de trechter | `Voorgesteld` in de base, `Benaderd` in het blad |
| Blad haalt een afvaller terug | `Afgevallen` in de base, actief in het blad |
| Afgevallen zonder geldige reden | de server weigert dat toch, dus dat gebeurt hier al |

Ook gemeld, maar zonder actie: wie wél in de base staat en niet meer in het
blad. Dat is bijna altijd een blad dat is opgesplitst, geen verdwenen kandidaat,
dus `sync.mjs` verwijdert nooit iets.

## Welk bestand? `--bevestigd-door` is geen formaliteit

De mappen op de Drive zijn geen archief maar een werkplek, en dat is te zien:

- de mapindeling is niet uniform. Royal Sanders heeft een submap per vacature
  (`BrandManager`, `RegulatoryAffairs_Agent_Search_Match`,
  `FormTechRD_Agent_Search_Match`, `Account_Assistente_Sales`), Normec heeft er
  één (`SNA inspecteur`), en bij Verhaeg staat de sheet los in de klantmap;
- de namen zijn niet uniform: `090826_kandidaten_shortlist_compleet`,
  `090726_kandidaten_batch1-4`, `090726 kandidaten batch1`, `kandidaten`,
  `kandidaten 1707`, `Royal_Sanders_RA_Officer_kandidatenlijst_batch7`,
  `warm-gesprek-kandidaten`;
- er staan afleiders tussen: `_OLD`, `_DONTUSE`, `Kopie van …`;
- **de lijst die deze base gevuld heeft staat niet in de klantmap.**
  `Royal_Sanders_RA_Officer_kandidatenlijst_samengevoegd` staat in de hoofdmap
  van de Drive. Een script dat "het nieuwste bestand in de vacaturemap" pakt,
  had juist die gemist.

Daarom kiest niets hier automatisch. `plan` legt vast wélk bestand is gelezen —
id, naam en `modifiedTime` — en `kandidaten`, `aanmeldingen` en `wijzigingen`
weigeren te draaien zonder `--bevestigd-door`. Die naam en de bestandsgegevens
komen als commentaarregel boven elke batch mee te staan, zodat over een maand
nog te zien is waar een stand vandaan komt.

De werkwijze is dus: zoek de kandidaten voor deze vacature, laat Dominique
aanwijzen welke de actuele is, en draai daar `plan` op.

## Andere opdrachtgevers, andere kolommen

Niet elke klant gebruikt hetzelfde blad. Royal Sanders schrijft
`Totaal (100)` en `Bron-URL`, Verhaeg schrijft `Score (totaal)`, `LinkedIn URL`
en `Instagram/facebook account`. `bouwKolomIndex` doet daarom twee passes:
eerst exact, dan nog eens met de toelichting tussen haakjes weggelaten. Zo wint
`Totaal (100)` nog steeds van `Score core (60)`, en valt `Score (totaal)` niet
stilzwijgend weg.

Kijk het regeltje **genegeerde kolommen** in het rapport altijd na. Dat is de
plek waar een kolom die je wél wilde meenemen zichtbaar wordt.
