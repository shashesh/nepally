# Marketplace UX Redesign — Implementation Plan

**Plan Version:** v1
**Date:** 2026-04-05
**Owner:** Shashesh Silwal
**Status:** Planned
**Primary Spec/Wireframe:** User-provided design images (filter bar + featured card layout)

---

## 0) Plan Tracking Protocol (Required)

Use this plan as a live tracker during execution.

- Exactly one implementation step should be `In Progress` at a time.
- Update status immediately when work starts/finishes.
- If scope changes, add/update steps before coding.

### Step Status Legend
- `Not Started`
- `In Progress`
- `Completed`
- `Blocked`

### Live Step Tracker

| Step | Title | Owner | Status | Last Updated | Notes |
|------|-------|-------|--------|--------------|-------|
| 1 | DB migration: is_featured + trending_score + triggers | Shashesh | Not Started | 2026-04-05 | Migration 018 |
| 2 | Shared types + API: sort, featured, trending | Shashesh | Not Started | 2026-04-05 | `packages/shared` |
| 3 | Web: redesigned ListingCard | Shashesh | Not Started | 2026-04-05 | Image 2 card style |
| 4 | Web: FilterBar component | Shashesh | Not Started | 2026-04-05 | Image 1 filter style |
| 5 | Web: ListingStrip (horizontal scroll) | Shashesh | Not Started | 2026-04-05 | Featured/Recent/Trending |
| 6 | Web: index.page restructure | Shashesh | Not Started | 2026-04-05 | Home + filtered states |
| 7 | Web: [category].page restructure | Shashesh | Not Started | 2026-04-05 | FilterBar reuse |
| 8 | Mobile: redesigned ListingCard | Shashesh | Not Started | 2026-04-05 | RN parity |
| 9 | Mobile: FilterBar + horizontal strips | Shashesh | Not Started | 2026-04-05 | Native patterns |
| 10 | Mobile: MarketplaceHome + Category screens | Shashesh | Not Started | 2026-04-05 | Wire new components |
| 11 | Full test pass + lint + type-check | Shashesh | Not Started | 2026-04-05 | All workspaces |

---

## 1) Objective

Replace the current large search bar + category cards grid on the marketplace home page with a compact side-by-side filter bar (Category dropdown · Sort dropdown · Search input), and introduce Facebook-Marketplace-style horizontal scrollable discovery sections (Featured · Recently Added · Trending) above a default "All Listings" unified grid. Redesign `ListingCard` to use a taller card format with a gradient photo placeholder and a prominent "Contact Seller" CTA. Apply the new filter bar to the category page, and bring the mobile app to parity with native-appropriate patterns.

---

## 2) Scope and Non-Goals

### In Scope
- New DB migration `018_marketplace_featured_and_trending.sql` adding `is_featured` + `trending_score` + indexes + auto-featuring triggers for premium users.
- Shared API additions: `sortBy` param on `getListingsByMetro`, new `getFeaturedListings`, new `getTrendingListings`.
- Redesigned `ListingCard` (web + mobile) matching the user-provided design (gradient placeholder, "Starting at $X" price, ★ Verified Seller meta line, full-width Contact Seller CTA).
- New web components: `FilterBar`, `ListingStrip`.
- Restructured `apps/web/src/pages/marketplace/index.page.tsx` with URL-synced state.
- Restructured `apps/web/src/pages/marketplace/[category].page.tsx` with the same FilterBar (category locked).
- Mobile parity: updated `MarketplaceHomeScreen`, `MarketplaceCategoryScreen`, and mobile `ListingCard`.
- Full unit test coverage for every new/changed file.
- Scaffolding (column + comment + TODO) for **non-premium paid promote** feature — no UI yet.

### Out of Scope
- Admin UI for toggling `is_featured` manually (future).
- Paid-promote payment flow (future feature — scaffolded only).
- Tracking per-view timestamps / windowed trending (current impl uses all-time engagement score).
- Notification/email when a listing becomes featured (future).
- E2E test additions beyond the minimum for changed flows.

---

## 3) Preconditions / Findings

