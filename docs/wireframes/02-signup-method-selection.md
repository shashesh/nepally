# Wireframe: Signup Method Selection

**Screen Number:** 02
**Journey Reference:** [01-signup-and-onboarding.md](../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 5
**User Story:** As a new user, I want to choose how I sign up (Google, Phone, or Email) so I can create an account using my preferred method.
**Last Updated:** 2026-02-12
**Status:** Draft

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

## Visual Layout

### iOS Layout

```
┌─────────────────────────────────────────┐
│ <  Back                                 │ ← Nav bar: "< Back" top-left
│                                         │    44px height
│                                         │
│     Create Your Account                 │ ← H1: 34pt Bold, #212121
│                                         │    Left-aligned, 16px margin
│                                         │
│     Join the Nepali community           │ ← Body: 17pt Regular, #757575
│     in your area                        │    Left-aligned
│                                         │
│                                         │ ← 32px spacing
│  ┌───────────────────────────────────┐ │
│  │  [G]  Continue with Google        │ │ ← Option 1: Google
│  │                                   │ │    56px height, white bg
│  │  Quick signup • Verification      │ │    #E0E0E0 border, 12px radius
│  │  required later                   │ │
│  └───────────────────────────────────┘ │
│                                         │ ← 16px spacing
│  ┌───────────────────────────────────┐ │
│  │  [📱] Continue with Phone Number  │ │ ← Option 2: Phone
│  │                                   │ │    56px height
│  │  Quick signup • Verification      │ │
│  │  required later                   │ │
│  └───────────────────────────────────┘ │
│                                         │ ← 16px spacing
│  ┌───────────────────────────────────┐ │
│  │  [✉]  Continue with Email         │ │ ← Option 3: Email
│  │                                   │ │    56px height
│  │  Quick signup • Verification      │ │
│  │  required later                   │ │
│  └───────────────────────────────────┘ │
│                                         │
│                                         │ ← 24px spacing
│     🔒 We'll never post without       │ ← Privacy reassurance
│        your permission                 │    Caption: 13pt, #757575
│                                         │    Lock icon: 16px
│                                         │
│                                         │
│     Already have an account?           │ ← Footer link
│     Log In                             │    Caption with link
│     ──────                             │    Underlined, blue
│                                         │
│                                         │ ← 24px bottom padding
└─────────────────────────────────────────┘
```

### Android Layout

```
┌─────────────────────────────────────────┐
│ ←                                       │ ← Top app bar: Back arrow
│                                         │    56dp height
│                                         │
│     Create Your Account                 │ ← H1: 34sp Medium, #212121
│                                         │    Left-aligned, 16dp margin
│                                         │
│     Join the Nepali community           │ ← Body: 16sp Regular, #757575
│     in your area                        │    Left-aligned
│                                         │
│                                         │ ← 32dp spacing
│  ┌───────────────────────────────────┐ │
│  │  [G]  Continue with Google        │ │ ← Option 1: Google
│  │                                   │ │    64dp height, white bg
│  │  Quick signup • Verification      │ │    1dp border, 12dp radius
│  │  required later                   │ │    Material elevation: 1dp
│  └───────────────────────────────────┘ │
│                                         │ ← 16dp spacing
│  ┌───────────────────────────────────┐ │
│  │  [📱] Continue with Phone Number  │ │ ← Option 2: Phone
│  │                                   │ │    64dp height
│  │  Quick signup • Verification      │ │
│  │  required later                   │ │
│  └───────────────────────────────────┘ │
│                                         │ ← 16dp spacing
│  ┌───────────────────────────────────┐ │
│  │  [✉]  Continue with Email         │ │ ← Option 3: Email
│  │                                   │ │    64dp height
│  │  Quick signup • Verification      │ │
│  │  required later                   │ │
│  └───────────────────────────────────┘ │
│                                         │
│                                         │ ← 24dp spacing
│     🔒 We'll never post without       │ ← Privacy reassurance
│        your permission                 │    Caption: 12sp, #757575
│                                         │    Lock icon: 16dp
│                                         │
│                                         │
│     Already have an account?           │ ← Footer link
│     LOG IN                             │    Caption with link
│     ──────                             │    Underlined, blue, ALL CAPS
│                                         │
│                                         │ ← 24dp bottom padding
└─────────────────────────────────────────┘
```

---

## Component Details

### 1. Navigation Bar (iOS) / Top App Bar (Android)

**iOS:**
- Back button: "< Back" text, 17pt, #1565C0 (Primary Blue)
- Height: 44px
- Background: White (#FFFFFF)
- Tap area: 44x44pt minimum

**Android:**
- Back arrow: Material icon "arrow_back", 24dp, #212121
- Height: 56dp
- Background: White (#FFFFFF)
- Tap area: 48x48dp minimum

**Interaction:**
- Tap/Click: Navigate back to Screen 01 (Welcome Screen)
- iOS: Swipe right from left edge also goes back
- Android: Hardware back button also goes back

**Accessibility:**
- Label: "Back" or "Navigate back"
- VoiceOver/TalkBack announces: "Back button"

---

### 2. Screen Title
**Type:** Text (Heading)
**Content:** "Create Your Account"
**Typography:**
- iOS: 34pt Bold, San Francisco
- Android: 34sp Medium, Roboto
**Color:** #212121 (Almost Black)
**Alignment:** Left
**Margin:** 16px/dp from left edge

**Accessibility:**
- Semantic heading level: H1
- VoiceOver/TalkBack reads: "Create Your Account"

---

### 3. Subtitle
**Type:** Text (Body)
**Content:** "Join the Nepali community in your area"
**Typography:**
- iOS: 17pt Regular, San Francisco
- Android: 16sp Regular, Roboto
**Color:** #757575 (Medium Gray)
**Alignment:** Left
**Margin:** 16px/dp from left edge

**Accessibility:**
- Semantic role: Paragraph text
- VoiceOver/TalkBack reads full sentence

---

### 4. Google Signup Option

**Type:** Button (Large, card-style)
**Label:** "Continue with Google"
**Dimensions:**
- iOS: match_parent x 56px with 16px margins (height includes padding)
- Android: match_parent x 64dp with 16dp margins
**Corner Radius:** 12px/dp
**Background:** White (#FFFFFF)
**Border:** 1px/dp solid #E0E0E0
**Elevation (Android):** 1dp shadow
**Padding:** 16px/dp all around

**Content Layout:**
```
[Google Icon]  Continue with Google     [>]
24x24px        17pt Semibold, #212121   Chevron

               Quick signup • Verification required later
               13pt Regular, #757575
```

**Icon:**
- Google "G" logo (multicolor)
- Size: 24x24px/dp
- Position: 16px/dp from left edge
- Use official Google brand icon

**Text:**
- Main label: "Continue with Google" (17pt/16sp Semibold, #212121)
- Benefit text: "Quick signup • Verification required later" (13pt/12sp Regular, #757575)
- Chevron: Light gray arrow on right (optional)

**States:**
- **Default:** White bg, gray border
- **Pressed:** Light gray bg (#F5F5F5), scale 0.99
- **Focused (Android):** Blue 2px border
- **Loading:** Show spinner, disable tap

**Interaction:**
- Tap/Click: Initiate Google OAuth flow
- Show loading spinner during OAuth
- Haptic feedback on tap (iOS)

**Accessibility:**
- Label: "Continue with Google"
- Hint: "Sign up using your Google account. Quick signup with verification required later."
- Trait: Button
- Touch target: Full card size (exceeds 44pt/48dp)

---

### 5. Phone Number Signup Option

**Type:** Button (Large, card-style)
**Label:** "Continue with Phone Number"
**Dimensions:** Same as Google option
**Styling:** Same as Google option

**Content Layout:**
```
[Phone Icon]  Continue with Phone Number     [>]
24x24px       17pt Semibold, #212121         Chevron

              Quick signup • Verification required later
              13pt Regular, #757575
```

**Icon:**
- Phone icon: 📱 or Material "phone" icon
- Size: 24x24px/dp
- Color: #1565C0 (Primary Blue)

**States:** Same as Google option

**Interaction:**
- Tap/Click: Navigate to phone number entry screen (not in this wireframe)
- Haptic feedback on tap

**Accessibility:**
- Label: "Continue with Phone Number"
- Hint: "Sign up using your phone number. Quick signup with verification required later."
- Trait: Button

---

### 6. Email Signup Option

**Type:** Button (Large, card-style)
**Label:** "Continue with Email"
**Dimensions:** Same as Google option
**Styling:** Same as Google option

**Content Layout:**
```
[Email Icon]  Continue with Email     [>]
24x24px       17pt Semibold, #212121  Chevron

              Quick signup • Verification required later
              13pt Regular, #757575
```

**Icon:**
- Email icon: ✉ or Material "email" icon
- Size: 24x24px/dp
- Color: #1565C0 (Primary Blue)

**States:** Same as Google option

**Interaction:**
- Tap/Click: Navigate to email entry screen (not in this wireframe)
- Haptic feedback on tap

**Accessibility:**
- Label: "Continue with Email"
- Hint: "Sign up using your email address. Quick signup with verification required later."
- Trait: Button

---

### 7. Privacy Reassurance Text

**Type:** Text with icon
**Content:** "🔒 We'll never post without your permission"
**Typography:**
- iOS: 13pt Regular, San Francisco
- Android: 12sp Regular, Roboto
**Color:** #757575 (Medium Gray)
**Alignment:** Center
**Icon:** Lock emoji or lock icon (16px/dp)

**Position:** Below signup options, 24px/dp spacing

**Accessibility:**
- Label: "We'll never post without your permission"
- Icon has alt text: "Lock icon"

---

### 8. Log In Link (Footer)

**Type:** Text with link
**Content:** "Already have an account? Log In"
**Typography:**
- iOS: 13pt Regular, San Francisco
- Android: 12sp Regular, Roboto
**Color:** #757575 for regular text, #1565C0 for link
**Alignment:** Center
**Position:** 24px/dp from bottom

**Interactive Element:**
- "Log In" is tappable link (underlined on press)

**Interaction:**
- Tap "Log In": Navigate to Login Screen (out of scope)

**Accessibility:**
- Full text: "Already have an account? Log In"
- Link has clear focus indicator
- VoiceOver/TalkBack announces: "Link, Log In"

---

## Spacing & Layout Details

### Vertical Spacing (Top to Bottom)
1. Top safe area / status bar: Auto
2. Nav bar: 44px/56dp
3. 24px/dp spacing
4. Title: ~40px height
5. 8px/dp spacing
6. Subtitle: ~50px height
7. 32px/dp spacing
8. Google option: 56px/64dp
9. 16px/dp spacing
10. Phone option: 56px/64dp
11. 16px/dp spacing
12. Email option: 56px/64dp
13. 24px/dp spacing
14. Privacy text: ~20px height
15. Flexible space
16. Log In link: ~30px height
17. 24px/dp bottom padding

**Total Minimum Height:** ~520px (fits small devices)

### Horizontal Spacing
- Screen margins: 16px/dp on both sides
- All option cards: Full width minus 32px/dp
- Text: Left-aligned with 16px/dp margin

---

## User Interactions

### Primary Flow
1. **User lands on screen from Welcome Screen**
2. **User reads three options** → Takes 5-10 seconds to decide
3. **User taps "Continue with Google"** (most common choice)
4. **System initiates Google OAuth flow** → Redirect to Google consent screen
5. **User approves permissions** → Return to app, create account

### Alternative Flows
- **User taps "Continue with Phone Number"** → Navigate to phone entry screen
- **User taps "Continue with Email"** → Navigate to email entry screen
- **User taps "Log In"** → Navigate to Login Screen

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
| **Hardware Back Button** | N/A (swipe gesture) | Goes to previous screen |

---

## Error States & Edge Cases

### Edge Case: Google OAuth Cancelled
**Scenario:** User taps Google option, but cancels Google permission screen
**Behavior:**
- Return to this screen (no navigation)
- Show brief toast: "Signup cancelled. Please choose a method to continue."
- No error UI, allow user to retry

**Recovery:** User can tap Google option again

---

### Edge Case: Google OAuth Error
**Scenario:** Google OAuth fails (network error, timeout, server error)
**Behavior:**
- Return to this screen
- Show error banner at top: "Something went wrong with Google signup. Please try again or use a different method."
- Banner: Red background (#C62828), white text, dismissible
- Buttons remain enabled for retry

**Recovery:**
- User can tap "Try Again" in banner
- User can choose Phone or Email instead

---

### Edge Case: No Internet Connection
**Scenario:** User taps any signup option with no internet
**Behavior:**
- Show error banner immediately: "No internet connection. Please check your connection and try again."
- Banner: Red background, white text, dismissible
- Buttons remain enabled

**Recovery:**
- User can dismiss banner and retry after connecting
- Banner auto-dismisses when connection restored

---

### Edge Case: User Already Registered
**Scenario:** User attempts to sign up with Google account that's already registered
**Behavior:**
- After OAuth approval, backend detects duplicate email
- Show error banner: "This email is already registered. Please log in or use a different account."
- "Log In Instead" button in banner

**Recovery:**
- User taps "Log In Instead" → Navigate to Login Screen
- User can tap back and choose different method

---

### Edge Case: Google Account Picker (Multiple Accounts)
**Scenario:** User has multiple Google accounts on device
**Behavior:**
- Google OAuth shows account picker automatically
- User selects which account to use
- Proceed with selected account

**Note:** This is handled by Google, not NUSA UI

---

### Edge Case: Very Small Screen
**Scenario:** iPhone SE 1st gen (320px width, 568px height)
**Behavior:**
- Reduce option card height to 48px
- Reduce font sizes slightly (15pt/14sp for main labels)
- Reduce spacing between cards to 12px
- All content still visible and tappable

---

### Edge Case: Large Accessibility Text
**Scenario:** User has system text size set to 200%+
**Behavior:**
- Support Dynamic Type (iOS) / Large Text (Android)
- Option cards expand vertically to fit text
- May require vertical scrolling
- Maintain readability

---

## Accessibility Requirements

### Screen Reader Support
- **Screen Title:** "Create Your Account"
- **Reading Order:**
  1. "Back button"
  2. "Create Your Account"
  3. "Join the Nepali community in your area"
  4. "Continue with Google. Sign up using your Google account. Quick signup with verification required later."
  5. "Continue with Phone Number. Sign up using your phone number. Quick signup with verification required later."
  6. "Continue with Email. Sign up using your email address. Quick signup with verification required later."
  7. "We'll never post without your permission"
  8. "Already have an account? Log In"

### Touch Targets
- All option cards: Minimum 44x44pt (iOS) / 48x48dp (Android) - ✓ Exceeds (56px/64dp height)
- Back button: Minimum 44x44pt / 48x48dp - ✓
- Log In link: Minimum 44x44pt touch area (add invisible padding if needed)

### Color Contrast
- Title (#212121 on #FFFFFF): 16.9:1 ✓ (exceeds WCAG AAA)
- Body text (#757575 on #FFFFFF): 4.6:1 ✓ (meets WCAG AA)
- Card text (#212121 on #FFFFFF): 16.9:1 ✓
- Privacy text (#757575 on #FFFFFF): 4.6:1 ✓

### Focus Indicators
- iOS: VoiceOver shows yellow outline on focused card
- Android: TalkBack shows green rectangle on focused card
- Keyboard navigation (Android): Show blue focus ring around entire card

---

## Animations & Transitions

### Screen Entry
**Slide In from Right (iOS) / Slide Up (Android):**
- Duration: 300ms
- Easing: Ease-in-out
- Cards fade in with stagger (100ms delay between each)

### Option Card Press
**Press Feedback:**
- Duration: 150ms
- Easing: Ease-in-out
- Effect: Scale 0.99, background color to #F5F5F5
- iOS: Light haptic feedback
- Android: Ripple effect from tap point

### Loading State (During OAuth)
**Google Option:**
- Show spinner in center of card
- Hide main text
- Disable all other buttons
- Gray out other options

### Error Banner
**Slide Down from Top:**
- Duration: 300ms
- Easing: Ease-out
- Auto-dismiss after 5 seconds or user taps X

---

## Content Guidelines

### Copy Requirements
- **Title:** Clear, action-oriented ("Create Your Account")
- **Subtitle:** Emphasize community and local focus
- **Option Labels:** Start with "Continue with..." for consistency
- **Benefit Text:** Keep under 60 characters, emphasize speed ("Quick signup")
- **Privacy Text:** Build trust, address concerns proactively

### Localization Notes
- String keys:
  - `signup_title`: "Create Your Account"
  - `signup_subtitle`: "Join the Nepali community in your area"
  - `signup_google`: "Continue with Google"
  - `signup_phone`: "Continue with Phone Number"
  - `signup_email`: "Continue with Email"
  - `signup_benefit`: "Quick signup • Verification required later"
  - `signup_privacy`: "We'll never post without your permission"
  - `signup_login_link`: "Already have an account? Log In"

### Tone & Voice
- **Friendly:** "Join the Nepali community"
- **Reassuring:** Privacy text addresses concerns
- **Clear:** Simple, jargon-free language
- **Helpful:** Benefit text guides decision

---

## Technical Notes

### Screen Identifier
- iOS: `SignupMethodViewController` or `SignupMethodScreen`
- Android: `SignupMethodActivity` or `SignupMethodFragment`
- Route name: `/signup-method`

### State Management
**Screen State:**
- `selectedMethod`: null | 'google' | 'phone' | 'email'
- `isLoading`: boolean (for OAuth in progress)
- `errorMessage`: string | null

**No persistent state across sessions**

### Navigation
**Entry Points:**
- From Screen 01 (Welcome Screen) via "Sign Up" button
- Deep link: `nusa://signup` (redirects here)

**Exit Points:**
- Google option → Google OAuth flow → Return with token → Navigate to Screen 03
- Phone option → Navigate to phone entry screen (future)
- Email option → Navigate to email entry screen (future)
- Back button → Return to Screen 01
- Log In link → Navigate to Login Screen

### API Integration
**Google OAuth Flow:**
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
- OAuth cancelled: Show toast, reset `isLoading`
- OAuth error: Show error banner, reset `isLoading`
- Network error: Show error banner with retry option
- Server error: Show generic error banner

### Performance Considerations
- Pre-load Google SDK for instant OAuth (load on app launch)
- Icons should be vector or 2x/3x PNG for crisp display
- Animate cards on screen entry for polish (stagger fade-in)

---

## Design References

### Inspiration
- **Google Sign-In UI:** Standard Google branding and flow
- **Airbnb Signup:** Multiple method cards with icons
- **Notion Signup:** Clean card-based method selection

### Design System Components Used
- Large Button (Card style) - adapted from Primary Button
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
- [ ] Text wraps correctly on narrow screens
- [ ] Privacy text is centered
- [ ] Footer link is centered at bottom
- [ ] Safe area insets respected

### Accessibility Tests
- [ ] VoiceOver/TalkBack reads all elements in order
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

- [ ] **Should we add "Recommended" badge to Google option?**
  - **Pro:** Reduces decision paralysis, guides users to fastest method
  - **Con:** May seem biased, some users prefer phone/email
  - **Recommendation:** A/B test - measure signup completion rate

- [ ] **Should we show "Most users choose this" social proof?**
  - **Pro:** Leverages social proof to guide decision
  - **Con:** May not be accurate if we don't have data yet
  - **Recommendation:** Add once we have >100 signups and 60%+ choose Google

- [ ] **Should benefit text be the same for all methods?**
  - **Current:** All say "Quick signup • Verification required later"
  - **Alternative:** Differentiate - Phone could say "No password needed"
  - **Recommendation:** Keep consistent to avoid implying one is better

- [ ] **Should we show estimated time for each method?**
  - **Example:** "2 minutes" for Google, "3 minutes" for Phone
  - **Pro:** Sets expectations, helps users choose
  - **Con:** May be inaccurate, adds clutter
  - **Recommendation:** Skip time estimates, keep it simple

---

## Related Screens

**Previous Screen:** [01-welcome-screen.md](./01-welcome-screen.md)
**Next Screen:** [03-zip-code-entry.md](./03-zip-code-entry.md) (after successful OAuth)
**Related Journeys:**
- [01-signup-and-onboarding.md](../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 5

---

**Wireframe Status:** Draft - Ready for Review
**Next Steps:** Create Screen 03 (ZIP Code Entry)
