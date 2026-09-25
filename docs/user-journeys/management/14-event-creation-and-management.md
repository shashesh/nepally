# User Journey #14: Event Creation & Management

**Journey Number:** 14
**Category:** Management
**User Persona:** Verified User (Level 1+) as event organizer
**Last Updated:** 2026-03-10
**Status:** Reviewed

---

## Journey Overview

**Goal:** Create a community event, publish it to the local metro feed, and manage it over time (edit details, monitor RSVPs, cancel if needed).

**Trigger:** User taps "Create Event" button on the Events tab header, or navigates to `/events/create` on web.

**Success Criteria:** Event is published and visible in the metro events feed. Attendees can discover and RSVP to it. Organizer can edit, cancel, or delete as needed.

**Estimated Duration:** 3–5 minutes to create and publish a new event. Edit/cancel actions: under 1 minute each.

---

## Prerequisites

**Must Complete First:**

- **Journey #01: Signup and Onboarding** — account + metro area required
- **Journey #02: Trust Level Verification** — Level 1+ required to create events

---

## User Persona Details

**Name:** Binita Rai
**Age:** 35
**Background:** Community organizer and temple committee member in the San Jose metro area. She coordinates annual Nepali New Year celebrations and cultural festivals. Has been in the US for 10 years.
**Metro:** San Jose-Sunnyvale-Santa Clara (CBSA 41940)
**Trust Level:** 1 (Verified)
**Tech Savviness:** Medium
**Primary Device:** iPhone 13 (primarily mobile; uses web at work)
**Context:** It's mid-March and Binita needs to create and publish the Nepali New Year 2082 celebration event so people can RSVP in advance and know where to come.

---

## Step-by-Step Journey

### Phase 1: Starting Event Creation

#### Step 1: Tap "Create Event"

**User Action:** Opens the Events tab. Taps the "Create Event" pill button in the top-right of `EventsScreen`.
**System Response:** Navigates to `CreateEventScreen` (modal presentation on iOS — slides up from bottom).
**User Sees:**

- Modal screen: "Create Event" title in nav bar
- ✕ Cancel button (top-left), inactive "Create" button (top-right, greyed out until form is valid)
- Empty form fields below
- "Posting to: San Jose-Sunnyvale-Santa Clara" footer card (local by default)
  **Duration:** Instant

**User Thoughts:**

- "Let me fill in the event details."

**Validation/Constraints:**

- Level 0 users: "Create Event" button is hidden entirely on the Events feed
- Must be Level 1+ (enforced at UI and RLS)

---

#### Step 2: Enter Event Name

**User Action:** Taps the "Event Name" field and types "Nepali New Year Celebration (Baisakh 2082)".
**System Response:** Real-time validation via `createEventSchema.safeParse()` (debounced). Character count tracked.
**User Sees:**

- Text appears as typed
- No error shown while typing (validation on blur)
- After tapping away: green checkmark if valid (5–150 chars)
  **Duration:** ~20 seconds

**Validation/Constraints:**

- Required, 5–150 characters
- Error on blur if too short: "Event name must be at least 5 characters"

---

#### Step 3: Select Event Type

**User Action:** Taps one of the event type chip buttons — selects "Cultural".
**System Response:** "Cultural" chip fills with its color (orange background, white text from `EVENT_TYPE_COLORS`). All other chips remain outlined.
**User Sees:**

- Type chips: Cultural · Religious · Social · Career · Other
- "Cultural" chip selected (orange filled)
- Single-select — tapping another deselects the current
  **Duration:** ~5 seconds

**Validation/Constraints:**

- Required — one type must be selected

---

#### Step 4: Set Start Date & Time

**User Action:** Taps the "Start Date & Time" field. Native date/time picker opens.
**System Response:** Platform date picker (iOS: wheel picker; Android: dialog; Web: `<input type="date">` + `<input type="time">`).
**User Sees:** Date picker pre-set to tomorrow. Binita selects April 14, 2026, 5:00 PM.
**Duration:** ~15 seconds

**Validation/Constraints:**

- Required
- Must be in the future (validation: `start_date > now()`)
- Error: "Start date must be in the future"

---

#### Step 5: Set End Date & Time (Optional)

**User Action:** Taps the "End Date & Time" field. Selects April 14, 2026, 10:00 PM.
**System Response:** End date picker. Validates that end is after start.
**User Sees:** End date/time shown.
**Duration:** ~10 seconds

