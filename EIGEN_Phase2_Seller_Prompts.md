# EIGEN PoC — Phase 2: Seller Journey Prompts for Claude Code

Copy-paste these prompts into Claude Code sequentially. Each builds on the previous one. After each screen, verify it works with `npm run dev` before moving to the next.

---

## Pre-flight Check

Paste this before starting Phase 2 to confirm Phase 1 is solid:

```
Before we start building screens, verify the foundation is working:
1. Run `npm run dev` and confirm the app loads
2. Confirm all 16 routes are registered in App.jsx (Landing + 8 seller + 6 buyer + catch-all)
3. Confirm the Tailwind EIGEN color palette is configured (eigen-navy, eigen-orange, eigen-blue, eigen-purple, eigen-green, eigen-amber, eigen-red)
4. Confirm the shared components exist and export correctly: AppShell, Header, ProgressBar, BottomCTA, Button, Card, Input, Toggle, Badge, Chip, Modal, Accordion, AIBubble, AITyping
5. Confirm the Zustand stores exist: sellerStore, buyerStore, appStore
6. Confirm mock data files exist: mockAddresses.js (80+ entries), mockProperties.js, mockBids.js, mockBuyers.js, mockAnalytics.js, mockNeighbourhood.js
7. List any missing pieces so we can fix them before building screens.
```

---

## S1 — Home Valuation

```
Build the S1 Home Valuation screen at src/screens/seller/S1Valuation.jsx. Read docs/EIGEN_PRD_v1.md section "S1 — Home Valuation" and docs/EIGEN_Build_Plan_v1.md section "5.1 Kadaster Address Autocomplete" and "5.2 IDIN Identity Verification" and "5.3 AI Valuation Engine" for full specs.

This screen has 4 sequential states that the user progresses through:

STATE 1 — Address Entry:
- Use the AppShell with ProgressBar showing step 1 of 8, mode="seller"
- Large address input field with placeholder "Start typing your address..."
- As user types (minimum 3 chars), show a dropdown of matching addresses from mockAddresses.js
- Filter client-side with 300ms debounce (use setTimeout, clear on each keystroke)
- Each dropdown result shows: street + number, postcode + city, and a small green "Kadaster Verified" badge
- Selecting an address saves it to sellerStore.address and advances to State 2

STATE 2 — Identity Verification:
- Show the selected address in a locked/confirmed card
- Below: blue "Verify My Identity (IDIN)" button — full width, prominent
- Tapping opens a Modal component with this flow:
  Step A: Explanation text: "To confirm you own this address, we use IDIN — a secure service by your bank. You authorize a €0.01 payment which verifies your identity and registered address."
  Step B: Bank selector grid showing 7 Dutch banks: Rabobank, ABN AMRO, ING, SNS, ASN, Triodos, Bunq. Each as a tappable card with the bank name in its brand color (Rabobank=#FF6600, ABN AMRO=#004D40, ING=#FF6200, etc). No need for actual logos — use styled text with the bank's color as background.
  Step C: After selecting a bank, show loading spinner with text "Redirecting to [bank name]..." for 1.5 seconds
  Step D: Show a simulated bank confirmation screen styled in the selected bank's colors: "EIGEN requests identity verification — €0.01 authorization" with a "Confirm" button
  Step E: After tapping Confirm (or auto after 2s), show green checkmark animation with "Verification Successful!"
  Step F: Modal closes. Main screen shows green "Identity Verified ✓" badge next to the address. Address is now locked (non-editable). Save sellerStore.verified = true
- Below the verified badge: show a Property Card populated from the selected address data in mockAddresses.js: property type, build year, living area m², WOZ value. Use the Card component with clean label/value pairs.
- Below: orange full-width "Analyse My Home" button (BottomCTA position)

STATE 3 — Analysis Loading:
- After tapping "Analyse My Home", show a loading animation sequence:
  - Phase 1 (0-1s): "Analyzing comparable sales..." with a progress bar at 33%
  - Phase 2 (1-2s): "Calculating location premium..." with progress bar at 66%
  - Phase 3 (2-3s): "Generating confidence interval..." with progress bar at 100%
- Use Framer Motion for smooth progress bar animation
- This builds anticipation and makes the AI feel real

STATE 4 — Valuation Results:
- Valuation card: gradient from eigen-navy to #1E4D7B, white text. Show:
  - "AI Valuation" label at top
  - Large price (€425.000 format) with animated count-up from 0 using useAnimateNumber hook
  - Range: "€405.000 — €445.000"
  - Confidence badge: "87% confidence" in a semi-transparent white pill
- Below: Comparable Sales section with a table (3-5 rows from the valuation.comparables data). Columns: Address, Sale Price, m², Date. Use the Card component.
- Below: AIBubble component with the valuation's aiInsight text, revealed with the AITyping animation
- Below: Accordion component titled "How we calculated this" — when expanded shows: number of comparables used, date range, adjustment factors, data sources (Kadaster, NVM, CBS). Pre-written text from the valuation data.
- BottomCTA: "Continue to Photos →" — navigates to /sell/photos

Use Dutch number formatting throughout: €425.000 (dots not commas). Import formatCurrency from utils.

The screen must be scrollable (the content area inside AppShell scrolls, header and progress bar stay fixed). Use Framer Motion AnimatePresence for the state transitions — each state slides in from below.
```

