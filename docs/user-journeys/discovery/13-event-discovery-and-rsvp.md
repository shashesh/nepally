# User Journey #13: Event Discovery & RSVP

**Journey Number:** 13
**Category:** Discovery
**User Persona:** Any User (Level 0 can view; Level 1+ can RSVP)
**Last Updated:** 2026-03-10
**Status:** Reviewed

---

## Journey Overview

**Goal:** Find a local community event and RSVP to attend it.

**Trigger:** User taps the Events tab in the bottom nav (mobile) or clicks "Events" in the sidebar (web), or sees an event card shared by someone.

**Success Criteria:** User has found a relevant upcoming event and their RSVP is confirmed — they appear in the attendee list and the event is on their radar.

**Estimated Duration:** 1–3 minutes from opening the Events tab to completing an RSVP.

---

## Prerequisites

**Must Complete First:**
- **Journey #01: Signup and Onboarding** — must have an account and metro area set

**For RSVP (not browse-only):**
- **Journey #02: Trust Level Verification** — must be Level 1+ to RSVP

---

## User Persona Details

**Name:** Priya Shrestha
**Age:** 24
**Background:** Recent college graduate working her first job in the Bay Area. Moved from Nepal 2 years ago and misses the cultural community. Wants to meet other Nepalis and attend Nepali New Year celebrations.
**Metro:** San Jose-Sunnyvale-Santa Clara (CBSA 41940)
**Trust Level:** 1 (Verified — phone confirmed)
**Tech Savviness:** High
**Primary Device:** iPhone 15 (mobile-first user, occasional web)
**Context:** It's early April and Priya wants to find Nepali New Year (Baisakh) events happening in her area.

---

## Step-by-Step Journey

### Phase 1: Opening the Events Feed

#### Step 1: Tap the Events Tab
**User Action:** Priya taps the calendar icon (Events tab, second position in the bottom nav) on the home screen.
**System Response:** Navigates to `EventsScreen`. Calls `getEventsByMetro(supabase, metroId)` + `getUserRsvps(supabase, userId)` on mount to hydrate RSVP state.
**User Sees:**
- Header: "📅 Events · San Jose-Sunnyvale-Santa Clara"
- Horizontal scrollable filter chips: **All** · Cultural · Religious · Social · Career · Other
- "All" chip selected by default (highlighted)
- Loading skeleton: 3 placeholder event cards
- "Create Event" pill button top-right (visible to Level 1+)
**Duration:** < 1 second to navigate; 1–2 seconds to load events

**User Thoughts:**
- "Let me see what's happening locally."

**Pain Points:**
- No search bar — users can't keyword-search events (e.g., "Baisakh")
- **Severity:** Medium

---

#### Step 2: Browse the Events Feed
**User Action:** Scrolls through the chronological event list.
**System Response:** Events displayed in ascending date order (soonest first). Past events appear in a "Past Events" section below with muted styling.
**User Sees:**
Each **EventCard** shows:
- Event photo thumbnail (140px height, cover crop) or type-colored illustration fallback
- **EventTypeBadge** pill (e.g., 🎭 Cultural — orange)
- 📍 Local / 🌐 Global scope badge
- Event title (2-line max, ellipsized)
- Date + time (e.g., "Sat, Apr 14 · 5:00 PM")
- Location name (e.g., "San Jose Convention Center")
- Organizer: avatar + masked name ("Binita S.") + trust badge
- RSVP count (e.g., "42 going")
- RSVP button state: "RSVP" (not going) or "Going ✓" (already going)
**Duration:** 30–60 seconds browsing

**User Thoughts:**
- "There are quite a few events. Let me filter for cultural events."

---

#### Step 3: Filter by Event Type
**User Action:** Taps the "Cultural" filter chip.
**System Response:** Client-side filter applied immediately (no network request — data already loaded). List narrows to events with `event_type = 'cultural'`.
**User Sees:**
- "Cultural" chip highlighted, "All" deselected
- List updates instantly to show only Cultural events
- Chips are single-select (tapping a new one replaces the current filter; tapping "All" resets)
**Duration:** Instant (< 100ms)

**User Thoughts:**
- "Better! I can see the Nepali New Year event."

**Pain Points:**
- "More ▼" bottom sheet not implemented yet for Social + Other on mobile — all chips visible in one horizontal scroll
- **Severity:** Low

