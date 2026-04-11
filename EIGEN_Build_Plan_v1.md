# EIGEN PoC Build Plan — Technical Brief for Claude Code

**Version 1.0 | April 2026 | Confidential**
**Author:** Theun Kok | AI Startup Consultant

---

## 1. Executive Summary

This document is the build specification for the EIGEN Proof of Concept (PoC) — a functional web app demonstrating the full 14-screen experience (8 seller + 6 buyer screens) for the AI real estate super-app that replaces the traditional Dutch makelaar. The PoC will be deployed to Netlify via GitHub, built as a React SPA that feels native, looks polished, and simulates all integrations convincingly without real API connections.

**Goal:** A demo-grade web app that you can hand an investor or strategic partner (Rabobank, De Hypotheker, Vereniging Eigen Huis) and have them click through a complete seller and buyer journey that feels real. Every interaction that would require an external API in production is mocked with realistic delays, animations, and data — but architecturally designed so each mock can be swapped for a real integration with minimal refactoring.

**Primary sources:** EIGEN PRD v1 (functional requirements, wireframe descriptions, technical requirements) and EIGEN Wireframes v1 (visual screen mockups).

---

## 2. Architecture Decision

### Why React SPA (not multi-page HTML)

The current prototypes (seller-mode-v2.html, buyer-mode-v2.html) are self-contained HTML files with toggled div screens. This worked well for a clickable demo but is insufficient for a PoC that needs:

- Shared state across screens (user data flows from S1 to S8)
- Realistic transitions and animations
- Component reuse (cards, buttons, AI bubbles used everywhere)
- Mock data management (JSON-based, swappable for real APIs)
- URL-based routing (deep linking to any screen for demos)
- Maintainability for iterating toward MVP

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | React 18 + Vite | Fast builds, Netlify-native, Claude Code fluent |
| Styling | Tailwind CSS 3.4 | Utility-first matches design system, rapid iteration |
| Routing | React Router v6 | URL-based navigation, nested routes for seller/buyer |
| State | Zustand | Lightweight, no boilerplate, persists to localStorage |
| Animations | Framer Motion | Smooth page transitions, micro-interactions |
| Charts | Recharts | Already in PRD spec, React-native, lightweight |
| Maps | Leaflet + OpenStreetMap | Free, no API key needed for PoC, Dutch tile support |
| Icons | Lucide React | Clean, consistent, tree-shakeable |
| Build | Vite 5 | Fast HMR, optimized production build |
| Deploy | Netlify (via GitHub) | Auto-deploy on push, free tier sufficient |

### Why NOT Next.js

Next.js adds SSR complexity we don't need. The PoC is entirely client-side — no backend, no server functions, no database. Vite + React is simpler, faster to build, and produces a static bundle that drops directly onto Netlify.

---

## 3. Project Structure