---

## S2 — Professional Photos

```
Build the S2 Professional Photos screen at src/screens/seller/S2Photos.jsx. Read docs/EIGEN_PRD_v1.md section "S2 — Professional Photos" for full specs.

Layout (inside AppShell, step 2 of 8):

PROGRESS COUNTER (top of scrollable area):
- Large text: "{count} of {total} photos uploaded" — updates live
- Below: progress bar that fills proportionally (use a div with width transition)
- Total starts at 6 but increases if user adds more slots
- Minimum 4 photos to enable the Continue button

PHOTO GRID (2 columns, scrollable):
- Start with 6 slots. Each slot is approximately square (aspect ratio 4:3).
- Empty slot: dashed border (border-dashed border-2 border-surface-300), camera icon (use Lucide Camera icon), "Add Photo" text centered, rounded-2xl
- Tapping an empty slot opens the browser file picker (input type="file" accept="image/*")
- When a photo is selected:
  - Read the file client-side with FileReader, create a blob URL
  - Show thumbnail filling the entire slot (object-cover)
  - Overlay at bottom: semi-transparent dark bar with room label text (e.g., "Woonkamer")
  - Small red "×" button in top-right corner to remove
  - After 1.5s simulated delay, show a toast: "AI detected: Woonkamer" (auto-assign room types in order: Woonkamer, Keuken, Slaapkamer, Badkamer, Tuin, Hal/Entree for the first 6 uploads)
  - Room type can be overridden by tapping the room label — shows a dropdown with options: Woonkamer, Keuken, Slaapkamer 1, Slaapkamer 2, Slaapkamer 3, Badkamer, Toilet, Tuin, Balkon, Garage, Hal/Entree, Berging, Zolder, Overig

FILTER SELECTOR (below each filled photo):
- 3 small pill buttons in a row: "Natural" | "Bright" | "Magazine"
- Default: Natural is selected (highlighted in eigen-orange)
- Tapping a filter applies a CSS filter to the thumbnail image:
  - Natural: brightness(1.05) contrast(1.05) saturate(1.05)
  - Bright: brightness(1.2) contrast(0.95) saturate(1.1) sepia(0.05)
  - Magazine: brightness(1.1) contrast(1.15) saturate(1.2)
- Filter changes instantly on tap — this feels like real AI enhancement

"ADD MORE PHOTOS" BUTTON:
- Below the grid: ghost button "Add More Photos +" that adds 2 more empty slots to the grid
- Maximum 20 total

VIRTUAL STAGING SECTION:
- Only visible if at least one photo is uploaded
- Card with eigen-purple-light background
- Header: "Virtual Staging Available" with AI sparkle icon
- Text: "Empty rooms detected — add AI-generated furniture"
- "Stage This Room" button in eigen-purple
- Tapping shows a simple before/after comparison using a horizontal slider (a div with two images overlapping, draggable divider). For PoC, use the same uploaded photo with a slight CSS transform (scale 1.02, warmer tone) as the "staged" version — the slider interaction is what matters.

BOTTOM CTA:
- "Continue to Listing →" — disabled (greyed out) until 4+ photos uploaded
- Navigates to /sell/listing
- Save photos array to sellerStore.photos (each: { url, roomType, filter, staged })

The photo slots should animate in with Framer Motion (stagger children). Removing a photo should animate out (scale to 0, opacity to 0).
```

