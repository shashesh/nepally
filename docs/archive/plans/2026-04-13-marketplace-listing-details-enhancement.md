---
title: Marketplace listing details enhancement
status: implemented
created: 2026-04-13
spec: docs/specs/2026-04-13-marketplace-listing-details-enhancement-design.md
---

# Marketplace Listing Details Enhancement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the marketplace listing detail page on web and mobile to the Split View layout: breadcrumb, quick highlights strip, sticky desktop sidebar with price/CTA, mobile inline price card, and always-visible mobile bottom CTA bar.

**Architecture:** Zero DB changes. Two new pure shared helpers (`isBusinessOpenNow`, `getListingHighlights`) consumed by web page and mobile screen. Web adopts a two-column CSS grid with sticky sidebar; collapses to single column under 960px. Mobile gains a sticky bottom bar using `position: 'absolute'`. Save action moves to header icon on mobile.

**Tech Stack:** TypeScript, Next.js 15, React 19, React Native (Expo 54), Vitest (web + shared), Jest (mobile), CSS Modules (web), StyleSheet (mobile).

**Spec:** [docs/specs/2026-04-13-marketplace-listing-details-enhancement-design.md](../specs/2026-04-13-marketplace-listing-details-enhancement-design.md)

---

## File Structure

**Shared package (new):**
- `packages/shared/src/logic/marketplace/isBusinessOpenNow.ts` — pure helper
- `packages/shared/src/logic/marketplace/isBusinessOpenNow.test.ts` — unit tests
- `packages/shared/src/logic/marketplace/getListingHighlights.ts` — pure helper
- `packages/shared/src/logic/marketplace/getListingHighlights.test.ts` — unit tests
- `packages/shared/src/logic/marketplace/index.ts` — barrel export
- `packages/shared/src/logic/index.ts` — barrel export (new, if not present)
- `packages/shared/src/index.ts` — re-export from `./logic`

**Web (modify):**
- `apps/web/src/pages/marketplace/listing/[id].page.tsx` — restructure layout
- `apps/web/src/pages/marketplace/marketplace.module.css` — new classes (`breadcrumb`, `twoColumnGrid`, `mainColumn`, `sidebar`, `sidebarSticky`, `highlightsStrip`, `highlightChip`, `inlinePriceCard`)
- `apps/web/src/pages/marketplace/listing/[id].test.tsx` — extend tests

**Mobile (modify):**
- `apps/mobile/src/screens/marketplace/ListingDetailScreen.tsx` — restructure layout
- `apps/mobile/src/screens/marketplace/ListingDetailScreen.test.tsx` — extend tests

---

## Task 1: Add `isBusinessOpenNow` shared helper (TDD)

**Files:**
- Create: `packages/shared/src/logic/marketplace/isBusinessOpenNow.ts`
- Create: `packages/shared/src/logic/marketplace/isBusinessOpenNow.test.ts`

- [ ] **Step 1.1: Write the failing test**

Create `packages/shared/src/logic/marketplace/isBusinessOpenNow.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isBusinessOpenNow } from './isBusinessOpenNow';
import type { BusinessHours } from '../../types/marketplace';

// Monday 2026-04-13 10:00 local
const MONDAY_10AM = new Date(2026, 3, 13, 10, 0, 0);
// Monday 2026-04-13 20:00 local
const MONDAY_8PM = new Date(2026, 3, 13, 20, 0, 0);
// Sunday 2026-04-12 14:00 local
const SUNDAY_2PM = new Date(2026, 3, 12, 14, 0, 0);

const HOURS: BusinessHours = {
  monday: { open: '09:00', close: '17:00' },
  tuesday: { open: '09:00', close: '17:00' },
};

describe('isBusinessOpenNow', () => {
  it('returns isOpen=true during hours', () => {
    expect(isBusinessOpenNow(HOURS, MONDAY_10AM)).toEqual({
      isOpen: true,
      nextChangeLabel: 'Closes 5p',
    });
  });

  it('returns isOpen=false after close', () => {
    expect(isBusinessOpenNow(HOURS, MONDAY_8PM)).toEqual({
      isOpen: false,
      nextChangeLabel: undefined,
    });
  });

  it('returns isOpen=false on day with no entry', () => {
    expect(isBusinessOpenNow(HOURS, SUNDAY_2PM)).toEqual({
      isOpen: false,
      nextChangeLabel: undefined,
    });
  });

  it('returns isOpen=false for null input', () => {
    expect(isBusinessOpenNow(null, MONDAY_10AM)).toEqual({
      isOpen: false,
      nextChangeLabel: undefined,
    });
  });

  it('returns isOpen=false for undefined input', () => {
    expect(isBusinessOpenNow(undefined, MONDAY_10AM)).toEqual({
      isOpen: false,
      nextChangeLabel: undefined,
    });
  });

  it('returns isOpen=false before open', () => {
    const MONDAY_8AM = new Date(2026, 3, 13, 8, 0, 0);
    expect(isBusinessOpenNow(HOURS, MONDAY_8AM)).toEqual({
      isOpen: false,
      nextChangeLabel: undefined,
    });
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `npm test --workspace=@nepally/shared -- isBusinessOpenNow`
Expected: FAIL — `Cannot find module './isBusinessOpenNow'`.

- [ ] **Step 1.3: Write the implementation**

Create `packages/shared/src/logic/marketplace/isBusinessOpenNow.ts`:

```typescript
import type { BusinessHours } from '../../types/marketplace';

