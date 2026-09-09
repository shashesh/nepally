---
title: Drop is_featured column
status: implemented
created: 2026-04-10
spec: docs/archive/specs/2026-04-10-drop-is-featured-column-design.md
---

# Drop `marketplace_listings.is_featured` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the denormalized `marketplace_listings.is_featured` column and derive featured status solely from `listing_promotions`, preserving the premium-user auto-feature perk via a new `premium_perk` source of promotion rows.

**Architecture:** Introduce `promotion_source` enum on `listing_promotions` (`paid` | `premium_perk`). Premium users' active listings get auto-created `premium_perk` rows (zero-cost, no expiry). All read paths switch from `.from('marketplace_listings')` to a new SQL view `marketplace_listings_view` that exposes a computed `is_featured` boolean via an `EXISTS` subquery on `listing_promotions`. Writes stay on the base table. Old cascade triggers and the denormalized column are dropped. The hourly `expire-promotions` edge function is scoped to `source = 'paid'`.

**Tech Stack:** Supabase (Postgres 15), PostgREST, TypeScript shared package (`packages/shared`), Vitest for shared tests, Supabase Edge Functions (Deno) for the expiry job.

**Design doc:** [docs/superpowers/specs/2026-04-10-drop-is-featured-column-design.md](../specs/2026-04-10-drop-is-featured-column-design.md)

---

## File Structure

### Files created
- `supabase/migrations/022_drop_is_featured.sql` — the whole database migration
- `packages/shared/src/api/marketplace.view.test.ts` — *(optional placement — if you prefer, append to the existing test file instead; Task 9 uses the existing file)*

### Files modified
- `packages/shared/src/types/marketplace.ts` — `is_featured` becomes optional; comment update
- `packages/shared/src/api/marketplace.ts` — reads point at `marketplace_listings_view`; writes unchanged
- `packages/shared/src/api/promotions.ts` — drop `is_featured` from sponsored listing select
- `packages/shared/src/api/marketplace.test.ts` — update two assertions to expect the view
- `supabase/functions/expire-promotions/index.ts` — scope to `source = 'paid'`, drop `is_featured` write

### Files NOT modified (intentional — field is optional, mocks still valid)
- All `apps/web/**/*.test.tsx` and `apps/mobile/**/*.test.tsx` files that have `is_featured: false` or `is_featured: true` in mocks

### Ordering
Database migration is authored first so the shape is locked in, but it is **applied after** the shared API and edge function changes are merged or queued so the running code never crashes against a half-migrated DB. The task order reflects this: migration file authored in Task 1, applied in Task 13.

---

## Task 1: Author migration `022_drop_is_featured.sql`

**Files:**
- Create: `supabase/migrations/022_drop_is_featured.sql`

**Context for the engineer:**
- Per `CLAUDE.md` and memory, this repo enforces **additive, non-destructive** migrations. You may use `ALTER TABLE ... DROP COLUMN` and `DROP TRIGGER` / `DROP FUNCTION` (these are scoped, not `DROP TABLE`). You may **not** use `DROP TABLE` or `DROP TYPE`.
- The existing promotion trigger names you'll drop are defined in earlier migrations — verified names:
  - `trg_listing_auto_feature` + `set_is_featured_from_premium()` (mig 018)
  - `trg_user_premium_cascade` + `cascade_premium_to_listings()` (mig 018, redefined in 021)
  - `trg_promotion_sync_featured` + `sync_promotion_featured()` (mig 020)
- The existing `duration_days` CHECK constraint from mig 020 is inline and unnamed, so we drop it by column-re-check semantics (use a `DO` block with `information_schema` lookup, or drop it by its Postgres-assigned name). Simplest path: query and drop via dynamic SQL. Shown below.
- The `users` table has column `is_premium BOOLEAN`. The trigger referenced in mig 018 fires on `UPDATE OF is_premium ON users`.

