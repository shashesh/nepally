---
title: Fix promotions display
status: implemented
created: 2026-04-13
spec: docs/archive/specs/2026-04-13-fix-promotions-display.md
---

# Fix Promotions Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the RLS bug that blocks non-owners from seeing `sponsored_feed` promotions, push the metro filter server-side to prevent LIMIT exhaustion, and add the `featured_listing` carousel strip to category pages on both mobile and web.

**Architecture:** Three independent changes — a DB migration for RLS, two API function fixes in the shared package, and two UI screen additions. Changes flow from DB → shared API → UI. Each task is independently testable.

**Tech Stack:** Supabase SQL (migrations), TypeScript, Vitest (shared/web), Jest + RNTL (mobile)

---

## File Map

| File | Action |
|------|--------|
| `supabase/migrations/024_fix_promotions_rls_and_feed.sql` | Create — RLS policy |
| `packages/shared/src/api/promotions.ts` | Modify — server-side metro filter in `getSponsoredFeedListings` + `getStickyBusinessListings` |
| `packages/shared/src/api/promotions.test.ts` | Modify — update metro filter tests + add server-side filter assertions |
| `packages/shared/src/api/marketplace.ts` | Modify — `categorySlug` param on `getFeaturedListings` |
| `packages/shared/src/api/marketplace.test.ts` | Modify — new `getFeaturedListings` category tests |
| `apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.tsx` | Modify — featured strip |
| `apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.test.tsx` | Modify — 3 new test cases |
| `apps/web/src/pages/marketplace/[category].page.tsx` | Modify — featured strip |
| `apps/web/src/pages/marketplace/[category].test.tsx` | Modify — 3 new test cases |

---

## Task 1: Migration 024 — Fix RLS on listing_promotions

**Files:**
- Create: `supabase/migrations/024_fix_promotions_rls_and_feed.sql`

**Background:** The only SELECT policy on `listing_promotions` is `USING (user_id = auth.uid())`. PostgREST ORs multiple SELECT policies — adding a second policy for active promotions means any authenticated user can read active rows, while the existing policy still lets owners read their own rows in any status (for management UI). No existing policies need to change.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/024_fix_promotions_rls_and_feed.sql
-- Additive change: second SELECT policy so all authenticated users can read
-- active promotions for display purposes (home feed, category strips, sticky rail).
--
-- Postgres ORs multiple SELECT policies on the same table, so both policies
-- coexist safely:
--   - "Users can read own promotions"  → owners can see their promotions in any status
--   - this new policy                  → all auth users can see active promotions

CREATE POLICY "All users can read active promotions for display"
  ON listing_promotions FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND (end_date IS NULL OR end_date > now())
  );
```

- [ ] **Step 2: Verify file was created**

```bash
ls supabase/migrations/024_fix_promotions_rls_and_feed.sql
```

Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/024_fix_promotions_rls_and_feed.sql
git commit -m "fix: add RLS policy so non-owners can read active listing_promotions"
```

---

## Task 2: Fix server-side metro filter in promotions.ts + update tests

**Files:**
- Modify: `packages/shared/src/api/promotions.ts:102-132` (`getSponsoredFeedListings`)
- Modify: `packages/shared/src/api/promotions.ts:138-167` (`getStickyBusinessListings`)
- Modify: `packages/shared/src/api/promotions.test.ts`

**Background:** Both functions currently fetch the top N promotions globally and then filter by `metro_area_id` in JavaScript. If all N rows belong to another city, valid local promotions are missed. Fix: add `.filter()` calls to the Supabase query before `.limit()` so the DB does the work. Remove the post-query JS filter.

- [ ] **Step 1: Write failing tests first**

Replace the existing `getSponsoredFeedListings` describe block in `packages/shared/src/api/promotions.test.ts` with:

