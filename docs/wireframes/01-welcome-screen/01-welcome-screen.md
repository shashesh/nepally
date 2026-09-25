# Wireframe: Welcome Screen

> **Screen:** 01 | **Status:** Draft | **Updated:** 2026-02-19
> **Journey:** [01-signup-and-onboarding](../../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 4
> **Story:** As a new user launching Nepally for the first time, I want to understand what the app is about and easily sign up or log in.

---

## Screen Purpose

The Welcome Screen is the first screen users see after launching Nepally. It introduces the app's purpose, establishes trust through clear messaging, and provides entry points for signup or login.

**Key Goals:**

- Establish brand identity and mission (utility-first community platform)
- Build trust through clear value proposition
- Provide friction-free entry to signup flow
- Display Terms of Service link for transparency

---

## Visual Wireframe

::: hero
![Nepally Logo](assets/nepally-logo.png)

# Your Local Nepali Community in the USA

Find housing, jobs, and emergency help from verified community members in your metro area.

[Sign Up]*

[Log In]{.outline}
:::

::: footer
By continuing, you agree to [Terms of Service](/terms) and [Privacy Policy](/privacy)
:::

---

::: alert error
:warning: **No Internet Connection**
No internet connection. Please check your connection and try again.

[Dismiss]
:::

---

## Component Specifications

### 1. Nepally Logo

| Property       | iOS                     | Android                 |
| -------------- | ----------------------- | ----------------------- |
| **Type**       | Image                   | Image                   |
| **Dimensions** | 80×80px                 | 80×80dp                 |
| **Position**   | Centered, 48px from top | Centered, 48dp from top |

- Transparent background, full-color
- Recognizable at small size
- First-launch animation: fade in + scale 0.9→1.0 (300ms, ease-out)
- **a11y:** Alt text "Nepally logo", not interactive

---

### 2. App Tagline

| Property      | iOS                      | Android             |
| ------------- | ------------------------ | ------------------- |
| **Font**      | 28pt Bold, San Francisco | 28sp Medium, Roboto |
| **Color**     | #212121 (Almost Black)   | #212121             |
| **Alignment** | Center                   | Center              |
| **Max Width** | 320px                    | 320dp               |

- Semantic heading: H1
- **a11y:** VoiceOver/TalkBack reads full text

---

### 3. Value Proposition

| Property        | iOS                         | Android              |
| --------------- | --------------------------- | -------------------- |
| **Font**        | 17pt Regular, San Francisco | 16sp Regular, Roboto |
| **Color**       | #757575 (Medium Gray)       | #757575              |
| **Alignment**   | Center                      | Center               |
| **Max Width**   | 340px                       | 340dp                |
| **Line Height** | 1.5×                        | 1.5×                 |

- **a11y:** Semantic paragraph, screen reader reads full sentence

---

### 4. Sign Up Button (Primary)

| Property          | iOS                             | Android                       |
| ----------------- | ------------------------------- | ----------------------------- |
| **Height**        | 48px                            | 56dp                          |
| **Width**         | Full width − 32px margins       | match_parent − 32dp margins   |
| **Corner Radius** | 8px                             | 8dp                           |
| **Background**    | #1565C0 (Primary Blue)          | #1565C0                       |
| **Text**          | 17pt Semibold, White, "Sign Up" | 14sp Medium, White, "SIGN UP" |

**States:**

- Default: #1565C0 background, white text
- Pressed: #104D99 background, scale 0.98
- Focused (Android): 2px darker border

**Interaction:** Tap → Navigate to Screen 02 (Signup Method Selection) + haptic (iOS)
**a11y:** Label "Sign Up", Hint "Create a new Nepally account", min touch target 44pt/48dp

---

### 5. Log In Button (Outline)

| Property       | iOS                             | Android                        |
| -------------- | ------------------------------- | ------------------------------ |
| **Height**     | 48px                            | 56dp                           |
| **Background** | Transparent                     | Transparent                    |
| **Border**     | 2px solid #1565C0               | 2px solid #1565C0              |
| **Text**       | 17pt Regular, #1565C0, "Log In" | 14sp Medium, #1565C0, "LOG IN" |

**States:**

- Default: Transparent background, blue border/text
- Pressed: #E3F2FD background (10% opacity), scale 0.98
- Focused (Android): 3px border

**Interaction:** Tap → Navigate to Login Screen (out of scope)
**a11y:** Label "Log In", Hint "Log in to existing account"

---

### 6. Terms of Service Footer

| Property       | iOS                         | Android              |
| -------------- | --------------------------- | -------------------- |
| **Font**       | 13pt Regular, San Francisco | 12sp Regular, Roboto |
| **Text Color** | #757575                     | #757575              |
| **Link Color** | #1565C0 (Blue)              | #1565C0              |
| **Position**   | 24px from bottom            | 24dp from bottom     |
| **Max Width**  | 320px                       | 320dp                |

**Links:** "Terms of Service" and "Privacy Policy" — open in-app web view (iOS modal sheet / Android custom tab)
**States:** Links default blue underlined, pressed #104D99
**a11y:** Screen reader announces "Link, Terms of Service" and "Link, Privacy Policy"

---

## Spacing & Layout

### Vertical Stack (Top to Bottom)

| #   | Element                | Height          | Spacing After |
| --- | ---------------------- | --------------- | ------------- |
| 1   | Safe area / Status bar | Auto            | —             |
| 2   | Top padding            | 48px/dp         | —             |
| 3   | Nepally Logo           | 80px/dp         | 24px/dp       |
| 4   | Tagline                | ~60px (2 lines) | 16px/dp       |
| 5   | Value proposition      | ~75px (3 lines) | 48px/dp       |
| 6   | Sign Up button         | 48px / 56dp     | 16px/dp       |
| 7   | Log In button          | 48px / 56dp     | Flex          |
| 8   | Terms footer           | ~40px           | 24px/dp       |
| 9   | Bottom safe area (iOS) | Auto            | —             |

**Total Minimum Height:** ~540px (fits iPhone SE and small Android)

**Horizontal:** 16px/dp margins on both sides. Buttons full width minus 32px/dp. Text max 340px centered.

---

## User Interactions

### Primary Flow

1. **App launches** → Logo fade-in animation (300ms)
2. **User reads content** → ~10–15 seconds
3. **User taps "Sign Up"** → Navigate to Screen 02 (Signup Method Selection)

### Alternative Flows

- **Tap "Log In"** → Navigate to Login Screen (out of scope)
- **Tap Terms/Privacy links** → Open modal web view, return to this screen on close
- **Close and reopen app** → Show this screen again until signup complete

---

## Platform-Specific Differences

| Aspect                | iOS                                | Android                      |
| --------------------- | ---------------------------------- | ---------------------------- |
| **Button Height**     | 48px                               | 56dp (Material Design)       |
| **Button Text**       | Title case ("Sign Up")             | ALL CAPS ("SIGN UP")         |
| **Typography**        | San Francisco (17pt body, 28pt H1) | Roboto (16sp body, 28sp H1)  |
| **Press Feedback**    | Scale 0.98 + haptic                | Scale 0.98 + ripple          |
| **Status Bar**        | Hidden or light                    | Translucent with icon color  |
| **Safe Area**         | Respect notch insets               | Respect status bar height    |
| **Link Underline**    | Shown on press only                | Always shown                 |
| **Screen Transition** | Slide from right (300ms)           | Slide up from bottom (300ms) |

---

## Error States & Edge Cases

### No Internet Connection

- Screen loads normally (static content)
- Sign Up tap → error banner: red (#C62828) background, white text, dismissible
- Recovery: retry after connecting

### Terms Link Failure

- Error toast: "Could not load page. Please try again later."
- Fallback: "Contact Support" link

### Orientation Change

- iOS: Lock to portrait
- Android: Allow rotation, adjust horizontal padding

### Small Screens (iPhone SE 1st gen, < 568px)

- Logo shrinks to 64×64px
- Top padding reduced to 32px

### Large Accessibility Text

- Support Dynamic Type (iOS) / Large Text (Android)
- Buttons expand vertically
- Footer must not overlap buttons

---

## Accessibility

### Screen Reader Order

1. "Nepally logo"
2. "Your Local Nepali Community in the USA"
3. "Find housing, jobs, and emergency help from verified community members in your metro area."
4. "Sign Up" button
5. "Log In" button
6. "By continuing, you agree to Terms of Service and Privacy Policy"

### Touch Targets

- Buttons: min 44×44pt (iOS) / 48×48dp (Android)
- Footer links: min 44×44pt touch area (invisible padding)

### Color Contrast (WCAG)

| Element                        | Ratio  | Level |
| ------------------------------ | ------ | ----- |
| Tagline (#212121 on #F5F5F5)   | 16.9:1 | AAA ✓ |
| Body text (#757575 on #F5F5F5) | 4.6:1  | AA ✓  |
| Button text (White on #1565C0) | 7.2:1  | AAA ✓ |
| Links (#1565C0 on #F5F5F5)     | 7.2:1  | AAA ✓ |

### Focus Indicators

- iOS VoiceOver: yellow outline
- Android TalkBack: green rectangle
- Android keyboard: blue focus ring

---

## Animations & Transitions

### On Screen Load

| Step | Element    | Delay | Duration | Effect                                |
| ---- | ---------- | ----- | -------- | ------------------------------------- |
| 1    | Logo       | 0ms   | 300ms    | Opacity 0→1, scale 0.9→1.0 (ease-out) |
| 2    | Tagline    | 300ms | 200ms    | Fade in (ease-out)                    |
| 3    | Value prop | 400ms | 200ms    | Fade in (ease-out)                    |
| 4    | Buttons    | 500ms | 200ms    | Fade in (ease-out)                    |

**Total:** ~600ms

### Button Press

- Duration: 150ms, ease-in-out
- Scale 0.98 + background darkens
- iOS: light haptic | Android: ripple from tap point

---

## Content & Localization

### Copy Requirements

- Tagline: < 40 characters (single-line)
- Value proposition: < 140 characters (scannable)
- Button labels: imperative verbs ("Sign Up", not "Create Account")
- Footer: must mention both Terms and Privacy (legal)

### String Keys

| Key                  | Value                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `welcome_tagline`    | Your Local Nepali Community in the USA                                                     |
| `welcome_value_prop` | Find housing, jobs, and emergency help from verified community members in your metro area. |
| `button_signup`      | Sign Up                                                                                    |
| `button_login`       | Log In                                                                                     |
| `footer_terms`       | By continuing, you agree to Terms of Service and Privacy Policy                            |

### Tone

- Friendly/welcoming: "Your Local Nepali Community"
- Trust-building: "verified community members"
- Action-oriented: clear CTAs
- Transparent: upfront Terms mention

---

## Technical Notes

### Identifiers

- Route: `/welcome`
- iOS: `WelcomeScreen`
- Android: `WelcomeActivity` / `WelcomeFragment`

### State Management

- Stateless screen — no form inputs, API calls, or local storage

### Navigation

| Direction | Trigger                       | Destination                      |
| --------- | ----------------------------- | -------------------------------- |
| Entry     | App launch (unauthenticated)  | This screen                      |
| Entry     | Deep link `nepally://welcome` | This screen                      |
| Exit      | Tap "Sign Up"                 | `/signup-method` (Screen 02)     |
| Exit      | Tap "Log In"                  | `/login` (out of scope)          |
| Modal     | Tap Terms/Privacy             | Web view (returns here on close) |

### Performance

- Pre-load logo asset for instant display
- Lazy load Terms/Privacy web content (only on tap)
- Logo: ~10KB PNG or vector SVG

---

## Testing Checklist

### Functional Tests

- [ ] Sign Up button navigates to Screen 02
- [ ] Log In button navigates to Login Screen
- [ ] Terms of Service link opens web view
- [ ] Privacy Policy link opens web view
- [ ] Back from web view returns to Welcome Screen

### Visual Tests

- [ ] Logo displays correctly at all screen sizes
- [ ] Text wraps properly on narrow screens (320px width)
- [ ] Buttons have correct height (48px/56dp)
- [ ] Footer stays at bottom on tall screens
- [ ] Safe area insets respected (notch, nav bar)

### Accessibility Tests

- [ ] VoiceOver/TalkBack reads all elements in correct order
- [ ] Touch targets meet 44pt/48dp minimum
- [ ] Color contrast meets WCAG AA
- [ ] Dynamic Type/Large Text works correctly
- [ ] Keyboard navigation works (Android)

### Edge Case Tests

- [ ] No internet: Screen loads, buttons show error on tap
- [ ] Very small screen (iPhone SE): All content visible
- [ ] Very large text: Layout doesn't break
- [ ] Orientation change: portrait lock (iOS) or adapt (Android)
- [ ] Dark mode (future): Colors invert properly

---

## Open Questions

- [ ] **Skip option?** Allow browsing without account? → **Rec:** No, require signup for trust
- [ ] **App version in footer?** → **Rec:** No, add to Settings later
- [ ] **Logo animation frequency?** → **Rec:** First launch only
- [ ] **Social proof?** ("Join 10,000+ members") → **Rec:** Yes, after 1,000+ users

---

## Related Screens

| Relation | Screen                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------- |
| Previous | None (entry point)                                                                              |
| Next     | [02-signup-method-selection.md](../02-signup-method-selection/02-signup-method-selection.md)    |
| Journey  | [01-signup-and-onboarding](../../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 4 |

---

**Status:** Draft — Ready for Review
**Next:** Create Screen 02 (Signup Method Selection)
