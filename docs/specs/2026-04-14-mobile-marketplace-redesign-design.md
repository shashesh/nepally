# Mobile Marketplace Redesign — Design

**Date:** 2026-04-14
**Surface:** `apps/mobile` — marketplace tab
**Author:** brainstormed with Claude (brainstorming + frontend-design skills)
**Status:** Draft — awaiting user review

---

## 1. Problem

The current mobile marketplace home screen has three structural UX problems and several smaller ones.

**User-reported:**
1. Listing cards are too tall (~320px). Users see only 1–2 per screen and cannot scan.
2. The stacked sections (Sponsored → Featured → Recently Added → Trending → All Listings) are not intuitive. Users scroll through 3+ screens of redundant horizontal strips before reaching the main grid.
3. The top-right icon opens `MyListingsScreen` directly. It should be a menu with more marketplace options.

**Additional issues found in the code** (`MarketplaceHomeScreen.tsx`, `ListingCard.tsx`, `ListingStrip.tsx`):
4. Every browse card contains a full-width "Contact Seller" button, which belongs on the detail screen and alone adds ~45px per card.
5. Trending's "View All" silently falls back to `newest` sort — a workaround for the fact that "Trending" is not a real sort option ([`MarketplaceHomeScreen.tsx:246`](../../apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.tsx#L246)).
6. The same oversized card is used in both horizontal strips and the vertical grid — horizontal strips should use a denser variant.
7. No visible search bar. Discovery is buried inside `FilterBar`.
8. No visible category entry point. New users cannot tell at a glance what the marketplace is for.
9. No save/bookmark action on cards, no freshness signal ("2h ago"), no location context.
10. Loading state is a full-screen spinner rather than skeleton cards.
11. Empty state is minimal (`storefront-outline` icon + one line of text).

## 2. Goals

- Fit ≥ 4 browse cards per screen on a 6.1" device (currently 1–2).
- Collapse the four redundant horizontal strips into a single scannable structure.
- Replace the direct `MyListings` jump with a marketplace hub menu.
- Give the marketplace a distinctive visual identity ("Warm Community") so it feels designed, not templated.
- Ship all of the above in a way that compiles against the existing shared API without schema changes (Near-tab excepted — see §8 risks).

## 3. Non-Goals

- Web app redesign. Recent commits show web already has a split-view refresh; leave it alone.
- Redesign of `MarketplaceCategoryScreen`, `ListingDetailScreen`, `CreateListingScreen`, `PromoteListingScreen`, `MyListingsScreen`. Follow-up work.
- Personalization logic for "For You" tab. v1 uses newest-in-metro as the placeholder ranking.
- Saved/favorites backend if the `saved_listings` table does not yet exist. To be confirmed in the plan phase; if absent, the heart icon and "Saved" menu row are deferred.
- New custom illustrations or icon packs. Emoji fallbacks are acceptable for v1.
- "Near" tab backend (distance-sorted query). Deferred to a follow-up unless location infra is already in place.

## 4. Visual Direction — Warm Community

Utility-dense bones with Nepali-diaspora personality. The design commits to one direction (per `frontend-design` skill) rather than blending safe defaults.

### 4.1 Design tokens (new or updated)

Added under `apps/mobile/src/styles/` as extensions to existing `colors`, `spacing`, and `typography` modules. No replacement of existing tokens — only additions.

| Token | Value | Purpose |
|---|---|---|
| `surface.canvas` | `#FBF7F1` (warm off-white) | screen background, replaces cold `#FFFFFF` on marketplace only |
| `surface.card` | `#FFFFFF` | card surface, pops against canvas |
| `accent.warm` | `#C8451C` (terracotta) | price, filled save heart, active tab underline |
| `border.hairline` | `rgba(20,14,8,0.08)` | quieter than current `colors.border` |
| `radius.card` | `14` | gentler than current, not bubbly |
| `radius.tile` | `10` | category tiles |
| `shadow.card` | elevation 2 / iOS `{ shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }` | layered depth instead of flat |

Existing `colors.primary.main` remains the primary interactive color and is unchanged. `accent.warm` is a supplementary accent used only for price, save state, and the active tab underline — applied selectively, not decoratively.

### 4.2 Typography

Reuse existing `typography.*` variants. Introduce one new variant, `typography.displaySm`, used only for tab labels and section headers: same family as `h3`, tighter letter-spacing (`-0.2`), slightly larger weight (700). Body/caption faces unchanged.

### 4.3 Memorable moment

The skeleton → content reveal. Skeleton cards cross-fade out; real cards fade in with a 40ms stagger row-by-row. This is the only non-decorative motion in the redesign — it reinforces that the grid is loading in reading order rather than appearing as one block.

