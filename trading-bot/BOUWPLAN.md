# BloFin EMA26 Trading Bot — Bouwplan

**Voor: de clawbot (Claude-agent) die dit gaat bouwen.**
**Status:** specificatie, nog geen code geschreven.

Dit document is zelfstandig leesbaar. Je hebt de conversatie waarin het ontstond niet nodig.

---

## 0. Wat je bouwt, in één alinea

Een deterministisch Python-proces dat 24/7 op een VPS draait, elke paar seconden bij BloFin
opvraagt of er een nieuwe *afgesloten* candle is, daarop een EMA26-cross-regel toepast, en
long-only posities opent en sluit in BTC/USDT perpetual futures. Daarnaast een kleine
mobiele webinterface die laat zien wat de bot doet, en een noodstop.

**Kernbeslissing die al genomen is: er zit geen LLM in de order-loop.** De handelsbeslissing
is gewone, testbare Python. Jij (de clawbot) bouwt, backtest, deployt en onderhoudt de code —
maar op het moment dat er een order de deur uit gaat, is er geen model dat iets interpreteert.
Reden: een model is niet-deterministisch, traag en duur, en een hallucinatie kost hier echt geld.

---

## 1. Vastgestelde keuzes

Deze zijn al besloten. Wijk er niet van af zonder te overleggen.

| Onderwerp | Keuze |
|---|---|
| Beurs | BloFin, BTC/USDT perpetual (`BTC/USDT:USDT` in CCXT) |
| Richting | **Long-only.** Boven EMA26 = long open. Onder EMA26 = long sluiten, dan flat. Geen shorts. |
| Timeframes | Signaal-TF + hogere TF als filter (zie §5) |
| Hefboom | 1x (geen liquidatierisico) |
| Inzet | $50–100 notional per trade |
| Volgorde | Backtest → demo → live |
| Hosting | Eigen VPS, systemd |
| Library | CCXT (geverifieerd: v4.5.82 ondersteunt BloFin volledig) |

### Geverifieerde technische feiten

Dit is nagetrokken, niet uit het geheugen:

- CCXT `blofin` ondersteunt `createOrder`, `fetchOHLCV`, `fetchPositions`, `fetchPosition`,
  `setLeverage`, `setMarginMode`, `fetchBalance`, `cancelOrder`, `fetchOpenOrders`,
  `fetchMyTrades`, `createStopLossOrder`, `fetchClosedOrders`.
- Beschikbare timeframes: `1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M`.
  Alle vier de gewenste TF's zitten erin.
- Demo-omgeving: `https://demo-trading-openapi.blofin.com`, te activeren met
  `exchange.set_sandbox_mode(True)`.
- Authenticatie heeft **drie** velden: API key, API secret én passphrase.
- CCXT default `rateLimit` voor BloFin is 200 ms tussen calls.

---

## 2. Wat de operator zélf moet doen

Dit kan de clawbot niet voor je doen. Doe dit eerst — zonder deze stappen kan er niets draaien.

### 2.1 BloFin account en API-sleutels

1. Account aanmaken op BloFin en KYC afronden.
2. **Demo-sleutels aanmaken.** BloFin heeft een aparte demo-trading omgeving met eigen
   sleutels. Maak die eerst.
3. **Live-sleutels aanmaken**, met deze instellingen:
   - Permissie **Trade**: AAN
   - Permissie **Withdraw**: **UIT** — altijd, zonder uitzondering. Een bot hoeft nooit
     geld op te nemen. Als de sleutel lekt, kan er dan niets weg.
   - **IP-whitelist**: het vaste IP van je VPS. Dit is de belangrijkste enkele
     beveiligingsmaatregel die je kunt nemen.
4. Noteer per omgeving de drie velden: key, secret, passphrase.
5. Stort een klein bedrag op de futures-wallet. Begin met wat je kunt missen — als vuistregel
   niet meer dan 10–20x je trade-notional, dus bij $75 notional zo'n $750–1500 maximaal, en
   gerust minder.

### 2.2 VPS

- Elke kleine Linux-VPS voldoet: Hetzner CX22 (~€4/mnd) of DigitalOcean basic droplet (~$6/mnd).
- Ubuntu 24.04 LTS, minimaal 1 GB RAM.
- **Kies een regio dicht bij de beurs-endpoints** (BloFin zit in Azië; Singapore of Tokio geeft
  lagere latency dan Europa). Voor deze strategie is latency niet kritiek — je handelt op
  candle-closes, niet op ticks — maar het scheelt in slippage.