- [ ] **Step 1: Create the migration file with the full SQL below**

```sql
-- 022_drop_is_featured.sql
-- ADDITIVE: drops the denormalized marketplace_listings.is_featured column
-- and makes listing_promotions the single source of truth for featured status.
-- Premium users keep the free-featured perk via auto-created `premium_perk`
-- promotion rows. Reads switch to a new view marketplace_listings_view.
--
-- Rollback notes
--   To roll back, write migration 023 that: recreates is_featured column,
--   re-backfills it from the view logic, drops the view, and restores the
--   old cascade triggers from migrations 018/020/021.

-- ─── 1. New enum + source column on listing_promotions ─────────────────────

CREATE TYPE promotion_source AS ENUM ('paid', 'premium_perk');

ALTER TABLE listing_promotions
  ADD COLUMN source promotion_source NOT NULL DEFAULT 'paid';

-- ─── 2. Relax constraints for premium_perk rows ────────────────────────────

-- Drop the existing unnamed CHECK on duration_days (inline from migration 020).
-- We look it up by constraint definition and drop by its Postgres-assigned name.
-- Uses a FOR loop so multiple matching constraints would all be dropped safely.
DO $$
DECLARE
  cname TEXT;
BEGIN
  FOR cname IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'listing_promotions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%duration_days%'
  LOOP
    EXECUTE format('ALTER TABLE listing_promotions DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

ALTER TABLE listing_promotions
  ADD CONSTRAINT listing_promotions_source_shape_check CHECK (
    (source = 'paid'
      AND duration_days BETWEEN 1 AND 90
      AND end_date IS NOT NULL)
    OR
    (source = 'premium_perk'
      AND duration_days = 0
      AND daily_cost_cents = 0
      AND total_cost_cents = 0
      AND end_date IS NULL)
  );

-- Unique partial index: at most one active/pending/cancelled premium_perk
-- featured_listing row per listing. Prevents duplicates on premium re-upgrade.
CREATE UNIQUE INDEX idx_listing_promotions_premium_perk_unique
  ON listing_promotions (listing_id)
  WHERE source = 'premium_perk' AND promotion_type = 'featured_listing';

-- ─── 3. Backfill premium_perk rows from existing is_featured state ─────────

INSERT INTO listing_promotions (
  listing_id, user_id, promotion_type, status, source,
  duration_days, daily_cost_cents, total_cost_cents,
  start_date, end_date
)
SELECT
  ml.id,
  ml.owner_id,
  'featured_listing'::promotion_type,
  'active'::promotion_status,
  'premium_perk'::promotion_source,
  0, 0, 0,
  now(),
  NULL
FROM marketplace_listings ml
JOIN users u ON u.id = ml.owner_id
WHERE ml.is_featured = TRUE
  AND u.is_premium = TRUE
  AND ml.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM listing_promotions lp
    WHERE lp.listing_id = ml.id
      AND lp.promotion_type = 'featured_listing'
      AND lp.status = 'active'
      AND (lp.end_date IS NULL OR lp.end_date > now())
  );

-- ─── 4. Drop old cascade triggers and functions ────────────────────────────

DROP TRIGGER IF EXISTS trg_listing_auto_feature ON marketplace_listings;
DROP FUNCTION IF EXISTS set_is_featured_from_premium();

DROP TRIGGER IF EXISTS trg_user_premium_cascade ON users;
DROP FUNCTION IF EXISTS cascade_premium_to_listings();

DROP TRIGGER IF EXISTS trg_promotion_sync_featured ON listing_promotions;
DROP FUNCTION IF EXISTS sync_promotion_featured();

-- ─── 5. Drop the partial index tied to is_featured ─────────────────────────

DROP INDEX IF EXISTS idx_marketplace_listings_featured;

-- ─── 6. Drop the denormalized column ───────────────────────────────────────

ALTER TABLE marketplace_listings DROP COLUMN is_featured;

-- ─── 7. New triggers driving premium_perk rows ─────────────────────────────

-- 7a. On listing insert: if owner is premium, create a premium_perk row.
CREATE OR REPLACE FUNCTION create_premium_perk_on_listing_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = NEW.owner_id AND is_premium = TRUE) THEN
    INSERT INTO listing_promotions (
      listing_id, user_id, promotion_type, status, source,
      duration_days, daily_cost_cents, total_cost_cents,
      start_date, end_date
    )
    VALUES (
      NEW.id, NEW.owner_id, 'featured_listing', 'active', 'premium_perk',
      0, 0, 0, now(), NULL
    )
    ON CONFLICT (listing_id) WHERE source = 'premium_perk' AND promotion_type = 'featured_listing'
    DO UPDATE SET status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_listing_create_premium_perk
  AFTER INSERT ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION create_premium_perk_on_listing_insert();

-- 7b. On user premium change: upgrade → create/reactivate, downgrade → cancel.
CREATE OR REPLACE FUNCTION cascade_premium_perk_promotions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN
    IF NEW.is_premium THEN
      -- Upgrade: insert or reactivate premium_perk row for every active listing.
      INSERT INTO listing_promotions (
        listing_id, user_id, promotion_type, status, source,
        duration_days, daily_cost_cents, total_cost_cents,
        start_date, end_date
      )
      SELECT ml.id, NEW.id, 'featured_listing', 'active', 'premium_perk',
             0, 0, 0, now(), NULL
      FROM marketplace_listings ml
      WHERE ml.owner_id = NEW.id AND ml.status = 'active'
      ON CONFLICT (listing_id) WHERE source = 'premium_perk' AND promotion_type = 'featured_listing'
      DO UPDATE SET status = 'active', start_date = now();
    ELSE
      -- Downgrade: cancel all premium_perk rows. Paid rows untouched.
      UPDATE listing_promotions
        SET status = 'cancelled'
        WHERE user_id = NEW.id
          AND source = 'premium_perk'
          AND status = 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_user_premium_cascade_perk
  AFTER UPDATE OF is_premium ON users
  FOR EACH ROW
  EXECUTE FUNCTION cascade_premium_perk_promotions();

-- ─── 8. View exposing computed is_featured ─────────────────────────────────

CREATE VIEW marketplace_listings_view AS
SELECT
  ml.*,
  EXISTS (
    SELECT 1 FROM listing_promotions lp
    WHERE lp.listing_id = ml.id
      AND lp.promotion_type = 'featured_listing'
      AND lp.status = 'active'
      AND (lp.end_date IS NULL OR lp.end_date > now())
  ) AS is_featured
FROM marketplace_listings ml;

-- Grant the view the same read permissions the base table has for PostgREST.
GRANT SELECT ON marketplace_listings_view TO anon, authenticated;

-- FK hint comments so PostgREST can embed owner + category through the view.
COMMENT ON VIEW marketplace_listings_view IS
  E'@graphql({"primary_key_columns": ["id"]})';
```

