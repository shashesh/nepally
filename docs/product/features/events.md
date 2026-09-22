# Feature: Events

**Status:** Approved
**Phase:** 1 (full implementation)
**Last Updated:** 2026-03-05
**Priority:** Medium

---

## Overview

The Events feature allows verified community members to discover, create, and RSVP to local Nepalese community events — cultural celebrations, religious gatherings, professional meetups, and social events. It solves three linked problems: **discovery** (events are currently scattered across Facebook groups), **coordination** (RSVPs and reminders reduce no-shows), and **creation** (any verified user can post an event, not just admins).

---

## Problem Statement

Nepalese diaspora community members currently rely on Facebook groups and WhatsApp chains to learn about local events. This creates three friction points:

1. **Discovery failure**: Events posted in group feeds get buried quickly. Members miss events they would have attended.
2. **Coordination friction**: No native RSVP or reminder system. Organizers cannot gauge attendance in advance.
3. **Creation barrier**: Only group admins can post events on Facebook. Verified community members have no independent channel.

Nepally's metro-first location model makes it uniquely positioned to surface the right local events to the right users without algorithm-based noise.

---

## User Stories

### Discovery

- As a **community member (Level 0+)**, I want to browse upcoming events in my metro area so I can discover what's happening near me.
- As a **community member**, I want to filter events by type (Cultural, Religious, Social, Career) so I can find events that match my interests.
- As a **community member**, I want to see event details (date, time, location, organizer, description) so I can decide whether to attend.

### Coordination

- As a **verified user (Level 1+)**, I want to RSVP to an event so the organizer knows I'm attending and I get a reminder.
- As a **verified user**, I want to see who else is attending (when public) so I know if people I know are going.
- As an **event organizer**, I want to control whether my attendee list is public or private.
- As an **event organizer**, I want to see everyone who has RSVP'd, regardless of privacy setting.

### Creation

- As a **verified user (Level 1+)**, I want to create a local event so my community can discover and attend it.
- As a **premium user**, I want to toggle my event as global so it's visible across all metro areas, not just mine.
- As an **event organizer**, I want to edit or cancel my event if plans change.
- As an **event organizer**, I want to see a list of events I've created in my profile.

---

## Feature Scope

### In Scope (MVP)

| Feature | Description |
|---------|-------------|
| Events list screen | Chronological feed of upcoming events, filter chips by type |
| Event detail screen | Full event info, organizer, RSVP button, attendee section |
| Event creation form | Level 1+ can create local events (premium can toggle global) |
| Event editing | Organizer can edit title, description, date, location, type |
| Event cancellation | Organizer can cancel event (remains visible with "Cancelled" banner) |
| RSVP toggle | Level 1+ can RSVP / un-RSVP; optimistic UI |
| RSVP privacy | Organizer sets public (show names) or private (count only) |
| Past events | Events remain visible after end date, marked "Past", RSVP disabled |
| Events in profile | Organizer's created events visible on their public profile |
| Global events (premium) | Premium users can create events visible in all metro feeds |

### Out of Scope (Future)

| Feature | Reason Deferred |
|---------|----------------|
| Recurring events | Complexity; deferred to post-MVP |
| Calendar view | Deferred; feed-first approach sufficient for MVP |
| Event photo galleries | Single photo supported; full gallery deferred |
| External calendar sync (Google/Apple) | API integration complexity |
| Event capacity / waitlist | No pressing user need identified yet |
| Event comments/discussion | Chat with organizer covers this for now |
| Co-organizers | Single organizer model sufficient for MVP |

---

## Functional Requirements

### 1. Events List

- [ ] Events tab in bottom navigation (already routed as "Coming Soon"); replace placeholder content
- [ ] Header displays "Events" + user's metro city name (e.g., "Events · Dallas-Fort Worth")
- [ ] Filter chip bar (horizontal scroll): **All**, Cultural, Religious, Social, Career, Other
- [ ] "All" selected by default; single-select (only one chip active at a time)
- [ ] Events listed in chronological order (soonest start date first)
- [ ] Upcoming events shown by default; past events appear below a "Past Events" divider after all upcoming events
  - **Web (since 2026-09-22):** the two groups are paged separately under "Upcoming" and "Past events" headings. Upcoming events come soonest first, then past events **most recent first**. A metro with nothing upcoming opens on its past events rather than an empty list. Mobile still pages every event by start date ascending
