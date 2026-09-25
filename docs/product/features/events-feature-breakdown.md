# Events Feature: Implementation Breakdown

**Version:** 1.0
**Date:** 2026-03-05
**Status:** Planning — "Coming Soon" placeholder exists; full implementation not started

---

## Overview

The Events feature allows community members to discover, share, and RSVP to local Nepalese community events (cultural, religious, social, career). Currently, a "Coming Soon" placeholder tab exists on mobile and web. This document breaks down the full implementation into small, sequenceable chunks.

**Total Features:** 18
**Estimated Timeline:** 4-6 weeks (1 developer)
**Parallel Work:** Several UI tracks can run in parallel after shared layer is built

---

## Feature Categories

- **Foundation** — DB schema, shared types, API functions (4 features)
- **Event Discovery** — Events list screen, event cards, filtering (3 features)
- **Event Detail** — Full event view, organizer info, RSVP (3 features)
- **Event Creation** — Create/edit/delete events (Level 1+) (4 features)
- **RSVP System** — Attendance tracking (2 features)
- **Notifications** — Event reminders (1 feature)
- **Premium** — Global events, multi-location (1 feature)

---

## Implementation Sequence

### MILESTONE 1: Foundation (Days 1-5)

Build the shared data layer that all platforms consume.

#### E1.1 — Events Database Schema

- **What:** Create the `events` table and supporting indexes/RLS
- **Acceptance Criteria:**
  - `events` table with columns: `id`, `title`, `description`, `event_type` (enum: cultural, religious, social, career, other), `start_date` (timestamptz), `end_date` (timestamptz, nullable), `location_name`, `location_address` (nullable), `metro_area_id`, `is_global` (bool, default false), `organizer_id` (FK → users), `photo_url` (nullable), `rsvp_count` (int, default 0), `status` (enum: active, cancelled, removed), `created_at`, `updated_at`
  - Index on `(metro_area_id, start_date)` for feed queries
  - Index on `start_date` for chronological ordering
  - RLS policies: public can SELECT active events; Level 1+ can INSERT; only organizer can UPDATE/DELETE own events; admins can do anything
  - Migration file: `supabase/migrations/005_events.sql` (incremental, non-destructive)
- **Dependencies:** None (existing DB schema already in place)
- **Estimated Effort:** 1-2 days

#### E1.2 — RSVPs Database Schema

- **What:** Create the `event_rsvps` junction table
- **Acceptance Criteria:**
  - `event_rsvps` table: `id`, `event_id` (FK → events), `user_id` (FK → users), `created_at`
  - Unique constraint on `(event_id, user_id)` — one RSVP per user per event
  - RLS policies: Level 1+ can INSERT/DELETE own RSVPs; public can SELECT (for RSVP counts)
  - Trigger: increment `events.rsvp_count` on INSERT, decrement on DELETE
  - Include in `005_events.sql` migration or separate `006_event_rsvps.sql`
- **Dependencies:** E1.1
- **Estimated Effort:** 0.5 days

#### E1.3 — Shared Types & Validation

- **What:** Define `Event` and `EventRsvp` types in `packages/shared/src/types/`
- **Acceptance Criteria:**
  - `Event` interface with all DB columns (snake_case, matching Supabase response)
  - `EventType` union type: `'cultural' | 'religious' | 'social' | 'career' | 'other'`
  - `EventStatus` union type: `'active' | 'cancelled' | 'removed'`
  - `EventRsvp` interface: `id`, `event_id`, `user_id`, `created_at`
  - Zod schemas in `packages/shared/src/validation/events.ts`:
    - `createEventSchema` — validates all required fields for event creation
    - `updateEventSchema` — partial schema for editing
  - All types and schemas exported from `packages/shared/src/index.ts`
  - No platform-specific imports in shared code
- **Dependencies:** E1.1, E1.2
- **Estimated Effort:** 1 day

#### E1.4 — Shared API Functions