---

### Phase 2: Viewing Event Detail

#### Step 4: Tap an Event Card
**User Action:** Priya taps the "Nepali New Year Celebration (Baisakh 2082)" event card.
**System Response:** Navigates to `EventDetailScreen` with `{ eventId }`. Calls `getEventById(supabase, eventId)` + `getEventAttendees(supabase, eventId)`.
**User Sees:**
- Hero image (220px height, cover) or cultural-type illustration fallback
- **EventTypeBadge** (🎭 Cultural) + 📍 Local scope badge in a row
- Title: "Nepali New Year Celebration (Baisakh 2082)"
- Date/time: "Saturday, April 14, 2026 · 5:00 PM – 10:00 PM"
- Location: "San Jose Convention Center · 150 W San Carlos St"
- Full description (scrollable, not truncated)
- **Organizer section:** Binita S.'s avatar + masked name + trust badge + "Message Organizer" button (Level 1+)
- **Attendance section:** avatar stack (up to 5 overlapping) + "42 people going" + "View all attendees" button
- Large **RSVP button** at the bottom: "RSVP — I'm Going" (blue, prominent)
**Duration:** ~30 seconds reading

**User Thoughts:**
- "This looks perfect! Saturday evening, near downtown, 42 people going — this is legit."
- "I recognize the organizer's trust badge — good sign."

---

#### Step 5: View Attendee List (Optional)
**User Action:** Taps "View all attendees" link.
**System Response:** Opens bottom sheet (mobile) / modal dialog (web) with full attendee list. Calls `getEventAttendees(supabase, eventId)` (already loaded, cached).
**User Sees:**
- List of attendees: avatar + masked name ("Sanjay T.", "Asha K.", etc.) + trust badge per row
- If organizer set `rsvp_visibility = 'private'`: shows only "42 people going" count, no names/avatars
**Duration:** 10 seconds

**User Thoughts:**
- "I see some familiar names. This is a real community event."

---

### Phase 3: RSVP

#### Step 6: Tap the RSVP Button
**User Action:** Taps the "RSVP — I'm Going" button at the bottom of the event detail screen.
**System Response:**
- **Optimistic UI:** Button immediately changes to "Going ✓" (green, filled) without waiting for network
- RSVP count increments by 1 in the UI (e.g., "42 going" → "43 going")
- Calls `rsvpToEvent(supabase, eventId, userId)` in the background — inserts a row into `event_rsvps`
- If the API call fails: button reverts to "RSVP — I'm Going" with a brief toast/error
**User Sees:**
- Button state: green "Going ✓"
- Updated RSVP count
- Their avatar appears in the attendee stack (on next load)
**Duration:** Instant (< 100ms for optimistic update)

**User Thoughts:**
- "Done! I'm going."

**Validation/Constraints:**
- Level 0: Button shows "Verify to RSVP" — disabled, tapping shows verification prompt
- Organizer cannot RSVP to their own event — button replaced with "You're the organizer"
- Cancelled event: RSVP button hidden entirely
- Past event: Button shows "Event Has Passed" (disabled, grey)

---

#### Step 7: Cancel RSVP (Optional)
**User Action:** If Priya changes her mind, she taps "Going ✓" button again.
**System Response:**
- Optimistic UI: button reverts to "RSVP — I'm Going"
- RSVP count decrements by 1
- Calls `unrsvpFromEvent(supabase, eventId, userId)` — deletes the `event_rsvps` row
**User Sees:** Button back to blue "RSVP — I'm Going"
**Duration:** Instant

---

### Phase 4: Post-RSVP

#### Step 8: Navigate Back to Feed
**User Action:** Taps back arrow to return to `EventsScreen`.
**System Response:** `getUserRsvps` state already reflects the new RSVP — Priya's event card shows "Going ✓" button in the list.
**User Sees:**
- Event card in the list now shows "Going ✓" (green) button
- No other changes
**Duration:** Instant

---

## Success State

**What User Sees:** Event card in the feed shows "Going ✓". Event detail shows updated count and Priya's avatar in the attendee stack (on next load).

**What User Feels:** Connected — she's committed to attending and knows others are going. Excited to meet community members.