- [ ] Pull-to-refresh
- [ ] Infinite scroll / pagination (20 events per page)
- [ ] Empty state (no upcoming events): illustration + "No upcoming events in [City]. Check back soon!"
- [ ] Loading skeleton (3 placeholder cards) while fetching
- [ ] "Create Event" button in header (Level 1+ only)
  - Level 0: button hidden or shows verification prompt on tap
- [ ] Global events (is_global = true) from any metro appear in the feed with a 🌐 badge
- [ ] Premium users with multiple saved locations see a location switcher in the header (same component as home feed)

### 2. Event Card (in list)

Each event card displays:

- [ ] Event type badge (colored pill): Cultural=orange, Religious=purple, Social=green, Career=blue, Other=gray
- [ ] Event title (bold, max 2 lines, truncated with ellipsis)
- [ ] Date/time: human-readable format
  - Same-day event: "Sat, Mar 14 · 6:00 PM"
  - Multi-day event: "Mar 14 – Mar 16"
  - All-day event (no time specified): "Sat, Mar 14"
- [ ] Location name (1 line, truncated)
- [ ] Organizer: small avatar (24px) + masked name ("Asha K.") + trust badge
- [ ] RSVP count: "34 going" (or "1 going" for singular)
- [ ] 🌐 Global badge if is_global = true
- [ ] Tap card → navigate to event detail

### 3. Event Detail Screen

- [ ] Hero image: event photo if provided; fallback = event-type illustration placeholder
- [ ] Event type badge
- [ ] Event title (full, no truncation)
- [ ] Date/time row: calendar icon + formatted date/time (start through end if applicable)
- [ ] Location row: map pin icon + location name + address (if provided)
- [ ] Description (full text, scrollable)
- [ ] Organizer section: avatar (40px) + masked name + trust badge + "Message Organizer" button
  - Tapping avatar/name navigates to organizer's public profile
  - "Message Organizer" opens in-app chat (Level 1+ only; Level 0 sees prompt)
- [ ] RSVP section:
  - RSVP count: "34 going"
  - RSVP button (see Section 5)
  - Attendee list or count-only based on privacy setting (see Section 5)
  - **Web (since 2026-09-22):** the detail page offers **Interested** as well as Going, the same pair the list's cards carry, so a member can mark either from either place. Where a member can't respond, the card says why in a sentence — "This event has passed.", "You're the organizer." or "Verify your account to respond." — instead of showing a disabled button. Mobile detail keeps its single RSVP button
- [ ] Report button (links into existing report system; no auto-hide threshold for events)
- [ ] Organizer-only: action menu (Edit, Cancel Event) — three-dot menu top right
- [ ] Cancelled events: red "Cancelled" banner below hero image; all other content still visible; RSVP button replaced with "Event Cancelled" label
- [ ] Past events: "Past Event" label shown; RSVP button replaced with "Event Has Passed" label
- [ ] Loading state while fetching event data

### 4. Event Creation Form

- [ ] Accessible from "Create Event" button in events list header
- [ ] Level 0 users cannot access; redirected to verification prompt
- [ ] Fields:
  - **Event Name** (required, 5–150 chars) — text input
  - **Event Type** (required) — single-select chip selector: Cultural, Religious, Social, Career, Other
  - **Start Date & Time** (required) — date + time picker
  - **End Date & Time** (optional) — date + time picker; must be after start date
  - **Location Name** (required, 5–100 chars) — e.g., "Dallas Convention Center"
  - **Location Address** (optional, max 200 chars) — full address for attendees
  - **Description** (required, 10–3000 chars) — multi-line text area
  - **Event Photo** (optional) — single image; same upload flow as post photos (compressed to 2MB, 1200px wide); stored in Supabase Storage bucket `event-photos/`
  - **RSVP Visibility** (required, default: Public) — toggle: "Public — anyone can see who's going" / "Private — only you see the attendee list"
  - **Global toggle** (premium users only) — makes event visible across all metros; non-premium users do not see this toggle