---

## S3 — Listing Description

```
Build the S3 Listing Description screen at src/screens/seller/S3Listing.jsx. Read docs/EIGEN_PRD_v1.md section "S3 — Listing Description" for full specs.

Layout (inside AppShell, step 3 of 8):

PROPERTY DETAILS FORM:
- Section header: "Property Details"
- Input fields using the shared Input component, each with label above:
  - Asking Price (pre-filled from sellerStore.valuation.estimate, formatted as €425.000)
  - Living Area (pre-filled from sellerStore.address.m2Living, suffixed "m²")
  - Bedrooms (number input, default 2)
  - Bathrooms (number input, default 1)
  - Energy Label (dropdown: A++, A+, A, B, C, D, E, F, G — default C)
  - Build Year (pre-filled from sellerStore.address.buildYear)
  - Unique Features (textarea, 4 visible lines, max 400 chars, live character counter "0 / 400" below the field)
- All fields save to sellerStore.listing on change (debounced 500ms)

AI-GENERATED LISTING SECTION:
- Divider line
- Header row: "AI-Generated Listing" on the left, Toggle component ("Edit") on the right
- Below: when the form has at least asking price and m² filled, auto-trigger AI generation after 1 second of no typing
- Show loading state: AITyping component with "Generating your listing..." placeholder
- After 2s simulated delay, reveal the listing text character by character using AITyping at ~30 chars/second
- The listing text should be a pre-written English paragraph (stored in a constant or in the mock data) that references the actual property data from the form. Example:

"Stunning [property type] on the [street name] in the heart of [city]. This beautifully maintained [bedrooms]-bedroom home offers [m2]m² of living space across [floors] floors. Built in [year], the property seamlessly blends period character with modern comfort. The spacious living room floods with natural light, while the recently updated kitchen features high-end appliances. Located in one of [city]'s most sought-after neighbourhoods, you're minutes from [local amenities]. Energy label [label]. Don't miss this rare opportunity."

- Template this text by injecting actual values from sellerStore
- Default state: read-only with nice typography (text-base leading-relaxed)
- When Edit toggle is ON: text becomes a textarea, show "Regenerate" button (generates a slightly different version with 2s delay) and "Undo" button (reverts to last AI version)
- Save the listing text to sellerStore.listing.description

SEO/QUALITY SCORE:
- Below the listing text: a badge showing "94/100" in eigen-green, rounded-full, font-bold
- The badge is tappable — on tap, expand a score breakdown card below it:
  - Positive factors (green check icon + text):
    - "Mentions neighbourhood: +5"
    - "Emotional appeal language: +4"
    - "Property specs complete: +5"
    - "Call-to-action present: +3"
  - Negative factors (red x icon + text + "Auto-fix" button):
    - "Missing: energy label mention: -3" [Auto-fix]
    - "No mention of nearby schools: -3" [Auto-fix]
  - Tapping "Auto-fix" on a negative factor: 1s delay → factor turns green, score updates (94 → 97), listing text gets a sentence appended (e.g., "Energy label C — room for improvement with insulation upgrades."). Use Framer Motion for the score number animation.

ALTERNATIVE VERSIONS:
- Below score: "Show 3 Alternatives" button (ghost style)
- Tapping: 1.5s loading → 3 cards appear in a horizontal scroll container:
  - "Factual" — shorter, data-driven version
  - "Storytelling" — warm, narrative version with more emotion
  - "Premium" — luxury-focused, aspirational tone
- Each card: title tag at top, preview text (first 100 chars), "Use This Version" button
- Selecting a version replaces the main listing text (with typing animation) and updates the score

BOTTOM CTA:
- "Continue to Pricing →" — navigates to /sell/pricing
- Save all data to sellerStore.listing
```

