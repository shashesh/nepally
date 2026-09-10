---
title: Events feature
status: implemented
created: 2026-03-10
---

# Events Feature — Implementation Plan

**Plan Version:** v1
**Date:** 2026-03-06
**Owner:** Claude
**Status:** Completed (2026-03-10)
**Primary Spec/Wireframe:** `docs/features/events.md`, `docs/wireframes/16-events-list/`, `docs/wireframes/16-create-event/`, `docs/wireframes/17-event-detail/`

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
| 1 | DB Migration — `006_events.sql` | Claude | Completed | 2026-03-10 | `events` + `event_rsvps` tables, RLS, triggers |
| 2 | Shared Types — `events.ts` | Claude | Completed | 2026-03-10 | |
| 3 | Shared Constants — `events.ts` | Claude | Completed | 2026-03-10 | Type labels, colors, icons |
| 4 | Shared Validation — `events.ts` + tests | Claude | Completed | 2026-03-10 | `createEventSchema`, `updateEventSchema` |
| 5 | Shared API — `events.ts` + `uploadEventPhoto` + tests | Claude | Completed | 2026-03-10 | 12 API functions |
| 6 | Mobile Navigation Types | Claude | Completed | 2026-03-10 | Expanded `EventsStackParamList` |
| 7 | Mobile Event Components | Claude | Completed | 2026-03-10 | `EventTypeBadge`, `EventCard`, `RsvpButton`, `AttendeeAvatarStack` |
| 8 | Mobile `EventsScreen` + test | Claude | Completed | 2026-03-10 | Replaces "Coming Soon" |
| 9 | Mobile `EventDetailScreen` + test | Claude | Completed | 2026-03-10 | |
| 10 | Mobile `CreateEventScreen` + test | Claude | Completed | 2026-03-10 | Create + edit mode |
| 11 | Rewrite `EventsNavigator` | Claude | Completed | 2026-03-10 | All 3 screens wired |
| 12 | Web Events Pages + tests | Claude | Completed | 2026-03-10 | index, [id], create |
| 13 | Web Event Components + CSS Modules | Claude | Completed | 2026-03-10 | |
| 14 | Full Test Run & Verification | Claude | Completed | 2026-03-10 | All workspace + monorepo tests pass |

---

## 1) Objective

Replace the "Coming Soon" Events tab placeholder (on both mobile and web) with a fully functional community events system: users can discover upcoming local events, RSVP with a single tap, and verified users can create and manage their own events.

---

## 2) Scope and Non-Goals

### In Scope
- DB schema: `events` + `event_rsvps` tables, indexes, RLS, RSVP count triggers
- Shared types, validation (Zod), API functions, constants — all in `packages/shared/`
- Mobile: `EventsScreen` (list + filter chips), `EventDetailScreen` (RSVP + attendees + organizer actions), `CreateEventScreen` (create + edit mode)
- Mobile: 4 shared event components — `EventTypeBadge`, `EventCard`, `RsvpButton`, `AttendeeAvatarStack`
- Web: `events/index.tsx` (list), `events/[id].tsx` (detail), `events/create.tsx` (form)
- Web: 4 shared event components with CSS Modules
- Optimistic RSVP UI on both platforms
- Organizer management: edit, cancel, delete event
- Event photo upload (reuses `uploadPostPhotos` pattern, new `event-photos/` bucket)
- Global toggle in create form (premium users only)
- Level 0 gating: view-only; cannot RSVP or create events

### Out of Scope (Deferred)
- E4.4: Events tab in profile (requires profile tab restructure — separate task)
- E5.2: RSVP'd/saved events list in profile (same reason)
- E6.1: Push notification reminders for events (requires full notifications DB layer first)
- E7.1: Premium multi-location switcher for events tab (separate premium UX task)
- Recurring events, calendar sync, event capacity/waitlist, co-organizers

---

## 3) Preconditions / Findings