- **What:** Add all Supabase query functions to `packages/shared/src/api/events.ts`
- **Acceptance Criteria:**
  - `getMetroEventsPage(supabase, metroId, { period, now, limit?, offset? })` — one page of a metro's events plus global ones, upcoming soonest first or past most recent first, with organizer join (replaced `getEventsByMetro`, deleted 2026-09-24)
  - `getGlobalEvents(supabase)` — returns upcoming global events across all metros
  - `getEventById(supabase, eventId)` — returns single event with organizer info
  - `getEventsByOrganizer(supabase, organizerId)` — returns events created by a specific user
  - `createEvent(supabase, payload)` — inserts new event
  - `updateEvent(supabase, eventId, payload)` — updates existing event (organizer-only enforced by RLS)
  - `deleteEvent(supabase, eventId)` — soft-deletes (sets status = 'removed')
  - `rsvpToEvent(supabase, eventId, userId)` — inserts into `event_rsvps`
  - `unrsvpFromEvent(supabase, eventId, userId)` — deletes from `event_rsvps`
  - `getUserRsvps(supabase, userId)` — returns all event IDs the user has RSVP'd to
  - `getUserEventResponse(supabase, eventId, userId)` — returns the member's status (`going` | `interested`) or null (replaced `hasUserRsvp`, which reported any response as going, 2026-09-22)
  - All functions follow dependency-injection pattern (supabase client as first param)
  - Unit tests in `packages/shared/src/api/events.test.ts` with Supabase client mocked
  - All functions exported from `packages/shared/src/index.ts`
- **Dependencies:** E1.3
- **Estimated Effort:** 2 days

---

### MILESTONE 2: Event Discovery — List & Filtering (Days 4-9)

Replace the "Coming Soon" placeholder with a real events feed.

#### E2.1 — Events List Screen (Mobile) 🔄

- **What:** Replace placeholder with a scrollable events list on mobile
- **Acceptance Criteria:**
  - Screen registered as the Events tab in bottom navigation (already routed, just replace content)
  - Header shows "Events" + user's metro city name
  - Fetch events via `getMetroEventsPage()` on mount (`hooks/useMetroEventPages.ts`: upcoming, then past)
  - Display events in chronological order (soonest first)
  - Empty state: illustrated card — "No upcoming events in [City]. Check back soon!"
  - Loading skeleton (3 placeholder cards) while fetching
  - Pull-to-refresh
  - "Create Event" button in header (Level 1+ only; Level 0 sees disabled state with toast)
  - Uses `StyleSheet.create()` — no inline styles
- **Dependencies:** E1.4, E2.3 (event card component)
- **Estimated Effort:** 2 days

#### E2.2 — Events Page (Web) 🔄

- **What:** Replace "Coming Soon" web page with a real events list
- **Acceptance Criteria:**
  - Route: `/events` (already exists as placeholder)
  - Header with "Events" + metro city context
  - Fetch events via `getMetroEventsPage()` on page load (`hooks/useEventFeed.ts`: upcoming, then past)
  - Same chronological list, empty state, and loading skeleton as mobile
  - "Create Event" button visible for Level 1+ users
  - CSS Modules only — no inline `style={{}}`
- **Dependencies:** E1.4, E2.3 (event card component)
- **Estimated Effort:** 2 days

#### E2.3 — Event Card Component (Mobile + Web)

- **What:** Reusable card component displayed in the events list
- **Acceptance Criteria:**
  - Mobile: React Native component in `apps/mobile/src/components/events/EventCard.tsx`
  - Web: React component in `apps/web/src/components/events/EventCard.tsx`
  - Each card shows:
    - Event type badge (colored chip: Cultural=orange, Religious=purple, Social=green, Career=blue, Other=gray)
    - Event title (bold)
    - Start date + time in a human-readable format (e.g., "Sat, Mar 14 · 6:00 PM")
    - If multi-day: "Mar 14-16"
    - Location name
    - Organizer name + trust badge (small avatar + "by [First L.]")
    - RSVP count ("12 going")
    - Global badge (🌐) if `is_global = true`
  - Tap/click navigates to event detail
  - `StyleSheet.create()` on mobile; CSS Modules on web
- **Dependencies:** E1.3
- **Estimated Effort:** 2 days

#### E2.4 — Event Type Filter Chips

- **What:** Horizontal scrollable filter chips to narrow events by type
- **Acceptance Criteria:**
  - Chips: All, Cultural, Religious, Social, Career, Other
  - "All" selected by default
  - Only one chip active at a time (single-select, unlike post tag filter)
  - Selecting a chip re-filters the displayed list (client-side, no refetch needed)
  - Active chip visually highlighted (filled background, white text)
  - Chip labels include icon for each type (consistent with event card badges)
  - Both mobile and web implementations
- **Dependencies:** E2.1, E2.2, E2.3
- **Estimated Effort:** 1 day

