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
| 1 | Importscript met statusvertaling en dedupe | ✅ gedraaid op 28-08-2026 |
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
| `Portaalgebruikers` | Klantgebruikers voor `/klant`. Alleen een wachtwoord-hash, nooit het wachtwoord. |

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
| `/` | Maandagoverzicht — de aantallen per stage, te filteren op klant, vacature en bron; `?stage=` toont die kandidaten |
| `/vacatures` | Alle vacatures met funnel en aantallen |
| `/vacature/:id` | Funnel en reden-analyse; `?stage=` toont de kandidatenlijst |
| `/opdrachtgevers` | Klantenlijst met wat er per klant loopt |
| `/opdrachtgever/:id` | Eén klant: zijn vacatures, elk met eigen funnel |
| `/kandidaat/:id` | Gegevens, alle aanmeldingen, historie, contact loggen, AVG-verwijderen |
| `/bronnen` | Bron-effectiviteit: van gescoord naar voorgesteld naar geplaatst; elke bron linkt door naar `/?bron=` |
| `/rapport/:token` | Klantrapport, geen login |
| `/privacy` | Privacyverklaring voor kandidaten, publiek |

Interactieregels uit de spec die in code zitten:

- **zoeken op naam, rol of werkgever** via het vergrootglas in de kop. Alle
  kandidaten staan al in de browser, dus dat gaat niet langs de server. Het
  zoekscherm gaat over de app heen in plaats van in de kopbalk te staan: op
  390px is daar geen ruimte om te typen én treffers te tonen. Zonder dit was
  een kandidaat alleen te vinden als je al wist in welke stage ze stond;
- kandidaatkaarten, geen brede tabellen;
- stage wijzigen in twee taps via een bottom sheet. Op een kaart is de
  stage-badge zelf die knop; staat de badge uit omdat de lijst al op één stage
  filtert, dan komt er op dezelfde plek een knop "Verplaats" met hetzelfde
  raakvlak. De weg naar de sheet verdwijnt dus nooit;
- bij Afgevallen verschijnt de redenlijst direct en is die verplicht — de
  server weigert Afgevallen zonder geldige reden;
- raakvlakken minimaal 44px (`tik`-utility), sticky filterbalk, geen
  hover-afhankelijke interactie;
- kaarten met meer dan tien dagen in stage krijgen een oranje rand, en wie de
  servicenorm van zijn eigen stage overschrijdt krijgt daarnaast oranje tekst;
- **de funnel is klikbaar**: tik op "Benaderd 71" en je krijgt die 71
  kandidaten. Vanuit een overzicht is elke trede een link naar
  `/vacature/:id?stage=Benaderd`, op de vacature zelf zet hij het filter. De
  stage staat in de URL, dus zo'n weergave is deelbaar en de terugknop werkt;
- **filteren kan op elke stage**, niet alleen op "over de norm". Het
  maandagoverzicht filtert binnen de actieve stages, de vacature ook op
  Afgevallen. De aantallen volgen de vacaturekeuze;
- **beginschermen tonen cijfers, geen namen.** Het maandagoverzicht en het
  vacaturescherm openen op tellingen per stage; pas na doorklikken verschijnt de
  lijst. Met 263 actieve aanmeldingen is een scherm dat direct in kaarten opent
  onbruikbaar: je scrolt langs tweehonderd namen voordat je ziet waar het werk
  zit. De keuze staat in de URL (`/?stage=Benaderd`), dus terugknop en delen
  werken zoals verwacht;
- **elk getal brengt je ergens.** Ook op `/bronnen`: een bron linkt naar
  `/?bron=…`, met de vacaturekeuze van dat scherm erbij. Dat overzicht toont wie
  er nu van dat kanaal loopt, dus minder dan de kolom "gescoord" — die telt ook
  afgevallen en geplaatste kandidaten mee;