- [ ] **Step 2: Do NOT apply the migration yet.** The migration file is on disk only; it is applied in Task 13 after the code changes are in place. Do not run `supabase db push` or `apply_migration` in this task.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/022_drop_is_featured.sql
git commit -m "feat: add migration 022 dropping is_featured column"
```

---

## Task 2: Loosen `is_featured` on the shared TS type

**Files:**
- Modify: `packages/shared/src/types/marketplace.ts:16-19,71`

- [ ] **Step 1: Update the sort-by comment**

Change the comment block at lines 14-18:

```typescript
/**
 * Sort options for marketplace listing queries.
 * - `newest` / `oldest`: by refreshed_at
 * - `featured`: is_featured DESC (computed from active listing_promotions), then refreshed_at DESC
 * - `price_asc` / `price_desc`: by price (TEXT column — lexicographic sort; see note in api/marketplace.ts)
 */
```

- [ ] **Step 2: Make `is_featured` optional**

Change line 71 in the `MarketplaceListing` interface:

```typescript
  // Discovery surfaces (migration 018)
  // is_featured is now computed by marketplace_listings_view (migration 022).
  // Optional because write operations return rows from the base table only.
  is_featured?: boolean;
  trending_score: number;
```

- [ ] **Step 3: Run the shared typecheck**

Run: `pnpm --filter @nepally/shared typecheck` (or `pnpm -C packages/shared typecheck` if no filter alias — check `package.json` scripts first).
Expected: PASS. The field becoming optional should not break anything because no shared code currently *requires* it to be present — callers that read it handle `undefined` as falsy.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/marketplace.ts
git commit -m "refactor: make is_featured optional on MarketplaceListing type"
```

