# Mobile Marketplace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Git policy (project CLAUDE.md):** Never commit on `master` — always verify the branch first. Commits on a feature branch do NOT require permission; commit freely as each task completes. `git push` ALWAYS requires explicit user confirmation — pause at the end of the plan (or whenever the user asks) and summarize what will be pushed before running `git push`.
>
> **Note on per-task checkpoint wording:** Some individual task steps below say "ask the user before running `git commit`" — those were written before the current git policy was adopted. The header policy supersedes them. Future plans should not duplicate that wording.

**Goal:** Redesign the mobile marketplace home screen around a denser editorial grid, tab-driven sort, persistent search, category tiles, and a marketplace-hub bottom sheet menu — replacing the current four-strip stacked layout.

**Architecture:** Rewrite `MarketplaceHomeScreen.tsx` around new UI primitives in `apps/mobile/src/components/marketplace/` (`ListingGridCard`, `ListingGridCardSkeleton`, `MarketplaceSearchBar`, `CategoryTileRow`, `MarketplaceTabs`, `MarketplaceMenuSheet`, `MarketplaceEmptyState`). Pure business logic (`formatListingFreshness`, `injectSponsoredIntoGrid`) goes to `packages/shared/src/logic/marketplace/` per Shared-First rule. Two new screens (`BrowseCategoriesScreen`, `MarketplaceRulesScreen`) and one data screen (`SavedListingsScreen`) are wired through `MarketplaceNavigator`. No database migrations, no new dependencies.

**Tech Stack:** React Native 0.81 / Expo 54, React 19.1, TypeScript 5.3, `@react-navigation/native-stack`, Jest 29 + React Native Testing Library v13, `@expo/vector-icons`, `expo-image`, `expo-linear-gradient`, `@nepally/shared`.

**Spec:** [docs/specs/2026-04-14-mobile-marketplace-redesign-design.md](../../specs/2026-04-14-mobile-marketplace-redesign-design.md)

---

## File Structure

### New files (`packages/shared/src/`)
- `logic/marketplace/freshness.ts` — pure function `formatListingFreshness(createdAt): string`
- `logic/marketplace/freshness.test.ts`
- `logic/marketplace/sponsoredInjection.ts` — pure function `injectSponsoredIntoGrid(...)`
- `logic/marketplace/sponsoredInjection.test.ts`

### New files (`apps/mobile/src/`)
- `styles/warmTokens.ts` — new warm-community surface/border/radius/shadow/accent tokens
- `components/marketplace/ListingGridCard.tsx` + `.test.tsx`
- `components/marketplace/ListingGridCardSkeleton.tsx`
- `components/marketplace/MarketplaceSearchBar.tsx`

> **Dropped from spec (YAGNI):** `ListingStripCard` had no v1 consumer — `SavedListingsScreen` reuses `ListingGridCard` in a 2-column layout. Build `ListingStripCard` when a screen actually needs the 72×72 horizontal variant.
- `components/marketplace/CategoryTileRow.tsx` + `.test.tsx`
- `components/marketplace/MarketplaceTabs.tsx` + `.test.tsx`
- `components/marketplace/MarketplaceMenuSheet.tsx` + `.test.tsx`
- `components/marketplace/MarketplaceEmptyState.tsx`
- `screens/marketplace/BrowseCategoriesScreen.tsx` + `.test.tsx`
- `screens/marketplace/MarketplaceRulesScreen.tsx`
- `screens/marketplace/SavedListingsScreen.tsx` + `.test.tsx`

### Modified files
- `packages/shared/src/index.ts` — re-export new logic helpers
- `apps/mobile/src/types/navigation.ts` — add new route params
- `apps/mobile/src/navigation/MarketplaceNavigator.tsx` — register new routes
- `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.tsx` — full rewrite
- `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.test.tsx` — rewrite assertions for new layout

### Untouched (explicit)
- `supabase/migrations/` — no new migrations
- `apps/web/**` — web redesign already shipped on `feat/marketplace-listing-details-enhancement`
- `apps/mobile/src/components/marketplace/ListingCard.tsx` — kept for `MarketplaceCategoryScreen` backward compat
- `apps/mobile/src/screens/marketplace/ListingDetailScreen.tsx`, `CreateListingScreen.tsx`, `MyListingsScreen.tsx`, `PromoteListingScreen.tsx`, `MarketplaceCategoryScreen.tsx` — out of scope
- `packages/shared/src/api/marketplace.ts` — save API already exists (`saveListing`, `unsaveListing`, `getUserSavedListingIds`, `getSavedListingsByUser`); no changes needed

---

## Task 1: Add warm-community design tokens

**Files:**
- Create: `apps/mobile/src/styles/warmTokens.ts`

- [ ] **Step 1: Create the warm tokens module**

```ts
/**
 * Warm Community tokens for the marketplace surface.
 *
 * These are additive extensions to styles/colors.ts and styles/spacing.ts.
 * They MUST NOT replace existing tokens — other screens still rely on them.
 * Only the marketplace screens consume these.
 */
import type { TextStyle, ViewStyle } from 'react-native';

export const warmSurface = {
  canvas: '#FBF7F1',   // warm off-white screen background
  card: '#FFFFFF',     // card surface pops against canvas
} as const;

export const warmAccent = {
  warm: '#C8451C',       // terracotta — price, filled save heart, active tab underline
  warmPressed: '#A63814',
  warmSoft: '#F4E3DC',   // chip background for category dots on soft surfaces
} as const;

export const warmBorder = {
  hairline: 'rgba(20,14,8,0.08)',
} as const;

export const warmRadius = {
  card: 14,
  tile: 10,
  sheet: 20,
} as const;

export const warmShadow: ViewStyle = {
  shadowColor: '#140E08',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const warmDisplaySm: TextStyle = {
  fontSize: 16,
  fontWeight: '700',
  letterSpacing: -0.2,
};
```

- [ ] **Step 2: Verify the file typechecks**

Run: `npx tsc --noEmit -p apps/mobile`
Expected: no errors introduced by the new file. If existing errors exist, confirm the new file is not the cause (grep output for `warmTokens.ts`).

- [ ] **Step 3: Checkpoint (ask user before committing)**

Staged files: `apps/mobile/src/styles/warmTokens.ts`

Proposed commit message:
```
feat(mobile): add warm-community design tokens for marketplace
```

**Do not run `git commit` — ask the user:** "Task 1 adds the warm-community tokens module. Stage and commit with the message above?"

---

## Task 2: `formatListingFreshness` shared helper

**Files:**
- Create: `packages/shared/src/logic/marketplace/freshness.test.ts`
- Create: `packages/shared/src/logic/marketplace/freshness.ts`
- Modify: `packages/shared/src/index.ts` (add export)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from '@jest/globals';
import { formatListingFreshness } from './freshness';

