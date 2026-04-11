# EIGEN — Product Requirements Document

**Version 1.0 | April 2026 | Confidential**

**Author:** Theun Kok | AI Development & UX Consultant Review

---

## 1. Executive Summary

EIGEN is an AI-native real estate super-app that replaces the traditional makelaar (real estate agent) in the Netherlands. The platform serves two user journeys — Seller (8 screens) and Buyer (6 screens) — providing an end-to-end experience from home valuation to key handover.

This PRD defines the functional description, UX wireframe specifications, and technical requirements for the EIGEN MVP. It incorporates all improvements identified during prototype review and establishes the development blueprint for the engineering team.

**Design Principles:**

- Trust-first: Every interaction must build confidence for a high-stakes decision
- AI-transparent: Users see why the AI recommends what it recommends
- Dutch-native: All terminology, integrations, and flows are Netherlands-specific
- Revenue-aware: Every screen has a monetization or referral touchpoint

---

## 2. Seller Journey — Functional Description

### S1 — Home Valuation

**Purpose:** Validate the seller's address, authenticate identity, and deliver an instant AI-powered home valuation.

**Current State:** A single text field with an "Analyse My Home" button. After clicking, the screen shows a valuation card with price estimate, confidence score, comparable sales table, and AI insight bubble.

**Improvements for MVP:**

**FR-S1.1 — Real-time Address Autocomplete with Kadaster Integration**
The address input must be a real-time autocomplete field connected to the Kadaster (Dutch Land Registry) API. As the user types, the field suggests matching addresses from the BAG (Basisregistratie Adressen en Gebouwen). The autocomplete displays: street name + house number, postcode, city, and a small "Verified" badge per result confirming Kadaster registration. Minimum 3 characters before suggestions appear. Debounce at 300ms.

**FR-S1.2 — IDIN Identity Verification**
After selecting an address, the user must verify ownership via IDIN — the Dutch bank-based identity service. The flow: (1) User taps "Verify My Identity" button. (2) A modal explains: "To confirm you own this address, we use IDIN — a secure service by your bank. You authorize a €0.01 payment which verifies your identity and registered address." (3) User selects their bank from a list (Rabobank, ABN AMRO, ING, etc.). (4) Redirect to bank's IDIN page. (5) On success, return to EIGEN with a green "Identity Verified" badge and the address locked. (6) On failure, show retry option and a manual verification fallback (upload utility bill + ID).

**FR-S1.3 — Pre-analysis Property Card**
Before clicking "Analyse My Home," the screen must show a property card populated from Kadaster data: property type (appartement/woonhuis/etc.), build year, registered living area (m2), land area (if applicable), and WOZ value (most recent). This gives the user immediate feedback that EIGEN "knows" their home, building trust.

**FR-S1.4 — Valuation Methodology Transparency**
Below the valuation result, add a collapsible "How we calculated this" section showing: number of comparable sales used, date range of comparables, adjustment factors applied (size, condition, location premium), and data sources (Kadaster, NVM transaction data, CBS statistics).

**Wireframe Description — S1:**
Top: EIGEN header with progress bar (step 1 of 8 active). Below: Address autocomplete field with Kadaster-powered dropdown. Below the field: IDIN verification button (blue, prominent). Once verified: property card with Kadaster data (type, year, m2, WOZ). Below: "Analyse My Home" CTA button (orange, full width). After analysis: valuation card (gradient navy, large price, range, confidence %). Below: comparable sales table. Below: AI insight bubble (purple left-border). Below: collapsible methodology section. Bottom: "Continue to Photos" button.

**Technical Requirements — S1:**

| Requirement | Detail |
|---|---|
| Kadaster BAG API | Real-time address lookup. BAG Bevragen API v2. Requires API key from PDOK. |
| IDIN Integration | Bank-based identity service. Integrate via Signicat, CM.com, or Buckaroo as IDIN gateway. Returns: name, address, date of birth, BSN hash. |
| Valuation Engine | ML model trained on NVM transaction data + Kadaster + CBS. Inputs: location, m2, build year, property type, WOZ, recent comparables. Output: point estimate, confidence interval, comparable list. |
| WOZ Data | Retrieve via WOZ Waardeloket API or municipality data. |
| NVM Transaction Data | Licensed dataset of recent sales. Alternative: use Kadaster Koopsom data (public after registration). |

---

### S2 — Professional Photos

**Purpose:** Enable sellers to upload room photos, apply AI enhancement, and create a professional visual listing.

**Current State:** A 2x2 grid of photo slots (Woonkamer, Keuken, Slaapkamer, Badkamer) with checkmarks when "filled." Two toggles: AI Enhancement and Virtual Staging. An AI bubble describes the enhancement.

**Improvements for MVP:**

**FR-S2.1 — Upload Progress Counter**
Replace the simple checkmark grid with a progress counter: "3 of 6 photos uploaded" displayed as a prominent header element. The counter updates in real-time as photos are added. Minimum 4 photos required to proceed; maximum 20. The progress bar below the counter fills proportionally.

**FR-S2.2 — Thumbnail Preview Per Room**
Each photo slot must show a thumbnail preview of the uploaded image (not just a checkmark). The thumbnail fills the slot with a subtle overlay showing the room label. A small "x" button in the top-right corner allows removal. Tapping a filled slot opens a full-screen preview with pinch-to-zoom.

**FR-S2.3 — Room Type Selection**
Each photo slot allows the user to tag the room type from a predefined list: Woonkamer, Keuken, Slaapkamer 1/2/3, Badkamer, Toilet, Tuin, Balkon, Garage, Hal/Entree, Berging, Zolder, Overig. Auto-suggest based on AI image recognition (e.g., detecting a kitchen).

**FR-S2.4 — Three Preset Enhancement Filters**
Each uploaded photo can be enhanced with one of three AI filter presets: (1) "Natural" — subtle brightness/contrast correction, lens distortion fix, sky replacement for exteriors. (2) "Bright & Airy" — warm tones, increased brightness, shadow lift, ideal for darker rooms. (3) "Magazine" — professional HDR look, color grading, furniture sharpening. The user taps to preview each filter and selects one. Default: "Natural" applied automatically.