```
eigen-poc/
├── public/
│   ├── images/
│   │   ├── properties/          # Mock property photos (6-8 stock images)
│   │   ├── avatars/             # User avatar placeholders
│   │   └── logos/               # Bank logos (Rabobank, ING, ABN AMRO), EIGEN logo
│   ├── favicon.svg
│   └── _redirects               # Netlify SPA routing: /* /index.html 200
├── src/
│   ├── main.jsx                 # React entry point
│   ├── App.jsx                  # Router setup, layout wrapper
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.jsx     # Header + progress bar + content + bottom CTA
│   │   │   ├── Header.jsx       # EIGEN logo + avatar
│   │   │   ├── ProgressBar.jsx  # Step indicator (seller: 8, buyer: 6)
│   │   │   ├── BottomCTA.jsx    # Sticky bottom action button
│   │   │   └── BottomNav.jsx    # Buyer bottom tab navigation
│   │   ├── ui/
│   │   │   ├── Button.jsx       # Primary, secondary, accent, ghost variants
│   │   │   ├── Card.jsx         # Standard card with optional gradient
│   │   │   ├── Input.jsx        # Text input with label, validation, counter
│   │   │   ├── Toggle.jsx       # On/off switch
│   │   │   ├── Badge.jsx        # Status badges (Live, Verified, etc.)
│   │   │   ├── Chip.jsx         # Filter chip (active/inactive)
│   │   │   ├── Modal.jsx        # Slide-up modal/sheet
│   │   │   ├── Accordion.jsx    # Expandable section
│   │   │   ├── Tooltip.jsx      # Info tooltip for explanations
│   │   │   └── ProgressRing.jsx # Circular progress indicator
│   │   ├── ai/
│   │   │   ├── AIBubble.jsx     # Purple-bordered AI insight card
│   │   │   ├── AITyping.jsx     # Typing animation for AI responses
│   │   │   └── AIVerdict.jsx    # Traffic-light verdict card (B3)
│   │   ├── property/
│   │   │   ├── PropertyCard.jsx      # Search result card (B2)
│   │   │   ├── PropertyMiniCard.jsx  # Compact reference card (B5, B6)
│   │   │   ├── PhotoGrid.jsx         # Upload grid with thumbnails (S2)
│   │   │   ├── ComparisonMatrix.jsx  # Side-by-side comparison table
│   │   │   └── PhotoCarousel.jsx     # Swipeable photo gallery (B3)
│   │   ├── charts/
│   │   │   ├── Sparkline.jsx    # Mini trend line
│   │   │   ├── Funnel.jsx       # Engagement funnel (S5)
│   │   │   ├── BarChart.jsx     # Views over time (S5), overbid histogram (B3)
│   │   │   └── PriceGauge.jsx   # Acceptance probability gauge (B5)
│   │   └── mock/
│   │       ├── IDINFlow.jsx     # Simulated bank identity verification
│   │       ├── KadasterLookup.jsx  # Simulated address autocomplete
│   │       ├── PaymentFlow.jsx  # Simulated Mollie/iDEAL payment
│   │       └── AIGenerator.jsx  # Simulated AI text generation with typing
│   ├── screens/
│   │   ├── Landing.jsx          # Home screen (seller/buyer choice)
│   │   ├── seller/
│   │   │   ├── S1Valuation.jsx
│   │   │   ├── S2Photos.jsx
│   │   │   ├── S3Listing.jsx
│   │   │   ├── S4Pricing.jsx
│   │   │   ├── S5Dashboard.jsx
│   │   │   ├── S6Bids.jsx
│   │   │   ├── S7Explore.jsx
│   │   │   └── S8Closed.jsx
│   │   └── buyer/
│   │       ├── B1Search.jsx
│   │       ├── B2Results.jsx
│   │       ├── B3Detail.jsx
│   │       ├── B4Viewing.jsx
│   │       ├── B5Bid.jsx
│   │       └── B6Keys.jsx
│   ├── data/
│   │   ├── mockProperties.js    # 8-10 realistic Dutch property listings
│   │   ├── mockBuyers.js        # 5-8 anonymous buyer profiles
│   │   ├── mockBids.js          # 3-4 offers for the seller flow
│   │   ├── mockAddresses.js     # 50+ Dutch addresses for autocomplete
│   │   ├── mockAnalytics.js     # Time-series view/save/request data
│   │   ├── mockNeighbourhood.js # School, safety, transport scores per area
│   │   └── constants.js         # Package prices, makelaar rates, etc.
│   ├── stores/
│   │   ├── sellerStore.js       # Seller journey state (address, photos, listing, price, bids)
│   │   ├── buyerStore.js        # Buyer journey state (search, saved, bids, viewing)
│   │   └── appStore.js          # Global state (user, mode, theme)
│   ├── hooks/
│   │   ├── useAIDelay.js        # Simulate AI processing time (1-3s with progress)
│   │   ├── useAnimateNumber.js  # Animated number counting
│   │   └── useLocalStorage.js   # Persist state across sessions
│   ├── utils/
│   │   ├── formatCurrency.js    # Dutch-style: €425.000
│   │   ├── formatDate.js        # Dutch locale dates
│   │   └── mockDelay.js         # Configurable async delay for mock APIs
│   └── styles/
│       └── index.css            # Tailwind imports + custom CSS variables
├── tailwind.config.js           # EIGEN color palette, fonts
├── vite.config.js
├── package.json
├── netlify.toml                 # Build config
├── .gitignore
├── CLAUDE.md                    # Claude Code project instructions
└── README.md
```

---

## 4. Design System — Refined for PoC

### Color Philosophy

The PoC should feel like a premium Dutch fintech app — clean, trustworthy, modern. We keep EIGEN's navy primary but refine the palette to be closer to the Funda-level polish that Dutch users expect from a real estate platform. Funda itself uses deep cerulean blue (#0071B3) and light blue accents — our navy is a deliberate differentiation (more premium/financial), but we adopt their clarity and whitespace discipline.