- **één terugknop**, `src/components/Terug.tsx`. Elke link naar een detailscherm
  geeft mee waar je vandaan komt (`useHerkomst`), en de knop noemt die
  bestemming: "← Royal Sanders", niet "← Terug". Zonder herkomst — een gedeelde
  link, een ververste pagina — valt hij terug op het overzicht waar het scherm
  onder hangt. De doorgeklikte lijsten wissen alleen een filter en blijven op
  hetzelfde scherm; die knop heet daarom "✕ Filter wissen".

Huisstijl: navy `#1A1A2E`, oranje `#E8722A`, cream `#FCF5EE`, Poppins.
Stage-badges volgen 7. Shortlist stond niet in de kleurenlijst; die kreeg oranje
gevuld, zodat hij zichtbaar tussen Gesproken en Voorgesteld in valt.

---

## Klantportaal

Opdrachtgevers hebben een eigen ingang op `/klant`, strikt alleen-lezen, met
een eigen wachtwoord per persoon. Dominique beheert die gebruikers vanuit de
ATS; niemand vult de tabel met de hand.

### Waarom een aparte functie

`netlify/functions/portal.mjs` staat volledig los van `ats.mjs`. Geen gedeelde
router met een rolvlag erin, want dan is één vergeten tak genoeg om een
opdrachtgever schrijfrechten te geven. De portal kent drie routes — `login`,
`logout`, `overzicht` — en verder niets. Er is geen code die ATS-data wijzigt.
Geschreven wordt er op precies één plek: `login` werkt het loginlogboek van de
gebruiker zelf bij.

### Wat een opdrachtgever ziet

| | |
|---|---|
| **Vacature** | titel, status, standplaats, startdatum, streefdatum shortlist, aantal aanmeldingen, funnel |
| **Kandidaat, standaard** | initialen, huidige rol, fase, scoretotaal, dagen in fase |
| **Kandidaat, na `Zichtbaar voor klant`** | plus naam, huidige werkgever, woonplaats |
| **Afgevallen** | alleen geteld per reden, nooit als rij |

Niet, in geen enkele stand: e-mail, telefoon, LinkedIn, Instagram, opleiding,
bron, `Score-onderbouwing`, `Outreach-concept`, `Opmerkingen`, `Notities`,
`Concurrent`, reistijd, salarisband, scoringsdrempel, `Validatie`, en alle
AVG-velden.

Elk veld dat naar buiten gaat staat met de hand in `bouwOverzicht`. Nergens een
`...fields` — zet iemand morgen een veld `Interne notitie` op Aanmeldingen, dan
komt dat niet vanzelf mee. Bij de kandidaten gaat het een stap verder: de
verboden velden worden niet eens bij Airtable opgehaald.

Een afvalreden is een oordeel over een persoon. Geteld laat het zien waar de
search op stukloopt; per naam zou het iets heel anders zijn.

### De dubbele grendel

Een vacature komt alleen door als hij in de lijst `Vacatures` van die gebruiker
staat **én** bij diens `Opdrachtgever` hoort. Belandt er per ongeluk een
vacature van een andere klant in de lijst, dan valt die alsnog af. Een lege
lijst geeft geen toegang, niet alle toegang — dat faalt de goede kant op.

### Wachtwoorden

De tabel `Portaalgebruikers` bevat **geen wachtwoorden**, alleen een
scrypt-hash met een salt per gebruiker. Airtable is geen kluis: iedereen met
toegang tot de base leest die tabel. Een vergeten wachtwoord is dus niet op te
zoeken, ook niet door Dominique — alleen opnieuw te genereren. Het gegenereerde
wachtwoord is vier groepen van vier tekens uit een alfabet zonder `l`, `I`,
`1`, `O` en `0`, omdat het door de telefoon wordt doorgegeven.

Vijf mislukte pogingen zetten het account een kwartier op slot. Het inlogscherm
geeft dezelfde melding voor een onbekend adres als voor een fout wachtwoord, en
draait ook zonder gevonden gebruiker één keer scrypt — anders is het
antwoordtempo een klantenlijst.