1. **Migration slot:** `005_add_saved_posts.sql` is already taken — events migration must be `006_events.sql`.
2. **Photo upload infra exists:** `packages/shared/src/api/storage.ts` has `uploadPostPhotos` + `PostPhotoUploadInput`. Add `uploadEventPhoto()` following the same pattern, targeting `event-photos/` bucket.
3. **"Coming Soon" placeholder:** Mobile — inline component in `EventsNavigator.tsx` (no separate screen file). Web — `apps/web/src/pages/events.tsx` conflicts with the new `events/` directory; must be deleted before creating `events/index.tsx`.
4. **Navigation types:** `EventsStackParamList` currently has only `EventsList: undefined`. Must add `EventDetail: { eventId: string }` and `CreateEvent: { editEventId?: string } | undefined`.
5. **Reusable code:** `Avatar` component, `formatPublicName()`, design tokens (`colors`, `typography`, `spacing`), `PublicProfileView` nav route, `MessageThread` nav route, `useAuth()`, Supabase clients — all already exist and should be reused.
6. **No user journey doc:** No `docs/user-journeys/` file exists for events. Implementation proceeds from feature spec + wireframes (pre-implementation gate below is adjusted).

### Pre-Implementation Freshness Gate (Required)

- [x] Feature spec reviewed and date-checked: `docs/features/events.md` (2026-03-05)
- [ ] User journey reviewed: none exists — proceeding from spec + wireframes
- [x] Wireframes reviewed: `16-events-list.md`, `16-create-event.md`, `17-event-detail.md` (all 2026-03-05)
- [x] Feature breakdown reviewed: `docs/features/events-feature-breakdown.md` (2026-03-05)
- [x] No conflicting requirements across sources

---

## 4) Architecture Rules (Must Pass)

- Shared-first: all types, API, validation, constants go to `packages/shared/src/` — nothing duplicated in apps.
- Platform UI stays in `apps/mobile/` and `apps/web/` respectively.
- Mobile: `StyleSheet.create()` everywhere — no inline `style={{}}`.
- Web: CSS Modules only — no inline `style={{}}`.
- All shared API functions use dependency injection (`supabase: SupabaseClient` as first param).
- Shared types use `snake_case` matching Supabase column names.
- Import from `@nepally/shared` in both platforms — never redefine locally.
- Tests added for every new shared function and every new screen.

---

## 5) Implementation Plan

### Step 1 — DB Migration (`supabase/migrations/006_events.sql`)

**Goal**
- Create the `events` and `event_rsvps` tables with all required indexes, RLS policies, and triggers.

**Deliverables**
- `events` table: `id`, `title`, `description`, `event_type` (enum), `start_date`, `end_date` (nullable), `location_name`, `location_address` (nullable), `metro_area_id`, `is_global`, `organizer_id` (FK → users), `photo_url` (nullable), `rsvp_count`, `rsvp_visibility`, `status` (enum), `created_at`, `updated_at`
- `event_rsvps` table: `id`, `event_id` (FK), `user_id` (FK), `created_at` — unique constraint on `(event_id, user_id)`
- Enums: `event_type` (cultural, religious, social, career, other), `event_status` (active, cancelled, removed)
- Indexes: `idx_events_metro_start`, `idx_events_global_start`, `idx_events_organizer`, `idx_event_rsvps_event`, `idx_event_rsvps_user`
- RLS: public SELECT (status != 'removed'); Level 1+ INSERT; organizer-only UPDATE/DELETE
- Triggers: `trg_rsvp_insert` (increment rsvp_count), `trg_rsvp_delete` (decrement), `trg_event_updated_at`

**File Changes**
- `supabase/migrations/006_events.sql` — **CREATE**

**Tests / Validation**
- Review SQL manually for correctness before applying
- Apply via Supabase MCP `apply_migration` when ready

**Exit Criteria**
- Migration file is complete, additive-only (no DROP TABLE), and ready to apply
- SQL compiles without errors

**Status Update Rule**
- Set to `In Progress` before writing. Set to `Completed` after SQL is written and verified.

---

### Step 2 — Shared Types (`packages/shared/src/types/events.ts`)

**Goal**
- Define all TypeScript types for the events domain in shared package.

**Deliverables**
- `EventType` union type: `'cultural' | 'religious' | 'social' | 'career' | 'other'`
- `EventStatus` union type: `'active' | 'cancelled' | 'removed'`
- `RsvpVisibility` type: `'public' | 'private'`
- `Event` interface — all DB columns in snake_case + optional `organizer?: Pick<User, ...>`
- `EventRsvp` interface — `id`, `event_id`, `user_id`, `created_at`, optional `user?: Pick<User, ...>`

