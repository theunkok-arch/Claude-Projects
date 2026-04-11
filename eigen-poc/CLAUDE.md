# EIGEN PoC — Claude Code Instructions

## Project Overview
EIGEN is an AI real estate super-app for the Netherlands that replaces the traditional makelaar (real estate agent). This is a Proof of Concept — a fully interactive frontend demo with all external integrations mocked. The goal is an investor-ready demo deployed on Netlify.

## Reference Documents
- **EIGEN_PRD_v1.docx** — Complete functional requirements for all 14 screens
- **EIGEN_Wireframes_v1.docx** — Visual wireframe specifications for all screens
- **EIGEN_Build_Plan_v1.docx** — Full technical build plan with architecture, mock strategies, component specs

## Tech Stack
- React 18 + Vite 5
- Tailwind CSS 3.4 (custom EIGEN palette in tailwind.config.js)
- React Router v6 (client-side routing)
- Zustand (state management, persisted to localStorage)
- Framer Motion (page transitions + micro-interactions)
- Recharts (charts/graphs for S5 dashboard, B3 overbid histogram)
- Leaflet + React-Leaflet (maps for B2, B4)
- Lucide React (icons throughout)

## Architecture
- All screens in `src/screens/` (seller/ and buyer/ subdirectories)
- Shared components in `src/components/` organized by category: ui/, layout/, ai/, property/, charts/, mock/
- Mock data in `src/data/` — all external API data is hardcoded here as JS objects
- State stores in `src/stores/` — sellerStore.js, buyerStore.js, appStore.js (Zustand)
- Custom hooks in `src/hooks/` — useAIDelay, useAnimateNumber, useLocalStorage
- No backend — everything is client-side with simulated delays

## Routes
```
/                       → Landing (seller/buyer choice)
/sell/valuation         → S1: Home Valuation
/sell/photos            → S2: Professional Photos
/sell/listing           → S3: Listing Description
/sell/pricing           → S4: Set Your Price
/sell/dashboard         → S5: LIVE Dashboard
/sell/bids              → S6: Incoming Bids
/sell/explore           → S7: Explore Buyers (Pro)
/sell/closed            → S8: Deal Closed
/buy/search             → B1: AI Search
/buy/results            → B2: Search Results
/buy/property/:id       → B3: Property Detail
/buy/viewing/:id        → B4: Viewing Preparation
/buy/bid/:id            → B5: Make a Bid
/buy/keys               → B6: Keys (Closing Process)
```

## Design System

### Colors (Tailwind config)
- `eigen-navy`: #1B3A5C — Primary headers, navigation, key typography
- `eigen-orange`: #FF6B35 — Seller accent, CTAs, savings highlights
- `eigen-blue`: #3B82F6 — Buyer accent, active states, chat
- `eigen-purple`: #8B5CF6 — AI indicator (borders, labels, backgrounds)
- `eigen-green`: #22C55E — Success, verified badges, positive metrics
- `eigen-amber`: #F59E0B — Warning, action required
- `eigen-red`: #EF4444 — Error, reject, negative

### Layout
- Mobile-first: max-width 430px, centered on desktop
- Card radius: 16px (rounded-2xl)
- Button radius: 8px (rounded-lg), pills: 20px (rounded-full)
- Minimum touch target: 44x44px
- System font stack: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto

### AI Visual Language
All AI-generated content uses a consistent pattern:
- 4px left border in purple (#8B5CF6)
- Light purple background (#F3E8FF / bg-purple-50)
- "AI" label with sparkle icon (✨) in purple
- Purple text for AI element headers

### Component Patterns
- **Cards:** white bg, rounded-2xl, shadow-sm, border border-gray-200, p-4
- **Buttons:** min-h-12, rounded-lg, font-semibold, text-base
- **Inputs:** h-12, rounded-lg, border-gray-300, focus:ring-2
- **Sticky CTA:** fixed bottom, full width, h-14, prominent color

## Mock Strategy
Every integration is simulated with realistic delays and Dutch data:
1. **Kadaster address lookup:** Client-side filter on 80+ real Dutch addresses in mockAddresses.js
2. **IDIN verification:** In-app modal simulating bank selection → auth → success flow (3s total)
3. **AI generation:** Pre-written Dutch text revealed with character-by-character typing animation (~30 chars/sec)
4. **Mollie payments:** Simulated iDEAL bank selection → processing → confirmation flow (2.5s)
5. **Analytics data:** Seeded random generator creating 30 days of realistic view/save/request data
6. **Maps:** Leaflet + OpenStreetMap tiles (free, no key needed)
7. **Photo enhancement:** CSS filters for Natural/Bright/Magazine presets (client-side)

## Key Conventions
- Use "makelaar" throughout (never "agent" or "real estate agent")
- Currency format: €425.000 (Dutch style with dots, not commas)
- All UI text in English for this PoC (Dutch localization is post-PoC)
- Zustand stores auto-persist to localStorage so state survives page refresh
- Page transitions: Framer Motion AnimatePresence with slide direction based on navigation
- All numbers that appear should animate (count-up effect) on first render

## Build & Deploy
- `npm run dev` — local dev server with HMR
- `npm run build` — production build to dist/
- Netlify auto-deploys from GitHub on push to main
- SPA routing configured in netlify.toml: `/* → /index.html 200`

## Quality Checklist
- [ ] All 14 screens navigable with smooth transitions
- [ ] Every mock integration has loading → success states (no instant reveals)
- [ ] Savings comparison (makelaar vs EIGEN) visible on S4
- [ ] AI typing animation on all generated text
- [ ] Charts render correctly (S5 dashboard, B3 overbid histogram)
- [ ] Map works on B2 with colored pins
- [ ] Photo upload works with thumbnail preview on S2
- [ ] Accept/Counter/Reject flows work on S6
- [ ] PWA meta tags present for fullscreen mobile experience
- [ ] Loads under 2 seconds, works on iPhone Safari
