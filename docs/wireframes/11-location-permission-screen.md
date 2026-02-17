# Wireframe: Location Permission Screen

**Screen Number:** 11
**Journey Reference:** [01-location-permission-and-detection.md](../user-journeys/location/01-location-permission-and-detection.md) - Scenario A, Step 1
**Feature Reference:** [dynamic-location-management.md](../features/dynamic-location-management.md) - Feature L.1
**User Story:** As a new user, I want to understand why the app needs my location before being asked for permission, so I feel informed and comfortable granting access.
**Last Updated:** 2026-02-16
**Status:** Draft
**Platforms:** Mobile + Web

---

## Screen Purpose

This is a custom pre-permission screen shown before the native OS location dialog. It explains why NUSA needs location access in plain, reassuring language. Shown only once (first app launch, before onboarding). This is NOT the native OS dialog — it's a branded screen that prepares the user.

**Key Goals:**
- Build trust by explaining location usage transparently
- Increase permission grant rate (users who understand "why" grant more often)
- Provide a clear opt-out path ("Not Now") that doesn't block onboarding
- Set the tone for the app experience (community-first, privacy-respectful)

---

## Visual Layout

### Mobile Layout (iOS / Android)

```
┌─────────────────────────────────────────┐
│                                         │
│              [Status Bar]               │
│                                         │
│                                         │
│                                         │
│                                         │
│            ┌───────────────┐            │
│            │               │            │   ← Illustration area
│            │   📍🗺️        │            │     160x160px
│            │  Map Pin      │            │     Centered
│            │  Illustration  │            │     (community map graphic
│            │               │            │      or location pin with
│            └───────────────┘            │      people icons)
│                                         │
│                                         │
│     NUSA works best with                │   ← Headline
│        your location                    │     28px, bold, centered
│                                         │     Color: text.primary
│                                         │
│     We use your location to show you    │   ← Body text
│     community posts, housing, jobs,     │     16px, regular, centered
│     and events near you.                │     Color: text.secondary
│                                         │     Max-width: 300px
│     Your exact location is never        │     Line-height: 24px
│     shared — we only use it to          │
│     determine your metro area.          │
│                                         │
│                                         │
│                                         │
│  ┌─────────────────────────────────┐    │   ← Primary CTA
│  │        Enable Location          │    │     48px height, full width
│  └─────────────────────────────────┘    │     Primary color bg (#1565C0)
│                                         │     White text, 16px semibold
│                                         │     Horizontal padding: 24px
│            Not Now                      │   ← Secondary CTA
│                                         │     Text link, 14px
│                                         │     Color: text.secondary
│                                         │     Underline on press
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

### Web Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Nav bar]                                                              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                    ┌──────────────────────────────┐                    │
│                    │                              │                    │
│                    │        📍🗺️                   │                    │
│                    │   Map Pin Illustration       │                    │
│                    │                              │                    │
│                    │                              │                    │
│                    │  NUSA works best with        │                    │
│                    │     your location            │                    │
│                    │                              │                    │
│                    │  We use your location to     │                    │
│                    │  show you community posts,   │                    │
│                    │  housing, jobs, and events   │                    │
│                    │  near you.                   │                    │
│                    │                              │                    │
│                    │  Your exact location is      │                    │
│                    │  never shared — we only use  │                    │
│                    │  it to determine your metro  │                    │
│                    │  area.                       │                    │
│                    │                              │                    │
│                    │  ┌────────────────────────┐  │                    │
│                    │  │   Enable Location      │  │                    │
│                    │  └────────────────────────┘  │                    │
│                    │                              │                    │
│                    │       Not Now                │                    │
│                    │                              │                    │
│                    └──────────────────────────────┘                    │
│                         Max-width: 440px                               │
│                         Centered card with shadow                      │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Illustration

| Property | Value |
|----------|-------|
| Size | 160x160px (mobile), 140x140px (web) |
| Type | Static image or Lottie animation |
| Content | Map pin with community/people theme |
| Alignment | Center |
| Top margin | 80px from top of safe area (mobile), 40px from card top (web) |

### Headline

| Property | Value |
|----------|-------|
| Text | "NUSA works best with your location" |
| Font size | 28px (mobile), 24px (web) |
| Font weight | Bold (700) |
| Color | `colors.text.primary` |
| Alignment | Center |
| Top margin | 32px below illustration |
| Max width | 280px (to force 2-line wrapping for readability) |

### Body Text

| Property | Value |
|----------|-------|
| Text | See layout above (2 paragraphs) |
| Font size | 16px (mobile), 15px (web) |
| Font weight | Regular (400) |
| Color | `colors.text.secondary` |
| Alignment | Center |
| Line height | 24px |
| Top margin | 16px below headline |
| Max width | 300px (mobile), 360px (web) |

### Privacy Assurance Line

| Property | Value |
|----------|-------|
| Text | "Your exact location is never shared — we only use it to determine your metro area." |
| Visual treatment | Same style as body text but could have a 🔒 lock icon prefix |
| Purpose | Address the #1 concern users have about location permissions |

### Primary Button — "Enable Location"

| Property | Value |
|----------|-------|
| Text | "Enable Location" |
| Uses | `PrimaryButton` component (existing) |
| Width | Full width minus 48px horizontal padding |
| Height | 48px |
| Bottom margin | 16px above "Not Now" |
| Position | ~80px from bottom of screen (above "Not Now") |
| Icon (optional) | `location-outline` Ionicon, 20px, white, left of text |

### Secondary Link — "Not Now"

| Property | Value |
|----------|-------|
| Text | "Not Now" |
| Type | Text link (not a button) |
| Font size | 14px |
| Color | `colors.text.secondary` |
| Alignment | Center |
| Bottom margin | 40px from bottom of safe area |
| Press state | Underline + slightly darker color |

---

## Interactive States

### Loading State (after "Enable Location" tapped)

```
┌─────────────────────────────────────────┐
│                                         │
│            [Same layout]                │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     ⏳ Getting your location... │    │   ← Button shows spinner
│  └─────────────────────────────────┘    │     + loading text
│                                         │     Button disabled
│            Not Now                      │     "Not Now" still active
│                                         │
└─────────────────────────────────────────┘
```

- After "Enable Location" is tapped, the native OS dialog appears ON TOP of this screen
- If user grants permission: button changes to spinner + "Getting your location..."
- GPS fetch has a 10-second timeout
- On success: auto-navigate to MetroConfirmationScreen (pre-filled)
- On timeout/failure: navigate to ZipCodeEntryScreen with toast: "We couldn't detect your location. Please enter your ZIP code."

### Error State (GPS failed)

```
┌─────────────────────────────────────────┐
│                                         │
│            [Same layout]                │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │   ⚠️ Couldn't detect location   │    │   ← Error toast
│  │   Enter your ZIP code instead   │    │     Appears above button
│  └─────────────────────────────────┘    │     Red-orange bg (#FFF3E0)
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      Continue with ZIP Code     │    │   ← Button text changes
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Navigation

| Action | Destination |
|--------|-------------|
| "Enable Location" → permission granted → GPS success | MetroConfirmationScreen (pre-filled with detected metro) |
| "Enable Location" → permission granted → GPS timeout/fail | ZipCodeEntryScreen (with toast message) |
| "Enable Location" → permission denied by user | ZipCodeEntryScreen (standard flow) |
| "Not Now" | WelcomeScreen (existing onboarding start) |

---

## Accessibility

- Screen reader: Reads headline, body text, then buttons in order
- "Enable Location" button has `accessibilityLabel="Enable location access"`
- "Not Now" link has `accessibilityLabel="Skip location access, enter ZIP code manually"`
- Illustration has `accessibilityLabel="Map illustration"` (decorative, not critical)
- High contrast: All text meets WCAG AA contrast ratios on white background

---

## Platform Notes

### iOS
- Requests `requestForegroundPermissionsAsync()` from `expo-location`
- Permission options: "Allow While Using App" / "Don't Allow"
- If previously denied, "Enable Location" opens iOS Settings via `Linking.openSettings()`

### Android
- Requests `ACCESS_FINE_LOCATION` permission
- Permission options: "While using the app" / "Only this time" / "Don't allow"
- "Don't allow" twice triggers "Don't ask again" — subsequent taps open App Info settings

### Web
- Triggers `navigator.geolocation.getCurrentPosition()`
- Browser shows its own permission bar
- No custom pre-permission screen on web (browser handles it)
- Instead, show an inline banner on the feed page: "Allow location for the best experience"