**File Changes**
- `packages/shared/src/types/events.ts` — **CREATE**
- `packages/shared/src/types/index.ts` — **MODIFY** (add `export * from './events'`)

**Tests / Validation**
- TypeScript compilation: `npm run type-check --workspace=packages/shared`

**Exit Criteria**
- Types exported from `@nepally/shared` without TS errors

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after type-check passes.

---

### Step 3 — Shared Constants (`packages/shared/src/constants/events.ts`)

**Goal**
- Define display labels, color tokens, and icons per event type — single source of truth for both platforms.

**Deliverables**
- `EVENT_TYPE_LABELS: Record<EventType, string>` — e.g. `{ cultural: 'Cultural', ... }`
- `EVENT_TYPE_COLORS: Record<EventType, { text: string; background: string }>` — exact hex values from wireframe
- `EVENT_TYPE_ICONS: Record<EventType, string>` — emoji per type

Color tokens from wireframe spec:
| Type | Text | Background |
|------|------|------------|
| Cultural | `#E65100` | `#FFF3E0` |
| Religious | `#6A1B9A` | `#F3E5F5` |
| Social | `#1B5E20` | `#E8F5E9` |
| Career | `#0D47A1` | `#E3F2FD` |
| Other | `#424242` | `#F5F5F5` |

**File Changes**
- `packages/shared/src/constants/events.ts` — **CREATE**
- `packages/shared/src/index.ts` — **MODIFY** (add `export * from './constants/events'`)

**Tests / Validation**
- TypeScript compilation passes

**Exit Criteria**
- Constants exported from `@nepally/shared`; both platforms can import without redefining colors

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after type-check passes.

---

### Step 4 — Shared Validation (`packages/shared/src/validation/events.ts` + tests)

**Goal**
- Define all Zod validation schemas for event creation and editing.

**Deliverables**
- `createEventSchema` — required: `title` (5–150), `event_type`, `start_date` (future), `location_name` (5–100), `description` (10–3000); optional: `end_date` (after start), `location_address` (≤200), `photo_url`, `rsvp_visibility` (default: 'public'), `is_global` (default: false)
- `updateEventSchema` — partial version of `createEventSchema`
- Both exported as types: `CreateEventInput`, `UpdateEventInput`

**File Changes**
- `packages/shared/src/validation/events.ts` — **CREATE**
- `packages/shared/src/validation/events.test.ts` — **CREATE**
- `packages/shared/src/validation/index.ts` — **MODIFY** (add `export * from './events'`)

**Tests / Validation**
- Unit tests: valid input passes; title < 5 chars fails; past start date fails; end before start fails; missing required fields fail
- `npm run test --workspace=packages/shared`

**Exit Criteria**
- All validation tests pass; schemas exported from `@nepally/shared`

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after tests pass.

---

### Step 5 — Shared API (`packages/shared/src/api/events.ts` + `uploadEventPhoto` + tests)

**Goal**
- Implement all Supabase query functions for events + event photo upload.

**Deliverables**

Functions in `packages/shared/src/api/events.ts` (all accept `supabase: SupabaseClient` as first param):
- `getEventsByMetro(supabase, metroId, options?)` — upcoming active events for metro + global events, chronological
- `getEventById(supabase, eventId)` — single event with organizer join
- `getEventsByOrganizer(supabase, organizerId)` — events created by a user
- `getEventAttendees(supabase, eventId)` — attendee list with user info joined
- `createEvent(supabase, payload: CreateEventInput & { organizer_id, metro_area_id })` — returns created event
- `updateEvent(supabase, eventId, payload: UpdateEventInput)` — organizer-only (RLS enforced)
- `cancelEvent(supabase, eventId)` — sets status = 'cancelled'
- `deleteEvent(supabase, eventId)` — sets status = 'removed'
- `rsvpToEvent(supabase, eventId, userId)` — insert into event_rsvps
- `unrsvpFromEvent(supabase, eventId, userId)` — delete from event_rsvps
- `getUserRsvps(supabase, userId)` — returns `string[]` of event_ids
- `hasUserRsvp(supabase, eventId, userId)` → `boolean`

