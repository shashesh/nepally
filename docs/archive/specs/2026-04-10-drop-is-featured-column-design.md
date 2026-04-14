# Drop `marketplace_listings.is_featured` — Design

**Date:** 2026-04-10
**Status:** Approved, ready for implementation plan
**Related migration:** `022_drop_is_featured.sql`

## Problem

`marketplace_listings.is_featured` is a denormalized boolean kept in sync via three trigger paths:

1. Auto-set on listing insert when the owner is premium (migration 018)
2. Cascaded on user `is_premium` upgrade/downgrade (migration 021)
3. Set when a `featured_listing` promotion becomes active (migration 020)

The column has been the source of cascade bugs (021 fixed one) and duplicates state that already lives in `listing_promotions`. We want a single source of truth for "is this listing featured": the `listing_promotions` table.

## Goals

- `listing_promotions` is the only source of truth for featured status.
- The premium-user-gets-free-featured perk is preserved.
- Read paths stay ergonomic (no N+1, minimal query churn).
- Migration is additive and non-destructive per project rules.

## Non-Goals

- Changing `trending_score` or any unrelated marketplace behavior.
- Re-architecting the promotions table beyond what this change requires.
- Changing any UI. Components keep reading `listing.is_featured`.

## Architecture

### Data model

Introduce two kinds of `featured_listing` promotions, distinguished by a new `source` column:

| `source`       | Meaning                         | `end_date` | `*_cost_cents` | Created by                                    | Cancelled by                    |
|----------------|---------------------------------|------------|----------------|-----------------------------------------------|---------------------------------|
| `paid`         | User purchased a promotion      | NOT NULL   | > 0            | Existing checkout flow                        | Expiry job / user cancellation  |
| `premium_perk` | Free while owner is premium     | NULL       | 0              | Triggers on listing insert / premium upgrade  | Trigger on premium downgrade    |

A listing is featured iff it has any `listing_promotions` row where:

```
promotion_type = 'featured_listing'
AND status = 'active'
AND (end_date IS NULL OR end_date > now())
```

### Reads: SQL view

Create `marketplace_listings_view`:

```sql
CREATE VIEW marketplace_listings_view AS
SELECT ml.*,
  EXISTS (
    SELECT 1 FROM listing_promotions lp
    WHERE lp.listing_id = ml.id
      AND lp.promotion_type = 'featured_listing'
      AND lp.status = 'active'
      AND (lp.end_date IS NULL OR lp.end_date > now())
  ) AS is_featured
FROM marketplace_listings ml;
```

All read queries switch `.from('marketplace_listings')` → `.from('marketplace_listings_view')`. Writes stay on the base table.

### Writes

Writes never set `is_featured`. The column ceases to exist on the base table. The shared TS type makes the field optional; write responses will come back without it (acceptable because every write is followed by a refetch in UI paths, and components that need the featured badge always read from a list query which uses the view).

## Migration plan (`022_drop_is_featured.sql`)

Additive and non-destructive only. Sequence:

1. **Add `promotion_source` enum and `source` column:**
   ```sql
   CREATE TYPE promotion_source AS ENUM ('paid', 'premium_perk');
   ALTER TABLE listing_promotions
     ADD COLUMN source promotion_source NOT NULL DEFAULT 'paid';
   ```

2. **Relax constraints for `premium_perk` rows.** Drop the existing `duration_days >= 1` check; add a new constraint allowing `premium_perk` rows to have `duration_days = 0`, `daily_cost_cents = 0`, `total_cost_cents = 0`, `end_date NULL`:
   ```sql
   ALTER TABLE listing_promotions
     DROP CONSTRAINT IF EXISTS listing_promotions_duration_days_check;
   ALTER TABLE listing_promotions ADD CONSTRAINT listing_promotions_source_shape_check CHECK (
     (source = 'paid' AND duration_days BETWEEN 1 AND 90 AND end_date IS NOT NULL)
     OR
     (source = 'premium_perk' AND duration_days = 0 AND daily_cost_cents = 0 AND total_cost_cents = 0 AND end_date IS NULL)
   );
   ```

3. **Backfill premium_perk rows.** For every listing currently `is_featured = TRUE` whose owner `is_premium = TRUE` and which has no existing active paid `featured_listing` promotion, insert one `premium_perk` row with `status = 'active'`, `start_date = now()`, `end_date = NULL`. Listings flagged featured whose owner is *not* currently premium are not backfilled (stale state from old cascade bugs) — they will lose their feature badge.

4. **Drop old cascade triggers and functions:**
   - `trg_set_is_featured_from_premium` / `set_is_featured_from_premium()` (migration 018)
   - The premium cascade trigger and function from migration 021
   - `trg_promotion_sync_featured` / `sync_promotion_featured()` (migration 020) — replaced by the view

5. **Drop index** `idx_marketplace_listings_featured` (partial index on `is_featured = TRUE`).

6. **Drop column** `marketplace_listings.is_featured`. (Scoped drop of an unused column; preserved data was already copied into `premium_perk` rows in step 3.)

