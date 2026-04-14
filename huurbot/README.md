# Huurbot Benelux

Daily digest agent voor huurwoningen 150+ m², regio De Bilt / Bilthoven / Utrecht-Oost / Zeist e.o.

## Wat het doet

1. Scant elke ochtend om 07:30 CET meerdere huurportals
2. Filtert op: min 150 m², regio postcodes 3700-3739 + 3500-3585, huur-only
3. Claude scoort elke nieuwe listing op fit (0-100) met motivatie
4. Schrijft nieuwe listings naar Google Sheet (deduplicatie via URL hash)

## Setup (eenmalig, 20 minuten)

### 1. Repo aanmaken
- Maak een nieuwe **private** GitHub repo, push deze code
- Alleen private want je credentials staan in secrets

### 2. Google Sheet voorbereiden
- Maak een nieuwe Google Sheet met tabblad "Listings"
- Headers in rij 1: `Datum gevonden | Bron | Titel | Plaats | Prijs | m² | Kamers | URL | Fit score | AI motivatie | Status`
- Kopieer de Sheet ID uit de URL (het stuk tussen `/d/` en `/edit`)

### 3. Google Service Account
- Ga naar console.cloud.google.com, maak een nieuw project
- Enable "Google Sheets API"
- Maak een Service Account, download de JSON key
- Deel je Sheet met het service account email (Editor rechten)

### 4. Anthropic API key
- console.anthropic.com  API Keys  maak er een aan
- Kosten voor dit script: ongeveer 0.50-2 euro per maand

### 5. GitHub Secrets toevoegen
Settings  Secrets and variables  Actions  New repository secret:
- `ANTHROPIC_API_KEY`: je Claude key
- `GOOGLE_SHEET_ID`: de Sheet ID uit stap 2
- `GOOGLE_SERVICE_ACCOUNT_JSON`: de volledige inhoud van de JSON file uit stap 3

### 6. Test handmatig
- Actions tab  "Daily Huurbot"  Run workflow
- Check je Sheet na 2-3 minuten

## Architectuur
```
.github/workflows/daily.yml    cron trigger 07:30 CET
main.py                        orchestrator
scrapers/
  pararius.py                  Pararius search
  funda.py                     Funda search
  huurwoningen.py              Huurwoningen.nl
  vesteda.py                   Vesteda portal
  lokaal.py                    Lokale makelaars (uitbreidbaar)
ai_filter.py                   Claude scoring
sheets.py                      Google Sheets writer
state.py                       Deduplicatie (via Sheet URL kolom)
config.py                      Criteria, postcodes, plaatsen
```

## Bekende beperkingen

- **Funda blokkeert datacenter IPs vaker.** Als je veel "403 Forbidden" ziet, overweeg ScraperAPI (5 euro/mnd) of val terug op Funda email-alerts naar een gmail-adres.
- **Lokale makelaars** vereisen aparte scrapers per site. Begin met de 3 grootste in jouw regio (Van Ringh, Wieman, De Bilt Makelaardij), uitbreiden kan later.
- **Geen real-time alerts.** Dit is bewust een digest. Voor 150+ m² in dit segment is er zelden race-conditie zoals bij studentenkamers.

## Volgende stappen na MVP

1. Email-trigger toevoegen wanneer fit score > 85 (Google Apps Script vanuit de Sheet)
2. Reistijd-check toevoegen (Google Maps API) naar Cognigy kantoor / school kinderen
3. Foto-analyse via Claude vision (staat van keuken, tuin, etc.)