**FR-S2.5 — Virtual Staging Toggle Per Room**
Virtual staging (AI-generated furniture for empty rooms) should be toggleable per room, not globally. Show a "Stage this room" button only on rooms tagged as empty or sparsely furnished (detected via AI). Preview the staged version in a before/after slider.

**Wireframe Description — S2:**
Top: Progress counter "3 of 6 photos uploaded" with fill bar. Below: scrollable grid of photo slots (2 columns). Filled slots show thumbnail + room label overlay + "x" remove button. Empty slots show dashed border + camera icon + "Add Photo" text. Below each filled thumbnail: 3 small filter preset buttons (Natural / Bright / Magazine) with active state highlighted. Below grid: "Add More Photos" button. Below: Virtual staging section — only shows for empty-detected rooms with before/after slider. Bottom: "Continue to Listing" button (disabled until minimum 4 photos).

**Technical Requirements — S2:**

| Requirement | Detail |
|---|---|
| Image Upload | Client-side compression to max 5MB before upload. Accept JPEG, PNG, HEIC. Store originals in S3/Cloud Storage. |
| AI Room Detection | Image classification model to auto-tag room type. Use pre-trained model (ResNet/EfficientNet fine-tuned on room images) or API (Google Vision, AWS Rekognition). |
| AI Enhancement Engine | Three filter presets applied server-side. Use: brightness/contrast normalization, lens correction (OpenCV), sky replacement (for exteriors), HDR tone mapping. Framework: Python + OpenCV + Pillow, or third-party API (Autoenhance.ai, REimagineHome). |
| Virtual Staging | AI furniture placement for empty rooms. Integration with API service (e.g., REimagineHome, Virtual Staging AI, or Palette.fm). Per-room toggle. Before/after output. |
| Storage | AWS S3 or Google Cloud Storage. CDN for delivery (CloudFront/Fastly). Keep original + enhanced + staged versions. |

---

### S3 — Listing Description

**Purpose:** Gather property details from the seller and generate an AI-optimized listing description.

**Current State:** Input fields for property details (asking price, living area, bedrooms, etc.), an AI-generated listing text, SEO score (94/100), and keyword tags.

**Improvements for MVP:**

**FR-S3.1 — Larger Input Fields**
All text input fields must be large enough to show the full content. Single-line fields: minimum height 48px. Multi-line fields (description, unique selling points): textarea with visible 4 lines minimum, max 400 characters, with a live character counter ("237 / 400").

**FR-S3.2 — Inline Edit Toggle for AI Copy**
The AI-generated listing text must have an "Edit" toggle button. Default state: read-only display with nice typography. When "Edit" is toggled on: the text becomes an editable textarea. Changes are auto-saved. A "Regenerate" button appears to get a new AI version. An "Undo" button reverts to the last AI-generated version.

**FR-S3.3 — Score Breakdown & Tips**
The SEO/Quality Score (e.g., 94/100) must be clickable to reveal a breakdown: which factors contribute positively (e.g., "Mentions neighbourhood: +5"), which bring it down (e.g., "Missing: energy label mention: -3", "No mention of nearby schools: -3"). Each negative factor has an "Auto-fix" button that regenerates the copy with that factor addressed.

**FR-S3.4 — Alternative Versions**
A "Show alternatives" button generates 2 additional versions of the listing text with different tones: (1) Factual/Professional, (2) Warm/Storytelling, (3) Premium/Luxury. The user can compare all three side by side (or swipe between them on mobile) and select their preferred version.

**Wireframe Description — S3:**
Top: "Your Listing" header. Below: form section with large input fields (asking price, m2, bedrooms, bathrooms, energy label, build year, unique features). Each field: label above, input with visible content, character counter for text fields. Below form: divider line. AI-generated listing section: header "AI-Generated Listing" with Edit toggle (switch UI) on the right. Below: listing text in card format. Below text: Score badge "94/100" — tappable to expand breakdown. Breakdown shows green checkmarks for positives, red x's for negatives with "Auto-fix" buttons. Below: "Show Alternatives" button. When tapped: carousel of 3 versions (Factual / Storytelling / Premium) with "Use This Version" button on each. Bottom: "Continue to Pricing" button.

**Technical Requirements — S3:**

| Requirement | Detail |
|---|---|
| AI Text Generation | LLM-based listing generation. Input: property details, photos (for visual context), neighbourhood data. Output: 200-400 word listing in Dutch. Use GPT-4 / Claude API with Dutch-specific system prompt. |
| SEO Scoring Engine | Rule-based + ML scoring. Factors: keyword density (neighbourhood, amenities, transport), readability score (Flesch-Douma for Dutch), completeness (energy label, m2, rooms mentioned), emotional appeal words, call-to-action presence. |
| Alternative Generation | Same LLM with different tone system prompts. Generate 3 variants in parallel. Cache results per session. |
| Character Counter | Client-side. Real-time update on input. Block input at 400 chars. |

---

### S4 — Set Your Price

**Purpose:** Help the seller choose their asking price and select an EIGEN listing package.

**Current State:** Strategy selector (Quick Sale / Market Value / Maximum Return), price input field, fee comparison (Makelaar €7,485 vs EIGEN €999), market analysis stats, and package selection.

**Improvements for MVP:**

**FR-S4.1 — Terminology: Always Use "Makelaar"**
All references to "agent" or "real estate agent" must use "makelaar" throughout the app. This is the Dutch term and resonates with the target market.

**FR-S4.2 — Sticky Savings Banner**
The fee comparison (Makelaar €7,485 vs EIGEN €999 = "You save €6,486") must be the first visible element on this screen and must remain sticky (fixed position) as the user scrolls. Design: a compact bar at the top with the makelaar cost crossed out in red, the EIGEN cost in green, and the savings amount in large orange text. This is the conversion moment — it must be impossible to miss.