### De sessie

Een HMAC-ondertekend cookie met `HttpOnly; Secure; SameSite=Strict;
Path=/api/portal`. Dat pad is geen detail: de browser stuurt dit cookie
daardoor fysiek nooit naar `/api/ats`. Het gebruikersrecord wordt bij elk
verzoek opnieuw gelezen, dus `Status` op `Geblokkeerd` zetten werkt meteen, ook
al loopt de sessie nog acht uur.

Vereist op de Netlify-site: `PORTAL_SESSION_SECRET`, minimaal 32 tekens
willekeurig.

### Toetsen

`npm test` draait `scripts/test/portal.test.mjs` zonder netwerk en zonder de
echte base. De kern van die toets is niet dat de goede velden erin zitten — dat
zie je met het oog — maar dat de verboden waarden er niet uit komen. Er wordt
gezocht op de **waarden** en niet op de veldnamen, zodat een veld hernoemen de
toets niet stilzwijgend uitzet.

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
- **Het klantportaal is alleen-lezen en filtert server-side.**
  `netlify/functions/portal.mjs` staat los van `ats.mjs` en kent geen route die
  ATS-data wijzigt. Wat een opdrachtgever ziet staat hierboven onder
  Klantportaal, en `npm test` bewaakt het.
- **Het klantrapport filtert server-side.** `netlify/functions/rapport.mjs` bouwt
  het antwoord op uit alleen wat de klant mag zien. Vervalt zodra het portaal
  live staat: twee klantgerichte oppervlakken met elk een eigen veldfilter
  lopen vroeg of laat uit de pas. Interne scores,
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
   | `PORTAL_SESSION_SECRET` | minimaal 32 tekens willekeurig; ondertekent de sessies van het klantportaal |

Een push naar `main` bouwt beide sites; ze raken elkaar niet.

Lokaal:

```bash
cd ds-ats
npm install
cp .env.example .env      # vul de drie variabelen in
netlify dev               # frontend plus functions op één poort
```

`npm run dev` alleen werkt ook, maar dan draaien de functions niet.

### "Op mijn computer zie ik het wel, op mijn telefoon niet"

Dat is bijna nooit een fout in de code en bijna altijd de browsercache. De
telefoon houdt de oude `index.html` vast, en die wijst naar de bundel van
vorige week. De code zelf rendert bij 360, 390 en 1280 pixels breed identiek;
dat is gemeten, niet aangenomen.

Drie dingen vangen dat op, in deze volgorde:

1. **Onderaan elk scherm staat het versiestempel** — de commit en het
   bouwmoment. Wijkt dat af tussen twee apparaten, dan is het de cache en niet
   de app. Zonder dat stempel zien "de knop is er nog niet" en "de knop werkt
   niet" er voor de gebruiker precies hetzelfde uit.
2. **De app kijkt zelf of er nieuw werk uitstaat** bij het openen en zodra het
   tabblad weer op de voorgrond komt (`src/lib/versie.ts`). Staat er in de
   `index.html` op de server een andere bundelnaam dan de draaiende, dan
   verschijnt er een strook onder de kopbalk. Die vervangt zichzelf niet
   automatisch: wie midden in een formulier zit, verliest anders wat er nog
   niet bewaard is.
3. **`netlify.toml` legt de caching expliciet vast.** `/assets/*` heeft een
   hash in de bestandsnaam en mag een jaar blijven staan; `/index.html` is het
   enige bestand met een vaste naam en moet elke keer opnieuw worden
   nagevraagd. Verander die tweede regel nooit zonder de eerste erbij te
   bedenken — dan wijst de browser naar een bundel die niet meer bestaat.

Zit een toestel er nog steeds op vast, dan helpt één keer verversen met de
cache leeg: op iOS de app sluiten en het tabblad opnieuw openen, op Android
lang drukken op de verversknop.

