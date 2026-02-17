# Wireframe: Location Switcher & Saved Locations

**Screen Number:** 13
**Journey Reference:** [01-location-permission-and-detection.md](../user-journeys/location/01-location-permission-and-detection.md) - Scenario D
**Feature Reference:** [dynamic-location-management.md](../features/dynamic-location-management.md) - Features L.5, L.6
**User Story:** As a commuter with multiple locations, I want to quickly switch between my saved locations to view feeds from different metro areas.
**Last Updated:** 2026-02-16
**Status:** Draft
**Platforms:** Mobile + Web

---

## Screen Purpose

The location switcher is triggered by tapping the metro name in the home screen header. It provides quick access to saved locations, current GPS-detected location, and the ability to add/manage locations.

**Key Goals:**
- Enable fast switching between saved locations (1 tap)
- Show current GPS-detected location when it differs from active location
- Provide entry points to add new locations and manage existing ones
- Keep it lightweight — this is a quick-access panel, not a full screen

---

## Part 1: Home Screen Header (Modified)

### Current Header (before this feature)

```
┌─────────────────────────────────────────┐
│ Dallas-Fort Worth ▼      🔍  🔔        │
```

### Updated Header

```
┌─────────────────────────────────────────┐
│ 📍 Dallas-Fort Worth ▼   🔍  🔔       │
│    Home                                 │
└─────────────────────────────────────────┘
```

### Header Specifications

| Element | Specification |
|---------|--------------|
| Location pin icon | `location` Ionicon, 16px, `colors.primary` |
| Metro name | 17px, semibold, `colors.text.primary`, truncate at 22 chars with "..." |
| Dropdown arrow | `chevron-down` Ionicon, 14px, `colors.text.secondary` |
| Saved name label | 12px, regular, `colors.text.secondary` (shows "Home", "Work", etc.) |
| Tappable area | Entire left section (pin + name + arrow + label) |
| Press state | Background highlight `rgba(0,0,0,0.05)`, 4px border radius |

### Visiting State

```
┌─────────────────────────────────────────┐
│ 📍 Houston ▼              🔍  🔔       │
│    Visiting                             │
└─────────────────────────────────────────┘
```

