---
title: Promote listing feature
status: implemented
created: 2026-03-20
---

# Promote Listing — Implementation Plan

**Plan Version:** v1
**Date:** 2026-04-09
**Owner:** Shashesh
**Status:** Planned
**Primary Spec/Wireframe:** N/A (spec defined inline)

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
| 1 | DB Migration (020_promotions.sql) | Shashesh | Completed | 2026-04-09 | |
| 2 | Shared Types | Shashesh | Completed | 2026-04-09 | |
| 3 | Shared Constants | Shashesh | Completed | 2026-04-09 | |
| 4 | Shared Validation | Shashesh | Completed | 2026-04-09 | |
| 5 | Shared API Functions | Shashesh | Completed | 2026-04-09 | |
| 6 | Shared Utils (formatCurrency, addDays) | Shashesh | Completed | 2026-04-09 | |
| 7 | Shared Unit Tests | Shashesh | Completed | 2026-04-09 | |
| 8 | Edge Function: create-promotion-checkout (PaymentIntent + Checkout) | Shashesh | Completed | 2026-04-09 | Mobile: PaymentIntent, Web: Checkout Session |
| 9 | Edge Function: stripe-webhook | Shashesh | Completed | 2026-04-09 | Handles both payment_intent.succeeded + checkout.session.completed |
| 10 | Edge Function: expire-promotions | Shashesh | Completed | 2026-04-09 | |
| 11 | Mobile: Navigation + PromoteListingScreen | Shashesh | Completed | 2026-04-09 | |
| 12 | Mobile: Entry Points (ListingDetail, MyListings) | Shashesh | Completed | 2026-04-09 | |
| 13 | Mobile: Home Feed + Marketplace Sponsored Injection | Shashesh | Completed | 2026-04-09 | |
| 14 | Mobile: Tests | Shashesh | Completed | 2026-04-09 | |
| 15 | Web: Promote Wizard Page + Success Page | Shashesh | Completed | 2026-04-09 | |
| 16 | Web: Entry Points (ListingDetail, MyListings) | Shashesh | Completed | 2026-04-09 | |
| 17 | Web: Feed + Marketplace Sponsored Injection | Shashesh | Completed | 2026-04-09 | |
| 18 | Web: Tests | Shashesh | Completed | 2026-04-09 | |
| 19 | Polish: Promotion Badges + Edge Cases | Shashesh | Completed | 2026-04-09 | |

---

## 1) Objective