## 5. Screen Structure

```
┌─────────────────────────────────────┐
│  Marketplace           [♡]  [☰]     │  Header: title · Saved heart · Menu
├─────────────────────────────────────┤
│  [🔍 Search listings…          ]    │  Persistent search input
├─────────────────────────────────────┤
│  [🏠][💼][🚗][📦][🛋][🎓][👶][…]  │  Horizontal category tile row
├─────────────────────────────────────┤
│  For You · Featured · Recent        │  Tab strip — drives grid sort (Near deferred)
├─────────────────────────────────────┤
│  ┌─────┐  ┌─────┐                   │
│  │card │  │card │                   │
│  └─────┘  └─────┘                   │  2-column editorial grid
│  ┌─────┐  ┌─────┐                   │
│  │card │  │card │                   │
│  └─────┘  └─────┘                   │
│                         [+]         │  FAB unchanged
└─────────────────────────────────────┘
```

### 5.1 Header

- Title: "Marketplace" (unchanged).
- Saved heart icon (top-right, leftmost of the pair): direct tap → `SavedListingsScreen` (new) if the Saved feature is in scope; otherwise this icon is deferred.
- Menu icon: changes from `list-outline` to `menu-outline`. Tap → `MarketplaceMenuSheet` (bottom sheet).

### 5.2 Search bar

- Always visible below header, above the category row. Not collapsible.
- Single rounded text input, 300ms debounced, drives the grid query via existing `getListingsByMetro({ searchQuery })`.
- Clear button appears when input non-empty. Clearing does not change category or tab.
- Searching narrows within the current tab — tabs and category row stay visible.

### 5.3 Category tile row

- Horizontal `FlatList`, tile = 64×64 rounded-square (`radius.tile`), category emoji centered, label below (12px).
- Tap → sets `filters.category` in the existing filter state. The tapped tile gets a 2px ring in `accent.warm`.
- Second tap on the same tile clears the category filter.
- Source: existing `getCategories(supabase)` from `@nepally/shared`.
- Row remains visible in all tabs and while searching.

### 5.4 Tab strip

The four horizontal strips in today's home collapse into a tab strip that drives the sort mode of a single grid. Three tabs ship in v1; "Near" is deferred (see §8 risk 1).

| Tab | Sort / source | Notes |
|---|---|---|
| **For You** | `sort: newest` in user's metro | Placeholder for future personalization. Reserving the name now avoids renaming a tab later. |
| **Featured** | `getFeaturedListings(metroId)` | Existing API, unchanged. |
| **Recent** | `sort: newest` | Same data as For You for v1; becomes distinct once For You has a real ranking. |
| ~~Near~~ | `sort: distance` | **Deferred.** See §8 risk 1. |

Active tab: underlined in `accent.warm`, label in `displaySm` weight 700. Inactive tabs in `text.secondary`.

Switching tabs triggers a skeleton state while the new query loads. No cross-tab animation beyond the skeleton fade.

The Trending "View All" fallback bug disappears because Trending no longer exists as a separate strip — each tab IS its own sort.

### 5.5 Grid

- 2-column `FlatList`, `numColumns={2}`, 12px gap.
- Each card is a `ListingGridCard` (see §6).
- Sponsored listings are sprinkled into the grid every 8th item via a pure `injectSponsoredIntoGrid` helper in shared. A sponsored card shows a small `📢 Sponsored` badge in the top-left image corner. It occupies a normal grid cell — no dedicated strip.
- Infinite scroll via existing `loadMoreListings` pagination pattern. `onEndReachedThreshold={0.5}` preserved.

## 6. Card Redesign

The current single `ListingCard` component is replaced at the call sites by two new components. The old component is kept temporarily because `MarketplaceCategoryScreen` and other screens still consume it; migration of those screens is out of scope.

### 6.1 `ListingGridCard` (new — primary)

```
┌──────────────────┐
│                  │   4:5 aspect ratio image
│     [photo]      │   top-right: ♡ save button (44×44 hit area)
│               ♡  │   bottom-left: 6px category color dot
│                  │   top-left (only if sponsored): 📢 badge
├──────────────────┤
│ $450 ✓           │   price 17px bold accent.warm · tiny ✓ if verified seller
│ Room near LIRR…  │   title 14px semibold, max 2 lines
│ 📍 Queens · 2h   │   location · freshness, 12px text.tertiary
└──────────────────┘
```

**Removed from today's card:** "Contact Seller" button, large category chip, "Starting at" phrasing, `views_count` row, "Verified Seller ★" text row.

**Added:** save heart, freshness (`formatListingFreshness`), location text, sponsored badge (conditional).

Card height target ≈ 240px (was ~320px). On a 6.1" device this yields ~4 visible cards per screen; on taller phones ~6.

