---
title: Fix promotions display design
status: implemented
created: 2026-04-13
---

# Fix Promotions Display

**Date:** 2026-04-13
**Branch:** feat/drop-is-featured-column
**Status:** Spec approved — ready for implementation

## Problem

Three promotions types exist (`featured_listing`, `sponsored_feed`, `sticky_business`), but two issues prevent them from working correctly for all users:

### Bug 1 — `sponsored_feed` invisible to non-owners (critical)

The only SELECT policy on `listing_promotions` is:
```sql
USING (user_id = auth.uid())
```
This restricts every read to the user's own rows. When `getSponsoredFeedListings` runs for a user who hasn't purchased a `sponsored_feed` promotion, PostgREST returns zero rows — no sponsored cards appear in their home feed. The same RLS gap technically affects `getStickyBusinessListings`, but it was not noticed because the listing owner happens to be the tester.

### Bug 2 — Metro filter applied after server-side LIMIT

`getSponsoredFeedListings` and `getStickyBusinessListings` both fetch the top N promotions **globally**, then filter by `metro_area_id` in JavaScript. If all N fetched promotions belong to a different metro, the client-side filter returns zero even when valid promotions exist for the user's city.

### Missing feature — Featured strip on category pages

The `featured_listing` promotion promises "Boost to top of marketplace search & category pages." The category pages (`MarketplaceCategoryScreen` on mobile, `[category].page.tsx` on web) call `getListingsByMetro` with the default sort and give featured listings no preferential treatment. The carousel strip that exists on the marketplace home does not exist on category pages.

## Scope

| Item | Type |
|---|---|
| Fix RLS on `listing_promotions` | Bug fix |
| Fix metro filter in `getSponsoredFeedListings` + `getStickyBusinessListings` | Bug fix |
| Add `categorySlug` param to `getFeaturedListings` | API enhancement |
| Featured carousel strip on mobile category screen | Feature |
| Featured carousel strip on web category page | Feature |