**FR-S4.3 — Dynamic Savings Calculation**
The savings comparison must update dynamically based on the asking price the seller enters. Formula: Makelaar cost = asking price x 1.5% (average NL makelaar commission). EIGEN cost = selected package price. Savings = difference. Show both inclusive and exclusive of VAT.

**FR-S4.4 — Package Comparison Detail**
The three packages (Basis €495, Plus €695, Premium €995) need a clear feature comparison matrix. Format: three columns with checkmarks/x's for each feature. Features to compare: AI valuation, AI listing text, photo enhancement, virtual staging, premium placement, video tour, viewing scheduler, offer management, notary coordination, personal advisor access.

**Wireframe Description — S4:**
Top (sticky): savings banner — red strikethrough makelaar cost, green EIGEN cost, large orange savings. Below: strategy selector (3 cards: Quick/Market/Max). Below: price input field with live savings recalculation. Below: package comparison matrix (3 columns, feature rows with check/x). Below: package selection cards (Basis/Plus/Premium) with "Select" buttons. Below: AI recommendation bubble ("Based on your home's value and market conditions, we recommend Plus"). Bottom: "Continue to Go Live" button.

**Technical Requirements — S4:**

| Requirement | Detail |
|---|---|
| Dynamic Pricing Engine | Client-side calculation: makelaar_cost = asking_price * 0.015 (average). EIGEN_cost = selected_package. Savings = makelaar_cost - EIGEN_cost. VAT calculation (21% BTW). |
| Payment Integration | One-time payment at package selection. Integrate Mollie (Dutch payment provider) for iDEAL, credit card, Apple Pay. |
| Strategy Recommendation | Rule-based: if days_on_market_avg < 14 in area → Quick Sale recommended. If market rising → Maximum Return. Else → Market Value. |

---

### S5 — LIVE Dashboard

**Purpose:** Show the seller real-time performance data once their listing is live.

**Current State:** Listing status badge, total views count (847), a pie chart for viewer demographics, interest breakdown bar, and recent activity timeline.

**Improvements for MVP:**

**FR-S5.1 — Views Over Time Sparkline**
Add a time-series sparkline chart showing views per day since listing went live. Format: small line chart (120px height) with daily data points. Show the trend direction with a green up-arrow or red down-arrow. Tap the chart to expand to a full-screen view with hourly/daily/weekly toggles.

**FR-S5.2 — Contextual Benchmarking**
Every metric must include a benchmark comparison against the area average. Examples: "847 views — 2.1x more than average for your neighbourhood." "23 saves — Top 15% of listings in Utrecht." "4 viewing requests — on track to match comparable homes." Use green/orange/red color coding: green if above average, orange if average, red if below.

**FR-S5.3 — Engagement Funnel**
Add a visual funnel showing: Views → Saves → Viewing Requests → Offers. Show the conversion rate between each step and benchmark it. Example: "12% of viewers saved your listing (avg: 8%) — your photos are working."

**FR-S5.4 — Push Notification Preferences**
Allow sellers to configure which events trigger push notifications: new viewing request, new offer received, listing milestone (100 views, 500 views, etc.), weekly performance summary.