---

## S4 — Set Your Price

```
Build the S4 Set Your Price screen at src/screens/seller/S4Pricing.jsx. Read docs/EIGEN_PRD_v1.md section "S4 — Set Your Price" for full specs.

Layout (inside AppShell, step 4 of 8):

STICKY SAVINGS BANNER (most important element on this screen):
- Fixed position below the progress bar, does not scroll away
- Background: bg-amber-50 with subtle amber left border
- Layout: single row with 3 elements:
  - Left: "Makelaar: " + strikethrough price in red (€6.375 — calculated as askingPrice * 0.015)
  - Middle: "EIGEN: " + green price (matches selected package, default €695)
  - Below both: large text "You save €5.680" in eigen-orange, font-bold text-xl
- This banner MUST update live when the asking price changes or when a different package is selected
- Use formatCurrency for all prices (Dutch dot notation)
- Formula: makelaarCost = askingPrice × 0.015, eigenCost = selectedPackage.price, savings = makelaarCost - eigenCost

PRICING STRATEGY SELECTOR:
- Section header: "Pricing Strategy"
- 3 cards in a row (equal width):
  - "Quick Sale" — icon: Zap from Lucide — "Price to sell fast, below market"
  - "Market Value" — icon: Target — "Price at fair market value" (default selected)
  - "Maximum Return" — icon: TrendingUp — "Price above market, wait for the right buyer"
- Selected card: eigen-orange background, white text. Unselected: white bg, surface border.
- Save to sellerStore.strategy

ASKING PRICE INPUT:
- Large input field: "Your Asking Price"
- Pre-filled from sellerStore.valuation.estimate
- On change: recalculate savings banner instantly
- Below the input: small text "AI suggested: €[valuation estimate]" as reference

PACKAGE COMPARISON MATRIX:
- Section header: "Choose Your Package"
- 3-column comparison table using a custom component (not a raw HTML table — use flex/grid cards):

  | Feature | Basis €495 | Plus €695 | Premium €995 |
  |---------|-----------|----------|-------------|
  | AI Valuation | ✓ | ✓ | ✓ |
  | AI Listing Text | ✓ | ✓ | ✓ |
  | Photo Enhancement | ✓ | ✓ | ✓ |
  | Virtual Staging | — | ✓ | ✓ |
  | Premium Placement | — | ✓ | ✓ |
  | Video Tour | — | — | ✓ |
  | Viewing Scheduler | — | ✓ | ✓ |
  | Offer Management | ✓ | ✓ | ✓ |
  | Notary Coordination | — | — | ✓ |
  | Personal Advisor | — | — | ✓ |

- The "Plus" column header should have a "Recommended" badge on top (eigen-orange pill)
- Feature rows: ✓ in eigen-green, — in surface-300
- Each column has a "Select" button at the bottom
- Selected package: orange outline/highlight. Selecting updates the savings banner.
- Save to sellerStore.package

AI RECOMMENDATION:
- AIBubble below the packages: "Based on your home's value of €[estimate] and current market conditions in [city], we recommend Plus — the best balance of features and exposure for your property."

PAYMENT FLOW (on tapping "Select" on a package):
- Open a Modal with simulated iDEAL payment:
  Step 1: "Pay [package price] via iDEAL" header. Show the same bank selector grid as the IDIN flow (7 banks with colored cards)
  Step 2: Select bank → loading "Processing payment via [bank]..." (2 seconds)
  Step 3: Success screen with confetti effect (use a simple CSS animation — 20-30 colored dots falling). "Payment confirmed! Your listing is going live!"
  Step 4: Auto-close modal after 2s → navigate to /sell/dashboard
- Save sellerStore.paid = true, sellerStore.listingStatus = "live"

BOTTOM CTA:
- "Select a Package to Go Live" — disabled until a package is selected, then becomes "Pay & Go Live →"
```

---

## S5 — LIVE Dashboard