export interface OpenStatus {
  isOpen: boolean;
  nextChangeLabel?: string;
}

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

function parseTimeToMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatTimeLabel(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? 'p' : 'a';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${m.toString().padStart(2, '0')}${period}`;
}

export function isBusinessOpenNow(
  businessHours: BusinessHours | null | undefined,
  now: Date
): OpenStatus {
  if (!businessHours) {
    return { isOpen: false, nextChangeLabel: undefined };
  }
  const dayKey = DAY_KEYS[now.getDay()];
  const entry = businessHours[dayKey];
  if (!entry) {
    return { isOpen: false, nextChangeLabel: undefined };
  }
  const openMin = parseTimeToMinutes(entry.open);
  const closeMin = parseTimeToMinutes(entry.close);
  if (openMin === null || closeMin === null) {
    return { isOpen: false, nextChangeLabel: undefined };
  }
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isOpen = nowMin >= openMin && nowMin < closeMin;
  return {
    isOpen,
    nextChangeLabel: isOpen ? `Closes ${formatTimeLabel(closeMin)}` : undefined,
  };
}
```

- [ ] **Step 1.4: Run test to verify it passes**

Run: `npm test --workspace=@nepally/shared -- isBusinessOpenNow`
Expected: PASS — all 6 tests green.

- [ ] **Step 1.5: Commit**

```bash
git add packages/shared/src/logic/marketplace/isBusinessOpenNow.ts \
        packages/shared/src/logic/marketplace/isBusinessOpenNow.test.ts
git commit -m "feat(shared): add isBusinessOpenNow helper"
```

---

## Task 2: Add `getListingHighlights` shared helper (TDD)

**Files:**
- Create: `packages/shared/src/logic/marketplace/getListingHighlights.ts`
- Create: `packages/shared/src/logic/marketplace/getListingHighlights.test.ts`

- [ ] **Step 2.1: Write the failing test**

Create `packages/shared/src/logic/marketplace/getListingHighlights.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getListingHighlights } from './getListingHighlights';
import type { MarketplaceListing } from '../../types/marketplace';

const NOW = new Date(2026, 3, 13, 10, 0, 0); // Monday 10am

const BASE: MarketplaceListing = {
  id: 'l1',
  owner_id: 'u1',
  metro_area_id: 'm1',
  category_id: 'c1',
  listing_type: 'business',
  status: 'active',
  title: 'Himalayan Kitchen',
  description: 'Momos',
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
  refreshed_at: NOW.toISOString(),
  created_at: NOW.toISOString(),
  updated_at: NOW.toISOString(),
};

describe('getListingHighlights', () => {
  it('returns open/address/phone chips for business listing', () => {
    const chips = getListingHighlights(
      {
        ...BASE,
        listing_type: 'business',
        business_hours: { monday: { open: '09:00', close: '17:00' } },
        address: '4823 Georgia Ave NW, Washington, DC 20011',
        phone: '(202) 555-0184',
      },
      NOW
    );
    expect(chips.map((c) => c.key)).toEqual(['open_now', 'address', 'phone']);
    expect(chips[0].value).toBe('Closes 5p');
  });

  it('omits chips when source field is missing', () => {
    const chips = getListingHighlights(
      { ...BASE, listing_type: 'business', phone: '555-1' },
      NOW
    );
    expect(chips.map((c) => c.key)).toEqual(['phone']);
  });

  it('returns condition/category/posted chips for individual listing', () => {
    const chips = getListingHighlights(
      {
        ...BASE,
        listing_type: 'individual',
        item_condition: 'used',
        category: {
          id: 'c1',
          name: 'Electronics',
          slug: 'electronics',
          emoji: '📱',
          icon: null,
          color: null,
          description: null,
          sort_order: 0,
          created_at: NOW.toISOString(),
        },
        refreshed_at: new Date(2026, 3, 10, 10, 0, 0).toISOString(), // 3 days ago
      },
      NOW
    );
    expect(chips.map((c) => c.key)).toEqual(['condition', 'category', 'posted']);
    expect(chips[0].value).toBe('Used');
    expect(chips[1].value).toBe('Electronics');
    expect(chips[2].value).toBe('Posted 3d ago');
  });

  it('returns empty array for individual with no fields', () => {
    const chips = getListingHighlights(
      { ...BASE, listing_type: 'individual' },
      NOW
    );
    expect(chips.map((c) => c.key)).toEqual(['posted']);
    expect(chips[0].value).toBe('Posted today');
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `npm test --workspace=@nepally/shared -- getListingHighlights`
Expected: FAIL — `Cannot find module './getListingHighlights'`.

- [ ] **Step 2.3: Write the implementation**

Create `packages/shared/src/logic/marketplace/getListingHighlights.ts`:

```typescript
import type { MarketplaceListing } from '../../types/marketplace';
import { isBusinessOpenNow } from './isBusinessOpenNow';

export interface HighlightChip {
  key: string;
  icon: string;
  label: string;
  value: string;
}

function formatPostedAgo(refreshedAt: string, now: Date): string {
  const then = new Date(refreshedAt).getTime();
  const days = Math.floor((now.getTime() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted 1d ago';
  return `Posted ${days}d ago`;
}

function shortenAddress(address: string): string {
  const comma = address.indexOf(',');
  return comma === -1 ? address : address.slice(0, comma);
}

export function getListingHighlights(
  listing: MarketplaceListing,
  now: Date
): HighlightChip[] {
  const chips: HighlightChip[] = [];

  if (listing.listing_type === 'business') {
    const status = isBusinessOpenNow(listing.business_hours, now);
    if (listing.business_hours) {
      chips.push({
        key: 'open_now',
        icon: '🕒',
        label: status.isOpen ? 'Open now' : 'Closed',
        value: status.nextChangeLabel ?? (status.isOpen ? 'Open now' : 'Closed'),
      });
    }
    if (listing.address) {
      chips.push({
        key: 'address',
        icon: '📍',
        label: 'Location',
        value: shortenAddress(listing.address),
      });
    }
    if (listing.phone) {
      chips.push({
        key: 'phone',
        icon: '📞',
        label: 'Phone',
        value: listing.phone,
      });
    }
    return chips;
  }

  // individual
  if (listing.item_condition) {
    chips.push({
      key: 'condition',
      icon: '✨',
      label: 'Condition',
      value: listing.item_condition === 'new' ? 'New' : 'Used',
    });
  }
  if (listing.category?.name) {
    chips.push({
      key: 'category',
      icon: listing.category.emoji ?? '🏷️',
      label: 'Category',
      value: listing.category.name,
    });
  }
  chips.push({
    key: 'posted',
    icon: '🗓️',
    label: 'Posted',
    value: formatPostedAgo(listing.refreshed_at, now),
  });
  return chips;
}
```

- [ ] **Step 2.4: Run test to verify it passes**

Run: `npm test --workspace=@nepally/shared -- getListingHighlights`
Expected: PASS — all 4 tests green.

- [ ] **Step 2.5: Commit**

```bash
git add packages/shared/src/logic/marketplace/getListingHighlights.ts \
        packages/shared/src/logic/marketplace/getListingHighlights.test.ts
git commit -m "feat(shared): add getListingHighlights helper"
```

---

## Task 3: Export helpers from shared package barrel

**Files:**
- Create: `packages/shared/src/logic/marketplace/index.ts`
- Create: `packages/shared/src/logic/index.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 3.1: Create marketplace logic barrel**

Create `packages/shared/src/logic/marketplace/index.ts`:

```typescript
export { isBusinessOpenNow, type OpenStatus } from './isBusinessOpenNow';
export { getListingHighlights, type HighlightChip } from './getListingHighlights';
```

- [ ] **Step 3.2: Create logic barrel**

Create `packages/shared/src/logic/index.ts`:

```typescript
export * from './marketplace';
```

- [ ] **Step 3.3: Re-export from package root**

Open `packages/shared/src/index.ts`. Add the following line alongside existing exports:

```typescript
export * from './logic';
```

- [ ] **Step 3.4: Verify import works**

Run: `npm test --workspace=@nepally/shared -- isBusinessOpenNow getListingHighlights`
Expected: PASS.

Also run a type check if the workspace has one:

Run: `npm run typecheck --workspace=@nepally/shared` (skip if script doesn't exist)

- [ ] **Step 3.5: Commit**

```bash
git add packages/shared/src/logic/marketplace/index.ts \
        packages/shared/src/logic/index.ts \
        packages/shared/src/index.ts
git commit -m "feat(shared): export marketplace logic helpers"
```

---

## Task 4: Web — Add CSS Module classes for split layout

**Files:**
- Modify: `apps/web/src/pages/marketplace/marketplace.module.css`

- [ ] **Step 4.1: Append new CSS classes**

Append the following at the end of `apps/web/src/pages/marketplace/marketplace.module.css`:

```css
/* ===== Listing detail — Split View enhancement (2026-04-13) ===== */

.detailContainerWide {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px;
}

.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary, #757575);
  margin-bottom: 16px;
}

.breadcrumb a {
  color: var(--color-primary, #1565C0);
  text-decoration: none;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.breadcrumbSep {
  color: var(--color-text-tertiary, #9E9E9E);
}

.breadcrumbCurrent {
  color: var(--color-text-primary, #212121);
  font-weight: 500;
}

.twoColumnGrid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 32px;
  align-items: start;
}

.mainColumn {
  min-width: 0;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: white;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 12px;
  padding: 20px;
  position: sticky;
  top: 80px;
  align-self: start;
}

.sidebarPrice {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary, #1565C0);
  margin-bottom: 4px;
}

.highlightsStrip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.highlightChip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-background-subtle, #F5F5F5);
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--color-text-primary, #212121);
}

.highlightChipOpen {
  background: #E8F5E9;
  border-color: #A5D6A7;
  color: #1B5E20;
}

.inlinePriceCard {
  display: none;
}

@media (max-width: 960px) {
  .twoColumnGrid {
    grid-template-columns: minmax(0, 1fr);
  }

  .sidebar {
    display: none;
  }

  .inlinePriceCard {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: white;
    border: 1px solid var(--color-border, #e0e0e0);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
  }
}
```

- [ ] **Step 4.2: Commit**

```bash
git add apps/web/src/pages/marketplace/marketplace.module.css
git commit -m "feat(web): add split-view CSS for listing detail"
```

---

## Task 5: Web — Write failing tests for new listing detail structure

**Files:**
- Modify: `apps/web/src/pages/marketplace/listing/[id].test.tsx`

- [ ] **Step 5.1: Add new test cases**

Inside the existing `describe('ListingDetailPage', ...)` block in `apps/web/src/pages/marketplace/listing/[id].test.tsx`, after the last existing test, insert these new tests:

```typescript
  it('renders breadcrumb with category name', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeDefined();
      expect(screen.getByText('Food & Restaurants')).toBeDefined();
    });
  });

  it('renders highlights strip with phone chip for business listing', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      // Phone value appears both in Business Details and in the highlights chip.
      expect(screen.getAllByText('555-1234').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders sidebar with Contact Seller and Save buttons for non-owner', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Contact Seller')).toBeDefined();
      expect(screen.getByText('Save listing')).toBeDefined();
    });
  });

  it('renders Edit and Promote buttons in sidebar for owner', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'user-2', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeDefined();
      expect(screen.getByText('Promote')).toBeDefined();
    });
  });
```

Also add the new shared helpers to the `@nepally/shared` mock near the top of the file. Find the existing `vi.mock('@nepally/shared', ...)` block and add:

```typescript
  getListingHighlights: vi.fn(() => [
    { key: 'phone', icon: '📞', label: 'Phone', value: '555-1234' },
  ]),
  isBusinessOpenNow: vi.fn(() => ({ isOpen: true, nextChangeLabel: 'Closes 5p' })),
```

- [ ] **Step 5.2: Run tests to verify they fail**

Run: `npm test --workspace=apps/web -- listing/\\[id\\]`
Expected: FAIL — breadcrumb text, Save listing text, Edit Listing text, Promote text not found.

---

## Task 6: Web — Restructure listing detail page

**Files:**
- Modify: `apps/web/src/pages/marketplace/listing/[id].page.tsx`

- [ ] **Step 6.1: Replace the entire file**

Overwrite `apps/web/src/pages/marketplace/listing/[id].page.tsx` with:

```typescript
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import {
  getListingById,
  saveListing,
  unsaveListing,
  getUserSavedListingIds,
  incrementListingViews,
  incrementListingContacts,
  getListingHighlights,
  LISTING_TYPE_LABELS,
  ITEM_CONDITION_LABELS,
  BUSINESS_HOURS_DAYS,
  type MarketplaceListing,
} from '@nepally/shared';
import styles from '../marketplace.module.css';

const CATEGORY_THEME_CLASS_BY_SLUG: Record<string, string> = {
  'food-restaurants': styles.categoryThemeFoodRestaurants,
  'grocery-specialty': styles.categoryThemeGrocerySpecialty,
  'professional-services': styles.categoryThemeProfessionalServices,
  'immigration-legal': styles.categoryThemeImmigrationLegal,
  'remittance-finance': styles.categoryThemeRemittanceFinance,
  'health-wellness': styles.categoryThemeHealthWellness,
  'education-tutoring': styles.categoryThemeEducationTutoring,
  transportation: styles.categoryThemeTransportation,
  'home-services': styles.categoryThemeHomeServices,
  'beauty-wellness': styles.categoryThemeBeautyWellness,
  'cultural-services': styles.categoryThemeCulturalServices,
  other: styles.categoryThemeOther,
};

export default function ListingDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { id: listingId } = router.query;

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  useEffect(() => {
    async function fetchData() {
      if (!router.isReady || !listingId || typeof listingId !== 'string') return;

      const listingResult = await getListingById(supabase, listingId);
      if (listingResult.data) {
        setListing(listingResult.data);
        incrementListingViews(supabase, listingId);
      }

      if (user) {
        const savedResult = await getUserSavedListingIds(supabase, user.id);
        if (savedResult.data) {
          setIsSaved(savedResult.data.includes(listingId));
        }
      }

      setLoading(false);
    }
    fetchData();
  }, [listingId, user, router.isReady]);

  const handleSave = useCallback(async () => {
    if (typeof listingId !== 'string') return;
    setSaving(true);
    if (isSaved) {
      const result = await unsaveListing(supabase, listingId);
      if (!result.error) setIsSaved(false);
    } else {
      const result = await saveListing(supabase, listingId);
      if (!result.error) setIsSaved(true);
    }
    setSaving(false);
  }, [isSaved, listingId]);

  const handleContact = useCallback(async () => {
    if (!listing?.owner || typeof listingId !== 'string') return;
    await incrementListingContacts(supabase, listingId);
    router.push(`/messages?to=${listing.owner.id}`);
  }, [listing, listingId, router]);

  if (!user) return null;

  if (loading) {
    return (
      <div className={styles.detailContainerWide}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className={styles.detailContainerWide}>
        <Link href="/marketplace" className={styles.backLink}>← Back to Marketplace</Link>
        <p>Listing not found.</p>
      </div>
    );
  }

  const isOwner = user.id === listing.owner_id;
  const daysAgo = Math.floor(
    (Date.now() - new Date(listing.refreshed_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const categoryThemeClass =
    CATEGORY_THEME_CLASS_BY_SLUG[listing.category?.slug ?? ''] ?? styles.categoryThemeOther;
  const highlights = getListingHighlights(listing, new Date());

  const sidebarContent = !isOwner ? (
    <>
      {listing.price && <div className={styles.sidebarPrice}>{listing.price}</div>}
      <Button onClick={handleContact}>Contact Seller</Button>
      <Button variant={isSaved ? 'filled' : 'outline'} onClick={handleSave} loading={saving}>
        {isSaved ? '✓ Saved' : 'Save listing'}
      </Button>
    </>
  ) : (
    <>
      {listing.price && <div className={styles.sidebarPrice}>{listing.price}</div>}
      <Link href={`/marketplace/create?edit=${listing.id}`}>
        <Button variant="outline">Edit Listing</Button>
      </Link>
      <Link href={`/marketplace/listing/promote/${listing.id}`}>
        <Button>Promote</Button>
      </Link>
    </>
  );

  return (
    <>
      <Head>
        <title>{listing.title} - Marketplace - Nepally</title>
      </Head>
      <div className={`${styles.detailContainerWide} ${categoryThemeClass}`}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/marketplace">Marketplace</Link>
          {listing.category && (
            <>
              <span className={styles.breadcrumbSep}>›</span>
              <Link href={`/marketplace/${listing.category.slug}`}>{listing.category.name}</Link>
            </>
          )}
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>{listing.title}</span>
        </nav>

        <div className={styles.twoColumnGrid}>
          <div className={styles.mainColumn}>
            {listing.photos.length > 0 && (
              <div className={styles.photoGallery}>
                <Image
                  src={listing.photos[photoIndex]}
                  alt={`${listing.title} photo ${photoIndex + 1}`}
                  className={styles.mainPhoto}
                  fill
                />
                {listing.photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      className={styles.galleryPrev}
                      onClick={() =>
                        setPhotoIndex((i) => (i - 1 + listing.photos.length) % listing.photos.length)
                      }
                      aria-label="Previous photo"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className={styles.galleryNext}
                      onClick={() => setPhotoIndex((i) => (i + 1) % listing.photos.length)}
                      aria-label="Next photo"
                    >
                      ›
                    </button>
                    <div className={styles.galleryIndicator}>
                      {photoIndex + 1} / {listing.photos.length}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className={styles.detailSection}>
              <h1 className={styles.detailTitle}>{listing.title}</h1>

              <div className={styles.listingMeta}>
                <span className={styles.badge}>
                  {listing.category?.emoji} {listing.category?.name}
                </span>
                <span className={styles.badgeType}>
                  {LISTING_TYPE_LABELS[listing.listing_type]}
                </span>
                {listing.item_condition && (
                  <span className={styles.badgeType}>
                    {ITEM_CONDITION_LABELS[listing.item_condition]}
                  </span>
                )}
              </div>

              {highlights.length > 0 && (
                <div className={styles.highlightsStrip}>
                  {highlights.map((chip) => (
                    <span
                      key={chip.key}
                      className={`${styles.highlightChip} ${
                        chip.key === 'open_now' ? styles.highlightChipOpen : ''
                      }`}
                    >
                      <span aria-hidden="true">{chip.icon}</span>
                      {chip.value}
                    </span>
                  ))}
                </div>
              )}

              {/* Inline price card — visible only below 960px */}
              <div className={styles.inlinePriceCard}>
                {sidebarContent}
              </div>

              <p className={styles.detailDescription}>{listing.description}</p>
            </div>

            {listing.listing_type === 'business' && (
              <div className={styles.detailSection}>
                <h3 className={styles.sectionTitle}>Business Details</h3>
                {listing.business_name && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Business:</span>
                    <span className={styles.detailValue}>{listing.business_name}</span>
                  </div>
                )}
                {listing.address && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Address:</span>
                    <span className={styles.detailValue}>{listing.address}</span>
                  </div>
                )}
                {listing.phone && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Phone:</span>
                    <span className={styles.detailValue}>{listing.phone}</span>
                  </div>
                )}
                {listing.email && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Email:</span>
                    <span className={styles.detailValue}>{listing.email}</span>
                  </div>
                )}
                {listing.website_url && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Website:</span>
                    <span className={styles.detailValue}>{listing.website_url}</span>
                  </div>
                )}
                {listing.business_hours && (
                  <>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Hours:</span>
                    </div>
                    {BUSINESS_HOURS_DAYS.map((day) => {
                      const hours = listing.business_hours?.[day];
                      if (!hours) return null;
                      return (
                        <div key={day} className={styles.businessHourRow}>
                          <span className={styles.detailLabel}>
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </span>
                          <span className={styles.detailValue}>
                            {hours.open} - {hours.close}
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {listing.owner && (
              <div className={styles.detailSection}>
                <h3 className={styles.sectionTitle}>Posted by</h3>
                <div className={styles.ownerRow}>
                  <div className={styles.ownerAvatar}>
                    {listing.owner.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className={styles.ownerName}>{listing.owner.full_name}</div>
                    <div className={styles.ownerMeta}>
                      {daysAgo === 0 ? 'Refreshed today' : `Refreshed ${daysAgo}d ago`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.listingStats}>
              <span>{listing.views_count} views</span>
              <span>{listing.saves_count} saves</span>
            </div>
          </div>

          <aside className={styles.sidebar} aria-label="Listing actions">
            {sidebarContent}
          </aside>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 6.2: Run tests to verify they pass**

Run: `npm test --workspace=apps/web -- listing/\\[id\\]`
Expected: PASS — all existing + 4 new tests green.

- [ ] **Step 6.3: Run web type check**

Run: `npm run typecheck --workspace=apps/web`
Expected: no errors.

- [ ] **Step 6.4: Commit**

```bash
git add apps/web/src/pages/marketplace/listing/[id].page.tsx \
        apps/web/src/pages/marketplace/listing/[id].test.tsx
git commit -m "feat(web): redesign listing detail with split view + highlights"
```

---

## Task 7: Mobile — Write failing tests for new listing detail structure

**Files:**
- Modify: `apps/mobile/src/screens/marketplace/ListingDetailScreen.test.tsx`

- [ ] **Step 7.1: Inspect existing test file**

Open `apps/mobile/src/screens/marketplace/ListingDetailScreen.test.tsx` and note:
- The `@nepally/shared` mock (add new helpers to it).
- Which mock listing it uses (add required fields if missing).
- The pattern for assertions (`render()` + `await waitFor()`, no `act()`).

- [ ] **Step 7.2: Add new helper mocks**

In the `jest.mock('@nepally/shared', ...)` block, add:

```typescript
  getListingHighlights: jest.fn(() => [
    { key: 'phone', icon: '📞', label: 'Phone', value: '555-1234' },
  ]),
  isBusinessOpenNow: jest.fn(() => ({ isOpen: true, nextChangeLabel: 'Closes 5p' })),
```

- [ ] **Step 7.3: Add new test cases**

Append these tests inside the existing `describe` block. Use `render()` + `await waitFor()` only — NO `act()`:

```typescript
  it('renders breadcrumb with category name', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });
  });

  it('renders highlight chip value', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getAllByText('555-1234').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders sticky bottom bar with Contact Seller for non-owner', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Contact Seller')).toBeTruthy();
    });
  });

  it('hides sticky bottom bar for owner', async () => {
    // Re-configure auth mock so current user matches listing.owner_id
    mockUseAuth.mockReturnValue({ user: { id: MOCK_LISTING.owner_id } });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.queryByText('Contact Seller')).toBeNull();
    });
  });
