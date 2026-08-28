# Do Solutions ATS

Mobile-first pipeline voor de searches van Do Solutions, op Airtable met een
Netlify-frontend. Gebouwd volgens `bouwspecificatie v2` (28-08-2026).

Het kernidee: **een kandidaat bestaat één keer, een aanmelding koppelt hem aan
één vacature.** De stage hoort altijd bij de aanmelding, nooit bij de kandidaat.
Naomi kan Afgevallen zijn op RA Officer en tegelijk Gescoord op de volgende
opdracht. Dat lost de dubbelingen in de acht RA-lijsten definitief op.

---

## Wat er staat

| Fase | Onderdeel | Status |
|---|---|---|
| 1 | Airtable-base, keuzelijsten, formules, validaties | ✅ live |
| 1 | Importscript met statusvertaling en dedupe | ✅ klaar, nog niet gedraaid |
| 1 | AVG: bewaartermijn, verwijderfunctie, privacyverklaring | ✅ |
| 2 | Maandagoverzicht, vacatures, vacature-detail, kandidaat-detail | ✅ |
| 2 | Stagewijziging vanaf mobiel (twee taps) | ✅ |
| 3 | Klantrapport met funnel, reden-analyse, doorlooptijd, PDF | ✅ |
| 4 | Scorecards-UI, CV-upload, koppeling contactformulier | ⬜ niet gebouwd |

Fase 4 staat bewust open. De tabellen `Scorecards` en `Beoordelingen` bestaan al
in de base, zodat je ze handmatig kunt vullen zonder later te hoeven migreren.

---

## Airtable

Base: **`appSAz5sjFyPm4e0g`** — "Do Solutions ATS" in workspace `wsp624CfW8Eop0hmY`.

> Niet te verwarren met `appMLC8Zv6wqnYUdu` ("Do Solutions Kandidaten"), de
> inzendingen van het contactformulier op dosolutions.info. Die koppeling is
> fase 4.

### Tabellen

| Tabel | Rol |
|---|---|
| `Opdrachtgevers` | Klanten. Bevat `Portal-token` voor `/rapport/{token}`. |
| `Contactpersonen` | Wie je spreekt bij de klant, met `Is hiring manager`. |
| `Vacatures` | De opdracht. Salarisband, streefdatum shortlist, rollups. |
| `Kandidaten` | Eén record per persoon. Nooit een stage. |
| `Aanmeldingen` | Kandidaat × vacature. Stage, score, dagen in stage. |
| `Activiteiten` | Handmatig gelogd contact plus automatische statuswijzigingen. |
| `Stagelog` | Elke overgang. Levert doorlooptijd en conversie zonder handwerk. |
| `Scorecards` | Vijf outcomes per vacature. |
| `Beoordelingen` | Score per outcome per beoordelaar. |

### Formules die het werk doen

Op **Aanmeldingen**:

- `Dagen in stage` — kalenderdagen sinds de laatste wijziging. Dit is het getal
  op de kaart.
- `Werkdagen in stage` — hetzelfde in werkdagen, want de normen uit 3.3 zijn in
  werkdagen uitgedrukt.
- `Norm werkdagen` — 5 / 5 / 12 / 3 / 5 / 5 / 5 / 10 per stage, 0 waar geen norm geldt.
- `Norm overschreden` — 1 zodra het te lang duurt. Voedt de signalering.
- `Reden ontbreekt` — 1 bij Afgevallen zonder reden. Filter hierop voor de
  weergave "Reden ontbreekt".
- `Is actief` / `Is geplaatst` / `Is afgevallen` — voeden de rollups op Vacatures.

Op **Vacatures**: `Aantal aanmeldingen`, `Actief in pipeline`, `Aantal geplaatst`,
`Aantal afgevallen`, `Op te volgen`, en `Validatie` — die laatste meldt
"Salarisbandbreedte ontbreekt" zodra de status op Actief staat zonder band. Dat
is fout vier uit het playbook, en de app toont die melding rood op de
vacaturekaart.

Op **Kandidaten**: `Bewaren tot` (laatste contact + 12 maanden),
`Bewaartermijn verstreken` en `Dedupe-sleutel` (LinkedIn-URL, anders naam +
woonplaats).

### Eén afwijking van de specificatie

De spec vraagt om **rollups per stage** op Vacatures. Airtable-rollups kunnen
niet filteren op een voorwaarde, dus dat zou elf hulpformules plus elf rollups
kosten die daarna nooit meer synchroon lopen met de app. In plaats daarvan:

- de funnel per stage wordt in de app berekend (`src/lib/metrics.ts`) en in het
  klantrapport server-side (`netlify/functions/rapport.mjs`);
- in Airtable krijg je dezelfde cijfers door de weergave op `Aanmeldingen` te
  groeperen op `Stage` — dat is de idiomatische Airtable-oplossing;
- de rollups die er wél toe doen over alle stages heen (actief, geplaatst,
  afgevallen, op te volgen) staan er wel.

### Weergaven om nog aan te maken

Handmatig in Airtable, vijf minuten werk:

1. **Reden ontbreekt** op `Aanmeldingen`, filter `Reden ontbreekt = 1`.
2. **Op te volgen** op `Aanmeldingen`, filter `Norm overschreden = 1`, gesorteerd
   op `Dagen in stage` aflopend.