**System State:**
- New row in `event_rsvps`: `{ event_id, user_id, created_at }`
- `events.rsvp_count` incremented by 1 (via DB trigger)
- Priya's avatar appears in attendee list if `rsvp_visibility = 'public'`

**Notifications Sent:**
- (Deferred) Push notification to event organizer: "Priya S. is going to your event" — not yet implemented
- (Deferred) Push reminder to Priya 24h before the event — not yet implemented

---

## Decision Points

```
User opens Events tab
  │
  ├─> Metro area check
  │     ├─> No metro set: prompt to complete onboarding → Exit
  │     └─> Metro set: load events feed
  │
  ├─> Browse / filter events (client-side, no refetch)
  │
  ├─> Tap event card → EventDetailScreen
  │
  └─> Tap RSVP button
        ├─> Level 0: Show "Verify to RSVP" prompt → Exit
        ├─> Own event: "You're the organizer" (no RSVP) → Exit
        ├─> Cancelled: RSVP button hidden → Exit
        ├─> Past event: "Event Has Passed" (disabled) → Exit
        └─> Level 1+: Optimistic RSVP → rsvpToEvent()
              ├─> Success: Keep "Going ✓" state
              └─> Failure: Revert to "RSVP" + show error
```

---

## Touchpoints

| Step | Touchpoint | Channel | Data Required | Data Stored |
|------|------------|---------|---------------|-------------|
| 1 | Open Events tab | Mobile / Web | `metro_area_id` | None |
| 2 | Browse feed | Mobile / Web | None | None |
| 3 | Filter by type | Mobile / Web | `event_type` filter | None (client-side) |
| 4 | Open event detail | Mobile / Web | `event_id` | None |
| 5 | View attendees | Mobile / Web | `event_id` | None |
| 6 | RSVP | Mobile / Web | `event_id`, `user_id` | `event_rsvps` row, `events.rsvp_count` |
| 7 | Cancel RSVP | Mobile / Web | `event_id`, `user_id` | Delete `event_rsvps` row, decrement `rsvp_count` |

---

## Platform Considerations

### Applies To
- [x] Mobile (iOS & Android)
- [x] Web (Desktop & Mobile Web)

### Platform Differences

| Step | Mobile Behavior | Web Behavior | Notes |
|------|----------------|--------------|-------|
| Step 1 (entry) | Events tab in bottom nav (2nd icon) | "Events" link in sidebar nav | Same API call |
| Step 2 (browse) | Vertical `FlatList` of `EventCard` | Vertical feed on right, sidebar filters on left (≥1024px) | Web uses radio buttons for filter sidebar |
| Step 3 (filter) | Horizontal scrollable chip bar (single-select) | Sidebar radio filter group (All, Cultural, Religious, Social, Career, Other) | Same client-side filter logic |
| Step 4 (detail) | `EventDetailScreen` full-screen | `/events/[id]` two-column layout on desktop | Same data, different layout |
| Step 5 (attendees) | Bottom sheet | Modal dialog | |
| Step 6 (RSVP) | Full-width blue button at bottom | Button in right-column action panel | Same `rsvpToEvent` shared API |

---

## Emotions & Experience

| Phase | Emotion | Confidence Level | Friction Level | Notes |
|-------|---------|------------------|----------------|-------|
| Opening feed | Curious | Medium | Low | Clear tab, fast load |
| Browsing | Engaged | Medium | Low | Visual cards are scannable |
| Filtering | Focused | High | Low | Instant client-side filter |
| Reading detail | Interested | High | Low | Full info available |
| Viewing attendees | Reassured | High | None | Social proof |
| RSVP tap | Decisive | High | None | One tap, instant feedback |
| Post-RSVP | Excited | High | None | Clear confirmation state |

---

## Pain Points & Friction

### Current Pain Points

