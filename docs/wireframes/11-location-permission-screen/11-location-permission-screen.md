# Wireframe: Location Permission Screen

> **Screen:** 11 | **Status:** Draft | **Updated:** 2026-02-19
> **Journey:** [01-location-permission-and-detection](../../user-journeys/location/01-location-permission-and-detection.md) - Scenario A, Step 1
> **Feature:** [dynamic-location-management](../../product/features/dynamic-location-management.md) - Feature L.1
> **Story:** As a new user, I want to understand why the app needs my location before being asked for permission, so I feel informed and comfortable granting access.
> **Platforms:** Mobile + Web

---

## Screen Purpose

This is a custom pre-permission screen shown before the native OS location dialog. It explains why Nepally needs location access in plain, reassuring language. Shown only once (first app launch, before onboarding). This is NOT the native OS dialog — it's a branded screen that prepares the user.

**Key Goals:**
- Build trust by explaining location usage transparently
- Increase permission grant rate (users who understand "why" grant more often)
- Provide a clear opt-out path ("Not Now") that doesn't block onboarding
- Set the tone for the app experience (community-first, privacy-respectful)

---

## Visual Wireframe

### Mobile Layout (iOS / Android)

::: hero
![Map Pin Illustration](assets/location-map-pin.png)

# Nepally works best with your location

We use your location to show you community posts, housing, jobs, and events near you.

🔒 Your exact location is never shared — we only use it to determine your metro area.

[Enable Location]*

[Not Now]{.secondary}
:::

---

### Web Layout

::: card
![Map Pin Illustration](assets/location-map-pin.png)

# Nepally works best with your location

We use your location to show you community posts, housing, jobs, and events near you.

🔒 Your exact location is never shared — we only use it to determine your metro area.

[Enable Location]*

[Not Now]{.secondary}
:::

> Card: max-width 440px, centered, with shadow

---

### Loading State (after "Enable Location" tapped)

::: hero
![Map Pin Illustration](assets/location-map-pin.png)

# Nepally works best with your location

We use your location to show you community posts, housing, jobs, and events near you.

🔒 Your exact location is never shared — we only use it to determine your metro area.

[⏳ Getting your location...]{state:disabled}

[Not Now]{.secondary}
:::

---

### Error State (GPS failed)

::: alert warning
:warning: **Couldn't detect location**
Enter your ZIP code instead.
:::

::: hero
![Map Pin Illustration](assets/location-map-pin.png)

# Nepally works best with your location

We use your location to show you community posts, housing, jobs, and events near you.

🔒 Your exact location is never shared — we only use it to determine your metro area.

[Continue with ZIP Code]*
:::

---

## Component Specifications

### 1. Illustration

| Property | Value |
|----------|-------|
| **Size** | 160×160px (mobile), 140×140px (web) |
| **Type** | Static image or Lottie animation |
| **Content** | Map pin with community/people theme |
| **Alignment** | Center |
| **Top margin** | 80px from top of safe area (mobile), 40px from card top (web) |
| **a11y** | `accessibilityLabel="Map illustration"` (decorative) |

---

### 2. Headline

| Property | Value |
|----------|-------|
| **Text** | "Nepally works best with your location" |
| **Font size** | 28px (mobile), 24px (web) |
| **Font weight** | Bold (700) |
| **Color** | `colors.text.primary` |
| **Alignment** | Center |
| **Top margin** | 32px below illustration |
| **Max width** | 280px (to force 2-line wrapping for readability) |
| **Semantic** | H1 |

---

### 3. Body Text

| Property | Value |
|----------|-------|
| **Text** | "We use your location to show you community posts, housing, jobs, and events near you." |
| **Font size** | 16px (mobile), 15px (web) |
| **Font weight** | Regular (400) |
| **Color** | `colors.text.secondary` |
| **Alignment** | Center |
| **Line height** | 24px |
| **Top margin** | 16px below headline |
| **Max width** | 300px (mobile), 360px (web) |

---

### 4. Privacy Assurance Line

| Property | Value |
|----------|-------|
| **Text** | "Your exact location is never shared — we only use it to determine your metro area." |
| **Font size** | 16px (mobile), 15px (web) |
| **Font weight** | Regular (400) |
| **Color** | `colors.text.secondary` |
| **Icon** | 🔒 lock icon prefix |
| **Purpose** | Address the #1 concern users have about location permissions |

---

### 5. Primary Button — "Enable Location"

| Property | Value |
|----------|-------|
| **Text** | "Enable Location" |
| **Component** | `PrimaryButton` (existing) |
| **Width** | Full width minus 48px horizontal padding |
| **Height** | 48px |
| **Background** | #1565C0 (Primary Blue) |
| **Text style** | 16px semibold, white |
| **Icon (optional)** | `location-outline` Ionicon, 20px, white, left of text |
| **Bottom margin** | 16px above "Not Now" |
| **Position** | ~80px from bottom of screen |

**States:**
- Default: #1565C0 background, white text
- Pressed: #104D99 background, scale 0.98
- Loading: Spinner + "Getting your location..." text, button disabled
- Focused (Android): 2px darker border

**a11y:** Label "Enable location access"

---

### 6. Secondary Link — "Not Now"

| Property | Value |
|----------|-------|
| **Text** | "Not Now" |
| **Type** | Text link (not a button) |
| **Font size** | 14px |
| **Color** | `colors.text.secondary` |
| **Alignment** | Center |
| **Bottom margin** | 40px from bottom of safe area |

**States:**
- Default: Secondary text color, no underline
- Pressed: Underline + slightly darker color

**a11y:** Label "Skip location access, enter ZIP code manually"

---

## Interactive States

### Loading State (after "Enable Location" tapped)

- After "Enable Location" is tapped, the native OS dialog appears ON TOP of this screen
- If user grants permission: button changes to spinner + "Getting your location..."
- GPS fetch has a **10-second timeout**
- On success: auto-navigate to MetroConfirmationScreen (pre-filled)
- On timeout/failure: navigate to ZipCodeEntryScreen with toast: "We couldn't detect your location. Please enter your ZIP code."

### Error State (GPS failed)

- Warning toast appears above button area (background: #FFF3E0)
- Message: "Couldn't detect location — Enter your ZIP code instead"
- Button text changes to "Continue with ZIP Code"
- Tapping navigates to ZipCodeEntryScreen

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

### Screen Reader Order
1. "Map illustration" (decorative)
2. "Nepally works best with your location"
3. Body text (location usage explanation)
4. Privacy assurance line
5. "Enable Location" button
6. "Not Now" link

### Touch Targets
- "Enable Location" button: min 44×44pt (iOS) / 48×48dp (Android)
- "Not Now" link: min 44×44pt touch area (invisible padding)

### Color Contrast
- All text meets WCAG AA contrast ratios on white background
- Button text (white on #1565C0): AAA compliant

### Focus Indicators
- iOS VoiceOver: yellow outline
- Android TalkBack: green rectangle

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

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Previous | Onboarding entry (first launch) |
| Next (GPS success) | [04-metro-confirmation.md](../04-metro-confirmation/04-metro-confirmation.md) |
| Next (GPS fail / Not Now) | [03-zip-code-entry.md](../03-zip-code-entry/03-zip-code-entry.md) |
| Journey | [01-location-permission-and-detection](../../user-journeys/location/01-location-permission-and-detection.md) |

---

**Status:** Draft — Ready for Review
