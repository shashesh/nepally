# Wireframe: Signup Method Selection

> **Screen:** 02 | **Status:** Draft | **Updated:** 2026-02-19
> **Journey:** [01-signup-and-onboarding](../../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 5
> **Story:** As a new user, I want to choose how I sign up (Google, Phone, or Email) so I can create an account using my preferred method.

---

## Screen Purpose

This screen allows users to select their preferred signup method. It emphasizes ease and privacy to build trust while providing multiple options for different user preferences.

**Key Goals:**
- Present three clear signup options
- Reduce decision paralysis with guidance (recommend Google for speed)
- Build trust with privacy reassurance
- Enable quick signup for tech-savvy users
- Support less tech-savvy users with phone option

---

## Visual Wireframe

::: hero
← Back

# Create Your Account

Join the Nepali community in your area

::: card
![Google Icon](assets/google-icon.png){24x24}
**Continue with Google**
Quick signup • Verification required later
:::

::: card
📱 **Continue with Phone Number**
Quick signup • Verification required later
:::

::: card
✉ **Continue with Email**
Quick signup • Verification required later
:::

🔒 We'll never post without your permission
:::

::: footer
Already have an account? [Log In](/login)
:::

---

::: alert error
:warning: **Signup cancelled**
Signup cancelled. Please choose a method to continue.

[Dismiss]
:::

::: alert error
:warning: **Google signup failed**
Something went wrong with Google signup. Please try again or use a different method.

[Try Again]  [Dismiss]
:::

::: alert error
:warning: **No Internet Connection**
No internet connection. Please check your connection and try again.

[Dismiss]
:::

::: alert error
:warning: **Already registered**
This email is already registered. Please log in or use a different account.

[Log In Instead]  [Dismiss]
:::

---

## Component Specifications

### 1. Navigation Bar / Top App Bar

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Navigation Bar | Top App Bar |
| **Height** | 44px | 56dp |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Back Control** | "< Back" text, 17pt, #1565C0 | Material arrow_back icon, 24dp, #212121 |
| **Tap Area** | 44×44pt minimum | 48×48dp minimum |

**Interaction:**
- Tap/Click: Navigate back to Screen 01 (Welcome Screen)
- iOS: Swipe right from left edge also goes back
- Android: Hardware back button also goes back

**a11y:** Label "Back" or "Navigate back"; VoiceOver/TalkBack announces "Back button"

---

### 2. Screen Title

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Text (Heading) | Text (Heading) |
| **Content** | "Create Your Account" | "Create Your Account" |
| **Font** | 34pt Bold, San Francisco | 34sp Medium, Roboto |
| **Color** | #212121 (Almost Black) | #212121 |
| **Alignment** | Left | Left |
| **Margin** | 16px from left edge | 16dp from left edge |

- Semantic heading: H1
- **a11y:** VoiceOver/TalkBack reads "Create Your Account"

---

### 3. Subtitle

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Text (Body) | Text (Body) |
| **Content** | "Join the Nepali community in your area" | "Join the Nepali community in your area" |
| **Font** | 17pt Regular, San Francisco | 16sp Regular, Roboto |
| **Color** | #757575 (Medium Gray) | #757575 |
| **Alignment** | Left | Left |
| **Margin** | 16px from left edge | 16dp from left edge |

- **a11y:** Semantic paragraph; screen reader reads full sentence

---

### 4. Google Signup Option

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Button (Large, card-style) | Button (Large, card-style) |
| **Label** | "Continue with Google" | "Continue with Google" |
| **Height** | 56px (includes padding) | 64dp |
| **Width** | match_parent − 32px margins | match_parent − 32dp margins |
| **Corner Radius** | 12px | 12dp |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | 1px solid #E0E0E0 | 1dp solid #E0E0E0 |
| **Elevation** | Subtle shadow (0 2px 4px rgba(0,0,0,0.1)) | 1dp Material elevation |
| **Padding** | 16px all around | 16dp all around |
| **Main Text** | 17pt Semibold, #212121 | 16sp Semibold, #212121 |
| **Benefit Text** | 13pt Regular, #757575 | 12sp Regular, #757575 |
| **Icon** | Google "G" logo (multicolor), 24×24px | Google "G" logo (multicolor), 24×24dp |

**Content Layout:**
- Left: Google icon (24×24, 16px/dp from left edge)
- Center: "Continue with Google" (main label) + "Quick signup • Verification required later" (benefit)
- Right: Chevron indicator (optional, light gray)

**States:**
- Default: White bg, gray border
- Pressed: #F5F5F5 bg, scale 0.99
- Focused (Android): Blue 2px border
- Loading: Spinner in center of card, hide main text, disable all other buttons, gray out other options

**Interaction:** Tap → Initiate Google OAuth flow; show loading spinner during OAuth; haptic feedback (iOS)
**a11y:** Label "Continue with Google", Hint "Sign up using your Google account. Quick signup with verification required later.", Trait: Button, touch target: full card size (exceeds 44pt/48dp)

---

### 5. Phone Number Signup Option

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Button (Large, card-style) | Button (Large, card-style) |
| **Label** | "Continue with Phone Number" | "Continue with Phone Number" |
| **Dimensions** | Same as Google option | Same as Google option |
| **Styling** | Same as Google option | Same as Google option |
| **Icon** | 📱 or system phone icon, 24×24px, #1565C0 | Material "phone" icon, 24×24dp, #1565C0 |

**Content Layout:**
- Left: Phone icon (24×24, 16px/dp from left edge, #1565C0)
- Center: "Continue with Phone Number" (main label) + "Quick signup • Verification required later" (benefit)
- Right: Chevron indicator (optional)

**States:** Same as Google option
**Interaction:** Tap → Navigate to phone number entry screen (not in this wireframe); haptic feedback (iOS)
**a11y:** Label "Continue with Phone Number", Hint "Sign up using your phone number. Quick signup with verification required later.", Trait: Button

---

### 6. Email Signup Option

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Button (Large, card-style) | Button (Large, card-style) |
| **Label** | "Continue with Email" | "Continue with Email" |
| **Dimensions** | Same as Google option | Same as Google option |
| **Styling** | Same as Google option | Same as Google option |
| **Icon** | ✉ or system mail icon, 24×24px, #1565C0 | Material "email" icon, 24×24dp, #1565C0 |

**Content Layout:**
- Left: Email icon (24×24, 16px/dp from left edge, #1565C0)
- Center: "Continue with Email" (main label) + "Quick signup • Verification required later" (benefit)
- Right: Chevron indicator (optional)

**States:** Same as Google option
**Interaction:** Tap → Navigate to email entry screen (not in this wireframe); haptic feedback (iOS)
**a11y:** Label "Continue with Email", Hint "Sign up using your email address. Quick signup with verification required later.", Trait: Button

---

### 7. Privacy Reassurance Text

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Text with icon | Text with icon |
| **Content** | "🔒 We'll never post without your permission" | "🔒 We'll never post without your permission" |
| **Font** | 13pt Regular, San Francisco | 12sp Regular, Roboto |
| **Color** | #757575 (Medium Gray) | #757575 |
| **Alignment** | Center | Center |
| **Icon** | Lock emoji or lock icon, 16px | Lock emoji or lock icon, 16dp |
| **Position** | Below signup options, 24px spacing | Below signup options, 24dp spacing |

- **a11y:** Label "We'll never post without your permission"; icon has alt text "Lock icon"

---

### 8. Log In Link (Footer)

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Text with link | Text with link |
| **Content** | "Already have an account? Log In" | "Already have an account? LOG IN" |
| **Font** | 13pt Regular, San Francisco | 12sp Regular, Roboto |
| **Text Color** | #757575 (regular text) | #757575 (regular text) |
| **Link Color** | #1565C0 | #1565C0 |
| **Alignment** | Center | Center |
| **Position** | 24px from bottom | 24dp from bottom |
| **Link Style** | Underline on press only | Always underlined, ALL CAPS |

**Interaction:** Tap "Log In" → Navigate to Login Screen (out of scope)
**a11y:** Full text "Already have an account? Log In"; link has clear focus indicator; VoiceOver/TalkBack announces "Link, Log In"

---

## Spacing & Layout

### Vertical Stack (Top to Bottom)

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Safe area / Status bar | Auto | — |
| 2 | Nav bar | 44px / 56dp | 24px/dp |
| 3 | Title | ~40px | 8px/dp |
| 4 | Subtitle | ~50px | 32px/dp |
| 5 | Google option | 56px / 64dp | 16px/dp |
| 6 | Phone option | 56px / 64dp | 16px/dp |
| 7 | Email option | 56px / 64dp | 24px/dp |
| 8 | Privacy text | ~20px | Flex |
| 9 | Log In link | ~30px | 24px/dp |
| 10 | Bottom safe area | Auto | — |

**Total Minimum Height:** ~520px (fits small devices)

**Horizontal:** 16px/dp margins on both sides. All option cards full width minus 32px/dp. Text left-aligned with 16px/dp margin.

---

## User Interactions

### Primary Flow
1. **User lands on screen from Welcome Screen**
2. **User reads three options** → Takes 5–10 seconds to decide
3. **User taps "Continue with Google"** (most common choice)
4. **System initiates Google OAuth flow** → Redirect to Google consent screen
5. **User approves permissions** → Return to app, create account

### Alternative Flows
- **User taps "Continue with Phone Number"** → Navigate to phone entry screen
- **User taps "Continue with Email"** → Navigate to email entry screen
- **User taps "Log In"** → Navigate to Login Screen
- **User taps Back** → Return to Screen 01 (Welcome Screen)

### Decision Guidance
**Recommendations to reduce decision paralysis:**
- Consider adding "Most popular" or "Recommended" badge on Google option
- Benefit text emphasizes all are "Quick signup"
- Privacy reassurance reduces concern about linking Google account

---

## Platform-Specific Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| **Back Navigation** | "< Back" text button | Back arrow icon |
| **Option Card Height** | 56px | 64dp (slightly taller) |
| **Typography** | San Francisco, 17pt body | Roboto, 16sp body |
| **Card Shadow** | Subtle iOS shadow (0 2px 4px rgba(0,0,0,0.1)) | Material elevation 1dp |
| **Button Pressed State** | Scale 0.99 + haptic | Scale 0.99 + ripple effect |
| **Link Style** | Underline on press only | Always underlined |
| **Log In Text** | "Log In" (title case) | "LOG IN" (ALL CAPS) |
| **Hardware Back Button** | N/A (swipe gesture) | Goes to previous screen |

---

## Error States & Edge Cases

### Google OAuth Cancelled
- **Scenario:** User taps Google option, but cancels Google permission screen
- **Behavior:** Return to this screen (no navigation); show brief toast "Signup cancelled. Please choose a method to continue."; no error UI, allow retry
- **Recovery:** User can tap Google option again

### Google OAuth Error
- **Scenario:** Google OAuth fails (network error, timeout, server error)
- **Behavior:** Return to this screen; error banner at top: red (#C62828) bg, white text, dismissible; buttons remain enabled
- **Recovery:** User can tap "Try Again" in banner, or choose Phone/Email instead

### No Internet Connection
- **Scenario:** User taps any signup option with no internet
- **Behavior:** Error banner immediately: red (#C62828) bg, white text, dismissible; buttons remain enabled
- **Recovery:** Dismiss banner and retry after connecting; banner auto-dismisses when connection restored

### User Already Registered
- **Scenario:** User attempts to sign up with a Google account that's already registered
- **Behavior:** After OAuth, backend detects duplicate email; error banner: "This email is already registered. Please log in or use a different account."; "Log In Instead" button in banner
- **Recovery:** Tap "Log In Instead" → navigate to Login Screen; or go back and choose a different method

### Google Account Picker (Multiple Accounts)
- **Scenario:** User has multiple Google accounts on device
- **Behavior:** Google OAuth shows account picker automatically; user selects which account; proceed with selected account
- **Note:** Handled by Google, not Nepally UI

### Very Small Screen (iPhone SE 1st gen, 320×568px)
- **Behavior:** Reduce option card height to 48px; reduce font sizes slightly (15pt/14sp main labels); reduce spacing between cards to 12px; all content still visible and tappable

### Large Accessibility Text (200%+)
- **Behavior:** Support Dynamic Type (iOS) / Large Text (Android); option cards expand vertically to fit text; may require vertical scrolling; maintain readability

---

## Accessibility

### Screen Reader Order
1. "Back button"
2. "Create Your Account"
3. "Join the Nepali community in your area"
4. "Continue with Google. Sign up using your Google account. Quick signup with verification required later."
5. "Continue with Phone Number. Sign up using your phone number. Quick signup with verification required later."
6. "Continue with Email. Sign up using your email address. Quick signup with verification required later."
7. "We'll never post without your permission"
8. "Already have an account? Log In"

### Touch Targets
- All option cards: min 44×44pt (iOS) / 48×48dp (Android) — exceeds (56px/64dp height) ✓
- Back button: min 44×44pt / 48×48dp ✓
- Log In link: min 44×44pt touch area (add invisible padding if needed)

### Color Contrast (WCAG)

| Element | Ratio | Level |
|---------|-------|-------|
| Title (#212121 on #FFFFFF) | 16.9:1 | AAA ✓ |
| Body text (#757575 on #FFFFFF) | 4.6:1 | AA ✓ |
| Card text (#212121 on #FFFFFF) | 16.9:1 | AAA ✓ |
| Privacy text (#757575 on #FFFFFF) | 4.6:1 | AA ✓ |

### Focus Indicators
- iOS VoiceOver: yellow outline on focused card
- Android TalkBack: green rectangle on focused card
- Android keyboard navigation: blue focus ring around entire card

---

## Animations & Transitions

### Screen Entry
| Step | Element | Delay | Duration | Effect |
|------|---------|-------|----------|--------|
| 1 | Screen slide | 0ms | 300ms | Slide from right (iOS) / Slide up (Android), ease-in-out |
| 2 | Google card | 0ms | 200ms | Fade in (ease-out) |
| 3 | Phone card | 100ms | 200ms | Fade in (ease-out), staggered |
| 4 | Email card | 200ms | 200ms | Fade in (ease-out), staggered |

### Option Card Press
- Duration: 150ms, ease-in-out
- Scale 0.99 + background to #F5F5F5
- iOS: light haptic feedback | Android: ripple from tap point

### Loading State (Google OAuth)
- Spinner in center of Google card, hide main text
- Disable all other buttons, gray out other options

### Error Banner
- Slide down from top: 300ms, ease-out
- Auto-dismiss after 5 seconds or user taps X

---

## Content & Localization

### Copy Requirements
- **Title:** Clear, action-oriented ("Create Your Account")
- **Subtitle:** Emphasize community and local focus
- **Option Labels:** Start with "Continue with..." for consistency
- **Benefit Text:** Keep under 60 characters, emphasize speed ("Quick signup")
- **Privacy Text:** Build trust, address concerns proactively

### String Keys

| Key | Value |
|-----|-------|
| `signup_title` | Create Your Account |
| `signup_subtitle` | Join the Nepali community in your area |
| `signup_google` | Continue with Google |
| `signup_phone` | Continue with Phone Number |
| `signup_email` | Continue with Email |
| `signup_benefit` | Quick signup • Verification required later |
| `signup_privacy` | We'll never post without your permission |
| `signup_login_link` | Already have an account? Log In |

### Tone
- **Friendly:** "Join the Nepali community"
- **Reassuring:** Privacy text addresses concerns
- **Clear:** Simple, jargon-free language
- **Helpful:** Benefit text guides decision

---

## Technical Notes

### Identifiers
- Route: `/signup-method`
- iOS: `SignupMethodViewController` / `SignupMethodScreen`
- Android: `SignupMethodActivity` / `SignupMethodFragment`

### State Management
| Variable | Type | Description |
|----------|------|-------------|
| `selectedMethod` | `null \| 'google' \| 'phone' \| 'email'` | Currently selected signup method |
| `isLoading` | `boolean` | Whether OAuth is in progress |
| `errorMessage` | `string \| null` | Active error message to display |

No persistent state across sessions.

### Navigation

| Direction | Trigger | Destination |
|-----------|---------|-------------|
| Entry | Tap "Sign Up" on Screen 01 | This screen |
| Entry | Deep link `nepally://signup` | This screen |
| Exit | Google option | Google OAuth → Screen 03 (ZIP Code Entry) |
| Exit | Phone option | Phone entry screen (future) |
| Exit | Email option | Email entry screen (future) |
| Exit | Back button | Screen 01 (Welcome Screen) |
| Exit | Log In link | Login Screen (out of scope) |

### API Integration — Google OAuth Flow
1. User taps "Continue with Google"
2. Set `isLoading = true`, show spinner
3. Initiate OAuth: `GoogleSignIn.signIn()`
4. Redirect to Google consent screen (external)
5. User approves → Google redirects back with OAuth token
6. App receives token
7. Call API: `POST /auth/signup/google` with token
8. API returns: `{ user_id, session_token }`
9. Store session token securely
10. Navigate to Screen 03 (ZIP Code Entry)

**Error Handling:**
- OAuth cancelled → toast, reset `isLoading`
- OAuth error → error banner, reset `isLoading`
- Network error → error banner with retry
- Server error → generic error banner

### Performance
- Pre-load Google SDK for instant OAuth (load on app launch)
- Icons: vector or 2×/3× PNG for crisp display
- Animate cards on screen entry for polish (stagger fade-in)

### Design System Components Used
- Large Button (Card style) — adapted from Primary Button
- H1 Typography (34pt/sp Bold)
- Body Typography (17pt/16sp Regular)
- Caption Typography (13pt/12sp Regular)

---

## Testing Checklist

### Functional Tests
- [ ] Google option initiates OAuth flow
- [ ] Phone option navigates to phone entry screen
- [ ] Email option navigates to email entry screen
- [ ] Back button returns to Welcome Screen
- [ ] Log In link navigates to Login Screen
- [ ] OAuth cancellation handled gracefully
- [ ] OAuth error shows error banner

### Visual Tests
- [ ] All three option cards display correctly
- [ ] Icons are aligned and sized properly
- [ ] Text wraps correctly on narrow screens (320px width)
- [ ] Privacy text is centered
- [ ] Footer link is centered at bottom
- [ ] Safe area insets respected

### Accessibility Tests
- [ ] VoiceOver/TalkBack reads all elements in correct order
- [ ] All touch targets meet 44pt/48dp minimum
- [ ] Color contrast meets WCAG AA standards
- [ ] Dynamic Type/Large Text works correctly
- [ ] Focus indicators visible

### Integration Tests
- [ ] Google OAuth completes successfully
- [ ] Session token stored securely
- [ ] Navigation to Screen 03 works
- [ ] Error states trigger correctly
- [ ] Network errors handled gracefully

---

## Open Questions

- [ ] **"Recommended" badge on Google option?** — Pro: reduces decision paralysis. Con: may seem biased. Rec: A/B test signup completion rate.
- [ ] **"Most users choose this" social proof?** — Pro: leverages social proof. Con: no data yet. Rec: add after >100 signups and 60%+ choose Google.
- [ ] **Same benefit text for all methods?** — Current: all say "Quick signup • Verification required later". Alt: differentiate (Phone → "No password needed"). Rec: keep consistent.
- [ ] **Show estimated time per method?** — Example: "2 min" for Google, "3 min" for Phone. Pro: sets expectations. Con: may be inaccurate, adds clutter. Rec: skip, keep simple.

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Previous | [01-welcome-screen.md](../01-welcome-screen/01-welcome-screen.md) |
| Next | [03-zip-code-entry.md](../03-zip-code-entry/03-zip-code-entry.md) (after successful signup) |
| Journey | [01-signup-and-onboarding](../../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 5 |

---

**Status:** Draft — Ready for Review
**Next:** Create Screen 03 (ZIP Code Entry)
