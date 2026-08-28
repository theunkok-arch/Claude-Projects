# claude-projects — agent briefing

**You are working in the `claude-projects` monorepo.** Before doing anything substantive, read:

1. **`OPERATIONS.md`** (repo-root) — the operating manual: where files live, how the Netlify deploy pipeline works, account ownership, recovery scenarios, and the default permission posture. Single source of truth for managing this repo.
2. **`eigen-poc/CLAUDE.md`** — project-specific conventions for the EIGEN app (design system, routes, i18n, mock strategy). Treat as authoritative for code style.
3. **`ds-ats/README.md`** — the ATS: Airtable base-id en schema, de pipeline-stages, deploy-instellingen, en het privacy-model. Lees dit voordat je iets aan `ds-ats/` of aan de Airtable-base verandert.

## What lives here (monorepo)

| Onderdeel | Wat | Deploy |
|---|---|---|
| **`eigen-poc/`** | EIGEN — AI real-estate PoC (React 19 + Vite 8 + Tailwind v4, SPA) | **Netlify** → https://eigenpoc.netlify.app, branch `main`, config in root `netlify.toml` (`base = "eigen-poc"`) |
| **`ds-ats/`** | Do Solutions ATS — recruitment-pipeline op Airtable (React 19 + Vite 8 + Tailwind v4 + TS, Netlify Functions) | **Netlify**, eigen site met base directory `ds-ats`, config in `ds-ats/netlify.toml`, branch `main` |
| **Root `index.html` / `app.js` / ...** | Losse "BTC EMA26 Alerts" PWA | **GitHub Pages** via `.github/workflows/deploy.yml`, branch `claude/bitcoin-ema-alerts-b9BPw` |

**De root `netlify.toml` bouwt alleen `eigen-poc/`.** De ATS is een *tweede*
Netlify-site vanaf dezelfde repo, met base directory `ds-ats`; die leest
`ds-ats/netlify.toml`. Een push naar `main` triggert beide deploys (~1-2 min);
ze raken elkaar niet. The BTC app is independent — don't touch it for EIGEN work.

## Project gotchas

- **Two clones on this Mac.** Work in `~/claude-projects` (canonical). `~/Desktop/claude-projects` is a stale clone — ignore it.
- **`netlify.toml` (repo-root) is the source of truth for build config** — edit it and push, never the Netlify UI. `base = "eigen-poc"`, `publish = "dist"` (relative to base), Node 20, SPA-fallback redirect.
- **EIGEN is a SPA** — every route serves `index.html` via the redirect rule. Client-side routing only; no backend, all integrations mocked.
- **i18n**: user-facing strings go in `eigen-poc/src/i18n/{en,nl}.js` (per-screen namespaces), used via `t('key', {vars})`. Add to both languages.
- **State shape changes**: version-bump the relevant Zustand store in `eigen-poc/src/stores/` and write a `migrate` fn (existing localStorage users).
- **AI-generated UI** follows a visual language: 4px purple left border, `bg-purple-50`, sparkle icon, purple header label — use `AIBubble`/`AITyping` in `src/components/ai/`.
- **Mobile-first, max-width 430px**; respect the EIGEN palette in `tailwind.config.js`.
- **Scope discipline**: no speculative abstractions, no unrelated refactors, no backwards-compat shims for non-shipped code.

## ATS-gotchas (`ds-ats/`)

- **Airtable-base `appSAz5sjFyPm4e0g`** ("Do Solutions ATS"). Niet te verwarren met
  `appMLC8Zv6wqnYUdu` ("Do Solutions Kandidaten"), de inzendingen van het
  contactformulier op dosolutions.info.
- **`ds-ats/shared/stages.mjs` is de enige bron** voor stages, servicenormen en
  afvalredenen. Frontend, Netlify Functions en importscript importeren alle drie
  dat bestand; wijzig het nooit op één plek na. Types staan in `stages.d.mts`.
- **De stage hoort bij de aanmelding, nooit bij de kandidaat.** Dat is de hele
  reden dat het datamodel zo is; zet nooit een statusveld op `Kandidaten`.
- **`netlify/functions/rapport.mjs` filtert server-side.** Voeg daar nooit een veld
  toe zonder te controleren of de klant het mag zien (README, "Toegang en privacy").
- **De Airtable-key hoort uitsluitend in de Netlify-omgevingsvariabelen.** De
  frontend praat alleen met `/api/*`.

## Default permission posture for this repo

The owner (Theun) has standing approval for routine work:
- File edits, creates, deletes within the repo.
- `npm install`, `npm run build`, `npm run dev` en de checks van het project waar
  je in werkt: `npm run lint` in `eigen-poc/`, `npm run typecheck` in `ds-ats/`
  (die zit ook al in `npm run build`). Draai ze altijd in de projectmap — in de
  repo-root staat geen `package.json`.
- `git add`, `git commit`, `git push origin main`.
- Routine `netlify` CLI commands: reading deploy logs, `netlify deploy`.
- **Doorpakken tot en met live.** Werk op een branch is pas af als het op
  `main` staat. Open de PR, wacht tot de checks groen zijn en merge hem dan
  zelf — niet eerst vragen. Vastgelegd door Theun op 28-08-2026, nadat vijf
  commits een halve dag op een conceptbranch bleven staan terwijl hij in de
  app zocht naar een functie die er al was.

Always pause and confirm before:
- Destructive git operations on shared history (`reset --hard`, `push --force`, branch deletes).
- DNS changes at mijndomeinhosting.nl.
- Netlify settings that affect production before a feature is ready (env-var changes, site delete, unlink). Een merge naar `main` valt hier niet onder; die hoort bij het normale werk hierboven.
- Sending real emails or any external communication.

If unsure whether something is "routine", err toward asking once and proceeding.