```ts
// ─── getSponsoredFeedListings ──────────────────────────────────────────────

describe('getSponsoredFeedListings', () => {
  it('passes metro_area_id filter to the DB query', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [MOCK_SPONSORED], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getSponsoredFeedListings(supabase, 'metro-1', { limit: 5 });

    expect(chain.filter).toHaveBeenCalledWith('marketplace_listings.metro_area_id', 'eq', 'metro-1');
    expect(chain.filter).toHaveBeenCalledWith('marketplace_listings.status', 'eq', 'active');
  });

  it('returns listings from DB response', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [MOCK_SPONSORED], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getSponsoredFeedListings(supabase, 'metro-1', { limit: 5 });
    expect(result.data).toHaveLength(1);
  });

  it('returns empty array when DB returns no active promotions', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getSponsoredFeedListings(supabase, 'metro-1');
    expect(result.data).toEqual([]);
    expect(result.error).toBeUndefined();
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: new Error('fail') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getSponsoredFeedListings(supabase, 'metro-1');
    expect(result.error).toBeDefined();
  });
});

// ─── getStickyBusinessListings ─────────────────────────────────────────────

describe('getStickyBusinessListings', () => {
  it('passes metro_area_id filter to the DB query', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getStickyBusinessListings(supabase, 'metro-99');

    expect(chain.filter).toHaveBeenCalledWith('marketplace_listings.metro_area_id', 'eq', 'metro-99');
    expect(chain.filter).toHaveBeenCalledWith('marketplace_listings.status', 'eq', 'active');
  });

  it('returns listings from DB response', async () => {
    const stickyItem = { ...MOCK_SPONSORED, promotion_type: 'sticky_business' };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [stickyItem], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getStickyBusinessListings(supabase, 'metro-1');
    expect(result.data).toHaveLength(1);
  });

  it('returns empty array when DB returns no active promotions', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getStickyBusinessListings(supabase, 'metro-1');
    expect(result.data).toEqual([]);
    expect(result.error).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test --workspace=packages/shared -- promotions.test.ts
```

Expected: FAIL — `filter` is not a method / `chain.filter` was not called.

- [ ] **Step 3: Implement the fix in promotions.ts**

Replace the body of `getSponsoredFeedListings` (lines ~109–131) with:

```ts
export async function getSponsoredFeedListings(
  supabase: SupabaseClient,
  metroId: string,
  options: { limit?: number } = {}
): Promise<SponsoredListingsResult> {
  const { limit = 5 } = options;
  try {
    const { data, error } = await supabase
      .from('listing_promotions')
      .select(`id, promotion_type, ${LISTING_SELECT_FOR_SPONSORED}`)
      .eq('promotion_type', 'sponsored_feed')
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .filter('marketplace_listings.metro_area_id', 'eq', metroId)
      .filter('marketplace_listings.status', 'eq', 'active')
      .limit(limit);

    if (error) throw error;
    return { data: (data ?? []) as unknown as SponsoredListing[] };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch sponsored feed listings') };
  }
}
```

Replace the body of `getStickyBusinessListings` (lines ~138–167) with:

```ts
export async function getStickyBusinessListings(
  supabase: SupabaseClient,
  metroId: string,
  options: { limit?: number } = {}
): Promise<SponsoredListingsResult> {
  const { limit = 5 } = options;
  try {
    const { data, error } = await supabase
      .from('listing_promotions')
      .select(`id, promotion_type, ${LISTING_SELECT_FOR_SPONSORED}`)
      .eq('promotion_type', 'sticky_business')
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .filter('marketplace_listings.metro_area_id', 'eq', metroId)
      .filter('marketplace_listings.status', 'eq', 'active')
      .limit(limit);

    if (error) throw error;
    return { data: (data ?? []) as unknown as SponsoredListing[] };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch sticky business listings') };
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test --workspace=packages/shared -- promotions.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/api/promotions.ts packages/shared/src/api/promotions.test.ts
git commit -m "fix: push metro filter server-side in getSponsoredFeedListings and getStickyBusinessListings"
```

---

## Task 3: Add categorySlug param to getFeaturedListings + tests

**Files:**
- Modify: `packages/shared/src/api/marketplace.ts:153-156` (`StripOptions`) and `:162-186` (`getFeaturedListings`)
- Modify: `packages/shared/src/api/marketplace.test.ts`

**Background:** Category pages need to call `getFeaturedListings` scoped to their category. Currently `StripOptions` has no `categorySlug`. The fix mirrors `getListingsByMetro`'s existing join-filter + client-side null-check pattern.

