# EIGEN (PoC) — Operating Manual

> **Single source of truth voor het beheren van de EIGEN PoC.** Lees dit eerst als je een nieuwe Claude Code sessie / nieuwe licentie / nieuwe Mac opzet. Als jij dit kan lezen, kan je de app beheren.
>
> **Dit document hoort bij de `claude-projects` repo-root.** De EIGEN-app leeft als subfolder `eigen-poc/` binnen deze repo. De Mac-level setup (SSH-key, git-config, Claude-installatie) is **gedeeld met het Do Solutions project** — dat hoef je dus maar één keer goed te zetten. De volledige Do Solutions handleiding staat in `~/claude-projects/dosolutions-website/OPERATIONS.md` en gebruikt dezelfde structuur.
>
> _Laatst bijgewerkt: juni 2026 — na de overstap van handmatige drag-drop naar Git-based auto-deploy via Netlify._

---

## 🟢 TL;DR — kan ik EIGEN "kwijtraken" door over te stappen op een nieuwe Claude licentie?

**Nee.** Claude Code is alleen een editor + shell die jou helpt sneller te werken. De ketting die de app live houdt is:

```
jouw code  →  GitHub (theunkok-arch/claude-projects, branch main)  →  Netlify (auto-deploy on push)  →  eigenpoc.netlify.app
```

Geen enkele schakel hangt aan een specifieke Claude-licentie. Switch je morgen je licentie, dan:

- ✅ De live site blijft draaien (Netlify weet niets van Claude).
- ✅ De GitHub repo blijft staan (jij bent eigenaar via `theunkok-arch`).
- ✅ Jouw lokale code blijft op je Mac staan.
- ✅ Toekomstige `git push` naar `main` blijft Netlify auto-deployen.
- ✅ Nieuwe Claude-sessie? `cd ~/claude-projects && claude` — klaar.