In `packages/shared/src/api/storage.ts`:
- `uploadEventPhoto(supabase, input: EventPhotoUploadInput)` — same pattern as `uploadPostPhotos`, targets `event-photos/` bucket

**File Changes**
- `packages/shared/src/api/events.ts` — **CREATE**
- `packages/shared/src/api/events.test.ts` — **CREATE** (mock Supabase client)
- `packages/shared/src/api/storage.ts` — **MODIFY** (add `uploadEventPhoto`)
- `packages/shared/src/api/index.ts` — **MODIFY** (add `export * from './events'`)

**Tests / Validation**
- Unit tests for each API function: success case, error case, empty result
- `npm run test --workspace=packages/shared`
- `npm run test:coverage --workspace=packages/shared`

**Exit Criteria**
- All API function tests pass; functions exported from `@nepally/shared`

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after tests pass.

---

### Step 6 — Mobile Navigation Types

**Goal**
- Expand `EventsStackParamList` to include the new screens.

**Deliverables**
```typescript
export type EventsStackParamList = {
  EventsList: undefined;
  EventDetail: { eventId: string };
  CreateEvent: { editEventId?: string } | undefined;
};
```

**File Changes**
- `apps/mobile/src/types/navigation.ts` — **MODIFY**

**Tests / Validation**
- `npm run type-check --workspace=apps/mobile`

**Exit Criteria**
- TypeScript recognizes new routes; `navigation.navigate('EventDetail', { eventId: '...' })` compiles

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after type-check passes.

---

### Step 7 — Mobile Event Components

**Goal**
- Build 4 reusable components used across `EventsScreen` and `EventDetailScreen`.

**Deliverables**
- `EventTypeBadge.tsx` — colored pill: icon + label, color from `EVENT_TYPE_COLORS`, height 24px
- `EventCard.tsx` — card with thumbnail (140px, cover), badge row, title (2-line max), date/time, location, organizer (avatar + masked name + trust badge), RSVP count; past event gets muted styling; tap → EventDetail
- `RsvpButton.tsx` — handles all states: default ("RSVP — I'm Going"), going ("Going ✓" + "Can't make it"), past (disabled "Event Has Passed"), cancelled (hidden), organizer ("You're the organizer"), level0 (disabled "Verify to RSVP")
- `AttendeeAvatarStack.tsx` — up to 5 overlapping 24px avatar circles + "+N" label

All use `StyleSheet.create()`. Import types/constants from `@nepally/shared`. Reuse existing `Avatar` component.

**File Changes**
- `apps/mobile/src/components/events/EventTypeBadge.tsx` — **CREATE**
- `apps/mobile/src/components/events/EventCard.tsx` — **CREATE**
- `apps/mobile/src/components/events/RsvpButton.tsx` — **CREATE**
- `apps/mobile/src/components/events/AttendeeAvatarStack.tsx` — **CREATE**

**Tests / Validation**
- `npm run type-check --workspace=apps/mobile`

**Exit Criteria**
- Components render without errors; type-check clean

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after type-check passes.

---

### Step 8 — Mobile `EventsScreen` + test

**Goal**
- Replace the "Coming Soon" inline component with a full working Events list screen.

**Deliverables**
- Header: "📅 Events · [metro name]" + "Create Event" pill button (Level 1+ only)
- Level 0 warning banner (amber, dismissible): "Verify your phone to RSVP and create events."
- Horizontal scrollable filter chips: All · Cultural · Religious · Career · [More ▼] (opens bottom sheet with Social + Other)
- FlatList of `EventCard` components — upcoming events chronological
- "Past Events" section divider + past EventCards (muted, `past` flag)
- Loading state: 3 skeleton placeholder cards
- Empty state: per wireframe (no events / no filter results)
- Network error state + Retry button
- Pull-to-refresh

State: loads `getEventsByMetro()` on mount; client-side filter (no refetch on chip change); `getUserRsvps()` loaded on mount for RSVP hydration.

**File Changes**
- `apps/mobile/src/screens/EventsScreen.tsx` — **CREATE**
- `apps/mobile/src/screens/EventsScreen.test.tsx` — **CREATE**