### 6.2 `ListingStripCard` (new — compact variant)

Horizontal layout: 72×72 thumbnail + title/price/meta stacked on the right. Used wherever we need a dense list: bottom-sheet "Saved" preview, recent search history, etc. Not used on the home grid.

### 6.3 Old `ListingCard`

Stays in place for now. A follow-up task will rename it and migrate or delete it when `MarketplaceCategoryScreen` is redesigned. This redesign does not touch that screen.

## 7. Marketplace Menu (Bottom Sheet)

Triggered by the `menu-outline` icon in the header. Implementation uses React Native's `Modal` with a slide animation — no new dependency.

```
┌─────────────────────────┐
│        ─────            │  drag handle
│                         │
│  🏷️   My Listings    ›  │
│  ❤️   Saved          ›  │
│  ⭐   Promote a Listing │
│  🗂️   Browse Categories │
│  📍   Change Location   │
│  📖   Marketplace Rules │
│                         │
└─────────────────────────┘
```

| Row | Destination | Exists? |
|---|---|---|
| My Listings | `MyListingsScreen` | Yes |
| Saved | `SavedListingsScreen` | **Depends on `saved_listings` table — see §8 risk 4.** If deferred, row is hidden. |
| Promote a Listing | `PromoteListingScreen` | Yes |
| Browse Categories | `BrowseCategoriesScreen` | **New, stub OK.** Renders all categories as a full tile grid; tapping a category sets filter and closes sheet. |
| Change Location | existing metro picker flow | Reuse the onboarding metro picker. |
| Marketplace Rules | `MarketplaceRulesScreen` | **New, stub OK.** Static markdown-driven content for v1. |

Saved is intentionally duplicated between the header heart icon and the menu. Header is the quick action; menu is the discovery/marketplace hub.

## 8. Code Architecture

Follows the mandatory **Shared-First** rule in `CLAUDE.md`. Business logic and pure functions go to `packages/shared`; UI stays in `apps/mobile`.

### 8.1 Shared additions (`packages/shared/src/`)

- `logic/marketplace/freshness.ts` → `formatListingFreshness(createdAt: string): string` — returns "2h", "3d", "1w", etc. Pure function, unit tested with fake dates.
- `logic/marketplace/sponsoredInjection.ts` → `injectSponsoredIntoGrid(listings, sponsored, interval = 8): MarketplaceListing[]`. Pure, deterministic, unit tested.
- Types extensions if needed on `MarketplaceListing` (snake_case matching Supabase). To be confirmed during planning.

### 8.2 Mobile additions (`apps/mobile/src/`)

Components (each with a `.test.tsx` neighbor):
- `components/marketplace/ListingGridCard.tsx`
- `components/marketplace/ListingGridCardSkeleton.tsx`
- `components/marketplace/ListingStripCard.tsx`
- `components/marketplace/MarketplaceSearchBar.tsx`
- `components/marketplace/CategoryTileRow.tsx`
- `components/marketplace/MarketplaceTabs.tsx`
- `components/marketplace/MarketplaceMenuSheet.tsx`
- `components/marketplace/MarketplaceEmptyState.tsx`

Screens:
- `screens/marketplace/MarketplaceHomeScreen.tsx` — rewritten around the new layout.
- `screens/marketplace/BrowseCategoriesScreen.tsx` — new.
- `screens/marketplace/MarketplaceRulesScreen.tsx` — new (stub allowed).
- `screens/marketplace/SavedListingsScreen.tsx` — new only if Saved backend is in scope.

Navigation:
- `navigation/MarketplaceNavigator.tsx` — register new routes.
- `types/navigation.ts` — extend `MarketplaceStackParamList` with new route names.

Styles:
- `styles/surfaces.ts` or extend `styles/colors.ts` with the new tokens from §4.1.

### 8.3 Style rule compliance

- No inline styles. Every component uses `StyleSheet.create()` at the bottom of the file (per `CLAUDE.md`).
- No platform-specific imports in `packages/shared/` (per Shared-First rule).

### 8.4 Test rule compliance

All new components follow `apps/mobile/TESTING-PATTERNS.md`:
- Async `useEffect` components use `render()` + `waitFor()`, not `act()`.
- Components with timers/animations use `jest.useFakeTimers()` and advance timers before `act()`.
- Every async `useCallback` that calls `setState` uses `mountedRef` cancel guard.
- Each test file has a local `jest.mock('@expo/vector-icons', ...)`.

## 9. Loading, Empty, and Error States

### 9.1 Skeleton loader

New `ListingGridCardSkeleton` matches the real card's dimensions exactly. Grey rectangles for image, title, price, meta. Subtle 1.5s shimmer via `Animated.Value` interpolation (no new library).

