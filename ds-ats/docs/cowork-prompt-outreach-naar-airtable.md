# Prompt voor Cowork: laat de outreach terugmelden aan de ATS

Kopieer alles hieronder naar een Cowork-sessie.

---

Pas de skill `outreach-uitvoering` aan zodat elke statuswijziging óók in de
Airtable-ATS terechtkomt. De ATS heeft daar sinds vandaag een eindpunt voor.

## Waarom

De status van een kandidaat staat nu op twee plekken: in `kandidaten.xlsx` en
in de ATS. De xlsx wordt bijgewerkt door `log_outreach.py`, de ATS niet. Na elke
follow-upronde loopt de ATS dus achter, en de servicenormklok daar telt door op
een fase die de kandidaat allang verlaten heeft.

De xlsx blijft bestaan en blijft leidend tijdens de search zelf. Wat verandert
is dat een statuswijziging voortaan ook naar de ATS gaat.

## Het eindpunt

`POST https://dosolats.netlify.app/api/outreach`

Headers:
- `Content-Type: application/json`
- `x-outreach-key: <de waarde van OUTREACH_KEY>`

Body:

```json
{
  "linkedinUrl": "https://www.linkedin.com/in/...",
  "opdrachtgever": "Normec VRO",
  "vacature": "SNA inspecteur",
  "gebeurtenis": "follow-up",
  "kanaal": "inmail",
  "datum": "2026-09-02",
  "notitie": "optioneel, komt in het activiteitenlog",
  "redenAfvallen": "alleen bij gebeurtenis afgevallen"
}
```

`gebeurtenis` is een van: `eerste bericht`, `follow-up`, `reactie`, `gesproken`,
`afgevallen`.

**Stuur nooit een ATS-fasenaam mee.** Het eindpunt accepteert wat er gebeurd is,
niet waar iemand daarna hoort te staan, en doet de vertaling zelf. Dat is met
opzet: het framework kent `Reactie` en `Gesprek` waar de ATS `Gereageerd` en
`Gesproken` zegt, en `Shortlist` betekent in de twee lijsten iets heel anders —
in het framework iemand die nog benaderd moet worden, in de ATS iemand die al
gesproken is. Die verwarring heeft eerder 25 kandidaten in de verkeerde fase
gezet.

Bij `afgevallen` is `redenAfvallen` verplicht en moet hij uit
`reden_afvallen_waarden` in het schema komen. Verzin er nooit zelf een; het
eindpunt weigert een onbekende reden.

## Wat er moet gebeuren

### 1. `scripts/meld_ats.py` (nieuw)

Een klein script dat één melding verstuurt. Geen afhankelijkheden buiten de
standaardbibliotheek (`urllib.request`, `json`, `os`).

```
python3 scripts/meld_ats.py \
  --linkedin-url URL --opdrachtgever NAAM --vacature TITEL \
  --gebeurtenis "follow-up" [--kanaal inmail] [--datum YYYY-MM-DD] \
  [--reden-afvallen TEKST] [--notitie TEKST]
```

De sleutel komt uit de omgevingsvariabele `OUTREACH_KEY`. Zet hem **nooit** in
een bestand in de Drive of in de skill.

**De foutafhandeling is het belangrijkste deel van dit script.** Een mislukte
melding mag de outreach nooit stilzwijgend laten doorlopen — dat is precies het
probleem dat we oplossen. Dus:

- HTTP 200 met `"ongewijzigd": true` → prima, de fase klopte al. Kort melden.
- HTTP 404 → de kandidaat of de aanmelding staat niet in de ATS. Dat betekent
  dat de lijst nog niet is geïmporteerd. **Stop en meld het**, ga niet door met
  de volgende kandidaat alsof er niets is.
- HTTP 409 → de kandidaat loopt bij meerdere vacatures. Geef `--opdrachtgever`
  en `--vacature` mee.
- Netwerkfout of 5xx → drie pogingen met oplopende wachttijd (2s, 4s, 8s).
  Blijft het mislukken: schrijf de melding weg in `ats-openstaand.jsonl` in de
  rol-map, en meld aan het eind hoeveel er niet zijn doorgekomen. De outreach
  zelf is dan al verstuurd; die kun je niet terugdraaien, dus de melding moet
  bewaard blijven om later opnieuw te kunnen versturen.

Geef bij een fout altijd de letterlijke tekst uit het `error`-veld van het
antwoord door. Die is in het Nederlands geschreven om gelezen te worden.

### 2. `scripts/log_outreach.py` (aanpassen)

Roep `meld_ats.py` aan op elk moment dat het script nu een status in de xlsx
zet. De xlsx blijft óók bijgewerkt worden — die twee lopen voorlopig naast
elkaar, en de xlsx is nog steeds waar de selectie vandaan komt.

Volgorde: **eerst de ATS, dan de xlsx.** Mislukt de ATS-melding, dan is de xlsx
nog niet bijgewerkt en klopt hij nog met de werkelijkheid. Andersom zou je een
xlsx krijgen die zegt dat iemand benaderd is terwijl de ATS dat niet weet, en
dan is niet meer te zien welke van de twee de fout in ging.

De statuswaarden in de xlsx blijven ongewijzigd; de vertaling gebeurt in het
eindpunt.

### 3. `SKILL.md` (aanpassen)

- Voeg bij de vaste regels toe dat elke statuswijziging ook naar de ATS gaat, en
  dat de outreach stopt als dat niet lukt.
- Vermeld dat `OUTREACH_KEY` in de omgeving moet staan.
- Werk de versienotitie onderaan bij.

### 4. Toets het met één kandidaat

Draai het tegen één echte kandidaat en controleer daarna in de ATS op
https://dosolats.netlify.app dat de fase, de datum in de fase en het
activiteitenlog kloppen. Doe dat vóór je een hele ronde draait.

## Wat je niet moet doen

- **Geen Airtable-token in Cowork.** Praat uitsluitend met het eindpunt
  hierboven. De Airtable-sleutel hoort alleen in Netlify te staan; een tweede
  kopie in een scriptomgeving is een tweede plek waar hij kan weglekken.
- **Geen kandidaten of aanmeldingen aanmaken via de ATS.** Het eindpunt kan dat
  bewust niet. Nieuwe kandidaten komen via de import, zodat Dominique het moment
  houdt waarop iemand de ATS in gaat.
- **De xlsx niet uitkleden.** Die blijft de werkkopie van de search, met
  checkpoints en hervatbaarheid. Alleen de statusterugkoppeling komt erbij.

## Let op de datum

Er staan twee follow-uprondes klaar voor Normec SNA Inspecteur, op **2 september
en 11 september**. Is dit vóór 2 september klaar, dan loopt die ronde meteen
goed. Zo niet, dan moeten die twee rondes achteraf met de hand worden
bijgewerkt in de ATS.
