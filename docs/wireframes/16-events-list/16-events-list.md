# Wireframe: Events List Screen

> **Screen:** 16 | **Status:** Draft | **Updated:** 2026-03-05
> **Feature Spec:** [events.md](../../product/features/events.md)
> **Breakdown:** [events-feature-breakdown.md](../../product/features/events-feature-breakdown.md)
> **Story:** As a verified user, I want to browse upcoming community events in my metro area so I can discover, attend, and RSVP to events that interest me.

---

## Screen Purpose + Key Goals

The Events List is the entry point to all community events. It replaces the current "Coming Soon" placeholder in the Events tab. Users see a chronological, filterable list of upcoming events in their metro area (plus global events).

**Key Goals:**

- Surface local community events in a familiar, feed-style layout
- Enable quick filtering by event type (Cultural, Religious, Social, Career)
- Let Level 1+ users RSVP directly from the list (via event detail)
- Give organizers a clear path to create new events
- Degrade gracefully for Level 0 users (view-only)

---

## Visual Wireframe

### State 1: Default — Upcoming Events (Level 1+ User)

::: nav
📅 Events · Dallas-Fort Worth &emsp;&emsp;&emsp;&emsp;&emsp; [+ Create Event]*
:::

::: nav
[*All*] &nbsp; [🎭 Cultural] &nbsp; [🛐 Religious] &nbsp; [💼 Career] &nbsp; [More ▼]
:::

::: card
![Teej Festival event photo](assets/event-thumbnail-cultural.png)

🎭 Cultural {.badge-cultural}

### Teej Festival 2026

📅 Sat, Aug 29 · 6:00 PM

📍 Dallas Convention Center, Dallas, TX

👤 Asha K. ✓ &emsp; 34 going
:::

::: card
![Career event placeholder](assets/event-thumbnail-career.png)

💼 Career {.badge-career} &emsp; 🌐 Global {.badge-global}

### Nepali Professionals Mixer

📅 Fri, Sep 5 · 7:00 PM

📍 Plano Community Hall

👤 Rohan S. ✓ &emsp; 12 going
:::

::: card
![Dashain event photo](assets/event-thumbnail-religious.png)

🛐 Religious {.badge-religious}

### Dashain Gathering

📅 Sun, Sep 14 · 11:00 AM – 4:00 PM

📍 Irving Cultural Center

👤 Prabha T. ✓ &emsp; 58 going
:::

::: card
![Social meetup photo](assets/event-thumbnail-social.png)

🤝 Social {.badge-social}

### Nepali Food & Fun Meetup

📅 Sat, Sep 20 · 5:00 PM

📍 Frisco Community Park

👤 Sita G. ✓ &emsp; 21 going
:::

---

### Past Events Divider

---

**Past Events**

---

::: card
![Holi event photo — muted](assets/event-thumbnail-cultural-muted.png)

🎭 Cultural {.badge-cultural-muted}

### ~~Holi Celebration 2026~~ — Past

📅 Sat, Mar 14 · 4:00 PM &emsp; *Ended*

📍 Addison Park, Dallas

👤 Bikram L. ✓ &emsp; 47 went
:::

[[ :home: Home | :pencil: Post | *:calendar: Events* | :storefront: Marketplace | :user: Profile ]]

---

### State 2: Filter Active (Cultural Only)

::: nav
📅 Events · Dallas-Fort Worth &emsp;&emsp;&emsp;&emsp;&emsp; [+ Create Event]*
:::

::: nav
[All] &nbsp; [*🎭 Cultural*] &nbsp; [🛐 Religious] &nbsp; [💼 Career] &nbsp; [More ▼]
:::

::: card
![Teej Festival event photo](assets/event-thumbnail-cultural.png)

🎭 Cultural {.badge-cultural}

### Teej Festival 2026

📅 Sat, Aug 29 · 6:00 PM

📍 Dallas Convention Center, Dallas, TX

👤 Asha K. ✓ &emsp; 34 going
:::

::: card
![Dashain puja photo](assets/event-thumbnail-cultural.png)

🎭 Cultural {.badge-cultural}

### Dashain Puja Night

📅 Fri, Oct 3 · 7:30 PM

📍 Richardson Nepali Community Center

👤 Anita B. ✓ &emsp; 19 going
:::

[[ :home: Home | :pencil: Post | *:calendar: Events* | :storefront: Marketplace | :user: Profile ]]