**Tests / Validation**
- Unit tests: renders loading state, renders events, renders empty state, filter chips narrow list
- `npm run test --workspace=apps/mobile`

**Exit Criteria**
- Screen renders events list correctly; tests pass

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after tests pass.

---

### Step 9 — Mobile `EventDetailScreen` + test

**Goal**
- Full event detail screen with all states per wireframe.

**Deliverables**
- Hero image (220px, cover) with type-specific illustration fallback
- Type badge + Local/Global scope badge row
- Title, date/time (formatted per wireframe spec), location name + address
- Full description (scrollable, no truncation)
- Organizer section: `Avatar` + `formatPublicName()` + trust badge + "Message Organizer" button (Level 1+ → existing `MessageThread` nav; Level 0 → hidden)
- Tap organizer → `PublicProfileView` navigation (reuses existing HomeStackParamList route)
- Attendance section: `AttendeeAvatarStack` + RSVP count + "View all attendees" button → bottom sheet with full list
- `RsvpButton` with optimistic UI (immediate toggle, revert on error with toast)
- Cancelled state: red banner, strikethrough, RSVP button hidden
- Past state: info banner, RSVP button disabled "Event Has Passed"
- Own event (organizer): "You're the organizer" label; three-dot menu → Edit (→ CreateEvent pre-filled) / Cancel / Delete with confirmation dialogs
- Report button in header (non-organizer only)

**File Changes**
- `apps/mobile/src/screens/EventDetailScreen.tsx` — **CREATE**
- `apps/mobile/src/screens/EventDetailScreen.test.tsx` — **CREATE**

**Tests / Validation**
- Unit tests: renders event data, RSVP toggle, organizer view shows menu, cancelled/past states
- `npm run test --workspace=apps/mobile`

**Exit Criteria**
- All states render correctly; RSVP optimistic UI works; tests pass

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after tests pass.

---

### Step 10 — Mobile `CreateEventScreen` + test

**Goal**
- Create/edit event form (dual mode via `editEventId` param).

**Deliverables**
- Modal navigation (iOS slide-up, Android full-screen)
- Navigation bar: ✕ Cancel | "Create Event" / "Edit Event" title | Create/Save button (disabled until valid)
- Fields (per wireframe): Event Name, Event Type chips (single-select, color-filled on select), Start Date+Time (native picker), End Date+Time (optional), Location Name, Location Address (optional), Description (char counter), Photo (expo-image-picker → `uploadEventPhoto()`), RSVP Visibility radio, Global toggle (premium only)
- "Posting to: [city]" footer card; updates to "🌐 Global ON" when toggled
- Real-time inline validation via `createEventSchema.safeParse()` (debounced on change, immediate on blur)
- Cancel with dirty form → "Discard Event?" confirmation
- Edit mode: pre-fills all fields from existing event; submit calls `updateEvent()`
- Submit: `createEvent()` / `updateEvent()` → navigate to EventDetail

**File Changes**
- `apps/mobile/src/screens/CreateEventScreen.tsx` — **CREATE**
- `apps/mobile/src/screens/CreateEventScreen.test.tsx` — **CREATE**

**Tests / Validation**
- Unit tests: form validation gates, submit calls correct API, edit mode pre-fills
- `npm run test --workspace=apps/mobile`

**Exit Criteria**
- Create and edit flows work end-to-end; tests pass

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after tests pass.

---

### Step 11 — Rewrite `EventsNavigator`

**Goal**
- Replace the inline "Coming Soon" component with the real screens wired into the stack.

**Deliverables**
- Remove inline `EventsListScreen` function
- Register `EventsScreen` → `EventsList`
- Register `EventDetailScreen` → `EventDetail`
- Register `CreateEventScreen` → `CreateEvent` (modal presentation on iOS)

**File Changes**
- `apps/mobile/src/navigation/EventsNavigator.tsx` — **REWRITE**

**Tests / Validation**
- `npm run type-check --workspace=apps/mobile`

**Exit Criteria**
- Navigator compiles; events tab shows real content

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after type-check passes.

---

### Step 12 — Web Events Pages + tests

**Goal**
- Replace "Coming Soon" web events page with full events list, detail, and create pages.