```
Build the S5 LIVE Dashboard screen at src/screens/seller/S5Dashboard.jsx. Read docs/EIGEN_PRD_v1.md section "S5 — LIVE Dashboard" for full specs.

This is a data-heavy screen. Use Recharts for all charts. Import mock analytics data from mockAnalytics.js (this should be a function that generates 30 days of time-series data with a seeded random generator — if it doesn't exist yet, create it).

The mockAnalytics generator should produce:
- Daily views: starts at ~20, grows ~15% per day with ±30% random noise
- Daily saves: 3-5% of views
- Daily viewingRequests: 0.5% of views
- Cumulative totals for each metric
- 8-10 activity events with timestamps ("New viewing request from Buyer A", "Listing saved", "100 views milestone", etc.)

Layout (inside AppShell, step 5 of 8):

STATUS BADGE:
- At the top: green pill badge "LIVE — Day 3" (calculate day from a mock startDate)
- Small savings reminder below: "You're saving €5.680 vs a makelaar" in text-sm, eigen-orange

KEY METRICS ROW (3 cards side by side):
- Each card: white bg, rounded-2xl, shadow-sm, equal width
  - Card 1: "Views" — large number 847 (animated count-up on mount), below: "2.1× avg" in eigen-green text-sm, below: Recharts Sparkline (tiny line chart, 60px height, no axes, just the line in eigen-blue, area fill with 10% opacity)
  - Card 2: "Saves" — number 23, "Top 15%" in eigen-green, sparkline
  - Card 3: "Requests" — number 4, "On track" in eigen-green, sparkline
- Use useAnimateNumber for the count-up effect

ENGAGEMENT FUNNEL:
- Section header: "Engagement Funnel"
- Horizontal funnel visualization:
  - 4 bars of decreasing width, left-aligned:
    - Views: 847 (full width, eigen-navy)
    - Saves: 23 (proportional width, eigen-blue)
    - Requests: 4 (proportional width, eigen-blue lighter)
    - Offers: 1 (proportional width, eigen-green)
  - Between each bar: conversion percentage in small text (e.g., "2.7% →")
  - Below the funnel: AIBubble with insight: "12% of viewers saved your listing (avg: 8%) — your photos are working well."

VIEWS OVER TIME CHART:
- Section header: "Views Over Time"
- Recharts BarChart: x-axis = last 14 days (dates), y-axis = views per day
- Bars in eigen-blue. Hover tooltip shows exact count + date.
- Below chart: 3 toggle pills "7 days" | "14 days" | "30 days" — default 14 days. Switching filters the data.
- Wrap in a Card component

RECENT ACTIVITY TIMELINE:
- Section header: "Recent Activity"
- Vertical timeline (small circle dots connected by a line):
  - Each event: colored dot (blue for views, green for saves, orange for requests), timestamp ("2h ago"), description ("New viewing request from a buyer in Utrecht")
  - Show 6-8 events from mockAnalytics

NOTIFICATION PREFERENCES:
- Section header: "Notification Preferences"
- 4 rows, each with a label and a Toggle:
  - "New viewing request" — default on
  - "New offer received" — default on
  - "Listing milestones (100, 500 views)" — default on
  - "Weekly performance summary" — default off
- Toggles are functional (save to sellerStore.notificationPrefs) but obviously don't trigger real notifications

BOTTOM CTA:
- "View Offers →" — navigates to /sell/bids
- Show a small red notification badge on the button: "1 new" (indicating an offer has come in)
```

---

## S6 — Incoming Bids