7. **Create new triggers driving `premium_perk` rows:**

   - **On `marketplace_listings` INSERT:** if owner `is_premium`, insert a `premium_perk` active promotion for the new listing.

   - **On `users` UPDATE when `is_premium` changes:**
     - `false → true`: for every `status = 'active'` listing owned by the user, either reactivate an existing `premium_perk` row (`UPDATE ... SET status = 'active'` where one is already present but cancelled) or insert a fresh one.
     - `true → false`: `UPDATE listing_promotions SET status = 'cancelled' WHERE user_id = NEW.id AND source = 'premium_perk' AND status = 'active'`. Paid rows are untouched.

8. **Scope expiry job** (wherever paid promotions are marked `expired` — TBD: grep during implementation) to `WHERE source = 'paid'`. Premium perk rows never expire by date.

9. **Create view** `marketplace_listings_view` as shown above. Add FK hint comments so PostgREST can embed `owner` and `category` through the view.

## Shared API changes

File: [packages/shared/src/api/marketplace.ts](../../packages/shared/src/api/marketplace.ts)

### Reads switch to view
- `getListingsByMetro`, `getFeaturedListings`, `getTrendingListings`, `getListingById`, `getListingsByOwner`, `getSavedListingsByUser` all use `.from('marketplace_listings_view')`.
- `getFeaturedListings` keeps its `.eq('is_featured', true)` — now filtering on the computed view column.
- `getListingsByMetro` 'featured' sort keeps `.order('is_featured', { ascending: false })`.

### Writes stay on base table
- `createListing`, `updateListing`, `deactivateListing`, `reactivateListing`, `deleteListing`, `refreshListing` keep `.from('marketplace_listings')`.
- Their return types lose `is_featured` (no longer on the base table). Callers refetch anyway.

### Types
File: [packages/shared/src/types/marketplace.ts](../../packages/shared/src/types/marketplace.ts)
- `is_featured: boolean` → `is_featured?: boolean`
- Update the sort-by comment: `featured: is_featured DESC (computed from active listing_promotions), then refreshed_at DESC`.

### Promotions API
File: [packages/shared/src/api/promotions.ts](../../packages/shared/src/api/promotions.ts) — remove `is_featured` from the select list at line 20.

## Tests

### Shared
File: [packages/shared/src/api/marketplace.test.ts](../../packages/shared/src/api/marketplace.test.ts)
- Existing fixtures with `is_featured: false` remain valid (field is now optional).
- Update two existing assertions to expect `.from('marketplace_listings_view')`:
  - "applies featured sort (is_featured DESC, refreshed_at DESC)"
  - "filters by is_featured = true and status = active"
- Add a test asserting `createListing` / `updateListing` still target the base table, not the view.

### App
No changes required. All `is_featured` mocks in web + mobile tests remain valid because the field is optional. The `is_featured: true` mock in [apps/web/src/pages/marketplace/index.test.tsx:146](../../apps/web/src/pages/marketplace/index.test.tsx#L146) still exercises the Featured strip rendering.

### Trigger / backfill verification
SQL-only. Verified manually during the migration step:
- Insert a listing owned by a premium user → `premium_perk` row auto-created.
- Flip a user `is_premium` false → true → `premium_perk` rows appear for all active listings.
- Flip true → false → those rows become `cancelled`, paid rows stay `active`.
- Querying the view after each step returns the correct `is_featured` boolean.

## Risks

1. **PostgREST embeds on views.** The existing `owner:users!...` and `category:marketplace_categories!...` joins must resolve through `marketplace_listings_view`. Supabase supports this with FK hint comments on view columns. If embed resolution fails despite the hints, fallback options (in order): (a) add FK comments; (b) switch the two hot reads to SQL RPC functions; (c) keep writes/reads on base table and implement featured as a LEFT JOIN embed filtered client-side (last resort).

2. **Premium re-upgrade after downgrade.** The upgrade trigger must handle `premium_perk` rows in `cancelled` state — reactivate instead of inserting a duplicate. Enforced by a unique partial index `(listing_id, promotion_type) WHERE source = 'premium_perk'` plus `INSERT ... ON CONFLICT DO UPDATE SET status = 'active'`.

3. **Backfill of stale `is_featured = TRUE` rows.** Any listing flagged featured whose owner is not currently premium will silently lose the badge. Expected and documented as a migration side effect; matches the intended end state.

4. **Expiry job scoping.** The existing job that marks paid promotions `expired` must be found during implementation and scoped to `source = 'paid'` before the migration ships. A grep for `'expired'` against edge functions and cron SQL is part of the implementation plan.

## Open items for implementation

- Locate the expiry job and scope it to `source = 'paid'` in the same PR.
- Verify exact names of the premium-cascade trigger/function from migration 021 (referenced by name in step 4 of the migration).
- Determine whether a unique partial index on `(listing_id) WHERE source = 'premium_perk'` is needed to guard against duplicate perk rows.