- [ ] **Step 1: Write failing tests first**

Add these two new test cases to the `getFeaturedListings` describe block in `packages/shared/src/api/marketplace.test.ts` (after the existing 3 tests):

```ts
  it('applies category slug filter when categorySlug is provided', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [MOCK_LISTING], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getFeaturedListings(supabase, 'metro-1', { categorySlug: 'food-restaurants', limit: 10 });

    expect(chain.eq).toHaveBeenCalledWith('category.slug', 'food-restaurants');
  });

  it('strips null-category rows when categorySlug is provided', async () => {
    const listingWithCategory = { ...MOCK_LISTING, category: { id: 'cat-1', slug: 'food-restaurants' } };
    const listingNullCategory = { ...MOCK_LISTING, id: 'listing-2', category: null };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [listingWithCategory, listingNullCategory], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getFeaturedListings(supabase, 'metro-1', { categorySlug: 'food-restaurants' });
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].id).toBe('listing-1');
  });

  it('does not apply category filter when categorySlug is absent', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [MOCK_LISTING], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getFeaturedListings(supabase, 'metro-1');

    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    const slugCall = eqCalls.find((c) => c[0] === 'category.slug');
    expect(slugCall).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test --workspace=packages/shared -- marketplace.test.ts
```

Expected: FAIL — `chain.eq` not called with `'category.slug'`.

- [ ] **Step 3: Implement the fix in marketplace.ts**

Replace the `StripOptions` interface (line 153):

```ts
export interface StripOptions {
  limit?: number;
  offset?: number;
  categorySlug?: string;
}
```

Replace the `getFeaturedListings` function body (lines ~162–186):

```ts
export async function getFeaturedListings(
  supabase: SupabaseClient,
  metroId: string,
  opts: StripOptions = {}
): Promise<ListingsResult> {
  try {
    const limit = opts.limit ?? 10;
    const offset = opts.offset ?? 0;

    let query = supabase
      .from('marketplace_listings_view')
      .select(LISTING_SELECT)
      .eq('status', 'active')
      .eq('metro_area_id', metroId)
      .eq('is_featured', true)
      .order('refreshed_at', { ascending: false });

    if (opts.categorySlug) {
      query = query.eq('category.slug', opts.categorySlug);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    let rows = (data || []) as MarketplaceListing[];
    if (opts.categorySlug) {
      rows = rows.filter((l) => l.category != null);
    }

    return { data: rows, hasMore: rows.length === limit };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to fetch featured listings') };
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test --workspace=packages/shared -- marketplace.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/api/marketplace.ts packages/shared/src/api/marketplace.test.ts
git commit -m "feat: add optional categorySlug param to getFeaturedListings"
```

---

## Task 4: Featured strip on mobile MarketplaceCategoryScreen + tests

**Files:**
- Modify: `apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.tsx`
- Modify: `apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.test.tsx`

**Background:** The screen has no featured strip today. Add `featuredListings` state, fetch it in parallel with `getListingsByMetro` on initial load / pull-to-refresh (offset=0, non-search), and render a `ListingStrip` as the first item in `ListHeaderComponent`. Uses the existing `mountedRef` cancel-guard pattern already present in the file. Per mobile CLAUDE.md: use `waitFor` not `act()` for async `useEffect` tests.

- [ ] **Step 1: Write failing tests first**

Add these to `apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.test.tsx`:

**First**, add `getFeaturedListings` to the shared mock imports (at the top of the file, update existing import and mock):

```ts
// Update this import line:
import { getCategories, getListingsByMetro, getFeaturedListings } from '@nepally/shared';

// Update the jest.mock('@nepally/shared', ...) block:
jest.mock('@nepally/shared', () => ({
  getListingsByMetro: jest.fn(async () => ({ data: [] })),
  getCategories: jest.fn(async () => ({ data: [] })),
  getFeaturedListings: jest.fn(async () => ({ data: [] })),
}));

// Add after the existing mockGetCategories line:
const mockGetFeaturedListings = getFeaturedListings as jest.MockedFunction<typeof getFeaturedListings>;
```

**Second**, add a `ListingStrip` mock after the existing FilterBar mock:

```ts
jest.mock('../../components/marketplace/ListingStrip', () => {
  const { View, Text } = jest.requireActual('react-native');
  const ReactLocal = jest.requireActual('react');
  type MockListing = { id: string; title: string };
  return {
    ListingStrip: ({ title, listings }: { title: string; listings: MockListing[] }) =>
      ReactLocal.createElement(
        View,
        { testID: `strip-${title.toLowerCase()}` },
        ReactLocal.createElement(Text, null, `strip:${title}:${listings.length}`)
      ),
  };
});
```

**Third**, update the `beforeEach` in `describe('MarketplaceCategoryScreen')` to reset `mockGetFeaturedListings`:

```ts
beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', full_name: 'Test User', trust_level: 1, metro_area_id: 'metro-1' },
  });
  mockRouteParams.mockReturnValue({
    categorySlug: 'food-restaurants',
    categoryName: 'Food & Restaurants',
  });
  mockGetCategories.mockResolvedValue({ data: [FOOD_CATEGORY, PRO_CATEGORY] });
  mockGetListingsByMetro.mockResolvedValue({ data: [MOCK_LISTING] });
  mockGetFeaturedListings.mockResolvedValue({ data: [] });  // default: no featured
});
```

**Fourth**, add the 3 new test cases inside the describe block:

```ts
  it('renders ListingStrip when getFeaturedListings returns listings', async () => {
    mockGetFeaturedListings.mockResolvedValue({ data: [MOCK_LISTING] });
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('strip:Featured:1')).toBeTruthy();
    });
    expect(mockGetFeaturedListings).toHaveBeenCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ categorySlug: 'food-restaurants', limit: 10 })
    );
  });

  it('does not render featured strip in search mode', async () => {
    mockRouteParams.mockReturnValue({
      categorySlug: '__search__',
      categoryName: 'Search: biryani',
    });
    mockGetFeaturedListings.mockResolvedValue({ data: [MOCK_LISTING] });
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('Search Results')).toBeTruthy();
    });
    expect(screen.queryByText(/strip:Featured/)).toBeNull();
    expect(mockGetFeaturedListings).not.toHaveBeenCalled();
  });

  it('does not render featured strip when getFeaturedListings returns empty', async () => {
    mockGetFeaturedListings.mockResolvedValue({ data: [] });
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
    expect(screen.queryByText(/strip:Featured/)).toBeNull();
  });
```

- [ ] **Step 2: Run tests to confirm new ones fail**

```bash
npm run test:ci --workspace=apps/mobile -- MarketplaceCategoryScreen.test.tsx
```

Expected: 3 new tests FAIL — `getFeaturedListings` is not called / strip not rendered.

- [ ] **Step 3: Implement the featured strip in MarketplaceCategoryScreen.tsx**

**Update imports** (add `getFeaturedListings`, `ListingStrip`):

```ts
import {
  getCategories,
  getListingsByMetro,
  getFeaturedListings,
  type MarketplaceCategory,
  type MarketplaceListing,
} from '@nepally/shared';
// ...existing imports...
import { ListingStrip } from '../../components/marketplace/ListingStrip';
```

**Add `featuredListings` state** (after the `hasMore` state line):

```ts
const [featuredListings, setFeaturedListings] = useState<MarketplaceListing[]>([]);
```

**Add `handleItemPress` callback** (after the `mountedRef` / unmount effect):

```ts
const handleItemPress = useCallback(
  (listing: MarketplaceListing) =>
    navigation.navigate('ListingDetail', { listingId: listing.id }),
  [navigation]
);
```

**Replace `fetchListings`** with the parallel version:

```ts
const fetchListings = useCallback(
  async (offset = 0, isRefresh = false) => {
    if (!metroId) {
      setLoading(false);
      return;
    }

    try {
      const [result, featuredResult] = await Promise.all([
        getListingsByMetro(supabase, metroId, {
          categorySlug: filters.category || undefined,
          searchQuery: filters.query || undefined,
          sortBy: filters.sort,
          limit: PAGE_SIZE,
          offset,
        }),
        offset === 0 && !isSearchMode
          ? getFeaturedListings(supabase, metroId, {
              categorySlug: filters.category || undefined,
              limit: 10,
            })
          : Promise.resolve({ data: [] as MarketplaceListing[] }),
      ]);

      if (!mountedRef.current) return;

      if (result.data) {
        if (isRefresh || offset === 0) {
          setListings(result.data);
        } else {
          setListings((prev) => [...prev, ...result.data!]);
        }
        setHasMore(result.data.length === PAGE_SIZE);
      }

      if (offset === 0 && !isSearchMode && featuredResult.data) {
        setFeaturedListings(featuredResult.data);
      }
    } catch {
      // Silently handle — empty listings will surface in the UI.
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  },
  [metroId, filters, isSearchMode]
);
```

**Add `ListHeaderComponent` to the `FlatList`** (insert before `ListFooterComponent`):

```tsx
ListHeaderComponent={
  featuredListings.length > 0 ? (
    <ListingStrip
      title="Featured"
      titleIcon="⭐"
      listings={featuredListings}
      onItemPress={handleItemPress}
      onShowAll={() => {}}
      maxItems={10}
    />
  ) : null
}
```

- [ ] **Step 4: Run all mobile tests to confirm pass**

```bash
npm run test:ci --workspace=apps/mobile -- MarketplaceCategoryScreen.test.tsx
```

Expected: All tests PASS including the 3 new ones.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.tsx \
        apps/mobile/src/screens/marketplace/MarketplaceCategoryScreen.test.tsx
git commit -m "feat: add featured listings carousel strip to mobile category screen"
```

---

## Task 5: Featured strip on web category page + tests

**Files:**
- Modify: `apps/web/src/pages/marketplace/[category].page.tsx`
- Modify: `apps/web/src/pages/marketplace/[category].test.tsx`

**Background:** The web category page has no pagination (single `getListingsByMetro` call, no offset). Add `featuredListings` state, fetch in parallel with `getListingsByMetro` when `!isSearch`, and render `<ListingStrip>` above the listing grid. Same `vi.hoisted` mock pattern as the rest of the file.

- [ ] **Step 1: Write failing tests first**

**In `apps/web/src/pages/marketplace/[category].test.tsx`:**

First, add `getFeaturedListings` to the hoisted mocks object (update the `vi.hoisted` block):

```ts
const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
  getListingsByMetro: vi.fn(),
  getFeaturedListings: vi.fn(),   // ← add this
  useCachedCategories: vi.fn(),
}));
```

Add `getFeaturedListings` to the `@nepally/shared` mock (update the `vi.mock('@nepally/shared', ...)` block):

```ts
vi.mock('@nepally/shared', () => ({
  getListingsByMetro: mocks.getListingsByMetro,
  getFeaturedListings: mocks.getFeaturedListings,   // ← add this
  MARKETPLACE_CATEGORIES: [
    { slug: 'food-restaurants', name: 'Food & Restaurants', emoji: '🍜', icon: 'restaurant', color: '#FF6B35' },
    { slug: 'professional-services', name: 'Professional Services', emoji: '💼', icon: 'briefcase', color: '#2196F3' },
  ],
}));
```

Add a `ListingStrip` mock (add after the `vi.mock('../../lib/supabase', ...)` line):

```ts
vi.mock('../../components/marketplace/ListingStrip', () => ({
  ListingStrip: ({ title, listings }: { title: string; listings: { id: string }[] }) =>
    React.createElement(
      'div',
      { 'data-testid': `strip-${title.toLowerCase()}` },
      `strip:${title}:${listings.length}`
    ),
}));
```

Update the `beforeEach` to reset `getFeaturedListings`:

```ts
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getListingsByMetro.mockResolvedValue({ data: [MOCK_LISTING] });
  mocks.getFeaturedListings.mockResolvedValue({ data: [] });   // ← add this
  mocks.useCachedCategories.mockReturnValue([MOCK_CATEGORY]);
});
```

Add the 3 new test cases inside `describe('MarketplaceCategoryPage')`:

```ts
  it('renders ListingStrip when getFeaturedListings returns listings', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    mocks.getFeaturedListings.mockResolvedValue({ data: [MOCK_LISTING] });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByText('strip:Featured:1')).toBeDefined();
    });
    expect(mocks.getFeaturedListings).toHaveBeenCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ categorySlug: 'food-restaurants', limit: 10 })
    );
  });

  it('does not render featured strip in search mode', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter({ category: 'search', q: 'momo' }));
    mocks.getFeaturedListings.mockResolvedValue({ data: [MOCK_LISTING] });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Search: momo/ })).toBeDefined();
    });
    expect(screen.queryByText(/strip:Featured/)).toBeNull();
    expect(mocks.getFeaturedListings).not.toHaveBeenCalled();
  });

  it('does not render featured strip when getFeaturedListings returns empty', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    mocks.getFeaturedListings.mockResolvedValue({ data: [] });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeDefined();
    });
    expect(screen.queryByText(/strip:Featured/)).toBeNull();
  });