---

### MILESTONE 3: Event Detail (Days 8-12)

#### E3.1 — Event Detail Screen (Mobile + Web)

- **What:** Full view of a single event with all details
- **Acceptance Criteria:**
  - Mobile: `EventDetailScreen` navigated to from event card tap
  - Web: `/events/[id]` dynamic route
  - Display: event photo (if any) as hero image; fallback placeholder illustration
  - Display: event type badge, title, full description (no truncation)
  - Display: date/time (start and end if applicable), formatted clearly
  - Display: location name + address (if provided)
  - Display: organizer avatar + masked name ("Firstname L.") + trust badge — tapping navigates to public profile
  - Display: RSVP count ("12 people going")
  - RSVP button (see E4.1)
  - Report button (links into existing report system)
  - Organizer sees "Edit" and "Delete" actions via action menu
  - Cancelled events show a "Cancelled" banner; content still visible
  - Loading state while fetching event data
- **Dependencies:** E1.4, E2.3
- **Estimated Effort:** 2-3 days

#### E3.2 — Organizer Info Section

- **What:** Display event organizer info on detail screen
- **Acceptance Criteria:**
  - Organizer row beneath event details: avatar circle, masked name, trust badge
  - Tapping organizer navigates to their public profile (reuses existing `PublicProfileScreen` / `/users/[id]`)
  - "Message Organizer" button — opens chat with organizer (same flow as "Contact Author" on posts)
  - Reuses existing `getUserById()` shared API function — no new DB calls needed
- **Dependencies:** E3.1 (existing public profile + chat already built)
- **Estimated Effort:** 0.5 days

#### E3.3 — Event Attendees List (Basic)

- **What:** Show who is attending (count + limited avatar stack)
- **Acceptance Criteria:**
  - Below RSVP button: avatar stack showing up to 5 attendee photos (or initials)
  - Text label: "12 people going" (using `rsvp_count`)
  - Tapping "12 people going" shows a simple modal/sheet with full attendee list (names + trust badges)
  - Attendee list fetches `event_rsvps` joined with user info on demand (not on page load)
  - Empty state: "Be the first to RSVP!"
- **Dependencies:** E3.1, E4.1 (RSVP system)
- **Estimated Effort:** 1-2 days

---

### MILESTONE 4: Event Creation (Days 10-16)

#### E4.1 — Create Event Form (Mobile + Web)

- **What:** Form to create a new event (Level 1+)
- **Acceptance Criteria:**
  - Fields:
    - Title (required, 5-150 chars)
    - Description (required, 10-3000 chars)
    - Event Type (required, single-select: Cultural, Religious, Social, Career, Other)
    - Start Date + Time (required, date/time picker)
    - End Date + Time (optional)
    - Location Name (required, free text, 5-100 chars)
    - Location Address (optional, free text)
    - Photo (optional, single image upload — reuses existing photo upload infrastructure)
    - Global Toggle (premium users only — makes event visible in all metro feeds)
  - Validation via `createEventSchema` from shared validation
  - Level 0 users cannot access create form (redirect to verification prompt)
  - Submit: calls `createEvent()`, navigates to the new event's detail screen on success
  - Mobile: uses `StyleSheet.create()`; Web: uses CSS Modules
- **Dependencies:** E1.4, E1.3 (validation), existing photo upload infrastructure
- **Estimated Effort:** 3-4 days

#### E4.2 — Edit Event (Mobile + Web)

- **What:** Allow event organizers to edit their events
- **Acceptance Criteria:**
  - "Edit Event" action in organizer's action menu on event detail
  - Opens same create form pre-filled with current event data
  - All fields editable (except organizer and metro area)
  - On save: calls `updateEvent()`, navigates back to detail screen
  - Non-organizers never see the edit action (enforced by RLS + UI check)
  - Shows "Edited" indicator on event detail if `updated_at > created_at` by > 1 minute
- **Dependencies:** E4.1
- **Estimated Effort:** 1-2 days

#### E4.3 — Cancel / Delete Event

- **What:** Organizer can cancel or delete their event
- **Acceptance Criteria:**
  - Two distinct actions available to organizer in action menu:
    - "Cancel Event" — sets status to `cancelled`; event remains visible with "Cancelled" banner; RSVP'd users notified (if push notifications are set up)
    - "Delete Event" — soft-deletes (status = `removed`); removes from all feeds immediately; no recovery
  - Confirmation dialogs for both actions (clearly distinguish the two)
  - After delete, navigate back to events list
