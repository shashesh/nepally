# Wireframe: Location Switcher & Saved Locations

> **Screen:** 13 | **Status:** Draft | **Updated:** 2026-02-19
> **Journey:** [01-location-permission-and-detection](../../user-journeys/location/01-location-permission-and-detection.md) - Scenario D
> **Feature:** [dynamic-location-management](../../product/features/dynamic-location-management.md) - Features L.5, L.6
> **Story:** As a commuter with multiple locations, I want to quickly switch between my saved locations to view feeds from different metro areas.
> **Platforms:** Mobile + Web

---

## Screen Purpose + Key Goals

The location switcher is triggered by tapping the metro name in the home screen header. It provides quick access to saved locations, current GPS-detected location, and the ability to add/manage locations.

**Key Goals:**

- Enable fast switching between saved locations (1 tap)
- Show current GPS-detected location when it differs from active location
- Provide entry points to add new locations and manage existing ones
- Keep it lightweight — this is a quick-access panel, not a full screen

---

## Visual Wireframe

### Part 1: Home Screen Header (Modified)

::: nav
📍 Dallas-Fort Worth ▼ {.location-dropdown}
&nbsp;&nbsp;&nbsp;&nbsp;Home {.location-label}
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; 🔍 {.icon-button} &nbsp; 🔔 {.icon-button}
:::

---

#### Visiting State

::: nav
📍 Houston ▼ {.location-dropdown}
&nbsp;&nbsp;&nbsp;&nbsp;*Visiting* {.location-label .visiting}
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; 🔍 {.icon-button} &nbsp; 🔔 {.icon-button}
:::

---

#### Web Header

::: nav
**Nepally** &emsp; 📍 Dallas-Fort Worth ▼ {.location-dropdown}
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Home {.location-label}
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; [🔍 Search...___] &emsp; 🔔 {.icon-button} &nbsp; [Avatar]{.avatar}
:::

---

### Part 2: Location Switcher Bottom Sheet (Mobile)

::: modal
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;———— {.handle-bar}

**YOUR LOCATIONS** {.section-header}

::: card
⭐ **Home** &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; ✅
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Dallas-Fort Worth, TX
:::

::: card
&nbsp;&nbsp;&nbsp;&nbsp; **Work**
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Houston-The Woodlands, TX
:::

::: card
&nbsp;&nbsp;&nbsp;&nbsp; **School**
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Austin-Round Rock, TX
:::

---

**DETECTED LOCATION** {.section-header}

::: card {.detected}
📡 You're currently near
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**Phoenix-Mesa, AZ** &emsp;&emsp;&emsp;&emsp;&emsp;&emsp; →
:::

---

[＋ Add a Location]{.outline}

[Manage Locations]{.secondary}
:::

---

#### With Visiting State Active

::: modal
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;———— {.handle-bar}

**YOUR LOCATIONS** {.section-header}

::: card
⭐ **Home**
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Dallas-Fort Worth, TX
:::

::: card
&nbsp;&nbsp;&nbsp;&nbsp; **Work** &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; ✅
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Houston-The Woodlands, TX
:::

::: card {.return-highlight}
↩️ **Return to Dallas-Fort Worth**
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(Your home location)
:::
:::

---

### Part 3: Location Switcher Popover (Web)

::: card {.popover width="320px"}
**YOUR LOCATIONS** {.section-header}

---

⭐ **Home** &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; ✅
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Dallas-Fort Worth, TX

---

&nbsp;&nbsp;&nbsp;&nbsp; **Work**
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Houston, TX

---

&nbsp;&nbsp;&nbsp;&nbsp; **School**
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Austin, TX

---

**DETECTED LOCATION** {.section-header}

---

📡 **Phoenix-Mesa, AZ** &emsp;&emsp;&emsp;&emsp; →

---

[＋ Add a Location]{.outline}
[⚙️ Manage Locations]{.secondary}
:::

> **Popover Specs:** Width: 320px | Position: Below header, left-aligned with location text | Border: 1px solid var(--color-border) | Shadow: var(--shadow-md) | Border-radius: var(--radius-lg)

---

### Part 4: Add Location Screen / Modal

#### Mobile — Search State (Full Screen)

::: nav
← &emsp; **Add a Location**
:::

::: card
Search by metro name or ZIP code {.label}

[🔍 Search...___]

---

::: card
Boston-Cambridge-Newton, MA
:::

::: card
Boise City, ID
:::
:::

---

#### Mobile — After Selecting a Metro

::: nav
← &emsp; **Add a Location**
:::

::: card
📍 **Boston-Cambridge-Newton, MA** {.selected-metro}

Name this location {.label}

[Mom's Place___]

Suggestions:
[Home]{.outline} &nbsp; [Work]{.outline} &nbsp; [School]{.outline} &nbsp; [Family]{.outline}

[Save Location]*
:::

---

#### Web Layout

> Same flow rendered in a **480px wide modal** with close button (✕ top-right).

---

### Part 5: Manage Locations Screen / Modal

#### Mobile Layout (Full Screen)

::: nav
← &emsp; **Manage Locations** &emsp;&emsp;&emsp;&emsp;&emsp; 3 of 5
:::

::: card
⭐ **Home** &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; ✏️
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Dallas-Fort Worth, TX
:::

::: card
&nbsp;&nbsp;&nbsp;&nbsp; **Work** &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; ✏️ &nbsp; 🗑️
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Houston, TX
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Set as default]{.secondary}
:::

::: card
&nbsp;&nbsp;&nbsp;&nbsp; **School** &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; ✏️ &nbsp; 🗑️
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Austin, TX
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Set as default]{.secondary}
:::

[＋ Add a Location]{.outline}

---

#### Delete Confirmation

::: modal
**Remove "Work"?**

Houston-The Woodlands, TX will be removed from your saved locations.

[Cancel]{.outline} &emsp; [Remove]{.destructive}
:::

---

#### Web Layout

> Same structure rendered as a **modal (max-width: 520px)**.

---

## Component Specifications

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

| Element | Specification |
|---------|--------------|
| "Visiting" label | 12px, italic, `colors.warning` (#F57C00) |
| Meaning | Browsing temporarily (not saved, session-only) |

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

---

## Interactive States

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

**Confirmation alert (mobile):** See delete confirmation modal in wireframe above.

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

| From | Action | Destination |
|------|--------|-------------|
| Home Screen Header | Tap metro name | Location Switcher (bottom sheet / popover) |
| Location Switcher | Tap saved location | Switch feed immediately |
| Location Switcher | Tap detected location | Location Change Prompt ([wireframe 12](../12-location-change-prompt/12-location-change-prompt.md)) |
| Location Switcher | Tap "Add a Location" | Add Location Screen/Modal |
| Add Location | Search metro → Select → Name → Save | Return to switcher |
| Add Location | Back / Cancel | Return to switcher |
| Location Switcher | Tap "Manage Locations" | Manage Locations Screen/Modal |
| Manage Locations | Rename | Inline edit |
| Manage Locations | Delete | Confirmation → Remove |
| Manage Locations | Set default | Update default |
| Manage Locations | Back | Return to switcher |
| Location Switcher | Tap overlay / swipe down | Dismiss switcher |

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

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Previous | [06-home-screen-level-0.md](../06-home-screen-level-0/06-home-screen-level-0.md) (header trigger) |
| Related | [11-location-permission-screen.md](../11-location-permission-screen/11-location-permission-screen.md) |
| Related | [12-location-change-prompt.md](../12-location-change-prompt/12-location-change-prompt.md) |
| Journey | [01-location-permission-and-detection](../../user-journeys/location/01-location-permission-and-detection.md) |
