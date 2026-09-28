---
title: Mobile marketplace fixes
status: in-progress
created: 2026-09-27
---

# Mobile Marketplace Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the bugs and UX gaps found in the 2026-09-27 audit of the native (iOS and Android) marketplace, starting with the four that block a store submission.

**Architecture:** Fixes stay in the layer that owns the behaviour. Query and type bugs go in `packages/shared`, so web gets them too. Screen behaviour goes in `apps/mobile`. A web change is made only when a shared change would otherwise break a web screen. Four PRs, each run as one chunk (see [How it runs](#how-it-runs)).

**Tech Stack:** Expo SDK 57, React Native 0.86, React Navigation 7 native-stack, `@nepally/shared` (Supabase JS, zod 4), Jest and React Native Testing Library (mobile), Vitest (shared and web).

---

## Where the findings come from

A code review of `apps/mobile/src/screens/marketplace/**`, `apps/mobile/src/components/marketplace/**`, the shared marketplace and promotions APIs, the marketplace docs, and web parity, on 2026-09-27. Nothing was reproduced on a device, so each fix starts with a failing test that proves the bug.

## How it runs

Each PR is one chunk, run the way PRs 7–10 of the [web UI overhaul](../../archive/plans/2026-09-14-web-ui-overhaul.md) ran:

- Inside a chunk, every task writes its failing test, runs only that test file, implements, re-runs it and commits. There is no review between tasks.
- At the end of the chunk, the gate runs:
  - `npm run type-check`
  - `npm run lint`
  - `npm run lint:guards`
  - the full unit suite of every workspace touched. Run web Vitest from a `C:\…` working directory; a lowercase `c:\` fails whole files.
  - `npm run docs:check` and `npm run lint:md`
- Then one code-review agent reviews the chunk's whole diff. CRITICAL and HIGH findings are fixed in one `fix: address PR N review` commit. Everything else goes to [Follow-ups](#follow-ups-not-scheduled), **never to new tasks**.
- Push, open a **draft** PR, and request Copilot's review. The user marks it ready, which starts CI.

| PR  | Branch                                   | Theme                                                                          |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | `fix/mobile-marketplace-launch-blockers` | Crash, reporting, Promote removal, search focus (merged #102)                  |
| 1b  | `feat/report-auto-hide-threshold`        | Reports hide a post or listing at 100, not 3 (migration 047; merged #103)      |
| 2   | `fix/mobile-marketplace-browse`          | Home, Category and Saved: rows, refetch, errors, location, price (merged #104) |
| 3   | `fix/mobile-marketplace-create-edit`     | Create and edit form                                                           |
| 4   | `fix/mobile-marketplace-detail`          | Listing detail and My Listings                                                 |

PR 1 is broken into steps below. PRs 2–4 list their tasks, files and acceptance criteria. Each one gets its step breakdown at the start of that PR, against the code as it is then.

---

## PR 1 — Launch blockers

**Files:**

- Modify: `packages/shared/src/api/promotions.ts`: inner-join the sponsored listing, drop rows without one
- Modify: `packages/shared/src/api/promotions.test.ts`
- Modify: `packages/shared/src/types/report.ts`: add the `listing` target
- Modify: `packages/shared/src/api/reports.test.ts`
- Modify: `apps/web/src/components/moderation/ReportCard.tsx`: listing reports link to the listing
- Modify: `apps/web/src/components/moderation/ReportCard.test.tsx`
- Modify: `apps/mobile/src/components/sheets/ReportPostSheet.tsx`: optional `title`
- Modify: `apps/mobile/src/components/sheets/ReportPostSheet.test.tsx`
- Modify: `apps/mobile/src/screens/marketplace/ListingDetailScreen.tsx`: real reports, no Promote
- Modify: `apps/mobile/src/screens/marketplace/ListingDetailScreen.test.tsx`
- Modify: `apps/mobile/src/components/marketplace/MarketplaceMenuSheet.tsx` and its test
- Modify: `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.tsx` and its test
- Modify: `apps/mobile/src/screens/marketplace/MyListingsScreen.tsx` and its test
- Modify: `apps/mobile/src/navigation/MarketplaceNavigator.tsx`, `apps/mobile/src/types/navigation.ts`
- Delete: `apps/mobile/src/screens/marketplace/PromoteListingScreen.tsx` and its test
- Docs: this plan, `docs/INDEX.md`, `docs/product/features/marketplace.md`, `docs/product/features/moderation.md`, `docs/plans/active/2026-09-18-production-launch.md`

### Task 1.1: Sponsored and sticky queries never return a promotion without its listing

**Bug.** `LISTING_SELECT_FOR_SPONSORED` embeds `marketplace_listings!listing_id` without `!inner`. PostgREST then applies `.filter('listing.metro_area_id', …)` and `.filter('listing.status', …)` to the embedded row only. Every active promotion in **every** metro comes back, with `listing: null` for the ones that don't match. `MarketplaceHomeScreen` maps those nulls into the grid (`.map((s) => s.listing)`), and the card crashes reading `listing.photos`. The home feed's sponsored slot and web do the same. The `limit` is also applied before the filter, so a metro can get zero sponsored items even when it has some.

**Files:**

- Modify: `packages/shared/src/api/promotions.ts:19-31` (select), `:105-153` (both functions)
- Test: `packages/shared/src/api/promotions.test.ts`

- [x] **Step 1: Write the failing tests.** Add these to the `getSponsoredFeedListings` describe block:

```ts
it('embeds the listing with an inner join so other metros are excluded in the DB', async () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

  await getSponsoredFeedListings(supabase, 'metro-1');

  expect(chain.select).toHaveBeenCalledWith(
    expect.stringContaining('marketplace_listings!listing_id!inner')
  );
});

it('drops promotions that came back without a listing', async () => {
  const orphan = { id: 'promo-9', promotion_type: 'sponsored_feed', listing: null };
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [orphan, MOCK_SPONSORED], error: null }),
  };
  const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

  const result = await getSponsoredFeedListings(supabase, 'metro-1');

  expect(result.data).toEqual([MOCK_SPONSORED]);
});
```

Add the same two tests to the `getStickyBusinessListings` describe block, calling `getStickyBusinessListings`. Give the orphan `promotion_type: 'sticky_business'` and expect `[stickyItem]`, where `const stickyItem = { ...MOCK_SPONSORED, promotion_type: 'sticky_business' }`.

- [x] **Step 2: Run them and watch them fail.**
      `npm run test --workspace=packages/shared -- src/api/promotions.test.ts`. Expected: 4 failures. The select string has no `!inner`, and the orphan row is returned.

- [x] **Step 3: Implement.** In `promotions.ts`, change the embed and add a filter helper under the select constant:

```ts
const LISTING_SELECT_FOR_SPONSORED = `
  listing:marketplace_listings!listing_id!inner (
    id, title, description, photos, price, category_id, listing_type,
    business_name, views_count, saves_count, contacts_count,
    trending_score, status, metro_area_id, refreshed_at, created_at,
    owner:users!marketplace_listings_owner_id_fkey (
      id, full_name, trust_level, profile_photo
    ),
    category:marketplace_categories!marketplace_listings_category_id_fkey (
      id, name, slug, emoji, icon, color
    )
  )
`;