---

## Task 3: Add failing test — `getListingsByMetro` reads from view

**Files:**
- Modify: `packages/shared/src/api/marketplace.test.ts:207-219`

**Why TDD first:** the failing test pins the expected behavior (query the view) before we touch the implementation.

- [ ] **Step 1: Update the "applies featured sort" test to assert the view is used**

Replace the existing test block at lines 207-219 with:

```typescript
  it('applies featured sort and queries the view', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getListingsByMetro(supabase, 'metro-1', { sortBy: 'featured' });
    expect(supabase.from).toHaveBeenCalledWith('marketplace_listings_view');
    expect(chain.order).toHaveBeenCalledWith('is_featured', { ascending: false });
    expect(chain.order).toHaveBeenCalledWith('refreshed_at', { ascending: false });
  });
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `pnpm --filter @nepally/shared test marketplace.test -- -t "applies featured sort"`
Expected: FAIL. Assertion error — `supabase.from` was called with `'marketplace_listings'`, not `'marketplace_listings_view'`.

- [ ] **Step 3: Do NOT commit yet** — leave the red test in place; Task 5 fixes implementation, then we commit together.

---

## Task 4: Add failing test — `getFeaturedListings` reads from view

**Files:**
- Modify: `packages/shared/src/api/marketplace.test.ts:280-295`

- [ ] **Step 1: Update the "filters by is_featured = true" test**

Replace the existing test block at lines 280-295 with:

```typescript
  it('filters by is_featured = true and queries the view', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [MOCK_LISTING], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getFeaturedListings(supabase, 'metro-1');
    expect(result.data).toHaveLength(1);
    expect(supabase.from).toHaveBeenCalledWith('marketplace_listings_view');
    expect(chain.eq).toHaveBeenCalledWith('status', 'active');
    expect(chain.eq).toHaveBeenCalledWith('metro_area_id', 'metro-1');
    expect(chain.eq).toHaveBeenCalledWith('is_featured', true);
    expect(chain.order).toHaveBeenCalledWith('refreshed_at', { ascending: false });
  });
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `pnpm --filter @nepally/shared test marketplace.test -- -t "filters by is_featured"`
Expected: FAIL. Same reason — base table still targeted.

- [ ] **Step 3: Do NOT commit yet.**

---

## Task 5: Add failing test — writes still target base table

**Files:**
- Modify: `packages/shared/src/api/marketplace.test.ts` (append to the end of the file inside the top-level `describe` block, or next to the existing `createListing` tests)

- [ ] **Step 1: Add a new test asserting `createListing` uses the base table**

Locate the existing `createListing` describe block (search the file for `describe('createListing'`). Inside it, append this test:

```typescript
  it('writes against the base table, not the view', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_LISTING, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await createListing(supabase, {
      owner_id: 'user-1',
      metro_area_id: 'metro-1',
      category_id: 'cat-1',
      listing_type: 'individual',
      title: 'Test',
      description: 'Test',
      photos: [],
    });
    expect(supabase.from).toHaveBeenCalledWith('marketplace_listings');
    expect(supabase.from).not.toHaveBeenCalledWith('marketplace_listings_view');
  });
```

