# Public Profile View — Implementation Plan

**Plan Version:** v1
**Date:** 2026-03-04
**Owner:** Claude
**Status:** Completed
**Primary Spec/Wireframe:** `docs/features/phase1-feature-breakdown.md` (Feature 3.4)

---

## 0) Plan Tracking Protocol (Required)

### Step Status Legend
- `Not Started`
- `In Progress`
- `Completed`
- `Blocked`

### Live Step Tracker

| Step | Title | Owner | Status | Last Updated | Notes |
|------|-------|-------|--------|--------------|-------|
| 1 | Shared: `formatPublicName()` util | Claude | Completed | 2026-03-04 | |
| 2 | Mobile: Navigation route + screen registration | Claude | Completed | 2026-03-04 | |
| 3 | Mobile: `PublicProfileScreen.tsx` | Claude | Completed | 2026-03-04 | |
| 4 | Mobile: Wire navigation in HomeScreen + PostDetailScreen | Claude | Completed | 2026-03-04 | |
| 5 | Web: `/pages/users/[id].tsx` + CSS module | Claude | Completed | 2026-03-04 | |
| 6 | Web: Replace Coming Soon alerts | Claude | Completed | 2026-03-04 | |
| 7 | Tests & verification | Claude | Completed | 2026-03-04 | |

---

## 1) Objective

Allow users to tap any avatar (in the feed, post detail) and navigate to a public-facing profile showing the author's masked name, trust level, metro city, member-since year, and their public posts. A "Message" button opens a direct chat.

---

## 2) Scope and Non-Goals

### In Scope
- Shared `formatPublicName()` utility (e.g. "Shashank Kumar" → "Shashank K.")
- Mobile `PublicProfileScreen` accessible from HomeStack (feed + post detail)
- Mobile: own-post avatar tap navigates to own Profile tab instead
- Web `/users/[id]` dynamic page
- Web: replace `alert('User profiles coming soon')` in feed and post detail

### Out of Scope
- Editing another user's profile
- Reporting/blocking users (Phase 2)
- Business profiles (Phase 2)
- Premium post visibility filtering on public profile

---

## 3) Preconditions / Findings

1. `getUserById(supabase, userId)` in `packages/shared/src/api/users.ts` — public RLS allows read; no changes needed
2. `getPostsByAuthorId(supabase, userId, limit)` in `packages/shared/src/api/posts.ts` — already usable
3. Mobile PostCard avatar menu already has `onAvatarViewProfile` callback wired — `HomeScreen.handleAvatarViewProfile` just shows a "Coming Soon" alert
4. PostCard already guards `isOwnPost` — own-post avatars don't open the menu
5. Web feed and post detail have avatar dropdown "View Profile" buttons that call `alert('User profiles coming soon')`
6. No DB or schema changes needed; `metro_areas` table queryable via `supabase.from('metro_areas').select('name, state').eq('id', user.metro_area_id)`

### Pre-Implementation Freshness Gate

- [x] Feature spec reviewed: `docs/features/phase1-feature-breakdown.md` — Feature 3.4 confirmed
- [ ] User journey reviewed: none exists yet — proceeding based on spec
- [ ] Wireframe reviewed: none exists yet — proceeding based on spec
- [x] No conflicting requirements

---

## 4) Architecture Rules (Must Pass)

- Shared-first: `formatPublicName()` lives in `packages/shared/src/utils/`
- All API calls use existing shared functions via DI pattern
- No email/phone/ZIP shown on public profile
- Platform UI stays in respective app workspaces
- Tests added for all new shared logic

---

## 5) Implementation Plan

### Step 1 — Shared: `formatPublicName()` utility

**Goal**
- Add a privacy-safe name formatter to shared utils

**Deliverables**
- `formatPublicName(fullName: string): string` — returns "Firstname L." format
- Exported from `packages/shared/src/index.ts`

**File Changes**
- `packages/shared/src/utils/` — add to existing user utils file (or create `userUtils.ts`)
- `packages/shared/src/index.ts` — add export

**Tests / Validation**
- Unit tests covering: single name, two-part name, three-part name, empty string edge case
- `npm run test --workspace=packages/shared`

**Exit Criteria**
- `formatPublicName("Shashank Kumar")` returns `"Shashank K."`
- All unit tests pass

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after tests pass.

---