Allow marketplace listing owners to pay for increased visibility through a multi-step "Promote Listing" wizard (inspired by Instagram's "Boost Post" flow). Three promotion tiers offer different visibility placements: top of marketplace search, injection into the home feed, and a fixed sponsored ads section. This is the app's first payment integration (Stripe).

---

## 2) Scope and Non-Goals

### In Scope
- Three promotion tiers: Featured Listing, Sponsored Feed, Sticky Business
- 4-step wizard UI (Select Type -> Duration -> Review & Pay -> Confirmation)
- Stripe Checkout Sessions for one-time payments
- Webhook-driven status activation
- Automatic expiration via cron Edge Function
- Sponsored listing injection into home feed and marketplace
- Promotion badges on listing cards
- Mobile (React Native) and Web (Next.js) implementations
- Unit tests for shared logic

### Out of Scope
- Recurring subscriptions or auto-renewal
- Refund/cancellation self-service (manual for now)
- Full analytics dashboard (basic views delta is in-scope; detailed dashboard with charts/trends is not)
- A/B testing of promotion placement
- Admin panel for managing promotions
- Push notifications for promotion expiration
- Promotion for non-marketplace content (posts, events)

---

## 3) Preconditions / Findings

1. **No existing payment infrastructure** — no Stripe, billing, or subscription code exists anywhere in the codebase. This is a greenfield payment integration.
2. **`is_featured` column exists** — migration 018 added `is_featured` boolean to `marketplace_listings`, auto-set by premium user trigger. The promotion feature must coexist with this.
3. **Latest migration is 019** (`019_event_interested.sql`) — next migration is 020.
4. **Home feed is posts-only** — `HomeScreen.tsx` (mobile) and `feed.page.tsx` (web) only show posts. Sponsored marketplace listings will be injected client-side.
5. **Marketplace redesign complete** — Featured/Recent/Trending strips, FilterBar, and ListingCard components are all implemented on both platforms.
6. **CreateEventScreen pattern** — existing 863-line single-screen multi-step form is the reference pattern for the wizard.
7. **`@stripe/stripe-react-native`** will be used for mobile payments (Payment Sheet) — no deep link redirect needed.
8. **`app.json` scheme** is currently `"nusa"` (old name) — will be updated to `"nepally"` as housekeeping.
9. **Trust level gate**: Only Level 1+ users can promote listings (prevents new-account spam).

### Pre-Implementation Freshness Gate (Required)

- [x] No feature spec exists yet (this plan serves as the spec)
- [x] No user journey doc exists yet (defined in this plan)
- [x] No wireframe exists yet (component-level design described in steps)
- [x] No conflicting requirements across sources

---

## 4) Architecture Rules (Must Pass)

- Shared-first: all non-UI logic goes to `packages/shared/src/**`.
- Platform-only code stays in app workspaces.
- Preserve existing naming conventions and return shapes (`{ data?, error? }`).
- Add/update tests for every new or changed behavior.
- Web: CSS Modules only, no inline `style={{}}`.
- Mobile: `StyleSheet.create()` only, no inline style objects.
- Database types use snake_case matching Supabase column names.
- API functions accept `SupabaseClient` as first parameter (dependency injection).

---

## 5) Implementation Plan

### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Payment gateway | Stripe Payment Sheet (mobile) + Stripe Checkout (web) | Mobile: native embedded sheet via `@stripe/stripe-react-native` — no redirect, supports Apple/Google Pay; Web: Stripe Checkout redirect — simplest browser flow |
| Webhook handler | Supabase Edge Function | Matches existing edge function patterns; service role key for DB updates |
| Mobile wizard UX | Single screen with step state (1-4) | Matches CreateEventScreen pattern; avoids complex param passing |
| Web wizard UX | Single page with step state | Same pattern, consistent across platforms |
| `is_featured` sync | DB trigger on `listing_promotions` | Zero changes to existing marketplace read queries; premium trigger preserved |
| Promotion expiration | Edge Function cron (hourly) + client-side `end_date` guard | Dual-layer ensures correctness |
| Stripe on mobile | `@stripe/stripe-react-native` Payment Sheet | Native UX, no redirect/deep-link needed, Apple/Google Pay support |
| Trust level gate | Level 1+ required to promote | Prevents spam from unverified accounts |
| Promotion analytics | Track views during promotion period | Stored in existing `views_count`; delta calculated from snapshot at start |
| Feed injection | New `getSponsoredFeedListings` API; client-side interleaving | Keeps existing feed query unchanged |

---

### Step 1 — Database Migration

**Goal**
- Create the `listing_promotions` table with all supporting infrastructure

**Deliverables**
- `supabase/migrations/020_promotions.sql`

**Schema**

```sql
CREATE TYPE promotion_type AS ENUM ('featured_listing', 'sponsored_feed', 'sticky_business');
CREATE TYPE promotion_status AS ENUM ('pending', 'active', 'expired', 'cancelled');

CREATE TABLE listing_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promotion_type promotion_type NOT NULL,
  status promotion_status NOT NULL DEFAULT 'pending',
  duration_days INTEGER NOT NULL CHECK (duration_days >= 1 AND duration_days <= 90),
  daily_cost_cents INTEGER NOT NULL,
  total_cost_cents INTEGER NOT NULL,
  start_date TIMESTAMPTZ,        -- NULL until payment confirmed
  end_date TIMESTAMPTZ,          -- NULL until payment confirmed
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  views_at_start INTEGER,            -- snapshot of listing views_count at activation (for analytics)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes**

```sql
-- Active promotions lookup (query-time filtering)
CREATE INDEX idx_promotions_listing_active
  ON listing_promotions (listing_id, promotion_type)
  WHERE status = 'active';

-- Expiration cron: find expired promotions
CREATE INDEX idx_promotions_expiration
  ON listing_promotions (end_date)
  WHERE status = 'active';

-- User's promotion history
CREATE INDEX idx_promotions_user
  ON listing_promotions (user_id, created_at DESC);
```

**RLS Policies**

```sql
ALTER TABLE listing_promotions ENABLE ROW LEVEL SECURITY;

-- Users can read their own promotions
CREATE POLICY "Users can read own promotions"
  ON listing_promotions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert promotions for their own listings only (Level 1+ trust required)
CREATE POLICY "Users can create promotions for own listings"
  ON listing_promotions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM marketplace_listings
      WHERE id = listing_id AND owner_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND trust_level >= 1
    )
  );

-- No client-side UPDATE policy. Webhook uses service role (bypasses RLS).
```

**Triggers**

```sql
-- Sync is_featured when a featured_listing promotion activates
CREATE OR REPLACE FUNCTION sync_promotion_featured()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.promotion_type = 'featured_listing' THEN
    IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status <> 'active') THEN
      UPDATE marketplace_listings SET is_featured = TRUE WHERE id = NEW.listing_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER trg_promotion_sync_featured
  AFTER INSERT OR UPDATE OF status ON listing_promotions
  FOR EACH ROW
  EXECUTE FUNCTION sync_promotion_featured();

-- Reuse existing updated_at trigger function
CREATE TRIGGER set_promotions_updated_at
  BEFORE UPDATE ON listing_promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Tests / Validation**
- Apply migration via `apply_migration` MCP tool or `psql`

**Exit Criteria**
- Table, indexes, policies, and triggers exist in Supabase
- RLS allows authenticated users to SELECT own rows and INSERT for own listings
- `is_featured` syncs when promotion status changes to `active`

