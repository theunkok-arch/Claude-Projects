# Huurbot Benelux

Daily digest agent voor huurwoningen 150+ m2, regio De Bilt / Bilthoven / Utrecht-Oost / Zeist e.o.

## Wat het doet

1. Scant elke ochtend om 07:30 CET meerdere huurportals
2. Filtert op: min 150 m2, regio postcodes, huur-only
3. Claude scoort elke nieuwe listing op fit (0-100) met korte motivatie
4. Schrijft naar `listings.xlsx` (master database, dedup via URL) en `digest/YYYY-MM-DD.md` (dagoverzicht)
5. Commit beide bestanden terug naar de repo

## Setup

1. Voeg `ANTHROPIC_API_KEY` secret toe in repo Settings > Secrets > Actions
2. Actions tab > Daily Huurbot > Run workflow
3. Na 1-2 min staan listings.xlsx en digest/ in de repo