---

### State 3: Empty State (No Upcoming Events)

::: nav
📅 Events · Dallas-Fort Worth &emsp;&emsp;&emsp;&emsp;&emsp; [+ Create Event]*
:::

::: nav
[*All*] &nbsp; [🎭 Cultural] &nbsp; [🛐 Religious] &nbsp; [💼 Career] &nbsp; [More ▼]
:::

::: card
![Empty state illustration](assets/empty-mountain.png)

**No upcoming events in Dallas-Fort Worth**

Be the first to create an event for your community!

[Create an Event]*
:::

[[ :home: Home | :pencil: Post | *:calendar: Events* | :storefront: Marketplace | :user: Profile ]]

---

### State 4: Empty State (Active Filter, No Results)

::: card
![Empty state illustration](assets/empty-mountain.png)

**No upcoming Career events**

Try a different type or check back later.

[Clear Filter]{.outline}
:::

---

### State 5: Loading (Skeleton)

::: nav
📅 Events · Dallas-Fort Worth &emsp;&emsp;&emsp;&emsp;&emsp; [+ Create Event]*
:::

::: nav
[*All*] &nbsp; [🎭 Cultural] &nbsp; [🛐 Religious] &nbsp; [💼 Career] &nbsp; [More ▼]
:::

::: card
[##################################################] {.skeleton}

[########________________________________] {.skeleton}

[############________________________________] {.skeleton}

[######################] {.skeleton}

[################] &emsp; [##########] {.skeleton}
:::

::: card
[##################################################] {.skeleton}

[########________________________________] {.skeleton}

[#############################] {.skeleton}

[######################] {.skeleton}

[################] &emsp; [##########] {.skeleton}
:::

---

### State 6: Network Error

::: alert error
:warning: **Could not load events.** Check your connection and try again.

[Retry]*
:::

---

### State 7: Level 0 User View

::: nav
📅 Events · Dallas-Fort Worth
:::

::: alert warning
⚠️ Verify your phone to RSVP and create events. &nbsp; [Verify Now]{.outline}
:::

::: nav
[*All*] &nbsp; [🎭 Cultural] &nbsp; [🛐 Religious] &nbsp; [💼 Career] &nbsp; [More ▼]
:::

::: card
![Teej Festival event photo](assets/event-thumbnail-cultural.png)

🎭 Cultural {.badge-cultural}

### Teej Festival 2026

📅 Sat, Aug 29 · 6:00 PM

📍 Dallas Convention Center, Dallas, TX

👤 Asha K. ✓ &emsp; 34 going
:::

::: card
![Career event placeholder](assets/event-thumbnail-career.png)

💼 Career {.badge-career} &emsp; 🌐 Global {.badge-global}

### Nepali Professionals Mixer

📅 Fri, Sep 5 · 7:00 PM

📍 Plano Community Hall

👤 Rohan S. ✓ &emsp; 12 going
:::

[[ :home: Home | :pencil: Post | *:calendar: Events* | :storefront: Marketplace | :user: Profile ]]

---

### State 8: Premium User with Location Switcher

::: nav
📅 Events · ▼ Dallas-Fort Worth &emsp;&emsp;&emsp;&emsp; [+ Create Event]*
:::

> *(Location name is tappable for premium users — opens location switcher to browse events in other saved metros)*

::: nav
[*All*] &nbsp; [🎭 Cultural] &nbsp; [🛐 Religious] &nbsp; [💼 Career] &nbsp; [More ▼]
:::

::: card
![Teej Festival event photo](assets/event-thumbnail-cultural.png)

🎭 Cultural {.badge-cultural}

### Teej Festival 2026

📅 Sat, Aug 29 · 6:00 PM

📍 Dallas Convention Center, Dallas, TX

👤 Asha K. ✓ &emsp; 34 going
:::

[[ :home: Home | :pencil: Post | *:calendar: Events* | :storefront: Marketplace | :user: Profile ]]

---

### State 9: More Filters Bottom Sheet

::: modal

#### Filter by Event Type

- (*) All
- ( ) 🎭 Cultural
- ( ) 🛐 Religious
- ( ) 🤝 Social
- ( ) 💼 Career
- ( ) ⭐ Other

[Clear]{.outline} &emsp; [Apply]*
:::

---

### State 10: Web Layout (Desktop)

::: nav
[[ :logo: Nepally | Events | Home | Marketplace | [Create Event]* | :user: Profile ]]
:::

## Events {.grid-2}

### Sidebar

**Filter by Type**

- (*) All Events
- ( ) 🎭 Cultural
- ( ) 🛐 Religious
- ( ) 🤝 Social
- ( ) 💼 Career
- ( ) ⭐ Other

---

**Location**

Dallas-Fort Worth ▼

### Main Feed

::: card
![Teej Festival thumbnail](assets/event-thumbnail-cultural.png)

🎭 Cultural &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; Sat, Aug 29

**Teej Festival 2026**

Dallas Convention Center · 6:00 PM

by Asha K. ✓ &emsp; 34 going

[View Details]{.outline}
:::

::: card
![Career event thumbnail](assets/event-thumbnail-career.png)

💼 Career &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; Fri, Sep 5

**Nepali Professionals Mixer** 🌐

Plano Community Hall · 7:00 PM

by Rohan S. ✓ &emsp; 12 going

[View Details]{.outline}
:::

---

## Component Specifications

### 1. Header / Navigation Bar

| Property | Mobile (iOS) | Mobile (Android) | Web |
|----------|-------------|-----------------|-----|
| **Type** | Navigation bar | App bar | Top nav / page header |
| **Height** | 44–56px | 56dp | 64px |
| **Background** | White (#FFFFFF) | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | 1px bottom #E0E0E0 | elevation 2dp | 1px bottom #E0E0E0 |

**Left side:** "📅 Events · [Metro Name]"

- Metro name in #757575, 14pt/13sp
- "Events" in #212121, 17pt/16sp Semibold
- For premium users: metro name has chevron (▼) — tap to open location switcher

**Right side:** "Create Event" button

- Level 1+: filled primary blue button, 14pt/13sp Semibold
- Level 0: button hidden entirely

**a11y:**

- Left: "Events tab. Dallas-Fort Worth"
- Button: "Create event, button"

---

### 2. Event Type Filter Chips

| Property | Mobile | Web |
|----------|--------|-----|
| **Type** | Horizontal scrollable chips | Left sidebar radio group |
| **Height** | 48px bar | Auto (sidebar) |
| **Scroll** | Horizontal scroll on mobile | Static sidebar on desktop |

**Chips (mobile):** All · Cultural · Religious · Career · [More ▼]

- "All" always first and always visible
- Single-select (unlike post tag filter which is multi-select)
- Active chip: white text on #1565C0 background
- Inactive chip: #757575 text on #F5F5F5 background, 1px border #E0E0E0
- "More ▼" opens bottom sheet with remaining types (Social, Other)
- Tapping "All" clears any active type filter

**Type badge colors (consistent across chips and event cards):**

| Type | Color | Background |
|------|-------|-----------|
| Cultural | #E65100 (Deep Orange) | #FFF3E0 |
| Religious | #6A1B9A (Purple) | #F3E5F5 |
| Social | #1B5E20 (Dark Green) | #E8F5E9 |
| Career | #0D47A1 (Dark Blue) | #E3F2FD |
| Other | #424242 (Dark Gray) | #F5F5F5 |

**a11y:**

- Each chip: "Cultural filter, [selected/not selected]"
- "More" chip: "More event types, button"

---

### 3. Event Card

| Property | iOS | Android | Web |
|----------|-----|---------|-----|
| **Background** | White (#FFFFFF) | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | 1px solid #E0E0E0 | elevation 2dp | 1px solid #E0E0E0 |
| **Corner Radius** | 12px | 12dp | 8px |
| **Padding** | 16px | 16dp | 20px |
| **Margin** | 16px L/R, 12px between | 16dp L/R, 12dp between | 0, 16px between |

**Card Layout (top to bottom):**

#### Thumbnail Image

- **Dimensions:** Full card width × 140px height
- **Corner radius:** 8px top-left and top-right (matches card top corners); 0 on bottom (image bleeds to content area)
- **Object fit:** Cover (fills area, center-cropped)
- **Margin:** 0 (flush with card top edge, no padding)
- **Fallback (no photo uploaded):** Type-specific illustrated placeholder with subtle gradient:
  - Cultural: warm orange gradient + abstract dhaka textile silhouette
  - Religious: soft purple gradient + diya / flame silhouette
  - Social: green gradient + mountain + people silhouette
  - Career: blue gradient + handshake silhouette
  - Other: neutral gray gradient + calendar silhouette
- **Past events:** Image rendered at 60% opacity (desaturated + dimmed)
- **Loading state:** Shimmer skeleton bar of same 140px height

#### Content Padding (below image)

- Padding: 12px horizontal, 10px top, 12px bottom

#### Type Badge Row

- Event type pill (left-aligned): icon + type label
- Color-coded per type (see table above)
- 🌐 "Global" badge (right-aligned) if is_global = true — same blue badge as posts
- Height: 24px pill, 4px vertical padding
- Margin: 0 top (first element after image padding)

#### Title

- Bold, 17pt/16sp Semibold, #212121
- Max 2 lines, ellipsis if truncated
- Margin: 6px below badge row

#### Date/Time Row

- Icon: 📅 calendar icon, 16px, #757575
- Text format:
  - Single-day: "Sat, Aug 29 · 6:00 PM"
  - Multi-day: "Aug 29 – Sep 1"
  - Multi-day with time: "Sat, Aug 29, 6:00 PM – Sun, Aug 30, 2:00 PM"
- Typography: 14pt/13sp Regular, #424242
- Margin: 4px below title

#### Location Row

- Icon: 📍 pin, 16px, #757575
- Text: location_name only (address omitted from card; shown on detail screen)
- Typography: 14pt/13sp Regular, #424242
- Max 1 line, ellipsis if truncated
- Margin: 4px below date row

#### Organizer + RSVP Row

- Organizer: small avatar (24px circle) + masked name ("Asha K.") + ✓ trust badge (Level 1+)
  - Avatar: profile photo or initials, colored by trust level
  - Name: 13pt/12sp Regular, #757575
- RSVP count: "[N] going" — right-aligned
  - Typography: 13pt/12sp Regular, #757575
  - Past events: "[N] went" instead of "going"
- Layout: [Avatar] [Name] [✓] ........... [N going]
- Margin: 8px below location row

**Past Event Appearance:**

- Card background: #FAFAFA (slightly off-white)
- Thumbnail: 60% opacity
- Type badge: muted (50% opacity)
- Title: strikethrough or "Past" label appended
- RSVP count shows "N went" instead of "going"
- Tap still navigates to detail

**Interaction:**

- Tap anywhere on card (including thumbnail) → navigate to Event Detail screen
- No inline RSVP on card (RSVP is on detail screen only)

**a11y:**

- Full card: "Cultural event. Teej Festival 2026. Saturday August 29, 6:00 PM. Dallas Convention Center. By Asha K., verified. 34 going. Double-tap to view details."
- Thumbnail: decorative (role="presentation"); screen reader skips it

---

### 4. "Past Events" Section Divider

- Text: "Past Events" — #757575, 13pt/12sp Medium, uppercase
- 1px separator line on both sides
- Margin: 24px top, 12px bottom
- Tapping does nothing (not interactive)

---

### 5. Create Event Button (Header)

| Property | Value |
|----------|-------|
| **Label** | "+ Create Event" |
| **Style** | Primary filled (#1565C0) |
| **Height** | 36px / 36dp |
| **Corner Radius** | 18px (pill) |
| **Padding** | 16px horizontal |
| **Typography** | 14pt/13sp Semibold, white |

- Visible only for Level 1+ users
- Level 0 users: button not shown; "Events · [Metro]" takes full header width
- Tap → navigate to Create Event screen

---

### 6. Empty State Card

| Scenario | Illustration | Message | CTA |
|----------|-------------|---------|-----|
| No upcoming events (any type) | Mountain silhouette | "No upcoming events in [City]. Be the first!" | "Create an Event" (primary, Level 1+) |
| No events for active filter | Mountain silhouette | "No upcoming [Type] events" | "Clear Filter" (outline) |
| Level 0, no events | Mountain silhouette | "No upcoming events in [City]." | "Verify to Create Events" (primary) |

---

### 7. Level 0 Warning Banner

Same pattern as home screen Level 0 banner:

- Background: #FFF3E0 (Light Amber)
- Text: "Verify your phone to RSVP and create events."
- Inline "Verify Now" outline button
- Dismissible (session-scoped)
- Permanently hidden once Level 1

---

### 8. Bottom Navigation (Events Tab Active)

| Tab | Icon | Label | State |
|-----|------|-------|-------|
| Home | :home: | Home | Inactive |
| Post | :pencil: | Post | Inactive |
| **Events** | **:calendar:** | **Events** | **Active (#1565C0)** |
| Marketplace | :storefront: | Marketplace | Inactive |
| Profile | :user: | Profile | Inactive |

---

## Spacing & Layout (Mobile)

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Status bar / safe area | Auto | — |
| 2 | Header (Events + Create button) | 56px | — |
| 3 | Level 0 banner (if applicable) | 56px | — |
| 4 | Filter chip bar | 48px | — |
| 5 | Feed top padding | — | 12px |
| 6 | Event card (thumbnail 140px + content ~100px) | ~240px | 12px |
| 7 | Event card (thumbnail 140px + content ~100px) | ~240px | 12px |
| 8 | Past events divider | 32px | 12px |
| 9 | Past event card | ~120px | 12px |
| 10 | Bottom safe area + tab bar | 56px + safe | — |

**Feed background:** #F5F5F5 (matches home feed)

---

## User Interactions

### Primary Flow (Browse & Find Event)

1. User taps Events tab → sees upcoming events in their metro
2. User taps "Cultural" chip → list narrows to cultural events
3. User finds "Teej Festival 2026", taps card → navigates to Event Detail
4. On detail, user taps RSVP → confirms attendance

### Alternative Flow (Create Event, Level 1+)

1. User taps "Create Event" button in header
2. Navigates to Create Event form
3. Fills in details, submits
4. Navigated to new event's detail screen
5. Event appears in metro Events feed immediately

### Alternative Flow (Level 0 Attempts RSVP)

1. Level 0 user sees events list (no Create button, banner shown)
2. Taps event card → navigates to Event Detail
3. On detail, RSVP button shows "Verify to RSVP" prompt
4. Tap → navigates to verification flow

### Alternative Flow (Filter, No Results)

1. User taps "Career" chip
2. No career events in this metro
3. Empty state shown: "No upcoming Career events" + "Clear Filter" button
4. User taps "Clear Filter" → "All" chip reactivates, full list restores

### Alternative Flow (Premium Location Switch)

1. Premium user taps metro name in header (has ▼ chevron)
2. Location switcher sheet opens (reuses existing location-switcher component)
3. User selects "New York-Newark-Jersey City" (a saved location)
4. Events list reloads with NYC events
5. Header updates: "Events · New York-Newark-Jersey City"

---

## Platform-Specific Differences

| Aspect | iOS | Android | Web |
|--------|-----|---------|-----|
| **Filter UI** | Horizontal scroll chips | Horizontal scroll chips | Left sidebar radio group |
| **Navigation** | Bottom tab bar | Bottom tab bar | Top navigation |
| **Create button** | Pill button in header | Pill button in header | Prominent button in header |
| **Card shadow** | rgba shadow | elevation 2dp | box-shadow |
| **Pull-to-refresh** | Native iOS control | SwipeRefreshLayout | Not applicable (button) |
| **Location switcher** | Bottom sheet | Bottom sheet | Dropdown |
| **Event type chips** | Pill chips | Pill chips | Sidebar radio list |
| **Past events** | Inline divider + faded cards | Inline divider + faded cards | Separate section at bottom |

---

## Error States & Edge Cases

| Scenario | Behavior |
|----------|----------|
| No upcoming events in metro | Empty state: illustration + "No upcoming events in [City]. Be the first!" |
| Active filter yields no results | Empty state: "No upcoming [Type] events" + "Clear Filter" button |
| Network error on load | Error alert + "Retry" button; keep previous events if cached |
| User has no metro area set | Events tab shows "Set your location to see local events" + "Update Location" button |
| Event is cancelled | Card remains in list with "Cancelled" label overlaid on type badge |
| Past events section is empty | Do not render divider; only upcoming events shown |
| Very long event title | Max 2 lines, ellipsis on overflow; full title shown on detail screen |
| Very long metro name in header | Truncate with ellipsis; "..." for names > 22 chars |
| Level 0 user taps "Create Event" | Button is hidden entirely; no action needed |
| Premium user has no saved locations | Metro name not tappable (same as free user); location switcher not offered |
| Global event from another metro | Appears in any metro's feed; 🌐 badge displayed on card |
| Event with no photo | Type-specific illustrated placeholder shown at 140px height; card height consistent |

---

## Accessibility

### Screen Reader Order (Mobile)

1. "Events tab. Dallas-Fort Worth."
2. "Create event, button." (Level 1+ only)
3. "Level 0 warning banner..." (if applicable)
4. "Filter chips: All selected. Cultural. Religious. Career. More."
5. For each card: "Cultural event. Teej Festival 2026. Saturday August 29 at 6:00 PM. Dallas Convention Center. By Asha K., verified. 34 going. Double-tap to view details."
6. "Past Events section."
7. Past event cards (same pattern)

### Touch Targets

- Header buttons: 44×44pt / 48×48dp minimum
- Filter chips: 44×44pt minimum height, full pill width
- Event cards: Full card tappable (always exceeds minimum)
- Bottom nav tabs: Full tab width × 56px height

### Color Contrast (WCAG)

| Element | Foreground | Background | Ratio | Level |
|---------|-----------|-----------|-------|-------|
| Event title | #212121 | #FFFFFF | 16.9:1 | AAA ✓ |
| Date/location text | #424242 | #FFFFFF | 10.7:1 | AAA ✓ |
| Organizer name | #757575 | #FFFFFF | 4.6:1 | AA ✓ |
| Cultural badge text | #E65100 | #FFF3E0 | 4.5:1 | AA ✓ |
| Career badge text | #0D47A1 | #E3F2FD | 7.2:1 | AAA ✓ |
| Active chip text | #FFFFFF | #1565C0 | 7.2:1 | AAA ✓ |

---

## Animations & Transitions

| Step | Element | Delay | Duration | Effect |
|------|---------|-------|----------|--------|
| 1 | Screen enter | 0ms | 250ms | Fade in (from Events tab tap) |
| 2 | Event cards | 50ms stagger | 200ms | Fade in from bottom |
| 3 | Filter chip select | 0ms | 150ms | Fill with color, ease-in-out |
| 4 | Feed filter change | 0ms | 200ms | Crossfade (old out, new in) |
| 5 | Pull-to-refresh | 0ms | Native | Spinner + cards fade in |
| 6 | Card tap | 0ms | 100ms | Scale 0.98, darken |
| 7 | Past events divider | 150ms | 200ms | Fade in after upcoming events load |

---

## Content & Localization

### String Keys

| Key | Value |
|-----|-------|
| `events_header_title` | Events |
| `events_header_metro` | · {metro_name} |
| `events_create_btn` | + Create Event |
| `events_chip_all` | All |
| `events_chip_cultural` | 🎭 Cultural |
| `events_chip_religious` | 🛐 Religious |
| `events_chip_social` | 🤝 Social |
| `events_chip_career` | 💼 Career |
| `events_chip_other` | ⭐ Other |
| `events_chip_more` | More ▼ |
| `events_going_singular` | 1 going |
| `events_going_plural` | {n} going |
| `events_went_plural` | {n} went |
| `events_past_divider` | Past Events |
| `events_empty_metro` | No upcoming events in {city}. Be the first! |
| `events_empty_filter` | No upcoming {type} events |
| `events_empty_filter_cta` | Clear Filter |
| `events_empty_create_cta` | Create an Event |
| `events_error_network` | Could not load events. Check your connection and try again. |
| `events_level0_banner` | Verify your phone to RSVP and create events. |
| `events_level0_verify_btn` | Verify Now |

---

## Technical Notes

### Screen Identifiers

- Mobile route: `EventsScreen` (in HomeStack, already registered)
- Web route: `/events` (already exists as "Coming Soon" placeholder)

### State Management

```typescript
// EventsScreen state
{
  events: Event[];           // loaded from getEventsByMetro()
  filter: EventType | null;  // null = All
  isLoading: boolean;
  isRefreshing: boolean;
  hasError: boolean;
  userTrustLevel: 0 | 1 | 2;
  metroAreaId: string;
  metroName: string;
  isPremium: boolean;        // for location switcher visibility
}
```

### API Calls

- **On mount:** `getEventsByMetro(supabase, metroAreaId)` + `getGlobalEvents(supabase)`
- **On pull-to-refresh:** Same calls, clear cache first
- **On filter change:** Client-side filter — no API refetch needed (all events loaded upfront)
- **Pagination:** 20 events per page (use `limit` + `offset` params)

### Navigation

| Direction | Trigger | Destination |
|-----------|---------|-------------|
| Entry | Tap Events tab | This screen |
| Entry | App launch (events tab was last active) | This screen |
| Exit | Tap event card | EventDetailScreen / `/events/[id]` |
| Exit | Tap "Create Event" | CreateEventScreen / `/events/create` |
| Exit | Tap organizer avatar | PublicProfileScreen / `/users/[id]` |
| Exit | Tap "Verify Now" banner | Verification flow |
| Modal | Tap "More ▼" chip | Event type filter bottom sheet |
| Modal | Tap metro name (premium) | Location switcher sheet |

---

## Testing Checklist

### Functional Tests

- [ ] Events list loads upcoming events sorted chronologically
- [ ] Global events (is_global = true) appear with 🌐 badge
- [ ] "All" chip shows all upcoming events (local + global)
- [ ] Single-select filter chips work correctly (tapping Cultural shows only cultural events)
- [ ] "All" chip resets active type filter
- [ ] "More ▼" bottom sheet shows remaining types (Social, Other)
- [ ] Past events appear below "Past Events" divider (faded appearance)
- [ ] Pull-to-refresh reloads events list
- [ ] Empty state shows when no upcoming events
- [ ] Empty state shows when filter yields no results with "Clear Filter" CTA
- [ ] Network error shows retry option
- [ ] "Create Event" button visible for Level 1+ only
- [ ] Level 0 banner visible for Level 0 users (dismissible)
- [ ] Level 0 user can browse and tap cards (view detail only)
- [ ] Premium user sees tappable metro name (location switcher)
- [ ] Cancelled events show "Cancelled" indicator on card
- [ ] Web sidebar filter works equivalently to mobile chips

### Visual Tests

- [ ] Event type badges display correct color per type
- [ ] 🌐 Global badge displays on correct events
- [ ] Thumbnail image renders at full card width × 140px, cover-cropped
- [ ] Type-specific fallback illustration shown when event has no photo
- [ ] Past event thumbnails are visually muted (60% opacity)
- [ ] Past event cards are visually muted overall
- [ ] "Past Events" divider renders correctly
- [ ] Loading skeleton: thumbnail skeleton bar renders at correct height above text skeletons
- [ ] Filter chip active/inactive states match design
- [ ] Safe area insets respected on iOS
- [ ] Web layout: two-column sidebar + feed renders correctly with thumbnails

### Accessibility Tests

- [ ] VoiceOver/TalkBack reads all event cards in correct order
- [ ] Event type, title, date, location, organizer, RSVP count all announced
- [ ] Filter chips announce "selected" / "not selected" state
- [ ] All touch targets meet 44pt/48dp minimum
- [ ] Color contrast passes WCAG AA for all text

### Edge Case Tests

- [ ] Metro area with 0 upcoming events shows correct empty state
- [ ] Metro area with only past events — divider and past cards shown, no upcoming section
- [ ] Event with very long title truncates after 2 lines
- [ ] Event with no photo — card renders without image area, shorter height
- [ ] Global event from a different metro appears in local feed with 🌐 badge
- [ ] Cancelled event card shows "Cancelled" label
- [ ] User with no metro set sees location prompt, not empty feed

---

## Open Questions

- [ ] **Should cancelled events appear in the upcoming list with a "Cancelled" badge, or be excluded entirely?** → Rec: Show with "Cancelled" badge (organizer accountability, attendees can still see it)
- [ ] **Should RSVP count on card update in real-time (Supabase subscription) or on pull-to-refresh only?** → Rec: Pull-to-refresh only for MVP; real-time add later
- [ ] **On web, should the filter be a sidebar (desktop) or chips above the feed (mobile/tablet)?** → Rec: Sidebar ≥1024px wide, horizontal chips below 1024px (responsive breakpoint)

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Feature Spec | [events.md](../../product/features/events.md) |
| Next | Event Detail Screen (wireframe TBD) |
| Next | Create Event Screen (wireframe TBD) |
| Design System | [00-design-system-foundation.md](../00-design-system-foundation/00-design-system-foundation.md) |
| Reference | [06-home-screen-level-0.md](../06-home-screen-level-0/06-home-screen-level-0.md) — filter chip pattern |
| Reference | [13-location-switcher.md](../13-location-switcher/13-location-switcher.md) — premium location switcher |

---

**Status:** Draft — Ready for Review