- [ ] All validation via `createEventSchema` (Zod, in `packages/shared/`)
- [ ] Submit button disabled until all required fields valid
- [ ] On submit: calls `createEvent()`, navigates to the new event's detail screen
- [ ] On success: event immediately visible in metro feed (no moderation queue)

### 5. RSVP System

- [ ] RSVP button states:
  - **Not going (default)**: outlined button — "RSVP" with calendar-add icon
  - **Going**: filled button — "Going ✓" with checkmark
  - **Past event**: disabled — "Event Has Passed"
  - **Cancelled event**: hidden/replaced with "Event Cancelled" label
- [ ] Level 0 users: RSVP button visible but disabled; tap shows "Verify your account to RSVP"
- [ ] Tapping toggles RSVP: `rsvpToEvent()` or `unrsvpFromEvent()`
- [ ] Optimistic UI: update button state immediately; revert on error with toast
- [ ] RSVP count updates locally after toggle (no full refetch needed)
- [ ] Users cannot RSVP to their own events (button replaced with "You're the organizer")
- [ ] One RSVP per user per event (enforced by DB unique constraint + RLS)
- [ ] Load user's existing RSVPs on app start (via `getUserRsvps()`) to restore button state

**RSVP Attendee List (Privacy-Controlled):**

| Privacy Setting | Non-Organizer View | Organizer View |
|----------------|-------------------|---------------|
| Public | RSVP count + full attendee list (avatar stack → expand to full names list) | Count + full list |
| Private | RSVP count only ("34 going"); attendee list section hidden | Count + full list in organizer's event management view |

- Attendee list (when public): avatar stack showing up to 5 attendee photos/initials; tap → sheet/modal with scrollable full list (masked names + trust badges)
- Attendee list fetched on demand (not on page load)
- The list holds **only the people going**. An Interested response counts towards the interested total and never appears among the attendees (fixed 2026-09-22; before, `getEventAttendees` returned every response)
- Empty state: "Be the first to RSVP!"

### 6. Event Management (Organizer)

- [ ] **Edit Event**: pre-fills create form with current event data; all fields editable; calls `updateEvent()`; shows "Edited" label on detail screen if updated_at differs from created_at by > 60 seconds
- [ ] **Cancel Event**: sets status = 'cancelled'; event remains in feed with "Cancelled" banner; existing RSVPs preserved in DB
  - Confirmation dialog: "Cancel this event? Your attendees will see it as cancelled."
- [ ] **Delete Event**: soft-deletes (status = 'removed'); removed from all feeds immediately
  - Confirmation dialog: "Delete this event? This cannot be undone."
  - Distinction clearly communicated: Cancel = still visible but marked cancelled; Delete = gone from feed
- [ ] **Events in Profile**: "Events" tab/section on own profile screen listing organizer's events (upcoming first, then past); same section visible on public profile view

---

## User Flows

### Flow 1: Discover & RSVP to an Event (Level 1+ User)

1. User taps Events tab → sees upcoming events in their metro area
2. User taps "Cultural" filter chip → list narrows to cultural events
3. User taps an event card → navigates to event detail
4. User reads title, date/time, location, and description
5. User taps "RSVP" button → button immediately flips to "Going ✓"; count increments
6. User taps organizer avatar → navigates to organizer's public profile
7. User taps back → returns to event detail

**Variant A — Public RSVP**: User sees avatar stack below RSVP button; taps "34 going" → sheet shows full attendee list
**Variant B — Private RSVP**: User sees "34 going" text only; no attendee list visible

### Flow 2: Create an Event (Level 1+ User)

1. User taps Events tab → taps "Create Event" button in header
2. Create Event form opens
3. User fills in: Event Name, selects "Cultural" type, sets start date/time, sets location name, writes description
4. User optionally adds a photo (selects from library → compressed → preview shown)
5. User sets RSVP Visibility to "Private"
6. (Premium user only) User toggles Global on/off
7. User taps "Create Event" → event created; navigates to event detail screen
8. Event immediately appears in the metro events feed