```
Build the S6 Incoming Bids screen at src/screens/seller/S6Bids.jsx. Read docs/EIGEN_PRD_v1.md section "S6 — Incoming Bids" for full specs.

Use mock bid data from mockBids.js. If it doesn't have detailed bid data yet, create 3 bids:

Bid 1: { id: 1, bidder: "Familie De Vries", amount: 498500, financing: "Mortgage (ING)", conditions: ["Financing clause", "Inspection clause"], closingDate: "2026-06-15", speed: "6-8 weeks", risk: "Medium", status: "pending", prequalified: true }
Bid 2: { id: 2, bidder: "J. Thompson", amount: 495000, financing: "Mortgage (Rabobank)", conditions: ["Financing clause"], closingDate: "2026-06-01", speed: "4-6 weeks", risk: "Medium", status: "pending", prequalified: true }
Bid 3: { id: 3, bidder: "David R.", amount: 485000, financing: "Cash", conditions: [], closingDate: "2026-05-15", speed: "2 weeks", risk: "Low", status: "pending", prequalified: true }

Layout (inside AppShell, step 6 of 8):

HEADER:
- "You have 3 offers" in text-xl font-bold
- Right side: sort dropdown (options: "Highest Price", "Fastest Close", "Lowest Risk") — sorts the bid cards below

COMPARISON MATRIX:
- Horizontal scrollable table (important for mobile — use overflow-x-auto)
- Rows: Price, Financing, Conditions, Speed, Risk Score
- Columns: one per bid (3 columns)
- Column headers: bidder name on eigen-navy background, white text
- Cell styling: clean borders, good padding. Highlight the best value in each row with eigen-green text (highest price, fastest speed, lowest risk)

AI RECOMMENDATION (below matrix):
- AIBubble with detailed trade-off analysis. Text should reference the actual bid data:
  "De Vries offers €498.500 — the highest price, but includes a financing clause and inspection clause, meaning a 6-8 week close with some financing risk. Thompson offers €495.000 with only a financing clause — slightly less but fewer conditions. David R. offers €485.000 cash with zero conditions — closes in just 2 weeks. If certainty and speed matter more than maximizing price, David R. is your safest bet."
- Use AITyping for the reveal animation

INDIVIDUAL OFFER CARDS (one per bid):
- Each card shows: bidder name (bold), amount (large, eigen-navy), financing type, conditions as small chips/pills, closing date, risk badge (colored: green=Low, amber=Medium, red=High)
- Each card has 3 action buttons at the bottom:
  - "Accept" (eigen-green) — opens a confirmation Modal: "Accept offer from [name] for [amount]? This will reject all other bids." Confirm button → sellerStore.acceptedBid = bid, navigate to /sell/closed
  - "Counter" (eigen-blue) — opens a slide-up Modal with counter-offer form:
    - Counter Price input (pre-filled with AI suggestion: midpoint between their bid and asking price)
    - Conditions to modify (checkboxes for each condition — toggle to add/remove)
    - Proposed Closing Date (date picker or simple text input)
    - Message to buyer (textarea, max 300 chars)
    - AIBubble inside the form: "Based on market data, we suggest countering at €[suggestion]. Buyers in this range typically accept counters within 3% of their original bid."
    - "Send Counter-Offer" button — closes modal, updates bid status to "countered" with visual feedback
  - "Reject" (eigen-red, ghost/outline style) — opens a small confirmation dialog: "Reject offer from [name]?" with optional message textarea and "Confirm Rejection" button. Rejecting updates bid status to "rejected" and greys out the card.

- Cards with status "countered" show an amber "Counter Sent" badge
- Cards with status "rejected" are visually muted (opacity-50) with a red "Rejected" badge

BOTTOM CTA:
- "Need help deciding? Chat with AI Advisor" in eigen-purple
- For PoC this can just show a toast "AI Advisor coming soon" or navigate to S7
```

---

## S7 — Explore Buyers (Pro)