- SSH-key login, wachtwoord-login uit.
- Noteer het publieke IP → dat gaat in de BloFin IP-whitelist.
- Zet NTP aan (`timedatectl set-ntp true`). **API-signing faalt bij klok-drift.**

### 2.3 Telegram voor meldingen

1. Praat in Telegram met `@BotFather`, stuur `/newbot`, kies een naam. Je krijgt een bot-token.
2. Stuur je nieuwe bot één bericht.
3. Haal je chat-ID op: `https://api.telegram.org/bot<TOKEN>/getUpdates` → zoek `chat.id`.
4. Noteer token en chat-ID.

Waarom Telegram en niet de browser-notificaties uit de bestaande webapp: de bot draait op een
server, niet in je browser. Browser-push werkt alleen als de pagina/service worker leeft.
Telegram bereikt je telefoon altijd.

### 2.4 Checklist vóór je de clawbot laat beginnen

- [ ] BloFin demo key + secret + passphrase
- [ ] BloFin live key + secret + passphrase (withdraw UIT, IP-whitelist AAN)
- [ ] VPS bereikbaar via SSH, IP genoteerd, NTP aan
- [ ] Telegram bot-token + chat-ID
- [ ] Futures-wallet gefund
- [ ] Besloten: startbedrag per trade (voorstel: $75) en max dagverlies (voorstel: $25)

---

## 3. De strategie — exacte specificatie

Dit is de normatieve sectie. Bij twijfel over gedrag: dit wint.

### 3.1 De regel

Long-only, per signaal-timeframe:

```
side(candle) = ABOVE  als close > EMA26
             = BELOW  als close <= EMA26      # exact gelijk telt als BELOW

ENTER_LONG  als: side veranderde van BELOW naar ABOVE
                 EN filter-TF staat op ABOVE
                 EN we hebben nog geen positie

EXIT_LONG   als: side veranderde van ABOVE naar BELOW
                 EN we hebben een positie

anders:     HOLD
```

"Alleen geldig wanneer een nieuwe situatie optreedt" is hier letterlijk geïmplementeerd: er
gebeurt uitsluitend iets op het moment dat `side` **verandert**. Blijft de koers tien candles
boven de EMA, dan is er één entry en verder niets.

### 3.2 Zes valkuilen die je expliciet moet afvangen

Dit is waar dit soort bots in de praktijk op stukloopt. Behandel elk punt als een eis.

**1. Alleen afgesloten candles.** `fetch_ohlcv` geeft als laatste element de candle die nú
gevormd wordt. Die verandert nog. Handelen op een niet-afgesloten candle betekent dat je
signaal "repaint": je koopt op een cross die een uur later niet meer bestaat. Filter op
`open_ts + timeframe_ms <= now_ms`. Dit is de belangrijkste correctheidseis in het hele
project.

> Let op: de bestaande webapp in deze repo (`btc-ema26.html`) leest wél de vormende candle.
> Voor een dashboard is dat prima, voor de bot is het fataal. Neem die code niet over.

**2. EMA-seeding.** Start de EMA met het SMA-gemiddelde van de eerste 26 closes, niet met
`closes[0]`. Dat is wat TradingView's `ta.ema` doet, dus dan komen je waardes overeen met wat
je op de grafiek ziet. Haal minstens 300 candles op zodat de EMA geconvergeerd is.

**3. Geen trade bij het opstarten.** Bij de allereerste evaluatie is er geen vorige `side`
bekend, dus is er per definitie geen transitie. Noteer de side en doe niets. Zonder deze
regel opent de bot een positie elke keer dat je hem herstart.

**4. Idempotentie.** Sla per timeframe op welke candle-timestamp je als laatste verwerkt hebt.
Verwerk nooit dezelfde candle twee keer. Geef elke order een `clientOrderId` die afgeleid is
van `(timeframe, candle_ts, side)`, zodat een retry na een netwerk-timeout geen tweede positie
opent.

**5. Reconciliatie bij start.** Vraag bij het opstarten de werkelijke positie op bij BloFin en
neem die als waarheid — niet je lokale state. Je kunt handmatig hebben ingegrepen, of er kan
een stop getriggerd zijn terwijl de bot down was.

**6. Rate limits en herstel.** Exponentiële backoff op netwerkfouten. De bot moet een
uitval van uren kunnen overleven en daarna gewoon verder gaan bij de eerstvolgende
onverwerkte candle.

### 3.3 Welke TF-combinatie te gebruiken

Eén positie, één signaal-TF, één filter-TF. Configureerbaar:

| Signaal-TF | Filter-TF | Verwachting |
|---|---|---|
| `1d` | geen | Weinig trades, laagste fee-druk. Veiligste start. |
| `4h` | `1d` | **Aanbevolen startpunt.** Redelijke balans. |
| `1h` | `4h` | Backtest eerst — fee-druk wordt serieus. |
| `15m` | `1h` | Backtest eerst — zie §7, waarschijnlijk niet rendabel. |

Bouw het als één instance met een config-parameter. Meerdere TF's tegelijk draaien kan later
door meerdere instances te starten met elk een eigen state-database — maar doe dat pas als één
instance bewezen werkt, en bij voorkeur op gescheiden sub-accounts zodat de posities elkaar
niet in de weg zitten.

### 3.4 Configuratie

```yaml
exchange:
  demo: true                  # false = ECHT GELD. Dit is de enige schakelaar die telt.
  symbol: "BTC/USDT:USDT"
  margin_mode: "cross"
  leverage: 1

strategy:
  ema_period: 26
  signal_timeframe: "4h"
  filter_timeframe: "1d"      # null = geen filter
  warmup_candles: 300

risk:
  notional_usd: 75
  max_daily_loss_usd: 25      # bot gaat flat en stopt voor de dag
  hard_stop_loss_pct: 5.0     # noodrem op de positie zelf; null = uit
  max_open_notional_usd: 150

runtime:
  poll_seconds: 20
  state_db: "state.sqlite3"
  kill_switch_file: "STOP"
  log_level: "INFO"

notify:
  telegram_bot_token: null
  telegram_chat_id: null
```

API-sleutels komen **niet** in dit bestand maar uit environment variables:
`BLOFIN_API_KEY`, `BLOFIN_API_SECRET`, `BLOFIN_PASSPHRASE`.
Zet `config.yaml` en `.env` in `.gitignore`.

---

## 4. Architectuur en repo-structuur

```
trading-bot/
├── bot/
│   ├── config.py        # laden + valideren van config, faalt hard bij onzin
│   ├── strategy.py      # §3.1 als pure functies — geen I/O, volledig testbaar
│   ├── indicators.py    # EMA met SMA-seeding
│   ├── exchange.py      # CCXT-wrapper: orders, posities, retries, sizing
│   ├── state.py         # SQLite: verwerkte candles, side per TF, positie, trade-log
│   ├── risk.py          # dagverlies-limiet, kill switch, positiegrootte
│   ├── notifier.py      # Telegram + logging
│   └── runner.py        # hoofdloop
├── api/
│   └── server.py        # FastAPI: /api/status, /api/trades, /api/kill
├── ui/
│   └── index.html       # mobiel dashboard (zie §6)
├── backtest.py          # zelfde strategy.py over historische data
├── tests/
│   └── test_strategy.py # pytest
├── config.example.yaml
├── requirements.txt
├── systemd/
│   ├── ema-bot.service
│   └── ema-api.service
└── README.md
```

**Harde eis:** `backtest.py` en `runner.py` importeren dezelfde `strategy.decide()`. Als de
backtest een eigen kopie van de logica krijgt, test je iets anders dan wat er live draait en
is de backtest waardeloos.

### Hoofdloop

```
elke poll_seconds:
    als kill-switch-bestand bestaat:  ga flat, stuur melding, stop
    als dagverlies > limiet:          ga flat, pauzeer tot middernacht UTC
    haal afgesloten candles op voor signaal-TF en filter-TF
    als nieuwste afgesloten candle al verwerkt is: ga terug naar slapen
    besluit = strategy.decide(...)
    log het besluit met alle inputs die het opleverden
    voer uit indien nodig, noteer candle als verwerkt, stuur Telegram-melding
```

Pollen (en niet slim uitrekenen wanneer de volgende candle sluit) is bewust: het herstelt
vanzelf na downtime en heeft geen last van klok-drift.

---

## 5. De UI

### Wat het moet tonen

- Huidige positie: open/flat, entry-prijs, omvang, ongerealiseerde P&L
- Per timeframe: laatste close, EMA26, verschil, ABOVE/BELOW, tijdstip laatste cross
- Vandaag: aantal trades, gerealiseerde P&L, ruimte tot de dagverlies-limiet
- Trade-log: laatste 20 trades met tijd, richting, prijs, P&L, en de reden die de bot logde
- Bot-gezondheid: draait het proces, wanneer was de laatste succesvolle API-call
- **Noodstop-knop** met bevestiging

### Architectuur