---

### Step 2 — Shared Types

**Goal**
- Define TypeScript interfaces for promotions matching database schema

**Deliverables**
- `packages/shared/src/types/promotion.ts`

**Type Definitions**

```typescript
export type PromotionType = 'featured_listing' | 'sponsored_feed' | 'sticky_business';
export type PromotionStatus = 'pending' | 'active' | 'expired' | 'cancelled';

export interface ListingPromotion {
  id: string;
  listing_id: string;
  user_id: string;
  promotion_type: PromotionType;
  status: PromotionStatus;
  duration_days: number;
  daily_cost_cents: number;
  total_cost_cents: number;
  start_date: string | null;
  end_date: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  views_at_start: number | null;
  created_at: string;
  updated_at: string;
}

export interface PromotionTierConfig {
  type: PromotionType;
  name: string;
  description: string;
  daily_cost_cents: number;
  benefits: string[];
  icon: string;       // Ionicons name (mobile) / icon identifier
  color: string;      // Hex color for tier theming
}
```

**File Changes**
- NEW: `packages/shared/src/types/promotion.ts`
- MODIFY: `packages/shared/src/types/index.ts` — add `export * from './promotion';`

**Exit Criteria**
- Types compile with `tsc --noEmit`
- Exported from `@nepally/shared`

---

### Step 3 — Shared Constants

**Goal**
- Define promotion tier configurations, pricing, and limits as constants

**Deliverables**
- `packages/shared/src/constants/promotions.ts`

**Constants**

```typescript
export const PROMOTION_TIERS: PromotionTierConfig[] = [
  {
    type: 'featured_listing',
    name: 'Featured Listing',
    description: 'Boost to top of marketplace search & category pages',
    daily_cost_cents: 199,  // $1.99/day
    benefits: [
      'Appear at the top of search results',
      'Featured badge on your listing',
      'Priority in category pages',
      'Get 5x more views',
    ],
    icon: 'star',
    color: '#FF9800',
  },
  {
    type: 'sponsored_feed',
    name: 'Sponsored Feed',
    description: 'Appear in the main Home Page scroll feed',
    daily_cost_cents: 299,  // $2.99/day
    benefits: [
      'Injected into the home feed for all local users',
      'Sponsored label badge',
      'Reach users who don\'t visit marketplace',
      'Get 10x more visibility',
    ],
    icon: 'megaphone',
    color: '#1565C0',
  },
  {
    type: 'sticky_business',
    name: 'Sticky Business',
    description: 'Fixed placement in Sponsored Ads section',
    daily_cost_cents: 499,  // $4.99/day
    benefits: [
      'Persistent visibility on every page load',
      'Premium placement in sidebar/header',
      'Maximum brand exposure',
      'Always-on advertising',
    ],
    icon: 'pin',
    color: '#DC143C',
  },
];

export const MIN_PROMOTION_DAYS = 1;
export const MAX_PROMOTION_DAYS = 90;
export const DEFAULT_PROMOTION_DAYS = 7;
export const SPONSORED_FEED_INJECTION_INTERVAL = 10; // inject 1 sponsored card every N posts
```

**File Changes**
- NEW: `packages/shared/src/constants/promotions.ts`
- MODIFY: `packages/shared/src/constants/index.ts` (or barrel) — add export

**Exit Criteria**
- Constants exported from `@nepally/shared`
- Type-safe (PromotionTierConfig interface enforced)

---

### Step 4 — Shared Validation

**Goal**
- Zod schema for promotion creation input

**Deliverables**
- `packages/shared/src/validation/promotion.ts`

**Schema**

```typescript
import { z } from 'zod';
import { MIN_PROMOTION_DAYS, MAX_PROMOTION_DAYS } from '../constants/promotions';

export const createPromotionSchema = z.object({
  listing_id: z.string().uuid('Invalid listing ID'),
  promotion_type: z.enum(['featured_listing', 'sponsored_feed', 'sticky_business']),
  duration_days: z
    .number()
    .int('Duration must be a whole number')
    .min(MIN_PROMOTION_DAYS, `Minimum ${MIN_PROMOTION_DAYS} day`)
    .max(MAX_PROMOTION_DAYS, `Maximum ${MAX_PROMOTION_DAYS} days`),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
```

**File Changes**
- NEW: `packages/shared/src/validation/promotion.ts`
- MODIFY: `packages/shared/src/validation/index.ts` — add `export * from './promotion';`

**Exit Criteria**
- Schema rejects invalid inputs (bad UUIDs, out-of-range days, invalid types)
- `CreatePromotionInput` type inferred correctly

---

### Step 5 — Shared API Functions

**Goal**
- CRUD and query functions for promotions, following existing `{ data?, error? }` pattern

**Deliverables**
- `packages/shared/src/api/promotions.ts`

**Functions**