### Tailwind Config Color Palette

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        eigen: {
          navy: '#1B3A5C',        // Primary — headers, key UI
          'navy-light': '#234B73', // Hover states
          'navy-dark': '#122740',  // Dark backgrounds
          orange: '#FF6B35',       // Seller accent, CTAs, savings
          'orange-light': '#FF8F66', // Orange hover
          'orange-dark': '#E55A2B',  // Orange pressed
          blue: '#3B82F6',         // Buyer accent, active states
          'blue-light': '#60A5FA', // Buyer hover
          purple: '#8B5CF6',       // AI indicator
          'purple-light': '#F3E8FF', // AI background
          green: '#22C55E',        // Success, verified, positive
          'green-light': '#ECFDF5',  // Green background tint
          amber: '#F59E0B',        // Warning, action required
          red: '#EF4444',          // Error, reject, negative
        },
        // Neutral scale — slightly warm grey (not cold)
        surface: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
        'button': '8px',
        'pill': '20px',
        'full': '9999px',
      },
      maxWidth: {
        'app': '430px',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      }
    },
  },
}
```

### Typography Scale

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Screen title | 20px | 700 | navy |
| Section header | 16px | 600 | surface-900 |
| Body text | 14px | 400 | surface-700 |
| Caption / label | 12px | 500 | surface-500 |
| Price (large) | 32px | 700 | navy or white |
| Price (card) | 18px | 700 | navy |
| Badge text | 11px | 600 | white |
| CTA button | 16px | 600 | white |

### Component Design Patterns

**Cards:** White background, 16px border-radius, subtle shadow (`shadow-sm`), 1px border (`border-surface-200`), 16px padding. On interaction: slight scale (`scale-[0.98]`) with 150ms transition.

**Buttons:** 
- Primary: `bg-eigen-navy text-white` (seller) or `bg-eigen-blue text-white` (buyer)
- Accent: `bg-eigen-orange text-white` (CTAs, key actions)
- Ghost: `border border-surface-200 text-surface-700`
- All: 48px min height, 8px border-radius, 600 weight

**AI Elements:** 4px left border in `eigen-purple`, background `eigen-purple-light`, "AI" label with sparkle (✨) icon in purple, 12px border-radius.

**Sticky Savings Banner (S4):** Full-width bar, `bg-amber-50`, makelaar price in red with line-through, EIGEN price in green, savings amount in large orange bold. Fixed position below header.

**Form Inputs:** 48px height, 8px border-radius, `border-surface-300`, focus ring in blue/orange (mode-dependent), label above in `text-surface-600 text-sm font-medium`.

---

## 5. Mock / Simulation Strategy

Every integration point must feel real to the demo user. The principle: show realistic UI states (loading, success, error), use convincing Dutch data, and add intentional delays that mimic real API latency.

### 5.1 Kadaster Address Autocomplete (S1)

**Mock approach:** Pre-loaded dataset of 80-100 real Dutch addresses (mix of Amsterdam, Utrecht, Rotterdam, Den Haag, Haarlem). Autocomplete filters client-side with 300ms debounce. Each address includes: street, house number, postcode, city, property type, build year, m2, WOZ value.

**UX simulation:** 
- Typing triggers dropdown after 3 characters
- Each result shows "✓ Kadaster Verified" badge
- Selecting an address populates the Property Card instantly
- 500ms simulated "verification" loading state

**Data file:** `mockAddresses.js` — array of objects:
```javascript
{ street: "Keizersgracht", number: "123", postcode: "1015CJ", city: "Amsterdam", 
  type: "Bovenwoning", buildYear: 1912, m2Living: 85, m2Land: null, 
  wozValue: 385000, kadasterId: "ASD04-A-12345" }
```

**Post-PoC integration:** Replace client-side filter with PDOK BAG API (free, no auth needed for basic lookups: `https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/`). Requires PDOK API key registration.

### 5.2 IDIN Identity Verification (S1)

**Mock approach:** Full simulated flow:
1. User taps "Verify My Identity"
2. Modal opens explaining IDIN + €0.01 authorization
3. Bank selector shows: Rabobank, ABN AMRO, ING, SNS, ASN, Triodos, Bunq (with logos)
4. User selects bank → loading spinner "Redirecting to your bank..."
5. 2.5s delay → simulated bank confirmation screen (styled like bank auth)
6. "Authorization successful" → return to EIGEN with green "Identity Verified ✓" badge
7. Address field locks, verified status persists

**UX simulation:** The "bank screen" is an in-app modal styled with the selected bank's colors (Rabobank orange, ING orange/white, ABN AMRO green). Shows: "EIGEN requests identity verification — €0.01 authorization — Confirm with your app." After 2s: "Confirmed ✓" with check animation.

**Post-PoC integration:** Integrate via Signicat or CM.com IDIN gateway. Contract required. Returns: name, registered address, date of birth. Cost: ~€0.30-0.50 per verification.

### 5.3 AI Valuation Engine (S1)

**Mock approach:** Pre-calculated valuations stored per mock address. When user clicks "Analyse My Home," show:
1. Loading animation (3s) with progress stages: "Analyzing comparable sales..." → "Calculating location premium..." → "Generating confidence interval..."
2. Reveal valuation card with animated number count-up
3. Comparable sales table (3-5 pre-defined comparables per address)
4. AI insight bubble with property-specific text

**Data:** Each mock address has a `valuation` object:
```javascript
{ estimate: 425000, rangeLow: 405000, rangeHigh: 445000, confidence: 87,
  comparables: [
    { address: "Prinsengracht 200", price: 410000, m2: 82, date: "2026-01" },
    ...
  ],
  aiInsight: "Your home benefits from a canal-facing position, which commands a 12% premium..." }