1. **Pain Point:** No keyword search for events (e.g., can't search "Baisakh" or "New Year")
   - **Impact:** Medium — users have to scroll to find specific events
   - **Frequency:** Common for users looking for themed events
   - **Affected Users:** All users browsing events
   - **Mitigation:** Type filter chips help narrow by category
   - **Solution:** Add event search (Phase 2 consideration)

2. **Pain Point:** No push notification reminders before the event
   - **Impact:** High — users RSVP but may forget the event without a reminder
   - **Frequency:** Every RSVP'd event
   - **Affected Users:** All users who RSVP
   - **Mitigation:** None currently
   - **Solution:** Deploy push notification edge function with event reminder scheduling (see `docs/implementation-plans/notifications-feature.md`)

3. **Pain Point:** No "My Events" / saved events list in the profile
   - **Impact:** Medium — no way to easily find all events you've RSVP'd to
   - **Frequency:** Every return visit
   - **Affected Users:** Active attendees
   - **Mitigation:** Users can find their events by browsing the feed with "Going ✓" state visible
   - **Solution:** Add "Events" tab to profile (deferred from initial implementation)

4. **Pain Point:** No calendar export or "Add to Calendar" action
   - **Impact:** Medium — RSVP doesn't integrate with user's device calendar
   - **Frequency:** Every RSVP
   - **Affected Users:** All users who RSVP
   - **Mitigation:** Date/time clearly shown in event detail
   - **Solution:** Phase 2 — native calendar integration via `expo-calendar` (mobile) / ics file download (web)

---

## Success Metrics

- [ ] **Time to RSVP:** < 90 seconds from opening Events tab to completing RSVP for 80% of users
- [ ] **RSVP Conversion Rate:** > 30% of users who open an event detail tap RSVP
- [ ] **Filter Usage Rate:** > 40% of events tab sessions use at least one type filter
- [ ] **Return Rate:** > 50% of RSVPing users return to the app within 24h of the event date
- [ ] **RSVP Cancellation Rate:** < 15% of RSVPs are cancelled

---

## Alternative Paths

### Path 1: Level 0 User Browsing Events
**Trigger:** A new, unverified user opens the Events tab.
**How Journey Changes:** Steps 1–5 are identical (full view access). Step 6 — RSVP button shows "Verify to RSVP" (disabled). Tapping it shows a prompt directing them to complete phone verification.
**Outcome:** User is encouraged to verify their account to unlock RSVP. Browsing is unrestricted.

### Path 2: Viewing a Cancelled Event
**Trigger:** User taps on an event that has since been cancelled by the organizer.
**How Journey Changes:** `EventDetailScreen` shows a red "This event has been cancelled" banner at the top. RSVP button is hidden. All other info remains visible.
**Outcome:** User is informed the event is cancelled and navigates back.

### Path 3: Viewing a Past Event
**Trigger:** User taps on an event whose `start_date` has passed.
**How Journey Changes:** Event detail shows a grey info banner: "This event has ended." RSVP button shows "Event Has Passed" (disabled, grey).
**Outcome:** User can still view the event info and attendee list.

### Path 4: Private Attendee List
**Trigger:** Organizer set `rsvp_visibility = 'private'`.
**How Journey Changes:** "View all attendees" button still appears, but the modal/sheet shows only the RSVP count ("42 people going") with no names or avatars.
**Outcome:** User knows how many people are going but cannot see who.

### Path 5: Global Event Discovery
**Trigger:** A premium user posted a global event — it appears in all metro feeds.
**How Journey Changes:** Event card shows 🌐 Global badge instead of 📍 Local. Otherwise identical flow.
**Outcome:** User RSVPs to an event outside their metro area (possible if they're travelling or interested in a national event).

---

## Error & Edge Cases

| Scenario | Expected Behavior | Recovery Path | User Message |
|----------|------------------|---------------|--------------|
| No events in metro area | Empty state with illustration and "No upcoming events" | "Be the first to create one!" CTA | N/A |
| No events matching filter | Empty state: "No [Cultural] events right now" | "Clear filter" link | N/A |
| RSVP API call fails | Optimistic update reverts to original state | User can retry by tapping RSVP again | Brief error toast |
| Network error on load | Error state with retry button | Tap "Try Again" | "Couldn't load events. Check your connection." |
| Event deleted after user opens detail | `getEventById` returns error | Navigate back to feed | "This event is no longer available." |
| Already RSVP'd (duplicate attempt) | DB unique constraint prevents duplicate | No action needed — UI already shows "Going ✓" | N/A (idempotent) |
| Session timeout mid-journey | Auth context refreshes; if fails, redirects to login | Re-authenticate → return to events | Standard auth error |

---

## Related Journeys

### Before This Journey (Prerequisites)
- **Journey #01: Signup and Onboarding** — account + metro area required
- **Journey #02: Trust Level Verification** — Level 1+ required to RSVP

### After This Journey (Next Steps)
- **Journey #09: In-App Chat** — user may message the event organizer for more details
- **Journey #14: Event Creation & Management** — user enjoyed attending and wants to host their own event

### Related/Parallel Journeys
- **Journey #07: Browse and Search Posts** — same discovery pattern applied to posts
- **Journey #14: Event Creation & Management** — the organizer's perspective for the same event

---

## Visual Flow Diagram

```
┌─────────────────────────┐
│     Events Tab          │
│  (bottom nav / sidebar) │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   EventsScreen          │
│   • Type filter chips   │
│   • Chronological list  │
│   • "Going ✓" states    │
│     hydrated on load    │
└────────────┬────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌──────────┐   ┌──────────────┐
│  Browse  │   │  Filter by   │
│  (All)   │   │  Type Chip   │
│          │   │  (instant)   │
└────┬─────┘   └──────┬───────┘
     └────────┬────────┘
              │
              ▼
┌─────────────────────────┐
│   EventDetailScreen     │
│   • Hero image          │
│   • Type + scope badge  │
│   • Date, location,     │
│     description         │
│   • Organizer section   │
│   • Attendee stack      │
│   • RSVP button         │
└────────────┬────────────┘
             │
     ┌───────┴────────────────────┐
     │                            │
     ▼                            ▼
┌──────────────┐         ┌─────────────────┐
│ View         │         │ RSVP Button     │
│ Attendees    │         │ Trust check     │
│ (bottom      │         ├─────────────────┤
│  sheet/modal)│         │ L0 → "Verify"   │
└──────────────┘         │ Own → organizer │
                         │ Cancelled → N/A │
                         │ Past → disabled │
                         │ L1+ → RSVP ✓   │
                         └────────┬────────┘
                                  │
                      ┌───────────┴───────────┐
                      │                       │
                      ▼                       ▼
               ┌────────────┐        ┌─────────────────┐
               │ API Success│        │ API Failure      │
               │ "Going ✓"  │        │ Revert + toast   │
               │ count +1   │        └─────────────────┘
               └────────────┘
```

---

## Technical Requirements

### Shared API Functions Used
All in `packages/shared/src/api/events.ts`:
- `getEventsByMetro(supabase, metroId, options?)` — load events feed (upcoming + global)
- `getEventById(supabase, eventId)` — single event with organizer join
- `getEventAttendees(supabase, eventId)` — attendee list with user info
- `getUserRsvps(supabase, userId)` → `string[]` — pre-hydrate RSVP state on feed load
- `hasUserRsvp(supabase, eventId, userId)` → `boolean` — for detail screen
- `rsvpToEvent(supabase, eventId, userId)` — insert into `event_rsvps`
- `unrsvpFromEvent(supabase, eventId, userId)` — delete from `event_rsvps`

### Data Validations
- Trust Level 1+ to RSVP (enforced at UI + RLS layer)
- Cannot RSVP to own event (enforced at UI layer)
- Cannot RSVP to cancelled/removed event (enforced at UI layer)
- Unique RSVP per user per event (enforced by DB unique constraint)

### Permissions Required
- No special device permissions needed for browse + RSVP
- Photo library permission only needed for event creation (not this journey)

---

## Questions & Assumptions

### Assumptions
- Events are loaded once on mount and filtered client-side (no refetch per chip tap)
- RSVP state is hydrated on `EventsScreen` mount via `getUserRsvps()` for all visible events
- `rsvp_count` in the UI is sourced from `events.rsvp_count` (DB trigger-maintained), not a live count query
- Attendee list pagination not needed for MVP (events unlikely to have thousands of RSVPs)

### Open Questions
- [ ] Should cancelled events be shown in the feed (with a "Cancelled" badge) or hidden entirely? Currently shown with badge.
- [ ] Should past events always be shown below a divider, or should they be hidden by default with a "Show Past Events" toggle?
- [ ] When push notifications are live, should RSVPing users get a reminder 24h before? 1h before? Both?
- [ ] Should the organizer receive a push notification for each new RSVP, or only a daily digest?
- [ ] Is there a maximum capacity/waitlist concept for events, or open RSVP for all?