- Home initial load: 6 skeleton cards in a 2-column grid while data arrives.
- Tab switch: 4 skeleton cards replace the grid during query.
- Pull-to-refresh: existing `RefreshControl` behavior preserved (no skeleton during pull refresh).

### 9.2 Empty state

New `MarketplaceEmptyState` component with variants:

| Variant | When | Headline | Copy | Primary CTA | Secondary |
|---|---|---|---|---|---|
| `empty-metro` | no listings in user's metro | Nothing in your metro yet | Be the first to share something with your Nepali community here. | Create the first listing (if `canCreate`) | Browse nearby metros → |
| `empty-search` | search/filter returns 0 | No matches | Try a different search term or category. | Clear filters | — |
| `empty-category` | tab/category yields 0 | Nothing here yet | This corner of the marketplace is still quiet. | Back to Marketplace | — |

Illustration: large single-emoji fallback (`🏪`) in `accent.warm` background circle for v1. Custom SVG is out of scope.

### 9.3 Error state

If any of the parallel home-data fetches throws, the screen currently silently swallows the error. Redesign behavior: the tab/section that failed shows a compact inline error banner with a "Retry" button that re-fires the failed query. Other sections continue to render. No modal, no full-screen takeover.

## 10. Accessibility

- Save heart: `accessibilityRole="button"`, `accessibilityState={{ selected: isSaved }}`, label `"Save listing"` / `"Unsave listing"`.
- Tab strip: container `accessibilityRole="tablist"`, each tab `accessibilityRole="tab"` with `accessibilityState={{ selected }}`.
- Category tiles: `accessibilityLabel` = category name.
- Search input: `accessibilityLabel="Search marketplace"`, `accessibilityHint="Filters listings by keyword"`.
- Menu sheet: `accessibilityViewIsModal={true}`, focus trap on open, close on backdrop tap.
- All touch targets ≥ 44×44.

## 11. Risks and Open Questions

1. **"Near" tab needs backend work.** `getListingsByMetro` is metro-scoped, not distance-scoped. Adding a real `getNearbyListings` shared API would require a migration (`019_listings_location_index.sql`) and PostGIS distance sort. **Decision:** ship v1 with three tabs (For You · Featured · Recent). Add "Near" in a follow-up plan once the location column exists on listings.

2. **Freshness source.** `formatListingFreshness` requires `created_at` on the listing. `MarketplaceListing` already exposes it per the shared types, so no API change is needed. To be confirmed at the start of planning.

3. **Location text on card.** Requires `owner_profile.metro.city` (or a `location_text` column) to be selected by `getListingsByMetro`. If not currently selected, cards will show freshness only and the location field is hidden until the shared API is extended. Acceptable fallback.

4. **Saved / Favorites.** If the `saved_listings` table does not yet exist in `supabase/migrations/`, Saved is entirely out of scope for this redesign: the heart icon on cards and the Saved menu row are deferred to a follow-up plan. **Must be confirmed before the plan phase starts.**

5. **Verified seller checkmark** reuses the existing `owner.trust_level` field — no new data needed.

6. **Backward compatibility of `ListingCard`.** `MarketplaceCategoryScreen`, `ListingDetailScreen`, and other screens still consume the old `ListingCard`. The redesign introduces `ListingGridCard` as a separate component at new call sites. The old component is not renamed or deleted in this plan.

7. **Accent color accessibility.** `#C8451C` on `#FBF7F1` must be contrast-checked (target WCAG AA 4.5:1 for the price text). If it fails, the accent darkens in the plan phase.

## 12. Success Criteria

- A user on a 6.1" device sees ≥ 4 browse cards per screen on the home grid.
- The home screen no longer contains four stacked horizontal strips.
- Tapping the top-right menu icon opens a bottom sheet with at least My Listings, Promote, Browse Categories, Change Location, and Marketplace Rules.
- No regressions in pagination, pull-to-refresh, or FAB create flow.
- `npm run test:ci --workspace=apps/mobile` passes on CI (Ubuntu runner).
- `npm run ci:local` at the monorepo root passes.
- All new components follow Shared-First, StyleSheet, and TestingPatterns rules.

## 13. Out-of-scope redirects

Anything listed here should be filed as a follow-up plan, not folded into this one:
- Web marketplace redesign
- `SavedListings` backend if `saved_listings` table is absent
- "Near" tab with distance-sort backend
- Personalization ranking for "For You"
- Custom SVG illustrations
- `MarketplaceCategoryScreen` / `ListingDetailScreen` / `CreateListingScreen` / `PromoteListingScreen` / `MyListingsScreen` redesigns
- New icon pack beyond `@expo/vector-icons` and emoji fallbacks