```

**Post-PoC integration:** Build ML model on Kadaster Koopsom + NVM data. Input features: location (postcode), m2, build year, property type, WOZ history, recent comparables. Could also use existing valuation APIs (Calcasa, Matrixian) as starting point.

### 5.4 AI Text Generation (S3, B1, B3, B4, B5)

**Mock approach:** Pre-written Dutch text stored per scenario, revealed with a typing animation (AITyping component). Tokens appear at ~30 tokens/second to simulate LLM streaming.

**For S3 (listing text):** 3 pre-written versions per tone (Factual, Storytelling, Premium). AI "generates" by revealing the text character-by-character.

**For B1 (chat search):** Pre-scripted conversation tree with 2-3 responses per user input pattern. Regex matching on keywords (price, location, bedrooms) determines which response branch.

**For B3 (AI verdict):** Pre-written verdicts per mock property tied to the property data.

**For B5 (bid advisor):** Dynamic calculation based on asking price — suggest range = asking price × (1.02 to 1.06) with pre-written explanation text.

**Post-PoC integration:** Claude API or GPT-4 with Dutch system prompts. Implement streaming responses via SSE. Budget: ~€0.01-0.05 per generation.

### 5.5 Photo Upload & AI Enhancement (S2)

**Mock approach:** 
- File picker allows selecting images from device
- Thumbnail preview renders immediately (client-side FileReader)
- AI room detection: 2s delay → always "detects" correct room based on upload order (Woonkamer first, Keuken second, etc.) with option to override
- Enhancement filters: CSS filters applied client-side — Natural (brightness+contrast), Bright (warm tone+brightness), Magazine (saturation+contrast+sharpening via CSS)
- Virtual staging: show a pre-made "staged" version of a stock empty room image with before/after slider

**Post-PoC integration:** AWS Rekognition for room classification, Autoenhance.ai or REimagineHome for enhancement/staging APIs.

### 5.6 Payment Flow — Mollie/iDEAL (S4)

**Mock approach:** 
1. User selects package → "Pay now" button
2. Modal shows iDEAL bank selector (same bank list as IDIN)
3. Select bank → "Processing payment..." (2s)
4. "Payment confirmed ✓" with confetti animation
5. Redirect to S5 (dashboard) with listing status = LIVE

**Post-PoC integration:** Mollie API — straightforward integration. Create payment → redirect → webhook confirmation. Cost: €0.29 per iDEAL transaction + Mollie monthly fee.

### 5.7 Analytics Dashboard (S5)

**Mock approach:** Pre-generated time-series data using a seeded random generator:
- Views: starts at 20/day, grows 15% daily with noise
- Saves: 3-5% of views
- Viewing requests: 0.5% of views
- Offers: 1-2 after 5+ days
- Sparklines and bar charts rendered from this data

A `mockAnalytics.js` utility generates 30 days of data on mount, creating a consistent but realistic-looking dataset.

**Post-PoC integration:** Event tracking pipeline (Mixpanel/Amplitude or custom PostgreSQL + TimescaleDB). Real data flows once listings are live.

### 5.8 Map Integration (B2, B4)

**Mock approach:** Leaflet.js with OpenStreetMap tiles (free, no API key). Plot mock property locations as colored pins. Pin colors based on match score. Tap pin → show mini property card overlay.

For B4 (viewing prep): static map centered on property address.

**Post-PoC integration:** Upgrade to Mapbox for custom styling and better performance. Consider Google Maps for street view integration.

### 5.9 Messaging System (S6, B5)

**Mock approach:** Pre-scripted messages. Counter-offer form works and updates the bid card. Reject sends a "notification sent" toast. All state changes are visible but not actually transmitted.

**Post-PoC integration:** WebSocket-based real-time messaging. Firebase or custom Socket.io server.

---

## 6. Screen-by-Screen Build Specification

### Navigation Architecture

```
/                       → Landing (seller/buyer choice)
/sell                   → Seller journey wrapper
/sell/valuation         → S1
/sell/photos            → S2
/sell/listing           → S3
/sell/pricing           → S4
/sell/dashboard         → S5
/sell/bids              → S6
/sell/explore           → S7
/sell/closed            → S8
/buy                    → Buyer journey wrapper
/buy/search             → B1
/buy/results            → B2
/buy/property/:id       → B3
/buy/viewing/:id        → B4
/buy/bid/:id            → B5
/buy/keys               → B6
```

### Landing Screen

**Route:** `/`
**Components:** Logo, tagline, two journey cards (Seller orange, Buyer blue), animated background gradient.
**Interactions:** Tap card → navigate to `/sell/valuation` or `/buy/search` with page transition (slide left).
**Design note:** Keep the existing dark navy background from current index.html. It's dramatic and sets the premium tone.

### S1 — Home Valuation

**Route:** `/sell/valuation`
**Components:** AppShell, KadasterLookup, IDINFlow, PropertyCard (Kadaster data), Button ("Analyse My Home"), ValuationCard (gradient navy, animated price), ComparableTable, AIBubble, Accordion ("How we calculated this"), BottomCTA.
**State written:** `sellerStore.address`, `sellerStore.verified`, `sellerStore.valuation`
**Key interactions:**
- Address autocomplete with dropdown
- IDIN verification flow (modal)
- "Analyse My Home" → 3-second AI loading → valuation card reveals with number animation
- Comparable sales table populated
- AI insight appears with typing animation
**Transition to S2:** BottomCTA "Continue to Photos →"

### S2 — Professional Photos

**Route:** `/sell/photos`
**Components:** AppShell, progress counter ("3 of 6 photos uploaded" with fill bar), PhotoGrid (2-col), PhotoSlot (thumbnail + room label overlay + remove button), FilterSelector (Natural/Bright/Magazine), StagingToggle (before/after slider), BottomCTA.
**State written:** `sellerStore.photos[]` (room, url, filter, staged)
**Key interactions:**
- Tap empty slot → file picker → thumbnail appears
- Auto-detect room type after 1s delay
- Tap filter buttons → CSS filter changes on thumbnail in real time
- Virtual staging toggle → crossfade between original and staged image
- Progress counter updates live
- BottomCTA disabled until minimum 4 photos
**Transition to S3:** BottomCTA "Continue to Listing →"

### S3 — Listing Description

**Route:** `/sell/listing`
**Components:** AppShell, form section (large inputs: asking price, m2, bedrooms, bathrooms, energy label, build year, features), AIListingCard (read-only/editable toggle, regenerate button), ScoreBadge (tappable → breakdown), ScoreBreakdown (checkmarks/x's with "Auto-fix"), AlternativeVersions (carousel of 3), BottomCTA.
**State written:** `sellerStore.listing` (details, description, selectedVersion, seoScore)
**Key interactions:**
- Form inputs populate → triggers AI generation (2s delay) → listing text reveals with typing
- Edit toggle switches to textarea mode
- Score badge tap → expand breakdown with green/red items
- "Auto-fix" button → brief loading → score increases, text updates
- "Show Alternatives" → 3 cards slide in (Factual, Storytelling, Premium)
**Transition to S4:** BottomCTA "Continue to Pricing →"

### S4 — Set Your Price

**Route:** `/sell/pricing`
**Components:** AppShell, StickyBanner (savings comparison), StrategySelector (3 cards), PriceInput, PackageMatrix (3-col comparison), PackageCards (Basis/Plus/Premium with "Select"), AIBubble (recommendation), PaymentFlow modal, BottomCTA.
**State written:** `sellerStore.strategy`, `sellerStore.askingPrice`, `sellerStore.package`, `sellerStore.paid`
**Key interactions:**
- Savings banner updates dynamically when price changes (price × 1.5% - package price)
- Strategy cards: tap to select, affects AI recommendation text
- Package matrix: scrollable comparison table with feature checkmarks
- "Select" on package → Payment modal (iDEAL simulation)
- Payment success → confetti → auto-navigate to S5
**Transition to S5:** Auto after payment (or BottomCTA "Go Live →")

### S5 — LIVE Dashboard

**Route:** `/sell/dashboard`
**Components:** AppShell, StatusBadge ("LIVE — Day 3"), MetricsRow (3 stat cards with sparklines), Funnel (horizontal engagement flow), BarChart (views over time), ActivityTimeline, NotificationPrefs (toggle switches), BottomCTA.
**State read:** `sellerStore.analytics` (generated mock data)
**Key interactions:**
- Stat cards show number animation on mount
- Sparklines render from mockAnalytics data
- Funnel shows conversion rates between stages
- Bar chart is tappable → expand to full view with daily/weekly toggle
- Activity timeline scrolls with chronological events
- Notification toggles are interactive (state saved but no real notifications)
**Transition to S6:** BottomCTA "View Offers →" (appears after Day 3+ in mock data)

### S6 — Incoming Bids

**Route:** `/sell/bids`
**Components:** AppShell, header with sort control, ComparisonMatrix (horizontal scroll table), AIBubble (trade-off analysis), OfferCards (expandable, each with Accept/Counter/Reject), CounterOfferForm (slide-up modal), RejectDialog (confirmation + optional message), BottomCTA.
**State written:** `sellerStore.bids[].status`, `sellerStore.acceptedBid`
**Key interactions:**
- Comparison matrix with 3-4 bids side by side, sortable
- AI trade-off analysis with specific reasoning
- Accept → confirmation modal → bid status changes to "Accepted" → auto-navigate to S8
- Counter → slide-up form with AI-suggested counter price → submit updates bid status
- Reject → confirmation dialog with optional message → bid status = "Rejected"
**Transition to S7:** Tab/link in navigation | S8: after accepting a bid

### S7 — Explore Buyers (Pro)

**Route:** `/sell/explore`
**Components:** AppShell, FilterChips (match%, pre-qualified, buyer type), BuyerCards (3-5 cards with match score, type tag, anonymous profile, criteria), RevealButton (with tooltip), ProBanner (upgrade comparison), BottomCTA.
**State written:** `sellerStore.reveals[]`
**Key interactions:**
- Filter chips toggle to refine visible buyer cards
- Buyer cards show anonymized data
- "Reveal" button → 1 free reveal, then shows Pro paywall
- Info icon → tooltip explaining the reveal mechanism
- Pro upgrade banner with feature comparison
**Design note:** This screen showcases the subscription monetization model. Make the free/Pro distinction visually clear.

### S8 — Deal Closed

**Route:** `/sell/closed`
**Components:** AppShell, CelebrationBanner (sold price), ProgressBar (60% closing), ClosingChecklist (accordion items with status badges), PartnerCards (within expanded items: notary, appraiser, inspector with ratings and "Book Now"), DocumentSection (auto-generated docs), BottomCTA.
**State read:** `sellerStore.acceptedBid`, `sellerStore.closingProgress`
**Key interactions:**
- Checklist items expand on tap → show description, timeline, CTA button
- "Select a Notary" → shows 3 partner cards with ratings and fixed prices
- "Book Appraisal" → simulated booking confirmation
- "Generate Document" → 2s loading → "Document ready — Download PDF" link
- Progress bar updates as items are checked off
**Revenue touchpoints:** Every CTA links to a partner (notary, appraiser, inspector) — make this visually prominent.

### B1 — AI Search

**Route:** `/buy/search`
**Components:** AppShell (buyer variant), PopularSearches (horizontal scroll cards), ChatContainer (AI + user messages), FilterChips (price, bedrooms, type, neighbourhood), SaveSearch button, RecentSearches, ChatInput (text field + send button), BottomNav.
**State written:** `buyerStore.searchHistory`, `buyerStore.savedSearches`, `buyerStore.currentFilters`
**Key interactions:**
- First visit: Popular Search cards → tap pre-fills chat + triggers search
- Chat input → AI response with typing animation (2s)
- After results: filter chip row appears
- Tap chips → refines results (AND logic, active chips highlighted)
- "Save this search" → confirmation toast
- Recent searches shown for returning visitors (persisted in localStorage)
**Transition to B2:** AI response includes "View 12 results →" link, or auto-navigate

### B2 — Search Results

**Route:** `/buy/results`
**Components:** AppShell, ResultsHeader (count + sort dropdown + Map/List toggle), PropertyCards (photo, address, price, specs, match score, compare checkbox), MapView (Leaflet with colored pins), CompareButton (floating, appears when 2+ selected), ComparisonModal, BottomNav.
**State written:** `buyerStore.selectedProperties`, `buyerStore.sortOrder`
**Key interactions:**
- Property cards show real data (from mockProperties)
- Sort dropdown: Best Match, Price Low-High, Price High-Low, Newest
- Map/List toggle switches view with crossfade
- Map pins color-coded by match score
- Compare checkboxes → floating "Compare Selected (2)" button
- Compare button → side-by-side modal with key metrics aligned
- Tap property card → navigate to B3
**Transition to B3:** Tap any property card

### B3 — Property Detail

**Route:** `/buy/property/:id`
**Components:** PhotoCarousel (swipeable), AddressBar (address + price + specs), AIVerdict (traffic-light card), CollapsibleSections (Price Analysis with overbid histogram, Neighbourhood Intelligence with scores, Risk Check), StickyBottomCTA ("Schedule a Viewing").
**State read:** `mockProperties[id]`, `mockNeighbourhood[postcode]`
**Key interactions:**
- Photo carousel swipes between 3-5 images
- AI Verdict prominent at top (green/orange/red tint)
- Sections collapse/expand with smooth animation
- Overbidding section shows histogram (Recharts)
- Neighbourhood scores shown as horizontal bar charts
- Sticky CTA shows next available viewing time
**Transition to B4:** BottomCTA "Schedule a Viewing →"

### B4 — Viewing Preparation

**Route:** `/buy/viewing/:id`
**Components:** AppShell, ViewingConfirmation (property thumbnail, date/time), ChecklistItems (AI-generated tips with icons), DownloadPDF button, SendToPhone button, QuestionsSection (expandable), NotesSection (textarea + photo button), PostViewingRating (star widget, appears after "viewing time"), BottomCTA.
**State written:** `buyerStore.viewings[id]` (notes, rating)
**Key interactions:**
- Checklist items are property-specific (based on build year, type, area)
- "Download PDF" → generates a simple PDF client-side (html2pdf.js or jsPDF)
- "Send to Phone" → simulated with success toast
- Notes textarea auto-saves
- After mock "viewing time" passes: rating prompt slides up (1-5 stars)
**Transition to B5:** BottomCTA "Ready to Make an Offer? →"

### B5 — Make a Bid

**Route:** `/buy/bid/:id`
**Components:** AppShell, PropertyMiniCard, AIBidAdvisor (range + overbid data + probability gauge), BidForm (amount input, financing selector, clause toggles with tooltips, date picker, message textarea), BidSummary (preview card), SubmitButton, StatusTracker (after submission).
**State written:** `buyerStore.bids[id]`
**Key interactions:**
- AI Bid Advisor calculates range from asking price (×1.02 to ×1.06)
- Probability gauge: Low/Medium/High colored segments
- Financing type selector (Mortgage/Cash/Mix)
- Clause toggles with explanation tooltips
- "Submit Bid" → confirmation modal → 2s processing → status tracker appears
- Status tracker: Submitted → Viewed → Considering → Decision (animated progress dots)
- After 5s simulated delay: "Seller has countered!" notification
**Transition to B6:** After bid accepted

### B6 — Keys (Closing Process)

**Route:** `/buy/keys`
**Components:** AppShell, CelebrationBanner, CountdownWidget (days to keys + calendar dots), MortgagePartnerCard (pre-qualified amount, monthly payment, "Speak to Advisor" CTA), ClosingChecklist (7-step accordion), DocumentTracker (upload buttons + status badges), BottomCTA.
**State read:** `buyerStore.acceptedBid`, `buyerStore.closingProgress`
**Key interactions:**
- Countdown calculates from mock closing date
- Mortgage partner card prominently shows referral opportunity
- Checklist mirrors S8 pattern but from buyer perspective
- Document tracker: mock upload functionality (file picker → "Uploaded ✓")
- Each step CTA links to simulated partner booking
**Revenue touchpoints:** Mortgage referral, bouwkundige keuring booking, notary selection — all visually prominent.

---

## 7. Build Phases

### Phase 1 — Foundation (Day 1-2)

**Objective:** Scaffold project, implement design system, build all shared components.

1. Initialize Vite + React project
2. Install dependencies: `tailwind`, `react-router-dom`, `zustand`, `framer-motion`, `recharts`, `lucide-react`, `leaflet`, `react-leaflet`
3. Configure Tailwind with EIGEN palette
4. Build all `layout/` components: AppShell, Header, ProgressBar, BottomCTA, BottomNav
5. Build all `ui/` components: Button, Card, Input, Toggle, Badge, Chip, Modal, Accordion, Tooltip
6. Build all `ai/` components: AIBubble, AITyping, AIVerdict
7. Build routing structure in App.jsx
8. Create Landing screen
9. Set up Zustand stores (sellerStore, buyerStore, appStore)
10. Create all mock data files

### Phase 2 — Seller Journey (Day 3-5)

**Objective:** Build all 8 seller screens, fully interactive.

1. S1 Valuation — with KadasterLookup and IDINFlow mock components
2. S2 Photos — with file upload, thumbnail preview, CSS filter effects
3. S3 Listing — with AI text generation simulation, score breakdown
4. S4 Pricing — with dynamic savings calculation, package comparison, payment simulation
5. S5 Dashboard — with charts (Recharts), sparklines, engagement funnel
6. S6 Bids — with comparison matrix, accept/counter/reject flows
7. S7 Explore — with buyer cards, reveal mechanism, Pro paywall
8. S8 Closed — with closing checklist, partner cards, document generation

### Phase 3 — Buyer Journey (Day 5-7)

**Objective:** Build all 6 buyer screens, fully interactive.

1. B1 Search — with chat interface, popular searches, filter chips
2. B2 Results — with property cards, sort/filter, map view, comparison
3. B3 Detail — with photo carousel, AI verdict, collapsible sections, overbid histogram
4. B4 Viewing — with checklist, PDF generation, notes, rating
5. B5 Bid — with AI advisor, bid form, status tracking
6. B6 Keys — with countdown, mortgage partner card, closing checklist

### Phase 4 — Polish & Deploy (Day 7-8)

**Objective:** Transitions, animations, edge cases, deployment.

1. Page transitions (Framer Motion: slide left/right between screens)
2. Micro-interactions (button press scales, card hover lifts, number animations)
3. Loading states for all simulated API calls
4. Error states (graceful fallbacks)
5. Mobile responsiveness testing (375px to 430px)
6. PWA meta tags (fullscreen on iOS/Android)
7. Netlify deployment configuration
8. GitHub repo setup + auto-deploy
9. Final QA pass on all 14 screens

---

## 8. Deployment Configuration

### netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Deployment Options

**Option A — GitHub Integration (Recommended)**
1. Create GitHub repo: `theunkok/eigen-poc`
2. Connect to Netlify (free tier)
3. Auto-deploy on every push to `main`
4. Preview deploys on pull requests

**Option B — Manual Deploy**
1. Build locally: `npm run build`
2. Drag-drop `dist/` folder to Netlify
3. Manual process for each update

**Recommendation:** Option A. Claude Code can set up the repo and Netlify config. You link your GitHub account to Netlify once, and every code change auto-deploys in ~30 seconds.

---

## 9. Post-PoC Integration Roadmap

The PoC mock architecture is designed so each mock can be replaced with a real integration without restructuring the app. Here's the priority order:

### Phase A — Core Infrastructure (Weeks 1-4 post-PoC)

| Integration | Mock Replacement | Effort | Cost |
|-------------|-----------------|--------|------|
| Kadaster BAG API | Replace mockAddresses.js with PDOK API calls | 2 days | Free (PDOK) |
| Claude/GPT-4 API | Replace AIGenerator mock with streaming LLM calls | 3 days | ~€0.01-0.05/generation |
| Mollie Payments | Replace PaymentFlow mock with Mollie API | 2 days | €0.29/txn + monthly |
| PostgreSQL + Auth | Add Supabase or custom backend | 5 days | ~€25/month |

### Phase B — Identity & Data (Weeks 5-8)

| Integration | Mock Replacement | Effort | Cost |
|-------------|-----------------|--------|------|
| IDIN (via Signicat) | Replace IDINFlow mock with real bank auth | 5 days | €0.30-0.50/verification |
| NVM/Kadaster Koopsom | Real transaction data for valuations | 3 days | License fee (NVM) |
| WOZ Waardeloket | Real WOZ value lookups | 1 day | Free |
| Photo Enhancement API | Replace CSS filters with Autoenhance.ai | 2 days | ~€0.10/image |

### Phase C — Intelligence Layer (Weeks 9-12)

| Integration | Mock Replacement | Effort | Cost |
|-------------|-----------------|--------|------|
| Valuation ML Model | Replace mock valuations with trained model | 10 days | Custom development |
| Elasticsearch | Replace client-side filtering with Elastic queries | 5 days | ~€50/month |
| Mapbox | Replace Leaflet/OSM with styled Mapbox | 2 days | Free tier → $49/month |
| Push Notifications | Add FCM/Web Push | 3 days | Free (Firebase) |

### Phase D — Partners & Revenue (Weeks 13-16)

| Integration | Mock Replacement | Effort | Cost |
|-------------|-----------------|--------|------|
| Mortgage Referral APIs | Deep-links to Rabobank/ABN AMRO/De Hypotheker | 5 days | Revenue generating |
| Notary/Inspector Marketplace | Partner database + booking system | 10 days | Revenue generating |
| NWWI Appraisal Booking | Real booking integration | 3 days | Revenue generating |
| E-signatures (SignRequest) | Real document signing | 5 days | €0.50-1.00/signature |

---

## 10. CLAUDE.md — Claude Code Project Instructions

The following file should be placed at the root of the eigen-poc repository to guide Claude Code during development:

```markdown
# EIGEN PoC — Claude Code Instructions

