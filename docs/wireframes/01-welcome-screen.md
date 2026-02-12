# Wireframe: Welcome Screen

**Screen Number:** 01
**Journey Reference:** [01-signup-and-onboarding.md](../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 4
**User Story:** As a new user launching NUSA for the first time, I want to understand what the app is about and easily sign up or log in.
**Last Updated:** 2026-02-12
**Status:** Draft

---

## Screen Purpose

The Welcome Screen is the first screen users see after launching NUSA. It introduces the app's purpose, establishes trust through clear messaging, and provides entry points for signup or login.

**Key Goals:**
- Establish brand identity and mission (utility-first community platform)
- Build trust through clear value proposition
- Provide friction-free entry to signup flow
- Display Terms of Service link for transparency

---

## Visual Layout

### iOS Layout

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │ ← 48px top padding
│            [NUSA LOGO]                  │ ← Logo: 80x80px, centered
│                                         │
│                                         │
│         Your Local Nepali               │ ← H1: 28pt Bold, #212121
│       Community in the USA              │    Center-aligned
│                                         │
│                                         │ ← 16px spacing
│  Find housing, jobs, and emergency      │ ← Body: 17pt Regular, #757575
│  help from verified community           │    Center-aligned, max 2 lines
│  members in your metro area.            │
│                                         │
│                                         │ ← 48px spacing
│  ┌───────────────────────────────────┐ │
│  │        Sign Up                    │ │ ← Primary button: 48px height
│  └───────────────────────────────────┘ │    #1565C0 blue, white text
│                                         │    17pt Semibold
│                                         │
│                                         │ ← 16px spacing
│  ┌───────────────────────────────────┐ │
│  │        Log In                     │ │ ← Secondary button: 48px height
│  └───────────────────────────────────┘ │    2px border #1565C0
│                                         │    Blue text, transparent bg
│                                         │
│                                         │
│                                         │
│                                         │
│  By continuing, you agree to           │ ← Caption: 13pt Regular, #757575
│  Terms of Service and Privacy Policy   │    Center-aligned, links underlined
│  ──────────────   ──────────────       │    Blue links on tap
│                                         │
│                                         │ ← 24px bottom padding
└─────────────────────────────────────────┘
```

### Android Layout

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │ ← 48dp top padding
│            [NUSA LOGO]                  │ ← Logo: 80x80dp, centered
│                                         │
│                                         │
│         Your Local Nepali               │ ← H1: 28sp Medium, #212121
│       Community in the USA              │    Center-aligned
│                                         │
│                                         │ ← 16dp spacing
│  Find housing, jobs, and emergency      │ ← Body: 16sp Regular, #757575
│  help from verified community           │    Center-aligned, max 2 lines
│  members in your metro area.            │
│                                         │
│                                         │ ← 48dp spacing
│  ┌───────────────────────────────────┐ │
│  │        SIGN UP                    │ │ ← Primary button: 56dp height
│  └───────────────────────────────────┘ │    #1565C0 blue, white text
│                                         │    14sp Medium, ALL CAPS
│                                         │
│                                         │ ← 16dp spacing
│  ┌───────────────────────────────────┐ │
│  │        LOG IN                     │ │ ← Outlined button: 56dp height
│  └───────────────────────────────────┘ │    2px border #1565C0
│                                         │    Blue text, transparent bg
│                                         │
│                                         │
│                                         │
│                                         │
│  By continuing, you agree to           │ ← Caption: 12sp Regular, #757575
│  Terms of Service and Privacy Policy   │    Center-aligned, links underlined
│  ──────────────   ──────────────       │    Blue links on tap
│                                         │
│                                         │ ← 24dp bottom padding
└─────────────────────────────────────────┘
```

---

## Component Details

### 1. NUSA Logo
**Type:** Image
**Dimensions:** 80x80px (iOS) / 80x80dp (Android)
**Position:** Centered horizontally, 48px/dp from top
**Design Notes:**
- Display full-color NUSA logo
- Ensure logo has transparent background
- Logo should be recognizable at small size
- Consider subtle animation on first launch (fade in + slight scale)

**Accessibility:**
- Alt text: "NUSA logo"
- Not interactive

---

### 2. App Tagline
**Type:** Text (Heading)
**Content:** "Your Local Nepali Community in the USA"
**Typography:**
- iOS: 28pt Bold, San Francisco
- Android: 28sp Medium, Roboto
**Color:** #212121 (Almost Black)
**Alignment:** Center
**Max Width:** 320px to prevent text wrapping on small devices

**Accessibility:**
- Semantic heading level: H1
- VoiceOver/TalkBack reads: "Your Local Nepali Community in the USA"

---

### 3. Value Proposition Text
**Type:** Text (Body)
**Content:** "Find housing, jobs, and emergency help from verified community members in your metro area."
**Typography:**
- iOS: 17pt Regular, San Francisco
- Android: 16sp Regular, Roboto
**Color:** #757575 (Medium Gray)
**Alignment:** Center
**Max Width:** 340px
**Line Height:** 1.5x

**Accessibility:**
- Semantic role: Paragraph text
- VoiceOver/TalkBack reads full sentence

---

### 4. Sign Up Button (Primary)
**Type:** Button
**Label:** "Sign Up"
**Dimensions:**
- iOS: 343x48px (assuming 375px screen width with 16px padding)
- Android: match_parent x 56dp with 16dp margins
**Corner Radius:** 8px/dp
**Background:** #1565C0 (Primary Blue)
**Text:**
- iOS: 17pt Semibold, White
- Android: 14sp Medium, White, ALL CAPS ("SIGN UP")
**Touch Target:** Full button size (meets 44pt/48dp minimum)
**Margin:** 16px/dp from side edges

**States:**
- **Default:** Blue background (#1565C0), white text
- **Pressed:** Darker blue (#104D99), scale 0.98
- **Focused (Android):** Blue with 2px darker border
- **Disabled:** Not applicable on this screen

**Interaction:**
- Tap/Click: Navigate to Screen 02 (Signup Method Selection)
- Haptic feedback on tap (iOS light impact)

**Accessibility:**
- Label: "Sign Up"
- Hint: "Create a new NUSA account"
- Trait: Button
- Touch target: 48x48pt minimum

---

### 5. Log In Button (Secondary)
**Type:** Button (Outline style)
**Label:** "Log In"
**Dimensions:** Same as Sign Up button
**Corner Radius:** 8px/dp
**Background:** Transparent
**Border:** 2px solid #1565C0
**Text:**
- iOS: 17pt Regular, #1565C0
- Android: 14sp Medium, #1565C0, ALL CAPS ("LOG IN")
**Touch Target:** Full button size

**States:**
- **Default:** Transparent bg, blue border and text
- **Pressed:** Light blue background (#E3F2FD, 10% opacity), scale 0.98
- **Focused (Android):** Blue border becomes 3px

**Interaction:**
- Tap/Click: Navigate to Login Screen (not part of this journey)
- Haptic feedback on tap

**Accessibility:**
- Label: "Log In"
- Hint: "Log in to existing account"
- Trait: Button

---

### 6. Terms of Service Footer
**Type:** Text with links
**Content:** "By continuing, you agree to Terms of Service and Privacy Policy"
**Typography:**
- iOS: 13pt Regular, San Francisco
- Android: 12sp Regular, Roboto
**Color:** #757575 (Medium Gray)
**Link Color:** #1565C0 (Blue)
**Alignment:** Center
**Position:** 24px/dp from bottom edge
**Max Width:** 320px

**Interactive Elements:**
- "Terms of Service" - tappable link
- "Privacy Policy" - tappable link

**States:**
- Default: Gray text, blue underlined links
- Pressed: Links show darker blue (#104D99)

**Interaction:**
- Tap "Terms of Service": Open in-app web view or Safari/Chrome
- Tap "Privacy Policy": Open in-app web view or Safari/Chrome
- Links should open in modal sheet (iOS) or custom tab (Android)

**Accessibility:**
- Label: "By continuing, you agree to Terms of Service and Privacy Policy"
- Links have clear focus indicators
- VoiceOver/TalkBack announces: "Link, Terms of Service" and "Link, Privacy Policy"

---

## Spacing & Layout Details

### Vertical Spacing (Top to Bottom)
1. Top safe area inset (iOS) / Status bar (Android): Auto
2. 48px/dp padding
3. NUSA Logo: 80x80px/dp
4. 24px/dp spacing
5. Tagline: ~60px height (2 lines)
6. 16px/dp spacing
7. Value proposition: ~75px height (3 lines)
8. 48px/dp spacing
9. Sign Up button: 48px/56dp height
10. 16px/dp spacing
11. Log In button: 48px/56dp height
12. Flexible space (pushes footer to bottom)
13. Terms footer: ~40px height
14. 24px/dp bottom padding
15. Bottom safe area inset (iOS only): Auto

**Total Minimum Height:** ~540px (fits iPhone SE and small Android devices)

### Horizontal Spacing
- Screen margins: 16px/dp on both sides
- Buttons: Full width minus 32px/dp (16px margins × 2)
- Text: Max width 340px, centered with auto margins

---

## User Interactions

### Primary Flow
1. **User launches app** → Screen loads with logo fade-in animation (300ms)
2. **User reads tagline and value proposition** → Takes 10-15 seconds
3. **User taps "Sign Up"** → Navigate to Screen 02 (Signup Method Selection)

### Alternative Flow
- **User taps "Log In"** → Navigate to Login Screen (out of scope for this journey)

### Edge Cases
- **User taps Terms of Service link** → Open modal web view
- **User taps Privacy Policy link** → Open modal web view
- **User closes app and reopens** → Show this screen again (until signup is complete)

---

## Platform-Specific Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| **Button Height** | 48px | 56dp (Material Design spec) |
| **Button Text** | Title case ("Sign Up") | ALL CAPS ("SIGN UP") |
| **Typography** | San Francisco (17pt body, 28pt H1) | Roboto (16sp body, 28sp H1) |
| **Button Pressed State** | Scale 0.98 + haptic feedback | Scale 0.98 + ripple effect |
| **Status Bar** | Hidden or light status bar | Translucent status bar with icon color |
| **Safe Area Handling** | Respect safe area insets (notch) | Respect status bar height |
| **Link Underline** | Shown on press only | Always shown |

---

## Error States & Edge Cases

### Edge Case: No Internet Connection
**Scenario:** User launches app with no internet
**Behavior:**
- Screen loads normally (static content)
- If user taps Sign Up, show error banner at top: "No internet connection. Please check your connection and try again."
- Banner: Red background (#C62828), white text, dismissible
**Recovery:** User can retry after connecting

### Edge Case: Terms of Service Link Failure
**Scenario:** Terms link fails to load
**Behavior:**
- Show error toast: "Could not load page. Please try again later."
- Provide "Contact Support" fallback

### Edge Case: Screen Orientation Change
**Scenario:** User rotates device to landscape
**Behavior:**
- iOS: Lock to portrait mode (prevent rotation)
- Android: Allow rotation, adjust layout with horizontal padding

### Edge Case: Very Small Screens (iPhone SE 1st gen)
**Scenario:** Device screen height < 568px
**Behavior:**
- Reduce logo size to 64x64px
- Reduce top padding to 32px
- Keep all text readable

### Edge Case: Large Accessibility Text
**Scenario:** User has increased system font size
**Behavior:**
- Support Dynamic Type (iOS) / Large Text (Android)
- Buttons expand vertically to fit text
- Ensure footer doesn't overlap buttons

---

## Accessibility Requirements

### Screen Reader Support
- **Screen Title:** "Welcome to NUSA"
- **Reading Order:**
  1. "NUSA logo"
  2. "Your Local Nepali Community in the USA"
  3. "Find housing, jobs, and emergency help from verified community members in your metro area."
  4. "Sign Up button"
  5. "Log In button"
  6. "By continuing, you agree to Terms of Service and Privacy Policy"

### Touch Targets
- All buttons: Minimum 44x44pt (iOS) / 48x48dp (Android)
- Links in footer: Minimum 44x44pt touch area (add invisible padding)

### Color Contrast
- Tagline (#212121 on #F5F5F5): 16.9:1 ✓ (exceeds WCAG AAA)
- Body text (#757575 on #F5F5F5): 4.6:1 ✓ (meets WCAG AA)
- Button text (White on #1565C0): 7.2:1 ✓ (meets WCAG AAA)
- Links (#1565C0 on #F5F5F5): 7.2:1 ✓

### Focus Indicators
- iOS: VoiceOver shows yellow outline on focused element
- Android: TalkBack shows green rectangle on focused element
- Keyboard navigation (Android): Show blue focus ring

---

## Animations & Transitions

### On Screen Load
**Logo Fade-In:**
- Duration: 300ms
- Easing: Ease-out
- Effect: Opacity 0 → 1, scale 0.9 → 1.0

**Text Stagger:**
- Tagline fades in 100ms after logo
- Value proposition fades in 100ms after tagline
- Buttons fade in 100ms after value proposition
- Total animation time: 600ms

### Button Press
**Sign Up / Log In:**
- Duration: 150ms
- Easing: Ease-in-out
- Effect: Scale 0.98, background color darkens slightly
- iOS: Light haptic feedback
- Android: Ripple effect from tap point

### Screen Transition
**Navigate to Next Screen:**
- iOS: Slide in from right (300ms, ease-in-out)
- Android: Slide up from bottom (300ms, material motion)

---

## Content Guidelines

### Copy Requirements
- **Tagline:** Must be under 40 characters for single-line display
- **Value Proposition:** Keep under 140 characters (Twitter-length for scannability)
- **Button Labels:** Use imperative verbs ("Sign Up", not "Create Account")
- **Footer Text:** Must mention both Terms and Privacy for legal compliance

### Localization Notes
- All strings should be externalized for future Nepali translation
- String keys:
  - `welcome_tagline`: "Your Local Nepali Community in the USA"
  - `welcome_value_prop`: "Find housing, jobs, and emergency help from verified community members in your metro area."
  - `button_signup`: "Sign Up"
  - `button_login`: "Log In"
  - `footer_terms`: "By continuing, you agree to Terms of Service and Privacy Policy"

### Tone & Voice
- **Friendly and welcoming:** "Your Local Nepali Community"
- **Trust-building:** "verified community members"
- **Action-oriented:** Clear CTAs
- **Transparent:** Upfront Terms of Service mention

---

## Technical Notes

### Screen Identifier
- iOS: `WelcomeViewController` or `WelcomeScreen`
- Android: `WelcomeActivity` or `WelcomeFragment`
- Route name: `/welcome`

### State Management
**No persistent state needed on this screen**
- Screen is stateless (no form inputs)
- No API calls required
- No local storage reads/writes

### Navigation
**Entry Points:**
- App launch (if user not authenticated)
- Deep link: `nusa://welcome` (rare, for marketing)

**Exit Points:**
- Tap "Sign Up" → Navigate to `/signup-method` (Screen 02)
- Tap "Log In" → Navigate to `/login` (out of scope)
- Tap Terms/Privacy links → Open web view modally (stay on screen after close)

### Performance Considerations
- Pre-load logo asset for instant display
- Lazy load Terms/Privacy web content (only when tapped)
- Optimize logo image size: ~10KB PNG or vector SVG

---

## Design References

### Inspiration
- **Nextdoor Welcome Screen:** Clean, community-focused messaging
- **WhatsApp Welcome Screen:** Minimal design, clear value prop
- **Airbnb Welcome Screen:** Trust-building language

### Design System Components Used
- Primary Button (from 00-design-system-foundation.md)
- Secondary Button (Outline style)
- H1 Typography (28pt/sp)
- Body Typography (17pt/16sp)
- Caption Typography (13pt/12sp)

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
- [ ] Safe area insets respected (iPhone notch, Android navigation bar)

### Accessibility Tests
- [ ] VoiceOver/TalkBack reads all elements in correct order
- [ ] All touch targets meet 44pt/48dp minimum
- [ ] Color contrast meets WCAG AA standards
- [ ] Dynamic Type/Large Text works correctly
- [ ] Keyboard navigation works (Android)

### Edge Case Tests
- [ ] No internet: Screen loads, buttons show error on tap
- [ ] Very small screen (iPhone SE): All content visible
- [ ] Very large text: Layout doesn't break
- [ ] Orientation change: Handles correctly (portrait lock or adapt)
- [ ] Dark mode (future): Colors invert properly

---

## Open Questions

- [ ] **Should we add a "Skip" option?** (Allow browsing without account?)
  - **Recommendation:** No - require signup to maintain quality and trust

- [ ] **Should we show app version number?** (e.g., "v1.0.0" in footer)
  - **Recommendation:** No on welcome screen, add to Settings later

- [ ] **Should logo have animation on every launch or only first time?**
  - **Recommendation:** Only first launch, skip on subsequent opens for speed

- [ ] **Should we add social proof?** (e.g., "Join 10,000+ Nepali community members")
  - **Recommendation:** Yes, if we hit 1,000+ users - add below value prop

---

## Related Screens

**Previous Screen:** None (entry point)
**Next Screen:** [02-signup-method-selection.md](./02-signup-method-selection.md)
**Related Journeys:**
- [01-signup-and-onboarding.md](../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 4

---

**Wireframe Status:** Draft - Ready for Review
**Next Steps:** Create Screen 02 (Signup Method Selection)