**Pre-step action:** Delete `apps/web/src/pages/events.tsx` and `apps/web/src/pages/events.test.tsx` (conflicts with directory-based routing).

**Deliverables**

`apps/web/src/pages/events/index.tsx`:
- Two-column layout at ≥1024px (sidebar filter left, feed right); single column below
- Sidebar: radio filter group (All, Cultural, Religious, Social, Career, Other)
- Feed: EventCard list, chronological; "Create Event" button (Level 1+)
- Same loading, empty, error states as mobile

`apps/web/src/pages/events/[id].tsx`:
- Two-column desktop layout: event info left, actions/organizer/RSVP right
- Breadcrumb: Events > [Event Title]
- Same states as mobile detail (cancelled, past, organizer)
- Organizer dropdown for edit/cancel/delete (vs mobile action sheet)

`apps/web/src/pages/events/create.tsx`:
- Full-page route `/events/create`
- Styled `<input type="date">` / `<input type="time">` for date pickers
- `<input type="file" accept="image/*">` for photo upload
- Same dual create/edit mode (via `?edit=[id]` query param)

CSS Modules for each page.

**File Changes**
- `apps/web/src/pages/events.tsx` — **DELETE**
- `apps/web/src/pages/events.test.tsx` — **DELETE**
- `apps/web/src/pages/events/index.tsx` — **CREATE**
- `apps/web/src/pages/events/index.test.tsx` — **CREATE**
- `apps/web/src/pages/events/[id].tsx` — **CREATE**
- `apps/web/src/pages/events/[id].test.tsx` — **CREATE**
- `apps/web/src/pages/events/create.tsx` — **CREATE**
- `apps/web/src/pages/events/create.test.tsx` — **CREATE**
- `apps/web/src/pages/events/events.module.css` — **CREATE**
- `apps/web/src/pages/events/eventDetail.module.css` — **CREATE**
- `apps/web/src/pages/events/createEvent.module.css` — **CREATE**

**Tests / Validation**
- Unit tests per page: renders, filter interaction, RSVP toggle, form validation
- `npm run test --workspace=apps/web`

**Exit Criteria**
- All 3 web pages render and behave correctly; tests pass; no inline styles

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after tests pass.

---

### Step 13 — Web Event Components + CSS Modules

**Goal**
- Build reusable web event components (imported by all 3 web pages).

**Deliverables**
- `EventCard.tsx` + `EventCard.module.css` — mirrors mobile card, responsive
- `EventTypeBadge.tsx` + `EventTypeBadge.module.css` — colored pill badge
- `RsvpButton.tsx` + `RsvpButton.module.css` — all RSVP states, accessible
- `AttendeeList.tsx` + `AttendeeList.module.css` — modal dialog with scrollable list

All import types/constants from `@nepally/shared`. CSS Modules only — no inline `style={{}}`.

**File Changes**
- `apps/web/src/components/events/EventCard.tsx` + `.module.css` — **CREATE**
- `apps/web/src/components/events/EventTypeBadge.tsx` + `.module.css` — **CREATE**
- `apps/web/src/components/events/RsvpButton.tsx` + `.module.css` — **CREATE**
- `apps/web/src/components/events/AttendeeList.tsx` + `.module.css` — **CREATE**

**Tests / Validation**
- `npm run type-check --workspace=apps/web`

**Exit Criteria**
- Components render without errors; type-check clean; no inline styles

**Status Update Rule**
- Set to `In Progress` before coding. Set to `Completed` after type-check passes.

---

### Step 14 — Full Test Run & Verification

**Goal**
- Confirm all tests pass across the monorepo and the feature is shippable.

**Deliverables**
- All workspace tests passing
- Monorepo test suite passing
- Shared-first compliance verified

**Tests / Validation**
- `npm run test --workspace=packages/shared`
- `npm run test:coverage --workspace=packages/shared`
- `npm run test --workspace=apps/mobile`
- `npm run test --workspace=apps/web`
- `npm run test`

**Exit Criteria**
- Zero test failures; no regressions; `/shared-first-check` passes

**Status Update Rule**
- Set to `In Progress` when running. Set to `Completed` when all pass.

---

## 6) Testing Strategy

