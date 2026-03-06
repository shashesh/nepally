# Wireframe: Event Detail Screen

> **Screen:** 17 | **Status:** Draft | **Updated:** 2026-03-05
> **Feature Spec:** [events.md](../../features/events.md)
> **Previous Screen:** [16-events-list.md](../16-events-list/16-events-list.md)
> **Story:** As a verified user, I want to view full event details and RSVP so I can plan my attendance and let the organizer know I'm coming.

---

## Screen Purpose + Key Goals

The Event Detail screen shows the complete information for a single event and is the primary surface for RSVPs. Users arrive by tapping an event card in the Events List.

**Key Goals:**
- Display all event information needed to decide whether to attend
- Enable RSVP with a single tap (Level 1+)
- Surface organizer identity and provide a path to message them
- Show attendee list (public) or RSVP count (private)
- Give organizers access to edit, cancel, and delete actions
- Handle past/cancelled events gracefully

---

## Visual Wireframe

### State 1: Default — Active Event, Level 1+ User (Not RSVP'd)

::: nav
← &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; :flag: Report
:::

::: hero
![Event photo or type illustration](assets/event-photo-placeholder.png)
:::

🎭 Cultural {.badge-cultural} &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; 📍 Local

## Teej Festival 2026

📅 **Saturday, August 29, 2026**
6:00 PM – 10:00 PM

📍 Dallas Convention Center
650 S Griffin St, Dallas, TX 75202

---

*Teej is a celebrated festival observed by Hindu women and girls. Join our community for an evening of traditional songs, dance, and feasting. All are welcome — bring the whole family! Traditional attire encouraged.*

*Activities include: group singing of Teej songs, folk dance performances, traditional food (sel roti, dahi, fruits), and cultural games.*

---

**Organizer**

**[AK]** &nbsp; Asha K. ✓ &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; [Message Organizer]{.outline}

---

**Attendance**

**[👤][👤][👤][👤][👤]** +29 &emsp; 34 going

[View all attendees]{.outline}

---

