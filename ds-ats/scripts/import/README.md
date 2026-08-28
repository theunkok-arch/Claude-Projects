# Import van de bestaande lijsten

Eenmalig script dat de Brand Manager-lijst (272 rijen), Formulation Technologist
en de acht RA-lijsten inleest, kandidaten matcht of aanmaakt, aanmeldingen maakt
en de oude statussen vertaalt naar de nieuwe pipeline.

## Volgorde

1. **Pas eerst de twee Google Sheets aan** op de besluiten van 28-08 (13.3):
   Nieuw wordt Gescoord, In gesprek splitst in Gereageerd en Gesproken,
   Shortlist blijft, Ingewerkt komt erbij. Zolang dat niet is gebeurd vertaalt
   het script "in gesprek" niet en belandt die rij op Gescoord.
2. **Zorg dat de opdrachtgever en de vacature in de base staan.** Het script
   maakt die niet aan; dat hoort bij de intake. Royal Sanders met Brand Manager
   en Formulation Technologist staan er al in.
3. **Draai droog.** Zonder `--echt` wordt er niets geschreven.
4. **Kijk de tabel "Onbekende statussen" na** en vul ontbrekende varianten aan in
   `status-map.mjs`. Alles wat onbekend blijft wordt Gescoord.
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
| `--echt` | schrijf daadwerkelijk weg |

## Wat het doet

- **Kolommen herkennen** op synoniemen (`status-map.mjs`, `KOLOM_SYNONIEMEN`).
  Het rapport toont welke kolommen zijn herkend en welke genegeerd — kijk die
  lijst na voordat je met `--echt` draait.
- **Dedupen** op LinkedIn-URL, anders op genormaliseerde naam plus woonplaats.
  Zowel binnen het bestand als tegen wat er al in de base staat: een kandidaat
  die op twee RA-lijsten voorkomt wordt één record met twee aanmeldingen.
- **Statussen vertalen** volgens de tabel uit paragraaf 10. Varianten als
  "InMail 2" of "gesprek gepland" worden op prefix herkend.
- **Stagelog vullen** met een startregel per aanmelding, anders zijn doorlooptijd
  en conversie leeg tot de eerste handmatige wijziging.
- **De klok starten**: `Datum in huidige stage` wordt de datumkolom uit de sheet
  als die er is, anders de importdatum. Zonder datumkolom lijkt op dag één dus
  alles vers — dat klopt niet met de werkelijkheid, maar het alternatief
  (iedereen direct over de norm) is erger.

## Rate limits

Airtable staat vijf verzoeken per seconde per base toe. Het script wacht 220ms
tussen verzoeken en schrijft in batches van tien. 272 rijen kost daarmee ruwweg
twintig seconden.

## Testen zonder credentials

`lees.mjs` bevat het lezen en vertalen en raakt het netwerk niet:

```js
import { leesRijen, bouwPlan } from './lees.mjs'
const rijen = await leesRijen('proef.csv')
console.log(bouwPlan(rijen, { vacatureTitel: 'Brand Manager', vandaag: '2026-08-28' }))
```