```
Build the S7 Explore Buyers screen at src/screens/seller/S7Explore.jsx. Read docs/EIGEN_PRD_v1.md section "S7 — Explore Mode" for full specs.

Use mock buyer data from mockBuyers.js. Ensure it has 5 buyer profiles:

{ id: 1, matchScore: 92, type: "Starter", prequalified: true, areaPreference: "Utrecht-West", budget: "€350.000 — €425.000", criteria: "3-kamer, garden, close to schools", lookingFor: "4 months", revealedName: "Anna van den Berg", mortgageApproval: "€410.000" }
{ id: 2, matchScore: 87, type: "Doorstromer", prequalified: true, areaPreference: "Amsterdam-Zuid", budget: "€500.000 — €650.000", criteria: "4+ kamers, balcony, modern kitchen", lookingFor: "2 months", revealedName: "Mark & Lisa Jansen", mortgageApproval: "€620.000" }
{ id: 3, matchScore: 81, type: "Starter", prequalified: false, areaPreference: "Utrecht-Oost", budget: "€300.000 — €380.000", criteria: "2-kamer, near public transport", lookingFor: "6 months", revealedName: "Thomas de Groot", mortgageApproval: null }
{ id: 4, matchScore: 76, type: "Investor", prequalified: true, areaPreference: "Amsterdam-Centrum", budget: "€400.000 — €550.000", criteria: "Good rental yield, low VvE", lookingFor: "1 month", revealedName: "R. Bakker BV", mortgageApproval: null }
{ id: 5, matchScore: 71, type: "Doorstromer", prequalified: true, areaPreference: "Haarlem", budget: "€350.000 — €475.000", criteria: "Tuin, 3 slaapkamers, rustige buurt", lookingFor: "3 months", revealedName: "Sophie & Jan Visser", mortgageApproval: "€450.000" }

Layout (inside AppShell, step 7 of 8):

FILTER CHIPS (horizontal scroll row):
- Chips: "Match > 80%", "Pre-qualified", "Starters", "Doorstromers", "Investors"
- Tappable — active chips: eigen-blue bg + white text. Inactive: surface-100 bg + surface-700 text.
- Filtering is AND logic. "Match > 80%" filters to matchScore > 80. "Pre-qualified" filters to prequalified=true. Type chips filter by type.
- Animate filtered cards in/out with Framer Motion (AnimatePresence + layout)

BUYER CARDS:
- Each card (white bg, rounded-2xl, shadow-sm) shows:
  - Top left: match score in a rounded badge (eigen-green if >85, eigen-amber if 75-85, eigen-red if <75)
  - Top right: buyer type as a pill (eigen-blue for Starter, eigen-purple for Doorstromer, eigen-navy for Investor)
  - Below: pre-qualification badge: "Pre-qualified ✓" in eigen-green or "Unverified" in surface-400
  - Below: anonymized name: "Buyer in [areaPreference]" with a grey silhouette avatar (Lucide UserCircle icon)
  - Below: search criteria summary (the criteria field)
  - Below: "Looking for [lookingFor]" in surface-500 text
  - Bottom: "Reveal This Buyer" button in eigen-orange (full width within the card)
  - Small ℹ️ info icon next to "Reveal" — tapping shows a Tooltip: "When you reveal a buyer, they receive a notification that you're interested. You'll see their full name, contact preference, and mortgage pre-approval amount. They'll see your listing details."

REVEAL MECHANISM:
- Track reveals in sellerStore.reveals (array of buyer IDs)
- First reveal is free. Tapping "Reveal" on the first buyer:
  - 1s loading delay → card transforms: anonymous name → real name, shows mortgage pre-approval amount, "Contact" button appears, card gets a subtle green border
  - Toast notification: "Buyer notified — they can now see your listing"
- Second+ reveal attempts:
  - Instead of revealing, show a Modal with the Pro paywall:
    - Header: "Upgrade to EIGEN Pro"
    - Comparison: Free (1 reveal/month, see match scores) vs Pro €49/month (unlimited reveals, priority matching, see mortgage amounts)
    - "Upgrade to Pro" button in eigen-purple
    - "Maybe later" dismiss link
    - For PoC: tapping "Upgrade to Pro" just closes the modal and unlocks all reveals (set sellerStore.isPro = true)

PRO UPGRADE BANNER (below cards):
- Card with eigen-purple-light background
- "Unlock More Buyers" header
- Feature comparison mini-table: Free vs Pro
- "Upgrade to Pro — €49/month" button

BOTTOM CTA:
- "Back to Dashboard" — navigates to /sell/dashboard
```

---

## S8 — Deal Closed