**Validation/Constraints:**

- Optional
- If provided: must be after `start_date`
- Error: "End date must be after start date"

---

#### Step 6: Enter Location

**User Action:** Types "San Jose Convention Center" in Location Name field. Optionally fills "150 W San Carlos St, San Jose, CA" in Location Address.
**System Response:** Text input, no autocomplete in Phase 1.
**User Sees:** Text fields filled.
**Duration:** ~20 seconds

**Validation/Constraints:**

- Location Name: required, 5–100 characters
- Location Address: optional, ≤200 characters

**Pain Points:**

- No address autocomplete (Google Maps / MapKit) — users type manually
- **Severity:** Medium

---

#### Step 7: Write Description

**User Action:** Taps the Description field and types event details — cultural program, food, dress code, ticket info (free), etc.
**System Response:** Multi-line text input. Character counter shown (e.g., "342 / 3000").
**User Sees:** Growing text area, counter updating.
**Duration:** ~60 seconds

**Validation/Constraints:**

- Required, 10–3000 characters
- Error: "Description must be at least 10 characters"

---

#### Step 8: Upload Event Photo (Optional)

**User Action:** Taps the photo upload area. Selects a photo from her camera roll.
**System Response:**

- Image picker opens (expo-image-picker on mobile; `<input type="file">` on web)
- Photo selected → `uploadEventPhoto(supabase, { file, eventId? })` called → uploads to Supabase Storage `event-photos/` bucket
- Returns `photo_url` stored with the event
  **User Sees:** Thumbnail preview of the uploaded photo with a ✕ remove button.
  **Duration:** ~20 seconds including upload

**Validation/Constraints:**

- Optional — one photo per event
- JPEG/PNG only
- Auto-compressed; max 2MB

---

#### Step 9: Set RSVP Visibility

**User Action:** Taps a radio button to choose "Public" (show attendee names) or "Count Only" (show RSVP number, no names).
**System Response:** Selected option highlighted.
**User Sees:** Two radio options: "Public — show who's going" / "Count only — show number only"
**Duration:** ~5 seconds

**Validation/Constraints:**

- Required, defaults to "Public"
- Maps to `rsvp_visibility: 'public' | 'private'` in the DB

---

#### Step 10: Toggle Global (Premium Only)

**User Action:** Binita does not have premium — the Global toggle is not shown to her.
**System Response:** Toggle only visible to `is_premium = true` users. For premium users: toggle makes event appear in all metro feeds (🌐 Global).
**User Sees (non-premium):** Footer card: "📍 Posting to: San Jose-Sunnyvale-Santa Clara" (no toggle)
**User Sees (premium):** Same footer card + "🌐 Make Global" toggle

---

### Phase 2: Submitting the Event

#### Step 11: Review and Submit

**User Action:** Binita reviews all fields. Taps the "Create" button (now active — all required fields valid).
**System Response:**

- "Create" button shows loading spinner
- Calls `createEvent(supabase, { title, description, event_type, start_date, end_date, location_name, location_address, photo_url, rsvp_visibility, is_global, organizer_id, metro_area_id })`
- On success: navigates to the new event's `EventDetailScreen`
- On failure: error toast, form remains filled
  **User Sees:** Brief loading state → transitions to the live event detail screen
  **Duration:** 1–2 seconds

**User Thoughts:**

- "Done! Let me see how it looks."

---

#### Step 12: View Published Event

**User Action:** Lands on `EventDetailScreen` for the newly created event.
**System Response:** `getEventById` loads the new event record. Shows as organizer's own event.
**User Sees:**