- **Dependencies:** E4.2
- **Estimated Effort:** 1 day

#### E4.4 — Event Visibility in Profile

- **What:** Show events created by a user on their public profile
- **Acceptance Criteria:**
  - "Events" sub-tab (or section) added to `ProfileScreen` (mobile) and `/profile` (web) alongside Posts and Saved Posts
  - Lists events created by the user (upcoming first, then past)
  - Uses existing `getEventsByOrganizer()` API function
  - On public profile (`/users/[id]` and `PublicProfileScreen`): show same events section for the organizer
  - Empty state: "No events created yet."
- **Dependencies:** E4.1, existing profile screens
- **Estimated Effort:** 1-2 days

---

### MILESTONE 5: RSVP System (Days 14-17)

#### E5.1 — RSVP Button & Toggle

- **What:** Allow Level 1+ users to RSVP to events
- **Acceptance Criteria:**
  - RSVP button on event detail screen (mobile + web)
  - State A (not going): outlined button — "RSVP / Going?" with calendar-add icon
  - State B (going): filled button — "Going ✓" with checkmark
  - Tapping toggles RSVP: calls `rsvpToEvent()` or `unrsvpFromEvent()` accordingly
  - Optimistic UI: update button state immediately, revert on error
  - RSVP count on event card and detail updates in real-time (refetch or increment locally)
  - Level 0 users: button visible but disabled; tap shows verification prompt
  - Users cannot RSVP to cancelled events (button disabled + "Cancelled" state shown)
  - Load user's existing RSVPs on app start (via `getUserRsvps()`) to restore button state
- **Dependencies:** E1.4, E3.1
- **Estimated Effort:** 2 days

#### E5.2 — Saved Events (RSVP'd Events List)

- **What:** Allow users to view all events they've RSVP'd to
- **Acceptance Criteria:**
  - "Going" section in profile (or within the Events tab as a "My Events" filter)
  - Shows events the user has RSVP'd to, sorted by upcoming first
  - Differentiates past events (grayed out) from upcoming events
  - Tap to navigate to event detail
  - Empty state: "You haven't RSVP'd to any events yet."
- **Dependencies:** E5.1
- **Estimated Effort:** 1 day

---

### MILESTONE 6: Notifications (Days 16-18)

#### E6.1 — Event Reminder Push Notifications