| Function | Purpose |
|----------|---------|
| `getActivePromotionForListing(supabase, listingId)` | Check if listing has any active promotion (disable "Promote" button) |
| `getPromotionsByUser(supabase, userId)` | User's promotion history (for account/settings) |
| `getPromotionById(supabase, promotionId)` | Single promotion detail (confirmation screen) |
| `getSponsoredFeedListings(supabase, metroId, { limit })` | Listings with active `sponsored_feed` promo — JOIN `listing_promotions` + `marketplace_listings` |
| `getStickyBusinessListings(supabase, metroId, { limit })` | Listings with active `sticky_business` promo |
| `createPromotionCheckout(supabaseUrl, authToken, input, platform)` | Calls `create-promotion-checkout` Edge Function; mobile returns `{ clientSecret, promotionId }`, web returns `{ checkoutUrl, promotionId }` |
| `getPromotionAnalytics(supabase, promotionId)` | Returns promotion details + views delta (`current views_count - views_at_start`) |

**Query pattern for sponsored listings:**
```typescript
const { data, error } = await supabase
  .from('listing_promotions')
  .select(`
    id,
    promotion_type,
    listing:marketplace_listings!listing_promotions_listing_id_fkey (
      id, title, description, photos, price, category_id, listing_type,
      business_name, views_count, saves_count, contacts_count,
      is_featured, trending_score, status, refreshed_at, created_at,
      owner:users!marketplace_listings_owner_id_fkey (
        id, full_name, trust_level, profile_photo
      ),
      category:marketplace_categories!marketplace_listings_category_id_fkey (
        id, name, slug, emoji, color
      )
    )
  `)
  .eq('promotion_type', 'sponsored_feed')
  .eq('status', 'active')
  .gte('end_date', new Date().toISOString())
  .order('created_at', { ascending: false })
  .limit(limit);
```

**File Changes**
- NEW: `packages/shared/src/api/promotions.ts`
- MODIFY: `packages/shared/src/api/index.ts` — add `export * from './promotions';`
- MODIFY: `packages/shared/src/index.ts` — ensure promotions re-exported

**Exit Criteria**
- All functions follow SupabaseClient injection pattern
- Return `{ data?, error? }` consistently
- Client-side `end_date` guard on sponsored/featured queries

---

### Step 6 — Shared Utils

**Goal**
- Add currency formatting and date arithmetic helpers

**Deliverables**
- Add to existing `packages/shared/src/utils/date.ts`

**Functions**

```typescript
/** Format cents as USD string: 199 -> "$1.99" */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Add days to a date, returning new Date */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
```

**File Changes**
- MODIFY: `packages/shared/src/utils/date.ts`

**Exit Criteria**
- `formatCurrency(199)` returns `"$1.99"`
- `addDays` returns correct future date without mutating input

---

### Step 7 — Shared Unit Tests

**Goal**
- Test validation, API functions (mocked supabase), and utility functions

**Deliverables**
- `packages/shared/src/validation/promotion.test.ts`
- `packages/shared/src/api/promotions.test.ts`
- `packages/shared/src/utils/date.test.ts` (add tests for new functions)

**Test Coverage**
- Validation: valid input passes, invalid UUID rejected, duration out of range rejected, invalid type rejected
- API: mock supabase client, verify correct table/filter/select calls
- Utils: formatCurrency edge cases (0, large values), addDays correctness

**Tests / Validation**
- `npm run test --workspace=packages/shared`

**Exit Criteria**
- All tests pass
- Validation and util functions have >80% branch coverage

---

### Step 8 — Edge Function: create-promotion-checkout

**Goal**
- Server-side function that validates the request, creates a pending promotion row, and returns payment details for both mobile and web clients

**Deliverables**
- `supabase/functions/create-promotion-checkout/index.ts`

**Flow**
1. Authenticate request (extract user from JWT)
2. Validate input with `createPromotionSchema`
3. Verify user owns the listing
4. Verify user trust_level >= 1 (reject Level 0 users)
5. Check no active promotion of the same type exists on this listing
6. Look up `daily_cost_cents` from `PROMOTION_TIERS` constant
7. Compute `total_cost_cents = daily_cost_cents * duration_days`
8. Insert `listing_promotions` row with `status = 'pending'`
9. **Branching by `platform` parameter:**
   - **Mobile (`platform: 'mobile'`):** Create Stripe PaymentIntent → return `{ clientSecret, promotionId }`
   - **Web (`platform: 'web'`):** Create Stripe Checkout Session → return `{ checkoutUrl, promotionId }`
10. Both paths store `stripe_payment_intent_id` / `stripe_checkout_session_id` on the promotion row
11. Both paths set `metadata: { promotion_id, listing_id, user_id }` on the Stripe object

