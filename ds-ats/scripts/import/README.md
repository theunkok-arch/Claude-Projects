# Import van de bestaande lijsten

Eenmalig script dat de Brand Manager-lijst (272 rijen), Formulation Technologist
en de acht RA-lijsten inleest, kandidaten matcht of aanmaakt, aanmeldingen maakt
en de oude statussen vertaalt naar de nieuwe pipeline.

## Wat er in de sheets staat

Gecontroleerd op 28-08-2026 tegen de twee master-sheets in Drive:

| Sheet | Rijen | Statussen |
|---|---|---|
| `090826_kandidaten_shortlist_compleet` (Brand Manager) | 143 | Afgevallen 86, Benaderd 53, Opgevolgd 2, Voorgesteld 1, **In gesprek 1** |
| `Royal_Sanders_RA_Officer_kandidatenlijst_samengevoegd` | 143 | Benaderd 62, Afgevallen 38, Gescoord 33, Opgevolgd 5, Shortlist 1, **In gesprek 4** |

Goed nieuws: **de sheets zijn al vrijwel omgezet** naar de nieuwe woordenschat
uit 13.3. Beide gebruiken Gescoord, Benaderd, Opgevolgd, Shortlist, Voorgesteld
en Afgevallen, en de kolom `Reden afvallen` staat al vol geldige redenen. Het
script draait er schoon doorheen: nul onbekende statussen, nul onbekende
redenen, nul naambotsingen.

Er is nog één ding te beslissen: **de vijf rijen die op "In gesprek" staan.**
Die status dekt zowel Gereageerd (alleen geantwoord) als Gesproken (echt
gesproken), en juist dat onderscheid maakt het conversiecijfer bruikbaar. Het
script raadt daar niet naar en slaat die rijen over tot je kiest:

| Sheet | Kandidaat |
|---|---|
| Brand Manager | Ine Lenaerts (Kenvue) |
| RA Officer | Wouter Mul (SkinConsult) |
| RA Officer | Dick Bakker (Unilever) |
| RA Officer | Thomas Luijkx, PhD (CARBOGEN AMCIS) |
| RA Officer | Roy Bonnema (Teleon Surgical) |

Zet de status in de sheet zelf goed, of draai met `--in-gesprek Gereageerd`
(of `Gesproken`) als het voor alle rijen hetzelfde is.

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

```bash
cd ds-ats
export AIRTABLE_BASE_ID=appSAz5sjFyPm4e0g
export AIRTABLE_API_KEY=pat_xxx

# droog
node scripts/import/import.mjs \
  --bestand ~/lijsten/brand-manager.xlsx \
  --vacature "Brand Manager" \
  --opdrachtgever "Royal Sanders" \
  --bron "LinkedIn Sales Navigator"

# echt
node scripts/import/import.mjs ... --echt
```

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
tussen verzoeken en schrijft in batches van tien. 143 rijen kost daarmee ruwweg
tien seconden.

Reken vooraf uit wat je gaat opmaken. Elke rij kost drie records:

| | Kandidaten | Aanmeldingen | Stagelog | Totaal |
|---|---|---|---|---|
| Brand Manager | 142 | 142 | 142 | 426 |
| RA Officer | 143 | 143 | 143 | 429 |
| **Samen** | **285** | **285** | **285** | **855** |

Dat is met de vijf In gesprek-rijen meegerekend. Het gratis Airtable-plan stopt
bij 1.000 records per base, dus deze twee lijsten passen er net in en
Formulation Technologist past er niet meer bij. Regel het Team-plan vóór de
import; achteraf migreren is vervelender.

## Testen zonder credentials

`lees.mjs` bevat het lezen en vertalen en raakt het netwerk niet:

```js
import { leesRijen, bouwPlan } from './lees.mjs'
const rijen = await leesRijen('proef.csv')
console.log(bouwPlan(rijen, { vacatureTitel: 'Brand Manager', vandaag: '2026-08-28' }))
```