**Out of scope:** Search results pages (featured strip not shown in keyword search — cross-category results make the strip semantically incorrect). Sticky business on category pages (not part of the promotion's value proposition).

## Design

### Migration 024 — Fix RLS

New file: `supabase/migrations/024_fix_promotions_rls_and_feed.sql`

Add a second SELECT policy alongside the existing `"Users can read own promotions"` policy. Postgres ORs multiple SELECT policies so both coexist safely — existing behaviour (users can manage their own promotions in any status) is preserved.

```sql
CREATE POLICY "All users can read active promotions for display"
  ON listing_promotions FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND (end_date IS NULL OR end_date > now())
  );
```

### `packages/shared/src/api/promotions.ts` — Fix metro filter

Replace client-side metro filtering with a server-side embedded resource filter in both `getSponsoredFeedListings` and `getStickyBusinessListings`:

```ts
// Add to the Supabase query chain (before .limit())
// NOTE: the select aliases marketplace_listings as `listing:...`, so the
// PostgREST filter path must use the alias, not the underlying table name.
.filter('listing.metro_area_id', 'eq', metroId)
.filter('listing.status', 'eq', 'active')
```

Remove the post-query `data.filter(...)` call from both functions — the DB now does the work before LIMIT is applied.

### `packages/shared/src/api/marketplace.ts` — `getFeaturedListings` category param

Extend `StripOptions` with an optional `categorySlug`:

```ts
export interface StripOptions {
  limit?: number;
  offset?: number;
  categorySlug?: string;  // new
}
```

Inside `getFeaturedListings`, when `categorySlug` is provided:
1. Add `.eq('category.slug', categorySlug)` to the query
2. Add a client-side filter `listings = listings.filter(l => l.category != null)` (same pattern as `getListingsByMetro`) to remove rows where the category join returned null

When `categorySlug` is absent, behaviour is unchanged.

### `apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.tsx`

- Add `featuredListings: MarketplaceListing[]` state (default `[]`)
- In `fetchListings`, run `getFeaturedListings` in parallel with `getListingsByMetro` **only when `offset === 0`** (initial load and pull-to-refresh) and not in search mode:
  ```ts
  const [listingsResult, featuredResult] = await Promise.all([
    getListingsByMetro(...),
    offset === 0 && !isSearchMode
      ? getFeaturedListings(supabase, metroId, { categorySlug, limit: 10 })
      : Promise.resolve({ data: [] }),
  ]);
  ```
- Store `featuredResult.data ?? []` in `featuredListings` state; when `offset > 0` (load-more), leave `featuredListings` state unchanged
- In the `FlatList`, prepend a `<ListingStrip>` as part of `ListHeaderComponent` when `featuredListings.length > 0`:
  ```tsx
  {featuredListings.length > 0 && (
    <ListingStrip
      title="Featured"
      titleIcon="⭐"
      listings={featuredListings}
      onItemPress={handleItemPress}
      onShowAll={() => {}}
      maxItems={10}
    />
  )}
  ```
- Refresh `featuredListings` on pull-to-refresh alongside the regular listings

### `apps/web/src/pages/marketplace/[category].page.tsx`

- Add `featuredListings: MarketplaceListing[]` state (default `[]`)
- In `fetchListings`, run `getFeaturedListings` in parallel **only on first page** (`offset === 0`) and not in search mode:
  ```ts
  const [result, featuredResult] = await Promise.all([
    getListingsByMetro(...),
    offset === 0 && !isSearch
      ? getFeaturedListings(supabase, metroId, { categorySlug: slug, limit: 10 })
      : Promise.resolve({ data: [] }),
  ]);
  ```
- Store `featuredResult.data ?? []` in `featuredListings` state; leave it unchanged on subsequent page fetches
- Render `<ListingStrip>` above the listing grid when `featuredListings.length > 0` and `!isSearch`:
  ```tsx
  {!isSearch && featuredListings.length > 0 && (
    <ListingStrip
      title="Featured"
      titleIcon="⭐"
      listings={featuredListings}
      maxItems={10}
    />
  )}
  ```

## Testing

### Shared API

**`packages/shared/src/api/promotions.test.ts`** — new cases:
- `getSponsoredFeedListings` includes `listing.metro_area_id` filter in the query (alias path, not `marketplace_listings.*`)
- `getSponsoredFeedListings` includes `listing.status` filter in the query
- `getSponsoredFeedListings` returns empty array (not error) when no active promotions exist
- `getStickyBusinessListings` same three cases

**`packages/shared/src/api/marketplace.test.ts`** — new cases:
- `getFeaturedListings` with `categorySlug` applies category filter and strips null-category rows
- `getFeaturedListings` without `categorySlug` behaves identically to before (no regression)

### UI

**`apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.test.tsx`** — new cases:
- Renders `ListingStrip` when `getFeaturedListings` returns listings for the category
- Does not render featured strip in search mode
- Does not render featured strip when `getFeaturedListings` returns empty

**`apps/web/src/pages/marketplace/[category].test.tsx`** — same three cases

### Manual verification (staging)

- Apply migration 024; confirm a non-owner user sees another user's active `sponsored_feed` promotion in their home feed
- Confirm featured strip appears on a category page with an active `featured_listing` promotion
- Confirm featured strip is absent on the search results page

## Files touched

```
supabase/migrations/024_fix_promotions_rls_and_feed.sql         new
packages/shared/src/api/promotions.ts                           fix metro filter × 2
packages/shared/src/api/promotions.test.ts                      new tests
packages/shared/src/api/marketplace.ts                          categorySlug param
packages/shared/src/api/marketplace.test.ts                     new tests
apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.tsx     featured strip
apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.test.tsx
apps/web/src/pages/marketplace/[category].page.tsx              featured strip
apps/web/src/pages/marketplace/[category].test.tsx
```