De bot schrijft naar SQLite. Een losse FastAPI-service leest diezelfde database en serveert
JSON plus de statische pagina. De UI schrijft nooit rechtstreeks naar de bot-state; de
noodstop zet alleen het kill-switch-bestand neer, en de bot pikt dat op in zijn eigen loop.
Twee processen, één database, duidelijke richting.

### Toegang — lees dit voordat je iets publiceert

Dit dashboard toont je posities en kan je bot stoppen. Zet het **niet** open op het publieke
internet met alleen een token ervoor.

**Aanbevolen: Tailscale.** Installeer het op de VPS en op je telefoon. De UI luistert dan
alleen op het Tailscale-adres. Geen open poort, geen domein, geen certificaat, geen
inlogscherm dat gebrute-forced kan worden. Op je telefoon is het gewoon een URL.

Alternatief als je per se publiek wilt: Caddy als reverse proxy met automatisch HTTPS, plus
een bearer-token dat de `/api/kill`-route óók afdwingt. Duidelijk tweede keus.

### Bestaande webapp

`btc-ema26.html` in de root van deze repo is een losstaand EMA26-dashboard op Binance-data.
Gebruik het als **visuele referentie** — de kaartenlayout, de kleurcodering, de mobiele
styling zijn bruikbaar. Maar neem de datalogica niet over: die leest de vormende candle
(zie §3.2, punt 1) en praat met Binance in plaats van met jouw bot.

---

## 6. Fasering

### Fase 1 — Bouwen en backtesten (geen geld)

1. Repo-scaffold, dependencies, config-laden.
2. `indicators.py` + `strategy.py` + unit tests. **Test dit eerst en grondig** — dit is de
   enige plek waar de handelslogica zit. Testgevallen die er zeker in moeten:
   cross omhoog, cross omlaag, geen cross, filter blokkeert entry, eerste evaluatie doet
   niets, close exact gelijk aan EMA, twee crosses achter elkaar.
3. `backtest.py`: haal via CCXT minstens 2 jaar historie op voor 15m/1h/4h/1d en draai
   `strategy.decide()` erover met realistische kosten: **0,06% taker per kant, dus 0,12% per
   round trip**, plus een slippage-aanname van 0,02%.
4. Rapporteer per TF-combinatie: aantal trades, win-rate, totaalrendement, max drawdown,
   **totale fee-kosten als percentage van het rendement**, en de vergelijking met simpelweg
   BTC vasthouden.

**Beslispunt.** Gaat een TF-combinatie in de backtest niet duidelijk boven nul uit ná kosten,
dan gaat die niet live. Dat is het hele punt van deze stap.

### Fase 2 — Demo

1. `exchange.demo: true`, demo-sleutels in de env.
2. Draaien onder systemd met auto-restart.
3. **Minimaal 2 weken**, en lang genoeg om minstens 10 trades te zien.
4. Wat je controleert:
   - Klopt elke trade met wat de backtest op dezelfde data zou doen?
   - Overleeft de bot een `systemctl restart` zonder dubbele positie?
   - Overleeft hij een reboot van de VPS?
   - Werkt de noodstop, ook als er een positie open staat?
   - Komen de Telegram-meldingen aan?
   - Klopt de P&L in de UI met wat BloFin zelf zegt?

### Fase 3 — Live

Pas overstappen als élk van deze punten waar is:

- [ ] Backtest laat positieve verwachting na kosten zien voor deze TF-combinatie
- [ ] 2+ weken demo zonder crash, zonder dubbele order, zonder onverklaarde trade
- [ ] Herstart- en reboot-test geslaagd
- [ ] Noodstop getest mét open positie
- [ ] API-key heeft withdraw UIT en IP-whitelist AAN
- [ ] Dagverlies-limiet getest (forceer hem eens in demo)
- [ ] Je weet precies hoeveel je maximaal kunt verliezen en dat bedrag is acceptabel

Dan: `demo: false`, live-sleutels, `notional_usd: 75`, en de eerste week elke dag kijken.

---

## 7. Eerlijke verwachtingen

Drie dingen die je moet weten voordat je hier geld in stopt.

### De fee-rekensom is het grootste risico

Bij ~0,06% taker-fee kost een round trip ongeveer **0,12% van je notional**. Dat lijkt niets,
maar het schaalt met het aantal crosses:

| Signaal-TF | Ruwe schatting crosses/dag | Fee-druk per dag |
|---|---|---|
| 15m | 8–12 | ~1,0–1,4% |
| 1h | 3–5 | ~0,4–0,6% |
| 4h | 1–2 | ~0,1–0,25% |
| 1d | ~0,2 | ~0,02% |