---

## Airtable-limiet

Het gratis plan stopt bij 1.000 records per base. Geteld op de echte
CSV-export: Brand Manager 272 rijen en RA Officer 159 rijen. Zou elke rij drie
records kosten (`Kandidaten`, `Aanmeldingen`, `Stagelog`), dan was dat 1.297 —
bijna 300 te veel.

**De import van 28-08-2026 laat de Stagelog daarom leeg.** Die 431 regels
zouden allemaal "import → X" met de datum van vandaag bevatten en dus niets
toevoegen aan doorlooptijd of conversie; de eerste échte stagewijziging vult
hem alsnog. Eindstand: 431 kandidaten + 431 aanmeldingen + 1 opdrachtgever +
3 vacatures = **866 van de 1.000**.

Wat er nog bij moet, past dus niet zomaar. Formulation Technologist, de
tweede ronde met score-onderbouwing (dat zijn velden, geen records) en het
moment dat Stagelog wél gaat vollopen: regel vóór dat alles het Team-plan.

---

## Bijwerken vanuit de Drive

De statussen worden ook buiten de app bijgehouden, in de kandidatensheets in
de klantmappen op de Drive. `scripts/import/sync.mjs` legt zo'n sheet naast de
base en laat het verschil zien: wie nieuw is, wiens stage is opgeschoven, en
waar blad en base elkaar tegenspreken.

Twee regels dragen dat:

- **vooruit wel, terug niet.** Wat in de app al verder staat dan in het blad,
  blijft staan. Zo'n verschil wordt gemeld, niet toegepast — anders gooi je weg
  wat iemand met de hand heeft gezet;
- **geen enkel bestand wordt automatisch gekozen.** De mappen op de Drive zijn
  een werkplek: de namen lopen uiteen, er staan `_OLD`- en `Kopie van`-varianten
  tussen, en de RA-lijst waarmee deze base gevuld is stond niet eens in de
  klantmap. `sync.mjs` schrijft daarom geen batch weg zonder
  `--bevestigd-door`, en legt id, naam en wijzigingsdatum van het gelezen
  bestand vast bij het resultaat.

### Eén kolomindeling

Het schema ligt al vast, buiten deze repo: `ds-framework/config/kandidaten-schema.json`,
versie 1.0 — zestien kolommen A t/m P, met een gesloten statuslijst en de regel
*"EEN kandidaten.xlsx per vacature. Geen _v2/_v3 bestanden."* Dat bestand is de
bron; dit project kopieert hem niet, het leest hem.

De importer overbrugt twee verschillen die daaruit volgen:

- **de statuslijst is korter dan de pipeline.** Het xlsx-schema stopt bij
  `Voorgesteld` / `Afgewezen`; de ATS loopt door tot `Ingewerkt`. Alle tien
  schemastatussen vertalen nu naar een stage uit `shared/stages.mjs`;
- **`Score core (60)` en `Score custom (40)` komen niet mee**, alleen
  `Totaal (100)`. Airtable heeft geen kolommen voor de 60/40-splitsing.

Wat er in de Drive staat wijkt daar op dit moment nog van af — drie
kolomindelingen naast elkaar, zie `scripts/import/README.md`.

### De app is leidend voor kandidaatgegevens

Op `/kandidaat/:id` staat een formulier waarmee ontbrekende gegevens zijn aan te
vullen (naam, rol, werkgever, woonplaats, LinkedIn, e-mail, telefoon, Instagram,
opleiding, talen, bron, notities). Lege velden zijn oranje, en de knop telt ze:
"5 leeg · aanvullen".

Wat daar wordt ingevuld blijft staan. `sync.mjs` maakt nieuwe kandidaten aan en
verzet stages, maar raakt de velden van een bestaande kandidaat nooit aan — een
sheet kan dus niet overschrijven wat iemand met de hand heeft gecorrigeerd. Het
formulier stuurt bovendien alleen de gewijzigde velden mee, zodat twee mensen
elkaars werk niet wissen.