type SponsoredRow = Omit<SponsoredListing, 'listing'> & {
  listing: SponsoredListing['listing'] | null;
};

/**
 * The `!inner` embed makes the database drop promotions whose listing fails
 * the metro or status filter. This guards the UI if one slips through anyway:
 * a card with a null listing crashes on render.
 */
function withListing(rows: unknown[] | null): SponsoredListing[] {
  return ((rows ?? []) as SponsoredRow[]).filter(
    (row): row is SponsoredListing => row.listing != null
  );
}
```

In both `getSponsoredFeedListings` and `getStickyBusinessListings`, replace `return { data: (data ?? []) as unknown as SponsoredListing[] };` with:

```ts
return { data: withListing(data) };
```

- [x] **Step 4: Run the file again.** Same command. Expected: PASS.

- [x] **Step 5: Confirm PostgREST accepts the embed (read-only).** Run a scratch script from the scratchpad directory. It takes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `apps/web/.env.local` and runs `from('listing_promotions_display').select('id, listing:marketplace_listings!listing_id!inner(id, status, metro_area_id)').filter('listing.status', 'eq', 'active').limit(5)`. Expected: no `PGRST` parse error. Every returned row has a non-null `listing`. Do not commit the script.

- [x] **Step 6: Commit.**

```bash
git add packages/shared/src/api/promotions.ts packages/shared/src/api/promotions.test.ts
git commit -m "fix(shared): never return a sponsored promotion without its listing"
```

### Task 1.2: `listing` is a report target, and the moderation queue shows it

**Bug.** Migration 014 added `listing` to the `report_target_type` enum. The shared `ReportTargetType` still lists only `post | user | message`. Web's `ReportCard` treats every non-post, non-user report as a chat message, so a listing report would read "Chat message report. Message content is private".

**Files:**

- Modify: `packages/shared/src/types/report.ts:7`
- Test: `packages/shared/src/api/reports.test.ts`
- Modify: `apps/web/src/components/moderation/ReportCard.tsx:20-40`
- Test: `apps/web/src/components/moderation/ReportCard.test.tsx`

- [x] **Step 1: Write the failing tests.** In `reports.test.ts`, inside `describe('createReport')`:

```ts
it('creates a listing report', async () => {
  const query = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'report-2' }, error: null }),
  };
  const supabase = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;

  const result = await createReport(supabase, {
    ...BASE_REPORT_INPUT,
    target_type: 'listing',
    target_id: 'listing-1',
  });

  expect(result.error).toBeUndefined();
  expect(query.insert).toHaveBeenCalledWith(
    expect.objectContaining({ target_type: 'listing', target_id: 'listing-1' })
  );
});
```

In `ReportCard.test.tsx`:

```tsx
it('links a listing report to the listing and offers only Dismiss', () => {
  renderCard({
    report: {
      ...POST_REPORT,
      target_type: 'listing',
      target_id: 'listing-7',
    } as unknown as ReportWithUsers,
    post: undefined,
  });

  expect(screen.getByRole('link', { name: 'View listing' }).getAttribute('href')).toBe(
    '/marketplace/listing/listing-7'
  );
  expect(screen.queryByText(/Chat message report/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Dismiss' })).toBeDefined();
  expect(screen.queryByRole('button', { name: 'Remove post' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Ban/ })).toBeNull();
});
```

- [x] **Step 2: Watch them fail.**
  - Run `npm run type-check --workspace=packages/shared`. Expected: an error that `'listing'` is not assignable to `ReportTargetType`.
  - From `C:\Users\shash\Documents\personal-github-repos\nepally`, run `npm run test --workspace=apps/web -- src/components/moderation/ReportCard.test.tsx`. Expected: FAIL, because there is no "View listing" link.

- [x] **Step 3: Implement.** In `report.ts`:

```ts
/** `listing` joined the DB enum in migration 014. */
export type ReportTargetType = 'post' | 'user' | 'message' | 'listing';
```

In `ReportCard.tsx`'s `ReportTarget`, after the `user` branch:

```tsx
if (report.target_type === 'listing') {
  return (
    <Anchor
      component={Link}
      href={`/marketplace/listing/${report.target_id}`}
      className={styles.targetLink}
    >
      View listing
    </Anchor>
  );
}
```

- [x] **Step 4: Run both again.**
  - `npm run test --workspace=packages/shared -- src/api/reports.test.ts`
  - `npm run type-check --workspace=packages/shared`
  - the web command from Step 2

  Expected: PASS.

- [x] **Step 5: Update `docs/product/features/moderation.md`.** Under "Open reports", add: "**A listing:** a View listing link, and Dismiss only. Removing a listing from the queue is not built yet."

- [x] **Step 6: Commit.**

```bash
git add packages/shared/src/types/report.ts packages/shared/src/api/reports.test.ts apps/web/src/components/moderation/ReportCard.tsx apps/web/src/components/moderation/ReportCard.test.tsx docs/product/features/moderation.md
git commit -m "feat: accept listing reports and show them in the moderation queue"
```

### Task 1.3: Reporting a listing on mobile files a real report

**Bug.** `ListingDetailScreen.handleReport` shows "Thank you for reporting" and never calls `createReport`. Apple guideline 1.2 and Google Play's UGC policy require a working report mechanism.

**Behaviour after the fix:**

- The flag button has the label "Report listing". It is hidden from the listing's owner.
- Signed out: an alert says "Please sign in to report listings."
- Below Trust Level 1: an alert says "Please verify your account to report listings." The reports INSERT policy requires Level 1, so this avoids a raw RLS failure. Level 0 members can't report, by the user's decision (2026-09-27).
- Otherwise the shared report sheet opens with the title "Report Listing". Submitting calls `createReport` with `target_type: 'listing'`.
- On success, the sheet closes and an alert says "Thank you. Our moderation team will review this listing."
- On failure, the sheet stays open and an alert shows the error, such as the duplicate-report message.

**Files:**

- Modify: `apps/mobile/src/components/sheets/ReportPostSheet.tsx`
- Test: `apps/mobile/src/components/sheets/ReportPostSheet.test.tsx`
- Modify: `apps/mobile/src/screens/marketplace/ListingDetailScreen.tsx:104-202`
- Test: `apps/mobile/src/screens/marketplace/ListingDetailScreen.test.tsx`

- [x] **Step 1: Write the failing sheet test.**

```tsx
it('shows a custom title', () => {
  const screen = render(
    <ReportPostSheet
      visible
      title="Report Listing"
      onClose={jest.fn()}
      onSubmit={jest.fn().mockResolvedValue(undefined)}
    />
  );
  expect(screen.getByText('Report Listing')).toBeTruthy();
});
```

- [x] **Step 2: Write the failing detail tests.** In the `@nepally/shared` mock, add `createReport: jest.fn(async () => ({ data: { id: 'report-1' } }))` and `TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 }`. Import `fireEvent` and `createReport`. Replace the `// -- Report` block with:

```tsx
// -- Report ----------------------------------------------------------------

it('does not fire report alert on initial render', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert');
  const screen = render(<ListingDetailScreen />);
  await waitFor(() => {
    expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
  });
  expect(alertSpy).not.toHaveBeenCalled();
  alertSpy.mockRestore();
});

it('files a listing report through createReport', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert');
  const screen = render(<ListingDetailScreen />);
  await waitFor(() => {
    expect(screen.getByLabelText('Report listing')).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText('Report listing'));
  expect(screen.getByText('Report Listing')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Reason Scam'));
  fireEvent.press(screen.getByText('Submit Report'));

  await waitFor(() => {
    expect(createReport).toHaveBeenCalledWith(expect.anything(), {
      reported_by: 'user-1',
      target_type: 'listing',
      target_id: 'listing-1',
      reason: 'Scam',
      description: undefined,
    });
  });
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith(
      'Listing Reported',
      'Thank you. Our moderation team will review this listing.'
    );
  });
  alertSpy.mockRestore();
});

it('keeps the sheet open and shows the error when the report fails', async () => {
  (createReport as jest.Mock).mockResolvedValueOnce({
    error: new Error('You already reported this.'),
  });
  const alertSpy = jest.spyOn(Alert, 'alert');
  const screen = render(<ListingDetailScreen />);
  await waitFor(() => {
    expect(screen.getByLabelText('Report listing')).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText('Report listing'));
  fireEvent.press(screen.getByLabelText('Reason Spam'));
  fireEvent.press(screen.getByText('Submit Report'));

  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('Error', 'You already reported this.');
  });
  expect(screen.getByText('Report Listing')).toBeTruthy();
  alertSpy.mockRestore();
});

it('asks an unverified member to verify instead of opening the sheet', async () => {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', full_name: 'New User', trust_level: 0, metro_area_id: 'metro-1' },
  });
  const alertSpy = jest.spyOn(Alert, 'alert');
  const screen = render(<ListingDetailScreen />);
  await waitFor(() => {
    expect(screen.getByLabelText('Report listing')).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText('Report listing'));

  expect(alertSpy).toHaveBeenCalledWith(
    'Verify to Report',
    'Please verify your account to report listings.'
  );
  expect(screen.queryByText('Report Listing')).toBeNull();
  alertSpy.mockRestore();
});

it('does not offer the report button to the owner', async () => {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, metro_area_id: 'metro-1' },
  });
  const screen = render(<ListingDetailScreen />);
  await waitFor(() => {
    expect(screen.getByText('Edit Listing')).toBeTruthy();
  });
  expect(screen.queryByLabelText('Report listing')).toBeNull();
});
```

- [x] **Step 3: Watch them fail.** Run `npm run test --workspace=apps/mobile -- ReportPostSheet ListingDetailScreen`. Expected: FAIL. There is no `title` prop and no "Report listing" label, and `createReport` is never called.

- [x] **Step 4: Implement the sheet `title`.** In `ReportPostSheet.tsx`:

```tsx
interface ReportPostSheetProps {
  visible: boolean;
  submitting?: boolean;
  /** Sheet heading. Defaults to "Report Post". */
  title?: string;
  onClose: () => void;
  onSubmit: (reason: ReportReason, description?: string) => Promise<void>;
}

export function ReportPostSheet({
  visible,
  submitting = false,
  title = 'Report Post',
  onClose,
  onSubmit,
}: ReportPostSheetProps) {
```

Also replace `<Text style={styles.title}>Report Post</Text>` with `<Text style={styles.title}>{title}</Text>`.

- [x] **Step 5: Implement the detail screen.**
  - Add `createReport` and `TrustLevel` to the `@nepally/shared` import.
  - Add `import { ReportPostSheet } from '../../components/sheets/ReportPostSheet';`.
  - Replace `handleReport` with:

```tsx
const [reportOpen, setReportOpen] = useState(false);
const [reportSubmitting, setReportSubmitting] = useState(false);

const handleReport = useCallback(() => {
  if (!user) {
    Alert.alert('Sign In Required', 'Please sign in to report listings.');
    return;
  }
  if ((user.trust_level ?? 0) < TrustLevel.VERIFIED) {
    Alert.alert('Verify to Report', 'Please verify your account to report listings.');
    return;
  }
  setReportOpen(true);
}, [user]);

const handleReportClose = useCallback(() => {
  if (!reportSubmitting) setReportOpen(false);
}, [reportSubmitting]);

const handleReportSubmit = useCallback(
  async (reason: string, description?: string) => {
    if (!user) return;
    setReportSubmitting(true);
    const result = await createReport(supabase, {
      reported_by: user.id,
      target_type: 'listing',
      target_id: listingId,
      reason,
      description,
    });
    setReportSubmitting(false);
    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to report listing. Please try again.');
      return;
    }
    setReportOpen(false);
    Alert.alert('Listing Reported', 'Thank you. Our moderation team will review this listing.');
  },
  [listingId, user]
);
```

Put both `useState` calls with the other state at the top of the component; hooks must run before the early returns. In the loaded header, replace the flag button:

```tsx
<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back">
  <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
</TouchableOpacity>
<View style={styles.headerActions}>
  {!isOwner && (
    <TouchableOpacity onPress={handleReport} style={styles.headerButton} accessibilityLabel="Report listing">
      <Ionicons name="flag-outline" size={22} color={colors.text.secondary} />
    </TouchableOpacity>
  )}
</View>
```

Just before the closing `</SafeAreaView>` of the loaded view, render:

```tsx
<ReportPostSheet
  visible={reportOpen}
  submitting={reportSubmitting}
  title="Report Listing"
  onClose={handleReportClose}
  onSubmit={handleReportSubmit}
/>
```

- [x] **Step 6: Run the two files again.** Same command as Step 3. Expected: PASS.

- [x] **Step 7: Commit.**

```bash
git add apps/mobile/src/components/sheets/ReportPostSheet.tsx apps/mobile/src/components/sheets/ReportPostSheet.test.tsx apps/mobile/src/screens/marketplace/ListingDetailScreen.tsx apps/mobile/src/screens/marketplace/ListingDetailScreen.test.tsx
git commit -m "fix(mobile): report a listing through the real report system"
```

### Task 1.4: No mobile screen leads into the Promote purchase flow

**Bug.** `PromoteListingScreen` creates a Stripe PaymentIntent but never shows a payment sheet. `@stripe/stripe-react-native` isn't installed. The screen then polls for 30 seconds and stops on "Processing Payment…" with its back and close buttons hidden. Each attempt leaves a `pending` promotion. The launch plan already decided that v1.0 sells promotions on web only (Apple 3.1.1). This task removes every entry point and the route, as `2026-09-18-production-launch.md` lists. Promoted and sponsored items keep displaying. The screen file is deleted, not kept as dead code; git history holds it if the flow is rebuilt with IAP or a link-out.

**Files:**

- Modify: `apps/mobile/src/components/marketplace/MarketplaceMenuSheet.tsx:9-36`, test `:19-28`
- Modify: `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.tsx:247-249`; test mock rows `:88-95`
- Modify: `apps/mobile/src/screens/marketplace/ListingDetailScreen.tsx`: owner bar, promotion check
- Modify: `apps/mobile/src/screens/marketplace/MyListingsScreen.tsx:196-204`
- Modify: `apps/mobile/src/navigation/MarketplaceNavigator.tsx:10,54-61`, `apps/mobile/src/types/navigation.ts:96`
- Delete: `apps/mobile/src/screens/marketplace/PromoteListingScreen.tsx`, `PromoteListingScreen.test.tsx`

- [x] **Step 1: Write the failing tests.**

In `MarketplaceMenuSheet.test.tsx`, rename `'renders all six rows when visible'` to `'renders the five rows when visible, with no Promote entry'`. Replace `expect(screen.getByText('Promote a Listing')).toBeTruthy();` with `expect(screen.queryByText('Promote a Listing')).toBeNull();`.

In `ListingDetailScreen.test.tsx`:

```tsx
it('does not offer Promote to the owner', async () => {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, metro_area_id: 'metro-1' },
  });
  const screen = render(<ListingDetailScreen />);
  await waitFor(() => {
    expect(screen.getByText('Edit Listing')).toBeTruthy();
  });
  expect(screen.queryByText('Promote')).toBeNull();
  expect(screen.queryByText('Promoted')).toBeNull();
});
```

In `MyListingsScreen.test.tsx`, add to `'renders action buttons for active listings'`: `expect(screen.queryByText('Promote')).toBeNull();`.

In `MarketplaceHomeScreen.test.tsx`, delete the `{ key: 'promote', label: 'Promote a Listing' }` row from the menu mock.

- [x] **Step 2: Watch them fail.** Run `npm run test --workspace=apps/mobile -- MarketplaceMenuSheet ListingDetailScreen MyListingsScreen`. Expected: FAIL. Promote is still offered.

- [x] **Step 3: Implement.**
  - `MarketplaceMenuSheet.tsx`: remove `| 'promote'` from `MarketplaceMenuKey` and the `{ key: 'promote', … }` row.
  - `MarketplaceHomeScreen.tsx`: remove the `case 'promote':` branch from `handleMenuSelect`.
  - `ListingDetailScreen.tsx`:
    - Remove `getActivePromotionForListing` from the import, along with the `hasActivePromotion` state.
    - Remove the `if (listingResult.data.owner_id === userId) { … }` block.
    - Remove the second (Promote) `TouchableOpacity` in the owner bar, so the bar holds only Edit Listing.
    - Remove the now-unused `disabledButton` and `disabledButtonText` styles.
  - `MyListingsScreen.tsx`: remove the `{item.status === 'active' && ( … Promote … )}` block.
  - `MarketplaceNavigator.tsx`: remove the `PromoteListingScreen` import and its `<Stack.Screen name="PromoteListing" … />`.
  - `types/navigation.ts`: remove `PromoteListing: { listingId: string };`.
  - Delete the files with `git rm apps/mobile/src/screens/marketplace/PromoteListingScreen.tsx apps/mobile/src/screens/marketplace/PromoteListingScreen.test.tsx`.

- [x] **Step 4: Run the tests and type-check.**
  - The command from Step 2, plus `MarketplaceHomeScreen`.
  - `npm run type-check --workspace=apps/mobile`

  Expected: PASS, and no reference to `PromoteListing` is left. Confirm with `git grep -n "PromoteListing" apps/mobile`, which should print nothing.

- [x] **Step 5: Docs.**
  - In `docs/plans/active/2026-09-18-production-launch.md`, tick "Remove every mobile Promote entry point and unregister the `PromoteListing` route".
  - In `docs/product/features/marketplace.md`, after "Promoting a listing (web)", add: "**Promoting a listing (mobile).** Not offered in the app for v1.0. Promotions are bought on the web (Apple 3.1.1), and promoted and sponsored listings still show in the app."

- [x] **Step 6: Commit.**

```bash
git add -A apps/mobile/src docs/plans/active/2026-09-18-production-launch.md docs/product/features/marketplace.md
git commit -m "fix(mobile): remove the Promote purchase flow from the app"
```

### Task 1.5: The search box keeps focus while the member types

**Bug.** `ListHeaderComponent={renderHeader}` receives a function whose `useCallback` depends on `searchInput`. FlatList renders a function as `<ListHeaderComponent />`, so each keystroke produces a new component type. React unmounts and remounts the header, the `TextInput` loses focus, and the keyboard closes after every character. The category row also scrolls back to the start. Separately, the list has no `keyboardShouldPersistTaps`, so tapping a category tile while the keyboard is open takes two taps.

**Files:**

- Modify: `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.tsx:283-296,363-377`
- Test: `apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.test.tsx`

- [x] **Step 1: Write the failing tests.** Replace the `MarketplaceSearchBar` mock with one that counts mounts:

```tsx
let mockSearchBarMounts = 0;
jest.mock('../../components/marketplace/MarketplaceSearchBar', () => {
  const ReactLocal = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');
  return {
    MarketplaceSearchBar: ({
      value,
      onChangeText,
    }: {
      value: string;
      onChangeText: (text: string) => void;
    }) => {
      ReactLocal.useEffect(() => {
        mockSearchBarMounts += 1;
      }, []);
      return ReactLocal.createElement(TextInput, {
        accessibilityLabel: 'Search marketplace',
        value,
        onChangeText,
      });
    },
  };
});
```

Add the tests. Import `FlatList` from `react-native`.

```tsx
it('keeps the same search input mounted while the member types', async () => {
  const screen = render(<MarketplaceHomeScreen />);
  await waitFor(() => {
    expect(screen.getByText('Warm winter jacket')).toBeTruthy();
  });
  const mountsBefore = mockSearchBarMounts;

  fireEvent.changeText(screen.getByLabelText('Search marketplace'), 'j');
  fireEvent.changeText(screen.getByLabelText('Search marketplace'), 'ja');

  expect(mockSearchBarMounts).toBe(mountsBefore);
});

it('lets a tap land on the list while the keyboard is open', () => {
  const screen = render(<MarketplaceHomeScreen />);
  expect(screen.UNSAFE_getByType(FlatList).props.keyboardShouldPersistTaps).toBe('handled');
});
```

- [x] **Step 2: Watch them fail.** Run `npm run test --workspace=apps/mobile -- MarketplaceHomeScreen`. Expected: FAIL. The mount count rises by 2, and `keyboardShouldPersistTaps` is `undefined`.

- [x] **Step 3: Implement.** Add `useMemo` to the React import. Replace `renderHeader` with an element:

```tsx
// An element, not a component function: FlatList renders a function as
// <ListHeaderComponent />, so a new function per keystroke would remount the
// header and drop the search input's focus.
const listHeader = useMemo(
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
```

On the `FlatList`, set `ListHeaderComponent={listHeader}` and add `keyboardShouldPersistTaps="handled"`.

- [x] **Step 4: Run the file again.** Same command. Expected: PASS.

- [x] **Step 5: Commit.**

```bash
git add apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.tsx apps/mobile/src/screens/marketplace/MarketplaceHomeScreen.test.tsx
git commit -m "fix(mobile): keep marketplace search focused while typing"
```

### PR 1 gate

- [x] `npm run type-check`, `npm run lint`, `npm run lint:guards`
- [x] `npm run test --workspace=packages/shared`, `npm run test --workspace=apps/mobile`, and `npm run test --workspace=apps/web` from `C:\…`
- [x] `npm run docs:check`, `npm run lint:md`
- [x] One code-review agent over `git diff master...HEAD`. Fix CRITICAL and HIGH in one commit; route the rest to [Follow-ups](#follow-ups-not-scheduled).
- [x] Push, open the draft PR, and request Copilot's review: [#102](https://github.com/shashesh/nepally/pull/102).

---

## PR 1b — Report thresholds (migration 047)

**Decided 2026-09-27:** neither posts nor listings hide at 3 reports; both need at least 100. A listing that reaches 100 becomes `removed`. The branch is off `master` and doesn't depend on PR 1's code. Merged: [#103](https://github.com/shashesh/nepally/pull/103).

**Migration `supabase/migrations/047_report_auto_hide_threshold.sql`:**

- **Counter:** add `marketplace_listings.reports_count integer NOT NULL DEFAULT 0`.
- **`on_report_created()`**, replaced:
  - A post moves `active → pending` at 100 reports, not 3.
  - A listing report bumps `marketplace_listings.reports_count` and the owner's `users.reports_received`.
  - At 100 reports, an `active` or `inactive` listing becomes `removed`.
- **`guard_listing_status_transition()`**, a `BEFORE UPDATE OF status` trigger:
  - Nobody but a moderator or a privileged context can move a listing out of `removed`.
  - Today the owner UPDATE policy allows every column, so a moderator-removed listing can be set back to `active` over REST.
  - Owner delete already sets `removed`, and the app calls it permanent, so owners lose nothing in the app.
- **`guard_report_counts()`**, a `BEFORE UPDATE OF reports_count` trigger on `posts` and `marketplace_listings`: only privileged contexts and moderators may change the counter, so an author can't reset it to stay under 100.
- **Grants:** trigger functions get no EXECUTE grant ([ADR](../../decisions/2026-09-25-function-execute-grants.md)).

**Tasks:**

- [ ] **1b.1 Migration 047.** Before writing it, run read-only checks on staging: the trigger and function names, and the current maximum of `posts.reports_count`.
- [ ] **1b.2 Post smoke test.** `scripts/security/emergency-post-smoke.ts` step 5 asserts auto-hide at 3. It becomes:
  - one report: count 1, still active
  - the service role seeds the count to 98
  - the second report: 99, still active
  - the third report: 100, `pending`
  - the author can't reset `reports_count`
- [ ] **1b.3 Listing smoke test.** New `scripts/security/listing-reports-smoke.ts` as `npm run test:security:listing-reports`:
  - A Level 0 member can't report.
  - A report bumps the listing's and the owner's counters.
  - The owner can't reset `reports_count`.
  - A seeded 99 plus one report removes the listing.
  - The owner can't reactivate it; the service role (the dashboard) can.
- [ ] **1b.4 Docs.**
  - `moderation.md`: posts hide at 100; listings are removed at 100.
  - `marketplace.md`
  - `database-schema.md`: the column and the triggers
  - the `roadmap.md` status line
  - the smoke table in `setup-and-testing.md`
- [x] **1b.5 Apply.** Applied to staging on 2026-09-28 on the user's request. The three smoke tests pass, plus `listing-counters` and `users-privilege`. The advisors show no new findings. The tracker row (`20260928120850`) still needs realigning to `047`.

---

## PR 2 — Browsing: Home, Category, Saved

**How PR 2 runs.** The branch `fix/mobile-marketplace-browse` is stacked on PR 1, because both change `MarketplaceHomeScreen`. The PR runs as two chunks, each with its own gate and review.

**Chunk A: the feed (2.1–2.4)**

- [x] **A1. `apps/mobile/src/hooks/useMarketplaceFeed.ts`**, modelled on `useMetroEventPages` and web's `useMarketplaceFeed`.
  - Input: `(metroId, { categorySlug, searchQuery })`. Output: `sponsored`, `featured`, `recent`, `trending`, `grid`, `loading`, `refreshing`, `error`, `loadingMore`, `loadMoreError`, `hasMore`, `reload`, `refresh`, `loadMore`, `retryLoadMore`.
  - Unfiltered loads fetch the All Listings grid (`getListingsByMetro`, newest, 20) plus four strips: sticky business (5), featured (10), newest (10) and trending (10).
  - A category or search loads the grid only, plus the category's featured strip (none for search).
  - A new metro or filter resets to loading. `refresh` keeps the rows on screen.
  - A generation ref drops stale responses. A grid failure is the page's error and clears the strips; a failed strip just stays empty.
  - Paging offsets count rows consumed and skip ids already shown. A failed page stops paging until retried.
  - Tests (`useMarketplaceFeed.test.ts`, with `renderHook`, as in `useMetroEventPages.test.ts`) cover:
    - which calls each mode makes
    - a stale response is dropped
    - a grid error clears the strips
    - `refresh` keeps rows
    - `loadMore` offsets and de-dupes
    - a failed page stops paging until `retryLoadMore`
- [x] **A2. Home uses the feed.**
  - Header element: search, category tiles, then (unfiltered) the Sponsored, Featured, Recently Added and Trending strips, each hidden when empty, then an "All listings" title.
  - Body: the two-column grid.
  - Loading shows the skeleton; errors show `MarketplaceErrorState` with Try again. "Nothing in your metro yet" appears only when unfiltered and every source is empty.
  - Refocus calls `refresh`, so there's no skeleton and the scroll position stays. Saved ids refetch on focus.
  - `MarketplaceTabs` and its test are deleted.
  - Sponsored cards carry the Sponsored badge; `ListingStrip` gains a `sponsored` prop.
- [x] **A3. Category screen.** Load-more uses a ref guard, pages are de-duplicated, and a failed first load shows `MarketplaceErrorState` instead of "No listings in this category yet".
- [x] **A4. Errors elsewhere.**
  - My Listings and Saved show `MarketplaceErrorState` when their load fails.
  - Detail uses `ListingResult.notFound`: "Listing not found" only when it's really gone, otherwise "Couldn't load this listing." with Try again.
- [x] **Chunk A gate and review.**

**Chunk B: state, location, price, polish (2.5–2.8)**

- [x] **B1. `apps/mobile/src/hooks/useSavedListingIds.ts`.** Load on focus; `toggle` updates at once, rolls back and alerts on failure. Used by Home, Saved and Detail.
- [x] **B2. Saved screen.** Pull-to-refresh, refetch on focus, and its own empty copy.
- [x] **B3. Location.**
  - Marketplace screens and create use `useLocation().activeLocation?.metro_area_id ?? user.metro_area_id`.
  - The header shows the metro name.
  - "Change Location" and "Browse nearby metros" open `LocationSwitcherSheet` in place.
- [x] **B4. Prices.** `formatListingPrice` everywhere. `ListingCard` drops "Starting at" and the fake Contact Seller button.
- [x] **B5. Polish.**
  - `useWindowDimensions` for card widths.
  - Category tiles grow with Dynamic Type.
  - The menu sheet plays its close animation, keeps the backdrop still, and uses safe-area bottom padding.
  - Sort labels read "Price: low to high" and "Price: high to low".
- [x] **Chunk B gate and review**, then push, open the draft PR, and request Copilot's review.

| #   | Task                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Main files                                                                                                                 | Done when                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 2.1 | **Web-style rows replace the tabs** (decided 2026-09-27). Today the default "Sponsored" tab shows only $4.99/day promotions, and otherwise says "Nothing in your metro yet". Home becomes one scroll: Sponsored, Featured, Recent and Trending strips, each hidden when empty, then the All Listings grid with infinite scroll. A search or category filter swaps the rows for the filtered grid, as web's `MarketplaceBrowse` does. "Nothing in your metro yet" appears only when the metro has no listings at all. | `MarketplaceHomeScreen.tsx`, `MarketplaceTabs.tsx`, `MarketplaceEmptyState.tsx`                                            | A metro with listings but no promotions opens on a full grid                                               |
| 2.2 | **Returning from a listing keeps the grid.** Focus currently sets `loading`, which empties `data` and shows the skeleton. Show the skeleton only on first load and when a filter changes; on focus, refetch in the background and keep the scroll position. Refresh saved ids on focus too.                                                                                                                                                                                                                          | `MarketplaceHomeScreen.tsx`                                                                                                | Back from detail: same items, same scroll offset, no skeleton; a heart toggled on detail shows on the grid |
| 2.3 | **Stale responses are ignored.** Home drops any response that isn't from the latest request. Category guards load-more with a ref instead of state and de-duplicates by id, as Home does.                                                                                                                                                                                                                                                                                                                            | `MarketplaceHomeScreen.tsx`, `MarketplaceCategoryScreen.tsx`                                                               | Fast tab switching never shows another tab's items; no duplicate-key warnings on the category list         |
| 2.4 | **Errors are not empty states.** A failed load shows "Couldn't load listings." with Try again (the redesign spec's banner) on Home, Category, My Listings and Saved. Detail uses the shared `ListingResult.notFound` to tell "not found" from "couldn't load".                                                                                                                                                                                                                                                       | new `components/marketplace/MarketplaceErrorState.tsx`, the four screens, `ListingDetailScreen.tsx`                        | Offline shows the error with retry, not "Nothing in your metro yet"                                        |
| 2.5 | **Saved listings stay current.** Refetch on focus and add pull-to-refresh. Use its own empty copy ("No saved listings yet. Tap the heart on a listing to keep it here."). Roll back an optimistic toggle when the call fails, using one `useSavedListingIds` hook shared by Home, Saved and Detail.                                                                                                                                                                                                                  | new `hooks/useSavedListingIds.ts`, `SavedListingsScreen.tsx`, `MarketplaceHomeScreen.tsx`, `MarketplaceEmptyState.tsx`     | Saving on any screen is reflected on the others after navigation; a failed save flips back                 |
| 2.6 | **The marketplace follows the active location.** Use `useLocation().activeLocation?.metro_area_id ?? user.metro_area_id`, as Home does, and show the metro name in the header. "Change Location" and the empty state's "Browse nearby metros" open `LocationSwitcherSheet` in place instead of jumping to the Home tab.                                                                                                                                                                                              | `MarketplaceHomeScreen.tsx`, `MarketplaceCategoryScreen.tsx`, `CreateListingScreen.tsx` (metro on create)                  | Switching to a visiting metro changes the marketplace grid                                                 |
| 2.7 | **Prices read as prices.** Every mobile price goes through the shared `formatListingPrice` ("80" → "$80"). `ListingCard` drops the hard-coded "Starting at".                                                                                                                                                                                                                                                                                                                                                         | `ListingGridCard.tsx`, `ListingCard.tsx`, `ListingDetailScreen.tsx`, `MyListingsScreen.tsx`                                | The same listing shows the same price string on web and mobile                                             |
| 2.8 | **Layout and sheet polish.** Use `useWindowDimensions` for grid card widths, since `supportsTablet` is on. Category tiles grow with Dynamic Type. Tabs don't wrap. The menu sheet plays its close animation, keeps the backdrop still, and pads the bottom with safe-area insets. Sort labels become "Price: low to high" and "Price: high to low".                                                                                                                                                                  | `MarketplaceHomeScreen.tsx`, `SavedListingsScreen.tsx`, `CategoryTileRow.tsx`, `MarketplaceMenuSheet.tsx`, `FilterBar.tsx` | Rotating an iPad or using Split View re-flows the grid; the menu sheet animates out                        |

## PR 3 — Create and edit

Step breakdown to be written at the start of the PR.

| #   | Task                                                                                                                                                                                                                                                                                                                                                                                      | Main files                                                                                                                                   | Done when                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 3.1 | **No silent validation failures.** Show every schema error: email, website, phone, price, address and the business-name length. Give inputs `maxLength` values that match the schema. Add `https://` to a website typed without a scheme before validating. Scroll to the first invalid field.                                                                                            | `CreateListingScreen.tsx`                                                                                                                    | `www.mybiz.com` saves as `https://www.mybiz.com`; a bad email shows its message and scrolls to it    |
| 3.2 | **Keyboard.** Use `KeyboardAvoidingView` as `CreatePostScreen` does, plus `keyboardShouldPersistTaps="handled"`. Chain fields with "next". Add `autoComplete`/`textContentType` for phone, email and URL.                                                                                                                                                                                 | `CreateListingScreen.tsx`                                                                                                                    | Phone, email and description stay visible above the keyboard on iOS and Android                      |
| 3.3 | **No accidental data loss.** `usePreventRemove` while the form is dirty and not submitting shows "Discard this listing?" before swipe-down, ✕ or Android back.                                                                                                                                                                                                                            | `CreateListingScreen.tsx`                                                                                                                    | Swiping down a half-filled form asks first                                                           |
| 3.4 | **After saving, show the result.** Create replaces the modal with the new listing's detail. Edit returns to a detail screen that refetches on focus, so it shows the new title and photos.                                                                                                                                                                                                | `CreateListingScreen.tsx`, `ListingDetailScreen.tsx`                                                                                         | Created listing opens straight away; edited fields show on return                                    |
| 3.5 | **Photos.** Drop the unnecessary photo-library permission request; the system picker needs none, and today a member who once denied it can never add photos. Add "Take photo" (`launchCameraAsync`; check `NSCameraUsageDescription`). Say which photos failed to process. Give the remove ✕ a 44pt target and a label. First photo is the cover, with move-left and move-right controls. | `CreateListingScreen.tsx`, `apps/mobile/app.json`                                                                                            | A member who denied library access can still pick photos; the camera works; the cover can be changed |
| 3.6 | **Type defaults and hidden fields.** Default to Individual, since most community sellers aren't businesses. On submit, send `null` for fields of the type not selected (business fields for Individual, condition for Business).                                                                                                                                                          | `CreateListingScreen.tsx`                                                                                                                    | Switching Business → Individual doesn't save the business name                                       |
| 3.7 | **Form accessibility.** Every `TextInput` gets an `accessibilityLabel`. Type and condition toggles are radios with a selected state, and category chips have a selected state. The close button gets a label.                                                                                                                                                                             | `CreateListingScreen.tsx`                                                                                                                    | VoiceOver reads each field's label and selection                                                     |
| 3.8 | **No orphaned photos.** Delete just-uploaded files when create or update fails. On edit, delete the files for removed photo URLs. On delete, remove all of the listing's files. This puts `deleteListingPhotos` (`packages/shared/src/api/storage.ts:389`) behind a shared helper that web calls too.                                                                                     | `packages/shared/src/api/marketplace.ts` or `storage.ts`, `CreateListingScreen.tsx`, `MyListingsScreen.tsx`, web create/edit and My Listings | Removed photos are gone from the bucket                                                              |

## PR 4 — Listing detail and My Listings

Step breakdown to be written at the start of the PR.

| #   | Task                                                                                                                                                                                                                                                                                                  | Main files                                                                                        | Done when                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 4.1 | **Contact details do something.** Phone opens `tel:`, email opens `mailto:`, website opens the browser. Address opens Maps (`maps:` on iOS, `geo:` on Android, a Google Maps URL as fallback). Values are selectable and not cut to 2 lines.                                                          | `ListingDetailScreen.tsx`                                                                         | Tapping the phone number starts a call                       |
| 4.2 | **Contact Seller carries context** (prefilled draft decided 2026-09-27). The button is busy while the conversation is created, so a double tap can't start it twice. The contact counter increments only on success. `MessageThread` opens with a draft: "Hi, is “{title}” still available?"          | `ListingDetailScreen.tsx`, chat `MessageThread` screen, `ChatStackParamList`                      | The seller can see which listing the buyer means             |
| 4.3 | **Screen-reader reachable.** The heart on grid cards and the My Listings actions are reachable in VoiceOver, via custom accessibility actions on the card or by making the card's parts separate elements. Card labels include price. Every icon-only button gets a label.                            | `ListingGridCard.tsx`, `ListingCard.tsx`, `MyListingsScreen.tsx`, `MarketplaceCategoryScreen.tsx` | VoiceOver can save a listing from the grid                   |
| 4.4 | **My Listings actions fit.** Today five actions need about 440pt where about 280pt fits. Keep Edit and Refresh visible and move the rest into a "More" menu, with 44pt targets. Mutation errors show an alert, Refresh confirms it worked, and the empty-state "Create" follows the Trust Level rule. | `MyListingsScreen.tsx`                                                                            | No action is clipped at 320pt width; a failed delete says so |
| 4.5 | **Detail stays fresh.** Refetch on focus, and reset per-listing state when `listingId` changes (web follow-up #18 had the same bug).                                                                                                                                                                  | `ListingDetailScreen.tsx`                                                                         | Edits show on return                                         |
| 4.6 | **Seller card builds trust.** Show the profile photo (existing `Avatar`) and a trust badge. Tapping it opens the seller's public profile; add `PublicProfileView` to the marketplace stack.                                                                                                           | `ListingDetailScreen.tsx`, `MarketplaceNavigator.tsx`, `types/navigation.ts`                      | Tapping the seller opens their profile                       |
| 4.7 | **Full-screen photos.** Tapping a photo opens a full-screen, swipeable, pinch-zoom viewer. Pick the library at PR start; Galeria is the RN skill's pick.                                                                                                                                              | `ListingDetailScreen.tsx`, new viewer component, `package.json`                                   | Pinch-zoom works on iOS and Android                          |
| 4.8 | **Consistency.** Save is a heart everywhere (detail uses a bookmark today). "1 views" and "Expires in 1 days" get proper plurals. Hours show in 12-hour format. Share uses `Share.share` with the web URL until deep links exist.                                                                     | `ListingDetailScreen.tsx`, `MyListingsScreen.tsx`                                                 | Same icon for save on every marketplace screen               |

---

## Follow-ups (not scheduled)

Not in PRs 1–4. Some affect both platforms or need a migration.

- **Price sorting is alphabetical.** `price` is free text, so `order('price')` sorts "$1,200" < "100" < "20" < "Negotiable" on both apps (`packages/shared/src/api/marketplace.ts:89-92`). Fixing it needs a numeric `price_cents` column (a new migration), a backfill from `formatListingPrice`'s parser, and the form to capture a number.
- **Moderators can't see, remove or restore a hidden reported listing** from the queue (Copilot on #102). Build the three as one moderator path:
  - **See.** The queue's View listing link opens `/marketplace/listing/<id>`, which reads through `getListingById`. That read skips `removed` rows, and the SELECT policy returns only active listings or the owner's own. A listing the owner deactivated or deleted after being reported, or one removed at 100 reports, therefore reads as "Listing not found" to a moderator. The fix needs a moderator branch in the SELECT policy (`(select public.is_moderator())`), a read that keeps `removed` rows for moderators, and a "hidden from members" banner on the detail page.
  - **Remove and restore.** The marketplace RLS has no moderator UPDATE policy, so today only the dashboard (service role) can. 047's guards already let a moderator through, so this needs a moderator policy or RPC plus queue buttons.
- **Owners don't see a listing that was removed.** `getListingsByOwner` excludes `removed`, so a listing removed after 100 reports disappears from My Listings with no explanation. Show it with a "Removed after reports" state, or notify the owner.
- **`reports_count` isn't in `marketplace_listings_view`**, since the view's `ml.*` was fixed when it was created. A listing moderation queue would need to recreate the view or read the base table.
- **Blocked sellers' listings still show** in marketplace feeds. The shared queries don't consult `blocked_users`.
- **No DB caps** on listing photos, title or description (`014_marketplace.sql:44-46`); they're zod-only.
- **Pending promotions are never cleaned up**; 046 expires `active` rows only. The mobile branch of `create-promotion-checkout` is now unused.
- **Web parity:** no report-listing UI, no saved-listings page, no marketplace rules page.
- **Both platforms:** no share or deep links (the mobile app has no linking config), no price or condition filters, no business-hours input, no "mark as sold" status.
- **Grid thumbnails load full 1200px photos**; use storage image transforms if the plan allows it.
- **Visual consistency:** Category, Detail, Create and My Listings still use the pre-redesign palette. The 2026-04-14 redesign deferred them.

## Decisions (2026-09-27)

1. **Level 0 members can't report**, for posts or listings; the reports INSERT policy stays at Level 1. App Review therefore needs a verified (Level 1) test account; this is noted in the launch plan's App Review task.
2. **Posts and listings hide at 100 reports, not 3.** A post goes to `pending`; a listing becomes `removed`, and only a moderator can restore it, from the dashboard for now (PR 1b, [#103](https://github.com/shashesh/nepally/pull/103)).
3. **Home uses web-style rows** (Sponsored, Featured, Recent, Trending) above the All Listings grid (PR 2.1).
4. **Contact Seller opens the chat with a prefilled draft** naming the listing (PR 4.2).
