# Wireframe: Location Change Prompt

**Screen Number:** 12
**Journey Reference:** [01-location-permission-and-detection.md](../user-journeys/location/01-location-permission-and-detection.md) - Scenario C, Step 2
**Feature Reference:** [dynamic-location-management.md](../features/dynamic-location-management.md) - Features L.3, L.4, L.8
**User Story:** As a traveling user, I want the app to notice I'm in a different city and give me the option to browse local content or keep my home feed.
**Last Updated:** 2026-02-16
**Status:** Draft
**Platforms:** Mobile + Web

---

## Screen Purpose

A bottom sheet (mobile) or modal (web) that appears when the app detects the user is in a different metro area than their active location. Gives users three clear choices: browse temporarily, update permanently, or dismiss.

**Key Goals:**
- Inform user that a location mismatch was detected
- Provide clear, understandable options without jargon
- Allow snoozing to prevent prompt fatigue
- Not block app usage (user can dismiss and continue)

---

## Visual Layout

### Mobile Layout — Bottom Sheet

```
┌─────────────────────────────────────────┐
│                                         │
│           [Home Screen Feed]            │   ← Home screen visible
│           (dimmed overlay)              │     behind semi-transparent
│                                         │     overlay (rgba(0,0,0,0.4))
│                                         │
│                                         │
│                                         │
├─────────────────────────────────────────┤   ← Bottom sheet
│              ────────                   │     Handle bar: 40x4px
│                                         │     Rounded top corners: 16px
│         📍                              │     Background: white
│                                         │     Padding: 24px
│   It looks like you're in               │
│   Houston                               │   ← Headline
│                                         │     20px bold
│   Would you like to see community       │     Metro name in primary color
│   posts from this area?                 │
│                                         │   ← Body: 15px, text.secondary
│                                         │
│  ┌─────────────────────────────────┐    │   ← Primary action
│  │      Browse Houston             │    │     48px, primary bg
│  └─────────────────────────────────┘    │     "Browse [Detected Metro]"
│                                         │
│  ┌─────────────────────────────────┐    │   ← Secondary action
│  │    Update My Location           │    │     48px, outlined border
│  └─────────────────────────────────┘    │     Border: primary color
│                                         │     Text: primary color
│                                         │
│         Keep Dallas-Fort Worth          │   ← Tertiary action
│                                         │     Text link, 14px
│                                         │     "Keep [Current Metro]"
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │   ← Divider
│                                         │
│  ○ Don't ask again for 24 hours         │   ← Snooze checkbox
│                                         │     14px, text.secondary
│                                         │     Unchecked by default
└─────────────────────────────────────────┘
```

### Web Layout — Centered Modal