describe('formatListingFreshness', () => {
  const NOW = new Date('2026-04-14T12:00:00Z').getTime();

  it('returns "just now" for timestamps under one minute old', () => {
    const createdAt = new Date(NOW - 30 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('just now');
  });

  it('returns "Nm" for minutes under one hour', () => {
    const createdAt = new Date(NOW - 7 * 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('7m');
  });

  it('returns "Nh" for hours under one day', () => {
    const createdAt = new Date(NOW - 3 * 60 * 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('3h');
  });

  it('returns "Nd" for days under one week', () => {
    const createdAt = new Date(NOW - 4 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('4d');
  });

  it('returns "Nw" for weeks under 30 days', () => {
    const createdAt = new Date(NOW - 15 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('2w');
  });

  it('returns "Nmo" for months under one year', () => {
    const createdAt = new Date(NOW - 90 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('3mo');
  });

  it('returns "Ny" for durations of one year or more', () => {
    const createdAt = new Date(NOW - 400 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('1y');
  });

  it('returns empty string when the input cannot be parsed', () => {
    expect(formatListingFreshness('not-a-date', NOW)).toBe('');
  });

  it('clamps negative durations (future dates) to "just now"', () => {
    const createdAt = new Date(NOW + 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('just now');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest packages/shared/src/logic/marketplace/freshness.test.ts`
Expected: FAIL — "Cannot find module './freshness'".

- [ ] **Step 3: Implement the helper**

```ts
/**
 * Format a listing's created_at timestamp as a compact freshness label.
 * Used on mobile `ListingGridCard`.
 *
 * Contract:
 * - Under 60s  → "just now"
 * - Under 1h   → "{n}m"
 * - Under 1d   → "{n}h"
 * - Under 1w   → "{n}d"
 * - Under 30d  → "{n}w"
 * - Under 1y   → "{n}mo"
 * - 1y or more → "{n}y"
 * - Unparseable → "" (caller must handle)
 * - Future dates clamp to "just now"
 */
export function formatListingFreshness(
  createdAt: string,
  nowMs: number = Date.now()
): string {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return '';

  const deltaMs = Math.max(0, nowMs - created);
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks}w`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;

  const years = Math.floor(days / 365);
  return `${years}y`;
}
```

- [ ] **Step 4: Export from shared index**

In `packages/shared/src/index.ts`, append:
```ts
export { formatListingFreshness } from './logic/marketplace/freshness';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest packages/shared/src/logic/marketplace/freshness.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 6: Checkpoint (ask user before committing)**

Proposed commit message:
```
feat(shared): add formatListingFreshness helper for marketplace cards
```

Ask the user for approval before running `git commit`.

---

## Task 3: `injectSponsoredIntoGrid` shared helper

**Files:**
- Create: `packages/shared/src/logic/marketplace/sponsoredInjection.test.ts`
- Create: `packages/shared/src/logic/marketplace/sponsoredInjection.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from '@jest/globals';
import type { MarketplaceListing } from '../../types/marketplace';
import { injectSponsoredIntoGrid } from './sponsoredInjection';

const mkListing = (id: string, overrides: Partial<MarketplaceListing> = {}): MarketplaceListing => ({
  id,
  owner_id: 'owner-1',
  metro_area_id: 'metro-1',
  category_id: 'cat-1',
  listing_type: 'individual',
  status: 'active',
  title: `Listing ${id}`,
  description: '',
  photos: [],
  price: null,
  business_name: null,
  address: null,
  business_hours: null,
  item_condition: null,
  phone: null,
  email: null,
  website_url: null,
  is_global: false,
  views_count: 0,
  saves_count: 0,
  contacts_count: 0,
  trending_score: 0,
  refreshed_at: '2026-04-14T00:00:00Z',
  created_at: '2026-04-14T00:00:00Z',
  updated_at: '2026-04-14T00:00:00Z',
  ...overrides,
});

describe('injectSponsoredIntoGrid', () => {
  it('returns the organic list unchanged when there are no sponsored items', () => {
    const organic = [mkListing('a'), mkListing('b')];
    expect(injectSponsoredIntoGrid(organic, [], 8)).toEqual(organic);
  });

  it('returns the organic list unchanged when there are no organic items', () => {
    expect(injectSponsoredIntoGrid([], [mkListing('s1')], 8)).toEqual([]);
  });

  it('inserts one sponsored item at position `interval`', () => {
    const organic = Array.from({ length: 10 }, (_, i) => mkListing(`o${i}`));
    const sponsored = [mkListing('s1')];
    const result = injectSponsoredIntoGrid(organic, sponsored, 4);
    expect(result.map((l) => l.id)).toEqual(['o0', 'o1', 'o2', 'o3', 's1', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9']);
  });

  it('cycles through sponsored items when the grid is long enough', () => {
    const organic = Array.from({ length: 12 }, (_, i) => mkListing(`o${i}`));
    const sponsored = [mkListing('s1'), mkListing('s2')];
    const result = injectSponsoredIntoGrid(organic, sponsored, 4);
    const ids = result.map((l) => l.id);
    expect(ids.indexOf('s1')).toBe(4);
    expect(ids.indexOf('s2')).toBe(9); // 4 organic + 1 sponsored + 4 organic = index 9
  });

  it('does not duplicate an organic listing that is also in sponsored', () => {
    const shared = mkListing('shared');
    const organic = [shared, mkListing('o1'), mkListing('o2'), mkListing('o3'), mkListing('o4')];
    const sponsored = [shared];
    const result = injectSponsoredIntoGrid(organic, sponsored, 4);
    const sharedOccurrences = result.filter((l) => l.id === 'shared').length;
    expect(sharedOccurrences).toBe(1);
  });

  it('throws when interval is less than 1', () => {
    expect(() => injectSponsoredIntoGrid([mkListing('o')], [mkListing('s')], 0)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest packages/shared/src/logic/marketplace/sponsoredInjection.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
import type { MarketplaceListing } from '../../types/marketplace';

/**
 * Sprinkle sponsored listings into an organic grid at a fixed cadence.
 *
 * - Pure. Deterministic for a given input triple.
 * - Skips sponsored items whose `id` already appears in the organic list
 *   (prevents double-render on screens where a listing is both trending and promoted).
 * - Cycles through sponsored items in order if the grid is long enough for multiple injections.
 *
 * @throws if `interval` is less than 1.
 */
export function injectSponsoredIntoGrid(
  organic: MarketplaceListing[],
  sponsored: MarketplaceListing[],
  interval: number
): MarketplaceListing[] {
  if (interval < 1) {
    throw new Error(`injectSponsoredIntoGrid: interval must be >= 1 (got ${interval})`);
  }
  if (organic.length === 0) return [];
  if (sponsored.length === 0) return organic;

  const organicIds = new Set(organic.map((l) => l.id));
  const eligible = sponsored.filter((l) => !organicIds.has(l.id));
  if (eligible.length === 0) return organic;

  const result: MarketplaceListing[] = [];
  let sponsoredCursor = 0;

  for (let i = 0; i < organic.length; i++) {
    result.push(organic[i]);
    const organicPositionAfterThis = i + 1;
    if (organicPositionAfterThis % interval === 0 && organicPositionAfterThis < organic.length) {
      result.push(eligible[sponsoredCursor % eligible.length]);
      sponsoredCursor++;
    }
  }

  return result;
}
```

- [ ] **Step 4: Export from shared index**

In `packages/shared/src/index.ts`, append:
```ts
export { injectSponsoredIntoGrid } from './logic/marketplace/sponsoredInjection';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest packages/shared/src/logic/marketplace/sponsoredInjection.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 6: Run the whole shared workspace**

Run: `npm run test --workspace=packages/shared`
Expected: all existing tests still pass alongside the new ones.

- [ ] **Step 7: Checkpoint**

Proposed commit message:
```
feat(shared): add injectSponsoredIntoGrid helper for marketplace grid
```

Ask the user before committing.

---

## Task 4: Extend navigation types

**Files:**
- Modify: `apps/mobile/src/types/navigation.ts`

- [ ] **Step 1: Add new route params to `MarketplaceStackParamList`**

Locate `MarketplaceStackParamList` (around line 90) and replace the entire type block with:

```ts
export type MarketplaceStackParamList = {
  MarketplaceHome: undefined;
  MarketplaceCategory: { categorySlug: string; categoryName: string };
  ListingDetail: { listingId: string };
  CreateListing: { editListingId?: string } | undefined;
  MyListings: undefined;
  PromoteListing: { listingId: string };
  // New in 2026-04-14 redesign:
  BrowseCategories: undefined;
  MarketplaceRules: undefined;
  SavedListings: undefined;
};
```

- [ ] **Step 2: Typecheck mobile workspace**

Run: `npx tsc --noEmit -p apps/mobile`
Expected: no new errors from `navigation.ts`. Existing errors in unrelated files should still match the pre-task output.

- [ ] **Step 3: Checkpoint**

Proposed commit message:
```
feat(mobile): add marketplace navigation routes for redesign
```

Ask the user before committing.

---

## Task 5: `ListingGridCardSkeleton` component

**Files:**
- Create: `apps/mobile/src/components/marketplace/ListingGridCardSkeleton.tsx`

- [ ] **Step 1: Implement the skeleton**

```tsx
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { warmBorder, warmRadius, warmShadow, warmSurface } from '../../styles/warmTokens';

interface ListingGridCardSkeletonProps {
  /** Grid cell width — skeleton matches the real card width */
  width: number;
}

export function ListingGridCardSkeleton({ width }: ListingGridCardSkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });
  const imageHeight = Math.round(width * 1.25); // 4:5 aspect

  return (
    <View
      style={[styles.card, { width }]}
      accessibilityLabel="Loading listing"
      accessibilityRole="none"
    >
      <Animated.View style={[styles.image, { height: imageHeight, opacity }]} />
      <View style={styles.body}>
        <Animated.View style={[styles.linePrice, { opacity }]} />
        <Animated.View style={[styles.lineTitle, { opacity }]} />
        <Animated.View style={[styles.lineTitleShort, { opacity }]} />
        <Animated.View style={[styles.lineMeta, { opacity }]} />
      </View>
    </View>
  );
}

const SHIMMER_BG = '#EDE6DC';

const styles = StyleSheet.create({
  card: {
    backgroundColor: warmSurface.card,
    borderRadius: warmRadius.card,
    borderWidth: 1,
    borderColor: warmBorder.hairline,
    overflow: 'hidden',
    ...warmShadow,
  },
  image: {
    width: '100%',
    backgroundColor: SHIMMER_BG,
  },
  body: {
    padding: spacing.xs,
    gap: 6,
  },
  linePrice: {
    height: 16,
    width: '40%',
    backgroundColor: SHIMMER_BG,
    borderRadius: 4,
  },
  lineTitle: {
    height: 12,
    width: '90%',
    backgroundColor: SHIMMER_BG,
    borderRadius: 4,
  },
  lineTitleShort: {
    height: 12,
    width: '60%',
    backgroundColor: SHIMMER_BG,
    borderRadius: 4,
  },
  lineMeta: {
    height: 10,
    width: '50%',
    backgroundColor: SHIMMER_BG,
    borderRadius: 4,
    marginTop: 4,
  },
});

// Silence unused-import warning for colors — kept for future theming.
void colors;
```

*(Remove the `void colors;` line if the `colors` import is unused; only include `colors` if you actually reference it. Simpler path: drop the `colors` import entirely.)*

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p apps/mobile`
Expected: no new errors. Remove the unused `colors` import if TS complains.

- [ ] **Step 3: Checkpoint**

Proposed commit message:
```
feat(mobile): add ListingGridCardSkeleton for marketplace loading state
```

Ask the user before committing.

---

## Task 6: `ListingGridCard` component (TDD)

**Files:**
- Create: `apps/mobile/src/components/marketplace/ListingGridCard.test.tsx`
- Create: `apps/mobile/src/components/marketplace/ListingGridCard.tsx`

Per `apps/mobile/TESTING-PATTERNS.md`: no `act()` for pure sync components; use `render()` + direct queries; local `@expo/vector-icons` mock.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import type { MarketplaceListing } from '@nepally/shared';
import { ListingGridCard } from './ListingGridCard';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const mkListing = (overrides: Partial<MarketplaceListing> = {}): MarketplaceListing => ({
  id: 'listing-1',
  owner_id: 'owner-1',
  metro_area_id: 'metro-1',
  category_id: 'cat-1',
  listing_type: 'individual',
  status: 'active',
  title: 'Cozy room near LIRR',
  description: '',
  photos: [],
  price: '$450',
  business_name: null,
  address: null,
  business_hours: null,
  item_condition: 'used',
  phone: null,
  email: null,
  website_url: null,
  is_global: false,
  views_count: 42,
  saves_count: 3,
  contacts_count: 0,
  trending_score: 0,
  refreshed_at: '2026-04-14T11:00:00Z',
  created_at: '2026-04-14T11:00:00Z',
  updated_at: '2026-04-14T11:00:00Z',
  owner: { id: 'owner-1', full_name: 'Ama', trust_level: 1, profile_photo: null },
  category: { id: 'cat-1', name: 'Housing', slug: 'housing', emoji: '🏠', icon: null, color: '#4CAF50', description: null, sort_order: 1, created_at: '2026-01-01' },
  ...overrides,
});

describe('ListingGridCard', () => {
  it('renders title and price', () => {
    const screen = render(
      <ListingGridCard listing={mkListing()} width={180} onPress={() => {}} isSaved={false} onToggleSave={() => {}} />
    );
    expect(screen.getByText('Cozy room near LIRR')).toBeTruthy();
    expect(screen.getByText('$450')).toBeTruthy();
  });

  it('does NOT render a "Contact Seller" button', () => {
    const screen = render(
      <ListingGridCard listing={mkListing()} width={180} onPress={() => {}} isSaved={false} onToggleSave={() => {}} />
    );
    expect(screen.queryByText('Contact Seller')).toBeNull();
  });

  it('calls onPress when the card body is tapped', () => {
    const onPress = jest.fn();
    const screen = render(
      <ListingGridCard listing={mkListing()} width={180} onPress={onPress} isSaved={false} onToggleSave={() => {}} />
    );
    fireEvent.press(screen.getByLabelText('Open listing: Cozy room near LIRR'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleSave with the listing id when heart is tapped', () => {
    const onToggleSave = jest.fn();
    const screen = render(
      <ListingGridCard listing={mkListing()} width={180} onPress={() => {}} isSaved={false} onToggleSave={onToggleSave} />
    );
    fireEvent.press(screen.getByLabelText('Save listing'));
    expect(onToggleSave).toHaveBeenCalledWith('listing-1');
  });

  it('announces unsave state when already saved', () => {
    const screen = render(
      <ListingGridCard listing={mkListing()} width={180} onPress={() => {}} isSaved={true} onToggleSave={() => {}} />
    );
    expect(screen.getByLabelText('Unsave listing')).toBeTruthy();
  });

  it('renders a Sponsored badge when sponsored=true', () => {
    const screen = render(
      <ListingGridCard listing={mkListing()} width={180} onPress={() => {}} isSaved={false} onToggleSave={() => {}} sponsored />
    );
    expect(screen.getByText('Sponsored')).toBeTruthy();
  });

  it('renders without price gracefully', () => {
    const screen = render(
      <ListingGridCard
        listing={mkListing({ price: null })}
        width={180}
        onPress={() => {}}
        isSaved={false}
        onToggleSave={() => {}}
      />
    );
    expect(screen.queryByText('$450')).toBeNull();
    expect(screen.getByText('Cozy room near LIRR')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx jest apps/mobile/src/components/marketplace/ListingGridCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the card**

```tsx
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TrustLevel, formatListingFreshness, type MarketplaceListing } from '@nepally/shared';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import {
  warmAccent,
  warmBorder,
  warmRadius,
  warmShadow,
  warmSurface,
} from '../../styles/warmTokens';

export interface ListingGridCardProps {
  listing: MarketplaceListing;
  width: number;
  onPress: () => void;
  isSaved: boolean;
  onToggleSave: (listingId: string) => void;
  sponsored?: boolean;
}

export const ListingGridCard = React.memo(function ListingGridCard({
  listing,
  width,
  onPress,
  isSaved,
  onToggleSave,
  sponsored,
}: ListingGridCardProps) {
  const imageHeight = Math.round(width * 1.25); // 4:5
  const [firstPhoto] = listing.photos;
  const categoryColor = listing.category?.color ?? '#9E9E9E';
  const isVerified = (listing.owner?.trust_level ?? 0) >= TrustLevel.VERIFIED;
  const freshness = useMemo(() => formatListingFreshness(listing.created_at), [listing.created_at]);

  const handleToggleSave = useCallback(() => {
    onToggleSave(listing.id);
  }, [listing.id, onToggleSave]);

  return (
    <TouchableOpacity
      style={[styles.card, { width }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel={`Open listing: ${listing.title}`}
      accessibilityRole="button"
    >
      <View style={[styles.imageWrap, { height: imageHeight }]}>
        {firstPhoto ? (
          <Image source={firstPhoto} style={styles.image} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={[categoryColor + '22', categoryColor + '55']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.image}
          >
            <Text style={styles.placeholderEmoji}>{listing.category?.emoji ?? '📦'}</Text>
          </LinearGradient>
        )}

        {sponsored && (
          <View style={styles.sponsoredBadge} accessibilityLabel="Sponsored listing">
            <Text style={styles.sponsoredBadgeText}>Sponsored</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleToggleSave}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={isSaved ? 'Unsave listing' : 'Save listing'}
          accessibilityRole="button"
          accessibilityState={{ selected: isSaved }}
        >
          <Ionicons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={22}
            color={isSaved ? warmAccent.warm : '#FFFFFF'}
          />
        </TouchableOpacity>

        <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
      </View>

      <View style={styles.body}>
        {listing.price ? (
          <View style={styles.priceRow}>
            <Text style={styles.price}>{listing.price}</Text>
            {isVerified && <Text style={styles.verifiedCheck}>✓</Text>}
          </View>
        ) : null}

        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        {freshness ? (
          <Text style={styles.meta}>{freshness}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: warmSurface.card,
    borderRadius: warmRadius.card,
    borderWidth: 1,
    borderColor: warmBorder.hairline,
    overflow: 'hidden',
    ...warmShadow,
  },
  imageWrap: {
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  saveBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(20,14,8,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sponsoredBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(20,14,8,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sponsoredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryDot: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  body: {
    padding: spacing.xs,
    gap: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  price: {
    ...typography.body,
    fontSize: 17,
    fontWeight: '700',
    color: warmAccent.warm,
  },
  verifiedCheck: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '700',
  },
  title: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  meta: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
});
```

- [ ] **Step 4: Run the test**

Run: `npx jest apps/mobile/src/components/marketplace/ListingGridCard.test.tsx`
Expected: PASS — 7 tests.

- [ ] **Step 5: Checkpoint**

Proposed commit message:
```
feat(mobile): add ListingGridCard for denser marketplace grid
```

Ask the user before committing.

---

## Task 7: `MarketplaceSearchBar` component

**Files:**
- Create: `apps/mobile/src/components/marketplace/MarketplaceSearchBar.tsx`

Simple, stateless wrapper. No dedicated test — behavior is covered by the home-screen integration test in Task 13.

- [ ] **Step 1: Implement**

```tsx
import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { warmBorder, warmRadius, warmSurface } from '../../styles/warmTokens';

interface MarketplaceSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function MarketplaceSearchBar({
  value,
  onChangeText,
  placeholder = 'Search listings…',
}: MarketplaceSearchBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.field}>
        <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          accessibilityLabel="Search marketplace"
          accessibilityHint="Filters listings by keyword"
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            accessibilityLabel="Clear search"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.s,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    backgroundColor: warmSurface.canvas,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: warmSurface.card,
    borderRadius: warmRadius.card,
    borderWidth: 1,
    borderColor: warmBorder.hairline,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    padding: 0,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p apps/mobile`
Expected: no new errors.

- [ ] **Step 3: Checkpoint**

Proposed commit message:
```
feat(mobile): add MarketplaceSearchBar component
```

Ask the user before committing.

---

## Task 8: `CategoryTileRow` component (TDD)

**Files:**
- Create: `apps/mobile/src/components/marketplace/CategoryTileRow.test.tsx`
- Create: `apps/mobile/src/components/marketplace/CategoryTileRow.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import type { MarketplaceCategory } from '@nepally/shared';
import { CategoryTileRow } from './CategoryTileRow';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const categories: MarketplaceCategory[] = [
  { id: '1', name: 'Housing', slug: 'housing', emoji: '🏠', icon: null, color: '#4CAF50', description: null, sort_order: 1, created_at: '2026-01-01' },
  { id: '2', name: 'Jobs', slug: 'jobs', emoji: '💼', icon: null, color: '#1976D2', description: null, sort_order: 2, created_at: '2026-01-01' },
];

describe('CategoryTileRow', () => {
  it('renders each category name', () => {
    const screen = render(<CategoryTileRow categories={categories} selectedSlug="" onSelect={() => {}} />);
    expect(screen.getByText('Housing')).toBeTruthy();
    expect(screen.getByText('Jobs')).toBeTruthy();
  });

  it('calls onSelect with the slug when a tile is pressed', () => {
    const onSelect = jest.fn();
    const screen = render(<CategoryTileRow categories={categories} selectedSlug="" onSelect={onSelect} />);
    fireEvent.press(screen.getByLabelText('Filter by Jobs'));
    expect(onSelect).toHaveBeenCalledWith('jobs');
  });

  it('calls onSelect with empty string when the selected tile is pressed again', () => {
    const onSelect = jest.fn();
    const screen = render(<CategoryTileRow categories={categories} selectedSlug="jobs" onSelect={onSelect} />);
    fireEvent.press(screen.getByLabelText('Filter by Jobs'));
    expect(onSelect).toHaveBeenCalledWith('');
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL**

Run: `npx jest apps/mobile/src/components/marketplace/CategoryTileRow.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
import React, { useCallback } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { MarketplaceCategory } from '@nepally/shared';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { warmAccent, warmBorder, warmRadius, warmSurface } from '../../styles/warmTokens';

interface CategoryTileRowProps {
  categories: MarketplaceCategory[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}

export function CategoryTileRow({ categories, selectedSlug, onSelect }: CategoryTileRowProps) {
  const keyExtractor = useCallback((c: MarketplaceCategory) => c.id, []);

  const renderItem = useCallback(
    ({ item }: { item: MarketplaceCategory }) => {
      const isSelected = item.slug === selectedSlug;
      return (
        <TouchableOpacity
          style={[styles.tile, isSelected && styles.tileSelected]}
          onPress={() => onSelect(isSelected ? '' : item.slug)}
          accessibilityLabel={`Filter by ${item.name}`}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
        >
          <Text style={styles.emoji}>{item.emoji ?? '📦'}</Text>
          <Text style={styles.label} numberOfLines={1}>
            {item.name}
          </Text>
        </TouchableOpacity>
      );
    },
    [onSelect, selectedSlug]
  );

  return (
    <FlatList
      horizontal
      data={categories}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      showsHorizontalScrollIndicator={false}
      style={styles.wrap}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: warmSurface.canvas,
  },
  list: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    gap: 10,
  },
  tile: {
    width: 72,
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
    borderRadius: warmRadius.tile,
    backgroundColor: warmSurface.card,
    borderWidth: 1,
    borderColor: warmBorder.hairline,
    alignItems: 'center',
    gap: 4,
  },
  tileSelected: {
    borderColor: warmAccent.warm,
    borderWidth: 2,
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
});
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx jest apps/mobile/src/components/marketplace/CategoryTileRow.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Checkpoint**

Proposed commit message:
```
feat(mobile): add CategoryTileRow for marketplace category filtering
```

Ask the user before committing.

---

## Task 9: `MarketplaceTabs` component (TDD)

**Files:**
- Create: `apps/mobile/src/components/marketplace/MarketplaceTabs.test.tsx`
- Create: `apps/mobile/src/components/marketplace/MarketplaceTabs.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { MarketplaceTabs, type MarketplaceTabKey } from './MarketplaceTabs';

describe('MarketplaceTabs', () => {
  it('renders the three ship-v1 tabs', () => {
    const screen = render(<MarketplaceTabs active="for-you" onChange={() => {}} />);
    expect(screen.getByText('For You')).toBeTruthy();
    expect(screen.getByText('Featured')).toBeTruthy();
    expect(screen.getByText('Recent')).toBeTruthy();
  });

  it('calls onChange with the chosen key on press', () => {
    const onChange = jest.fn();
    const screen = render(<MarketplaceTabs active="for-you" onChange={onChange} />);
    fireEvent.press(screen.getByText('Featured'));
    expect(onChange).toHaveBeenCalledWith('featured' satisfies MarketplaceTabKey);
  });

  it('marks the active tab with accessibilityState.selected', () => {
    const screen = render(<MarketplaceTabs active="recent" onChange={() => {}} />);
    const recent = screen.getByLabelText('Recent tab');
    expect(recent.props.accessibilityState).toMatchObject({ selected: true });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx jest apps/mobile/src/components/marketplace/MarketplaceTabs.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { warmAccent, warmBorder, warmDisplaySm, warmSurface } from '../../styles/warmTokens';

export type MarketplaceTabKey = 'for-you' | 'featured' | 'recent';

interface MarketplaceTabsProps {
  active: MarketplaceTabKey;
  onChange: (key: MarketplaceTabKey) => void;
}

const TABS: { key: MarketplaceTabKey; label: string }[] = [
  { key: 'for-you', label: 'For You' },
  { key: 'featured', label: 'Featured' },
  { key: 'recent', label: 'Recent' },
];

export function MarketplaceTabs({ active, onChange }: MarketplaceTabsProps) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label} tab`}
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
            <View style={[styles.underline, isActive && styles.underlineActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    paddingHorizontal: spacing.s,
    backgroundColor: warmSurface.canvas,
    borderBottomWidth: 1,
    borderBottomColor: warmBorder.hairline,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  label: {
    ...warmDisplaySm,
    color: colors.text.secondary,
    paddingBottom: 6,
  },
  labelActive: {
    color: warmAccent.warm,
  },
  underline: {
    height: 2,
    width: '60%',
    backgroundColor: 'transparent',
    borderRadius: 2,
  },
  underlineActive: {
    backgroundColor: warmAccent.warm,
  },
});
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx jest apps/mobile/src/components/marketplace/MarketplaceTabs.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Checkpoint**

Proposed commit message:
```
feat(mobile): add MarketplaceTabs (For You / Featured / Recent)
```

Ask the user before committing.

---

## Task 10: `MarketplaceEmptyState` component

**Files:**
- Create: `apps/mobile/src/components/marketplace/MarketplaceEmptyState.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { warmAccent, warmRadius, warmSurface } from '../../styles/warmTokens';

export type EmptyVariant = 'empty-metro' | 'empty-search' | 'empty-category';

interface Copy {
  headline: string;
  body: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

const COPY: Record<EmptyVariant, Copy> = {
  'empty-metro': {
    headline: 'Nothing in your metro yet',
    body: 'Be the first to share something with your Nepali community here.',
    primaryLabel: 'Create the first listing',
    secondaryLabel: 'Browse nearby metros',
  },
  'empty-search': {
    headline: 'No matches',
    body: 'Try a different search term or category.',
    primaryLabel: 'Clear filters',
  },
  'empty-category': {
    headline: 'Nothing here yet',
    body: 'This corner of the marketplace is still quiet.',
    primaryLabel: 'Back to Marketplace',
  },
};

interface MarketplaceEmptyStateProps {
  variant: EmptyVariant;
  onPrimary?: () => void;
  onSecondary?: () => void;
  /** Hide primary CTA when true (e.g. user can't post yet). */
  hidePrimary?: boolean;
}

export function MarketplaceEmptyState({
  variant,
  onPrimary,
  onSecondary,
  hidePrimary,
}: MarketplaceEmptyStateProps) {
  const copy = COPY[variant];
  return (
    <View style={styles.wrap} accessibilityLabel={`${copy.headline}. ${copy.body}`}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>🏪</Text>
      </View>
      <Text style={styles.headline}>{copy.headline}</Text>
      <Text style={styles.body}>{copy.body}</Text>

      {!hidePrimary && copy.primaryLabel && onPrimary ? (
        <TouchableOpacity style={styles.primaryBtn} onPress={onPrimary} accessibilityRole="button">
          <Text style={styles.primaryText}>{copy.primaryLabel}</Text>
        </TouchableOpacity>
      ) : null}

      {copy.secondaryLabel && onSecondary ? (
        <TouchableOpacity onPress={onSecondary} accessibilityRole="button">
          <Text style={styles.secondaryText}>{copy.secondaryLabel} →</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.m,
    gap: spacing.xs,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: warmSurface.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  icon: {
    fontSize: 44,
  },
  headline: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  primaryBtn: {
    marginTop: spacing.s,
    backgroundColor: warmAccent.warm,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: warmRadius.card,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryText: {
    color: warmAccent.warm,
    fontWeight: '600',
    fontSize: 14,
    marginTop: 4,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p apps/mobile`
Expected: no new errors.

- [ ] **Step 3: Checkpoint**

Proposed commit message:
```
feat(mobile): add MarketplaceEmptyState component
```

Ask the user before committing.

---

## Task 11: `MarketplaceMenuSheet` component (TDD)

**Files:**
- Create: `apps/mobile/src/components/marketplace/MarketplaceMenuSheet.test.tsx`
- Create: `apps/mobile/src/components/marketplace/MarketplaceMenuSheet.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { MarketplaceMenuSheet } from './MarketplaceMenuSheet';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('MarketplaceMenuSheet', () => {
  it('does not render content when hidden', () => {
    const screen = render(
      <MarketplaceMenuSheet
        visible={false}
        onClose={() => {}}
        onSelect={() => {}}
      />
    );
    expect(screen.queryByText('My Listings')).toBeNull();
  });

  it('renders all six rows when visible', () => {
    const screen = render(
      <MarketplaceMenuSheet visible={true} onClose={() => {}} onSelect={() => {}} />
    );
    expect(screen.getByText('My Listings')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('Promote a Listing')).toBeTruthy();
    expect(screen.getByText('Browse Categories')).toBeTruthy();
    expect(screen.getByText('Change Location')).toBeTruthy();
    expect(screen.getByText('Marketplace Rules')).toBeTruthy();
  });

  it('calls onSelect with the row key and then onClose', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const screen = render(
      <MarketplaceMenuSheet visible={true} onClose={onClose} onSelect={onSelect} />
    );
    fireEvent.press(screen.getByText('My Listings'));
    expect(onSelect).toHaveBeenCalledWith('my-listings');
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx jest apps/mobile/src/components/marketplace/MarketplaceMenuSheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { warmBorder, warmRadius, warmSurface } from '../../styles/warmTokens';

export type MarketplaceMenuKey =
  | 'my-listings'
  | 'saved'
  | 'promote'
  | 'browse-categories'
  | 'change-location'
  | 'rules';

interface MarketplaceMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: MarketplaceMenuKey) => void;
}

interface Row {
  key: MarketplaceMenuKey;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const ROWS: Row[] = [
  { key: 'my-listings', icon: 'pricetag-outline', label: 'My Listings' },
  { key: 'saved', icon: 'heart-outline', label: 'Saved' },
  { key: 'promote', icon: 'star-outline', label: 'Promote a Listing' },
  { key: 'browse-categories', icon: 'grid-outline', label: 'Browse Categories' },
  { key: 'change-location', icon: 'location-outline', label: 'Change Location' },
  { key: 'rules', icon: 'book-outline', label: 'Marketplace Rules' },
];

export function MarketplaceMenuSheet({ visible, onClose, onSelect }: MarketplaceMenuSheetProps) {
  const handleSelect = (key: MarketplaceMenuKey) => {
    onSelect(key);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        {ROWS.map((row) => (
          <TouchableOpacity
            key={row.key}
            style={styles.row}
            onPress={() => handleSelect(row.key)}
            accessibilityRole="button"
          >
            <Ionicons name={row.icon} size={22} color={colors.text.primary} />
            <Text style={styles.label}>{row.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,14,8,0.4)',
  },
  sheet: {
    backgroundColor: warmSurface.canvas,
    borderTopLeftRadius: warmRadius.sheet,
    borderTopRightRadius: warmRadius.sheet,
    paddingTop: spacing.xs,
    paddingBottom: spacing.l,
    paddingHorizontal: spacing.s,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: warmBorder.hairline,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: warmBorder.hairline,
    gap: 14,
  },
  label: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx jest apps/mobile/src/components/marketplace/MarketplaceMenuSheet.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Checkpoint**

Proposed commit message:
```
feat(mobile): add MarketplaceMenuSheet bottom sheet
```

Ask the user before committing.

---

## Task 12: Stub screens — `BrowseCategoriesScreen`, `MarketplaceRulesScreen`, `SavedListingsScreen`

**Files:**
- Create: `apps/mobile/src/screens/marketplace/BrowseCategoriesScreen.tsx` (+ test)
- Create: `apps/mobile/src/screens/marketplace/MarketplaceRulesScreen.tsx`
- Create: `apps/mobile/src/screens/marketplace/SavedListingsScreen.tsx` (+ test)
- Modify: `apps/mobile/src/navigation/MarketplaceNavigator.tsx`

- [ ] **Step 1: `BrowseCategoriesScreen` — full-grid category picker**

```tsx
// apps/mobile/src/screens/marketplace/BrowseCategoriesScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getCategories, type MarketplaceCategory } from '@nepally/shared';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { warmBorder, warmRadius, warmSurface } from '../../styles/warmTokens';
import type { MarketplaceStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList, 'BrowseCategories'>;

export default function BrowseCategoriesScreen() {
  const navigation = useNavigation<Nav>();
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const result = await getCategories(supabase);
      if (!mountedRef.current) return;
      if (result.data) setCategories(result.data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.wrap}>
        <ActivityIndicator size="large" color={colors.primary.main} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrap}>
      <FlatList
        data={categories}
        keyExtractor={(c) => c.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tile}
            onPress={() =>
              navigation.navigate('MarketplaceCategory', {
                categorySlug: item.slug,
                categoryName: item.name,
              })
            }
            accessibilityLabel={`Browse ${item.name}`}
          >
            <Text style={styles.emoji}>{item.emoji ?? '📦'}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: warmSurface.canvas,
  },
  loader: {
    marginTop: spacing.l,
  },
  grid: {
    padding: spacing.s,
    gap: spacing.s,
  },
  row: {
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: warmSurface.card,
    borderRadius: warmRadius.card,
    borderWidth: 1,
    borderColor: warmBorder.hairline,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: 32,
  },
  name: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 12,
  },
});
```

- [ ] **Step 2: `BrowseCategoriesScreen` test (async effect pattern)**

```tsx
// apps/mobile/src/screens/marketplace/BrowseCategoriesScreen.test.tsx
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import BrowseCategoriesScreen from './BrowseCategoriesScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../config/supabase', () => ({ supabase: {} }));
jest.mock('@nepally/shared', () => ({
  getCategories: jest.fn(async () => ({
    data: [
      { id: '1', name: 'Housing', slug: 'housing', emoji: '🏠', icon: null, color: null, description: null, sort_order: 1, created_at: '2026-01-01' },
    ],
  })),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

describe('BrowseCategoriesScreen', () => {
  it('renders categories after loading', async () => {
    const screen = render(<BrowseCategoriesScreen />);
    await waitFor(() => {
      expect(screen.getByText('Housing')).toBeTruthy();
    });
  });
});
```

- [ ] **Step 3: `MarketplaceRulesScreen` stub**

```tsx
// apps/mobile/src/screens/marketplace/MarketplaceRulesScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { warmSurface } from '../../styles/warmTokens';

const RULES: { heading: string; body: string }[] = [
  {
    heading: 'Be honest',
    body: 'Describe what you are selling clearly. Real photos, real prices, real location.',
  },
  {
    heading: 'Be respectful',
    body: 'This marketplace serves the Nepali diaspora — treat every buyer and seller with respect.',
  },
  {
    heading: 'No prohibited items',
    body: 'No weapons, drugs, counterfeits, stolen goods, or anything illegal under US federal or state law.',
  },
  {
    heading: 'Keep scams out',
    body: 'Never pay upfront for items you have not inspected. Report suspicious activity.',
  },
];

export default function MarketplaceRulesScreen() {
  return (
    <SafeAreaView style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Marketplace Rules</Text>
        {RULES.map((rule) => (
          <View key={rule.heading} style={styles.section}>
            <Text style={styles.heading}>{rule.heading}</Text>
            <Text style={styles.body}>{rule.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: warmSurface.canvas,
  },
  content: {
    padding: spacing.m,
    gap: spacing.m,
  },
  pageTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  section: {
    gap: 4,
  },
  heading: {
    ...typography.h3,
    color: colors.text.primary,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
});
```

- [ ] **Step 4: `SavedListingsScreen` — uses existing `getSavedListingsByUser`**

```tsx
// apps/mobile/src/screens/marketplace/SavedListingsScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getSavedListingsByUser,
  getUserSavedListingIds,
  saveListing,
  unsaveListing,
  type MarketplaceListing,
} from '@nepally/shared';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { spacing } from '../../styles/spacing';
import { warmSurface } from '../../styles/warmTokens';
import type { MarketplaceStackParamList } from '../../types/navigation';
import { ListingGridCard } from '../../components/marketplace/ListingGridCard';
import { MarketplaceEmptyState } from '../../components/marketplace/MarketplaceEmptyState';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList, 'SavedListings'>;

const GUTTER = 12;
const CARD_WIDTH = Math.floor((Dimensions.get('window').width - GUTTER * 3) / 2);

export default function SavedListingsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [saved, ids] = await Promise.all([
        getSavedListingsByUser(supabase, user.id),
        getUserSavedListingIds(supabase, user.id),
      ]);
      if (!mountedRef.current) return;
      if (saved.data) setListings(saved.data);
      if (ids.data) setSavedIds(new Set(ids.data));
      setLoading(false);
    })();
  }, [user]);

  const handleToggleSave = useCallback(
    async (listingId: string) => {
      const wasSaved = savedIds.has(listingId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(listingId);
        else next.add(listingId);
        return next;
      });
      if (wasSaved) {
        await unsaveListing(supabase, listingId);
        setListings((prev) => prev.filter((l) => l.id !== listingId));
      } else {
        await saveListing(supabase, listingId);
      }
    },
    [savedIds]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.wrap}>
        <ActivityIndicator size="large" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (listings.length === 0) {
    return (
      <SafeAreaView style={styles.wrap}>
        <MarketplaceEmptyState
          variant="empty-category"
          hidePrimary
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrap}>
      <FlatList
        data={listings}
        keyExtractor={(l) => l.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <ListingGridCard
            listing={item}
            width={CARD_WIDTH}
            onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
            isSaved={savedIds.has(item.id)}
            onToggleSave={handleToggleSave}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: warmSurface.canvas,
  },
  loader: {
    marginTop: spacing.l,
  },
  grid: {
    padding: GUTTER,
    gap: GUTTER,
  },
  row: {
    gap: GUTTER,
    marginBottom: GUTTER,
  },
});
```

- [ ] **Step 5: `SavedListingsScreen` test (render + waitFor pattern per TESTING-PATTERNS.md)**

```tsx
// apps/mobile/src/screens/marketplace/SavedListingsScreen.test.tsx
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import SavedListingsScreen from './SavedListingsScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../config/supabase', () => ({ supabase: {} }));
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', metro_area_id: 'm1', trust_level: 1 } }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: any) => <>{children}</> }));

const mockListing = {
  id: 'l1',
  owner_id: 'o1',
  metro_area_id: 'm1',
  category_id: 'c1',
  listing_type: 'individual',
  status: 'active',
  title: 'Saved thing',
  description: '',
  photos: [],
  price: '$10',
  business_name: null,
  address: null,
  business_hours: null,
  item_condition: 'used',
  phone: null,
  email: null,
  website_url: null,
  is_global: false,
  views_count: 0,
  saves_count: 1,
  contacts_count: 0,
  trending_score: 0,
  refreshed_at: '2026-04-14T00:00:00Z',
  created_at: '2026-04-14T00:00:00Z',
  updated_at: '2026-04-14T00:00:00Z',
};

jest.mock('@nepally/shared', () => {
  const actual = jest.requireActual('@nepally/shared');
  return {
    ...actual,
    getSavedListingsByUser: jest.fn(async () => ({ data: [mockListing] })),
    getUserSavedListingIds: jest.fn(async () => ({ data: ['l1'] })),
    saveListing: jest.fn(async () => ({})),
    unsaveListing: jest.fn(async () => ({})),
  };
});

describe('SavedListingsScreen', () => {
  it('renders saved listings after loading', async () => {
    const screen = render(<SavedListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Saved thing')).toBeTruthy();
    });
  });
});
```

- [ ] **Step 6: Register screens in `MarketplaceNavigator.tsx`**

Open `apps/mobile/src/navigation/MarketplaceNavigator.tsx`, import the three new screens, and add three new `<Stack.Screen>` entries after the existing `PromoteListing` entry. Exact additions:

```tsx
import BrowseCategoriesScreen from '../screens/marketplace/BrowseCategoriesScreen';
import MarketplaceRulesScreen from '../screens/marketplace/MarketplaceRulesScreen';
import SavedListingsScreen from '../screens/marketplace/SavedListingsScreen';
```

```tsx
<Stack.Screen
  name="BrowseCategories"
  component={BrowseCategoriesScreen}
  options={{ title: 'Browse Categories' }}
/>
<Stack.Screen
  name="MarketplaceRules"
  component={MarketplaceRulesScreen}
  options={{ title: 'Marketplace Rules' }}
/>
<Stack.Screen
  name="SavedListings"
  component={SavedListingsScreen}
  options={{ title: 'Saved' }}
/>
```

- [ ] **Step 7: Run the new screen tests**

Run: `npx jest apps/mobile/src/screens/marketplace/BrowseCategoriesScreen.test.tsx apps/mobile/src/screens/marketplace/SavedListingsScreen.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 8: Typecheck mobile workspace**

Run: `npx tsc --noEmit -p apps/mobile`
Expected: no new errors. If `ListingGridCard` import paths differ, fix.

- [ ] **Step 9: Checkpoint**

Proposed commit message:
```
feat(mobile): add BrowseCategories, MarketplaceRules, and SavedListings screens
```

Ask the user before committing.

---

## Task 13: Rewrite `MarketplaceHomeScreen`

**Files:**
- Modify: `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.tsx` (full rewrite)
- Modify: `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.test.tsx` (rewrite assertions)

- [ ] **Step 1: Replace the home screen implementation**

Overwrite `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.tsx` with:

```tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  TrustLevel,
  getCategories,
  getFeaturedListings,
  getListingsByMetro,
  getStickyBusinessListings,
  getUserSavedListingIds,
  injectSponsoredIntoGrid,
  saveListing,
  unsaveListing,
  type MarketplaceCategory,
  type MarketplaceListing,
  type SponsoredListing,
} from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { warmAccent, warmBorder, warmSurface } from '../../styles/warmTokens';
import { ListingGridCard } from '../../components/marketplace/ListingGridCard';
import { ListingGridCardSkeleton } from '../../components/marketplace/ListingGridCardSkeleton';
import { MarketplaceSearchBar } from '../../components/marketplace/MarketplaceSearchBar';
import { CategoryTileRow } from '../../components/marketplace/CategoryTileRow';
import { MarketplaceTabs, type MarketplaceTabKey } from '../../components/marketplace/MarketplaceTabs';
import { MarketplaceMenuSheet, type MarketplaceMenuKey } from '../../components/marketplace/MarketplaceMenuSheet';
import { MarketplaceEmptyState } from '../../components/marketplace/MarketplaceEmptyState';
import type { MarketplaceStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList, 'MarketplaceHome'>;

const GRID_LIMIT = 20;
const GUTTER = 12;
const CARD_WIDTH = Math.floor((Dimensions.get('window').width - GUTTER * 3) / 2);
const SPONSORED_INTERVAL = 8;
const SEARCH_DEBOUNCE_MS = 300;

export default function MarketplaceHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const metroId = user?.metro_area_id ?? '';
  const canCreate = (user?.trust_level ?? 0) >= TrustLevel.VERIFIED;

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [activeTab, setActiveTab] = useState<MarketplaceTabKey>('for-you');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [sponsored, setSponsored] = useState<SponsoredListing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const mountedRef = useRef(true);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load categories once, and sponsored once
  useEffect(() => {
    if (!metroId) return;
    (async () => {
      const [cats, spons, ids] = await Promise.all([
        getCategories(supabase),
        getStickyBusinessListings(supabase, metroId, { limit: 5 }),
        user ? getUserSavedListingIds(supabase, user.id) : Promise.resolve({ data: [] as string[] }),
      ]);
      if (!mountedRef.current) return;
      if (cats.data) setCategories(cats.data);
      if (spons.data) setSponsored(spons.data);
      if (ids.data) setSavedIds(new Set(ids.data));
    })();
  }, [metroId, user]);

  // Load grid whenever tab / category / searchQuery changes
  const fetchGrid = useCallback(async () => {
    if (!metroId) {
      setLoading(false);
      return;
    }
    try {
      let result;
      if (activeTab === 'featured' && !selectedCategory && !searchQuery) {
        result = await getFeaturedListings(supabase, metroId, { limit: GRID_LIMIT });
      } else {
        result = await getListingsByMetro(supabase, metroId, {
          categorySlug: selectedCategory || undefined,
          searchQuery: searchQuery || undefined,
          sortBy: 'newest',
          limit: GRID_LIMIT,
          offset: 0,
        });
      }
      if (!mountedRef.current) return;
      if (result.data) {
        setListings(result.data);
        setHasMore(Boolean((result as { hasMore?: boolean }).hasMore));
      } else {
        setListings([]);
        setHasMore(false);
      }
    } catch {
      if (mountedRef.current) {
        setListings([]);
        setHasMore(false);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [metroId, activeTab, selectedCategory, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchGrid();
    }, [fetchGrid])
  );

  useEffect(() => {
    setLoading(true);
    fetchGrid();
  }, [fetchGrid]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGrid();
  }, [fetchGrid]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || !metroId) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await getListingsByMetro(supabase, metroId, {
        categorySlug: selectedCategory || undefined,
        searchQuery: searchQuery || undefined,
        sortBy: 'newest',
        limit: GRID_LIMIT,
        offset: listings.length,
      });
      if (!mountedRef.current) return;
      if (result.data) {
        setListings((prev) => {
          const seen = new Set(prev.map((l) => l.id));
          return [...prev, ...result.data!.filter((l) => !seen.has(l.id))];
        });
        setHasMore(Boolean(result.hasMore));
      }
    } finally {
      loadingMoreRef.current = false;
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [listings.length, metroId, selectedCategory, searchQuery, hasMore]);

  const handleCardPress = useCallback(
    (listing: MarketplaceListing) => {
      navigation.navigate('ListingDetail', { listingId: listing.id });
    },
    [navigation]
  );

  const handleToggleSave = useCallback(
    async (listingId: string) => {
      const wasSaved = savedIds.has(listingId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(listingId);
        else next.add(listingId);
        return next;
      });
      if (wasSaved) {
        await unsaveListing(supabase, listingId);
      } else {
        await saveListing(supabase, listingId);
      }
    },
    [savedIds]
  );

  const handleMenuSelect = useCallback(
    (key: MarketplaceMenuKey) => {
      switch (key) {
        case 'my-listings':
          navigation.navigate('MyListings');
          break;
        case 'saved':
          navigation.navigate('SavedListings');
          break;
        case 'promote':
          navigation.navigate('MyListings');
          break;
        case 'browse-categories':
          navigation.navigate('BrowseCategories');
          break;
        case 'change-location':
          // Cross-stack navigation: location is managed in the Home stack.
          navigation.getParent()?.navigate('Home' as never, { screen: 'ManageLocations' } as never);
          break;
        case 'rules':
          navigation.navigate('MarketplaceRules');
          break;
      }
    },
    [navigation]
  );

  const gridData = useMemo(() => {
    if (activeTab === 'featured' || selectedCategory || searchQuery) return listings;
    const sponsoredListings = sponsored.map((s) => s.listing);
    return injectSponsoredIntoGrid(listings, sponsoredListings, SPONSORED_INTERVAL);
  }, [activeTab, selectedCategory, searchQuery, listings, sponsored]);

  const sponsoredIds = useMemo(() => new Set(sponsored.map((s) => s.listing.id)), [sponsored]);

  const renderGridItem = useCallback(
    ({ item }: { item: MarketplaceListing }) => (
      <ListingGridCard
        listing={item}
        width={CARD_WIDTH}
        onPress={() => handleCardPress(item)}
        isSaved={savedIds.has(item.id)}
        onToggleSave={handleToggleSave}
        sponsored={sponsoredIds.has(item.id)}
      />
    ),
    [handleCardPress, handleToggleSave, savedIds, sponsoredIds]
  );

  const renderHeader = useCallback(
    () => (
      <View>
        <MarketplaceSearchBar value={searchInput} onChangeText={setSearchInput} />
        <CategoryTileRow
          categories={categories}
          selectedSlug={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <MarketplaceTabs active={activeTab} onChange={setActiveTab} />
      </View>
    ),
    [categories, selectedCategory, activeTab, searchInput]
  );

  const emptyVariant = searchQuery
    ? 'empty-search'
    : selectedCategory
    ? 'empty-category'
    : 'empty-metro';

  const renderEmpty = () => {
    if (loading) {
      // Skeleton grid rendered via ListEmptyComponent so header stays visible.
      return (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingGridCardSkeleton key={i} width={CARD_WIDTH} />
          ))}
        </View>
      );
    }
    return (
      <MarketplaceEmptyState
        variant={emptyVariant}
        hidePrimary={!canCreate && emptyVariant === 'empty-metro'}
        onPrimary={() => {
          if (emptyVariant === 'empty-search') {
            setSearchInput('');
            setSelectedCategory('');
            return;
          }
          if (emptyVariant === 'empty-category') {
            setSelectedCategory('');
            return;
          }
          if (canCreate) navigation.navigate('CreateListing');
        }}
        onSecondary={
          emptyVariant === 'empty-metro' ? () => setMenuVisible(true) : undefined
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('SavedListings')}
            accessibilityLabel="Open saved listings"
          >
            <Ionicons name="heart-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setMenuVisible(true)}
            accessibilityLabel="Open marketplace menu"
          >
            <Ionicons name="menu-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={loading ? [] : gridData}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderGridItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[warmAccent.warm]} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />

      {canCreate && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateListing')}
          accessibilityLabel="Create listing"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <MarketplaceMenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onSelect={handleMenuSelect}
      />
      {loadingMore ? null : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: warmSurface.canvas,
  },
  header: {
    backgroundColor: warmSurface.canvas,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: warmBorder.hairline,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: 96,
    gap: GUTTER,
  },
  row: {
    gap: GUTTER,
    marginBottom: GUTTER,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GUTTER,
    paddingTop: GUTTER,
  },
  fab: {
    position: 'absolute',
    right: spacing.s,
    bottom: spacing.s,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: warmAccent.warm,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
});
```

- [ ] **Step 2: Rewrite the home screen test**

Replace `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.test.tsx` with:

```tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import MarketplaceHomeScreen from './MarketplaceHomeScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: any) => <>{children}</> }));
jest.mock('../../config/supabase', () => ({ supabase: {} }));
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', metro_area_id: 'm1', trust_level: 1 } }),
}));

const navigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate, getParent: () => ({ navigate }) }),
  useFocusEffect: (cb: () => void) => cb(),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const sampleListing = {
  id: 'l1',
  owner_id: 'o1',
  metro_area_id: 'm1',
  category_id: 'c1',
  listing_type: 'individual',
  status: 'active',
  title: 'Warm winter jacket',
  description: '',
  photos: [],
  price: '$30',
  business_name: null,
  address: null,
  business_hours: null,
  item_condition: 'used',
  phone: null,
  email: null,
  website_url: null,
  is_global: false,
  views_count: 0,
  saves_count: 0,
  contacts_count: 0,
  trending_score: 0,
  refreshed_at: '2026-04-14T00:00:00Z',
  created_at: '2026-04-14T00:00:00Z',
  updated_at: '2026-04-14T00:00:00Z',
};

jest.mock('@nepally/shared', () => {
  const actual = jest.requireActual('@nepally/shared');
  return {
    ...actual,
    getCategories: jest.fn(async () => ({
      data: [
        { id: 'c1', name: 'Clothing', slug: 'clothing', emoji: '👕', icon: null, color: null, description: null, sort_order: 1, created_at: '2026-01-01' },
      ],
    })),
    getFeaturedListings: jest.fn(async () => ({ data: [], hasMore: false })),
    getListingsByMetro: jest.fn(async () => ({ data: [sampleListing], hasMore: false })),
    getStickyBusinessListings: jest.fn(async () => ({ data: [] })),
    getUserSavedListingIds: jest.fn(async () => ({ data: [] })),
    saveListing: jest.fn(async () => ({})),
    unsaveListing: jest.fn(async () => ({})),
  };
});

describe('MarketplaceHomeScreen (redesign)', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it('renders the header title and new icon actions', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
      expect(screen.getByLabelText('Open saved listings')).toBeTruthy();
      expect(screen.getByLabelText('Open marketplace menu')).toBeTruthy();
    });
  });

  it('renders the three tab strip', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('For You')).toBeTruthy();
      expect(screen.getByText('Featured')).toBeTruthy();
      expect(screen.getByText('Recent')).toBeTruthy();
    });
  });

  it('does NOT render the old Sponsored / Featured / Recently Added / Trending strip headers', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Warm winter jacket')).toBeTruthy();
    });
    expect(screen.queryByText('Recently Added')).toBeNull();
    expect(screen.queryByText('Trending')).toBeNull();
    expect(screen.queryByText('All Listings')).toBeNull();
  });

  it('opens the menu sheet and routes My Listings', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('Open marketplace menu')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('Open marketplace menu'));
    fireEvent.press(screen.getByText('My Listings'));
    expect(navigate).toHaveBeenCalledWith('MyListings');
  });

  it('routes the header heart directly to SavedListings', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('Open saved listings')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('Open saved listings'));
    expect(navigate).toHaveBeenCalledWith('SavedListings');
  });
});
```

- [ ] **Step 3: Run the home screen test**

Run: `npx jest apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 4: Run the full marketplace test directory**

Run: `npx jest apps/mobile/src/components/marketplace apps/mobile/src/screens/marketplace`
Expected: all new and existing marketplace tests pass.

- [ ] **Step 5: Typecheck mobile workspace**

Run: `npx tsc --noEmit -p apps/mobile`
Expected: no new errors.

- [ ] **Step 6: Checkpoint**

Proposed commit message:
```
feat(mobile): redesign MarketplaceHomeScreen with tabs, search, and editorial grid
```

Ask the user before committing.

---

## Task 14: Full workspace verification

- [ ] **Step 1: Mobile CI-style run**

Run: `npm run test:ci --workspace=apps/mobile`
Expected: every mobile test passes. Any failure must be fixed before proceeding — do NOT mark Task 14 complete on partial pass.

- [ ] **Step 2: Shared workspace run**

Run: `npm run test --workspace=packages/shared`
Expected: every shared test passes.

- [ ] **Step 3: Monorepo lint + typecheck + tests**

Run: `npm run ci:local`
Expected: full pass.

- [ ] **Step 4: Manual device smoke test (expo start)**

This step cannot be automated by a subagent — the developer must run it.

1. `cd apps/mobile && npx expo start` (or use the existing dev-launch script).
2. Open the app on iOS Simulator and Android emulator.
3. Navigate to the Marketplace tab.
4. Verify:
   - Header shows heart and menu icons (not the old list icon).
   - Search bar is visible and tappable; typing narrows results after a ~300ms debounce.
   - Category tile row scrolls horizontally; tapping a tile applies a terracotta ring and filters the grid; tapping again clears.
   - Tabs (For You · Featured · Recent) render and active tab has the terracotta underline.
   - Grid shows 2 columns, ≥ 4 visible cards on a 6.1" device.
   - Cards have no "Contact Seller" button.
   - Heart on a card toggles saved state.
   - Tapping the menu icon slides up a bottom sheet with six rows; each row routes correctly; "Saved" also routes from the header heart.
   - Pull-to-refresh still works.
   - FAB still opens CreateListing (if trust_level ≥ 1).
   - Empty state (e.g. by searching "xxxnomatchxxx") shows the warm empty copy and "Clear filters" button.

- [ ] **Step 5: Final checkpoint**

No new files to commit at this step unless verification surfaced small fixes. If fixes were needed, stage them with a descriptive commit message and ask the user before committing.

---

## Risks and Rollback

- **Rollback:** Every task commits independently. To abandon the redesign before Task 13, the home screen remains intact; new components are dormant. After Task 13, revert the home screen commit and the redesign is gone — components remain but unreferenced, safe to remove in a follow-up.
- **Performance:** `FlatList` with `numColumns={2}` plus skeleton empty state is the same shape the web redesign uses; no new dependency.
- **Accessibility:** Every interactive element has `accessibilityLabel` + `accessibilityRole`. Verify with TalkBack / VoiceOver during Task 14 step 4.
- **Cross-stack navigation for "Change Location":** Uses `navigation.getParent()?.navigate('Home', { screen: 'ManageLocations' })`. If the parent tab name differs at runtime, this silently fails. To validate during Task 14 step 4.

## Accepted deferrals from spec

- **Spec §9.3 inline error retry banner** — plan currently sets empty state on fetch error with no retry affordance. This matches today's behavior. Add a proper error banner in a follow-up plan if users report silent failures.
- **Spec §6.2 `ListingStripCard`** — no v1 consumer, deferred.
- **Location text on card** — not exposed by current shared API; `ListingGridCard` shows freshness only. Follow-up plan to extend `getListingsByMetro` can add location later.

## Out of Scope (from spec §3, restated)

- Web marketplace redesign.
- `MarketplaceCategoryScreen`, `ListingDetailScreen`, `CreateListingScreen`, `MyListingsScreen`, `PromoteListingScreen` redesigns.
- "Near" tab distance-sort backend (deferred; ship with 3 tabs).
- Location text on cards (requires shared API extension).
- Custom SVG illustrations.
- Personalization ranking for "For You".