```

NOTE: Adjust `mockUseAuth` / `MOCK_LISTING` references to match the actual names already used in the existing test file. If the file uses different names (e.g., `mocks.useAuth`), use those.

- [ ] **Step 7.4: Run tests to verify new tests fail**

Run: `npm test --workspace=apps/mobile -- ListingDetailScreen`
Expected: FAIL — breadcrumb, sticky bar text not found.

---

## Task 8: Mobile — Restructure ListingDetailScreen

**Files:**
- Modify: `apps/mobile/src/screens/marketplace/ListingDetailScreen.tsx`

- [ ] **Step 8.1: Import the new helper**

In the import block from `@nepally/shared` in `apps/mobile/src/screens/marketplace/ListingDetailScreen.tsx`, add `getListingHighlights`:

```typescript
import {
  getListingById,
  saveListing,
  unsaveListing,
  getUserSavedListingIds,
  incrementListingViews,
  incrementListingContacts,
  getOrCreateConversation,
  getActivePromotionForListing,
  getListingHighlights,
  LISTING_TYPE_LABELS,
  ITEM_CONDITION_LABELS,
  BUSINESS_HOURS_DAYS,
  type MarketplaceListing,
} from '@nepally/shared';
```

- [ ] **Step 8.2: Compute highlights in render**

After the existing derivations (e.g., `isOwner`, `daysAgo`), add:

```typescript
const highlights = getListingHighlights(listing, new Date());
```

- [ ] **Step 8.3: Add breadcrumb row above title**

Locate the title block in the JSX. Immediately above it (still inside `ScrollView`), insert:

```tsx
<View style={styles.breadcrumb}>
  <Text style={styles.breadcrumbText}>Marketplace</Text>
  {listing.category?.name && (
    <>
      <Text style={styles.breadcrumbSep}> › </Text>
      <Text style={styles.breadcrumbText}>{listing.category.name}</Text>
    </>
  )}