| Element | Specification |
|---------|--------------|
| "Visiting" label | 12px, italic, `colors.warning` (#F57C00) |
| Meaning | Browsing temporarily (not saved, session-only) |

### Web Header

```
┌────────────────────────────────────────────────────────────────────────┐
│ NUSA    📍 Dallas-Fort Worth ▼    🔍 Search...     🔔  [Avatar]      │
│              Home                                                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Location Switcher Bottom Sheet (Mobile)

### Layout

```
┌─────────────────────────────────────────┐
│           [Home Screen — dimmed]        │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│              ────────                   │   ← Handle bar
│                                         │
│   Your Locations                        │   ← Section header
│                                         │     14px caps, text.secondary
│  ┌─────────────────────────────────┐    │
│  │ ⭐ Home                         │    │   ← Saved location item
│  │    Dallas-Fort Worth, TX    ✓   │    │     Star = default
│  └─────────────────────────────────┘    │     Checkmark = active
│  ┌─────────────────────────────────┐    │
│  │    Work                         │    │   ← Saved location item
│  │    Houston-The Woodlands, TX    │    │     No checkmark = inactive
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │    School                       │    │
│  │    Austin-Round Rock, TX        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │   ← Divider
│                                         │
│   Detected Location                    │   ← Section header
│                                         │     Only shown if GPS
│  ┌─────────────────────────────────┐    │     permission granted AND
│  │ 📡 You're currently near        │    │     detected differs from
│  │    Phoenix-Mesa, AZ       →     │    │     active location
│  └─────────────────────────────────┘    │
│                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │   ← Divider
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ＋  Add a Location              │    │   ← Add button
│  └─────────────────────────────────┘    │     Hidden if 5 locations
│                                         │
│      Manage Locations                   │   ← Link
│                                         │     Opens management screen
└─────────────────────────────────────────┘
```

### With Visiting State Active

When browsing a temporary location (non-saved), show a "Return" option:

```
│   Your Locations                        │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ⭐ Home                         │    │
│  │    Dallas-Fort Worth, TX        │    │   ← Not active (no check)
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │    Work                         │    │
│  │    Houston-The Woodlands, TX ✓  │    │   ← Active (visiting)
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ↩️  Return to Dallas-Fort Worth │    │   ← Return to default
│  │    (Your home location)         │    │     Blue bg highlight
│  └─────────────────────────────────┘    │
```

---

## Part 3: Location Switcher Popover (Web)

### Layout

```
       📍 Dallas-Fort Worth ▼
       ┌────────────────────────────────┐
       │                                │
       │  YOUR LOCATIONS                │
       │  ──────────────────────────── │
       │  ⭐ Home                       │
       │     Dallas-Fort Worth, TX  ✓  │
       │  ──────────────────────────── │
       │     Work                       │
       │     Houston, TX               │
       │  ──────────────────────────── │
       │     School                     │
       │     Austin, TX                │
       │  ──────────────────────────── │
       │                                │
       │  DETECTED LOCATION             │
       │  ──────────────────────────── │
       │  📡 Phoenix-Mesa, AZ     →    │
       │  ──────────────────────────── │
       │                                │
       │  ＋ Add a Location             │
       │  ⚙️ Manage Locations           │
       │                                │
       └────────────────────────────────┘
         Width: 320px
         Position: Below header, left-aligned with location text
         Border: 1px solid var(--color-border)
         Shadow: var(--shadow-md)
         Border-radius: var(--radius-lg)
```

---

## Component Specifications

### Saved Location Item

| Property | Value |
|----------|-------|
| Height | 60px |
| Padding | 16px horizontal, 12px vertical |
| Background | `colors.white` (default), `colors.background` on press |
| Border bottom | 1px solid `colors.border` (between items, not on last) |

| Sub-element | Specification |
|-------------|--------------|
| Star icon (default) | `star` Ionicon, 16px, `colors.warning` (#F57C00), left side |
| Location name | 16px, semibold, `colors.text.primary` |
| Metro area name | 13px, regular, `colors.text.secondary` |
| Active checkmark | `checkmark-circle` Ionicon, 20px, `colors.primary`, right side |
| Tappable | Entire row — tapping switches active location |

### Detected Location Item

| Property | Value |
|----------|-------|
| Height | 60px |
| Background | Light blue tint `#E8F0FE` |
| Icon | `radio-outline` or `navigate` Ionicon, 18px, `colors.primary` |
| Label line 1 | "You're currently near" — 12px, `colors.text.secondary` |
| Label line 2 | Metro name — 15px, semibold, `colors.primary` |
| Arrow | `chevron-forward` Ionicon, 18px, `colors.text.secondary`, right side |
| Tappable | Entire row — triggers location change prompt (L.4) or direct switch |
| Visibility | Only when GPS detected metro differs from active metro |

### Add a Location Button

| Property | Value |
|----------|-------|
| Height | 48px |
| Icon | `add-circle-outline` Ionicon, 20px, `colors.primary` |
| Text | "Add a Location" — 15px, `colors.primary` |
| Background | Transparent |
| Press state | Background `#E8F0FE` |
| Visibility | Hidden if user has 5 saved locations |

### Manage Locations Link

| Property | Value |
|----------|-------|
| Text | "Manage Locations" — 14px, `colors.text.secondary` |
| Alignment | Center |
| Press state | Underline |
| Top margin | 8px |
| Bottom margin | 16px (with safe area padding on mobile) |

---

## Part 4: Add Location Screen / Modal

### Mobile Layout (Full Screen)

```
┌─────────────────────────────────────────┐
│ ← Add a Location                        │   ← Navigation header
├─────────────────────────────────────────┤     Back arrow + title
│                                         │
│  Search by metro name or ZIP code       │   ← Label
│  ┌─────────────────────────────────┐    │
│  │ 🔍  Search...                   │    │   ← Search input
│  └─────────────────────────────────┘    │     48px height
│                                         │     Auto-focus, keyboard up
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                         │
│  [Search results appear here]           │
│                                         │
│  ┌─────────────────────────────────┐    │   ← Result item
│  │  Boston-Cambridge-Newton, MA    │    │     Tappable
│  └─────────────────────────────────┘    │     Shows full metro name
│  ┌─────────────────────────────────┐    │
│  │  Boise City, ID                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

### After Selecting a Metro

```
┌─────────────────────────────────────────┐
│ ← Add a Location                        │
├─────────────────────────────────────────┤
│                                         │
│  📍 Boston-Cambridge-Newton, MA         │   ← Selected metro (fixed)
│                                         │
│  Name this location                     │   ← Label
│  ┌─────────────────────────────────┐    │
│  │  Mom's Place                    │    │   ← Name input
│  └─────────────────────────────────┘    │     Pre-filled with next
│                                         │     available default name
│  Suggestions:                           │
│  [Home] [Work] [School] [Family]        │   ← Quick-fill chips
│                                         │     Hide already-used names
│                                         │     Tapping fills the input
│                                         │
│  ┌─────────────────────────────────┐    │
│  │       Save Location             │    │   ← Primary button
│  └─────────────────────────────────┘    │     Disabled if name empty
│                                         │
└─────────────────────────────────────────┘
```

### Web Layout (Modal)

Same flow but in a 480px wide modal with close button.

### Search Specifications

| Property | Value |
|----------|-------|
| Input | Standard text input, 48px height, magnifying glass icon |
| Debounce | 300ms after typing stops |
| Min query length | 2 characters before searching |
| API call | `searchMetroAreas(supabase, query)` |
| Result item height | 48px |
| Max results shown | 10 |
| ZIP code search | If input is 5 digits, look up `getMetroByZip()` directly |
| Empty state | "No metro areas found for '[query]'" |
| Error state | "Search failed. Please try again." |

### Name Input Specifications

| Property | Value |
|----------|-------|
| Max length | 30 characters |
| Validation | Not empty, not duplicate of existing saved name |
| Error | "You already have a location named '[name]'" (shown inline) |
| Default value | Next available from: Home, Work, School, Family, Other |

### Suggestion Chips

| Property | Value |
|----------|-------|
| Display | Horizontal scroll row |
| Chip style | Rounded pill, border `colors.border`, 32px height, 12px horizontal padding |
| Chip text | 13px, `colors.text.primary` |
| Active state (tapped) | `colors.primary` bg, white text |
| Hidden chips | Names already used in saved locations |

---

## Part 5: Manage Locations Screen / Modal

### Mobile Layout (Full Screen)

```
┌─────────────────────────────────────────┐
│ ← Manage Locations          3 of 5     │   ← Header with count
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ⭐ Home                    ✏️   │    │   ← Default location
│  │    Dallas-Fort Worth, TX        │    │     Star = default
│  │                                 │    │     Edit icon (rename)
│  └─────────────────────────────────┘    │     No delete (is default)
│                                         │
│  ┌─────────────────────────────────┐    │
│  │    Work               ✏️  🗑️   │    │   ← Non-default location
│  │    Houston, TX                  │    │     Edit + Delete icons
│  │         Set as default          │    │     "Set as default" link
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │    School             ✏️  🗑️   │    │
│  │    Austin, TX                   │    │
│  │         Set as default          │    │
│  └─────────────────────────────────┘    │
│                                         │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ＋  Add a Location             │    │   ← Add button
│  └─────────────────────────────────┘    │     Hidden at 5 locations
│                                         │
└─────────────────────────────────────────┘
```

### Web Layout

Same structure rendered as a modal (max-width: 520px).

### Manage Location Item Specifications

| Element | Specification |
|---------|--------------|
| Default star | `star` Ionicon, 18px, `colors.warning` (#F57C00) — only on default |
| Name | 16px, semibold, `colors.text.primary` |
| Metro name | 13px, regular, `colors.text.secondary` |
| Edit button | `create-outline` Ionicon, 20px, `colors.text.secondary` |
| Delete button | `trash-outline` Ionicon, 20px, `colors.error` |
| "Set as default" | 12px, `colors.primary`, underline on press |
| Row height | 72px (with "Set as default"), 56px (default location) |
| Separator | 1px `colors.border` |

### Edit (Rename) Flow

**Trigger:** Tap edit icon on a saved location

**Inline edit:**
- Name text becomes an editable input (same position)
- Keyboard opens (mobile) / input focuses (web)
- Save on blur or Enter key
- Cancel on Escape key (web)
- Validation: not empty, not duplicate

### Delete Flow

**Trigger:** Tap delete icon

**Confirmation alert (mobile):**
```
┌────────────────────────────┐
│  Remove "Work"?            │
│                            │
│  Houston-The Woodlands, TX │
│  will be removed from your │
│  saved locations.          │
│                            │
│  [Cancel]    [Remove]      │
└────────────────────────────┘
```

**Rules:**
- Cannot delete the default location (delete icon hidden/disabled)
- Cannot delete if only 1 location remains
- If deleting the currently active (non-default) location: switch feed to default
- After deletion, count updates ("2 of 5")

### Set as Default Flow

**Trigger:** Tap "Set as default" link

**System behavior:**
- Previous default loses star, gains "Set as default" link
- New default gains star, loses "Set as default" link
- Database: old default `is_default = false`, new default `is_default = true`
- If user's active metro was the old default, no feed change
- Visual update is immediate (optimistic)

---

## Navigation Map

```
Home Screen Header (tap metro name)
    │
    ▼
Location Switcher (bottom sheet / popover)
    │
    ├── Tap saved location ──► Switch feed immediately
    │
    ├── Tap detected location ──► Location Change Prompt (wireframe 12)
    │
    ├── Tap "Add a Location" ──► Add Location Screen/Modal
    │       │
    │       ├── Search metro ──► Select ──► Name input ──► Save
    │       │
    │       └── Back / Cancel ──► Return to switcher
    │
    ├── Tap "Manage Locations" ──► Manage Locations Screen/Modal
    │       │
    │       ├── Rename ──► Inline edit
    │       ├── Delete ──► Confirmation ──► Remove
    │       ├── Set default ──► Update default
    │       └── Back ──► Return to switcher
    │
    └── Tap overlay / swipe down ──► Dismiss switcher
```

---

## Accessibility

- Header location area: `accessibilityLabel="Current location: Dallas-Fort Worth, Home. Tap to switch locations"`, `accessibilityRole="button"`
- Saved location items: `accessibilityLabel="[Name], [Metro]. Tap to switch"`, `accessibilityRole="button"`
- Active location item: `accessibilityLabel="[Name], [Metro], currently active"`
- Default star: `accessibilityLabel="Default location"`
- "Add a Location": `accessibilityLabel="Add a new saved location"`
- Delete button: `accessibilityLabel="Remove [Name] from saved locations"`
- Edit button: `accessibilityLabel="Rename [Name]"`
- Web popover: Focus trapped, Escape to close, arrow keys to navigate items
- Screen reader announces location change: "Switched to [Metro Name]"