### Step 2 — Mobile: Navigation route + screen registration

**Goal**
- Make `PublicProfileView` a navigable route in the HomeStack

**Deliverables**
- `PublicProfileView: { userId: string }` added to `HomeStackParamList`
- Screen registered in `HomeNavigator`

**File Changes**
- `apps/mobile/src/types/navigation.ts`
- `apps/mobile/src/navigation/HomeNavigator.tsx`

**Tests / Validation**
- TypeScript compilation passes: `npm run type-check --workspace=apps/mobile`

**Exit Criteria**
- No TS errors; `navigation.navigate('PublicProfileView', { userId: '...' })` compiles

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after type-check passes.

---

### Step 3 — Mobile: `PublicProfileScreen.tsx`

**Goal**
- Create the public profile screen for other users

**Deliverables**
- `apps/mobile/src/screens/profile/PublicProfileScreen.tsx`
- Displays: `formatPublicName(user.full_name)`, trust badge, metro city + state, "Member since [year]", posts count
- Two tabs: "Posts" (their posts, tapping opens PostDetail) and "About" (public stats only — no email/phone/ZIP)
- "Message" button in header → `getOrCreateConversation` → navigate to `MessageThread`
- Loading and error states
- Mirrors structure/styling of existing `ProfileScreen.tsx`

**File Changes**
- `apps/mobile/src/screens/profile/PublicProfileScreen.tsx` — **CREATE**

**Tests / Validation**
- `npm run type-check --workspace=apps/mobile`
- Manual: screen renders with mock userId

**Exit Criteria**
- Screen renders profile data and posts without crashing
- No email/phone/ZIP visible

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after manual verification + type-check.

---

### Step 4 — Mobile: Wire navigation in HomeScreen + PostDetailScreen

**Goal**
- Replace all "Coming Soon" / stub handlers with real navigation to `PublicProfileView`

**Deliverables**
- `HomeScreen.handleAvatarViewProfile`: navigates to `PublicProfileView` with author's userId
- `PostDetailScreen`: "View Profile" navigates to `PublicProfileView`; if author is current user → switches to own Profile tab