[RSVP — I'm Going :calendar:]*

---

::: footer
[[ :home: Home | :pencil: Post | *:calendar: Events* | :storefront: Marketplace | :user: Profile ]]
:::

---

### State 2: RSVP'd — "Going" State

::: nav
← &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; :flag: Report
:::

::: hero
![Event photo](assets/event-photo-placeholder.png)
:::

🎭 Cultural {.badge-cultural} &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; 📍 Local

## Teej Festival 2026

📅 **Saturday, August 29, 2026**
6:00 PM – 10:00 PM

📍 Dallas Convention Center
650 S Griffin St, Dallas, TX 75202

---

*Teej is a celebrated festival observed by Hindu women and girls...*

---

**Organizer**

**[AK]** &nbsp; Asha K. ✓ &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; [Message Organizer]{.outline}

---

**Attendance**

**[👤][👤][👤][👤][👤]** +30 &emsp; 35 going

[View all attendees]{.outline}

---

::: alert success
✓ You're going! We'll remind you before the event.
:::

[Going ✓]{variant:success} &emsp; [Can't make it]{.outline}

---

::: footer
[[ :home: Home | :pencil: Post | *:calendar: Events* | :storefront: Marketplace | :user: Profile ]]
:::

---

### State 3: Private RSVP (Count Only — No Attendee List)

**Attendance**

**34 going**

> *(Attendee list is private. Organizer controls visibility.)*

---

[RSVP — I'm Going :calendar:]*

---

### State 4: Organizer View (Own Event — Edit/Cancel/Delete)

::: nav
← &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; ⋮ {.icon-button}
:::

::: hero
![Event photo](assets/event-photo-placeholder.png)
:::

🎭 Cultural {.badge-cultural} &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; 📍 Local

## Teej Festival 2026

📅 **Saturday, August 29, 2026**
6:00 PM – 10:00 PM

📍 Dallas Convention Center
650 S Griffin St, Dallas, TX 75202

---

*Teej is a celebrated festival...*

---

**Organizer**

**[AK]** &nbsp; Asha K. ✓ &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; *You*

---

**Attendance — 34 RSVPs**

**[👤][👤][👤][👤][👤]** +29 &emsp; 34 going

[View all attendees]*

---

**You're the organizer**

---

::: footer
[[ :home: Home | :pencil: Post | *:calendar: Events* | :storefront: Marketplace | :user: Profile ]]
:::

---

### State 4a: Organizer Three-Dot Menu (Expanded)

::: modal
[Edit Event]{.outline}

[Cancel Event]{.outline}

[Delete Event]{variant:danger}
:::

---

### State 5: Cancelled Event

::: nav
← &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; :flag: Report
:::

::: hero
![Event photo — dimmed](assets/event-photo-placeholder.png)
:::

::: alert error
🚫 **This event has been cancelled.**
:::

🎭 Cultural {.badge-cultural-muted}

## ~~Teej Festival 2026~~

📅 ~~Saturday, August 29, 2026~~
~~6:00 PM – 10:00 PM~~

📍 Dallas Convention Center

---

*Teej is a celebrated festival...*

---

**Organizer**

**[AK]** &nbsp; Asha K. ✓

---

**34 people had RSVP'd**

---

::: footer
[[ :home: Home | :pencil: Post | *:calendar: Events* | :storefront: Marketplace | :user: Profile ]]
:::

---

### State 6: Past Event

::: nav
← &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; :flag: Report
:::

::: hero
![Event photo](assets/event-photo-placeholder.png)
:::

::: alert info
📅 **This event has passed.**
:::

🎭 Cultural {.badge-cultural}

## Teej Festival 2026

📅 ~~Saturday, August 29, 2026~~
*(Ended)*

📍 Dallas Convention Center

---

*Teej is a celebrated festival...*

---

**Organizer**

**[AK]** &nbsp; Asha K. ✓ &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; [Message Organizer]{.outline}

---

**47 people attended**

---

[Event Has Passed]{state:disabled}

---

::: footer
[[ :home: Home | :pencil: Post | *:calendar: Events* | :storefront: Marketplace | :user: Profile ]]
:::

---

### State 7: Level 0 User View

::: nav
← &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; :flag: Report
:::

::: hero
![Event photo](assets/event-photo-placeholder.png)
:::

🎭 Cultural {.badge-cultural}

## Teej Festival 2026

📅 **Saturday, August 29, 2026**
6:00 PM – 10:00 PM

📍 Dallas Convention Center
650 S Griffin St, Dallas, TX 75202

---

*Teej is a celebrated festival...*

---

**Organizer**

**[AK]** &nbsp; Asha K. ✓

---

**34 going**

---

::: alert warning
⚠️ Verify your phone to RSVP and message the organizer. &nbsp; [Verify Now]{.outline}
:::

[Verify to RSVP]{state:disabled}

---

::: footer
[[ :home: Home | :pencil: Post | *:calendar: Events* | :storefront: Marketplace | :user: Profile ]]
:::

---

### State 8: Attendee List Modal (Public RSVP)

::: modal
## 34 Going

---

**[AK]** &nbsp; Asha K. ✓

**[RS]** &nbsp; Rohan S. ✓

**[PG]** &nbsp; Priya G.

**[BT]** &nbsp; Bikram T. ✓

**[SG]** &nbsp; Sita G. ✓

**[AM]** &nbsp; Anita M.

*... and 28 more*

[Close]
:::

---

### State 9: Cancel Event Confirmation

::: modal
## Cancel This Event?

Attendees will see this event as cancelled. Their RSVPs will be preserved.

*This action cannot be undone.*

[Keep Event]{.outline} &emsp; [Yes, Cancel It]{variant:danger}
:::

---

### State 10: Delete Event Confirmation

::: modal
## Delete This Event?

This will permanently remove the event from all feeds. Attendees will not be notified.

*This action cannot be undone.*

[Keep Event]{.outline} &emsp; [Delete]{variant:danger}
:::

---

### State 11: Un-RSVP Confirmation

::: modal
## Can't Make It?

Remove your RSVP for **Teej Festival 2026**?

[Stay Going]{.outline} &emsp; [Remove RSVP]{variant:danger}
:::

---

### State 12: Web Layout (Desktop)

::: nav
[[ :logo: NUSA | Events | Home | Marketplace | :user: Profile ]]
:::

[[ Events > Teej Festival 2026 ]]

## Event Detail {.grid-2}

### Left Column — Event Info
::: hero
![Event photo](assets/event-photo-placeholder.png)
:::

🎭 Cultural {.badge-cultural} &emsp; 📍 Local

### Teej Festival 2026

📅 Saturday, August 29, 2026 · 6:00 PM – 10:00 PM

📍 Dallas Convention Center
650 S Griffin St, Dallas, TX 75202

---

*Teej is a celebrated festival observed by Hindu women and girls. Join our community for an evening of traditional songs, dance, and feasting...*

### Right Column — Actions & Organizer
::: card
**Organizer**

**[AK]** &nbsp; Asha K. ✓

[Message Organizer]{.outline}

---

**34 going**

**[👤][👤][👤][👤][👤]** +29

[View all attendees]{.outline}

---

[RSVP — I'm Going :calendar:]*

---

:flag: [Report Event]{.outline}
:::

---

## Component Specifications

### 1. Back Navigation Bar

| Property | iOS | Android | Web |
|----------|-----|---------|-----|
| **Type** | Navigation bar | App bar | Breadcrumb |
| **Height** | 44px | 56dp | 48px |
| **Background** | White (#FFFFFF) | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | 1px bottom #E0E0E0 | elevation 2dp | 1px bottom #E0E0E0 |

**Left:** Back arrow (←) — taps to pop screen, returns to Events List
**Right:** Report button (:flag: icon, 24px, #757575) — opens report flow
- For event organizer: Report replaced by three-dot menu (⋮) with Edit / Cancel / Delete

**a11y:**
- Back: "Back to Events, button"
- Report: "Report event, button"
- Three-dot (organizer): "More options, button"

---

### 2. Hero Image

| Property | iOS | Android | Web |
|----------|-----|---------|-----|
| **Width** | Full screen width | Full screen width | Full left column |
| **Height** | 220px | 220dp | 280px |
| **Corner Radius** | 0 (edge-to-edge) | 0 | 8px (within column) |
| **Object Fit** | Cover | centerCrop | Cover |

**Fallback (no photo uploaded):**
- Event-type illustration with subtle color background matching event type
  - Cultural: warm orange gradient + stylized dhaka pattern silhouette
  - Religious: purple gradient + diya silhouette
  - Social: green gradient + mountain silhouette
  - Career: blue gradient + handshake silhouette
  - Other: gray gradient + calendar silhouette

**Cancelled overlay:** Photo dimmed to 40% opacity with no additional overlay text (the alert banner below handles it)

---

### 3. Event Type Badge + Scope Badge Row

Below hero image, horizontal row:
- **Left:** Event type badge (same color scheme as events list)
- **Right:** 📍 Local or 🌐 Global badge

| Badge | Text Color | Background |
|-------|-----------|-----------|
| Cultural | #E65100 | #FFF3E0 |
| Religious | #6A1B9A | #F3E5F5 |
| Social | #1B5E20 | #E8F5E9 |
| Career | #0D47A1 | #E3F2FD |
| Other | #424242 | #F5F5F5 |
| Local | #388E3C | #E8F5E9 |
| Global | #1565C0 | #E3F2FD |

Margin: 16px top, 8px bottom

---

### 4. Event Title

| Property | Value |
|----------|-------|
| **Typography** | 24pt/22sp Bold, #212121 |
| **Max Lines** | Unlimited (no truncation on detail screen) |
| **Margin** | 8px top |

For **cancelled** events: title in strikethrough style, #757575

---

### 5. Date/Time Row

- Icon: 📅 calendar, 18px, #757575
- **Format rules:**
  - Single day, with time: "**Saturday, August 29, 2026** · 6:00 PM – 10:00 PM"
  - Single day, no end time: "**Saturday, August 29, 2026** · 6:00 PM"
  - Multi-day: "**Fri, Aug 29 – Sun, Aug 31, 2026**"
  - Multi-day with times: "**Fri, Aug 29 at 6:00 PM – Sun, Aug 31 at 2:00 PM**"
- Typography: 15pt/14sp Regular, #424242
- Margin: 12px top, 4px bottom

For **cancelled** events: date row in strikethrough, #BDBDBD
For **past** events: "*(Ended)*" appended, #757575

---

### 6. Location Row

- Icon: 📍 map pin, 18px, #757575
- **Location name:** Bold line, 15pt/14sp Semibold, #424242
- **Address:** Second line (if provided), 14pt/13sp Regular, #757575
- Tapping location row: future — open Maps app (deferred for MVP)
- Margin: 12px top, 4px bottom

---

### 7. Description

- Full text, no truncation
- Typography: 15pt/14sp Regular, #424242
- Line height: 1.6 (spacious for readability)
- Supports paragraph breaks (multiple `\n\n` render as distinct paragraphs)
- Margin: 16px top and bottom
- Dividers (horizontal rule) above and below section

---

### 8. Organizer Section

| Property | Value |
|----------|-------|
| **Avatar** | 40×40px circle, profile photo or initials |
| **Name** | Masked: "Firstname L.", 15pt/14sp Medium, #212121 |
| **Trust badge** | ✓ checkmark, 16px, #2E7D32 (Level 1+) |
| **Layout** | [Avatar] [Name] [✓] ........... [Message Organizer] |

**"Message Organizer" button:**
- Outline style, 13pt/12sp Semibold, #1565C0
- Level 1+: taps to open/create chat with organizer
- Level 0: button hidden; replaced with "Verify to message" text link
- Own event (organizer): "Message Organizer" hidden; replaced with "*You*" text label

**Tap organizer name/avatar:** Navigates to organizer's public profile (reuses `PublicProfileScreen` / `/users/[id]`)

---

### 9. RSVP Attendance Section

**Section header:** "Attendance" (15pt/14sp Semibold, #212121)

#### When RSVP is Public:
- Avatar stack: up to 5 circular avatars (24px each, overlapping by 8px)
  - Photos or initials, same avatar component used app-wide
- RSVP count label: "[N] going" (15pt/14sp Regular, #757575)
  - Layout: [avatar stack] [+N text] ........... [N going]
- "View all attendees" outline button below
  - Taps to open Attendee List modal/sheet
- Empty state: "Be the first to RSVP!"

#### When RSVP is Private:
- No avatar stack shown
- Only: "[N] going" text, center or left aligned
- No "View all attendees" button
- Empty state: "No RSVPs yet"

#### Organizer View (regardless of privacy):
- Section header: "Attendance — [N] RSVPs"
- Always shows full avatar stack and "View all attendees" button
- Tap "View all attendees" shows full list (organizer always sees names)

---

### 10. RSVP Button

| State | Label | Style | Trigger |
|-------|-------|-------|---------|
| Not going (default) | "RSVP — I'm Going 📅" | Primary filled (#1565C0) | Level 1+ tap → RSVP |
| Going | "Going ✓" | Success filled (#2E7D32) | — |
| Going (un-RSVP) | "Can't make it" | Outline (#C62828) | Shows alongside Going button |
| Past event | "Event Has Passed" | Disabled gray | Non-interactive |
| Cancelled | Hidden | — | Not shown |
| Own event | "You're the organizer" | Disabled text label | Non-interactive |
| Level 0 | "Verify to RSVP" | Disabled outline | Tap → verification prompt |

**Going state layout:** Two buttons side by side: [Going ✓] (success, left) + [Can't make it] (outline, right)
- Tapping "Can't make it" shows un-RSVP confirmation modal before removing

**Optimistic UI:** Button state updates immediately on tap; reverts with error toast on failure.

**a11y:**
- Default: "RSVP button. I'm going. Double-tap to confirm attendance."
- Going: "You are going. Double-tap to remove RSVP."
- Disabled: "Event has passed. Cannot RSVP."

---

### 11. Report Button

- Position: top-right of navigation bar (icon only on mobile, text link on web)
- Icon: :flag: flag, 24px, #757575
- Taps to open existing report flow (same as post reporting)
- Hidden for event organizer (they have three-dot menu instead)

---

### 12. Organizer Three-Dot Menu (Own Event Only)

- Positioned at top-right of nav bar, replacing Report button
- Options:
  1. "Edit Event" — navigates to Create Event form (pre-filled)
  2. "Cancel Event" — shows Cancel confirmation modal
  3. "Delete Event" — shows Delete confirmation modal (text in red)
- Sheet/action sheet on mobile, dropdown on web

---

## Spacing & Layout (Mobile)

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Status bar / safe area | Auto | — |
| 2 | Navigation bar | 44px | — |
| 3 | Hero image | 220px | — |
| 4 | Type badge + scope badge row | 32px | 12px |
| 5 | Event title | Variable | 12px |
| 6 | Date/time row | 40px | 4px |
| 7 | Location row | 40–60px (2 lines) | 16px |
| 8 | Horizontal divider | 1px | 16px |
| 9 | Description | Variable | 16px |
| 10 | Horizontal divider | 1px | 16px |
| 11 | Organizer section | 56px | 16px |
| 12 | Horizontal divider | 1px | 16px |
| 13 | Attendance header | 24px | 8px |
| 14 | Avatar stack + count | 32px | 8px |
| 15 | "View all" button (if public) | 36px | 16px |
| 16 | RSVP button(s) | 48px | 24px |
| 17 | Bottom safe area + tab bar | 56px + safe | — |

**Total scrollable content:** approximately 700–900px depending on description length

---

## User Interactions

### Primary Flow (View & RSVP)
1. User taps event card in Events List → navigates to Event Detail (slide-in animation)
2. Screen loads with hero image, title, date/time, location, description
3. User scrolls down to see organizer and attendance info
4. User taps "RSVP — I'm Going" button
5. Button immediately flips to "Going ✓" (optimistic UI); count increments by 1
6. Success alert appears: "You're going! We'll remind you before the event."
7. User can tap "Can't make it" → confirmation modal → removes RSVP

### Alternative Flow (Message Organizer)
1. User taps "Message Organizer" button
2. If existing conversation with this organizer: opens that conversation
3. If new conversation: creates conversation, navigates to message thread
4. Level 0 user: "Verify to message" taps → navigates to verification flow

### Alternative Flow (View Organizer Profile)
1. User taps organizer avatar or name
2. Navigates to organizer's Public Profile screen
3. Shows organizer's events, posts, masked name, trust badge

### Alternative Flow (Edit Event — Organizer)
1. Organizer taps ⋮ menu → "Edit Event"
2. Navigates to Create Event form, pre-filled with current data
3. Organizer edits fields, saves
4. Returns to Event Detail with updated content + "Edited" label

### Alternative Flow (Cancel Event — Organizer)
1. Organizer taps ⋮ menu → "Cancel Event"
2. Confirmation modal: "Cancel this event? Attendees will see this event as cancelled."
3. Organizer taps "Yes, Cancel It" → event status set to 'cancelled'
4. Detail screen updates: red "Cancelled" banner, strikethrough on title/date, RSVP button hidden

### Alternative Flow (Delete Event — Organizer)
1. Organizer taps ⋮ menu → "Delete Event"
2. Confirmation modal (destructive): "Delete this event? This permanently removes the event."
3. Organizer taps "Delete" → navigated back to Events List; event no longer appears

### Alternative Flow (View Attendees)
1. User taps "View all attendees" (public RSVP events only)
2. Attendee list modal/sheet slides up
3. Scrollable list of masked names + avatars + trust badges
4. User taps a name → navigates to their public profile

---

## Platform-Specific Differences

| Aspect | iOS | Android | Web |
|--------|-----|---------|-----|
| **Navigation** | Navigation bar + back arrow | App bar + back arrow | Breadcrumb trail |
| **Back gesture** | Swipe right | System back | Browser back |
| **Three-dot menu** | Action Sheet from bottom | Overflow menu (top-right) | Dropdown |
| **Attendee modal** | Bottom sheet | Bottom sheet | Modal dialog |
| **Confirmation dialogs** | Alert (native iOS) | AlertDialog | Modal overlay |
| **Hero image** | Full bleed, edge-to-edge | Full bleed, edge-to-edge | Constrained to left column |
| **RSVP button** | Full width, 48px tall | Full width, 56dp tall | Fixed width in right column |
| **Layout** | Single column, scroll | Single column, scroll | Two-column (info left, actions right) |
| **Report link** | Icon only in nav bar | Icon only in nav bar | "Report Event" text link in right column |

---

## Error States & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Event not found (deleted) | Error screen: "This event no longer exists." + "Back to Events" button |
| Network error on load | Retry prompt with cached data if available |
| RSVP fails (network error) | Optimistic UI reverted; error toast: "Couldn't update RSVP. Try again." |
| RSVP fails (already RSVP'd in another session) | Sync state; show "Going ✓" without error |
| User views own event (no RSVP action) | "You're the organizer" label; three-dot menu for management |
| Cancelled event | Red "Cancelled" banner; strikethrough on title/date; RSVP button hidden |
| Past event | Blue "This event has passed" banner; RSVP button shows "Event Has Passed" (disabled) |
| Event has no photo | Type-specific illustration shown as hero (Cultural → dhaka pattern, etc.) |
| Event has no end time | Show only start time: "6:00 PM" (no dash or end) |
| Event has no location address | Show only location name (no second line) |
| Very long description | Fully scrollable; no "read more" truncation on detail screen |
| Organizer is Level 0 | Trust badge hidden; "Asha K." shown without ✓ |
| Private RSVP, organizer viewing | Organizer sees full attendee list with "View all attendees" button |
| 0 RSVPs, public | "Be the first to RSVP!" — no avatar stack |
| 1 RSVP | "1 going" (singular) |
| 1000+ RSVPs | "1,000 going" (comma formatted) |
| Global event | 🌐 Global badge shown instead of 📍 Local |
| Report from Level 0 | Report button visible; report flow doesn't require Level 1 |

---

## Accessibility

### Screen Reader Order (Mobile)
1. "Back to Events, button."
2. "Report event, button." (or "More options, button" for organizer)
3. "Event photo." (or "Teej Festival illustration.")
4. "Cultural event."
5. "Local post." (or "Global post.")
6. "Teej Festival 2026. Heading."
7. "Saturday August 29 2026. 6:00 PM to 10:00 PM."
8. "Location: Dallas Convention Center. 650 S Griffin St, Dallas TX."
9. "Description: Teej is a celebrated festival..." *(full text)*
10. "Organizer: Asha K., verified."
11. "Message Organizer, button."
12. "34 people going. View all attendees, button."
13. "RSVP, I'm going, button." (or "Going, you are attending. Remove RSVP, button.")

### Touch Targets
- Back arrow: 44×44pt / 48×48dp
- Report/three-dot: 44×44pt / 48×48dp
- Organizer avatar: 44×44pt / 48×48dp (larger touch target than 40px visual)
- Message Organizer button: 44×44pt / 48×48dp
- "View all attendees": 44×44pt / 48×48dp
- RSVP button: 48px height × full width — exceeds minimum

### Color Contrast (WCAG)
| Element | Foreground | Background | Ratio | Level |
|---------|-----------|-----------|-------|-------|
| Event title | #212121 | #FFFFFF | 16.9:1 | AAA ✓ |
| Date/location | #424242 | #FFFFFF | 10.7:1 | AAA ✓ |
| Description | #424242 | #FFFFFF | 10.7:1 | AAA ✓ |
| Organizer name | #212121 | #FFFFFF | 16.9:1 | AAA ✓ |
| RSVP button text | #FFFFFF | #1565C0 | 7.2:1 | AAA ✓ |
| Going button text | #FFFFFF | #2E7D32 | 5.9:1 | AA ✓ |
| Cultural badge | #E65100 | #FFF3E0 | 4.5:1 | AA ✓ |

---

## Animations & Transitions

| Step | Element | Delay | Duration | Effect |
|------|---------|-------|----------|--------|
| 1 | Screen enter (from list) | 0ms | 300ms | Slide in from right (iOS) / fade+slide (Android) |
| 2 | Hero image | 0ms | 400ms | Fade in |
| 3 | Content below hero | 100ms | 250ms | Fade in |
| 4 | RSVP button tap | 0ms | 150ms | Scale 0.97 → 1.0, color transition |
| 5 | RSVP success alert | 0ms | 250ms | Slide down from above button |
| 6 | Attendee modal open | 0ms | 300ms | Slide up from bottom |
| 7 | Three-dot menu open | 0ms | 200ms | Expand from anchor point |
| 8 | Cancel/delete modal | 0ms | 250ms | Fade in overlay + modal |
| 9 | Screen exit (back) | 0ms | 250ms | Slide out to right |

---

## Content & Localization

### String Keys

| Key | Value |
|-----|-------|
| `event_detail_back` | Back |
| `event_detail_report` | Report event |
| `event_detail_more` | More options |
| `event_detail_organizer` | Organizer |
| `event_detail_attendance` | Attendance |
| `event_detail_you_organizer` | You're the organizer |
| `event_detail_message_organizer` | Message Organizer |
| `event_detail_view_attendees` | View all attendees |
| `event_detail_going_count` | {n} going |
| `event_detail_went_count` | {n} went |
| `event_detail_going_singular` | 1 going |
| `event_detail_first_rsvp` | Be the first to RSVP! |
| `event_detail_rsvp_btn` | RSVP — I'm Going |
| `event_detail_going_btn` | Going ✓ |
| `event_detail_cancel_rsvp_btn` | Can't make it |
| `event_detail_past_btn` | Event Has Passed |
| `event_detail_verify_rsvp` | Verify to RSVP |
| `event_detail_cancelled_banner` | This event has been cancelled. |
| `event_detail_past_banner` | This event has passed. |
| `event_detail_rsvp_success` | You're going! We'll remind you before the event. |
| `event_detail_rsvp_error` | Couldn't update RSVP. Try again. |
| `event_detail_edit` | Edit Event |
| `event_detail_cancel_event` | Cancel Event |
| `event_detail_delete_event` | Delete Event |
| `event_detail_cancel_confirm` | Cancel this event? Attendees will see this event as cancelled. |
| `event_detail_delete_confirm` | Delete this event? This permanently removes the event. |
| `event_detail_confirm_keep` | Keep Event |
| `event_detail_confirm_cancel` | Yes, Cancel It |
| `event_detail_confirm_delete` | Delete |
| `event_detail_not_found` | This event no longer exists. |
| `event_detail_attendees_title` | {n} Going |

---

## Technical Notes

### Screen Identifiers
- Mobile: `EventDetailScreen` (registered in HomeStack)
- Web route: `/events/[id]`

### State Management

```typescript
// EventDetailScreen state
{
  event: Event | null;
  isLoading: boolean;
  hasError: boolean;
  isRsvp'd: boolean;          // from getUserRsvps() on app start
  isRsvpLoading: boolean;     // optimistic state
  attendees: EventRsvp[];     // loaded on-demand (tap "View all")
  attendeesLoading: boolean;
  showAttendeeModal: boolean;
  showCancelModal: boolean;
  showDeleteModal: boolean;
  isOrganizer: boolean;       // event.organizer_id === currentUser.id
}
```

### API Calls
- **On mount:** `getEventById(supabase, eventId)` — includes organizer join
- **RSVP toggle:** `rsvpToEvent()` or `unrsvpFromEvent()` — optimistic
- **Load attendees:** `getEventAttendees(supabase, eventId)` — on demand only
- **Cancel event:** `cancelEvent(supabase, eventId)` — organizer only
- **Delete event:** `deleteEvent(supabase, eventId)` — organizer only

### Navigation

| Direction | Trigger | Destination |
|-----------|---------|-------------|
| Entry | Tap event card (Events List) | This screen |
| Entry | Tap event in organizer's profile | This screen |
| Entry | Deep link `/events/[id]` | This screen |
| Exit | Back button / swipe | Events List (or back stack) |
| Exit | Tap organizer avatar/name | Public Profile (`/users/[id]`) |
| Exit | Tap "Message Organizer" | Message Thread screen |
| Exit | Tap "Edit Event" | Create Event screen (pre-filled) |
| Exit | Delete confirmed | Events List (event removed) |
| Exit | "Back to Events" (not-found) | Events List |
| Modal | Tap "View all attendees" | Attendee List modal |
| Modal | Tap "Cancel Event" | Cancel confirmation modal |
| Modal | Tap "Delete Event" | Delete confirmation modal |
| Modal | Tap "Can't make it" | Un-RSVP confirmation modal |

---

## Testing Checklist

### Functional Tests
- [ ] Event loads with all fields: title, date/time, location, description, photo
- [ ] Hero image shows event photo; fallback illustration shown when no photo
- [ ] Date formats correctly for single-day, multi-day, with/without end time
- [ ] Address shown only when location_address is provided (not null)
- [ ] Organizer name masked as "Firstname L." via `formatPublicName()`
- [ ] Organizer avatar shows photo or initials + trust-level color
- [ ] Tap organizer → navigates to Public Profile
- [ ] RSVP button default state: "RSVP — I'm Going" (Level 1+, not yet RSVP'd)
- [ ] Tap RSVP → optimistic toggle to "Going ✓", count +1, success alert
- [ ] "Can't make it" shows un-RSVP confirmation; confirmed → reverts button, count -1
- [ ] Already RSVP'd users see "Going ✓" on load (from getUserRsvps() hydration)
- [ ] Public RSVP: avatar stack + "View all attendees" shown
- [ ] Private RSVP: count only shown, no avatar stack, no "View all" button
- [ ] Organizer always sees full attendee list regardless of privacy setting
- [ ] "Message Organizer" navigates to/creates chat (Level 1+)
- [ ] Level 0: RSVP button disabled, "Message Organizer" hidden, verify banner shown
- [ ] Own event: RSVP section replaced with "You're the organizer"; three-dot menu in header
- [ ] Three-dot menu: Edit → Create Event form; Cancel → modal → status=cancelled; Delete → modal → navigated away
- [ ] Cancelled event: red banner, strikethrough, RSVP button hidden
- [ ] Past event: blue banner, RSVP button shows "Event Has Passed" (disabled)
- [ ] Global event: 🌐 Global badge shown (not 📍 Local)

### Visual Tests
- [ ] Hero image is full width, 220px tall
- [ ] Type badge and scope badge on same row, correct colors
- [ ] RSVP "Going ✓" button is green (#2E7D32)
- [ ] Cancelled banner is red (#C62828 background)
- [ ] Past event banner is blue (info style)
- [ ] Strikethrough on title/date for cancelled events
- [ ] Muted type badge for cancelled events

### Accessibility Tests
- [ ] VoiceOver/TalkBack reads all sections in correct order
- [ ] RSVP button announces correct state ("going" vs "not going")
- [ ] Trust badge announced alongside organizer name
- [ ] Confirmation modals trap focus correctly
- [ ] All touch targets meet 44pt/48dp minimum

### Edge Case Tests
- [ ] Event not found → error screen with "Back to Events" button
- [ ] Network error on load → retry option shown
- [ ] RSVP network error → optimistic state reverted, toast shown
- [ ] 0 RSVPs → "Be the first to RSVP!" shown (no avatar stack)
- [ ] 1 RSVP → "1 going" (singular)
- [ ] Very long description → scrollable, no truncation
- [ ] No event photo → type-specific illustration shown
- [ ] No end time → only start time shown

---

## Open Questions

- [ ] **Should tapping the location row open Maps app?** → Rec: Defer to post-MVP. Include `location_address` in event data so deep link is easy to add later.
- [ ] **Should the success RSVP alert auto-dismiss?** → Rec: Yes, auto-dismiss after 3 seconds; user can still tap manually.
- [ ] **Should "edited" label be shown if organizer edits after RSVPs exist?** → Rec: Yes — show "Edited [date]" label below title, same as post edit label.
- [ ] **Attendee list: should it paginate or load all at once?** → Rec: Load all for MVP (events unlikely to have thousands of RSVPs); add pagination only if needed.

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Previous | [16-events-list.md](../16-events-list/16-events-list.md) |
| Next | Create Event Screen (wireframe TBD) |
| Feature Spec | [events.md](../../features/events.md) |
| Related | [07-conversation-list.md](../07-conversation-list/07-conversation-list.md) — Message Organizer navigates here |
| Related | Public Profile Screen — organizer tap navigates here |
| Design System | [00-design-system-foundation.md](../00-design-system-foundation/00-design-system-foundation.md) |

---

**Status:** Draft — Ready for Review