```
┌────────────────────────────────────────────────────────────────────────┐
│                        (dimmed overlay)                                 │
│                                                                        │
│              ┌────────────────────────────────────────┐                │
│              │                                    [X] │   ← Close btn │
│              │         📍                             │                │
│              │                                        │                │
│              │  It looks like you're in               │                │
│              │  Houston                               │                │
│              │                                        │                │
│              │  Would you like to see community       │                │
│              │  posts from this area?                 │                │
│              │                                        │                │
│              │  ┌──────────────────────────────────┐  │                │
│              │  │       Browse Houston             │  │                │
│              │  └──────────────────────────────────┘  │                │
│              │                                        │                │
│              │  ┌──────────────────────────────────┐  │                │
│              │  │     Update My Location           │  │                │
│              │  └──────────────────────────────────┘  │                │
│              │                                        │                │
│              │      Keep Dallas-Fort Worth            │                │
│              │                                        │                │
│              │  ── ── ── ── ── ── ── ── ── ── ── ──  │                │
│              │  ○ Don't ask again for 24 hours        │                │
│              │                                        │                │
│              └────────────────────────────────────────┘                │
│                        Max-width: 420px                                │
│                        Centered vertically & horizontally              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Bottom Sheet Container (Mobile)

| Property | Value |
|----------|-------|
| Background | `colors.white` |
| Border radius (top) | 16px |
| Padding | 24px horizontal, 20px top, 32px bottom (safe area aware) |
| Handle bar | 40px wide, 4px tall, `colors.border` color, centered, 8px from top |
| Overlay | `rgba(0,0,0,0.4)` |
| Animation | Slide up from bottom, 300ms ease-out |
| Dismissible | Swipe down or tap overlay to dismiss (same as "Keep [Current]") |

### Modal Container (Web)

| Property | Value |
|----------|-------|
| Background | `var(--color-surface)` |
| Border radius | `var(--radius-lg)` |
| Max width | 420px |
| Padding | 32px |
| Box shadow | `var(--shadow-lg)` |
| Close button | Top-right, 24x24px, `X` icon |
| Overlay | `rgba(0,0,0,0.4)`, click to dismiss |

### Location Pin Icon

| Property | Value |
|----------|-------|
| Icon | `location-sharp` (Ionicons) or custom map pin SVG |
| Size | 48px |
| Color | `colors.primary` (#1565C0) |
| Alignment | Left-aligned with text (mobile), centered (web) |
| Bottom margin | 16px |

### Headline

| Property | Value |
|----------|-------|
| Line 1 | "It looks like you're in" |
| Line 2 | "[Detected Metro Short Name]" — e.g., "Houston" |
| Font size | 20px |
| Font weight | Bold (700) for metro name, Regular (400) for "It looks like..." |
| Color | `colors.text.primary`, metro name in `colors.primary` |
| Bottom margin | 8px |

**Metro name display rule:** Use the first part of the metro name before the first hyphen. Examples:
- "Houston-The Woodlands-Sugar Land, TX" → "Houston"
- "Dallas-Fort Worth-Arlington, TX" → "Dallas-Fort Worth"
- "New York-Newark-Jersey City, NY" → "New York"

### Body Text

| Property | Value |
|----------|-------|
| Text | "Would you like to see community posts from this area?" |
| Font size | 15px |
| Color | `colors.text.secondary` |
| Bottom margin | 24px |

### Button — "Browse [Metro]" (Primary)

| Property | Value |
|----------|-------|
| Text | "Browse [Short Metro Name]" (e.g., "Browse Houston") |
| Component | `PrimaryButton` |
| Width | Full width |
| Height | 48px |
| Bottom margin | 12px |
| Icon (optional) | `navigate-outline` Ionicon, left of text |

### Button — "Update My Location" (Secondary/Outlined)

| Property | Value |
|----------|-------|
| Text | "Update My Location" |
| Width | Full width |
| Height | 48px |
| Background | Transparent |
| Border | 1.5px solid `colors.primary` |
| Text color | `colors.primary` |
| Font weight | Semibold (600) |
| Bottom margin | 16px |

### Link — "Keep [Current Metro]" (Tertiary)

| Property | Value |
|----------|-------|
| Text | "Keep [Current Short Metro Name]" (e.g., "Keep Dallas-Fort Worth") |
| Type | Text link, not button |
| Font size | 14px |
| Color | `colors.text.secondary` |
| Alignment | Center |
| Bottom margin | 20px |

### Divider

| Property | Value |
|----------|-------|
| Type | Dashed or thin solid line |
| Color | `colors.border` |
| Margin | 0px horizontal (full width of content area) |

### Snooze Checkbox

| Property | Value |
|----------|-------|
| Text | "Don't ask again for 24 hours" |
| Font size | 14px |
| Color | `colors.text.secondary` |
| Checkbox | 20x20px, unchecked by default, `colors.primary` when checked |
| Top margin | 16px below divider |
| Alignment | Left-aligned |

---

## Interactive States

### Action: "Browse [Metro]" tapped

```
System behavior:
1. Bottom sheet dismisses (slide down animation)
2. Home screen header updates: "[Metro Name]" + "(Visiting)" tag
3. Feed refreshes with posts from detected metro area
4. If snooze checkbox was checked → save snooze record
5. Set manual override flag (no more GPS prompts this session)

Visiting indicator on home screen:
┌─────────────────────────────────────────┐
│ Houston (Visiting) ▼   🔍  🔔          │ ← "(Visiting)" in lighter
│                                         │    color / smaller font
├─────────────────────────────────────────┤    next to metro name
```

### Action: "Update My Location" tapped

```
System behavior:
1. Bottom sheet content transitions to "Save Location" sub-view:

