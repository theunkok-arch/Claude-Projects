# Huurbot Benelux

Daily digest agent voor huurwoningen 150+ m2, regio De Bilt / Bilthoven / Utrecht-Oost / Zeist e.o.

## Wat het doet

1. Scant elke ochtend om 07:30 CET meerdere huurportals
2. Filtert op: min 150 m2, regio postcodes, huur-only
3. Claude scoort elke nieuwe listing op fit (0-100) met korte motivatie
4. Schrijft naar `listings.xlsx` (master database, dedup via URL) en `digest/YYYY-MM-DD.md` (dagoverzicht)
5. Commit beide bestanden terug naar de repo

## Setup (eenmalig, 5 minuten)

### 1. Anthropic API key
- console.anthropic.com > API Keys > maak er een aan
- Kosten: ongeveer 0.50-2 euro per maand

### 2. GitHub Secret toevoegen
Settings > Secrets and variables > Actions > New repository secret:
- `ANTHROPIC_API_KEY`: je Claude key

Dat is alles. Geen Google Cloud, geen Service Account.

### 3. Test handmatig
- Actions tab > "Daily Huurbot" > Run workflow
- Na 1-2 minuten staat er een nieuwe `listings.xlsx` en `digest/YYYY-MM-DD.md` in de repo

## Output bekijken

- **listings.xlsx**: open in Excel / Numbers / LibreOffice. Bevat alle historie.
- **digest/**: markdown per dag met top matches. GitHub rendert die direct in de browser.

## Architectuur

```
.github/workflows/daily-huurbot.yml  cron trigger 07:30 CET + commit-back
huurbot/main.py                      orchestrator
huurbot/scrapers/
  pararius.py                        Pararius search
  funda.py                           Funda search
  huurwoningen.py                    Huurwoningen.nl
  vesteda.py                         Vesteda + Bouwinvest
  lokaal.py                          Lokale makelaars (uitbreidbaar)
huurbot/ai_filter.py                 Claude Haiku scoring
huurbot/store.py                     xlsx + markdown digest writer
huurbot/config.py                    Criteria, postcodes, persoonlijk profiel
huurbot/listings.xlsx                Master database (auto-aangemaakt op eerste run)
huurbot/digest/                      Per-dag markdown files (auto-aangemaakt)
```

## Bekende beperkingen

- **Funda blokkeert datacenter IPs vaker.** Val terug op Funda email-alerts als dat speelt.
- **Lokale makelaars** vereisen aparte scrapers per site. Begin met Van Ringh en Wieman.
- **Geen real-time alerts.** Dit is bewust een digest.