## Project Overview
EIGEN is an AI real estate super-app for the Netherlands that replaces the traditional makelaar (real estate agent). This is a Proof of Concept — a fully interactive frontend demo with all external integrations mocked.

## Tech Stack
- React 18 + Vite 5
- Tailwind CSS 3.4 (custom EIGEN palette in tailwind.config.js)
- React Router v6 (client-side routing)
- Zustand (state management)
- Framer Motion (animations)
- Recharts (charts/graphs)
- Leaflet + React-Leaflet (maps)
- Lucide React (icons)

## Architecture
- All screens in src/screens/ (seller/ and buyer/ subdirectories)
- Shared components in src/components/ (ui/, layout/, ai/, property/, charts/, mock/)
- Mock data in src/data/ — all external API data is hardcoded here
- State stores in src/stores/ (sellerStore.js, buyerStore.js, appStore.js)
- No backend — everything is client-side

## Design System
- Primary: #1B3A5C (navy)
- Seller accent: #FF6B35 (orange)
- Buyer accent: #3B82F6 (blue)
- AI indicator: #8B5CF6 (purple)
- Mobile-first: max-width 430px
- Card radius: 16px, button radius: 8px
- System font stack
- All AI content: purple left border + light purple bg + "AI" label

## Mock Strategy
Every integration is simulated with realistic delays and Dutch data:
- Address lookup: client-side filter on 80+ real Dutch addresses
- IDIN: in-app modal simulating bank auth flow
- Payments: simulated iDEAL flow with bank selection
- AI generation: pre-written text revealed with typing animation
- Analytics: randomly generated time-series data
- Maps: Leaflet + OpenStreetMap (free)

