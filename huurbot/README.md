# Huurbot Benelux

Daily digest agent voor huurwoningen 150+ m2, regio De Bilt / Bilthoven / Utrecht-Oost / Zeist e.o.

## Wat het doet

1. Scant elke ochtend om 07:30 CET meerdere huurportals
2. Filtert op: min 150 m2, regio postcodes, huur-only
3. Claude scoort elke nieuwe listing op fit (0-100) met korte motivatie
4. Schrijft naar `listings.xlsx` (master database, dedup via URL) en `digest/YYYY-MM-DD.md` (dagoverzicht)
5. Commit beide bestanden terug naar de repo

## Setup (eenmalig, 5 minuten)

### 1. Repo aanmaken
Maak een **private** GitHub repo van deze code. Privacy: je zoekgedrag is niet openbaar.

### 2. Workflow path
GitHub Actions leest alleen `.github/workflows/` in de repo root. Verplaats `huurbot/.github/workflows/daily.yml` naar root `/.github/workflows/daily.yml` van je nieuwe repo, of push de `huurbot/` map als repo-root.

### 3. Anthropic API key
- console.anthropic.com  API Keys  maak er een aan
- Kosten: ongeveer 0.50-2 euro per maand

### 4. GitHub Secret toevoegen
Settings  Secrets and variables  Actions  New repository secret:
- `ANTHROPIC_API_KEY`: je Claude key

Dat is alles. Geen Google Cloud, geen Service Account.

### 5. Test handmatig
- Actions tab  "Daily Huurbot"  Run workflow
- Na 1-2 minuten staat er een nieuwe `listings.xlsx` en `digest/YYYY-MM-DD.md` in de repo

## Output bekijken

- **listings.xlsx**: open in Excel / Numbers / LibreOffice. Bevat alle historie.
- **digest/**: markdown per dag met top matches. GitHub rendert die direct in de browser. Handig op mobiel: gewoon naar `github.com/<user>/<repo>/blob/main/huurbot/digest/2026-04-15.md`.

## Architectuur

```
.github/workflows/daily.yml    cron trigger 07:30 CET + commit-back
main.py                        orchestrator
scrapers/
  pararius.py                  Pararius search
  funda.py                     Funda search
  huurwoningen.py              Huurwoningen.nl
  vesteda.py                   Vesteda + Bouwinvest
  lokaal.py                    Lokale makelaars (uitbreidbaar)
ai_filter.py                   Claude Haiku scoring
store.py                       xlsx + markdown digest writer
config.py                      Criteria, postcodes, persoonlijk profiel
listings.xlsx                  Master database (auto-aangemaakt op eerste run)
digest/                        Per-dag markdown files (auto-aangemaakt)
```

## Bekende beperkingen

- **Funda blokkeert datacenter IPs vaker.** Als je veel "403 Forbidden" ziet, overweeg ScraperAPI (5 euro/mnd) of val terug op Funda email-alerts naar een gmail-adres.
- **Lokale makelaars** vereisen aparte scrapers per site. Begin met Van Ringh en Wieman, uitbreiden kan later in `scrapers/lokaal.py`.
- **Geen real-time alerts.** Dit is bewust een digest.
- **xlsx merge-conflicten**: als je handmatig de xlsx aanpast terwijl de bot draait kan er een merge conflict komen. Rustig oplossen door jouw versie te houden of bot-commit te rebasen.

## Volgende stappen na MVP

1. Email-trigger wanneer een listing score > 85 (via bijv. SendGrid of een simpele SMTP stap in workflow)
2. Reistijd-check (Google Maps API) naar relevante locaties
3. Foto-analyse via Claude vision (staat van keuken, tuin, etc.)