- [ ] **Step 2: Run the new test**

Run: `pnpm --filter @nepally/shared test marketplace.test -- -t "writes against the base table"`
Expected: PASS (this is the current behavior — writes already target the base table).

The test is a guard rail: it will fail in Task 6 if the engineer accidentally points writes at the view.

- [ ] **Step 3: Do NOT commit yet.**

---

## Task 6: Point reads at `marketplace_listings_view` in shared API

**Files:**
- Modify: `packages/shared/src/api/marketplace.ts` — six read functions

**The six read functions to update** (writes stay unchanged): `getListingsByMetro`, `getFeaturedListings`, `getTrendingListings`, `getListingById`, `getListingsByOwner`, `getSavedListingsByUser`.

- [ ] **Step 1: Update `getListingsByMetro` (line ~112)**

Change:

```typescript
    let query = supabase
      .from('marketplace_listings')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .eq('metro_area_id', metroId);
```

to:

```typescript
    let query = supabase
      .from('marketplace_listings_view')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .eq('metro_area_id', metroId);
```

- [ ] **Step 2: Update `getFeaturedListings` (line ~171)**

Change:

```typescript
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .eq('metro_area_id', metroId)
      .eq('is_featured', true)
```

to:

```typescript
    const { data, error } = await supabase
      .from('marketplace_listings_view')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .eq('metro_area_id', metroId)
      .eq('is_featured', true)
```

- [ ] **Step 3: Update `getTrendingListings` (line ~202)**

Change:

```typescript
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .eq('metro_area_id', metroId)
      .order('trending_score', { ascending: false })
```

to:

```typescript
    const { data, error } = await supabase
      .from('marketplace_listings_view')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .eq('metro_area_id', metroId)
      .order('trending_score', { ascending: false })
```

- [ ] **Step 4: Update `getListingById` (line ~227)**

Change:

```typescript
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(LISTING_SELECT)
      .eq('id', listingId)
      .neq('status', 'removed')
      .single();
```

to:

```typescript
    const { data, error } = await supabase
      .from('marketplace_listings_view')
      .select(LISTING_SELECT)
      .eq('id', listingId)
      .neq('status', 'removed')
      .single();
```

- [ ] **Step 5: Update `getListingsByOwner` (line ~256)**

Change:

```typescript
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(LISTING_SELECT)
      .eq('owner_id', ownerId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
```

to:

```typescript
    const { data, error } = await supabase
      .from('marketplace_listings_view')
      .select(LISTING_SELECT)
      .eq('owner_id', ownerId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
```

- [ ] **Step 6: Update `getSavedListingsByUser` (line ~543)**

The embed path uses the base table name; update the embed to target the view:

Change:

```typescript
      .from('saved_listings')
      .select(`
        listing_id,
        listing:marketplace_listings!saved_listings_listing_id_fkey (
          ${LISTING_SELECT}
        )
      `)
```

to:

```typescript
      .from('saved_listings')
      .select(`
        listing_id,
        listing:marketplace_listings_view!saved_listings_listing_id_fkey (
          ${LISTING_SELECT}
        )
      `)
```

**Important risk flag:** The embed hint `!saved_listings_listing_id_fkey` references an FK on the base table. PostgREST may not resolve this embed through a view automatically. If Task 13's post-apply verification step shows this query failing, the fallback is: keep the embed on `marketplace_listings` and compute `is_featured` in JS by running a follow-up query against `listing_promotions` OR move this query to an RPC. Do **not** rewrite this now — fix it only if Task 13 shows a failure.

- [ ] **Step 7: Leave writes untouched**

Verify by searching the file: `grep -n "from('marketplace_listings')" packages/shared/src/api/marketplace.ts`. You should see these remaining hits (writes only):
- `createListing` (insert)
- `updateListing` (update)
- `deactivateListing` (update)
- `reactivateListing` (update)
- `deleteListing` (update)
- `refreshListing` (update)