**File Changes**
- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/src/screens/PostDetailScreen.tsx`

**Tests / Validation**
- `npm run type-check --workspace=apps/mobile`
- Manual: tap avatar in feed → public profile opens; tap own post avatar → own profile tab opens

**Exit Criteria**
- No more `Alert.alert('Coming Soon', ...)` for profile navigation
- Both feed and post detail navigate correctly

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after manual verification.

---

### Step 5 — Web: `/pages/users/[id].tsx` + CSS module

**Goal**
- Create the public profile page for web

**Deliverables**
- `apps/web/src/pages/users/[id].tsx` — dynamic Next.js page
- Fetches user + posts + metro area name
- Displays: `formatPublicName(user.full_name)`, trust badge, metro city, member since, posts count, their posts
- "Message" button → `router.push('/messages/' + id)`
- Two tabs: "Posts" and "About" (no email/phone/ZIP)
- `apps/web/src/styles/PublicProfile.module.css` — layout adapted from `Profile.module.css`

**File Changes**
- `apps/web/src/pages/users/[id].tsx` — **CREATE**
- `apps/web/src/styles/PublicProfile.module.css` — **CREATE**

**Tests / Validation**
- `npm run type-check --workspace=apps/web`
- Manual: navigate to `/users/[someId]` — profile renders

**Exit Criteria**
- Page renders public data; no email/phone/ZIP visible
- Unauthenticated users can view public profiles (no redirect to login)

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after manual verification + type-check.

---

### Step 6 — Web: Replace Coming Soon alerts

**Goal**
- Wire the existing "View Profile" buttons in feed and post detail to navigate to `/users/[id]`

**Deliverables**
- `feed.tsx` "View Profile" → `router.push('/users/' + authorId)`
- `posts/[id].tsx` "View Profile" → `router.push('/users/' + authorId)`

**File Changes**
- `apps/web/src/pages/feed.tsx` (line ~799)
- `apps/web/src/pages/posts/[id].tsx` (line ~822)

**Tests / Validation**
- Manual: click "View Profile" in feed/post detail → navigates to `/users/[id]`

**Exit Criteria**
- No `alert('User profiles coming soon')` calls remain

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after manual verification.

---

### Step 7 — Tests & Full Verification

**Goal**
- Ensure all tests pass across the monorepo

**Deliverables**
- All new shared util tests pass
- Mobile type-check clean
- Web type-check clean
- Full monorepo test suite passes

**Tests / Validation**
- `npm run test --workspace=packages/shared`
- `npm run test:coverage --workspace=packages/shared`
- `npm run test`

**Exit Criteria**
- All automated tests pass with no regressions

**Status Update Rule**
- Set to `In Progress` when running tests. Set to `Completed` when all pass.

---

## 6) Testing Strategy

### Change Classification
- `formatPublicName()` — New functionality → add unit tests
- `PublicProfileScreen` — New UI → manual verification + type-check
- `PublicProfilePage` (web) — New UI → manual verification + type-check
- Navigation wire-ups — Updated functionality → manual verification

### Test Plan Matrix

| Area | Change Type | Required Tests | File Targets |
|------|-------------|----------------|--------------|
| `formatPublicName` util | New | Unit tests | `packages/shared/src/utils/*.test.ts` |
| Web page `/users/[id]` | New | Manual + type-check | `apps/web/src/pages/users/[id].tsx` |
| Mobile PublicProfileScreen | New | Manual + type-check | `apps/mobile/src/screens/profile/PublicProfileScreen.tsx` |
| HomeScreen navigation | Updated | Manual | `apps/mobile/src/screens/HomeScreen.tsx` |

### Coverage and Quality Gates
- [x] New logic paths (`formatPublicName`) have unit tests
- [ ] No failing tests in touched workspaces

---

## 7) Data Contract Snapshot

No schema changes. Existing types used:
- `User` from `packages/shared/src/types/user.ts` — read-only; PII fields (email, phone, zip_code) present in type but not rendered
- `Post` from `packages/shared/src/types/post.ts` — standard post display

---

## 8) File Checklist

### New Files
- `apps/mobile/src/screens/profile/PublicProfileScreen.tsx`
- `apps/web/src/pages/users/[id].tsx`
- `apps/web/src/styles/PublicProfile.module.css`

### Modified Files
- `packages/shared/src/utils/` (add `formatPublicName`)
- `packages/shared/src/index.ts`
- `apps/mobile/src/types/navigation.ts`
- `apps/mobile/src/navigation/HomeNavigator.tsx`
- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/src/screens/PostDetailScreen.tsx`
- `apps/web/src/pages/feed.tsx`
- `apps/web/src/pages/posts/[id].tsx`

---

## 9) Verification Matrix (Definition of Done)

### Automated
- [ ] `npm run test --workspace=packages/shared`
- [ ] `npm run test:coverage --workspace=packages/shared`
- [ ] `npm run test`

### Manual
- [ ] Mobile: Tap avatar on a feed post card → avatar menu → "View Profile" → public profile opens with "Firstname L.", trust badge, metro city, posts
- [ ] Mobile: Tap avatar in post detail → same result
- [ ] Mobile: Tap own post's avatar → navigates to own Profile tab (not public profile)
- [ ] Mobile: "Message" button on public profile → opens chat thread
- [ ] Web: Click "View Profile" in feed → navigates to `/users/[id]`
- [ ] Web: Click "View Profile" in post detail → navigates to `/users/[id]`
- [ ] Web: Public profile page shows no email, phone, or ZIP

### Plan Hygiene
- [ ] Live step tracker statuses are fully up to date

---

## 10) Risks + Mitigations

- **Risk:** Metro area name fetch on every public profile load adds latency
  - **Mitigation:** Simple single-row query; acceptable for v1. Cache if needed later.
- **Risk:** `getUserById` returns full User object including email/phone — easy to accidentally render
  - **Mitigation:** Public profile components explicitly pick only public fields; no spread of entire user object to display

---

## 11) Operational Readiness

- [x] No DB changes — no rollback needed
- [x] No feature flag needed — replaces existing "coming soon" stubs
- [x] No PII risk — email/phone/ZIP intentionally excluded from UI rendering

---

## 12) Open Questions

- None — all requirements confirmed via spec and user Q&A.

---

## 13) Handoff Commands

```bash
npm run test --workspace=packages/shared
npm run test:coverage --workspace=packages/shared
npm run type-check --workspace=apps/mobile
npm run type-check --workspace=apps/web
npm run test
```