### Flow 3: Manage an Existing Event (Organizer)

1. Organizer navigates to their event detail (via Events tab or their Profile → Events tab)
2. Organizer taps three-dot action menu (top right)
3. **Edit path**: Taps "Edit Event" → pre-filled form → changes end date → saves → detail screen shows updated date + "Edited" label
4. **Cancel path**: Taps "Cancel Event" → confirmation dialog → confirms → event shows "Cancelled" banner; RSVP button removed for all users
5. **Delete path**: Taps "Delete Event" → confirmation dialog → confirms → navigated back to events list; event no longer appears in feed

---

## Edge Cases & Error States

| Scenario | Expected Behavior |
|----------|------------------|
| No upcoming events in metro | Empty state illustration + "No upcoming events in [City]. Check back soon!" |
| Event has ended | "Past Event" label; RSVP disabled; event appears below "Past Events" divider |
| Event cancelled | Red "Cancelled" banner on detail; RSVP button removed; still visible in feed with visual indicator |
| User RSVP's then organizer cancels | RSVP record preserved in DB; RSVP button replaced with "Event Cancelled" label for that user |
| Level 0 taps RSVP | Disabled state; tap shows verification prompt toast |
| Level 0 taps Create Event | Button hidden or redirected to verification prompt |
| Network error on RSVP | Optimistic UI reverted; error toast "Couldn't update RSVP. Try again." |
| Organizer taps RSVP button on own event | Button replaced with "You're the organizer" label (non-interactive) |
| Premium user creates global event | Event appears in all metro feeds with 🌐 badge |
| Non-premium user views global toggle | Toggle not shown (or shown as disabled with "Upgrade to Premium" tooltip) |
| Event photo fails to upload | Toast error; event can still be submitted without photo |
| Start date in the past (on create) | Validation error: "Start date must be in the future" |
| End date before start date | Validation error: "End date must be after start date" |
| User has no metro area set | Events tab shows prompt to set location in profile |

---

## Trust & Safety Considerations

- **No moderation queue**: Events publish immediately (unlike Emergency posts). This aligns with the fact that events have a named, verified organizer who is accountable.
- **PII protection**: Organizer name displayed as "Firstname L." (masked via `formatPublicName()`). No phone, email, or address shown.
- **Location address**: Street address is optional and shown only in event detail (not on cards). Users choose how much location detail to share.
- **RSVP privacy**: Organizer control prevents unwanted public visibility of attendee identity.
- **Reporting**: Report button on event detail feeds into existing report system. No auto-hide threshold — reported events go to moderator queue for manual review.
- **No anonymous events**: Only Level 1+ (verified) users can create events, ensuring organizer identity is tied to a verified account.
- **Spam prevention**: Trust level gate (Level 1+) prevents Level 0 throwaway accounts from flooding the events feed.

---

## Database Schema

> Create as `supabase/migrations/005_events.sql` — additive only. Do NOT modify 001, 002, or 003.