- Full event detail with all her info
- "You're the organizer" label replacing the RSVP button
- Three-dot menu (⋮) in the top-right header: Edit Event / Cancel Event / Delete Event
- RSVP count: 0 (newly created)
- "Message Organizer" button not shown (it's her own event)
  **Duration:** 30 seconds review

**User Thoughts:**

- "Looks great! Now I need to share this with the community."

---

### Phase 3: Managing the Event

#### Step 13: Edit Event Details

**User Action:** Taps ⋮ → "Edit Event".
**System Response:** Opens `CreateEventScreen` in edit mode — all fields pre-filled with existing event data. Nav title changes to "Edit Event". Submit button changes to "Save".
**User Sees:** Same form as creation, with all fields pre-populated. She can change any field.
**Duration:** As long as needed

**User Thoughts:**

- "I forgot to mention parking. Let me add that to the description."

After editing: Taps "Save" → calls `updateEvent(supabase, eventId, partialPayload)` → returns to event detail with updated info.

---

#### Step 14: Cancel the Event (If Needed)

**User Action:** Taps ⋮ → "Cancel Event".
**System Response:** Confirmation alert: "Cancel this event? Attendees will see it as cancelled."
**User Sees:** Alert with "Keep Event" (cancel) and "Yes, Cancel" (confirm) buttons.
**User Action:** Taps "Yes, Cancel".
**System Response:** Calls `cancelEvent(supabase, eventId)` → sets `status = 'cancelled'`. Event remains visible with a red "Cancelled" banner. RSVP button hidden for all users.
**Duration:** ~10 seconds

**User Thoughts:**

- "I had to cancel due to venue issues. At least people will know."

**Note:** Cancel ≠ Delete. Cancelled events remain visible so attendees can see the status change. Push notifications to attendees are deferred (not yet implemented).

---

#### Step 15: Delete the Event

**User Action:** Taps ⋮ → "Delete Event".
**System Response:** Confirmation alert: "Delete this event? This cannot be undone."
**User Sees:** Alert with "Keep Event" and "Delete" (destructive, red) buttons.
**User Action:** Taps "Delete".
**System Response:** Calls `deleteEvent(supabase, eventId)` → sets `status = 'removed'`. Event disappears from all feeds. Navigation pops back to `EventsScreen`.
**Duration:** ~10 seconds

---

## Success State

**What User Sees:** Event is live on the Events feed. Other users in the San Jose metro can discover it, view details, and RSVP. "You're the organizer" label visible on her own event detail.

**What User Feels:** Accomplished — the community event is announced and discoverable. Confident in the RSVP count visibility setting she chose.

**System State:**

- New row in `events` table with `status = 'active'`
- `rsvp_count = 0` (incremented by DB trigger as RSVPs come in)
- Event appears in `getEventsByMetro()` results for San Jose metro
- If `is_global = true` (premium): also appears in all other metro feeds

**Notifications Sent:**

- (Deferred) Push notification to metro area followers: "New event in your area" — not yet implemented

---

## Decision Points

```text
User taps "Create Event"
  │
  ├─> Trust Level check (UI layer)
  │     ├─> Level 0: Button hidden on Events tab → cannot access
  │     └─> Level 1+: Open CreateEventScreen
  │
  ├─> Fill required fields
  │     └─> Validate on submit (createEventSchema.safeParse())
  │           ├─> Invalid: Show inline errors → Stay on form
  │           └─> Valid: Enable "Create" button
  │
  ├─> Submit
  │     ├─> createEvent() success → navigate to EventDetailScreen
  │     └─> createEvent() failure → show error toast, stay on form
  │
  └─> Organizer actions (post-creation, from ⋮ menu)
        ├─> Edit Event → CreateEventScreen (edit mode) → updateEvent()
        ├─> Cancel Event → confirmation → cancelEvent() → status = 'cancelled'
        └─> Delete Event → confirmation → deleteEvent() → status = 'removed' → pop to feed

```

---

## Touchpoints

| Step | Touchpoint         | Channel      | Data Required          | Data Stored                    |
| ---- | ------------------ | ------------ | ---------------------- | ------------------------------ |
| 1    | Tap "Create Event" | Mobile / Web | `trust_level ≥ 1`      | None                           |
| 2–10 | Fill event form    | Mobile / Web | All event fields       | None (form state only)         |
| 8    | Upload photo       | Mobile / Web | Image file             | `event-photos/` Storage bucket |
| 11   | Submit             | Mobile / Web | Complete event payload | `events` row created           |
| 13   | Edit event         | Mobile / Web | Changed fields         | `events` row updated           |
| 14   | Cancel event       | Mobile / Web | `event_id`             | `events.status = 'cancelled'`  |
| 15   | Delete event       | Mobile / Web | `event_id`             | `events.status = 'removed'`    |

---

## Platform Considerations

### Applies To

- [x] Mobile (iOS & Android)
- [x] Web (Desktop & Mobile Web)

### Platform Differences

| Step                       | Mobile Behavior                                          | Web Behavior                                                | Notes                          |
| -------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------ |
| Entry                      | "Create Event" pill in EventsScreen header               | Same button on `/events`                                    |                                |
| Step 1 (modal)             | Modal presentation (iOS: slide-up; Android: full-screen) | Full-page route `/events/create`                            |                                |
| Step 4–5 (dates)           | Native iOS/Android date wheel picker                     | `<input type="date">` + `<input type="time">` HTML elements | Web inputs may vary by browser |
| Step 8 (photo)             | `expo-image-picker` (camera + library)                   | `<input type="file" accept="image/*">`                      | Same upload pipeline           |
| Step 9 (visibility)        | Radio-style touch controls                               | HTML radio buttons                                          |                                |
| Step 11 (submit)           | "Create" nav bar button                                  | "Create Event" form submit button                           | Same API call                  |
| Step 12 (edit mode)        | `CreateEventScreen` with `editEventId` param             | `/events/create?edit=<eventId>` query param                 | Same pre-fill logic            |
| Step 14–15 (cancel/delete) | Native `Alert.alert` confirmation                        | Web `confirm()` dialog or custom modal                      |                                |

---

## Emotions & Experience

| Phase                   | Emotion   | Confidence Level | Friction Level | Notes                                 |
| ----------------------- | --------- | ---------------- | -------------- | ------------------------------------- |
| Opening form            | Motivated | High             | Low            | Clear, familiar form pattern          |
| Event name & type       | Focused   | High             | Low            | Simple required fields                |
| Date/time               | Careful   | Medium           | Medium         | Date picker UX varies by platform     |
| Location                | Neutral   | High             | Medium         | Manual text entry, no autocomplete    |
| Description             | Creative  | High             | Low            | Open text, familiar                   |
| Photo upload            | Cautious  | Medium           | Medium         | Technical step, network dependent     |
| Submit                  | Confident | High             | Low            | One-tap once all fields valid         |
| Viewing published event | Proud     | High             | None           | Immediate gratification               |
| Editing                 | Familiar  | High             | Low            | Same form, pre-filled                 |
| Cancelling              | Reluctant | High             | Low            | Clear confirmation prevents accidents |

---

## Pain Points & Friction

### Current Pain Points

1. **Pain Point:** No address autocomplete for location fields
   - **Impact:** Medium — organizers must type full addresses manually; typos are possible
   - **Frequency:** Every event creation
   - **Affected Users:** All organizers
   - **Mitigation:** Location Address is optional; Location Name is the primary display field
   - **Solution:** Integrate Google Places Autocomplete or Apple Maps (Phase 2)

2. **Pain Point:** No attendee notification when event is cancelled
   - **Impact:** High — RSVPing attendees don't know the event was cancelled unless they check the app
   - **Frequency:** Every cancelled event
   - **Affected Users:** All users who RSVPed
   - **Mitigation:** Event is marked "Cancelled" and visible with a red banner in the feed
   - **Solution:** Push notification to all RSVPing users when `status` changes to `cancelled` — depends on full notifications infrastructure

3. **Pain Point:** Only one photo per event
   - **Impact:** Low — organizers may want to show venue, program, food, etc.
   - **Frequency:** Cultural/social events often have rich visual content
   - **Affected Users:** Active community organizers
   - **Mitigation:** Description can include text details
   - **Solution:** Expand to 3 photos (matching post photo limit) in a future iteration

4. **Pain Point:** No event capacity / waitlist support
   - **Impact:** Medium — popular events may get over-RSVPed
   - **Frequency:** Occasional for high-demand events
   - **Affected Users:** Organizers of capacity-constrained venues
   - **Mitigation:** Organizer can include capacity info in description text
   - **Solution:** Add optional max_attendees field + waitlist (Phase 2)

5. **Pain Point:** No "draft" / save for later
   - **Impact:** Low — if user navigates away mid-form, all data is lost
   - **Frequency:** On accidental navigation away
   - **Affected Users:** Organizers filling long descriptions
   - **Mitigation:** "Cancel with dirty form → Discard confirmation" prevents accidental exits
   - **Solution:** Auto-save draft to AsyncStorage / localStorage

---

## Success Metrics

- [ ] **Time to Publish:** < 5 minutes from tapping "Create Event" to event live for 80% of organizers
- [ ] **Form Completion Rate:** > 75% of users who open CreateEventScreen successfully publish an event
- [ ] **Edit Rate:** < 30% of events are edited after creation (indicator of form clarity)
- [ ] **Cancellation Rate:** < 10% of events are cancelled (indicator of organizer commitment)
- [ ] **RSVP Velocity:** Average event receives first RSVP within 2 hours of publication
- [ ] **Organizer Return Rate:** > 50% of organizers create a second event within 60 days

---

## Alternative Paths

### Path 1: Discard During Creation

**Trigger:** Binita taps ✕ Cancel mid-form with fields filled ("dirty form").
**How Journey Changes:** Confirmation alert: "Discard Event? Your changes will be lost." → "Keep Editing" or "Discard". Tapping Discard closes the modal with no event created.
**Outcome:** No event created. User returns to Events feed.

### Path 2: Validation Errors on Submit

**Trigger:** Binita taps "Create" with one or more fields invalid (e.g., description too short).
**How Journey Changes:** Inline error messages appear below each invalid field. "Create" button may have been active (client-side schema check lags), but `createEventSchema.safeParse()` catches errors on submit. User corrects errors and resubmits.
**Outcome:** Event created after correction.

### Path 3: Premium — Create Global Event

**Trigger:** Binita upgrades to premium and creates an event for a national Nepali diaspora summit visible in all metros.
**How Journey Changes:** Step 10 — "🌐 Make Global" toggle is visible and she enables it. Footer card changes to "🌐 Posting Globally". `is_global = true` stored.
**Outcome:** Event appears in all metro event feeds, not just San Jose.

### Path 4: Edit Mode (Returning Organizer)

**Trigger:** Binita wants to update the event description after noticing a typo.
**How Journey Changes:** From `EventDetailScreen` ⋮ menu → "Edit Event" → `CreateEventScreen` pre-filled → changes description → taps "Save" → `updateEvent()` → returns to detail.
**Outcome:** Event detail updated. All existing RSVPs remain intact.

### Path 5: Web-First Organizer

**Trigger:** Binita creates the event on her laptop at work via the web app.
**How Journey Changes:** Navigates to `/events/create`. Same fields, but uses HTML date/time inputs. Photo upload via file input. Submits → redirected to `/events/[id]` detail page.
**Outcome:** Identical result — event published to the same feed accessible on both mobile and web.

---

## Error & Edge Cases

| Scenario                                                | Expected Behavior                                               | Recovery Path                           | User Message                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| Photo upload fails                                      | Error toast; event creation can continue without photo          | Retry upload or skip                    | "Photo upload failed. You can add one later by editing the event." |
| Network error on submit                                 | Error toast; form remains filled                                | User retries submit                     | "Couldn't create event. Check your connection and try again."      |
| Session timeout mid-form                                | Auth context attempts silent refresh                            | Re-authenticate; form state may be lost | Standard auth error handling                                       |
| Start date set in the past                              | Inline validation error on blur                                 | User corrects date                      | "Start date must be in the future."                                |
| End date before start date                              | Inline validation error                                         | User corrects end date                  | "End date must be after start date."                               |
| Duplicate event (same organizer, same title, same date) | No duplicate detection in Phase 1 — event is created regardless | N/A — organizer can delete duplicate    | N/A                                                                |
| Organizer account banned mid-event                      | Event status remains; RLS prevents further organizer actions    | Moderation handles                      | N/A (admin action)                                                 |

---

## Related Journeys

### Before This Journey (Prerequisites)

- **Journey #01: Signup and Onboarding** — account + metro area required
- **Journey #02: Trust Level Verification** — Level 1+ required

### After This Journey (Next Steps)

- **Journey #09: In-App Chat** — attendees may message the organizer with questions
- **Journey #13: Event Discovery & RSVP** — the attendee perspective of this same event

### Related/Parallel Journeys

- **Journey #13: Event Discovery & RSVP** — what attendees experience after this journey
- **Journey #03: Post Creation** — analogous creation flow for community posts

---

## Visual Flow Diagram

```text
┌─────────────────────────────┐
│    Events Tab               │
│    Tap "Create Event" btn   │
│    (Level 1+ only)          │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│   CreateEventScreen         │
│   (modal / /events/create)  │
│                             │
│   [Event Name]              │
│   [Type chips: Cultural...] │
│   [Start Date + Time]       │
│   [End Date + Time] (opt.)  │
│   [Location Name]           │
│   [Location Address] (opt.) │
│   [Description]             │
│   [Photo] (opt.)            │
│   [RSVP Visibility]         │
│   [🌐 Global] (premium)     │
│                             │
│   Footer: "Posting to: [X]" │
└─────────────┬───────────────┘
              │
     ┌────────┴────────┐
     │                 │
     ▼                 ▼
┌──────────┐     ┌───────────────┐
│ Discard  │     │ Validate all  │
│ (✕ +    │     │ required      │
│  confirm)│     │ fields        │
└──────────┘     └───────┬───────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
        ┌──────────┐        ┌───────────────┐
        │ Invalid  │        │ Valid → Create │
        │ Show     │        │ button active  │
        │ errors   │        └───────┬───────┘
        └──────────┘                │
                                    ▼
                          ┌─────────────────┐
                          │ createEvent()   │
                          └───────┬─────────┘
                                  │
                       ┌──────────┴──────────┐
                       │                     │
                       ▼                     ▼
               ┌────────────┐      ┌─────────────────┐
               │  Success   │      │  Failure        │
               │ Navigate   │      │  Error toast    │
               │ EventDetail│      │  Stay on form   │
               └─────┬──────┘      └─────────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │  EventDetailScreen       │
          │  "You're the organizer"  │
          │  ⋮ Kebab menu            │
          ├──────────────────────────┤
          │ Edit → updateEvent()     │
          │ Cancel → status=cancelled│
          │ Delete → status=removed  │
          └──────────────────────────┘
```

---

## Technical Requirements

### Shared API Functions Used

All in `packages/shared/src/api/events.ts` + `storage.ts`:

- `createEvent(supabase, payload)` — create new event
- `updateEvent(supabase, eventId, payload)` — edit event fields
- `cancelEvent(supabase, eventId)` — set `status = 'cancelled'`
- `deleteEvent(supabase, eventId)` — set `status = 'removed'`
- `uploadEventPhoto(supabase, { file })` — upload to `event-photos/` Storage bucket, returns `photo_url`

### Shared Validation Used

`packages/shared/src/validation/events.ts`:

- `createEventSchema` — validates all required + optional fields
- `updateEventSchema` — partial version of `createEventSchema`

### Data Validations (from `createEventSchema`)

| Field              | Required | Constraints                                        |
| ------------------ | -------- | -------------------------------------------------- |
| `title`            | Yes      | 5–150 chars                                        |
| `event_type`       | Yes      | One of: cultural, religious, social, career, other |
| `start_date`       | Yes      | Future datetime                                    |
| `end_date`         | No       | Must be after `start_date` if provided             |
| `location_name`    | Yes      | 5–100 chars                                        |
| `location_address` | No       | ≤200 chars                                         |
| `description`      | Yes      | 10–3000 chars                                      |
| `photo_url`        | No       | URL string (set after upload)                      |
| `rsvp_visibility`  | Yes      | `'public'` or `'private'` (default: `'public'`)    |
| `is_global`        | Yes      | Boolean (default: `false`; premium gate in UI)     |

### Permissions Required

- Trust Level 1+ (enforced at UI + RLS INSERT policy on `events` table)
- Photo library / camera permission for photo upload (mobile only)
- Premium `is_premium = true` for global toggle (UI gate only — RLS does not enforce)

---

## Questions & Assumptions

### Assumptions

- Event creation flow is identical on mobile and web except for date picker and modal presentation
- `organizer_id` and `metro_area_id` are set automatically from `useAuth()` and `LocationContext` — not shown as form fields
- The "Create Event" button on the Events tab is the only entry point for new events (no FAB, no deep link)
- Edit mode reuses `CreateEventScreen` with all fields pre-filled from `getEventById()`
- Deleting an event sets `status = 'removed'` (soft delete) — the record remains in the DB for audit purposes

### Open Questions

- [ ] Should organizers be able to set a maximum attendee count (capacity)? Not in scope for Phase 1 but common need.
- [ ] Should the `event-photos/` Storage bucket require a separate migration entry, or is it added to `003_storage.sql`? (Current: created on demand — needs pre-provisioning)
- [ ] When organizer cancels, should attendees receive push notifications automatically? (Currently deferred to notifications infrastructure)
- [ ] Should there be a "recurring events" option (e.g., weekly community prayers)? Deferred from Phase 1.
- [ ] Can a co-organizer be designated to also have edit/cancel/delete rights? Not in Phase 1 scope.