**Wireframe Description — S5:**
Top: listing status badge ("LIVE — Day 3"). Below: sticky savings reminder (smaller version of S4 banner). Below: key metrics row — 3 cards: Views (847, 2.1x avg, sparkline), Saves (23, Top 15%), Viewing Requests (4). Below: engagement funnel (horizontal flow: Views → Saves → Requests → Offers with conversion %'s). Below: views-over-time chart (expandable). Below: recent activity timeline (chronological events). Below: notification preferences (toggle switches per event type). Bottom: "View Offers" button if offers exist.

**Technical Requirements — S5:**

| Requirement | Detail |
|---|---|
| Analytics Pipeline | Event tracking: page views, saves, viewing requests, offer submissions. Store in time-series DB (TimescaleDB or InfluxDB) or standard PostgreSQL with time-indexed tables. |
| Benchmarking Engine | Aggregate statistics per postcode area: avg views/day, avg saves, avg time-to-first-offer. Updated weekly from platform data. |
| Push Notifications | FCM (Firebase Cloud Messaging) for mobile. Web push for browser. Event-driven triggers via message queue (RabbitMQ/SQS). |
| Sparkline Charts | Client-side: use lightweight charting library (Chart.js, Recharts for React, or SVG-based custom). |

---

### S6 — Incoming Bids

**Purpose:** Present offers to the seller with AI-powered analysis and enable accept/counter/reject decisions.

**Current State:** List of 3 offers with amounts, conditions, and status indicators. AI recommendation bubble highlighting the best offer. Accept and Counter buttons visible.

**Improvements for MVP:**

**FR-S6.1 — Offer Comparison Matrix**
Add a structured comparison table for all offers side by side. Columns: Bidder name, Offered price, Financing (mortgage/cash/mix), Conditions (inspection, financing clause, etc.), Proposed closing date, Speed-to-close estimate, Risk assessment (AI-rated Low/Medium/High). Sortable by any column.

**FR-S6.2 — AI Trade-off Explanation**
The AI recommendation must explain trade-offs explicitly. Example: "Thompson offers €498,500 with a financing clause — highest price but 6-8 week closing. David R. offers €485,000 cash — €13,500 less but closes in 2 weeks with zero financing risk. If speed matters more than price, David R. is your safest bet." Use a visual trade-off slider: Speed ↔ Price ↔ Risk.

**FR-S6.3 — Reject Button**
Add an explicit "Reject" button alongside Accept and Counter for each offer. Rejecting an offer sends a polite automated message to the bidder with optional seller comments. Rejecting is reversible within 24 hours.

**FR-S6.4 — Counter-Offer Builder**
The Counter button opens a structured form: counter price (pre-filled with AI suggestion), conditions to add/remove, proposed closing date, and a free-text message to the buyer. AI suggests the optimal counter based on market data and the buyer's likely acceptance range.

**Wireframe Description — S6:**
Top: "You have 3 offers" header with sort/filter options. Below: comparison matrix (horizontal scroll on mobile) with all offers side by side. Key metrics: price, financing, conditions, speed, risk score. Below matrix: AI recommendation card (purple border) with trade-off explanation and visual slider. Below: individual offer cards (expandable) each with Accept / Counter / Reject buttons. Counter opens a slide-up form. Reject opens a confirmation dialog with optional message. Bottom: "Need help deciding? Chat with AI Advisor" button.

**Technical Requirements — S6:**

| Requirement | Detail |
|---|---|
| Offer Management System | CRUD for offers. States: pending, accepted, countered, rejected, withdrawn, expired. Audit trail for all state changes. |
| AI Offer Analysis | Scoring model: inputs (price vs. valuation, financing type, conditions, buyer pre-qualification status, market days). Output: risk score (0-100), speed estimate, recommendation ranking. |
| Messaging System | In-app messaging between seller and buyer. Templated messages for accept/reject/counter. Real-time via WebSocket. |
| Counter-Offer Logic | AI-suggested counter based on: asking price, market conditions, buyer's financing capacity, comparable accepted offers. |

---

### S7 — Explore Mode (Pro Feature)

**Purpose:** Allow sellers to proactively discover pre-qualified buyers and offer freemium/Pro upsell.

**Current State:** Three anonymous buyer cards with match scores and "Reveal" buttons (Pro feature). Upgrade CTA at bottom.

**Improvements for MVP:**

**FR-S7.1 — Reveal Mechanism Explanation**
Add a clear tooltip/explainer for the "Reveal" feature: "When you reveal a buyer, they receive a notification that you're interested. Both parties can then see each other's profile and start a conversation. The buyer sees: your listing details and your availability for viewings. You see: the buyer's name, pre-qualification status, search criteria match score, and preferred timeline."

**FR-S7.2 — Real Buyer Data (Not Placeholder)**
Replace placeholder "Anonymous Buyer" cards with dynamically generated realistic profiles. Each card shows: match score (%), buyer type (Starter / Doorstromer / Investor), pre-qualification status (verified/unverified), search duration (how long they've been looking), and preferred neighbourhood tags. The "reveal" unlocks: full name, contact preference, mortgage pre-approval amount.

**FR-S7.3 — Freemium vs Pro Clarity**
Show a clear split: Free tier gets 1 reveal per month and can see match scores. Pro tier (€49/month or included in Premium listing package) gets unlimited reveals, priority matching, and sees buyer mortgage pre-qualification amounts. Display a comparison table on the upgrade prompt.

**Wireframe Description — S7:**
Top: "Explore Buyers" header with filter chips (Match > 80%, Pre-qualified only, Starters, Doorstromers). Below: buyer cards (3-5 visible). Each card: match score badge, buyer type tag, anonymized profile (silhouette + "Buyer in Utrecht-West"), search criteria summary, "Reveal" button (orange for Pro, greyed for Free if limit reached). Info icon next to "Reveal" opens tooltip explainer. Below cards: Pro upgrade banner with feature comparison. Bottom: "Back to Dashboard" button.

**Technical Requirements — S7:**

| Requirement | Detail |
|---|---|
| Matching Engine | Score buyers against listings: criteria overlap (location, price range, property type, m2, features). Weight by: buyer engagement (active search), pre-qualification status, timeline urgency. |
| Reveal System | Database record: reveal_id, seller_id, buyer_id, revealed_at, notification_sent. Triggers push notification to buyer. Rate limit for free tier (1/month). |
| Subscription Management | Pro tier: €49/month or bundled with Premium listing. Manage via Stripe/Mollie recurring billing. |

---

### S8 — Deal Closed

**Purpose:** Guide the seller through the post-acceptance closing process with interactive checklists and partner referrals.

**Current State:** A static closing checklist with checked/unchecked items: notary selection, NWWI appraisal, lijst van zaken, model koopovereenkomst, key transfer.

**Improvements for MVP:**

**FR-S8.1 — Interactive Closing Checklist**
Each checklist item must be clickable/tappable, expanding to show: what this step entails (plain-language explanation), estimated timeline (e.g., "Typically takes 3-5 business days"), next action (e.g., "Select a notary from our network"), and a CTA button linking to the relevant partner or EIGEN feature.

**FR-S8.2 — Partner Referral Integration**
Each closing step links to an EIGEN partner where applicable. Notary selection: list of 3-5 vetted notaries in the seller's area with ratings and fixed-price quotes. NWWI Appraisal: book directly through EIGEN with a partnered NWWI-certified appraiser (EIGEN referral fee: €75-150). Bouwkundige keuring: marketplace of certified inspectors (referral fee: €75-150). Lijst van zaken: auto-generated template pre-filled with property data. Model koopovereenkomst: auto-generated standard purchase agreement pre-filled with deal terms (buyer, seller, price, conditions, closing date).

**FR-S8.3 — Progress Tracking**
Overall closing progress as a percentage bar: "60% complete — 3 of 5 steps done." Estimated days to closing based on remaining steps. Automatic reminders for overdue steps.

**FR-S8.4 — Document Generation**
The lijst van zaken and model koopovereenkomst should be auto-generated PDFs pre-filled with all known data (property details, buyer/seller names, agreed price, conditions). The seller reviews, edits if needed, and digitally signs via an integrated e-signature service.

**Wireframe Description — S8:**
Top: celebration banner ("Congratulations! Your home is sold for €498,500"). Below: progress bar "60% complete — estimated 14 days to closing." Below: interactive checklist (accordion-style). Each item: icon + title + status badge (Done/Pending/Action Required). Expanded item shows: description, timeline, CTA button (e.g., "Select a Notary," "Book Appraisal," "Generate Document"). Partner cards within expanded items show: partner name, rating, price, "Book Now" button. Bottom: "Need Help? Contact EIGEN Support" button.

**Technical Requirements — S8:**

| Requirement | Detail |
|---|---|
| Checklist Engine | State machine per deal: steps with statuses (pending, in_progress, completed, blocked). Auto-transition on partner confirmation. |
| Partner Marketplace | Database of vetted partners per category (notary, appraiser, inspector). Per-partner: name, location, rating, pricing, availability calendar. Referral tracking for revenue. |
| Document Generation | PDF templating engine (e.g., Puppeteer rendering HTML templates, or WeasyPrint for Python). Pre-fill with deal data. Digital signature integration (e.g., DocuSign, SignRequest (Dutch), or Connective). |
| Reminders | Scheduled job checking overdue steps. Notification via push/email at configurable intervals (3 days, 7 days, 14 days). |

---

## 3. Buyer Journey — Functional Description

### B1 — AI Search

**Purpose:** Enable buyers to describe their dream home in natural language and receive AI-powered results.

**Current State:** Chat interface with AI assistant. User types a message, AI responds with conversational results. Clean design but no post-query refinement options.

**Improvements for MVP:**

**FR-B1.1 — Quick-Filter Chips After Initial Query**
After the AI returns initial results, display a row of quick-filter chips below the chat input. Chips include: Price range (€200-300K, €300-400K, €400-500K, €500K+), Bedrooms (1, 2, 3, 4+), Property type (Appartement, Tussenwoning, Hoekwoning, Vrijstaand), Neighbourhood (dynamic based on AI-detected city). Tapping a chip refines results without retyping. Active chips are highlighted. Multiple chips can be combined.

**FR-B1.2 — Popular Searches for New Users**
First-time visitors (no search history) see a "Popular Searches" section before the chat: pre-built search cards like "Family home in Utrecht-West, €400-500K" or "Starter apartment in Rotterdam, max €300K" or "House with garden near Amsterdam, 3+ bedrooms." Tapping a card pre-fills the chat and immediately triggers a search. Based on actual platform search volume data (or curated for MVP).

**FR-B1.3 — Search History & Saved Searches**
Returning users see their last 5 searches below the input. A "Save this search" button after each query allows buyers to get notified when new matching listings appear.

**FR-B1.4 — Structured Preference Capture**
After the first free-form query, the AI follows up with structured questions to refine the search profile: "What's your maximum budget including overbidding?", "How important is commute time to [workplace]?", "Any dealbreakers? (e.g., no ground floor, must have garden)". Responses are stored as a buyer preference profile used for ongoing matching.

**Wireframe Description — B1:**
Top: EIGEN header with buyer mode indicator. Below: chat container (scrollable). For new users: "Popular Searches" cards (horizontal scroll, 3-4 cards). For returning users: recent searches list. Chat messages: AI bubbles (left, white) and user bubbles (right, blue). After initial results: filter chip row (horizontal scroll) with category chips. Below chips: "Save this search" button. Chat input: text field + send button. Typing indicator when AI is processing.

**Technical Requirements — B1:**

| Requirement | Detail |
|---|---|
| NLP Search Engine | LLM-based query understanding. Parse natural language into structured search parameters (location, price, bedrooms, features, lifestyle preferences). Use function calling to map to listing database queries. |
| Filter Chip Engine | Client-side filtering. Map chips to search parameters. Allow additive filtering (AND logic). Highlight active chips. |
| Search History | Store per user: query text, parsed parameters, timestamp. Last 20 searches. API endpoint: GET /api/searches?limit=5. |
| Popular Searches | Curated list for MVP. Later: generated from aggregated anonymous search data. API: GET /api/popular-searches?city={city}. |
| Saved Searches | Store: user_id, search_parameters, notification_preference (instant/daily/weekly), created_at. Job: match new listings against saved searches and trigger notifications. |

---

### B2 — Search Results

**Purpose:** Display AI-matched listings in an easy-to-compare format.

**Current State:** Property cards with colored gradient placeholders (no actual property info visible on card), Top Pick/Explore/New badges, match score, and basic specs visible only after expanding.

**Improvements for MVP:**

**FR-B2.1 — Property Info on Card**
Each result card must show key information without clicking: address (street + city), asking price, living area (m2), number of bedrooms, match score, and one property photo (or AI-enhanced photo). No more gradient placeholders — every card shows real or representative content.

**FR-B2.2 — Comparison Quick-Select**
Add a "Compare" checkbox on each card. When 2-3 cards are selected, a floating "Compare Selected" button appears, opening a side-by-side comparison view with all key metrics aligned in columns.

**FR-B2.3 — Sort Options**
Add sort controls: Best Match (default, AI-ranked), Price Low-High, Price High-Low, Newest First, Most Viewed. Sort control as a dropdown above the results list.

**FR-B2.4 — Map View Toggle**
A "Map / List" toggle in the header switches between the card list and a map view showing pins for each result. Map pins are color-coded by match score (green = high match, orange = medium, grey = low). Tapping a pin shows a mini-card overlay.

**Wireframe Description — B2:**
Top: results header "12 homes match your search" with sort dropdown and Map/List toggle. Below (List view): scrollable property cards. Each card: photo (full width, 180px height), badge (Top Pick / New / etc.), below photo: address, price (large bold), specs row (m2, bedrooms, bathrooms), match score badge, compare checkbox. Below (Map view): full-width map with colored pins, mini-card overlay on pin tap. Floating "Compare Selected" button when 2+ cards checked. Bottom nav: Search / Results / Saved / Profile.

**Technical Requirements — B2:**

| Requirement | Detail |
|---|---|
| Listing Search API | Elasticsearch or PostgreSQL full-text search with geo-spatial filtering. Return: listing_id, address, price, m2, bedrooms, bathrooms, photos, match_score, tags. Pagination: 20 per page with infinite scroll. |
| Photo CDN | Serve optimized thumbnails (400px wide, WebP format) from CDN. Lazy loading for off-screen cards. |
| Comparison Engine | Client-side: store selected listing IDs, fetch full details for comparison view. Max 3 listings compared simultaneously. |
| Map Integration | Mapbox GL JS or Google Maps API. GeoJSON layer for listing pins. Cluster pins at zoom levels > 12. Color-coded by match_score ranges. |

---

### B3 — Property Detail

**Purpose:** Provide deep analysis of a specific property including price analysis, neighbourhood intelligence, and risk assessment.

**Current State:** This is the strongest screen. Contains: property details (address, specs), Price Analysis section (asking price vs AI estimate), Neighbourhood Intelligence (school ratings, safety, transport), Risk Check (flooding, subsidence, noise).

**Improvements for MVP:**

**FR-B3.1 — AI Summary Verdict**
Add a prominent "AI Verdict" card at the top of the detail screen. This synthesizes all data points into a plain-language summary. Example: "This home is fairly priced (2% below AI estimate), in a top-rated neighbourhood (school rating 8.2/10, very safe), with low risk factors. Commute to Amsterdam Centraal: 22 minutes. Verdict: worth a viewing." The verdict uses a traffic light system: green = recommended, orange = consider carefully, red = concerns flagged.

**FR-B3.2 — Overbidding Intelligence**
In the Price Analysis section, add: "In this neighbourhood, 78% of homes sold above asking price in the last 6 months. Average overbid: 4.2% (€16,800 on this home)." Show a histogram of recent overbid percentages. Add: "AI-suggested bid range: €395,000 — €420,000 based on market conditions."

**FR-B3.3 — Expandable Sections**
Each section (Price Analysis, Neighbourhood Intelligence, Risk Check) should be collapsible/expandable to manage screen real estate. Default: AI Verdict expanded, all sections collapsed with summary stats visible.

**FR-B3.4 — Schedule Viewing CTA**
Prominent "Schedule a Viewing" button (sticky at bottom) that links to B4. Shows next available time slot: "Next available: Saturday 14:00."

**Wireframe Description — B3:**
Top: property photo carousel (swipeable, 3-5 photos). Below: address + price + key specs bar. Below: AI Verdict card (green/orange/red background tint, icon, 2-3 sentence summary). Below: collapsible sections — Price Analysis (asking vs estimate, overbid data, histogram), Neighbourhood Intelligence (scores for schools, safety, transport, amenities, green space), Risk Check (flooding, subsidence, noise, future development). Each section header shows summary stat when collapsed. Sticky bottom: "Schedule a Viewing" button with next available slot.

**Technical Requirements — B3:**

| Requirement | Detail |
|---|---|
| AI Verdict Engine | LLM-based synthesis of: valuation delta, neighbourhood scores, risk factors, commute data. Output: 2-3 sentence Dutch summary + traffic light rating. |
| Overbidding Data | Historical transaction data per postcode: % sold above asking, average overbid %, distribution histogram. Source: Kadaster transaction records + NVM data. Updated monthly. |
| Neighbourhood Data | School ratings (DUO/Scholen op de Kaart), crime statistics (CBS/Police open data), public transport (9292 API / OV API), noise maps (RIVM Atlas Leefomgeving), flood risk (Klimaateffectatlas). |
| Commute Calculator | Routing API (Google Maps / Mapbox) for commute times to user-specified destinations. Public transport + car + bike modes. |

---

### B4 — Viewing Preparation

**Purpose:** Help the buyer prepare for a property viewing with a personalized AI-generated checklist.

**Current State:** Viewing confirmation with date/time, personalized viewing guide with AI-generated checkpoints specific to the property (e.g., "Check the roof — this home was built in 1965"), and a map section.

**Improvements for MVP:**

**FR-B4.1 — Download / Send Checklist**
Add two buttons below the checklist: "Download as PDF" generates a formatted PDF of the viewing guide and checklist for offline reference. "Send to My Phone" sends the checklist via SMS or WhatsApp to the buyer's registered phone number. This is a word-of-mouth feature — buyers will share this with friends/family who join the viewing.

**FR-B4.2 — Viewing Notes**
Add a "Notes" section at the bottom where the buyer can type observations during or after the viewing. Notes are saved to the property's detail page for later reference. Support: text input + photo attachment (take a photo of an issue spotted during viewing).

**FR-B4.3 — AI Question Suggestions**
Add "Questions to ask the seller" section: AI-generated questions specific to this property. Examples: "When was the CV-ketel last serviced?", "Are there any known issues with the VvE (for apartments)?", "What's included in the sale (curtains, appliances)?", "Have there been any overbids on this property?"

**FR-B4.4 — Post-Viewing Rating**
After the viewing time has passed, prompt the buyer to rate the property: "How was the viewing?" with a 1-5 star rating and optional notes. This feeds back into the AI matching algorithm (properties rated highly by similar buyers get boosted for others).

**Wireframe Description — B4:**
Top: viewing confirmation card (property thumbnail, address, date/time, seller name). Below: "Personalized Viewing Guide" header. Checklist items with property-specific AI tips (each item has an icon + description). Below checklist: "Download PDF" and "Send to Phone" buttons (side by side). Below: "Questions to Ask" section (expandable, 4-6 AI-generated questions). Below: "Your Notes" section (textarea + "Add Photo" button). Post-viewing: rating prompt overlay (1-5 stars + comment field). Bottom: "Ready to Make an Offer?" button linking to B5.

**Technical Requirements — B4:**

| Requirement | Detail |
|---|---|
| PDF Generation | Server-side PDF generation of viewing guide. Template: property address, date, AI checklist items, map snippet, notes section. Use Puppeteer or WeasyPrint. |
| SMS/WhatsApp Delivery | SMS via Twilio or MessageBird (Dutch provider). WhatsApp Business API for WhatsApp delivery. Content: shortened link to web version of checklist + key points as text. |
| Viewing Notes | Per-user, per-property notes storage. Text + photo attachments (upload to S3). Accessible from property detail page. |
| AI Question Generation | LLM-based: input property data (age, type, VvE status, energy label, recent renovations). Output: 4-6 Dutch-language questions. Cached per property. |
| Post-Viewing Rating | Store: user_id, listing_id, rating (1-5), notes, timestamp. Feed into recommendation engine as implicit preference signal. |

---

### B5 — Make a Bid

**Purpose:** Enable the buyer to submit a bid on a property with AI-guided pricing advice.

**Current State:** Not fully rendered in prototype. Based on seller-side functionality, this screen needs to support the bidding flow.

**Functional Requirements for MVP:**

**FR-B5.1 — AI Bid Advisor**
Before entering a bid amount, the buyer sees an "AI Bid Advisor" card: "Based on market conditions in this neighbourhood, overbidding trends, and comparable recent sales, we recommend bidding between €408,000 and €425,000 (2-6% above asking)." The advisor shows: asking price, AI estimate, recent comparable sale prices, average overbid % in area, and a suggested range with Low/Medium/High probability of acceptance for each level.

**FR-B5.2 — Structured Bid Form**
Bid form fields: bid amount (with AI suggestion pre-filled), financing type (mortgage / cash / mix), financing clause (ontbindende voorwaarde, yes/no with explanation tooltip), inspection clause (bouwkundige keuring voorbehoud, yes/no), proposed closing date (date picker, AI suggests optimal date), personal message to seller (optional, max 500 chars).

**FR-B5.3 — Bid Confirmation & Status Tracking**
After submission: confirmation screen with bid summary and estimated response time. Status tracking: Submitted → Viewed by Seller → Under Consideration → Accepted / Countered / Rejected. Real-time status updates via push notification.

**FR-B5.4 — Counter-Offer Handling**
If the seller counters, the buyer sees: original bid vs counter side by side, what changed (price, conditions, date), and AI advice on whether to accept, counter again, or walk away. "Accept Counter" and "Counter Again" buttons.

**Wireframe Description — B5:**
Top: property mini-card (address, photo, asking price). Below: AI Bid Advisor card (suggested range, overbid data, acceptance probability gauge). Below: bid form (amount input with +/- buttons, financing type selector, clause toggles with explanation tooltips, date picker, message textarea). Below: bid summary preview card. "Submit Bid" button (orange, prominent). After submission: status tracker (horizontal progress dots: Submitted → Viewed → Considering → Decision). Counter-offer screen: side-by-side comparison + AI advice + Accept/Counter/Decline buttons.

**Technical Requirements — B5:**

| Requirement | Detail |
|---|---|
| Bid Submission API | POST /api/bids with: listing_id, buyer_id, amount, financing_type, conditions[], closing_date, message. Validation: amount > 0, closing_date > today + 14 days. |
| AI Bid Advisor | Model inputs: asking_price, AI_valuation, area_overbid_stats, days_on_market, number_of_competing_bids (if transparent bidding enabled). Output: suggested range (low/mid/high), acceptance probability per level. |
| Status Tracking | WebSocket or Server-Sent Events for real-time bid status updates. States: submitted, viewed, considering, accepted, countered, rejected, withdrawn. |
| Counter-Offer Flow | Mirror of seller counter-offer system. Buyer can accept, counter, or decline. Max 3 rounds of countering before system suggests direct communication. |

---

### B6 — Keys (Closing Process)

**Purpose:** Guide the buyer through the post-acceptance closing process, mirroring the seller's checklist from the buyer perspective.

**Current State:** Not fully rendered in prototype.

**Functional Requirements for MVP:**

**FR-B6.1 — Buyer Closing Checklist**
Interactive checklist mirroring S8 but from the buyer perspective. Steps: (1) Mortgage finalization — connect with EIGEN partner bank/advisor to finalize mortgage offer. (2) Bouwkundige keuring — book a building inspection through EIGEN marketplace (referral revenue). (3) Notary appointment — select from EIGEN notary network, sign koopakte. (4) NWWI taxatie — required for mortgage, book through EIGEN (referral revenue). (5) Lijst van zaken — review and confirm with seller. (6) Final walkthrough — schedule via EIGEN. (7) Key transfer — confirm date and logistics.

**FR-B6.2 — Mortgage Partner Integration**
Prominent "Finalize Your Mortgage" card linking to EIGEN partner banks (Rabobank, ABN AMRO/Florius, De Hypotheker). Show: pre-qualified amount, estimated monthly payment at current rates, and "Speak to an Advisor" button. This is a primary revenue moment (€500-1,500 referral per mortgage).

**FR-B6.3 — Document Tracker**
Track all required documents: koopakte (purchase agreement), mortgage offer, inspection report, NWWI appraisal, insurance confirmation. Status per document: pending / uploaded / verified. Upload functionality for buyer to add their own documents.

**FR-B6.4 — Countdown to Keys**
A prominent countdown widget: "14 days until you get your keys!" with a visual calendar showing all remaining steps plotted on the timeline.

**Wireframe Description — B6:**
Top: celebration banner ("Your offer was accepted! €415,000 for Keizersgracht 123"). Below: countdown widget ("14 days to keys" with calendar visualization). Below: mortgage partner card (Rabobank/ABN AMRO logo, pre-qualified amount, monthly payment estimate, "Finalize Mortgage" CTA). Below: interactive checklist (accordion, same pattern as S8). Each item: icon, title, status badge, expandable details with CTA buttons. Below: document tracker (list of required docs with upload buttons and status). Bottom: "Questions? Chat with EIGEN" support button.

**Technical Requirements — B6:**

| Requirement | Detail |
|---|---|
| Closing Workflow Engine | State machine mirroring S8. Steps with dependencies (e.g., mortgage must be finalized before notary appointment). Auto-reminders for overdue steps. |
| Mortgage Referral System | Deep-link integration with partner banks. Track: referral_id, partner, buyer_id, status (referred, applied, approved, funded), commission_amount. Webhook from partner on status change. |
| Document Management | Upload to S3 with virus scanning. Accept: PDF, JPEG, PNG. Max 10MB per file. Document types tagged and validated. Shared access: buyer + seller + notary (permission-based). |
| Timeline/Countdown | Calculate estimated closing date from: current step completion, average duration per remaining step, any blockers. Real-time countdown widget. |

---

## 4. UX Wireframe Specifications — Cross-Screen Patterns

### Navigation & Layout

All screens share a consistent layout: (1) Status bar (system), (2) EIGEN header with logo + user avatar, (3) Progress bar (seller: 8 steps, buyer: 6 steps) with clickable step indicators, (4) Scrollable content area, (5) Bottom action bar with primary CTA.

### Design System

| Element | Specification |
|---|---|
| Primary color | #1B3A5C (navy) |
| Seller accent | #FF6B35 (orange) |
| Buyer accent | #3B82F6 (blue) |
| Success | #22C55E (green) |
| Warning | #F59E0B (amber) |
| Error | #EF4444 (red) |
| AI indicator | #8B5CF6 (purple) |
| Typography | System font stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto) |
| Card radius | 16px |
| Button radius | 8px (primary), 20px (pills/chips) |
| Minimum touch target | 44x44px |
| Max content width | 430px (mobile-first) |

### AI Elements

All AI-generated content uses a consistent visual language: purple left border (4px, #8B5CF6), light purple background (#F3E8FF), "AI" label with sparkle icon, and a "How was this generated?" link that explains the methodology.

### Accessibility

All interactive elements must meet WCAG 2.1 AA: minimum contrast ratio 4.5:1 for text, 3:1 for large text and UI components. All images must have alt text. Form fields must have visible labels. Error states must not rely on color alone.

---

## 5. Technical Architecture Overview

### Frontend

| Component | Technology |
|---|---|
| Framework | React Native (iOS + Android) or Flutter for cross-platform mobile. Next.js for web. |
| State management | Redux Toolkit or Zustand |
| API communication | React Query for caching + REST. WebSocket for real-time (bids, chat). |
| Maps | Mapbox GL JS |
| Charts | Recharts (React) or fl_chart (Flutter) |
| Forms | React Hook Form with Zod validation |

### Backend

| Component | Technology |
|---|---|
| API framework | Node.js (NestJS) or Python (FastAPI) |
| Database | PostgreSQL (primary) + Redis (caching/sessions) |
| Search | Elasticsearch for listing search + geo queries |
| File storage | AWS S3 + CloudFront CDN |
| AI/ML | Python microservices. LLM: Claude/GPT-4 API. Image: custom models + third-party APIs. |
| Message queue | RabbitMQ or AWS SQS for async jobs (notifications, image processing, document generation) |
| Real-time | WebSocket (Socket.io) for bid status, chat, notifications |

### Third-Party Integrations Summary

| Integration | Purpose | Priority |
|---|---|---|
| Kadaster BAG API | Address validation, property data | P0 (MVP) |
| IDIN (via Signicat/CM.com) | Identity verification | P0 (MVP) |
| Mollie | Payments (iDEAL, cards, Apple Pay) | P0 (MVP) |
| Kadaster Koopsom / NVM | Transaction data for valuations | P0 (MVP) |
| WOZ Waardeloket | Property tax valuations | P0 (MVP) |
| Claude / GPT-4 API | AI text generation, chat, summaries | P0 (MVP) |
| Google Vision / AWS Rekognition | Room detection in photos | P1 (MVP) |
| Autoenhance.ai / REimagineHome | Photo enhancement + virtual staging | P1 (MVP) |
| Mapbox | Maps for search results, property detail | P1 (MVP) |
| 9292 / OV API | Public transport commute calculation | P1 (MVP) |
| CBS Open Data | Statistics (crime, demographics) | P1 (MVP) |
| DUO / Scholen op de Kaart | School ratings | P1 (MVP) |
| Firebase Cloud Messaging | Push notifications | P1 (MVP) |
| Twilio / MessageBird | SMS delivery | P2 (Post-MVP) |
| WhatsApp Business API | WhatsApp notifications | P2 (Post-MVP) |
| DocuSign / SignRequest | Digital signatures | P2 (Post-MVP) |
| Rabobank / ABN AMRO APIs | Mortgage referral deep-links | P2 (Post-MVP) |
| NWWI | Appraisal booking | P2 (Post-MVP) |

### Data Model — Key Entities

| Entity | Key Fields |
|---|---|
| User | id, email, name, phone, role (seller/buyer/both), idin_verified, created_at |
| Property | id, address, postcode, city, type, build_year, m2_living, m2_land, bedrooms, bathrooms, energy_label, woz_value, kadaster_id |
| Listing | id, property_id, seller_id, status, asking_price, package_tier, photos[], description, seo_score, created_at, live_at |
| Photo | id, listing_id, room_type, original_url, enhanced_url, staged_url, filter_applied |
| Bid | id, listing_id, buyer_id, amount, financing_type, conditions[], closing_date, message, status, created_at |
| BuyerProfile | id, user_id, search_criteria, budget_max, preferred_locations[], lifestyle_preferences, mortgage_prequalified, prequalified_amount |
| Subscription | id, user_id, type (buyer_monthly/seller_pro), status, started_at, mollie_mandate_id |
| Viewing | id, listing_id, buyer_id, datetime, status, notes, rating, checklist_pdf_url |
| Deal | id, listing_id, seller_id, buyer_id, accepted_bid_id, status, closing_date, checklist_state |
| PartnerReferral | id, deal_id, partner_id, category (notary/appraiser/inspector/mortgage), status, commission_amount |
| SavedSearch | id, user_id, parameters, notification_pref, last_notified_at |

---

## 6. MVP Scope & Prioritization

### P0 — Must Have for Launch

All 8 seller screens and 6 buyer screens as described above, with core improvements: IDIN verification (S1), photo upload with thumbnails and filters (S2), inline edit for listings (S3), sticky savings banner (S4), benchmarked dashboard (S5), offer comparison matrix (S6), interactive closing checklist (S8), quick-filter chips (B1), property info on cards (B2), AI verdict (B3), downloadable viewing guide (B4), AI bid advisor (B5), buyer closing process (B6).

### P1 — Important for Growth

Explore Mode Pro features (S7), virtual staging (S2), map view for search (B2), post-viewing ratings (B4), overbidding intelligence (B3), WhatsApp notifications, partner marketplace with live booking.

### P2 — Post-MVP Enhancements

Digital signatures, full mortgage application flow, multi-language support, Vereniging Eigen Huis seal integration, Europe expansion localization, investor/landlord buyer profiles.

---

*EIGEN — Making homeownership simple, transparent, and fair.*

*Live Demo: https://aesthetic-vacherin-c6a898.netlify.app/*