1. **`users.is_premium` column already exists** at [001_schema.sql:126](../../supabase/migrations/001_schema.sql#L126) and is typed in `packages/shared/src/types/user.ts:31`. Safe to join on.
2. **`marketplace_listings` has `views_count`, `saves_count`, `contacts_count`, `refreshed_at`** (all `INTEGER DEFAULT 0` except `refreshed_at`) at [014_marketplace.sql:61-62](../../supabase/migrations/014_marketplace.sql#L61). No existing featured flag.
3. **Latest migration is 017** — next new file must be `018_*.sql`.
4. **`MarketplaceListing` type uses snake_case** matching columns — new fields must follow (`is_featured`, `trending_score`).
5. **Shared API uses dependency injection** — all new functions must accept `SupabaseClient` as first parameter.
6. **Web uses Mantine 7** (see `@mantine/core` imports); `Select` component is available for the filter dropdowns.
7. **Mobile uses React Native + Expo 54** — no Mantine. Filter bar on mobile must use native pattern (bottom-sheet picker or inline segmented control).
8. **Existing `ListingCard` renders side-by-side** (photo left, content right). New design is stacked top-to-bottom (photo on top, CTA at bottom). Card dimensions and parent grid columns will change.
9. **Current `getListingsByMetro` only sorts by `refreshed_at DESC`**. Price sort requires numeric interpretation of the `price` column (currently `string | null`). Simple approach: sort rows alphabetically with `null` last for `asc`, naive lexicographic for MVP; see Step 2 for details.
10. **No existing `search` sub-route** — search goes to `/marketplace/search?q=…` per current code at `index.page.tsx:58`, but no `search.page.tsx` exists. Current `[category].page.tsx` handles `slug === 'search'` as a special case. New design subsumes this via URL params on the index page.

### Pre-Implementation Freshness Gate (Required)

- [ ] Confirm `docs/wireframes/` has no current marketplace wireframe; if present, verify alignment with design images provided in this session.
- [ ] Confirm `docs/features/` marketplace feature doc (if any) reflects the new UX.
- [ ] Confirm product-roadmap.md marketplace entry doesn't contradict this direction.
- [ ] If outdated/contradictory docs exist, update them before coding.

---

## 4) Architecture Rules (Must Pass)

- **Shared-first**: `sortBy` enum, `getFeaturedListings`, `getTrendingListings`, new fields on `MarketplaceListing` — all live in `packages/shared/src/**`.
- **No cross-platform imports**: `packages/shared` must not import `react-native`, `next`, `expo-*`, Mantine, etc.
- **Web styling**: every new `.tsx` uses CSS Modules; NEVER inline `style={{}}`.
- **Mobile styling**: every new `.tsx` uses `StyleSheet.create()` at the bottom of the file.
- **Migrations are additive only**: `ALTER TABLE`, `CREATE INDEX`, `CREATE TRIGGER`. Never `DROP`/`ALTER COLUMN TYPE`.
- **Snake_case**: all new DB columns and shared types.
- **Tests mandatory** per CLAUDE.md unit-testing policy — every new/changed file gets coverage.

---

## 5) Implementation Plan

> Preferred format per step: **Goal → Deliverables → File Changes → Tests → Exit Criteria**

### Step 1 — DB Migration: `is_featured` + `trending_score` + auto-feature triggers

**Goal**
- Add an `is_featured` boolean and a generated `trending_score` column on `marketplace_listings`, with auto-featuring behavior for premium users.

**Deliverables**
- New file `supabase/migrations/018_marketplace_featured_and_trending.sql`
- Trigger on `marketplace_listings` INSERT/UPDATE-of-`owner_id`: sets `is_featured = TRUE` when owner is premium.
- Trigger on `users` UPDATE-of-`is_premium`: cascades to all of that user's active listings (sets `is_featured = new.is_premium`).
- Backfill existing premium-owned listings to `is_featured = TRUE`.
- Partial indexes for efficient featured + trending queries.

**File Changes**
- `supabase/migrations/018_marketplace_featured_and_trending.sql` (new)

**SQL Outline**
```sql
-- 018_marketplace_featured_and_trending.sql
-- ADDITIVE: adds is_featured, trending_score, triggers, indexes.

-- 1. Featured flag
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Trending score as generated column
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS trending_score INTEGER
    GENERATED ALWAYS AS (views_count + saves_count * 3 + contacts_count * 5) STORED;

-- 3. Partial indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_featured
  ON marketplace_listings (refreshed_at DESC)
  WHERE status = 'active' AND is_featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_trending
  ON marketplace_listings (trending_score DESC, refreshed_at DESC)
  WHERE status = 'active';

-- 4. Auto-feature trigger: set is_featured when owner is premium
CREATE OR REPLACE FUNCTION set_is_featured_from_premium()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = NEW.owner_id AND is_premium = TRUE) THEN
    NEW.is_featured := TRUE;
  END IF;
  -- TODO: non-premium paid-promote flow will set is_featured via a
  -- separate RPC (promote_listing) + payment gate. For now, non-premium
  -- users' listings remain is_featured = FALSE unless manually updated.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listing_auto_feature
  BEFORE INSERT OR UPDATE OF owner_id ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION set_is_featured_from_premium();

-- 5. Cascade trigger: when users.is_premium flips, update their listings
CREATE OR REPLACE FUNCTION cascade_premium_to_listings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN
    UPDATE marketplace_listings
      SET is_featured = NEW.is_premium
      WHERE owner_id = NEW.id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_premium_cascade
  AFTER UPDATE OF is_premium ON users
  FOR EACH ROW
  EXECUTE FUNCTION cascade_premium_to_listings();

-- 6. Backfill existing premium-owned listings
UPDATE marketplace_listings
  SET is_featured = TRUE
  WHERE owner_id IN (SELECT id FROM users WHERE is_premium = TRUE)
    AND status = 'active'
    AND is_featured = FALSE;
```

**Tests / Validation**
- Apply migration to a Supabase branch (`mcp__plugin_supabase_supabase__apply_migration`).
- Manual SQL verification: insert a listing with a premium owner → confirm `is_featured = TRUE`. Flip `users.is_premium` → confirm cascade updates existing rows. Update `views_count` → confirm `trending_score` auto-recomputes.

**Exit Criteria**
- Migration applies clean on a branch DB with no errors.
- Backfill affects expected row count.
- Both triggers verified via manual SQL.

**Status Update Rule**
- Set this step to `In Progress` before coding.
- Set to `Completed` only after SQL validation passes.

---

### Step 2 — Shared Types + API (sort, featured, trending)

**Goal**
- Add `is_featured` + `trending_score` to `MarketplaceListing`, add `ListingSortBy` enum + `sortBy` filter param, add `getFeaturedListings` + `getTrendingListings` functions.

**Deliverables**
- `ListingSortBy` type: `'newest' | 'oldest' | 'featured' | 'price_asc' | 'price_desc'`.
- `ListingFilters.sortBy?: ListingSortBy`.
- Extended `getListingsByMetro` that branches `.order()` on `sortBy`.
- New `getFeaturedListings(supabase, metroId, { limit })` — filters `is_featured = TRUE`, orders `refreshed_at DESC`.
- New `getTrendingListings(supabase, metroId, { limit })` — orders `trending_score DESC, refreshed_at DESC`.
- `is_featured` + `trending_score` on `MarketplaceListing` type.
- Exports surfaced via `packages/shared/src/index.ts` / `api/index.ts` / `types/index.ts`.

**File Changes**
- `packages/shared/src/types/marketplace.ts` (modify — add fields + `ListingSortBy`)
- `packages/shared/src/api/marketplace.ts` (modify — extend `ListingFilters`, extend `getListingsByMetro`, add two new fns)
- `packages/shared/src/api/marketplace.test.ts` (modify — add test cases)
- `packages/shared/src/index.ts` / re-export files as needed

**Sort implementation notes**
- `newest` → `.order('refreshed_at', { ascending: false })` (current default)
- `oldest` → `.order('refreshed_at', { ascending: true })`
- `featured` → `.order('is_featured', { ascending: false }).order('refreshed_at', { ascending: false })` (featured first, then freshness)
- `price_asc` / `price_desc` → `price` column is `TEXT` / `string | null`. For MVP we sort by `price` text lexicographically with `nullsFirst: false` for desc and `nullsLast: true` for asc. Add a code comment noting this is a lexicographic sort and a future migration can convert `price` to `NUMERIC` or add a `price_cents` column. Include this in Risks section.

**Tests / Validation**
- Add unit tests covering each `sortBy` branch verifies the correct `.order()` mock call signature.
- Unit test `getFeaturedListings` verifies `.eq('is_featured', true)` and `.eq('status', 'active')`.
- Unit test `getTrendingListings` verifies `.order('trending_score', ...)`.
- `npm run test --workspace=@nepally/shared` passes.

**Exit Criteria**
- All new tests pass.
- Existing shared tests still pass.
- `type-check` in shared workspace clean.

**Status Update Rule**
- `In Progress` before writing code. `Completed` only when shared tests + type-check pass.

---

### Step 3 — Web: Redesigned `ListingCard`

**Goal**
- Rebuild the web `ListingCard` to match the provided design: stacked vertical layout, gradient photo placeholder, "Starting at $X" price, "★ Verified Seller · N views" meta line, full-width Contact Seller CTA.

**Deliverables**
- Rewritten `apps/web/src/components/marketplace/ListingCard.tsx`.
- New scoped CSS or additions to `marketplace.module.css` for: `.featuredCard`, `.cardImagePlaceholder` (gradient), `.cardTitle`, `.cardCategoryChip`, `.cardPrice`, `.cardMetaLine`, `.verifiedStar`, `.contactSellerBtn`.
- "Starting at $X" text only prefixes when price is set; falls back to hiding price row if null.
- Meta line: `★ Verified Seller · N views` if `owner.trust_level >= 1` else `· N views` (no star).
- "Contact Seller" button is a `<Link href="/marketplace/listing/[id]">` styled as the full-width blue gradient button.

**File Changes**
- `apps/web/src/components/marketplace/ListingCard.tsx` (modify)
- `apps/web/src/pages/marketplace/marketplace.module.css` (modify — add new card classes; keep the old ones briefly if needed for migration, then remove unused)
- `apps/web/src/components/marketplace/ListingCard.test.tsx` (modify)

**Tests / Validation**
- Test card renders verified star only when `trust_level >= 1`.
- Test card shows "Starting at $X" when price exists; hides the price row when null.
- Test card links to `/marketplace/listing/{id}`.
- Test category chip rendering and color theming (uses existing category color CSS vars).

**Exit Criteria**
- Card visually matches provided design at 2-col grid width.
- All card tests pass.

**Status Update Rule**
- `In Progress` before coding. `Completed` after tests pass.

---

### Step 4 — Web: `FilterBar` Component

**Goal**
- Build a compact side-by-side filter bar with Category Select · Sort Select · Search input. Reusable on index + category pages.

**Deliverables**
- `apps/web/src/components/marketplace/FilterBar.tsx`
  - Props: `categories`, `value: { category, sort, query }`, `onChange`, `lockedCategory?: string` (disables category select on category page).
  - Mantine `<Select>` for Category ("All Categories" default) and Sort ("Sort: Newest" default).
  - Controlled search input (inline, with search icon).
  - Debounced onChange for search (300 ms).
- `apps/web/src/components/marketplace/FilterBar.module.css` (new)
- Sort options render from `ListingSortBy` enum labels:
  - `newest` → "Sort: Newest"
  - `oldest` → "Sort: Oldest"
  - `featured` → "Sort: Featured"
  - `price_asc` → "Sort: Price ↑"
  - `price_desc` → "Sort: Price ↓"

**File Changes**
- `apps/web/src/components/marketplace/FilterBar.tsx` (new)
- `apps/web/src/components/marketplace/FilterBar.module.css` (new)
- `apps/web/src/components/marketplace/FilterBar.test.tsx` (new)

**Tests / Validation**
- Test renders with correct default values.
- Test `lockedCategory` disables the category Select.
- Test `onChange` fires for each dropdown selection.
- Test search input debounces (fake timers + `act`).

**Exit Criteria**
- Visually matches the image at the top of this conversation.
- All component tests pass.

**Status Update Rule**
- `In Progress` before coding. `Completed` after tests pass.

---

### Step 5 — Web: `ListingStrip` Component

**Goal**
- Horizontal-scrolling strip of listing cards with a section title, left/right chevron arrow buttons, and a terminal "Show All" card.

**Deliverables**
- `apps/web/src/components/marketplace/ListingStrip.tsx`
  - Props: `title`, `titleIcon` (emoji), `listings`, `showAllHref`, `maxItems` (default 10).
  - Renders up to `maxItems` cards + one "Show All →" card routing to `showAllHref`.
  - Scrollable via horizontal overflow; prev/next chevron buttons overlay on left/right, shown only when scroll is possible in that direction.
  - Snap to card on scroll for smoother UX.
- `apps/web/src/components/marketplace/ListingStrip.module.css` (new)

**File Changes**
- `apps/web/src/components/marketplace/ListingStrip.tsx` (new)
- `apps/web/src/components/marketplace/ListingStrip.module.css` (new)
- `apps/web/src/components/marketplace/ListingStrip.test.tsx` (new)

**Tests / Validation**
- Test renders up to `maxItems` cards.
- Test appends "Show All" card when `listings.length >= maxItems`.
- Test "Show All" card links to `showAllHref`.
- Test arrow buttons appear based on scroll position (mock `scrollLeft`, `scrollWidth`, `clientWidth`).
- Test empty state: strip is hidden when `listings.length === 0`.

**Exit Criteria**
- Strip scrolls smoothly with working arrow buttons.
- All strip tests pass.

**Status Update Rule**
- `In Progress` before coding. `Completed` after tests pass.

---

### Step 6 — Web: `index.page.tsx` Restructure

**Goal**
- Replace the hero search + category grid with `FilterBar` + three horizontal strips + unified "All Listings" grid. Sync state to URL query params. Hide strips when any filter is active.

**Deliverables**
- Rewritten `apps/web/src/pages/marketplace/index.page.tsx`.
- URL-synced state: `?category=…&sort=…&q=…&view=…`.
- `view` can be `featured` | `trending` (for "Show All" pages reusing the index).
- **Home state (no filter params)**: renders strips (Featured · Recently Added · Trending) using `getFeaturedListings` / `getListingsByMetro({sortBy:'newest'})` / `getTrendingListings`, then an "All Listings" unified grid (calls `getListingsByMetro` with default sort).
- **Filtered state (any of category, sort!=='newest', q, view set)**: hides strips, shows a single unified grid calling `getListingsByMetro` with combined filters.
- Fetching happens in `useEffect` keyed on URL params; debounced for `q`.

**File Changes**
- `apps/web/src/pages/marketplace/index.page.tsx` (rewrite)
- `apps/web/src/pages/marketplace/index.test.tsx` (rewrite)

**Tests / Validation**
- Test home state renders 3 strips + "All Listings" grid.
- Test filter state hides strips and renders only unified grid.
- Test URL params update when FilterBar `onChange` fires (uses `router.push` with shallow routing).
- Test "Show All" in Featured strip routes to `?view=featured`.
- Test `?view=featured` filters unified grid to featured only.
- Test `?view=trending` filters unified grid to trending (via `getTrendingListings`).

**Exit Criteria**
- Both states render correctly with mocked data.
- All page tests pass.

**Status Update Rule**
- `In Progress` before coding. `Completed` after tests pass.

---

### Step 7 — Web: `[category].page.tsx` Restructure

**Goal**
- Replace the local search input with `FilterBar` (category pre-selected + locked). Same sort + search functionality as index.

**Deliverables**
- Updated `apps/web/src/pages/marketplace/[category].page.tsx` using `FilterBar` with `lockedCategory={slug}`.
- Special handling for `slug === 'search'` retained: FilterBar has no locked category in search mode.
- URL params: `?sort=…&q=…` (no `category` since it's in the path).
- Uses redesigned `ListingCard` in a 2-col grid.

**File Changes**
- `apps/web/src/pages/marketplace/[category].page.tsx` (modify)
- `apps/web/src/pages/marketplace/[category].test.tsx` (modify)

**Tests / Validation**
- Test FilterBar receives `lockedCategory={slug}` for category paths.
- Test sort param flows into `getListingsByMetro`.
- Test search debounces and triggers re-fetch.

**Exit Criteria**
- Category page has the same filter bar UX as index.
- All tests pass.

**Status Update Rule**
- `In Progress` before coding. `Completed` after tests pass.

---

### Step 8 — Mobile: Redesigned `ListingCard`

**Goal**
- Bring mobile `ListingCard` to parity with the new web design (stacked vertical, gradient placeholder, Contact Seller CTA), using React Native primitives.

**Deliverables**
- Rewritten `apps/mobile/src/components/marketplace/ListingCard.tsx`.
- Uses `ImageBackground` or `LinearGradient` (from `expo-linear-gradient`, already in deps — verify) for the gradient placeholder.
- Contact Seller button navigates to `ListingDetail` screen.
- `StyleSheet.create()` at bottom of file.

**File Changes**
- `apps/mobile/src/components/marketplace/ListingCard.tsx` (rewrite)
- `apps/mobile/src/components/marketplace/ListingCard.test.tsx` (rewrite)

**Tests / Validation**
- Test verified star rendering.
- Test navigation on Contact Seller press.
- Test price row conditional rendering.

**Exit Criteria**
- Card matches the web card visual in native form.
- All tests pass.

**Status Update Rule**
- `In Progress` before coding. `Completed` after tests pass.

---

### Step 9 — Mobile: `FilterBar` + Horizontal Strips

**Goal**
- Build mobile equivalents: a filter bar using a bottom-sheet picker (or inline segmented control), and horizontal scrollable strips using `FlatList horizontal`.

**Deliverables**
- `apps/mobile/src/components/marketplace/FilterBar.tsx`
  - Pressable chips that open a bottom-sheet picker (use `@gorhom/bottom-sheet` if available, else a modal).
  - Search input (native `TextInput`).
- `apps/mobile/src/components/marketplace/ListingStrip.tsx`
  - `FlatList horizontal` with `snapToInterval` matching card width.
  - Section title + "Show All" terminal item.
- Corresponding `.test.tsx` for each.

**File Changes**
- `apps/mobile/src/components/marketplace/FilterBar.tsx` (new)
- `apps/mobile/src/components/marketplace/FilterBar.test.tsx` (new)
- `apps/mobile/src/components/marketplace/ListingStrip.tsx` (new)
- `apps/mobile/src/components/marketplace/ListingStrip.test.tsx` (new)

**Tests / Validation**
- Test picker open/select flow.
- Test strip rendering + Show All navigation.
- Test search input onChange.

**Exit Criteria**
- Filter bar + strips behave equivalently to web on iOS + Android preview.
- All tests pass.

**Status Update Rule**
- `In Progress` before coding. `Completed` after tests pass.

---

### Step 10 — Mobile: `MarketplaceHomeScreen` + `MarketplaceCategoryScreen`

**Goal**
- Wire the new FilterBar + strips + unified list into mobile screens. Match web behavior: strips in home state, flat list when filtered.

**Deliverables**
- Updated `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.tsx`
  - Renders FilterBar + 3 strips + unified list.
  - Hides strips when any filter is active.
- Updated `apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.tsx`
  - Renders FilterBar (category locked) + unified list.

**File Changes**
- `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.tsx` (rewrite)
- `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.test.tsx` (rewrite)
- `apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.tsx` (modify)
- `apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.test.tsx` (modify)

**Tests / Validation**
- Screen-level tests verify state transitions (home → filtered → back to home).
- Verify navigation targets for Show All cards.

**Exit Criteria**
- Mobile parity with web home + category pages.
- All screen tests pass.

**Status Update Rule**
- `In Progress` before coding. `Completed` after tests pass.

---

### Step 11 — Full Test Pass + Lint + Type-Check

**Goal**
- Verify the whole PR is green across every workspace before opening the PR.

**Deliverables**
- Shared workspace tests green.
- Web workspace tests green.
- Mobile workspace tests green.
- Monorepo root `npm run test` green.
- `npm run lint` and `npm run type-check` clean.

**File Changes**
- None (validation only).

**Tests / Validation**
```bash
npm run test --workspace=@nepally/shared
npm run test --workspace=@nepally/web
npm run test --workspace=@nepally/mobile
npm run lint
npm run type-check
npm run test
```

**Exit Criteria**
- All commands exit 0.
- No snapshot drifts left unreviewed.

**Status Update Rule**
- `In Progress` during validation. `Completed` when all gates pass.

---

## 6) Testing Strategy (Required)

### Change Classification
- **New functionality:** migration, shared API functions, new components — add new unit tests in same change.
- **Updated functionality:** `ListingCard` redesign, index.page restructure, [category].page restructure, mobile screen updates — update existing tests.
- **Cross-surface user flow change:** marketplace browse/filter flow spans home → strip → "Show All" → filtered grid. Consider an e2e smoke test if `apps/web/e2e/` has a marketplace suite; otherwise note as a follow-up.

### Test Plan Matrix

| Area | Change Type | Required Tests | File Targets |
|------|-------------|----------------|--------------|
| DB migration | New | Manual SQL validation on branch DB | `supabase/migrations/018_marketplace_featured_and_trending.sql` |
| Shared types | New/update | Unit tests for type-level assertions where relevant | `packages/shared/src/types/marketplace.ts` (no direct tests, consumed by API tests) |
| Shared API | New/update | Unit (must add) | `packages/shared/src/api/marketplace.test.ts` |
| Web `ListingCard` | Update | Unit (must update) | `apps/web/src/components/marketplace/ListingCard.test.tsx` |
| Web `FilterBar` | New | Unit | `apps/web/src/components/marketplace/FilterBar.test.tsx` |
| Web `ListingStrip` | New | Unit | `apps/web/src/components/marketplace/ListingStrip.test.tsx` |
| Web `index.page` | Update | Unit (page-level) | `apps/web/src/pages/marketplace/index.test.tsx` |
| Web `[category].page` | Update | Unit (page-level) | `apps/web/src/pages/marketplace/[category].test.tsx` |
| Mobile `ListingCard` | Update | Unit | `apps/mobile/src/components/marketplace/ListingCard.test.tsx` |
| Mobile `FilterBar` | New | Unit | `apps/mobile/src/components/marketplace/FilterBar.test.tsx` |
| Mobile `ListingStrip` | New | Unit | `apps/mobile/src/components/marketplace/ListingStrip.test.tsx` |
| Mobile screens | Update | Unit | `apps/mobile/src/screens/marketplace/*.test.tsx` |

### Coverage and Quality Gates
- [ ] New logic paths have unit tests
- [ ] Modified logic paths have updated tests
- [ ] E2E coverage added/updated for changed critical flow (or documented as follow-up)
- [ ] No failing tests in touched workspaces

---

## 7) Data Contract Snapshot

### `marketplace_listings` new columns
- `is_featured`: `BOOLEAN NOT NULL DEFAULT FALSE` — true for premium-owned listings (auto via trigger) or paid-promoted listings (future).
- `trending_score`: `INTEGER GENERATED ALWAYS AS (views_count + saves_count * 3 + contacts_count * 5) STORED` — derived engagement ranking.

### `MarketplaceListing` (TypeScript) new fields
- `is_featured: boolean`
- `trending_score: number`

### New TypeScript types
- `ListingSortBy = 'newest' | 'oldest' | 'featured' | 'price_asc' | 'price_desc'`

### Updated `ListingFilters`
- `sortBy?: ListingSortBy` (default `'newest'`)

### New API function signatures
- `getFeaturedListings(supabase: SupabaseClient, metroId: string, opts?: { limit?: number; offset?: number }): Promise<ListingsResult>`
- `getTrendingListings(supabase: SupabaseClient, metroId: string, opts?: { limit?: number; offset?: number }): Promise<ListingsResult>`

---

## 8) File Checklist

### New Files
- `supabase/migrations/018_marketplace_featured_and_trending.sql`
- `apps/web/src/components/marketplace/FilterBar.tsx`
- `apps/web/src/components/marketplace/FilterBar.module.css`
- `apps/web/src/components/marketplace/FilterBar.test.tsx`
- `apps/web/src/components/marketplace/ListingStrip.tsx`
- `apps/web/src/components/marketplace/ListingStrip.module.css`
- `apps/web/src/components/marketplace/ListingStrip.test.tsx`
- `apps/mobile/src/components/marketplace/FilterBar.tsx`
- `apps/mobile/src/components/marketplace/FilterBar.test.tsx`
- `apps/mobile/src/components/marketplace/ListingStrip.tsx`
- `apps/mobile/src/components/marketplace/ListingStrip.test.tsx`

### Modified Files
- `packages/shared/src/types/marketplace.ts`
- `packages/shared/src/api/marketplace.ts`
- `packages/shared/src/api/marketplace.test.ts`
- `packages/shared/src/index.ts` (re-exports if needed)
- `apps/web/src/components/marketplace/ListingCard.tsx`
- `apps/web/src/components/marketplace/ListingCard.test.tsx`
- `apps/web/src/pages/marketplace/marketplace.module.css`
- `apps/web/src/pages/marketplace/index.page.tsx`
- `apps/web/src/pages/marketplace/index.test.tsx`
- `apps/web/src/pages/marketplace/[category].page.tsx`
- `apps/web/src/pages/marketplace/[category].test.tsx`
- `apps/mobile/src/components/marketplace/ListingCard.tsx`
- `apps/mobile/src/components/marketplace/ListingCard.test.tsx`
- `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.tsx`
- `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.test.tsx`
- `apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.tsx`
- `apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.test.tsx`

**Total:** 11 new + 17 modified = **28 files**

---

## 9) Verification Matrix (Definition of Done)

### Automated
- [ ] `npm run test --workspace=@nepally/shared`
- [ ] `npm run test --workspace=@nepally/web`
- [ ] `npm run test --workspace=@nepally/mobile`
- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run test` (monorepo root)

### Manual
- [ ] Home state on desktop: filter bar + 3 strips (each with arrows + Show All) + "All Listings" grid.
- [ ] Home state on mobile web: strips scroll horizontally via touch; arrows hidden on touch devices (or retained — decide during Step 5).
- [ ] Apply a category filter → strips hide, grid updates, URL reflects `?category=…`.
- [ ] Apply sort → grid reorders, URL reflects `?sort=…`.
- [ ] Type into search → debounced fetch; URL reflects `?q=…`.
- [ ] Click "Show All" on Featured strip → lands on `/marketplace?view=featured` with only featured listings.
- [ ] Click "Show All" on Trending strip → lands on `/marketplace?view=trending`.
- [ ] Open `/marketplace/[category]` → FilterBar has category pre-selected + locked.
- [ ] Click "Contact Seller" → lands on listing detail page.
- [ ] Verified sellers (`trust_level >= 1`) show the green star in meta line.
- [ ] Premium user creates new listing via Create flow → DB shows `is_featured = TRUE`, appears in Featured strip.
- [ ] Flip a user's `is_premium = FALSE` in DB → their active listings flip to `is_featured = FALSE`.
- [ ] Mobile app: filter bar opens bottom-sheet picker; selecting updates list.

### Plan Hygiene
- [ ] Live step tracker statuses are fully up to date
- [ ] Any blocked step has explicit blocker + next action

---

## 10) Risks + Mitigations

- **Risk:** Price sort is lexicographic since `price` is a `TEXT` column (e.g., "$1000" sorts before "$20").
  - **Mitigation:** Add a code comment flagging this. Follow-up plan: migration `019_*.sql` to add `price_cents INTEGER` generated from parsing `price`, sort on that. Document in Open Questions. For MVP, price sort is best-effort.

- **Risk:** Cascade trigger on `users.is_premium` fires for every user update, even if `is_premium` didn't change.
  - **Mitigation:** Trigger uses `UPDATE OF is_premium` clause and `IS DISTINCT FROM` guard — only fires on actual change. Tested in Step 1.

- **Risk:** Horizontal scroll strips perform poorly if Show All Featured returns 1000s of listings on a long tail — users click Show All and get a huge unpaginated response.
  - **Mitigation:** Strips fetch `limit: 10`. The "Show All" unified grid uses the existing `getListingsByMetro` with `limit: 20` and offset pagination. Add "Load more" or infinite scroll as a follow-up if needed.

- **Risk:** Mobile bottom-sheet dependency (`@gorhom/bottom-sheet`) may not be installed.
  - **Mitigation:** Check `apps/mobile/package.json` during Step 9. If not present, fall back to native `Modal` with a `FlatList` picker.

- **Risk:** The existing `[category].page.tsx` handles `slug === 'search'` as a special case; the new URL-param model on index may conflict if both implementations coexist.
  - **Mitigation:** During Step 6 + 7, decide whether to keep `/marketplace/search?q=…` route for backward-compat or redirect it to `/marketplace?q=…`. Redirect is cleaner — plan to redirect.

- **Risk:** Generated column `trending_score` requires Postgres 12+. Supabase uses Postgres 15+, safe.
  - **Mitigation:** None required. Confirm Supabase project version during Step 1.

- **Risk:** Auto-feature trigger on `marketplace_listings` runs on every update that touches `owner_id`, which is rare. But if the trigger should also re-evaluate when a listing is reactivated (`status: inactive → active`), that isn't covered.
  - **Mitigation:** Per current design, `is_featured` is sticky once set. Reactivation preserves the flag. Add note in migration.

- **Risk:** Redesigned `ListingCard` makes cards taller; existing pages (my-listings, saved, listing-detail) may look off with the new card size.
  - **Mitigation:** Audit each page that renders `ListingCard` during implementation. Current usages: `index.page.tsx`, `[category].page.tsx`, possibly `my-listings.page.tsx`, `saved`. Adjust grid columns accordingly (likely 3-col on desktop, 2-col on tablet, 1-col on mobile web).

---

## 11) Operational Readiness (Suggested)

- [ ] **Rollback plan (DB):** To roll back migration 018, write migration 019 that drops the triggers, drops the indexes, drops `trending_score`, and sets `is_featured = FALSE` on all rows. Do NOT drop `is_featured` (keeping the column preserves data if re-rolled forward). Document explicitly in migration comments.
- [ ] **Rollback plan (UI):** Revert the PR. No client state migration needed — URL params are additive.
- [ ] **Feature flag strategy:** Not using a feature flag. PR is atomic. If needed, a `NEXT_PUBLIC_MARKETPLACE_REDESIGN=true` env var could gate `index.page.tsx` during staged rollout.
- [ ] **Monitoring/alerts:** No new monitoring. Existing Supabase logs capture slow queries if `trending_score` index isn't used.
- [ ] **Performance:** Trending sort on `trending_score` index should be O(log n). Featured queries use partial index. Verify with `EXPLAIN ANALYZE` on a seeded DB if listing count > 10k.
- [ ] **Security/privacy:** `is_featured` is public (visible to all users). `trending_score` is public (derived from already-public counters). No new PII exposure. RLS policies already cover `marketplace_listings` — verify policies still allow SELECT of new columns (they should, since RLS applies to rows not columns).

---

## 12) Open Questions

- Should "Featured" strip respect category when category filter is applied? Current plan: **strips hide when any filter is active**, so this doesn't arise. Reconfirm if strips-per-category is desired later.
- Lexicographic price sort is a known limitation (see Risks). Open a follow-up migration to add `price_cents`?
- Should "Show All" for "Recently Added" land on `/marketplace?sort=newest` or just clear other filters? Currently: `?sort=newest` explicit param; strips hidden.
- Should the Trending strip rotate daily to surface new content, or is static all-time `trending_score` acceptable for MVP? Current: all-time static.
- Mobile bottom-sheet vs native `Picker` vs `ActionSheet` — decide during Step 9.

---

## 13) Handoff Commands

```bash
npm install
npm run test --workspace=@nepally/shared
npm run test --workspace=@nepally/web
npm run test --workspace=@nepally/mobile
npm run lint
npm run type-check
npm run test
```