```sql
-- Event type enum
CREATE TYPE event_type AS ENUM ('cultural', 'religious', 'social', 'career', 'other');

-- Event status enum
CREATE TYPE event_status AS ENUM ('active', 'cancelled', 'removed');

-- Events table
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 150),
  description     TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 3000),
  event_type      event_type NOT NULL,
  start_date      TIMESTAMPTZ NOT NULL,
  end_date        TIMESTAMPTZ,
  location_name   TEXT NOT NULL CHECK (char_length(location_name) BETWEEN 5 AND 100),
  location_address TEXT CHECK (char_length(location_address) <= 200),
  metro_area_id   TEXT NOT NULL,
  is_global       BOOLEAN NOT NULL DEFAULT FALSE,
  organizer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url       TEXT,
  rsvp_count      INTEGER NOT NULL DEFAULT 0,
  rsvp_visibility TEXT NOT NULL DEFAULT 'public' CHECK (rsvp_visibility IN ('public', 'private')),
  status          event_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RSVPs table
CREATE TABLE event_rsvps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

-- Indexes
CREATE INDEX idx_events_metro_start   ON events (metro_area_id, start_date) WHERE status = 'active';
CREATE INDEX idx_events_global_start  ON events (start_date) WHERE is_global = TRUE AND status = 'active';
CREATE INDEX idx_events_organizer     ON events (organizer_id);
CREATE INDEX idx_event_rsvps_event    ON event_rsvps (event_id);
CREATE INDEX idx_event_rsvps_user     ON event_rsvps (user_id);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Events: anyone can read active/cancelled events
CREATE POLICY "events_select" ON events FOR SELECT USING (status != 'removed');

-- Events: Level 1+ users can create
CREATE POLICY "events_insert" ON events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND trust_level >= 1
  ));

-- Events: organizer can update/delete own events
CREATE POLICY "events_update" ON events FOR UPDATE
  USING (organizer_id = auth.uid());
CREATE POLICY "events_delete" ON events FOR DELETE
  USING (organizer_id = auth.uid());

-- RSVPs: anyone can read (privacy filtering handled in application layer)
CREATE POLICY "rsvps_select" ON event_rsvps FOR SELECT USING (TRUE);

-- RSVPs: Level 1+ users can insert own RSVPs
CREATE POLICY "rsvps_insert" ON event_rsvps FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND trust_level >= 1
  ));

-- RSVPs: users can delete own RSVPs
CREATE POLICY "rsvps_delete" ON event_rsvps FOR DELETE
  USING (user_id = auth.uid());

-- Trigger: keep rsvp_count in sync
CREATE OR REPLACE FUNCTION increment_event_rsvp_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE events SET rsvp_count = rsvp_count + 1 WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_event_rsvp_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE events SET rsvp_count = GREATEST(rsvp_count - 1, 0) WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_rsvp_insert AFTER INSERT ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION increment_event_rsvp_count();

CREATE TRIGGER trg_rsvp_delete AFTER DELETE ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION decrement_event_rsvp_count();

-- updated_at trigger for events
CREATE OR REPLACE FUNCTION set_event_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_event_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_event_updated_at();
```

---

## Code Architecture (Shared-First)

### Shared Code (`packages/shared/`)

**Types** (`src/types/events.ts`):

```typescript
export type EventType = 'cultural' | 'religious' | 'social' | 'career' | 'other';
export type EventStatus = 'active' | 'cancelled' | 'removed';
export type RsvpVisibility = 'public' | 'private';

export interface Event {
  id: string;
  title: string;
  description: string;
  event_type: EventType;
  start_date: string;       // ISO 8601
  end_date?: string;        // ISO 8601, optional
  location_name: string;
  location_address?: string;
  metro_area_id: string;
  is_global: boolean;
  organizer_id: string;
  photo_url?: string;
  rsvp_count: number;
  rsvp_visibility: RsvpVisibility;
  status: EventStatus;
  created_at: string;
  updated_at: string;
  organizer?: Pick<User, 'id' | 'first_name' | 'last_name' | 'trust_level' | 'profile_photo'>;
}

export interface EventRsvp {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
  user?: Pick<User, 'id' | 'first_name' | 'last_name' | 'trust_level' | 'profile_photo'>;
}
```

**Validation** (`src/validation/events.ts`):

- `createEventSchema` — validates all required fields for event creation
- `updateEventSchema` — partial schema for editing

**API Functions** (`src/api/events.ts`) — all accept `supabase: SupabaseClient` as first param:

- `getEventsByMetro(supabase, metroId, options?)` — upcoming active events for a metro + global events
- `getEventById(supabase, eventId)` — single event with organizer join
- `getEventsByOrganizer(supabase, organizerId)` — events created by a user (for profile tab)
- `getEventAttendees(supabase, eventId)` — attendee list (user info joined from event_rsvps)
- `createEvent(supabase, payload)` — insert new event
- `updateEvent(supabase, eventId, payload)` — update event (organizer only, enforced by RLS)
- `cancelEvent(supabase, eventId)` — set status = 'cancelled'
- `deleteEvent(supabase, eventId)` — set status = 'removed'
- `rsvpToEvent(supabase, eventId, userId)` — insert into event_rsvps
- `unrsvpFromEvent(supabase, eventId, userId)` — delete from event_rsvps
- `getUserRsvps(supabase, userId)` — returns array of event_ids the user has RSVP'd to