**Environment Variables**
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY` (returned to mobile client for Payment Sheet initialization)

**File Changes**
- NEW: `supabase/functions/create-promotion-checkout/index.ts`

**Exit Criteria**
- Mobile: returns valid `clientSecret` + `STRIPE_PUBLISHABLE_KEY`
- Web: returns valid Stripe Checkout URL
- Promotion row created with `pending` status
- Rejects: non-owner, trust level 0, duplicate active promo, invalid input

---

### Step 9 — Edge Function: stripe-webhook

**Goal**
- Handle Stripe webhook events to activate or cancel promotions

**Deliverables**
- `supabase/functions/stripe-webhook/index.ts`

**Handled Events**

| Event | Source | Action |
|-------|--------|--------|
| `payment_intent.succeeded` | Mobile (Payment Sheet) | Set promo `status = 'active'`, `start_date = now()`, `end_date = now() + duration_days`, snapshot `views_at_start` from listing's current `views_count` |
| `checkout.session.completed` | Web (Checkout) | Same as above — extract payment_intent from session, activate promo |
| `checkout.session.expired` | Web (Checkout) | Set promo `status = 'cancelled'` |

**Security**
- Verify webhook signature with `STRIPE_WEBHOOK_SECRET`
- Use Supabase service role client (bypasses RLS) for DB updates

**Environment Variables**
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

**File Changes**
- NEW: `supabase/functions/stripe-webhook/index.ts`

**Exit Criteria**
- `checkout.session.completed` activates promotion and sets dates
- `is_featured` trigger fires automatically for `featured_listing` type
- Invalid signatures rejected with 400

---

### Step 10 — Edge Function: expire-promotions

**Goal**
- Hourly cron that expires promotions past their end date

**Deliverables**
- `supabase/functions/expire-promotions/index.ts`

**Logic**
1. Query `listing_promotions WHERE status = 'active' AND end_date <= now()`
2. Set `status = 'expired'` on each
3. For `featured_listing` type: reset `marketplace_listings.is_featured = FALSE` **only if** the listing owner's `is_premium = FALSE` (preserve premium auto-feature)
4. Return count of expired promotions

**Schedule**: Every hour via Supabase cron or external scheduler

**File Changes**
- NEW: `supabase/functions/expire-promotions/index.ts`

**Exit Criteria**
- Expired promotions transition to `expired` status
- `is_featured` reset only for non-premium owners
- Function is idempotent (safe to run multiple times)

---

### Step 11 — Mobile: Navigation + PromoteListingScreen

**Goal**
- Build the 4-step promotion wizard as a single screen on mobile

**Deliverables**
- `apps/mobile/src/screens/marketplace/PromoteListingScreen.tsx`

**Navigation Changes**
- Add to `MarketplaceStackParamList`: `PromoteListing: { listingId: string }`
- Register in `MarketplaceNavigator.tsx` with `presentation: 'modal'`

**Wizard Steps (single screen, step state variable)**

**Step 1 — Select Type:**
- 3 selectable cards, each showing: icon (Ionicons), tier name, daily cost (formatted), description, benefits list
- Selected card highlighted with tier color border
- "Continue" button enabled when a tier is selected

**Step 2 — Set Duration:**
- Numeric TextInput for days (default: 7, min: 1, max: 90)
- +/- stepper buttons for quick adjustment
- Real-time display: Total Cost = `formatCurrency(daily_cost_cents * days)`
- Projected End Date = `addDays(now, days)` formatted
- "Continue" button

**Step 3 — Review & Pay:**
- Summary card: tier name, duration, total cost, start/end dates
- Listing preview (title + photo thumbnail)
- "Pay $X.XX" button -> calls `createPromotionCheckout(platform: 'mobile')` -> receives `clientSecret` -> opens Stripe Payment Sheet via `@stripe/stripe-react-native`
- Loading state while creating payment intent
- On Payment Sheet success -> navigate to Step 4
- On Payment Sheet cancel/failure -> show error, stay on Step 3
- Trust level check: if user is Level 0, show message "Verify your account to promote listings" instead of pay button

**Step 4 — Confirmation:**
- Success state: checkmark icon, "Boost Active!" heading
- Promotion details summary
- Polls `getPromotionById` until status = `active` (webhook may have slight delay)
- "View Listing" button -> navigates back to ListingDetail

**Progress indicator**: Step dots at top (1-4) with active/completed states

**File Changes**
- MODIFY: `apps/mobile/src/types/navigation.ts` — add `PromoteListing` route
- MODIFY: `apps/mobile/src/navigation/MarketplaceNavigator.tsx` — register screen
- NEW: `apps/mobile/src/screens/marketplace/PromoteListingScreen.tsx`

**Exit Criteria**
- All 4 steps render correctly
- Total cost updates in real-time on day change
- Stripe Payment Sheet opens natively (no browser redirect)
- Trust level 0 users see verification prompt instead of pay button
- All styles via `StyleSheet.create()` with design tokens

---

### Step 12 — Mobile: Entry Points

**Goal**
- Add "Promote" buttons to listing detail and my-listings screens

**Deliverables**
- "Promote" button on ListingDetailScreen (owner-only)
- "Promote" action on MyListingsScreen listing cards

**ListingDetailScreen changes:**
- Add a "Promote" button in the owner action bar (near Edit/Deactivate)
- Only visible when `listing.owner_id === userId`
- Disabled if listing already has an active promotion (check via `getActivePromotionForListing`)
- Navigates to `PromoteListing` with `{ listingId }`
- Icon: `megaphone-outline` (Ionicons)

**MyListingsScreen changes:**
- Add "Promote" option to each listing card's action area
- Same disable logic for active promotions
- Navigates to `PromoteListing`

**File Changes**
- MODIFY: `apps/mobile/src/screens/marketplace/ListingDetailScreen.tsx`
- MODIFY: `apps/mobile/src/screens/marketplace/MyListingsScreen.tsx`

**Exit Criteria**
- "Promote" button visible only for listing owner
- Disabled state when active promotion exists
- Navigation works correctly

---

### Step 13 — Mobile: Home Feed + Marketplace Sponsored Injection

**Goal**
- Inject sponsored listings into the home feed and add a sticky business section to marketplace

**Deliverables**
- Sponsored feed listings in HomeScreen
- Sticky business strip in MarketplaceHomeScreen

**HomeScreen changes:**
- After fetching posts, also call `getSponsoredFeedListings(supabase, metroAreaId, { limit: 5 })`
- Interleave: insert 1 sponsored `ListingCard` after every `SPONSORED_FEED_INJECTION_INTERVAL` posts
- Wrap sponsored cards with a "Sponsored" badge/label
- Handle case where no sponsored listings exist (no injection)

**MarketplaceHomeScreen changes:**
- Add a "Sponsored" `ListingStrip` above the existing "Featured" strip
- Fetch from `getStickyBusinessListings(supabase, metroAreaId, { limit: 5 })`
- Only render the strip if results are non-empty
- Cards show "Sponsored" badge

**File Changes**
- MODIFY: `apps/mobile/src/screens/HomeScreen.tsx`
- MODIFY: `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.tsx`

**Exit Criteria**
- Sponsored listings appear in home feed at correct intervals
- Sticky business strip appears on marketplace home when data exists
- "Sponsored" badge clearly visible
- No feed disruption when no sponsored listings exist

---

### Step 14 — Mobile: Tests

**Goal**
- Unit tests for PromoteListingScreen

**Deliverables**
- `apps/mobile/src/screens/marketplace/PromoteListingScreen.test.tsx`

**Test Cases**
- Renders step 1 with 3 tier cards
- Selecting a tier enables "Continue"
- Step 2 shows correct total cost calculation
- Duration input respects min/max bounds
- Step 3 shows correct summary
- Back button returns to previous step
- Mock `createPromotionCheckout` and verify it's called with correct params

**Tests / Validation**
- `npm run test --workspace=apps/mobile`
- Follow `apps/mobile/CLAUDE.md` testing patterns (no `act()` for async components)

**Exit Criteria**
- All tests pass
- Tests follow TESTING-PATTERNS.md conventions

---

### Step 15 — Web: Promote Wizard Page + Success Page

**Goal**
- Build the 4-step wizard and Stripe redirect success page for web

**Deliverables**
- `apps/web/src/pages/marketplace/listing/[id]/promote.page.tsx`
- `apps/web/src/pages/marketplace/listing/[id]/promote-success.page.tsx`
- `apps/web/src/pages/marketplace/listing/promote.module.css`

**Wizard** (same 4 steps as mobile):
- Mantine components for inputs (NumberInput, Button, Card)
- CSS Modules for layout and styling, CSS custom properties for tokens
- Step 3 "Pay" button redirects via `window.location.href = checkoutUrl`
- Responsive layout (mobile-friendly at 320px+)

**Success Page:**
- Reads `promotion_id` from query params (Stripe `success_url` includes it)
- Polls `getPromotionById` until status is `active` (webhook may have slight delay)
- Shows success state with promotion summary
- Link back to listing detail

**File Changes**
- NEW: `apps/web/src/pages/marketplace/listing/[id]/promote.page.tsx`
- NEW: `apps/web/src/pages/marketplace/listing/[id]/promote-success.page.tsx`
- NEW: `apps/web/src/pages/marketplace/listing/promote.module.css`

**Exit Criteria**
- Wizard renders all 4 steps
- Stripe redirect works
- Success page shows confirmation after webhook processes
- No inline styles, all CSS Modules

---

### Step 16 — Web: Entry Points

**Goal**
- Add "Promote" buttons to web listing detail and my-listings pages

**File Changes**
- MODIFY: `apps/web/src/pages/marketplace/listing/[id].page.tsx` — "Promote" button for owner
- MODIFY: `apps/web/src/pages/marketplace/my-listings.page.tsx` — "Promote" action per card

**Exit Criteria**
- "Promote" button navigates to `/marketplace/listing/[id]/promote`
- Disabled when active promotion exists

---

### Step 17 — Web: Feed + Marketplace Sponsored Injection

**Goal**
- Inject sponsored listings into web home feed and marketplace

**File Changes**
- MODIFY: `apps/web/src/pages/feed.page.tsx` — interleave sponsored ListingCards
- MODIFY: `apps/web/src/pages/marketplace/index.page.tsx` — add sponsored strip above featured

**Exit Criteria**
- Same behavior as mobile (sponsored feed injection + sticky business strip)
- "Sponsored" badge visible
- Graceful empty state

---

### Step 18 — Web: Tests

**Deliverables**
- Tests for promote wizard page

**Tests / Validation**
- `npm run test --workspace=apps/web`

**Exit Criteria**
- All tests pass

---

### Step 19 — Polish: Promotion Badges + Edge Cases

**Goal**
- Visual badges on promoted listings and edge case handling

**Deliverables**
- "Sponsored" / "Featured (Promoted)" badge on ListingCard (mobile + web)
- "Active Promotion" indicator on MyListings screens
- Edge case handling

**Edge Cases**
- Listing deactivated while promotion active: promotion stays in DB but listing hidden from queries (existing `status = 'active'` filter handles this)
- Stripe checkout abandoned: status stays `pending`, no charge, no activation
- User tries to promote a listing that already has an active promo: blocked at UI level (disabled button) and server level (edge function check)
- Promotion expires between page loads: client-side `end_date > now()` guard prevents stale display

**File Changes**
- MODIFY: `apps/mobile/src/components/marketplace/ListingCard.tsx` — add promotion badge
- MODIFY: `apps/web/src/components/marketplace/ListingCard.tsx` — add promotion badge
- MODIFY: `apps/mobile/src/screens/marketplace/MyListingsScreen.tsx` — active promo indicator
- MODIFY: `apps/web/src/pages/marketplace/my-listings.page.tsx` — active promo indicator

**Exit Criteria**
- Promoted listings are visually distinct
- All edge cases handled gracefully

---

## 6) Testing Strategy (Required)

### Change Classification
- **New functionality:** Promotions (types, validation, API, UI, edge functions)

### Test Plan Matrix

| Area | Change Type | Required Tests | File Targets |
|------|-------------|----------------|--------------|
| Shared types/constants | New | Compile-time validation | `packages/shared/` (tsc) |
| Shared validation | New | Unit tests | `packages/shared/src/validation/promotion.test.ts` |
| Shared API | New | Unit tests (mocked) | `packages/shared/src/api/promotions.test.ts` |
| Shared utils | New | Unit tests | `packages/shared/src/utils/date.test.ts` |
| Mobile wizard | New | Unit tests | `apps/mobile/src/screens/marketplace/PromoteListingScreen.test.tsx` |
| Web wizard | New | Unit tests | `apps/web/src/pages/marketplace/listing/[id]/promote.test.tsx` |

### Coverage and Quality Gates
- [ ] New logic paths have unit tests
- [ ] Modified logic paths have updated tests
- [ ] No failing tests in touched workspaces

---

## 7) Data Contract Snapshot

### `listing_promotions` table

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| id | UUID | gen_random_uuid() | PRIMARY KEY |
| listing_id | UUID | | NOT NULL, FK -> marketplace_listings(id) CASCADE |
| user_id | UUID | | NOT NULL, FK -> users(id) CASCADE |
| promotion_type | promotion_type (enum) | | NOT NULL |
| status | promotion_status (enum) | 'pending' | NOT NULL |
| duration_days | INTEGER | | NOT NULL, CHECK 1-90 |
| daily_cost_cents | INTEGER | | NOT NULL |
| total_cost_cents | INTEGER | | NOT NULL |
| start_date | TIMESTAMPTZ | | NULL until payment |
| end_date | TIMESTAMPTZ | | NULL until payment |
| stripe_checkout_session_id | TEXT | | |
| stripe_payment_intent_id | TEXT | | |
| views_at_start | INTEGER | | NULL until activation; snapshot for analytics |
| created_at | TIMESTAMPTZ | now() | |
| updated_at | TIMESTAMPTZ | now() | auto-updated by trigger |

### Promotion tier pricing (constants, not DB)

| Tier | daily_cost_cents | Example 7-day total |
|------|-----------------|---------------------|
| Featured Listing | 199 ($1.99) | $13.93 |
| Sponsored Feed | 299 ($2.99) | $20.93 |
| Sticky Business | 499 ($4.99) | $34.93 |

---

## 8) File Checklist

### New Files
- `supabase/migrations/020_promotions.sql`
- `packages/shared/src/types/promotion.ts`
- `packages/shared/src/constants/promotions.ts`
- `packages/shared/src/validation/promotion.ts`
- `packages/shared/src/api/promotions.ts`
- `packages/shared/src/validation/promotion.test.ts`
- `packages/shared/src/api/promotions.test.ts`
- `supabase/functions/create-promotion-checkout/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/expire-promotions/index.ts`
- `apps/mobile/src/screens/marketplace/PromoteListingScreen.tsx`
- `apps/mobile/src/screens/marketplace/PromoteListingScreen.test.tsx`
- `apps/web/src/pages/marketplace/listing/[id]/promote.page.tsx`
- `apps/web/src/pages/marketplace/listing/[id]/promote-success.page.tsx`
- `apps/web/src/pages/marketplace/listing/promote.module.css`

### Modified Files
- `packages/shared/src/types/index.ts`
- `packages/shared/src/validation/index.ts`
- `packages/shared/src/api/index.ts`
- `packages/shared/src/utils/date.ts`
- `packages/shared/src/utils/date.test.ts`
- `packages/shared/src/index.ts`
- `apps/mobile/src/types/navigation.ts`
- `apps/mobile/src/navigation/MarketplaceNavigator.tsx`
- `apps/mobile/src/screens/marketplace/ListingDetailScreen.tsx`
- `apps/mobile/src/screens/marketplace/MyListingsScreen.tsx`
- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.tsx`
- `apps/mobile/src/components/marketplace/ListingCard.tsx`
- `apps/web/src/pages/marketplace/listing/[id].page.tsx`
- `apps/web/src/pages/marketplace/my-listings.page.tsx`
- `apps/web/src/pages/feed.page.tsx`
- `apps/web/src/pages/marketplace/index.page.tsx`
- `apps/web/src/components/marketplace/ListingCard.tsx`

