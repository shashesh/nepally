# Wireframe: Create Event

> **Screen:** 16 | **Status:** Draft | **Updated:** 2026-03-05
> **Feature Spec:** [Events Feature](../../product/features/events.md)
> **Feature Breakdown:** [Events Breakdown — E4.1](../../product/features/events-feature-breakdown.md)
> **Story:** As a verified (Level 1+) user, I want to create a community event so others in my metro area can discover and RSVP to it.

---

## Screen Purpose

A scrollable form for creating a new community event. Users fill in event details, pick a type, set dates/times, add an optional photo, and configure RSVP visibility. Premium users can toggle global visibility. The form validates inline and enables the submit button only when all required fields are valid.

**Key Goals:**
- Fast, guided event creation (< 2 minutes for a typical event)
- Mandatory type selection for feed filtering
- Optional photo and address for richer event pages
- RSVP privacy control by organizer
- Premium global toggle for cross-metro reach

---

## Visual Wireframe

### State 1: Standard User (Level 1+) — Empty Form

[[ ✕ Cancel | Create Event | [Create]{state:disabled} ]]

::: card
**Event Name** *(required)*
[e.g. Dashain Celebration 2026___]{required maxlength:150}

*5–150 characters*
:::

::: card
**Event Type** *(required)*

[🟠 Cultural]{.outline}  [🟣 Religious]{.outline}  [🟢 Social]{.outline}  [🔵 Career]{.outline}  [⚪ Other]{.outline}
:::

::: card
**Start Date & Time** *(required)*
[___]{type:date required}  [___]{type:time required}

**End Date & Time** *(optional)*
[___]{type:date}  [___]{type:time}
:::

::: card
**Location Name** *(required)*
[e.g. Dallas Convention Center___]{required maxlength:100}

**Location Address** *(optional)*
[e.g. 650 S Griffin St, Dallas, TX 75202___]{maxlength:200}
:::

::: card
**Description** *(required)*
[Describe your event — what to expect, dress code, parking info...]{rows:6 required maxlength:3000}

*10–3000 characters · 0/3000*
:::

::: card
📷 [Add Event Photo (optional)]

*Max 2MB · Compressed automatically*
:::

::: card
**RSVP Visibility**

- (*) Public — anyone can see who's going
- ( ) Private — only you see the attendee list
:::