**Dit zijn schattingen, geen metingen** — ik kon ze hier niet verifiëren omdat de beurs-API's
vanuit deze omgeving geblokkeerd zijn. De backtest in fase 1 moet ze vervangen door echte
cijfers.

Maar de orde van grootte is duidelijk genoeg: op 15m moet de strategie meer dan 1% per dag
verdienen om alleen al de kosten te dekken. Dat haalt een simpele EMA-cross vrijwel zeker
niet. De filter-TF helpt — die blokkeert tegendraadse entries en scheelt grofweg de helft van
de trades — maar het verandert die verhouding niet fundamenteel. **Reken erop dat 15m en
mogelijk 1h afvallen na de backtest.** Dat is geen mislukking, dat is precies de informatie
waarvoor je backtest.

Als je toch naar de snellere TF's wilt: gebruik post-only limit-orders (maker, ~0,02% in
plaats van 0,06%). Dat verlaagt de kosten met tweederde, maar introduceert het risico dat je
order niet gevuld wordt en je het signaal mist. Dat is een aparte uitbreiding, niet iets voor
v1.

### Wat voor strategie dit is

Een EMA-cross is trendvolgend. In een trend werkt het goed; in een zijwaartse markt — waar BTC
een groot deel van de tijd in zit — krijg je serie na serie kleine verliezen. Verwacht een
win-rate onder de 40%, met een paar grote winnaars die de vele kleine verliezers moeten
goedmaken. Dat voelt vervelend, ook als het wiskundig werkt. Weet dat vooraf, zodat je de bot
niet uitzet na vijf verliezen op rij.

### Demo is niet live

Demo-omgevingen vullen orders optimistisch: geen echte slippage, geen partial fills, geen
momenten waarop de orderboek-liquiditeit even weg is. Reken op iets slechtere resultaten
live dan in demo.

---

## 8. Wat er nog meer nodig is

Niet strikt vereist voor de eerste demo-run, wel voordat er echt geld in gaat:

- **Logrotatie.** Een bot die maanden draait vult anders je schijf. `logrotate` of
  `RotatingFileHandler`.
- **Back-up van `state.sqlite3`.** Dagelijks naar buiten de VPS. Hierin zit je trade-historie.
- **Watchdog.** `Restart=always` in systemd is het minimum. Beter: een health-endpoint dat
  meldt wanneer de laatste succesvolle API-call was, en een Telegram-alarm als de bot langer
  dan 10 minuten stil is.
- **Een `--dry-run` vlag** die alles doet behalve orders plaatsen. Onmisbaar bij debuggen.
- **Belasting.** In Nederland valt dit onder box 3 (vermogen per 1 januari), niet onder box 1,
  zolang het geen beroepsmatige activiteit is. Houd je trade-log bij; die heb je nodig en de
  bot schrijft hem toch al. Bij twijfel over de indeling: vraag het een belastingadviseur, niet
  een taalmodel.

---

## 9. Kan dit morgen?

Realistisch, als de checklist uit §2 klaarstaat:

| | |
|---|---|
| **Morgenochtend** | Scaffold, strategy + tests, backtest draaien. Dit is het meeste werk en levert meteen het belangrijkste antwoord op: welke TF's overleven de kosten. |
| **Morgenmiddag** | Exchange-laag, state, runner. Demo-run starten op de VPS. |
| **Morgenavond** | UI + Telegram. Bot staat te draaien op demo. |
| **Over ~2 weken** | Beoordelen, en pas dan live. |

Dus: **morgen op demo, ja. Morgen live, nee.** Niet omdat het technisch niet kan, maar omdat
je dan zonder backtest en zonder één dag stabiliteitsbewijs geld inzet op een strategie
waarvan de kostenstructuur het grootste open vraagstuk is. Twee weken wachten kost je
mogelijk wat rendement; het overslaan kost je mogelijk de inleg.

---

## 10. Eerste opdracht voor de clawbot

Begin hier, in deze volgorde:

1. Zet het scaffold uit §4 neer met `requirements.txt` (ccxt, pyyaml, fastapi, uvicorn,
   requests, pytest).
2. Bouw `indicators.py` en `strategy.py` exact volgens §3.1 en §3.2.
3. Schrijf de unit tests uit §6, fase 1, stap 2. Laat ze slagen.
4. Bouw `backtest.py` en draai hem over 2 jaar data voor alle vier de TF-combinaties uit §3.3.
5. **Stop daar en rapporteer de cijfers**, vóór je de exchange-laag bouwt. De uitkomst
   bepaalt welke timeframe überhaupt de moeite waard is om live te ondersteunen.