**Wat je écht moet beschermen:** wachtwoorden, 2FA codes en SSH keys. Niet Claude. Zie [§10 Password manager checklist](#10-password-manager-checklist).

---

## 📑 Inhoud

1. [Waar alles staat](#1-waar-alles-staat)
2. [Accounts die je écht nodig hebt](#2-accounts-die-je-écht-nodig-hebt)
3. [Hoe publiceren werkt via Netlify](#3-hoe-publiceren-werkt-via-netlify)
4. [Nieuwe Claude Code licentie of nieuwe Mac opzetten](#4-nieuwe-claude-code-licentie-of-nieuwe-mac-opzetten)
5. [Claude Code ↔ GitHub: hoe de koppeling werkt](#5-claude-code--github-hoe-de-koppeling-werkt)
6. [Dagelijkse workflow met Claude](#6-dagelijkse-workflow-met-claude)
7. [Environment variables](#7-environment-variables)
8. [Repo-structuur](#8-repo-structuur)
9. [Disaster-recovery scenarios](#9-disaster-recovery-scenarios)
10. [Password manager checklist](#10-password-manager-checklist)
11. [Quick reference](#11-quick-reference)

---

## 1. Waar alles staat

### Code en content

| Wat | Locatie |
|---|---|
| **Lokale code** (canonieke clone) | `~/claude-projects` op je Mac |
| **EIGEN-app** | `~/claude-projects/eigen-poc/` (subfolder) |
| **GitHub repo** (single source of truth) | `git@github.com:theunkok-arch/claude-projects.git` — deploy-branch `main` |
| **Build config** (bron van waarheid) | `~/claude-projects/netlify.toml` (repo-root) |
| **PRD / Wireframes / Build Plan** | `EIGEN_PRD_v1.docx`, `EIGEN_Wireframes_v1.docx`, `EIGEN_Build_Plan_v1.docx` in repo root |

> ⚠️ **Twee clones op deze Mac.** Er staat ook een verouderde clone op `~/Desktop/claude-projects` (zonder de recente wijzigingen). **Werk altijd in `~/claude-projects`** — dat is de canonieke clone. De Desktop-versie mag je negeren of later opruimen (check eerst `git status` / `git log` op ongepushte commits).

### Wat zit er nog meer in deze repo?

`claude-projects` is een **monorepo** met twee onafhankelijke dingen:

| Onderdeel | Wat | Hoe gedeployed |
|---|---|---|
| **`eigen-poc/`** | De EIGEN PoC (deze handleiding) | **Netlify**, branch `main`, via root `netlify.toml` |
| **Root `index.html` / `app.js` / `style.css` / `sw.js`** | De losse "BTC EMA26 Alerts" PWA | **GitHub Pages**, via `.github/workflows/deploy.yml`, branch `claude/bitcoin-ema-alerts-b9BPw` |

**Belangrijk voor toekomstige Claude-sessies:** Netlify bouwt **alleen `eigen-poc/`** (zie `base = "eigen-poc"` in `netlify.toml`). De BTC-app heeft zijn eigen pipeline en raakt EIGEN niet. Een push naar `main` triggert de EIGEN-deploy; de BTC-app deployt alleen vanaf zijn eigen branch.

### Tech-stack van eigen-poc

React 19 + Vite 8 · Tailwind CSS v4 · React Router v7 · Zustand v5 (persist) · Framer Motion · Recharts · Leaflet + React-Leaflet · Lucide React. Build via `npm run build` → output naar `eigen-poc/dist/`. Het is een **SPA** (client-side routing → SPA-fallback redirect in `netlify.toml`). Alle externe integraties zijn **gemockt** (geen backend).

### Live site

| Waar | URL |
|---|---|
| **Productie** (Netlify) | https://eigenpoc.netlify.app |
| **Branch-deploy `main`** | https://main--eigenpoc.netlify.app |
| **Netlify dashboard** | https://app.netlify.com/projects/eigenpoc |
| **GitHub repo** | https://github.com/theunkok-arch/claude-projects |
| **Custom domein** | _Nog niet gekoppeld — zie [§9](#9-disaster-recovery-scenarios) / stap "Custom domein koppelen" hieronder._ |

**Netlify site-identiteit:** naam `eigenpoc`, team `eigen`, site-ID `219391bc-ef2b-4515-937e-cb1601ca41c9`.

---

## 2. Accounts die je écht nodig hebt

Dit zijn de accounts waarop EIGEN afhangt. **Geen daarvan is gekoppeld aan een Claude-licentie.**

| Service | Account / login | Waarvoor | Wat als ik dit kwijt ben? |
|---|---|---|---|
| **GitHub** | `theunkok-arch` (theunkok@gmail.com) | Code repository | Account recovery via GitHub. Backup: elke lokale clone is een volledige kopie van de history. |
| **Netlify** | team `eigen` (login via e-mail / GitHub OAuth) | Hosting + auto-deploy | Reconnect GitHub in Netlify-instellingen. Nul downtime. |
| **mijndomeinhosting.nl** | (jouw account) | Domeinnaam + DNS (zodra domein gekoppeld) | Domein blijft van jou; verleng op tijd. |
| **Anthropic Claude Code** | (jouw licentie) | Editor / assistent | Verander licentie: zonder gevolgen voor de app. |

EIGEN heeft (nog) **geen API-keys of externe diensten** — alle integraties zijn gemockt. Zodra dat verandert: voeg de provider toe aan deze tabel én aan [§7 Environment variables](#7-environment-variables).

---

## 3. Hoe publiceren werkt via Netlify

Heel belangrijk om te begrijpen, want dit is wat onafhankelijk van Claude blijft werken:

```
1.  Jij (of Claude namens jou) bewerkt code lokaal in ~/claude-projects/eigen-poc/
2.  git add . && git commit -m "..." && git push origin main
3.  Netlify ziet de push op de main branch
4.  Netlify leest netlify.toml, cd't naar eigen-poc/, draait `npm run build`
5.  Bij groene build: live op eigenpoc.netlify.app binnen 1-2 minuten
6.  Bij rode build: oude versie blijft staan, je krijgt een Netlify-mail
```

### `netlify.toml` is de bron van waarheid voor build config

In `~/claude-projects/netlify.toml` (repo-root):

```toml
[build]
  base    = "eigen-poc"      # Netlify cd't hierheen vóór de build
  command = "npm run build"
  publish = "dist"           # relatief aan base → eigen-poc/dist

[build.environment]
  NODE_VERSION = "20"

[[redirects]]                # SPA-fallback: elke route serveert index.html
  from   = "/*"
  to     = "/index.html"
  status = 200
```

Wil je de build-instellingen wijzigen? **Pas dit bestand aan en push** — niet de Netlify UI. De UI-instellingen worden door `netlify.toml` overschreven.

**De Netlify ↔ GitHub koppeling is één keer ingesteld in de Netlify UI** (Import an existing project → GitHub → repo `claude-projects` → branch `main`). Hij staat los van Claude Code en van je Mac: hij leeft op **Netlify-account-niveau**. Switch je Claude-licentie of je Mac, dan blijft deze pipeline 100% intact en hoeft de link **niet** opnieuw gelegd te worden.

**Handmatig deployen** kan via:
- `git push origin main` (de gewone manier)
- Netlify dashboard → project `eigenpoc` → "Deploys" → "Trigger deploy"
- `netlify deploy --prod` (vanuit `~/claude-projects`, met CLI ingelogd)

### Custom domein koppelen (nog te doen)

Wanneer je het domein wilt koppelen:

1. Netlify dashboard → project `eigenpoc` → **Domain management** → **Add a domain**.
2. Vul je domein in (bv. `eigen.nl`). Netlify geeft DNS-records terug.
3. Bij **mijndomeinhosting.nl** zet je die records:
   - **Apex / root** (`eigen.nl`) → een **A-record** naar Netlify's load-balancer IP (`75.2.60.5`), óf gebruik een ALIAS/ANAME als je host dat ondersteunt.
   - **www** (`www.eigen.nl`) → een **CNAME** naar `eigenpoc.netlify.app`.
   - Kies één als primair (meestal www, met apex-redirect, of andersom — Netlify regelt de redirect).
4. Verifieer propagatie: `dig eigen.nl` / `dig www.eigen.nl`, of Netlify's ingebouwde check.
5. Netlify provisiet automatisch een **Let's Encrypt** certificaat zodra DNS klopt (kan tot ~1 uur duren).

Tot het domein gekoppeld is, blijft `eigenpoc.netlify.app` de productie-URL.

---

## 4. Nieuwe Claude Code licentie of nieuwe Mac opzetten

### Scenario A: Zelfde Mac, nieuwe Claude licentie

```bash
# 1. (Indien nodig) installeer / update Claude Code — zie https://docs.claude.com/claude-code
# 2. Authenticeer met je nieuwe licentie wanneer Claude vraagt.
# 3. Open de project folder
cd ~/claude-projects
# 4. Start Claude
claude
# 5. Klaar. Eerste prompt: "Lees OPERATIONS.md en AGENTS.md en bevestig dat je
#    klaar bent om wijzigingen door te voeren aan de EIGEN PoC."
```

Géén integraties om te herinstalleren. De Netlify ↔ GitHub koppeling staat al klaar op Netlify-niveau.

### Scenario B: Nieuwe Mac (Mac kapot / vervangen)

```bash
# 1. Installeer Node.js (LTS, v20+) van https://nodejs.org
node -v

# 2. Git (zit op macOS; anders: xcode-select --install)
git --version

# 3. SSH-key voor GitHub (gedeeld met dosolutions — één key dekt beide repos)
ssh-keygen -t ed25519 -C "theunkok@gmail.com"   # enter voor default pad, kies een passphrase
cat ~/.ssh/id_ed25519.pub                         # plak op https://github.com/settings/keys

# 4. Clone de repo
mkdir -p ~/claude-projects && cd ~
git clone git@github.com:theunkok-arch/claude-projects.git
cd ~/claude-projects

# 5. Dependencies voor eigen-poc
cd eigen-poc && npm install

# 6. Test lokaal
npm run dev          # open de getoonde localhost-URL — zou de EIGEN-app moeten zijn

# 7. (Optioneel maar handig) Netlify CLI voor logs/deploys — zie gotcha hieronder
npm install -g netlify-cli
netlify login        # opent browser, eenmalig; daarna onthoudt de CLI het
cd ~/claude-projects && netlify link --id 219391bc-ef2b-4515-937e-cb1601ca41c9

# 8. Installeer Claude Code (zie Scenario A) en start in ~/claude-projects
claude
```

Totaal: 20-30 minuten. Tijdens dit hele proces blijft `eigenpoc.netlify.app` gewoon online.

> 🛠️ **Gotcha — npm global install zonder sudo.** Op deze Mac staat Node in `/usr/local` (root-owned), dus `npm install -g …` faalt met een EACCES-permissiefout. Opgelost door npm naar een user-prefix te wijzen (geen sudo nodig):
> ```bash
> npm config set prefix "$HOME/.npm-global"
> echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
> export PATH="$HOME/.npm-global/bin:$PATH"      # voor de huidige shell
> ```
> Daarna werkt `npm install -g netlify-cli` (en elk ander global pakket) zonder sudo.

### Belangrijk: de Netlify-link hoeft NIET opnieuw

De `eigenpoc` site is op Netlify-account-niveau gekoppeld aan de GitHub-repo. Op een nieuwe Mac of nieuwe licentie:
- `netlify login` is alleen nodig om de **CLI** te authenticeren (voor logs/handmatige deploys). Optioneel.
- De **auto-deploy pipeline** (push → build → live) werkt zonder dat je lokaal iets doet — die hangt aan GitHub + Netlify, niet aan je machine.

### Scenario C: Alles weg behalve een browser

1. Log in op https://github.com/theunkok-arch/claude-projects — alle code is daar.
2. Log in op https://app.netlify.com → project `eigenpoc` draait nog.
3. Snelle hot-fix: GitHub web UI → bewerk bestand op `main` → commit → Netlify deployt.

---

## 5. Claude Code ↔ GitHub: hoe de koppeling werkt

**Korte versie: Claude Code vraagt je nooit om GitHub-credentials.** Op een nieuwe licentie vraagt hij alleen om in te loggen bij Anthropic. GitHub-toegang komt van je Mac (OS-niveau), niet van Claude.

### De Mac-setup is gedeeld met Do Solutions

Eén SSH-key (`~/.ssh/id_ed25519`) en je globale `git config` dekken **beide** projecten. Je hebt ze maar één keer ingesteld:

| Repo | Remote | Auth |
|---|---|---|
| `dosolutions-website` | `git@github.com:theunkok-arch/dosolutions-website.git` | SSH (`id_ed25519`) |
| `claude-projects` (bevat `eigen-poc/`) | `git@github.com:theunkok-arch/claude-projects.git` | SSH (`id_ed25519`) |

Werkt `git push` in één van beide, dan werkt het in allebei — en in elk toekomstig project onder `theunkok-arch`.

### Waarom `git push` werkt — de truc

```
Claude  →  Bash-tool  →  /usr/bin/git  →  ~/.ssh/id_ed25519  →  GitHub
                          ↑ OS-niveau, niet Claude-niveau
```

Zolang `git push` werkt in een gewone Terminal, werkt het ook via Claude.

### 30-seconden sanity check (nieuwe licentie of nieuwe Mac)

```bash
git config --global user.name      # → theunkok-arch
git config --global user.email     # → theunkok@gmail.com
ssh -T git@github.com              # → "Hi theunkok-arch! You've successfully authenticated..."
cd ~/claude-projects && git remote -v
# → origin  git@github.com:theunkok-arch/claude-projects.git
```

Werkt de SSH-stap niet? Genereer en publiceer een SSH-key — zie [§4 Scenario B stap 3](#scenario-b-nieuwe-mac-mac-kapot--vervangen).

---

## 6. Dagelijkse workflow met Claude

### De gouden flow

```
Jij  →  geeft prompt aan Claude  →  Claude bewerkt code in eigen-poc/
                                  →  Claude doet `npm run build` (sanity check)
                                  →  Claude commit + push naar main
                                  →  Netlify deployt automatisch
                                  →  Live op eigenpoc.netlify.app binnen 1-2 min
```

### Voorbeeld-prompts die goed werken (toegesneden op EIGEN)

- *"Voeg een nieuwe property toe in `src/data/mockProperties.js` met echte foto's en een NL-beschrijving, en zorg dat hij in B2 verschijnt."*
- *"Verbeter de B1 AI-search parser: herken meer steden en 'prijs per m²' constraints."*
- *"Voeg map-markers toe op B2 met Leaflet (al een dependency)."*
- *"Vertaal de seller-journey (S1–S8) naar het Nederlands in `src/i18n/`."*
- *"Splits de 943 kB bundle met dynamic imports per route."*
- *"Run de build, check of alles werkt, daarna committen en pushen naar main."*

### Wat Claude automatisch doet in deze repo

Standing approval (zie `AGENTS.md`): file edits, `npm install` / `npm run build` / `npm run dev`, `git add` / `commit` / `push origin main`, en routine `netlify`-commando's (logs lezen, deploy).

### Wat Claude **niet** doet zonder check

- Destructive git operaties op `main` (`reset --hard`, `push --force`, branch-deletes)
- Netlify-acties die productie raken vóór een feature af is (env-var wijzigingen, site-delete)
- DNS-wijzigingen bij mijndomein
- Externe communicatie / het verzenden van echte e-mails

---

## 7. Environment variables

### Huidige stand

EIGEN gebruikt **op dit moment geen env-variabelen** — het is een pure frontend met gemockte integraties (geen `.env` bestand aanwezig). Deze sectie beschrijft hóe je ze toevoegt zodra dat nodig is (bv. een echte API-key voor een toekomstige integratie).

### Waar ze zouden leven

| Locatie | Doel | Wie heeft de waarde |
|---|---|---|
| `eigen-poc/.env.example` (in git, geen secrets) | Template | Iedereen |
| `eigen-poc/.env.local` (op je Mac, git-ignored) | Lokale dev | Alleen jij |
| Netlify → Site settings → Environment variables | Productie | Netlify UI |

> Vite exposeert env-vars aan de frontend **alleen** als ze met `VITE_` beginnen (bv. `VITE_API_URL`). Anders zijn ze alleen tijdens de build beschikbaar.

### Een nieuwe env var toevoegen

1. Voeg toe aan `eigen-poc/.env.example` (dummy waarde).
2. Voeg toe aan `eigen-poc/.env.local` (echte waarde, lokaal).
3. Voeg toe in Netlify → project `eigenpoc` → Site settings → Environment variables.
4. Trigger een redeploy (push of "Trigger deploy") om de var actief te krijgen.

### Een gelekte key roteren

1. Genereer een nieuwe key bij de bron.
2. Update Netlify env var → trigger redeploy.
3. Update lokale `.env.local`.
4. Revoke de oude key.

---

## 8. Repo-structuur

```
~/claude-projects/                  ← repo-root (git@github.com:theunkok-arch/claude-projects.git)
├── OPERATIONS.md                   ← je leest hem nu
├── AGENTS.md                       ← korte memo voor elke Claude-sessie
├── netlify.toml                    ← BRON VAN WAARHEID voor de EIGEN build/deploy
├── .gitignore                      ← negeert .DS_Store, *.potx, dosolutions-website/, .netlify
│
├── EIGEN_PRD_v1.docx               ← functionele specs (14 schermen)
├── EIGEN_Wireframes_v1.docx        ← visuele wireframes
├── EIGEN_Build_Plan_v1.docx        ← technisch build plan
│
├── eigen-poc/                      ← DE EIGEN APP (dit deployt naar Netlify)
│   ├── CLAUDE.md                   ← project-conventies (lees als authoritative)
│   ├── README.md
│   ├── package.json                ← React 19 + Vite 8 + Tailwind v4
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   ├── dist/                       ← build-output (git-ignored; Netlify bouwt dit)
│   └── src/
│       ├── App.jsx, main.jsx, index.css
│       ├── screens/{buyer,seller}/ ← B1–B6, S1–S8 schermen
│       ├── components/{ui,layout,ai,property,charts,mock}/
│       ├── data/                   ← mockProperties.js e.d. (alle "API"-data)
│       ├── stores/                 ← Zustand: buyerStore, sellerStore, appStore
│       ├── i18n/                   ← EN/NL vertalingen (en.js, nl.js, index.js)
│       ├── hooks/ en utils/
│
└── (root BTC EMA26 Alerts app — apart project, deployt via GitHub Pages)
    ├── index.html, app.js, style.css, sw.js, manifest.json
    └── .github/workflows/deploy.yml
```

### Belangrijke editable plekken (EIGEN)

| Wil je dit aanpassen | Bestand |
|---|---|
| Vertaalbare teksten | `eigen-poc/src/i18n/en.js` + `nl.js` (per scherm-namespace) |
| Properties / mock-data | `eigen-poc/src/data/mockProperties.js` |
| Filters / zoeklogica | `eigen-poc/src/utils/filterProperties.js` |
| Buyer/seller state | `eigen-poc/src/stores/*.js` (version-bump + migrate bij shape-changes) |
| Kleuren / design tokens | `eigen-poc/tailwind.config.js` (EIGEN-palette) |
| Build/deploy config | `~/claude-projects/netlify.toml` (root) |

---

## 9. Disaster-recovery scenarios

### "Mijn laptop is kapot/gestolen"

- ✅ Site blijft live: Netlify serveert door.
- ✅ Code is veilig: GitHub heeft alles.
- ⏱️ Weer aan het werk in 20-30 min op een nieuwe Mac (zie [§4 Scenario B](#scenario-b-nieuwe-mac-mac-kapot--vervangen)).

### "Netlify is losgeraakt van GitHub"

- Symptom: pushes naar `main` triggeren geen deploys meer.
- Fix: Netlify dashboard → project `eigenpoc` → **Site configuration → Build & deploy → Continuous deployment** → reconnect / re-link de repo.
- 0 minuten downtime — de laatste deploy blijft live.

### "Build faalt op Netlify"

- Netlify mailt je; de live site blijft op de vorige geslaagde deploy.
- Reproduceer lokaal: `cd ~/claude-projects/eigen-poc && npm run build`. Fix de error. Push opnieuw.
- Logs: Netlify dashboard → Deploys → klik de rode deploy, óf `netlify logs:deploy`.

### "Ik ben mijn Netlify-account kwijt"

- Recovery via Netlify support / e-mail reset. De repo + code staan veilig op GitHub.
- Reconstructie: maak een nieuwe Netlify-site, "Import existing project" → `claude-projects` → branch `main`. De `netlify.toml` regelt de rest. Binnen minuten weer live (nieuwe random URL tot je het domein herkoppelt).

### "Ik wil weg bij Netlify"

- Netlify is niet vendor-locked. `cd eigen-poc && npm run build` produceert een statische `dist/` die op **elke** statische host draait: Vercel, Cloudflare Pages, GitHub Pages, AWS Amplify, self-host.
- Andere host = nieuw project aanmaken daar, repo koppelen, build command `npm run build` + publish `eigen-poc/dist` (of base `eigen-poc`, publish `dist`), plus dezelfde SPA-fallback rule.

### "mijndomein / DNS issues" (zodra domein gekoppeld is)

- Kies bewust **apex** (`eigen.nl`) vs **www** (`www.eigen.nl`); zet de A-record (apex) en/of CNAME (www) zoals Netlify aangeeft.
- Fallback die altijd werkt: `https://eigenpoc.netlify.app` — onafhankelijk van je DNS.
- Cert provisioning hangt aan correcte DNS; geef het tot ~1 uur na de DNS-wijziging.

---

## 10. Password manager checklist

**Dit is je échte verzekering.** Zet deze allemaal in 1Password / Bitwarden / iCloud Keychain:

- [ ] **GitHub** — `theunkok-arch` — login + 2FA backup codes
- [ ] **Netlify** — team `eigen` — login (+ 2FA; let op als je via GitHub OAuth inlogt → indirect afhankelijk van GitHub 2FA)
- [ ] **Anthropic Claude Code** — billing login
- [ ] **mijndomeinhosting.nl** — login + 2FA (relevant zodra domein gekoppeld)
- [ ] **Google account** (`theunkok@gmail.com`) — login + 2FA (achterliggend voor GitHub)
- [ ] **Mac SSH key passphrase** (de ssh-keygen passphrase)
- [ ] **iCloud / Apple ID** (voor Mac herstel + Keychain sync)
- [ ] (Toekomst) **EIGEN API-keys** — zodra er echte integraties bijkomen

**Pro tip**: backup je password-vault versleuteld naar bv. iCloud Drive. Dan ben je écht bestand tegen hardware-failure.

---

## 11. Quick reference

### Commando's (draai vanuit de juiste folder)

| Wat | Commando |
|---|---|
| Start lokale dev server | `cd ~/claude-projects/eigen-poc && npm run dev` |
| Production build (sanity check) | `cd ~/claude-projects/eigen-poc && npm run build` |
| Lint | `cd ~/claude-projects/eigen-poc && npm run lint` |
| Deploy naar productie | `cd ~/claude-projects && git add -A && git commit -m "..." && git push origin main` |
| Handmatige deploy (CLI) | `cd ~/claude-projects && netlify deploy --prod` |
| Deploy-logs bekijken | `netlify logs:deploy` of dashboard → Deploys |
| Check wat live staat | https://eigenpoc.netlify.app of het Netlify dashboard |

### URL's

| Wat | URL |
|---|---|
| Live site | https://eigenpoc.netlify.app |
| Netlify dashboard | https://app.netlify.com/projects/eigenpoc |
| GitHub repo | https://github.com/theunkok-arch/claude-projects |
| GitHub SSH keys | https://github.com/settings/keys |
| Anthropic Claude Code docs | https://docs.claude.com/claude-code |

### Eerste prompt voor een nieuwe Claude sessie

```
Ik ben Theun, eigenaar van de EIGEN PoC.

Lees OPERATIONS.md en AGENTS.md in deze repo (~/claude-projects) voor context.
De EIGEN-app leeft in de subfolder eigen-poc/ en deployt naar Netlify
(eigenpoc.netlify.app) bij elke push naar main.

Voor deze sessie: ga uit van approval op file edits, npm commands, git commits
en pushes naar main, en routine netlify-commando's. Vraag alleen om bevestiging
bij destructive git operaties (reset --hard, force push), DNS-wijzigingen, of
Netlify-instellingen die productie raken.

Klaar wanneer je dit hebt gelezen. Daarna geef ik mijn eerste wijziging.
```

---

## Bijlage: wat doet AGENTS.md / CLAUDE.md?

Bestanden genaamd `AGENTS.md` of `CLAUDE.md` in een repo worden automatisch gelezen door élke Claude-sessie die in die folder werkt. Daardoor leven de instructies die toekomstige Claude nodig heeft **samen met de code**, niet in een Claude-specifieke config die zou verdwijnen bij een licentie-wissel.

In deze repo:

- **`AGENTS.md`** (repo-root) — korte memo: monorepo-layout, deploy-pipeline, permission posture. Wijst naar dit document.
- **`OPERATIONS.md`** (repo-root) — dit document, de complete handleiding.
- **`eigen-poc/CLAUDE.md`** — project-specifieke conventies van de EIGEN-app (design system, routes, mock-strategie).

Zo blijft jouw kennis bij de code, niet bij je tool.