### Change Classification
- Shared types, constants — TypeScript compilation (no runtime tests needed)
- Shared validation — New functionality → unit tests
- Shared API functions — New functionality → unit tests with mocked Supabase
- `uploadEventPhoto` — New functionality → unit tests
- Mobile screens (3) — New functionality → unit tests per screen
- Web pages (3) — New functionality → unit tests per page

### Test Plan Matrix

| Area | Change Type | Required Tests | File Targets |
|------|-------------|----------------|--------------|
| Shared validation | New | Unit tests | `packages/shared/src/validation/events.test.ts` |
| Shared API | New | Unit tests (Supabase mocked) | `packages/shared/src/api/events.test.ts` |
| Mobile EventsScreen | New | Unit tests | `apps/mobile/src/screens/EventsScreen.test.tsx` |
| Mobile EventDetailScreen | New | Unit tests | `apps/mobile/src/screens/EventDetailScreen.test.tsx` |
| Mobile CreateEventScreen | New | Unit tests | `apps/mobile/src/screens/CreateEventScreen.test.tsx` |
| Web events/index | New | Unit tests | `apps/web/src/pages/events/index.test.tsx` |
| Web events/[id] | New | Unit tests | `apps/web/src/pages/events/[id].test.tsx` |
| Web events/create | New | Unit tests | `apps/web/src/pages/events/create.test.tsx` |

### Coverage and Quality Gates
- [ ] All new shared logic has unit tests
- [ ] All new screen/page components have unit tests
- [ ] No failing tests in any workspace

---

## 7) Data Contract Snapshot

### `events` table
| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | PK, default gen_random_uuid() |
| `title` | TEXT | NOT NULL, 5–150 chars |
| `description` | TEXT | NOT NULL, 10–3000 chars |
| `event_type` | event_type enum | NOT NULL |
| `start_date` | TIMESTAMPTZ | NOT NULL |
| `end_date` | TIMESTAMPTZ | nullable |
| `location_name` | TEXT | NOT NULL, 5–100 chars |
| `location_address` | TEXT | nullable, ≤200 chars |
| `metro_area_id` | TEXT | NOT NULL |
| `is_global` | BOOLEAN | NOT NULL, default false |
| `organizer_id` | UUID | NOT NULL, FK → users |
| `photo_url` | TEXT | nullable |
| `rsvp_count` | INTEGER | NOT NULL, default 0 |
| `rsvp_visibility` | TEXT | 'public' or 'private', default 'public' |
| `status` | event_status enum | NOT NULL, default 'active' |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default NOW() |

### `event_rsvps` table
| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | PK |
| `event_id` | UUID | NOT NULL, FK → events |
| `user_id` | UUID | NOT NULL, FK → users |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() |
| — | UNIQUE | `(event_id, user_id)` |

---

## 8) File Checklist

### New Files
- `supabase/migrations/006_events.sql`
- `packages/shared/src/types/events.ts`
- `packages/shared/src/constants/events.ts`
- `packages/shared/src/validation/events.ts`
- `packages/shared/src/validation/events.test.ts`
- `packages/shared/src/api/events.ts`
- `packages/shared/src/api/events.test.ts`
- `apps/mobile/src/screens/EventsScreen.tsx`
- `apps/mobile/src/screens/EventsScreen.test.tsx`
- `apps/mobile/src/screens/EventDetailScreen.tsx`
- `apps/mobile/src/screens/EventDetailScreen.test.tsx`
- `apps/mobile/src/screens/CreateEventScreen.tsx`
- `apps/mobile/src/screens/CreateEventScreen.test.tsx`
- `apps/mobile/src/components/events/EventTypeBadge.tsx`
- `apps/mobile/src/components/events/EventCard.tsx`
- `apps/mobile/src/components/events/RsvpButton.tsx`
- `apps/mobile/src/components/events/AttendeeAvatarStack.tsx`
- `apps/web/src/pages/events/index.tsx`
- `apps/web/src/pages/events/index.test.tsx`
- `apps/web/src/pages/events/[id].tsx`
- `apps/web/src/pages/events/[id].test.tsx`
- `apps/web/src/pages/events/create.tsx`
- `apps/web/src/pages/events/create.test.tsx`
- `apps/web/src/pages/events/events.module.css`
- `apps/web/src/pages/events/eventDetail.module.css`
- `apps/web/src/pages/events/createEvent.module.css`
- `apps/web/src/components/events/EventCard.tsx`
- `apps/web/src/components/events/EventCard.module.css`
- `apps/web/src/components/events/EventTypeBadge.tsx`
- `apps/web/src/components/events/EventTypeBadge.module.css`
- `apps/web/src/components/events/RsvpButton.tsx`
- `apps/web/src/components/events/RsvpButton.module.css`
- `apps/web/src/components/events/AttendeeList.tsx`
- `apps/web/src/components/events/AttendeeList.module.css`