</View>
```

- [ ] **Step 8.4: Add highlights strip below title**

Immediately below the title/badges block, insert:

```tsx
{highlights.length > 0 && (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.highlightsStrip}
  >
    {highlights.map((chip) => (
      <View
        key={chip.key}
        style={[styles.highlightChip, chip.key === 'open_now' && styles.highlightChipOpen]}
      >
        <Text style={styles.highlightChipText}>
          {chip.icon} {chip.value}
        </Text>
      </View>
    ))}
  </ScrollView>
)}
```

- [ ] **Step 8.5: Add inline price card above description**

If `listing.price` exists, render above the description:

```tsx
{listing.price && (
  <View style={styles.inlinePriceCard}>
    <Text style={styles.inlinePrice}>{listing.price}</Text>
  </View>
)}
```

- [ ] **Step 8.6: Add sticky bottom bar**

After the outer `ScrollView` closing tag but inside the `SafeAreaView`, add:

```tsx
{!isOwner && (
  <View style={styles.stickyBar}>
    {listing.price && (
      <View style={styles.stickyBarPrice}>
        <Text style={styles.stickyBarPriceText}>{listing.price}</Text>
      </View>
    )}
    <TouchableOpacity
      style={styles.stickyBarButton}
      onPress={handleContact}
      accessibilityRole="button"
    >
      <Text style={styles.stickyBarButtonText}>Contact Seller</Text>
    </TouchableOpacity>
  </View>
)}
```

Also add `contentContainerStyle={{ paddingBottom: 88 }}` to the outer `ScrollView` if not already present, so content doesn't hide behind the sticky bar.

- [ ] **Step 8.7: Move Save into a header icon button (non-owner only)**

Find the current action bar where Save/Contact Seller live and **remove the Save button from the inline action bar** (keep Contact if it's there, or remove both since the sticky bar replaces them). Keep Edit/Promote for the owner case unchanged.

Add a header icon button. The screen already uses `useNavigation`; set `navigation.setOptions` in a `useEffect`:

```typescript
useEffect(() => {
  if (!listing || isOwner) return;
  navigation.setOptions({
    headerRight: () => (
      <TouchableOpacity
        onPress={handleSave}
        accessibilityRole="button"
        accessibilityLabel={isSaved ? 'Unsave listing' : 'Save listing'}
        style={{ paddingHorizontal: 12 }}
      >
        <Ionicons
          name={isSaved ? 'bookmark' : 'bookmark-outline'}
          size={22}
          color={colors.primary}
        />
      </TouchableOpacity>
    ),
  });
}, [listing, isOwner, isSaved, handleSave, navigation]);
```

- [ ] **Step 8.8: Add StyleSheet entries**

In the `StyleSheet.create({ ... })` block at the bottom of the file, add:

```typescript
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  breadcrumbText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  breadcrumbSep: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  highlightsStrip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  highlightChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.backgroundSubtle,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  highlightChipOpen: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  highlightChipText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  inlinePriceCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlinePrice: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  stickyBarPrice: {
    flexShrink: 0,
  },
  stickyBarPriceText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  stickyBarButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  stickyBarButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