```

- [ ] **Step 2: Run tests to confirm new ones fail**

```bash
npm run test --workspace=apps/web -- "[category].test.tsx"
```

Expected: 3 new tests FAIL.

- [ ] **Step 3: Implement the featured strip in [category].page.tsx**

**Update imports** — add `getFeaturedListings` to the `@nepally/shared` import, and add `ListingStrip` import:

```ts
import {
  getListingsByMetro,
  getFeaturedListings,
  MARKETPLACE_CATEGORIES,
  type ListingSortBy,
  type MarketplaceListing,
} from '@nepally/shared';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { FilterBar, type FilterBarValue } from '../../components/marketplace/FilterBar';
import { ListingStrip } from '../../components/marketplace/ListingStrip';
```

**Add `featuredListings` state** (after the `loading` state line):

```ts
const [featuredListings, setFeaturedListings] = useState<MarketplaceListing[]>([]);
```

**Replace `fetchListings`** with the parallel version:

```ts
const fetchListings = useCallback(async () => {
  if (!metroId || !router.isReady) return;
  setLoading(true);

  const [result, featuredResult] = await Promise.all([
    getListingsByMetro(supabase, metroId, {
      categorySlug: isSearch ? undefined : slug,
      searchQuery: q || undefined,
      sortBy: sort,
      limit: PAGE_SIZE,
    }),
    !isSearch
      ? getFeaturedListings(supabase, metroId, { categorySlug: slug, limit: 10 })
      : Promise.resolve({ data: [] as MarketplaceListing[] }),
  ]);

  if (result.data) setListings(result.data);
  if (!isSearch && featuredResult.data) setFeaturedListings(featuredResult.data);
  setLoading(false);
}, [metroId, slug, q, sort, isSearch, router.isReady]);
```

**Add `<ListingStrip>` to the JSX** — insert before the `{loading ? ...}` block:

```tsx
{!isSearch && featuredListings.length > 0 && (
  <ListingStrip
    title="Featured"
    titleIcon="⭐"
    listings={featuredListings}
    maxItems={10}
  />
)}

{loading ? (
```

- [ ] **Step 4: Run all web tests to confirm pass**

```bash
npm run test --workspace=apps/web -- "[category].test.tsx"
```

Expected: All tests PASS including the 3 new ones.

- [ ] **Step 5: Run full monorepo test suite**

```bash
npm run ci:local
```

Expected: All workspaces pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/marketplace/[category].page.tsx \
        apps/web/src/pages/marketplace/[category].test.tsx
git commit -m "feat: add featured listings carousel strip to web category page"
```

---

## Done

All 5 tasks complete. The branch `feat/drop-is-featured-column` now contains:

- Migration 024 fixing the RLS gap that blocked non-owners from seeing `sponsored_feed` promotions
- Server-side metro filtering in `getSponsoredFeedListings` and `getStickyBusinessListings`
- Optional `categorySlug` on `getFeaturedListings`
- Featured carousel strip on the mobile category screen
- Featured carousel strip on the web category page

**Manual staging verification (after applying migration 024):**

1. Log in as User B (not the promotion owner) — confirm a `sponsored_feed` promotion by User A appears in the home feed
2. Open a category page that has an active `featured_listing` promotion — confirm the ⭐ Featured strip appears above regular results
3. Open the search results page — confirm the strip is absent