┌─────────────────────────────────────────┐
│              ────────                   │
│                                         │
│   ✅ Location Updated                   │  ← Success confirmation
│                                         │     Green checkmark
│   You're now viewing posts from         │
│   Houston-The Woodlands, TX             │
│                                         │
│   Save this as a named location?        │
│                                         │
│   ┌─────────────────────────────────┐   │  ← Name input
│   │ Houston                         │   │     Pre-filled with short
│   └─────────────────────────────────┘   │     metro name or next
│                                         │     default name
│   Suggested: Home  Work  School         │  ← Quick-fill chips
│                                         │     Tappable to fill input
│                                         │     Hide already-used names
│  ┌─────────────────────────────────┐    │
│  │          Save Location          │    │  ← Primary button
│  └─────────────────────────────────┘    │
│                                         │
│             Skip                        │  ← Text link
│                                         │     Updates metro but
│                                         │     doesn't save as named
└─────────────────────────────────────────┘

2. If user has 5 saved locations already:
   - Show: "You've reached the max of 5 locations."
   - "Manage Locations" link instead of save option
   - Metro is still updated in DB, just not saved as named location

3. If "Save Location" tapped:
   - Create entry in user_saved_locations
   - Dismiss bottom sheet
   - Feed refreshes with new metro
   - Set manual override flag

4. If "Skip" tapped:
   - Metro updated in DB (users.metro_area_id)
   - No saved location created
   - Dismiss bottom sheet
   - Feed refreshes
```

### Action: "Keep [Current]" tapped or sheet dismissed

```
System behavior:
1. Bottom sheet dismisses
2. Feed unchanged (stays on current metro)
3. If snooze checkbox was checked → save snooze record for detected metro
4. No manual override flag set (GPS will check again on next foreground)
```

---

## Permission Denied Reminder Banner

This is a separate component shown on the home screen when location permission was denied.

### Mobile Layout

```
┌─────────────────────────────────────────┐
│ Dallas-Fort Worth ▼      🔍  🔔        │ ← Header
├─────────────────────────────────────────┤
│ 📍 Enable location for a better     [X]│ ← Reminder banner
│    experience. [Turn On]                │   Light blue bg (#E3F2FD)
├─────────────────────────────────────────┤   Height: 52px
│ All  Housing  Jobs  Emergency  Travel   │   Location pin icon
│                                         │   "Turn On" is a bold link
│ [Feed content...]                       │   [X] dismiss button
```

### Web Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📍 Enable location for a better experience.  [Turn On]           [X] │
├────────────────────────────────────────────────────────────────────────┤
│ [Feed content...]                                                      │
```

### Banner Specifications

| Property | Value |
|----------|-------|
| Background | Light blue `#E3F2FD` (mobile), `var(--color-info-bg)` (web) |
| Height | 52px (mobile), 44px (web) |
| Icon | `location-outline` Ionicon, 18px, `colors.primary` |
| Text | "Enable location for a better experience." 14px, `colors.text.primary` |
| "Turn On" link | 14px, bold, `colors.primary`, underline on press |
| Close [X] | 20x20px, `colors.text.secondary`, 8px hitSlop |
| Position | Below header, above category tabs (mobile) / top of page (web) |
| Animation | Slide down on show, slide up on dismiss |

### Banner Logic

| Rule | Value |
|------|-------|
| First show | On first home screen visit after permission denied |
| After dismiss | Don't show again for 7 days |
| Max total shows | 3 (after 3rd dismissal, never show again) |
| Storage key | `location_reminder_dismiss_count`, `location_reminder_last_dismissed` |
| "Turn On" action (mobile) | `Linking.openSettings()` → opens app settings |
| "Turn On" action (web) | Re-triggers browser geolocation prompt |

---

## Accessibility

- Bottom sheet announced: "Location change detected" when opened
- All buttons have descriptive `accessibilityLabel`:
  - "Browse Houston temporarily"
  - "Update your home location to Houston"
  - "Keep Dallas-Fort Worth as your location"
- Snooze checkbox: "Don't ask again for 24 hours, checkbox, unchecked"
- Overlay tap to dismiss has `accessibilityLabel="Dismiss location prompt"`
- Web modal: Focus trapped inside modal, Escape key to dismiss
- Banner: "Turn On" has `aria-label="Open location settings"`

---

## Animation & Transitions

| Transition | Duration | Easing |
|------------|----------|--------|
| Bottom sheet slide up | 300ms | ease-out |
| Bottom sheet dismiss (slide down) | 250ms | ease-in |
| Overlay fade in | 200ms | linear |
| Content transition (to save sub-view) | 250ms | ease-in-out |
| Banner slide down (show) | 200ms | ease-out |
| Banner slide up (dismiss) | 150ms | ease-in |
| Web modal fade + scale in | 200ms | ease-out, scale 0.95→1.0 |