### Modified Files
- `packages/shared/src/types/index.ts`
- `packages/shared/src/validation/index.ts`
- `packages/shared/src/api/index.ts`
- `packages/shared/src/api/storage.ts` (add `uploadEventPhoto`)
- `packages/shared/src/index.ts` (add events constants export)
- `apps/mobile/src/types/navigation.ts`
- `apps/mobile/src/navigation/EventsNavigator.tsx` (full rewrite)

### Deleted Files
- `apps/web/src/pages/events.tsx`
- `apps/web/src/pages/events.test.tsx`

---

## 9) Verification Matrix (Definition of Done)

### Automated
- [ ] `npm run test --workspace=packages/shared`
- [ ] `npm run test:coverage --workspace=packages/shared`
- [ ] `npm run test --workspace=apps/mobile`
- [ ] `npm run test --workspace=apps/web`
- [ ] `npm run test`

### Manual
- [ ] Mobile: Events tab shows upcoming events, filter chips narrow the list
- [ ] Mobile: Tap event card → detail screen; RSVP toggles optimistically
- [ ] Mobile: Level 1+ can tap "Create Event" → form opens; submit creates event
- [ ] Mobile: Organizer sees three-dot menu; edit pre-fills form; cancel/delete work with confirmation
- [ ] Mobile: Level 0 sees view-only; no Create button; RSVP button shows "Verify"
- [ ] Mobile: Cancelled event shows red banner; past event shows info banner
- [ ] Web: `/events` shows events list with sidebar filter on desktop
- [ ] Web: `/events/[id]` shows two-column detail, RSVP works
- [ ] Web: `/events/create` form validates and submits
- [ ] No inline `style={{}}` anywhere in web code
- [ ] No `StyleSheet` inline objects in mobile code

### Plan Hygiene
- [ ] Live step tracker statuses are fully up to date
- [ ] Any blocked step has explicit blocker + next action

---

## 10) Risks + Mitigations

- **Risk:** `events.tsx` → `events/` directory migration breaks Next.js routing
  - **Mitigation:** Delete old file before creating directory; verify `/events` route resolves to `events/index.tsx`
- **Risk:** `event-photos/` Supabase Storage bucket doesn't exist yet
  - **Mitigation:** Create bucket in Supabase dashboard or via storage migration before testing photo upload
- **Risk:** Large feature touching many files increases chance of regressions
  - **Mitigation:** Run workspace tests after each step; don't batch completions

---

## 11) Operational Readiness

- [ ] DB migration is additive-only (no DROP TABLE statements) — reviewed before applying
- [ ] `event-photos/` storage bucket created with appropriate RLS before photo upload tested
- [ ] No PII exposed: organizer name displayed via `formatPublicName()` only; no email/phone shown
- [ ] Level 0 gating enforced at both UI and RLS layers (belt-and-suspenders)

---

## 12) Open Questions

- **Event photo bucket:** Should it be a new `event-photos/` bucket or reuse `post-photos/`? → Rec: Separate bucket (cleaner RLS, easier to manage). Create before testing.
- **RSVP notification:** Should organizer get notified when someone RSVPs? → Deferred to notifications infrastructure (E6.1).
- **Attendee list cap:** Paginate or load all? → Load all for MVP (events unlikely to have thousands of RSVPs).
- **Cancelled events in list:** Show with "Cancelled" badge or exclude? → Show with badge (organizer accountability).

---

## 13) Handoff Commands

```bash
npm run test --workspace=packages/shared
npm run test:coverage --workspace=packages/shared
npm run test --workspace=apps/mobile
npm run test --workspace=apps/web
npm run test
```
