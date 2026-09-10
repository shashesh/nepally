---
title: Promotion lifecycle and feeds
status: implemented
created: 2026-04-10
---

# Promotion Lifecycle Fixes + Sponsored/Sticky Feed Wiring

**Status:** Implemented 2026-04-10
**Related:** `020_promotions.sql`, `018_marketplace_featured_and_trending.sql`, `docs/implementation-plans/promote-listing-feature.md`

## Problem

Three conflicts surfaced between the marketplace `is_featured` column (from 018) and
the listing_promotions system (from 020):

1. **Semantic collision on `is_featured`.** The column is a denormalized cache driven
   by two independent sources: (a) owner premium status, (b) active paid
   `featured_listing` promotions. Keeping the column is still the right call — the
   marketplace Featured strip and `sortBy=featured` path both rely on a simple
   boolean filter/index. Deriving it via a join on every read would cost more than
   it saves, especially since 018 already ships a partial index keyed on it.

2. **Cascade bug on premium downgrade.** `cascade_premium_to_listings()` (018)
   unconditionally ran `SET is_featured = NEW.is_premium` for every active listing
   owned by the user when their `is_premium` flag flipped. On downgrade
   (premium → free), any paid `featured_listing` promotions the user had purchased
   were silently wiped — the buyer loses the boost they paid for.

3. **`sponsored_feed` and `sticky_business` were effectively dead code.** The two
   promotion tiers existed in the enum, `PROMOTION_TIERS`, the shared API
   (`getSponsoredFeedListings`, `getStickyBusinessListings`), and a mobile
   `SponsoredFeedBanner` component — but the home feed only rendered a single
   header banner of sponsored listings, and no consumer used the
   `SPONSORED_FEED_INJECTION_INTERVAL = 10` rule. On web, the sidebar "Sponsored"
   rail was wired to `sponsored_feed` when it should semantically be
   `sticky_business` (fixed sidebar placement, every page load).

## Design

### Keep `is_featured`, fix the lifecycle

- **`is_featured` remains a denormalized cache.** Premium users stay featured via
  018's `set_is_featured_from_premium` + `cascade_premium_to_listings` triggers.
  Paid `featured_listing` promotions stay featured via 020's
  `sync_promotion_featured` trigger on INSERT/status UPDATE.
- **Expiry** already correct: `expire-promotions` edge function resets
  `is_featured = FALSE` for non-premium owners once a promotion expires, and
  guards against "other active featured_listing promos exist on the same listing".
- **Downgrade bug** → migration `021_fix_cascade_premium_promotion.sql`. New
  cascade function splits upgrade vs downgrade:
  - **Upgrade (free → premium):** feature all active listings.
  - **Downgrade (premium → free):** only unfeature listings that do **not** have
    an active paid `featured_listing` promotion in `listing_promotions`.

### Shared feed-mixing helper

New pure util in `packages/shared/src/utils/sponsoredFeed.ts`:

```ts
interleaveSponsoredItems<P, S>(
  posts: readonly P[],
  sponsored: readonly S[],
  options: { interval: number }
): Array<P | S>
```

Rules:
- Inject one sponsored item after every `interval` posts.
- Suppress trailing sponsored if no post follows (prevents lonely sponsored card
  at the bottom of the feed).
- Consume sponsored items in order, never reuse.
- Non-positive intervals are a no-op.

Used by both mobile and web to enforce a single code path for feed ordering.
8 unit tests covering empty cases, boundary semantics, exhaustion, and trailing
suppression.

### Mobile: `apps/mobile/src/screens/HomeScreen.tsx`

- Removed the one-shot `SponsoredFeedBanner` from `ListHeaderComponent`.
- Feed `FlatList.data` is now a discriminated union
  `FeedEntry = { kind: 'post', post } | { kind: 'sponsored', sponsored }`.
- `feedEntries` is derived in `useMemo` via `interleaveSponsoredItems(
  posts, sponsoredFeedItems, { interval: SPONSORED_FEED_INJECTION_INTERVAL }
  )`.
- `renderFeedEntry` branches on `entry.kind`. Sponsored slots render a
  `ListingCard` with the existing `sponsored` badge prop (no new component).
- Tapping a sponsored slot navigates to the Marketplace ListingDetail screen.

### Web: `apps/web/src/pages/feed.page.tsx`

- Split the single `sponsoredListings` state into two:
  - `stickyListings` — populated from `getStickyBusinessListings`, drives the
    fixed sidebar "Sponsored" rail. This is the semantically correct source
    for a persistent sidebar slot.
  - `sponsoredFeedListings` — populated from `getSponsoredFeedListings`, drives
    the interleaved in-feed cards.
- Same shared helper + discriminated union pattern as mobile.
- New inline card component (CSS-only, no new tsx file): styled in
  `Feed.module.css` under `.inlineSponsoredCard` / `.inlineSponsoredLabel` /
  `.inlineSponsoredTitle` / `.inlineSponsoredDescription` / `.inlineSponsoredPrice`.
- Sidebar rail visuals unchanged — only the data source swapped.

### What is NOT changed

- `marketplace.ts` still reads `is_featured` for the Featured strip and
  `sortBy=featured` path. That's the correct use of the denormalized cache.
- Mobile `MarketplaceHomeScreen` and web `marketplace/index.page.tsx` already
  wire `getStickyBusinessListings` correctly for their "Sponsored" strip —
  no changes needed.
- Migrations 018 and 020 stay frozen. 021 only replaces the body of
  `cascade_premium_to_listings()` via `CREATE OR REPLACE FUNCTION`.

## Files touched

```
supabase/migrations/021_fix_cascade_premium_promotion.sql   (new)
packages/shared/src/utils/sponsoredFeed.ts                  (new)
packages/shared/src/utils/sponsoredFeed.test.ts             (new, 8 tests)
packages/shared/src/utils/index.ts                          (export)
apps/mobile/src/screens/HomeScreen.tsx                      (interleave)
apps/web/src/pages/feed.page.tsx                            (interleave + split)
apps/web/src/styles/Feed.module.css                         (inline card styles)
docs/implementation-plans/promotion-lifecycle-and-feeds.md  (this doc)
```

## Test plan

- [x] `interleaveSponsoredItems` unit tests (8) — shared package
- [x] All existing shared tests (345) continue to pass
- [ ] Apply migration 021 to staging; verify cascade trigger preserves
      `is_featured = TRUE` on a listing with an active paid featured_listing
      promotion when its premium owner downgrades
- [ ] Seed staging with 25 local posts + 3 active `sponsored_feed` promotions
      and verify mobile HomeScreen shows sponsored rows at positions 10, 20, 30
- [ ] Seed staging with 3 active `sticky_business` promotions and verify the
      web feed sidebar rail renders them instead of hardcoded placeholders
- [ ] Verify mobile taps on a sponsored slot navigate to ListingDetail
- [ ] Verify web clicks on an inline sponsored card route to
      `/marketplace/listing/:id`