```
Build the S8 Deal Closed screen at src/screens/seller/S8Closed.jsx. Read docs/EIGEN_PRD_v1.md section "S8 — Deal Closed" for full specs.

This screen reads from sellerStore.acceptedBid to know which bid was accepted and at what price.

Layout (inside AppShell, step 8 of 8):

CELEBRATION BANNER:
- Full-width card with eigen-green-light background
- Large party emoji 🎉 and "Congratulations!" in text-xl font-bold eigen-green
- "Your home is sold for €[accepted bid amount]" in text-base
- Subtle confetti animation on mount (reuse or create a simple CSS keyframe animation with 15-20 small colored dots that float down)

CLOSING PROGRESS:
- "Closing Progress: 60%" in font-semibold
- Progress bar: 60% filled in eigen-green, remainder in surface-200
- Below: "Estimated 14 days to key transfer" in text-sm surface-500

INTERACTIVE CLOSING CHECKLIST:
- Use the Accordion component for each step. 5 items total:
- Each has: icon (Lucide), title, status badge (Done=green, In Progress=blue, Action Required=amber, Pending=surface-300)

Item 1: "Select a Notary" — Status: Done ✓
- Expanded content: "You selected Van der Berg Notarissen" with a green checkmark
- Partner card showing: name, "★★★★★ (4.9)", "€1.250 fixed price", "Selected ✓" badge

Item 2: "NWWI Appraisal" — Status: Done ✓
- Expanded: "Appraisal completed on [date]. Value confirmed at €[amount]"

Item 3: "Bouwkundige Keuring" — Status: Action Required ⚠️
- Expanded: "A building inspection protects both you and the buyer. Book a certified inspector through our network."
- Timeline: "Typically takes 3-5 business days"
- 3 partner cards inside:
  - "Van der Berg Inspections" — "★★★★★ (4.8)" — "€395 fixed" — "Book Now" button (eigen-orange)
  - "Keuringsgarant" — "★★★★☆ (4.5)" — "€349 fixed" — "Book Now" button
  - "Woningkeur Nederland" — "★★★★☆ (4.3)" — "€375 fixed" — "Book Now" button
- Tapping "Book Now": 1.5s delay → "Inspection booked for [date+5 days]! You'll receive a confirmation email." Status changes to "In Progress"
- This is a revenue moment — EIGEN earns €75-150 per referral

Item 4: "Lijst van Zaken" — Status: Pending
- Expanded: "An itemized list of everything included in the sale (fixtures, appliances, curtains, etc). We auto-generate this from your listing data."
- CTA: "Generate Document" button → 2s loading → "Document ready!" with a fake download link
- Status changes to "Done" after generation

Item 5: "Koopovereenkomst & Key Transfer" — Status: Pending
- Expanded: "The standard purchase agreement will be prepared by your selected notary. Key transfer is scheduled for [closing date from accepted bid]."
- CTA: "View Timeline" — shows a simple timeline visualization of remaining steps with dates

PARTNER REVENUE CALLOUT:
- Subtle card at the bottom: "EIGEN connects you with trusted professionals at fixed, transparent prices — no surprises."

BOTTOM CTA:
- "Need Help? Contact EIGEN Support" — eigen-navy style. For PoC, shows a toast "Support chat coming soon"
```

---

## Post-Phase 2 Verification

After building all 8 screens, paste this:

```
Phase 2 complete. Run a full verification:

1. Run `npm run dev` — confirm no build errors
2. Navigate through the complete seller journey: Landing → S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8
3. Verify on each screen:
   - S1: Address autocomplete works, IDIN modal flows through all steps, valuation card shows with animation
   - S2: Photo upload creates thumbnails, filter buttons change CSS filters, progress counter updates
   - S3: Form fields populate, AI listing generates with typing animation, score breakdown expands, alternatives show
   - S4: Savings banner updates when price changes, package selection works, payment modal completes
   - S5: Charts render (sparklines, bar chart, funnel), metrics animate on mount, timeline shows events
   - S6: Comparison matrix renders, accept/counter/reject flows work, counter-offer form opens
   - S7: Filter chips filter buyer cards, first reveal works, second triggers Pro paywall
   - S8: Celebration banner shows accepted bid amount, checklist accordion works, partner booking simulates
4. Verify all page transitions are smooth (Framer Motion slide animations)
5. Verify state persists across screens (address selected in S1 appears in S3 form fields)
6. Check mobile responsiveness at 375px and 430px width
7. Report any issues found.
```