Drie velden staan er bewust niet in: `Bewaren tot` en `Bewaartermijn verstreken`
zijn Airtable-formules, en `Laatste contact` wordt al door de activiteitenlogger
gezet — twee bronnen voor die datum zou de AVG-bewaartermijn laten afhangen van
wie het laatst iets aanraakte.

Ook de aanmelding is bewerkbaar: volgende actie, score, score-onderbouwing,
opmerkingen en reistijd, via hetzelfde patroon op het kandidaatscherm. `Zichtbaar
voor klant` staat er bewust niet in — dat stuurt wat er in het klantrapport
terechtkomt en wordt automatisch gezet bij een klantzichtbare stage — en een
stageveld hoort er nooit in, want de bottom sheet dwingt bij Afgevallen de reden
af.

**Let op bij het bijwerken van de lokale state.** Airtable stuurt een leeggemaakt
veld niet terug in het antwoord op een PATCH. Een kale merge over de bestaande
gegevens laat zo'n veld daarom in beeld staan terwijl het in de base al weg is.
De helper `samenvoeg` in `AtsProvider` krijgt daarom mee wélke velden zijn
weggeschreven, en wist wat het antwoord niet noemt. Voegt iemand een nieuw
schrijfpad toe, dan hoort die lijst mee.

`scripts/import/README.md` beschrijft de werkwijze.

---

## Klanten, vacatures en contactpersonen beheren

Deze drie tabellen waren alleen in Airtable zelf te bewerken. Dat blokkeerde het
toevoegen van nieuwe opdrachtgevers, want de import koppelt elke aanmelding op
naam aan een vacature die er al moet zijn — en `import.mjs` maakt die niet aan.

De endpoints staan er nu:

| Route | Doet |
|---|---|
| `POST /api/ats/opdrachtgever` | nieuwe klant, weigert een dubbele naam |
| `PATCH /api/ats/opdrachtgever/:id` | naam, status, notities |
| `POST /api/ats/vacature` | nieuwe vacature onder een klant |
| `PATCH /api/ats/vacature/:id` | titel, status, data, standplaats, salarisband, drempel, jobspec |
| `POST /api/ats/contactpersoon` | nieuwe contactpersoon onder een klant |
| `PATCH /api/ats/contactpersoon/:id` | naam, rol, e-mail, telefoon, hiring manager |

Twee dingen die daarin vastliggen:

- **`Portal-token` accepteert de server nooit van de client.** Dat is de sleutel
  waarmee een klant zijn rapport ziet; een invoerveld nodigt uit tot een kort of
  raadbaar token. De server genereert hem bij het aanmaken: 32 hex-tekens uit de
  systeem-CSPRNG, ruim boven de 24 die `rapport.mjs` minimaal eist. Hij staat
  niet in de veld-whitelist, dus meesturen heeft geen effect.
- **Een vacature mag pas op Actief met een salarisband.** Let op waar die regel
  wél en niet leeft. Het veld `Validatie` in de base is een formule, en formules
  berekenen een waarde: ze weigeren geen invoer. De base laat een vacature dus
  gewoon op Actief zetten en zet er "Salarisbandbreedte ontbreekt" naast, in een
  kolom waar niemand kijkt. De enige echte handhaving staat in `ats.mjs`, via
  `bewaakSalarisband`, en die geldt zowel bij aanmaken als bij bewerken.

  Bij een wijziging stuurt de app alleen de gewijzigde velden. Wie alleen de
  status omzet, stuurt geen salarisvelden mee, dus haalt `wijzigVacature` eerst
  het bestaande record op en toetst de regel op de samengevoegde waarden. Zonder
  die stap zou een vacature met een band al jaren geleden geweigerd worden.

`Validatie` en de rollups zijn formules en staan daarom in geen enkele
whitelist.