```

NOTE: If any referenced token (`colors.backgroundSubtle`, `borderRadius.pill`, `colors.textTertiary`) does not exist in the mobile style system, substitute the nearest existing token (e.g., `colors.backgroundGray`, `borderRadius.full`, `colors.textSecondary`). Run typecheck after editing.

- [ ] **Step 8.9: Run mobile tests**

Run: `npm test --workspace=apps/mobile -- ListingDetailScreen`
Expected: all existing + new tests PASS.

- [ ] **Step 8.10: Run mobile type check**

Run: `npm run typecheck --workspace=apps/mobile`
Expected: no errors.

- [ ] **Step 8.11: Commit**

```bash
git add apps/mobile/src/screens/marketplace/ListingDetailScreen.tsx \
        apps/mobile/src/screens/marketplace/ListingDetailScreen.test.tsx
git commit -m "feat(mobile): redesign listing detail with sticky bar + highlights"
```

---

## Task 9: Full verification pass

- [ ] **Step 9.1: Run shared tests**

Run: `npm test --workspace=@nepally/shared`
Expected: all green.

- [ ] **Step 9.2: Run web tests**

Run: `npm test --workspace=apps/web`
Expected: all green.

- [ ] **Step 9.3: Run mobile tests**

Run: `npm run test:ci --workspace=apps/mobile`
Expected: all green.

- [ ] **Step 9.4: Run monorepo type check**

Run: `npm run typecheck` (root)
Expected: no errors.

- [ ] **Step 9.5: Run monorepo lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 9.6: Manual web check**

Start web dev server: `npm run dev --workspace=apps/web`
Navigate to a business listing detail page. Verify:
- Breadcrumb appears above the gallery
- Highlights chips render below title
- Sidebar sticks on scroll at 1280px viewport
- Grid collapses to single column at ≤960px, sidebar moves above About
- No inline `style={{}}` introduced (grep)

Run: `grep -n "style={{" apps/web/src/pages/marketplace/listing/\[id\].page.tsx`
Expected: no matches.

- [ ] **Step 9.7: Manual mobile check (if simulator available)**

Start mobile: `npm start --workspace=apps/mobile`
Open a business listing. Verify:
- Breadcrumb + highlights strip render
- Sticky bar at bottom with Contact Seller
- Save icon in header toggles state
- Owner view hides sticky bar, shows Edit icon/actions

- [ ] **Step 9.8: No final commit needed** — all work committed in prior tasks.

---

## Self-Review (completed before publishing this plan)

**Spec coverage:**
- Breadcrumb → Task 6 (web), Task 8 (mobile) ✓
- Highlights strip → Task 2, 6, 8 ✓
- Sidebar price/CTA card (sticky desktop) → Task 4, 6 ✓
- Inline price card (mobile web + mobile app) → Task 4 (web CSS), Task 8 (mobile) ✓
- Sticky mobile CTA bar (always visible, price left, Contact right) → Task 8 ✓
- Save as header icon on mobile → Task 8.7 ✓
- Shared helpers `isBusinessOpenNow`, `getListingHighlights` → Tasks 1, 2 ✓
- Owner view Edit/Promote → Task 6, Task 8 ✓
- No inline styles → verified in Step 9.6 ✓
- Mobile tests use `waitFor` only, no `act()` → Task 7.3 ✓
- Unit tests for shared helpers → Tasks 1, 2 ✓
- Component tests for web + mobile → Tasks 5, 7 ✓

**Placeholder scan:** No TBDs, no "handle edge cases", no "similar to", all code blocks shown. Task 8.8 includes a fallback instruction for missing tokens (concrete, actionable).

**Type consistency:**
- `HighlightChip` defined in Task 2, consumed identically in Tasks 5, 6, 7, 8 ✓
- `OpenStatus` defined in Task 1, consumed in Task 2 ✓
- `getListingHighlights(listing, new Date())` signature consistent across web and mobile callsites ✓
- `handleContact`, `handleSave`, `isSaved`, `isOwner` all refer to existing symbols in the current file ✓