## Key Conventions
- Dutch terminology throughout (makelaar, not "agent")
- Currency: Dutch format (€425.000)
- All text in English for PoC (Dutch localization is post-PoC)
- Zustand stores persist to localStorage
- Page transitions via Framer Motion (slide left/right)
- All buttons minimum 48px height, all touch targets minimum 44x44px

## Build & Deploy
- `npm run dev` — local development
- `npm run build` — production build
- Deploy to Netlify via GitHub auto-deploy
- SPA routing: netlify.toml has `/* → /index.html` redirect

## Reference Documents
- EIGEN_PRD_v1.docx — Complete functional requirements
- EIGEN_Wireframes_v1.docx — Visual wireframe specifications
```

---

## 11. Stock Assets Required

The PoC needs realistic visual content. Source these before starting development:

| Asset | Source | Quantity |
|-------|--------|----------|
| Dutch property exterior photos | Unsplash (search "Amsterdam canal house", "Dutch home", "Netherlands apartment") | 8-10 |
| Dutch interior room photos | Unsplash (search "modern kitchen", "living room interior", "bedroom minimal") | 15-20 |
| Bank logos (Rabobank, ING, ABN AMRO, etc.) | SVG recreations or brand kit downloads | 7 |
| EIGEN logo | SVG (already exists in current prototype as text + dot) | 1 |
| User avatar placeholders | Generated or DiceBear API | 5-8 |
| Map pin icons | Lucide or custom SVG | 3 (green/orange/grey) |

**Note:** All Unsplash images are free for commercial use. Download at 800px width for optimal load time.

---

## 12. Success Criteria

The PoC is ready for investor demos when:

1. All 14 screens are navigable with smooth transitions
2. Every mock integration feels convincingly real (no "coming soon" placeholders)
3. The savings comparison (makelaar vs EIGEN) is impossible to miss
4. AI elements feel intelligent (typing animation, specific insights, property-aware recommendations)
5. The revenue model is visible in the UX (packages, partner referrals, Pro tier)
6. Works flawlessly on iPhone Safari in fullscreen PWA mode
7. Loads in under 2 seconds on a good connection
8. An investor can complete the full seller journey (S1→S8) in under 5 minutes
9. An investor can complete the full buyer journey (B1→B6) in under 4 minutes
10. The app looks and feels like it could launch tomorrow

---

*EIGEN — Making homeownership simple, transparent, and fair.*