::: card {bg:#F5F5F5}
📍 Posting to: **Dallas-Fort Worth**
:::

---

### State 2: Premium User — Global Toggle Visible

[[ ✕ Cancel | Create Event | [Create]{state:disabled} ]]

::: card
**Event Name** *(required)*
[e.g. Dashain Celebration 2026___]{required maxlength:150}
:::

::: card
**Event Type** *(required)*

[🟠 Cultural]{.outline}  [🟣 Religious]{.outline}  [🟢 Social]{.outline}  [🔵 Career]{.outline}  [⚪ Other]{.outline}
:::

::: card
**Start Date & Time** *(required)*
[___]{type:date required}  [___]{type:time required}

**End Date & Time** *(optional)*
[___]{type:date}  [___]{type:time}
:::

::: card
**Location Name** *(required)*
[e.g. Dallas Convention Center___]{required maxlength:100}

**Location Address** *(optional)*
[e.g. 650 S Griffin St, Dallas, TX 75202___]{maxlength:200}
:::

::: card
**Description** *(required)*
[Describe your event — what to expect, dress code, parking info...]{rows:6 required maxlength:3000}

*10–3000 characters · 0/3000*
:::

::: card
📷 [Add Event Photo (optional)]
:::

::: card
**RSVP Visibility**

- (*) Public — anyone can see who's going
- ( ) Private — only you see the attendee list
:::

::: card
🌐 **Make Global (Premium)**

[ ] Visible in all metro feeds — not just Dallas-Fort Worth

*Your premium plan includes global event posting.*
:::

::: card {bg:#F5F5F5}
📍 Posting to: **Dallas-Fort Worth** · 🌐 Global OFF
:::

---

### State 3: Form Filled & Valid — Submit Enabled

[[ ✕ Cancel | Create Event | [Create]* ]]

::: card
**Event Name**
[Dashain Celebration 2026___]{maxlength:150}

*Dashain Celebration 2026 — 24 characters*
:::

::: card
**Event Type**

[🟠 Cultural]*  [🟣 Religious]{.outline}  [🟢 Social]{.outline}  [🔵 Career]{.outline}  [⚪ Other]{.outline}
:::

::: card
**Start Date & Time** *(required)*
[2026-10-03]{type:date}  [6:00 PM]{type:time}

**End Date & Time** *(optional)*
[2026-10-03]{type:date}  [10:00 PM]{type:time}
:::

::: card
**Location Name**
[Nepal Cultural Center___]{maxlength:100}

**Location Address**
[1234 Community Blvd, Dallas, TX 75201___]{maxlength:200}
:::

::: card
**Description**
[Join us for the biggest Nepali festival of the year! Expect traditional music, food stalls, cultural performances and more. Parking available in Lot B.]{rows:6 maxlength:3000}

*242/3000*
:::

::: card
**Photo Preview**

[████████████████████]
*event-photo.jpg · 1.2MB*  [✕ Remove]
:::

::: card
**RSVP Visibility**

- (*) Public — anyone can see who's going
- ( ) Private — only you see the attendee list
:::

::: card {bg:#F5F5F5}
📍 Posting to: **Dallas-Fort Worth**
:::

---

### State 4: Inline Validation Errors

[[ ✕ Cancel | Create Event | [Create]{state:disabled} ]]

::: alert error
:warning: **Please fix the errors below before submitting.**
:::

::: card
**Event Name** *(required)*
[Da___]{state:error required}

*Must be at least 5 characters.*
:::

::: card
**Start Date & Time** *(required)*
[2026-01-01]{type:date state:error}  [6:00 PM]{type:time}

*Start date must be in the future.*

**End Date & Time** *(optional)*
[2026-01-01]{type:date state:error}  [5:00 PM]{type:time}

*End date must be after start date.*
:::

---

### State 5: Photo Upload In Progress

::: card
📷 **Uploading photo...**

[########__________]

*Compressing and uploading — please wait*
:::

---

### State 6: Submitting

[[ ✕ Cancel | Create Event | [Creating...]{:loading :disabled} ]]

::: alert info
:rocket: **Publishing your event...**
:::

---

### State 7: Level 0 Access Blocked

::: modal
## Verify Your Account

You need to verify your account to create events.

Verifying your account takes less than 5 minutes and unlocks full posting rights.

[Not Now]{.outline}  [Verify Account]*
:::

---

## Component Specifications

### 1. Navigation Bar

| Property | iOS | Android | Web |
|----------|-----|---------|-----|
| **Type** | Modal sheet nav bar | AppBar | Sticky top bar |
| **Left** | ✕ Cancel (text button) | ✕ Cancel | ✕ Cancel |
| **Center** | "Create Event" title | "Create Event" title | "Create Event" title |
| **Right** | "Create" button (disabled until valid) | "Create" button | "Create" button |
| **Height** | 44px + safe area | 56dp | 56px |
| **Background** | #FFFFFF | #FFFFFF | #FFFFFF |

**States:**
- Create button disabled: `#BDBDBD` text, no tap action
- Create button enabled: `#1565C0` text (iOS) / filled primary (Android/Web)

---

### 2. Event Type Chip Selector

| Property | Value |
|----------|-------|
| **Type** | Horizontal wrapping chip group, single-select |
| **Chips** | Cultural (🟠), Religious (🟣), Social (🟢), Career (🔵), Other (⚪) |
| **Unselected** | Outlined border `#E0E0E0`, text `#212121` |
| **Selected** | Filled: Cultural=`#FF6D00`, Religious=`#7B1FA2`, Social=`#2E7D32`, Career=`#1565C0`, Other=`#757575` |
| **Selected text** | White |
| **Height** | 36px / 36dp |
| **Border radius** | 18px (pill) |
| **Spacing** | 8px horizontal gap, 8px vertical gap |

---

### 3. Date & Time Pickers

| Property | iOS | Android | Web |
|----------|-----|---------|-----|
| **Start Date** | Native `DateTimePicker` (wheel) | Native `DatePickerDialog` | `<input type="date">` styled |
| **Start Time** | Native `DateTimePicker` (wheel) | Native `TimePickerDialog` | `<input type="time">` styled |
| **End Date** | Same as start | Same as start | Same as start |
| **Min Date** | Today (no past dates) | Today | Today |
| **Error highlight** | Red border `#C62828` | Red outline | Red border |

---

### 4. Location Fields

| Property | Value |
|----------|-------|
| **Location Name** | Required text input, 1 line |
| **Location Address** | Optional text input, 1–2 lines |
| **Hint text** | "e.g. Dallas Convention Center" |
| **Error state** | Red border + error message below |
| **Max lengths** | Name: 100 chars, Address: 200 chars |

---

### 5. Description Textarea

| Property | iOS | Android | Web |
|----------|-----|---------|-----|
| **Rows** | 6 (expandable) | 6 (expandable) | 6 (expandable) |
| **Max chars** | 3000 | 3000 | 3000 |
| **Counter** | Shown as `X/3000` below textarea | Same | Same |
| **Near limit** | Counter turns amber at 2700+ | Same | Same |
| **At limit** | Counter turns red at 3000 | Same | Same |

---

### 6. Photo Upload Section

| Property | Value |
|----------|-------|
| **Trigger** | Tapping row opens native image picker / file input |
| **Accepted types** | JPEG, PNG, HEIC |
| **Max size** | 2MB (compressed client-side before upload) |
| **Preview** | Thumbnail (80×80px) + filename + Remove (✕) button |
| **Progress** | Progress bar during upload |
| **Error** | Toast: "Photo upload failed. Your event can still be posted without a photo." |
| **Bucket** | `event-photos/` in Supabase Storage |

---

### 7. RSVP Visibility Toggle

| Property | Value |
|----------|-------|
| **Type** | Radio button group (2 options) |
| **Default** | Public |
| **Options** | Public / Private |
| **Public label** | "Public — anyone can see who's going" |
| **Private label** | "Private — only you see the attendee list" |
| **Selected color** | `#1565C0` |

---

### 8. Global Toggle (Premium Only)

| Property | Value |
|----------|-------|
| **Visibility** | Only shown to users where `is_premium = true` |
| **Type** | Checkbox |
| **Default** | Unchecked (local by default) |
| **Label** | "Visible in all metro feeds — not just [City]" |
| **Icon** | 🌐 |
| **Footer preview** | Updates "Posting to" card: "📍 Dallas-Fort Worth · 🌐 Global ON" |

---

## Spacing & Layout

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Safe area / status bar | Auto | — |
| 2 | Navigation bar | 44px / 56dp | — |
| 3 | Scrollable form content | Flex | 16px section gap |
| 4 | Event Name card | Auto | 16px |
| 5 | Event Type card | Auto | 16px |
| 6 | Date/Time card | Auto | 16px |
| 7 | Location card | Auto | 16px |
| 8 | Description card | Auto | 16px |
| 9 | Photo card | Auto | 16px |
| 10 | RSVP Visibility card | Auto | 16px |
| 11 | Global toggle card (premium) | Auto | 16px |
| 12 | "Posting to" footer card | Auto | 32px |
| 13 | Bottom safe area / padding | 24px | — |

---

## User Interactions

### Primary Flow (Standard User)
1. User taps "Create Event" in Events tab header
2. Create Event screen slides up (modal on iOS, full-screen on Android/Web)
3. User enters Event Name
4. User taps an Event Type chip — chip fills with type color
5. User taps Start Date field — native picker opens; user picks date + time
6. User optionally sets End Date + Time (must be after start)
7. User enters Location Name (required); optionally enters Location Address
8. User writes Description
9. User optionally taps "Add Event Photo" → picks image from library
10. User selects RSVP Visibility (Public or Private)
11. All required fields valid → "Create" button enables (turns blue)
12. User taps "Create" → loading state → navigates to new event detail screen

### Alternative Flows

- **User cancels mid-form:** Taps "✕ Cancel" → if form has content, shows "Discard Event?" confirmation dialog → discard or continue editing
- **Photo upload fails:** Toast appears; event still submittable without photo
- **Date validation fails (past date):** Red border on date field + inline error message; Create button stays disabled
- **End date before start:** Inline error on end date field; Create button stays disabled
- **Premium user enables global:** Footer card updates to show "🌐 Global ON"; event will appear in all metro feeds after submit
- **Level 0 user taps Create Event button:** Modal appears prompting account verification (Create Event form never opens)

---

## Platform-Specific Differences

| Aspect | iOS | Android | Web |
|--------|-----|---------|-----|
| **Navigation** | Modal sheet (swipe-down dismissable) | Full-screen activity | Full-page route `/events/create` |
| **Date/Time Picker** | Native wheel picker (UIDatePicker) | Native dialog pickers | Styled `<input type="date/time">` |
| **Submit Button** | Top-right text button in nav bar | Top-right in AppBar | Sticky bottom button (or top-right in header) |
| **Photo Picker** | `expo-image-picker` (Photos library) | Same | `<input type="file" accept="image/*">` |
| **Keyboard Avoidance** | `KeyboardAvoidingView` | `adjustResize` | Browser native scroll |
| **Haptic Feedback** | Light impact on chip select | None | None |
| **Typography** | SF Pro | Roboto | Inter / system-ui |

---

## Error States & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Event Name < 5 chars | Inline error below field: "Must be at least 5 characters." |
| Start date in the past | Inline error: "Start date must be in the future." |
| End date before start | Inline error on end field: "End date must be after start date." |
| No Event Type selected | Create button stays disabled; type section shows subtle required indicator |
| Description < 10 chars | Inline error: "Must be at least 10 characters." |
| Photo > 2MB (pre-compression) | Client compresses to ≤ 2MB first; only shows error if compression fails |
| Photo upload network failure | Toast: "Photo upload failed. Event will be posted without a photo." |
| Create event API failure | Error toast: "Couldn't create event. Please try again." Form stays open with all values intact |
| No metro area set | Toast: "Please set your location in profile before creating events." |
| Level 0 user | Create Event button in list header triggers verification modal instead of opening form |
| Organizer opens same form for Edit | Form pre-fills with existing data; "Create" label becomes "Save Changes" |

---

## Accessibility

### Screen Reader Order (Mobile)
1. Navigation: Cancel button
2. Navigation: "Create Event" heading
3. Navigation: Create button (announced as disabled until valid)
4. Event Name label + input
5. Event Type label + chip group (each chip as a toggle button)
6. Start Date label + date input + time input
7. End Date label + date input + time input (optional, announced as such)
8. Location Name label + input
9. Location Address label + input (optional)
10. Description label + textarea
11. Character counter
12. Photo upload button
13. RSVP Visibility label + radio group
14. Global toggle (premium users only)
15. "Posting to" summary

### Touch Targets
- All chips: min 44×44pt (iOS) / 48×48dp (Android)
- All inputs: min 48px tap height
- Cancel / Create buttons: min 44×44pt

### Color Contrast (WCAG)
| Element | Ratio | Level |
|---------|-------|-------|
| Form labels on #FFFFFF | 14.7:1 | AAA ✓ |
| Error text #C62828 on #FFFFFF | 5.9:1 | AA ✓ |
| Disabled button text #BDBDBD on #FFFFFF | 1.6:1 | — (intentionally low, disabled) |
| Selected chip text (white on #1565C0) | 7.4:1 | AAA ✓ |

---

## Animations & Transitions

| Step | Element | Delay | Duration | Effect |
|------|---------|-------|----------|--------|
| 1 | Screen enter (iOS) | 0ms | 350ms | Slide up modal |
| 2 | Screen enter (Android/Web) | 0ms | 300ms | Fade + slide from right |
| 3 | Chip selection | 0ms | 150ms | Background fill fade |
| 4 | Create button enable | 0ms | 200ms | Color transition disabled→blue |
| 5 | Photo preview appear | 0ms | 200ms | Fade in + scale from 0.95 |
| 6 | Submit loading state | 0ms | — | Button spinner |
| 7 | Screen exit on success | 0ms | 300ms | Replace with event detail |

---

## Content & Localization

### String Keys
| Key | Default Value |
|-----|---------------|
| `create_event_title` | Create Event |
| `create_event_cta` | Create |
| `create_event_cancel` | Cancel |
| `field_event_name` | Event Name |
| `field_event_name_hint` | e.g. Dashain Celebration 2026 |
| `field_event_name_error_short` | Must be at least 5 characters. |
| `field_event_name_error_long` | Maximum 150 characters. |
| `field_event_type` | Event Type |
| `field_start_datetime` | Start Date & Time |
| `field_end_datetime` | End Date & Time (optional) |
| `field_start_error_past` | Start date must be in the future. |
| `field_end_error_before_start` | End date must be after start date. |
| `field_location_name` | Location Name |
| `field_location_name_hint` | e.g. Dallas Convention Center |
| `field_location_address` | Location Address (optional) |
| `field_description` | Description |
| `field_description_counter` | {count}/3000 |
| `field_photo_add` | Add Event Photo (optional) |
| `field_rsvp_visibility` | RSVP Visibility |
| `field_rsvp_public_label` | Public — anyone can see who's going |
| `field_rsvp_private_label` | Private — only you see the attendee list |
| `field_global_toggle_label` | Visible in all metro feeds — not just {city} |
| `field_global_section_title` | Make Global (Premium) |
| `posting_to` | Posting to: {city} |
| `posting_to_global` | Posting to: {city} · 🌐 Global ON |
| `error_photo_upload` | Photo upload failed. Event will be posted without a photo. |
| `error_create_failed` | Couldn't create event. Please try again. |
| `discard_confirm_title` | Discard Event? |
| `discard_confirm_body` | You'll lose all the details you've entered. |
| `discard_cta` | Discard |
| `discard_cancel` | Keep Editing |

---

## Technical Notes

### Identifiers
- Mobile route: `CreateEventScreen` in `HomeStack`
- Web route: `/events/create`
- Edit mode: same screen, `eventId` param passed via navigation; submit label becomes "Save Changes", calls `updateEvent()` instead of `createEvent()`

### Validation
- All validation via `createEventSchema` (Zod) from `packages/shared/src/validation/events.ts`
- Real-time inline validation: debounced on `onChange` for text fields; immediate on `onBlur`
- Submit disabled until `createEventSchema.safeParse()` returns `success: true`

### Photo Upload
- Compress client-side with `expo-image-manipulator` (mobile) / Canvas API (web) before upload
- Upload to Supabase Storage bucket `event-photos/`
- Photo URL stored as `photo_url` in events table

### Navigation
| Direction | Trigger | Destination |
|-----------|---------|-------------|
| Entry | "Create Event" in events header | Events list |
| Exit (success) | `createEvent()` resolves | Event detail screen |
| Exit (cancel) | Tap ✕ Cancel (no form changes) | Events list |
| Exit (cancel, dirty form) | Tap ✕ → confirm discard | Events list |
| Exit (edit mode, success) | `updateEvent()` resolves | Event detail screen |

---

## Testing Checklist

### Functional Tests
- [ ] Event Name field rejects < 5 chars and > 150 chars with inline errors
- [ ] Event Type chips are single-select; only one can be active at a time
- [ ] Start date picker disallows dates in the past
- [ ] End date picker prevents dates before start date
- [ ] Location Name rejects < 5 chars
- [ ] Description rejects < 10 chars; counter updates in real-time
- [ ] Create button stays disabled until all required fields pass validation
- [ ] Create button enables (turns blue) when all required fields are valid
- [ ] Photo upload: file selected → progress bar → preview shown
- [ ] Photo upload failure: error toast, form remains submittable
- [ ] RSVP visibility radio group defaults to Public
- [ ] Global toggle only appears for premium users (`is_premium = true`)
- [ ] On submit: calls `createEvent()` with correct payload
- [ ] On success: navigates to the newly created event's detail screen
- [ ] Cancel with unsaved data: shows "Discard Event?" confirmation dialog
- [ ] Cancel without data: dismisses directly with no confirmation
- [ ] Level 0 user cannot reach this screen (redirected to verification modal)

### Visual Tests
- [ ] Selected event type chip shows correct color per type
- [ ] Unselected chips show outlined style
- [ ] Error fields show red border + error message below
- [ ] "Posting to" footer updates to show "🌐 Global ON" when global toggle enabled (premium)
- [ ] Character counter turns amber at 2700+, red at 3000

### Accessibility Tests
- [ ] Screen reader announces each form field label before input
- [ ] Event type chips announced as toggle buttons with selected/unselected state
- [ ] Create button announces "dimmed" or "unavailable" when disabled
- [ ] Error messages programmatically associated with their fields (accessibilityHint)

### Edge Case Tests
- [ ] Form submits without optional fields (end date, address, photo) → succeeds
- [ ] Network error during submit → error toast, form stays open with all data preserved
- [ ] Premium user submits with global ON → event's `is_global = true` in DB
- [ ] Edit mode: form pre-fills from existing event data; submit calls `updateEvent()`

---

## Open Questions

- [ ] **Edit mode label:** Should the navigation bar title change to "Edit Event" when in edit mode, or stay "Create Event"? → **Rec:** Change to "Edit Event" for clarity.
- [ ] **RSVP visibility default:** Feature spec says default is "Public" — confirm this is acceptable from a privacy-first standpoint. → **Rec:** Keep Public as default (consistent with spec); organizers can choose Private explicitly.
- [ ] **Character counter visibility:** Show the counter at all times, or only when the user is near the limit (e.g., < 500 chars remaining)? → **Rec:** Show at all times for transparency; style changes as limit approaches.
- [ ] **Photo removal in edit mode:** If an event already has a photo, should "Remove" in edit mode delete it from storage immediately or on save? → **Rec:** Delete on save only (keep photo in storage until edit form is committed).

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Entry from | Events List (screen to be wireframed) |
| On success → | Event Detail (screen to be wireframed) |
| Fallback for Level 0 | Verification Prompt (existing flow) |
| Edit mode reuses | This same screen |
| Feature spec | [events.md](../../product/features/events.md) |
| Feature breakdown | [events-feature-breakdown.md](../../product/features/events-feature-breakdown.md) |

---

**Status:** Draft — Ready for Review