**Utils** — reuse existing `formatPublicName()` from `src/utils/user.ts` for organizer name masking

**Constants** (`src/constants/events.ts`):

- `EVENT_TYPE_LABELS` — display names for each event type
- `EVENT_TYPE_COLORS` — color tokens per type (for badge styling)

### Mobile-Specific (`apps/mobile/`)

**Screens:**

- `EventsScreen.tsx` — events list with filter chips (replaces "Coming Soon" placeholder)
- `EventDetailScreen.tsx` — full event detail
- `CreateEventScreen.tsx` — create/edit form
- `EventAttendeesSheet.tsx` — bottom sheet showing full attendee list

**Components:**

- `components/events/EventCard.tsx` — card displayed in list
- `components/events/EventTypeBadge.tsx` — colored type pill
- `components/events/RsvpButton.tsx` — RSVP toggle button
- `components/events/AttendeeAvatarStack.tsx` — up to 5 overlapping avatars + count

**Navigation:** `EventDetailScreen` and `CreateEventScreen` added to `HomeStack` (already registered events tab in nav)

### Web-Specific (`apps/web/`)

**Pages:**

- `pages/events/index.tsx` — events list (replaces "Coming Soon" page)
- `pages/events/[id].tsx` — event detail
- `pages/events/create.tsx` — create event form

**Components:**

- `components/events/EventCard.tsx`
- `components/events/EventTypeBadge.tsx`
- `components/events/RsvpButton.tsx`
- `components/events/AttendeeList.tsx`

**CSS Modules:** Each component has a corresponding `.module.css` file. No inline `style={{}}`.

---

## Success Metrics

### MVP Launch

- [ ] Events tab replaces "Coming Soon" with real content on mobile and web
- [ ] Level 1+ users can create, edit, and cancel events
- [ ] RSVP toggle works with optimistic UI (no full-page reload)
- [ ] RSVP privacy setting enforced correctly (public vs count-only)
- [ ] No PII exposed (organizer name masked, no email/phone shown)
- [ ] All shared API functions have unit tests passing
- [ ] Monorepo test suite passes (`npm run test`)

### Engagement Targets (Post-Launch)

- [ ] 10+ events posted per metro per month within 60 days of launch
- [ ] 30% of event detail viewers RSVP
- [ ] Organizers rate event creation flow 4+/5 in feedback

---

## Open Questions

- [ ] **Event photo storage bucket**: Should event photos go in the existing `post-photos` bucket or a separate `event-photos` bucket? (Recommendation: separate bucket for cleaner RLS)
- [ ] **RSVP notification**: When a new user RSVPs to an event, should the organizer receive an in-app notification? (Depends on notifications DB layer being built — see `docs/plans/active/notifications-feature.md`)
- [ ] **Event reminder push notifications**: Deferred to E6.1 in the feature breakdown. Requires Supabase Edge Function (cron) or pg_cron. Will be designed separately after push notification infrastructure is complete.
- [ ] **Attendee list cap**: Should the full attendee list modal paginate, or load all at once? (Recommendation: load all — events are unlikely to have thousands of RSVPs in MVP)

---

## Related Documentation

- [Events Feature Breakdown](./events-feature-breakdown.md) — implementation tasks, sequencing, and effort estimates
- [Product Roadmap — Section H](../roadmap.md) — roadmap context
- [Code Sharing Guide](../../guides/code-sharing.md) — shared-first architecture rules
- [Monorepo Structure](../../architecture/monorepo-structure.md) — package boundaries
- [Notifications Feature Plan](../../archive/plans/notifications-feature.md) — prerequisite for event reminders
- [Design System Foundation](../../wireframes/00-design-system-foundation/00-design-system-foundation.md) — colors, typography, spacing