- [ ] **Step 8: Run the shared test suite**

Run: `pnpm --filter @nepally/shared test marketplace.test`
Expected: PASS — all three modified/added tests (Tasks 3, 4, 5) now pass, and the pre-existing ones continue to pass.

- [ ] **Step 9: Commit**

```bash
git add packages/shared/src/api/marketplace.ts packages/shared/src/api/marketplace.test.ts
git commit -m "refactor: point marketplace reads at marketplace_listings_view"
```

---

## Task 7: Drop `is_featured` from the promotions sponsored-listing select

**Files:**
- Modify: `packages/shared/src/api/promotions.ts:16-28`

- [ ] **Step 1: Remove `is_featured` from the embedded select**

Change:

```typescript
const LISTING_SELECT_FOR_SPONSORED = `
  listing:marketplace_listings!listing_promotions_listing_id_fkey (
    id, title, description, photos, price, category_id, listing_type,
    business_name, views_count, saves_count, contacts_count,
    is_featured, trending_score, status, refreshed_at, created_at,
    owner:users!marketplace_listings_owner_id_fkey (
      id, full_name, trust_level, profile_photo
    ),
    category:marketplace_categories!marketplace_listings_category_id_fkey (
      id, name, slug, emoji, icon, color
    )
  )
`;
```

to:

```typescript
const LISTING_SELECT_FOR_SPONSORED = `
  listing:marketplace_listings!listing_promotions_listing_id_fkey (
    id, title, description, photos, price, category_id, listing_type,
    business_name, views_count, saves_count, contacts_count,
    trending_score, status, refreshed_at, created_at,
    owner:users!marketplace_listings_owner_id_fkey (
      id, full_name, trust_level, profile_photo
    ),
    category:marketplace_categories!marketplace_listings_category_id_fkey (
      id, name, slug, emoji, icon, color
    )
  )
`;
```

Note: this intentionally continues to embed via the base table `marketplace_listings` (not the view), because sponsored listings don't need `is_featured` on their card. Avoids the FK-through-view risk entirely.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @nepally/shared typecheck`
Expected: PASS.

- [ ] **Step 3: Run shared tests (full package)**

Run: `pnpm --filter @nepally/shared test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/api/promotions.ts
git commit -m "refactor: drop is_featured from sponsored listing select"
```

---

## Task 8: Scope `expire-promotions` edge function to `source = 'paid'`

**Files:**
- Modify: `supabase/functions/expire-promotions/index.ts`

**Why:** After migration 022, `premium_perk` rows have `end_date = NULL` and must never be expired by the job. Additionally, the existing logic that writes `is_featured = false` on the base table must go — the column no longer exists.

- [ ] **Step 1: Replace the file contents**

Overwrite `supabase/functions/expire-promotions/index.ts` with:

```typescript
// Supabase Edge Function: expire-promotions
// Runs hourly via cron to expire paid promotions past their end date.
// Premium-perk promotions (source = 'premium_perk') have end_date IS NULL
// and are never touched by this job — they are managed by the user premium
// cascade trigger in migration 022.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    console.log('Starting promotion expiration job...');

    // Find active paid promotions past their end date.
    // Premium_perk rows are excluded explicitly by source filter.
    const { data: expired, error: fetchError } = await supabase
      .from('listing_promotions')
      .select('id')
      .eq('status', 'active')
      .eq('source', 'paid')
      .lte('end_date', now);

    if (fetchError) {
      console.error('Error fetching expired promotions:', fetchError);
      throw fetchError;
    }

    if (!expired || expired.length === 0) {
      console.log('No promotions to expire');
      return new Response(
        JSON.stringify({ success: true, message: 'No promotions to expire', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${expired.length} expired paid promotions`);

    const expiredIds = expired.map((p) => p.id);

    const { error: updateError } = await supabase
      .from('listing_promotions')
      .update({ status: 'expired' })
      .in('id', expiredIds);

    if (updateError) {
      console.error('Error expiring promotions:', updateError);
      throw updateError;
    }

    // No is_featured write-back: featured status is derived on read via
    // marketplace_listings_view. Updating promotion status alone is enough.

    console.log(`Successfully expired ${expiredIds.length} paid promotions`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Expired ${expiredIds.length} promotions`,
        count: expiredIds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in expire-promotions:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/expire-promotions/index.ts
git commit -m "refactor: scope expire-promotions to paid source, drop is_featured writeback"
```

---

## Task 9: Run the full shared workspace test suite

**Files:** none modified

- [ ] **Step 1: Run the shared package tests**

Run: `pnpm --filter @nepally/shared test`
Expected: PASS, no failures.

If any test fails because a mock chain lacks a method the new code calls, fix the mock chain (add the missing `.eq`, `.order`, etc. stub) — do **not** revert the production code. Common mock fix: extending the `chain` object to return `this` from any new method call.

- [ ] **Step 2: Run the shared typecheck**

Run: `pnpm --filter @nepally/shared typecheck`
Expected: PASS.

- [ ] **Step 3: Commit any mock fixes**

```bash
git add packages/shared/src/api/marketplace.test.ts
git commit -m "test: extend mock chains for marketplace view queries"
```

(Skip this step if no changes were needed.)

---

## Task 10: Run the web app test suite

**Files:** none modified

- [ ] **Step 1: Run web tests**

Run: `pnpm --filter @nepally/web test`
Expected: PASS.

If tests fail because of `is_featured` type strictness (e.g., a component prop that was `MarketplaceListing` and now sees `is_featured` as potentially undefined), the fix is in the consuming component: treat the value as `!!listing.is_featured` at the comparison site. Do not re-add a default to the type.

- [ ] **Step 2: Run web typecheck**

Run: `pnpm --filter @nepally/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit any fixes**

```bash
git add apps/web/src
git commit -m "fix: handle optional is_featured in web marketplace components"
```

(Skip if no changes were needed.)

---

## Task 11: Run the mobile app test suite

**Files:** none modified

- [ ] **Step 1: Run mobile tests**

Run: `pnpm --filter @nepally/mobile test`
Expected: PASS.

- [ ] **Step 2: Run mobile typecheck**

Run: `pnpm --filter @nepally/mobile typecheck`
Expected: PASS.

Same remediation rule as Task 10 if anything fails on optional `is_featured`.

- [ ] **Step 3: Commit any fixes**

```bash
git add apps/mobile/src
git commit -m "fix: handle optional is_featured in mobile marketplace components"
```

(Skip if no changes were needed.)

---

## Task 12: Monorepo-wide green check

**Files:** none modified

- [ ] **Step 1: Run the root test script**

Run: `pnpm test` (from repo root).
Expected: PASS across all workspaces.

- [ ] **Step 2: Run the root typecheck if one exists**

Check `package.json` scripts at repo root. If a `typecheck` script exists, run `pnpm typecheck`. Otherwise skip.
Expected: PASS.

- [ ] **Step 3: No commit** — this task is a verification gate only.

---

## Task 13: Apply migration 022 and verify live

**Files:** none modified directly; database state changes.

**Pre-requisites:** Tasks 1–12 complete and all tests green. The migration must not be applied before the code is in place — otherwise running code would try to read a non-existent `is_featured` column on the base table.

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP `apply_migration` tool with the contents of `supabase/migrations/022_drop_is_featured.sql`. If using CLI instead: `supabase db push` from the project root.

Expected output: successful apply, no errors. If errors, fix the migration SQL and re-apply — do **not** work around by modifying the already-partly-applied state by hand.

- [ ] **Step 2: Verify column is dropped**

Run via Supabase SQL editor or MCP `execute_sql`:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'marketplace_listings' AND column_name = 'is_featured';
```

Expected: 0 rows.

- [ ] **Step 3: Verify view exists and returns computed is_featured**

```sql
SELECT id, is_featured FROM marketplace_listings_view LIMIT 5;
```

Expected: rows return with a boolean `is_featured` column.

- [ ] **Step 4: Verify backfilled premium_perk rows**

```sql
SELECT count(*) FROM listing_promotions
WHERE source = 'premium_perk' AND promotion_type = 'featured_listing' AND status = 'active';
```

Expected: equals the count of active listings owned by premium users.

- [ ] **Step 5: Spot-check `getFeaturedListings` end-to-end**

Open the marketplace page in a browser (web app) pointed at the database. Confirm the "Featured" strip renders listings that are owned by premium users. There should be no console/network errors from the embed.

If the `getSavedListingsByUser` embed through the view fails (FK hint risk from Task 6), it will show up as a query error in the profile "Saved" tab. If so:
- Revert the `marketplace_listings_view!saved_listings_listing_id_fkey` embed in [packages/shared/src/api/marketplace.ts](../../packages/shared/src/api/marketplace.ts) to `marketplace_listings!saved_listings_listing_id_fkey`.
- Callers of `getSavedListingsByUser` don't currently render a featured badge from saved results, so losing `is_featured` on this path is acceptable.
- Re-run Task 9 tests and adjust the test for `getSavedListingsByUser` if it asserts the view.

- [ ] **Step 6: Spot-check premium cascade**

In a staging environment, toggle a test user's `is_premium` from true to false and back. Verify that their `premium_perk` rows transition `active → cancelled → active`, and that the marketplace view reflects the change.

```sql
UPDATE users SET is_premium = FALSE WHERE email = 'staging-test@example.com';
SELECT source, status FROM listing_promotions WHERE user_id = '<test-user-id>';
-- Expect premium_perk rows now 'cancelled'.

UPDATE users SET is_premium = TRUE WHERE email = 'staging-test@example.com';
SELECT source, status FROM listing_promotions WHERE user_id = '<test-user-id>';
-- Expect the same rows flipped back to 'active' (unique index prevented duplicates).
```

Do **not** run this on production data.

- [ ] **Step 7: No commit for the apply step itself.** The migration file commit from Task 1 is the git-tracked artifact. If Step 5 required code changes, commit them separately:

```bash
git add packages/shared/src/api/marketplace.ts packages/shared/src/api/marketplace.test.ts
git commit -m "fix: revert saved-listings embed to base table (view FK hint unresolved)"
```

---

## Task 14: Clean up obsolete spec reference in memory and docs

**Files:** none strictly required, but recommended.

- [ ] **Step 1: Verify no grep hits remain**

Run from repo root:

```bash
grep -rn "is_featured" supabase/migrations/022_drop_is_featured.sql supabase/functions/expire-promotions packages/shared/src apps/web/src apps/mobile/src 2>/dev/null | grep -v "\.test\." | grep -v "022_drop_is_featured"
```

Expected: only the migration file itself and test mocks should mention `is_featured`. No production reads or writes. Any unexpected hit means a read path was missed — fix it and loop back through Tasks 9–12.

- [ ] **Step 2: No commit unless Step 1 surfaced issues.**

---

## Verification summary

A successful run leaves the repo in this state:

- `marketplace_listings.is_featured` column no longer exists.
- `listing_promotions.source` column with values `paid` / `premium_perk`.
- Premium users' active listings each have one `premium_perk` row; toggling premium cancels/reactivates them.
- `marketplace_listings_view` returns a computed `is_featured` that tracks active `featured_listing` promotions.
- All shared API reads hit the view; all writes hit the base table.
- `expire-promotions` edge function only touches `source = 'paid'`.
- Shared, web, and mobile test suites pass.
- No production code references `is_featured` outside the migration, view definition, and TS type (now optional).
