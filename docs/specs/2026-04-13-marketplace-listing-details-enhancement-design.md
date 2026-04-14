# Marketplace Listing Details Enhancement — Design Spec

**Date:** 2026-04-13
**Status:** Approved for planning
**Branch:** `feat/marketplace-listing-details-enhancementclearclerart`
**Wireframe reference:** `wireframe/1304-marketplace-listing-details/` — Option 2 "Split View"

## Goal

Enhance the marketplace listing detail page on web and mobile to match the Split View wireframe: a two-column layout on desktop with a sticky sidebar price/CTA card, quick highlights chips, breadcrumb navigation, and a mobile sticky bottom CTA bar.

No database schema changes. No new API surface. All new UI derives from existing `marketplace_listings` fields.

## Scope

**In:**
- Breadcrumb navigation (Marketplace › Category › Title)
- Quick highlights strip (chips, per-listing-type content)
- Two-column split layout on web with sticky sidebar
- Inline price card on mobile
- Sticky bottom CTA bar on mobile with Contact Seller
- Header Save icon button on mobile
- Shared pure helpers for "open now" detection and highlight chip derivation

**Out:**
- Similar listings rail
- Static map / location block (requires geocoding + maps provider)
- New data fields (service types, payment methods, lat/long)
- Seller's "3 other listings" count
- Listing ID display in meta row
- E2E tests (deferred)

## Platforms

- **Web:** `apps/web/src/pages/marketplace/listing/[id].page.tsx` + `apps/web/src/pages/marketplace/marketplace.module.css`
- **Mobile:** `apps/mobile/src/screens/marketplace/ListingDetailScreen.tsx`
- **Shared:** `packages/shared/src/logic/marketplace/`

## Architecture

### Shared Helpers (new)

Location: `packages/shared/src/logic/marketplace/`

```typescript
// isBusinessOpenNow.ts
export interface OpenStatus {
  isOpen: boolean;
  nextChangeLabel?: string; // e.g. "Closes 9p" or "Opens 8a"
}

export function isBusinessOpenNow(
  businessHours: BusinessHours | null | undefined,
  now: Date
): OpenStatus;
```

```typescript
// getListingHighlights.ts
export interface HighlightChip {
  key: string;
  icon: string; // emoji or icon identifier
  label: string;
  value: string;
}

export function getListingHighlights(
  listing: MarketplaceListing,
  now: Date
): HighlightChip[];
```