- **What:** Notify RSVP'd users before an event starts
- **Acceptance Criteria:**
  - Trigger: 24 hours before event start time, send push notification to all RSVP'd users
  - Trigger: 1 hour before event start time, send second reminder
  - Notification body: "[Event Title] starts in 24 hours / 1 hour — [Location Name]"
  - Tapping notification opens event detail screen
  - Respects user's notification preferences (if notifications are disabled, skip)
  - Implemented as a Supabase Edge Function (cron job or pg_cron trigger)
  - Cancelled events: suppress reminders (don't send if event status = 'cancelled')
- **Dependencies:** E5.1, existing push notification infrastructure (Expo Push)
- **Estimated Effort:** 2-3 days

---

### MILESTONE 7: Premium — Global Events (Days 16-18, Parallel)

#### E7.1 — Global Events in Feed & Multi-Location

- **What:** Premium users can create global events and view events across saved locations
- **Acceptance Criteria:**
  - Global toggle on create event form (premium users only)
  - Global events (`is_global = true`) appear in all metro area event feeds
  - Event card shows 🌐 badge for global events
  - Premium users with multiple saved locations can switch location context in the Events tab header to browse events in other metros
  - Location switcher for events reuses the same premium location-switcher component as the home feed
  - Non-premium users: no global toggle, no location switcher
- **Dependencies:** E4.1, E2.1, E2.2, existing premium/location switcher infrastructure
- **Estimated Effort:** 1-2 days

---

## Feature Priority Matrix

### Must-Have (Feature is incomplete without these)

- E1.1 — Events DB schema
- E1.2 — RSVPs DB schema
- E1.3 — Shared types & validation
- E1.4 — Shared API functions
- E2.1 — Events list screen (mobile)
- E2.2 — Events page (web)
- E2.3 — Event card component
- E2.4 — Event type filter chips
- E3.1 — Event detail screen
- E4.1 — Create event form
- E5.1 — RSVP button & toggle

**Total Must-Have:** 11 features

### Should-Have (Significantly improves UX)

- E3.2 — Organizer info section (message organizer)
- E3.3 — Event attendees list
- E4.2 — Edit event
- E4.3 — Cancel / delete event
- E4.4 — Event visibility in profile
- E5.2 — Saved events list (RSVP'd)

**Total Should-Have:** 6 features

### Nice-to-Have (Post-MVP)

- E6.1 — Event reminder push notifications
- E7.1 — Global events & multi-location (premium)

**Total Nice-to-Have:** 2 features (requires existing push notification infrastructure to be fully built)

---

## Parallel Work Plan

After Milestone 1 (foundation) is complete, the following tracks can be worked in parallel:

- **Track A:** E2.1 + E2.3 + E2.4 (mobile list UI)
- **Track B:** E2.2 + E2.3 + E2.4 (web list UI — shares EventCard logic pattern)
- **Track C:** E4.1 (create form — can start once API functions exist)

Milestone 3 (detail) and Milestone 5 (RSVP) block each other sequentially but are independent of Milestone 4 (creation).

---

## Shared-First Architecture Notes

The following code placement decisions apply:

| Code Unit                                                                   | Location                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------- |
| `Event`, `EventRsvp`, `EventType`, `EventStatus` types                      | `packages/shared/src/types/events.ts`             |
| `createEventSchema`, `updateEventSchema` Zod schemas                        | `packages/shared/src/validation/events.ts`        |
| All API functions (getMetroEventsPage, createEvent, setEventResponse, etc.) | `packages/shared/src/api/events.ts`               |
| EventCard component (mobile)                                                | `apps/mobile/src/components/events/EventCard.tsx` |
| EventCard component (web)                                                   | `apps/web/src/components/events/EventCard.tsx`    |
| EventsScreen (mobile)                                                       | `apps/mobile/src/screens/EventsScreen.tsx`        |
| Events page (web)                                                           | `apps/web/src/pages/events/index.tsx`             |
| EventDetailScreen (mobile)                                                  | `apps/mobile/src/screens/EventDetailScreen.tsx`   |
| Event detail page (web)                                                     | `apps/web/src/pages/events/[id].tsx`              |
| CreateEventScreen (mobile)                                                  | `apps/mobile/src/screens/CreateEventScreen.tsx`   |
| Create event page (web)                                                     | `apps/web/src/pages/events/create.tsx`            |
| Edge Function for reminder notifications                                    | `supabase/functions/event-reminders/`             |

Run `/shared-first-check` after implementation to verify compliance.

---

## Database Migration Plan

Create `supabase/migrations/005_events.sql` (non-destructive, additive only):

```sql
-- events table
CREATE TABLE IF NOT EXISTS events ( ... );

-- event_rsvps table
CREATE TABLE IF NOT EXISTS event_rsvps ( ... );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_metro_start ON events (metro_area_id, start_date);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events (start_date);

-- RLS policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Triggers for rsvp_count
CREATE OR REPLACE FUNCTION increment_rsvp_count() RETURNS trigger ...
CREATE OR REPLACE FUNCTION decrement_rsvp_count() RETURNS trigger ...
```

> **Important:** Do NOT modify `001_schema.sql`, `002_seed_data.sql`, or `003_storage.sql`.

---

## Success Criteria

| Metric                                                     | Target |
| ---------------------------------------------------------- | ------ |
| Events tab loads < 1s (cached or fast query)               | Yes    |
| All filter chips correctly narrow the list                 | Yes    |
| RSVP toggles correctly (optimistic UI, no double-RSVP)     | Yes    |
| Event creation validates all fields before submit          | Yes    |
| No PII exposed on event detail (organizer name masked)     | Yes    |
| Tests pass: `packages/shared` + `apps/mobile` + `apps/web` | Yes    |

---

## Related Documentation

- [Events Feature Spec](./events.md) — high-level purpose, user stories, data model
- [Product Roadmap — Section H](../roadmap.md#h-events-documentation-only) — roadmap context
- [Phase 1 Feature Breakdown](./phase1-feature-breakdown.md) — existing Phase 1 work for reference
- [Code Sharing Guide](../../guides/code-sharing.md) — shared-first architecture rules
- [Monorepo Structure](../../architecture/monorepo-structure.md) — package boundaries
- [Notifications Feature Plan](../../archive/plans/notifications-feature.md) — push notification infrastructure (prerequisite for E6.1)