---

## 9) Verification Matrix (Definition of Done)

### Automated
- [ ] `npm run test --workspace=packages/shared`
- [ ] `npm run test --workspace=apps/mobile`
- [ ] `npm run test --workspace=apps/web`
- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run test` (monorepo-wide)

### Manual
- [ ] Create listing -> tap "Promote" -> complete all 4 wizard steps
- [ ] Verify Stripe test mode checkout completes
- [ ] Verify promotion activates after webhook (check DB status = 'active')
- [ ] Verify featured listing appears at top of marketplace search
- [ ] Verify sponsored listing appears in home feed
- [ ] Verify sticky business appears in marketplace sponsored section
- [ ] Verify "Promoted" badge on listing cards
- [ ] Verify "Promote" button disabled when active promotion exists
- [ ] Verify promotion expires correctly (set end_date to past, run expire function)
- [ ] Verify `is_featured` resets on expiry (non-premium owner only)
- [ ] Test on both mobile and web

### Plan Hygiene
- [ ] Live step tracker statuses are fully up to date
- [ ] Any blocked step has explicit blocker + next action

---

## 10) Risks + Mitigations

- **Risk:** Stripe webhook delivery delay causes user to see "pending" on confirmation screen
  - **Mitigation:** Success page polls `getPromotionById` every 2s for up to 30s; show "Processing payment..." state

- **Risk:** `is_featured` conflict between premium trigger and promotion trigger
  - **Mitigation:** Expiration function checks `is_premium` before resetting `is_featured`; premium trigger only sets TRUE, never FALSE

- **Risk:** Stripe Checkout URL expires (24h default) while promotion row stays `pending`
  - **Mitigation:** `checkout.session.expired` webhook sets status to `cancelled`; periodic cleanup of stale pending rows

- **Risk:** User deactivates listing while promotion is active (wasted money)
  - **Mitigation:** Show warning dialog before deactivating a listing with active promotion; promotion continues but listing not shown (existing active filter)

- **Risk:** Edge Function cold start delays webhook processing
  - **Mitigation:** Stripe retries webhooks for up to 3 days; idempotent handler

---

## 11) Operational Readiness (Suggested)

- [ ] Stripe test mode keys configured in Supabase Edge Function secrets
- [ ] Stripe webhook endpoint registered in Stripe Dashboard
- [ ] `expire-promotions` cron scheduled (hourly)
- [ ] Rollback: migration is additive-only (DROP TABLE to rollback, no data loss for other tables)
- [ ] No feature flag needed (promotion UI only visible to listing owners)
- [ ] Logging: Edge Functions log key events (checkout created, webhook received, promotion activated/expired)
- [ ] Stripe test card numbers documented for QA

---

## 12) Open Questions (All Resolved)

- ~~Exact pricing for each tier~~ — **Confirmed: $1.99 / $2.99 / $4.99 per day**
- ~~Minimum trust level to promote?~~ — **Yes, Level 1+ only.** Enforced at RLS policy level and UI level (Level 0 users see verification prompt)
- ~~Promotion analytics (views during promotion)?~~ — **Yes.** `views_at_start` snapshot stored at activation; delta = `current views_count - views_at_start`
- ~~Deep link for Stripe success redirect on mobile?~~ — **Not needed.** Using `@stripe/stripe-react-native` Payment Sheet instead of Stripe Checkout redirect. Payment completes natively in-app with no redirect. Web still uses Stripe Checkout with normal URL redirect.

---

## 13) Handoff Commands

```bash
npm install
npm run test --workspace=packages/shared
npm run test --workspace=apps/mobile
npm run test --workspace=apps/web
npm run lint
npm run type-check
npm run test
```