Rules:
- Pure functions, no I/O, no React, no RN imports.
- `now: Date` injected for deterministic tests.
- Timezone: uses local machine time (same behavior as today's hours display).

### Highlight Chip Content by Listing Type

`ListingType = 'business' | 'individual'` (only two types in the schema).

| Listing Type | Chip 1               | Chip 2                | Chip 3                 |
|--------------|----------------------|-----------------------|------------------------|
| business     | Open now / Closed    | Address (short)       | Phone                  |
| individual   | Condition (New/Used) | Category name         | Posted Xd ago          |

Chips are omitted when the source field is missing. Order is stable. When a chip's source field is null, the chip is skipped (no placeholder).

### Web Layout — Split View

Responsive grid in the main container:

- Desktop (≥ 960px): `grid-template-columns: minmax(0, 1fr) 320px; gap: 32px;`
- Below 960px: single column, sidebar collapses to an inline price card rendered **above** the About section.

Page structure:

```
Breadcrumb
TwoColumnGrid
├── MainColumn
│   ├── PhotoGallery
│   ├── TitleBlock (h1 + badges)
│   ├── HighlightsStrip
│   ├── AboutSection (description)
│   ├── BusinessDetailsSection (business listings only)
│   ├── HoursSection (business listings only, extracted)
│   ├── OwnerSection
│   └── StatsRow (views · saves · posted)
└── Sidebar (sticky, top: 80px)
    ├── PriceBlock
    ├── Contact Seller (primary)
    └── Save listing (outline)
```

- Sticky sidebar uses `position: sticky; top: 80px;` with `align-self: start;` on the grid item.
- Category theme class remains on outer container.
- Owner view: sidebar shows **Edit Listing** + **Promote** instead of Contact/Save.
- All styles live in `marketplace.module.css` (CSS Modules). No inline styles.

### Mobile Layout

```
SafeAreaView
├── Header
│   ├── BackButton
│   ├── HeaderTitle "Listing"
│   └── SaveIconButton (bookmark toggle)   // Edit icon for owner
├── ScrollView (paddingBottom: 88)
│   ├── PhotoGallery
│   ├── Breadcrumb (compact)
│   ├── TitleBlock (h1 + badges)
│   ├── InlinePriceCard (price label only)
│   ├── HighlightsStrip (horizontal scroll chips)
│   ├── AboutSection
│   ├── BusinessDetailsSection
│   ├── HoursSection
│   ├── OwnerSection
│   └── StatsRow
└── StickyBottomBar (absolute, bottom: 0)
    ├── PriceColumn
    └── Contact Seller (primary, flex)
```

- Sticky bar: `position: 'absolute'`, full width, elevation + shadow, safe-area bottom inset. Height ~72px.
- Highlights strip: horizontal `ScrollView`, 8px chip gap, no wrap.
- Owner view: sticky bar hidden; header shows Edit icon; Edit/Promote buttons inline in the owner section.
- All styles in `StyleSheet.create()` at file bottom. No inline style objects.

## Data Flow

No change to fetching. `getListingById` remains the single source. New UI is derived at render time:

1. `useEffect` loads listing + saved state (existing).
2. Render computes `highlights = getListingHighlights(listing, new Date())` on each render.
3. `isBusinessOpenNow` is invoked inside `getListingHighlights` for business listings.

No memoization needed — the helpers are cheap and run once per render.

## Error Handling

- Missing `business_hours` → no "Open now" chip (silent omission).
- Missing `price` → sidebar price block hidden; mobile sticky bar left column shrinks; Contact button takes full width.
- Missing `address` / `phone` / `website_url` → chip omitted.
- Helpers handle `null` and `undefined` inputs without throwing.

## Testing Plan

### Shared unit tests

- `packages/shared/src/logic/marketplace/isBusinessOpenNow.test.ts`
  - Table-driven: before open, during hours, after close, missing day, day with single entry, empty `business_hours` object, `null` input.
  - Asserts `isOpen` and `nextChangeLabel` shape.

- `packages/shared/src/logic/marketplace/getListingHighlights.test.ts`
  - One case per listing_type (business, item, service).
  - Asserts chip count, order, and key set.
  - Tests field omission (missing phone → no phone chip).

### Web component tests

Extend `apps/web/src/pages/marketplace/listing/[id].test.tsx`:
- Renders breadcrumb with category name.
- Renders highlights chips for business listing (Open now chip present).
- Sidebar renders price, Contact, Save for non-owner.
- Sidebar renders Edit + Promote for owner.
- Asserts sidebar element has the sticky class.

### Mobile component tests

Extend `apps/mobile/src/screens/marketplace/ListingDetailScreen.test.tsx`:
- Renders breadcrumb, highlights strip, inline price card, sticky bottom bar.
- Sticky bottom bar hidden when user is owner.
- Header Save icon toggles saved state on press.
- Uses `render()` + `await waitFor()` exclusively (no `act()` — per `apps/mobile/CLAUDE.md` rule for async-useEffect components; `act()` hangs on CI runners).

### Manual verification

- Web: resize to 1440 / 1024 / 960 / 768 / 480; verify grid collapse, sticky behavior, no horizontal scroll.
- Mobile: scroll to bottom; sticky bar stays above safe-area; Save icon reflects state; owner view hides sticky bar.

## Non-goals / Deferred

- Geocoded map preview (requires provider choice + API key rotation policy).
- "Similar listings" rail (separate query + scoring logic).
- Service types / payment methods fields (requires DB migration + seller UI).
- Owner's other-listings count.
- Scroll-triggered sticky bar (we chose always-visible).

## Open Questions

None at spec time. All trade-offs were resolved during brainstorming.

## References

- Wireframe: `wireframe/1304-marketplace-listing-details/index.html` (Option 2 — Split View, recommended)
- Current web page: `apps/web/src/pages/marketplace/listing/[id].page.tsx`
- Current mobile screen: `apps/mobile/src/screens/marketplace/ListingDetailScreen.tsx`
- Shared package conventions: `docs/guides/code-sharing.md`