3. **Funnel** op `Aanmeldingen`, gegroepeerd op `Stage`.
4. **AVG-opschoning** op `Kandidaten`, filter `Bewaartermijn verstreken = 1`.

---

## De app

Vite + React 19 + TypeScript + Tailwind v4. Ontworpen op 375px.

| Route | Scherm |
|---|---|
| `/` | Maandagoverzicht — per stage de actieve kandidaten, dagen in stage, volgende actie |
| `/vacatures` | Alle vacatures met funnel en aantallen |
| `/vacature/:id` | Funnel, reden-analyse, kandidatenlijst met snelle stagewijziging |
| `/kandidaat/:id` | Gegevens, alle aanmeldingen, historie, contact loggen, AVG-verwijderen |
| `/bronnen` | Bron-effectiviteit: van gescoord naar voorgesteld naar geplaatst |
| `/rapport/:token` | Klantrapport, geen login |
| `/privacy` | Privacyverklaring voor kandidaten, publiek |

Interactieregels uit de spec die in code zitten:

- kandidaatkaarten, geen brede tabellen;
- stage wijzigen in twee taps via een bottom sheet;
- bij Afgevallen verschijnt de redenlijst direct en is die verplicht — de
  server weigert Afgevallen zonder geldige reden;
- raakvlakken minimaal 44px (`tik`-utility), sticky filterbalk, geen
  hover-afhankelijke interactie;
- kaarten met meer dan tien dagen in stage krijgen een oranje rand, en wie de
  servicenorm van zijn eigen stage overschrijdt krijgt daarnaast oranje tekst.

Huisstijl: navy `#1A1A2E`, oranje `#E8722A`, cream `#FCF5EE`, Poppins.
Stage-badges volgen 7. Shortlist stond niet in de kleurenlijst; die kreeg oranje
gevuld, zodat hij zichtbaar tussen Gesproken en Voorgesteld in valt.

---

## Toegang en privacy

Dit systeem bevat gegevens van honderden mensen die zich nooit hebben aangemeld.
Dat is volgens 12 de grootste juridische blootstelling, dus:

- **De interne app zit achter één gedeeld wachtwoord** (`ATS_APP_PASSWORD`).
  Niet omdat er meerdere gebruikers zijn — die zijn er niet, zie 13.1 — maar
  omdat een open proxy naar de base niet verdedigbaar is.
- **De Airtable-key staat uitsluitend in de Netlify-omgevingsvariabelen.** De
  frontend praat alleen met `/api/*`.
- **Bewaartermijn** is zichtbaar per kandidaat (`Bewaren tot`), en het
  kandidaatscherm heeft een verwijderknop die de kandidaat plus al zijn
  aanmeldingen, activiteiten, stagelog en beoordelingen wist.
- **Het klantrapport filtert server-side.** `netlify/functions/rapport.mjs` bouwt
  het antwoord op uit alleen wat de klant mag zien. Interne scores,
  concurrent-vlaggen, salarisinschattingen, outreach-concepten en namen van
  afgewezen kandidaten verlaten de server niet — ze worden niet in de frontend
  verborgen, ze worden niet verstuurd.
- **Tokens in de rapport-URL**: wie de link heeft, ziet het rapport. Acceptabel
  voor funnelcijfers, niet voor cv's. Zet daar dus nooit cv's achter.

- **De privacyverklaring** staat op `/privacy`, buiten de inlog, want kandidaten
  moeten hem kunnen lezen. Het is een ingevulde concepttekst met een handvol
  `[...]`-plaatsen die Do Solutions zelf moet aanvullen (KvK, adres, e-mail,
  verwerkersovereenkomsten). Laat hem nakijken voordat je er vanuit outreach
  naar linkt.

---

## Deployen

De repo bevat meerdere sites. De root-`netlify.toml` bouwt `eigen-poc/`. Deze
app hoort bij een **tweede Netlify-site**:

1. Nieuwe site vanaf dezelfde GitHub-repo.
2. Base directory: `ds-ats`. Netlify leest dan `ds-ats/netlify.toml`, en die
   regelt build, publish, functions en headers.
3. Omgevingsvariabelen:

   | Variabele | Waarde |
   |---|---|
   | `AIRTABLE_API_KEY` | personal access token met `data.records:read` en `:write` op de ATS-base |
   | `AIRTABLE_BASE_ID` | `appSAz5sjFyPm4e0g` |
   | `ATS_APP_PASSWORD` | lang, willekeurig |

Een push naar `main` bouwt beide sites; ze raken elkaar niet.

Lokaal:

```bash
cd ds-ats
npm install
cp .env.example .env      # vul de drie variabelen in
netlify dev               # frontend plus functions op één poort
```

`npm run dev` alleen werkt ook, maar dan draaien de functions niet.

---

## Airtable-limiet

Het gratis plan stopt bij 1.000 records per base. Geteld op de echte
CSV-export: Brand Manager 272 rijen en RA Officer 159 rijen, en elke rij kost
drie records (`Kandidaten`, `Aanmeldingen`, `Stagelog`). Dat is **1.297 records**
voor die twee lijsten samen, 297 meer dan het gratis plan toestaat.

Regel het Team-plan vóór de import. Formulation Technologist komt daar nog
bovenop.
