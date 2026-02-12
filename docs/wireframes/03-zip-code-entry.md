# Wireframe: ZIP Code Entry

**Screen Number:** 03
**Journey Reference:** [01-signup-and-onboarding.md](../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 8
**User Story:** As a new user who just created an account, I want to enter my ZIP code so NUSA can show me posts in my local metro area.
**Last Updated:** 2026-02-12
**Status:** Draft

---

## Screen Purpose

This screen captures the user's ZIP code to map them to their local US Census Metro Area. This is critical for NUSA's metro-first location model, ensuring users only see relevant local content.

**Key Goals:**
- Collect ZIP code for metro area mapping
- Explain why we need location (transparency)
- Reassure users about privacy (exact address never shared)
- Validate ZIP code in real-time
- Allow skip option for users who want to browse first

---

## Visual Layout

### iOS Layout

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│     Where are you located?              │ ← H1: 34pt Bold, #212121
│                                         │    Left-aligned, 16px margin
│                                         │
│     We'll show you posts in your        │ ← Body: 17pt Regular, #757575
│     metro area                          │    Left-aligned, 16px margin
│                                         │
│                                         │ ← 48px spacing
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Your ZIP Code                     │ │ ← Label: 13pt Regular, #757575
│  ├───────────────────────────────────┤ │    Above input field
│  │                                   │ │
│  │         75080                     │ │ ← Input: 28pt Bold, #212121
│  │                                   │ │    Center-aligned, numeric
│  │                                   │ │    56px height, 8px radius
│  └───────────────────────────────────┘ │
│                                         │
│     e.g., 75080                        │ ← Helper text: 13pt, #757575
│                                         │    Below input, left-aligned
│                                         │
│                                         │ ← 24px spacing
│  ℹ️  We use US Census Metro Areas to   │ ← Info box with icon
│     show you local content. Your        │    Light blue bg (#E3F2FD)
│     exact address is never shared.      │    16px padding, 8px radius
│                                         │    13pt Regular, #1565C0
│                                         │
│                                         │ ← 48px spacing
│  ┌───────────────────────────────────┐ │
│  │        Continue                   │ │ ← Primary button: 48px height
│  └───────────────────────────────────┘ │    #1565C0 blue (or gray if disabled)
│                                         │    Disabled until valid ZIP
│                                         │
│                                         │
│                                         │
│     Skip for now                        │ ← Text link: 17pt, #1565C0
│     ─────────────                       │    Underlined on press
│                                         │
│                                         │ ← 24px bottom padding
└─────────────────────────────────────────┘

[Numeric Keyboard Overlay]
┌─────────────────────────────────────────┐
│ 1     2     3                          │
│ 4     5     6                          │
│ 7     8     9                          │
│       0     ⌫                          │ ← iOS numeric keyboard
└─────────────────────────────────────────┘
```

### Android Layout

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│     Where are you located?              │ ← H1: 34sp Medium, #212121
│                                         │    Left-aligned, 16dp margin
│                                         │
│     We'll show you posts in your        │ ← Body: 16sp Regular, #757575
│     metro area                          │    Left-aligned, 16dp margin
│                                         │
│                                         │ ← 48dp spacing
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Your ZIP Code                     │ │ ← Floating label: 12sp, #757575
│  │                                   │ │    (Material Design style)
│  │         75080                     │ │ ← Input: 24sp Medium, #212121
│  │                                   │ │    Center-aligned, numeric
│  │ ─────────────────────────────────│ │    Underline, 56dp height
│  └───────────────────────────────────┘ │
│                                         │
│     e.g., 75080                        │ ← Helper text: 12sp, #757575
│                                         │    Below input, left-aligned
│                                         │
│                                         │ ← 24dp spacing
│  ℹ️  We use US Census Metro Areas to   │ ← Info box with icon
│     show you local content. Your        │    Light blue bg (#E3F2FD)
│     exact address is never shared.      │    16dp padding, 8dp radius
│                                         │    12sp Regular, #1565C0
│                                         │
│                                         │ ← 48dp spacing
│  ┌───────────────────────────────────┐ │
│  │        CONTINUE                   │ │ ← Primary button: 56dp height
│  └───────────────────────────────────┘ │    #1565C0 blue (or #BDBDBD gray if disabled)
│                                         │    Disabled until valid ZIP
│                                         │
│                                         │
│                                         │
│     SKIP FOR NOW                        │ ← Text link: 14sp, #1565C0
│     ────────────                        │    ALL CAPS, underlined
│                                         │
│                                         │ ← 24dp bottom padding
└─────────────────────────────────────────┘

[Numeric Keyboard Overlay]
┌─────────────────────────────────────────┐
│ 1     2     3                          │
│ 4     5     6                          │
│ 7     8     9                          │
│ ←     0     ⌫                          │ ← Android numeric keyboard
└─────────────────────────────────────────┘
```

---

## Component Details

### 1. Screen Title
**Type:** Text (Heading)
**Content:** "Where are you located?"
**Typography:**
- iOS: 34pt Bold, San Francisco
- Android: 34sp Medium, Roboto
**Color:** #212121 (Almost Black)
**Alignment:** Left
**Margin:** 16px/dp from left edge, 24px/dp from top

**Accessibility:**
- Semantic heading level: H1
- VoiceOver/TalkBack reads: "Where are you located?"

---

### 2. Subtitle
**Type:** Text (Body)
**Content:** "We'll show you posts in your metro area"
**Typography:**
- iOS: 17pt Regular, San Francisco
- Android: 16sp Regular, Roboto
**Color:** #757575 (Medium Gray)
**Alignment:** Left
**Margin:** 16px/dp from left edge, 8px/dp below title

**Accessibility:**
- Semantic role: Paragraph text
- VoiceOver/TalkBack reads full sentence

---

### 3. ZIP Code Input Field

**Type:** Text Input (Numeric)
**Label:** "Your ZIP Code" (13pt/12sp Regular, #757575)
**Placeholder:** Empty or "75080" as example
**Input Value:** User-entered 5-digit ZIP code
**Typography:**
- iOS: 28pt Bold, San Francisco (large for easy reading)
- Android: 24sp Medium, Roboto
**Color:** #212121 (Almost Black)
**Alignment:** Center (large centered numbers)
**Dimensions:**
- iOS: Full width with 16px margins, 56px height
- Android: Full width with 16dp margins, 56dp height
**Corner Radius:** 8px/dp
**Border:**
- iOS: 1px solid #E0E0E0 (default), 2px solid #1565C0 (active/focused)
- Android: Bottom underline 1dp #E0E0E0 (default), 2dp #1565C0 (active)
**Background:** White (#FFFFFF)

**Input Constraints:**
- Type: Numeric keyboard only (inputmode="numeric" on web)
- Max length: 5 characters
- Format: Exactly 5 digits (no dashes, spaces)
- Real-time validation: Check as user types

**States:**
- **Default:** Gray border, empty
- **Focused:** Blue border (2px), numeric keyboard appears
- **Valid Input (5 digits):** Green checkmark appears on right, "Continue" button enables
- **Invalid Input (<5 digits):** No error shown (allow typing)
- **Invalid ZIP (after Continue tap):** Red border, error text below

**Interaction:**
- Tap field: Show numeric keyboard
- Type digits: Display in center-aligned format
- 5 digits entered: Auto-validate (check if exists in database)
- Backspace: Delete last digit
- iOS: "Done" button on keyboard dismisses keyboard
- Android: Hardware back button dismisses keyboard

**Accessibility:**
- Label: "Your ZIP Code"
- Hint: "Enter your 5-digit US ZIP code. For example, 75080."
- Trait: Text field, numeric keyboard
- Error state announced by screen reader

---

### 4. Helper Text
**Type:** Text (Caption)
**Content:** "e.g., 75080"
**Typography:**
- iOS: 13pt Regular, San Francisco
- Android: 12sp Regular, Roboto
**Color:** #757575 (Medium Gray)
**Alignment:** Left
**Position:** 8px/dp below input field

**Purpose:** Provide example format for users who are unsure

**Accessibility:**
- Not announced by screen reader (decorative)

---

### 5. Info Box (Privacy Reassurance)

**Type:** Information callout
**Content:** "ℹ️ We use US Census Metro Areas to show you local content. Your exact address is never shared."
**Background:** Light blue (#E3F2FD - 10% opacity of Primary Blue)
**Border:** None or 1px solid #BBDEFB (lighter blue)
**Corner Radius:** 8px/dp
**Padding:** 16px/dp all around
**Icon:** Info icon (ℹ️) or Material "info" icon, 16px/dp, #1565C0
**Text:**
- iOS: 13pt Regular, San Francisco
- Android: 12sp Regular, Roboto
**Text Color:** #1565C0 (Primary Blue) - stronger emphasis
**Alignment:** Left

**Purpose:**
- Explain why we need ZIP code (metro area mapping)
- Reassure privacy concerns (exact address never shared)
- Build trust with transparency

**Accessibility:**
- Label: "Information. We use US Census Metro Areas to show you local content. Your exact address is never shared."
- Trait: Static text
- Not tappable

---

### 6. Continue Button (Primary)

**Type:** Button
**Label:** "Continue"
**Dimensions:**
- iOS: Full width with 16px margins, 48px height
- Android: Full width with 16dp margins, 56dp height
**Corner Radius:** 8px/dp
**Background:**
- Enabled: #1565C0 (Primary Blue)
- Disabled: #BDBDBD (Gray)
**Text:**
- iOS: 17pt Semibold, White
- Android: 14sp Medium, White, ALL CAPS ("CONTINUE")
**Touch Target:** Full button size

**States:**
- **Disabled (Default):** Gray background, white text, no interaction
- **Enabled (5 valid digits entered):** Blue background, white text
- **Pressed:** Darker blue (#104D99), scale 0.98
- **Loading:** Show spinner, disable tap

**Interaction:**
- **Disabled State:** Button does nothing, possibly shows subtle shake animation if tapped
- **Enabled State:**
  1. User taps button
  2. Show loading spinner inside button
  3. Call API: `POST /users/update-location` with `{ zip_code: "75080" }`
  4. API validates ZIP and returns metro area
  5. Navigate to Screen 04 (Metro Confirmation)

**Accessibility:**
- Label: "Continue"
- Hint: "Validate your ZIP code and continue to next step"
- Trait: Button
- Disabled state announced: "Continue button, dimmed"
- Enabled state announced: "Continue button"

---

### 7. Skip Link

**Type:** Text Button (Link style)
**Label:** "Skip for now"
**Typography:**
- iOS: 17pt Regular, San Francisco
- Android: 14sp Regular, Roboto, ALL CAPS ("SKIP FOR NOW")
**Color:** #1565C0 (Primary Blue)
**Alignment:** Center
**Position:** Below Continue button, 16px/dp spacing
**Underline:** On press only (iOS) or always (Android)

**Interaction:**
- Tap: Skip ZIP entry, proceed to tutorial with no metro area set
- Show confirmation dialog: "Skip location? You won't see local posts until you set your location."
- Dialog buttons: "Skip Anyway" (primary) and "Cancel" (secondary)

**Accessibility:**
- Label: "Skip for now"
- Hint: "Skip entering your ZIP code. You can set your location later."
- Trait: Button

---

## Spacing & Layout Details

### Vertical Spacing (Top to Bottom)
1. Top safe area: Auto
2. 24px/dp padding
3. Title: ~40px height
4. 8px/dp spacing
5. Subtitle: ~50px height
6. 48px/dp spacing
7. Input label: ~20px
8. Input field: 56px height
9. Helper text: ~20px
10. 24px/dp spacing
11. Info box: ~80px height
12. 48px/dp spacing
13. Continue button: 48px/56dp height
14. 16px/dp spacing
15. Skip link: ~30px height
16. Flexible space
17. 24px/dp bottom padding
18. Numeric keyboard: ~260px/dp (overlays bottom)

**Total Height (without keyboard):** ~550px
**With Keyboard:** Screen scrolls to keep input visible

### Horizontal Spacing
- Screen margins: 16px/dp on both sides
- Input field: Full width minus 32px/dp
- Info box: Full width minus 32px/dp
- Button: Full width minus 32px/dp

---

## User Interactions

### Primary Flow
1. **Screen loads** → Numeric keyboard auto-appears, input field auto-focused
2. **User types ZIP code** → Numbers appear center-aligned in large font
3. **User enters 5th digit** → Real-time validation checks database
4. **Valid ZIP detected** → Green checkmark appears, "Continue" button enables
5. **User taps "Continue"** → Show loading spinner, call API
6. **API returns metro area** → Navigate to Screen 04 (Metro Confirmation)

### Alternative Flow: Skip
1. **User taps "Skip for now"** → Show confirmation dialog
2. **User taps "Skip Anyway"** → Set metro_area_id = null, proceed to tutorial
3. **Home screen (later)** → Show "Set your location to see local posts" banner

### Real-Time Validation Flow
**As user types:**
- 1 digit: No validation, Continue button disabled
- 2 digits: No validation, Continue button disabled
- 3 digits: No validation, Continue button disabled
- 4 digits: No validation, Continue button disabled
- 5 digits: **Trigger validation**
  - If valid: Green checkmark, enable Continue button
  - If invalid: Red border, show error text below input

---

## Platform-Specific Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| **Input Style** | Rounded box with border | Material underline style |
| **Keyboard "Done" Button** | Shows "Done" button to dismiss | Hardware back dismisses |
| **Button Text** | Title case ("Continue") | ALL CAPS ("CONTINUE") |
| **Typography** | San Francisco, 28pt input | Roboto, 24sp input |
| **Auto-Focus** | Input focused on load, keyboard appears | Input focused on load, keyboard appears |
| **Validation Timing** | On 5th digit typed | On 5th digit typed |
| **Error Indication** | Red 2px border + text below | Red underline + text below |

---

## Error States & Edge Cases

### Error State: Invalid ZIP Code (Not in Database)
**Scenario:** User enters 5 digits, but ZIP doesn't exist in `metro_area_zipcodes` table
**Trigger:** Real-time validation after 5th digit typed
**Behavior:**
- Input field border turns red (2px #C62828)
- Error text appears below input: "This ZIP code doesn't exist. Please enter a valid 5-digit US ZIP code."
- Error text color: #C62828 (Error Red), 13pt/12sp Regular
- Continue button remains disabled

**Recovery:**
- User taps backspace to delete and retry
- User taps input to edit
- Error clears when user starts typing again

**Accessibility:**
- Error announced by screen reader: "Error. This ZIP code doesn't exist. Please enter a valid 5-digit US ZIP code."

---

### Error State: ZIP Not in Metro Database
**Scenario:** User enters valid ZIP code format, but it's not mapped to any metro area in our database
**Trigger:** After tapping "Continue" and API returns 404
**Behavior:**
- Show error banner at top: "We don't have coverage in this area yet. Please try a nearby ZIP code or contact support@nusa.app"
- Banner: Red background (#C62828), white text, dismissible
- Input field remains editable
- "Contact Support" link in banner opens email client

**Recovery:**
- User can edit ZIP and try different nearby ZIP
- User can tap "Skip for now" to proceed without metro area
- User can contact support for help

---

### Error State: Network Error
**Scenario:** User taps "Continue" but API call fails (timeout, no internet)
**Behavior:**
- Show error banner: "Could not validate ZIP code. Please check your internet connection and try again."
- Banner: Red background, white text, "Retry" button
- Continue button returns to enabled state

**Recovery:**
- User taps "Retry" button in banner
- User can wait and tap "Continue" again

---

### Edge Case: Very Long Loading Time
**Scenario:** API takes >3 seconds to validate ZIP
**Behavior:**
- Show loading spinner inside Continue button
- After 3 seconds, show text below button: "Still loading... This is taking longer than usual."
- User can tap "Cancel" to stop loading and retry

---

### Edge Case: User Taps Continue Before Entering ZIP
**Scenario:** User taps Continue button while disabled (no ZIP entered)
**Behavior:**
- Button does nothing (disabled state)
- Optional: Subtle shake animation on input field to draw attention
- No error message (button is clearly disabled)

**Accessibility:**
- Screen reader announces: "Continue button, dimmed. Enter your ZIP code to continue."

---

### Edge Case: User Enters Non-Numeric Characters
**Scenario:** User tries to paste text or type letters
**Behavior:**
- Numeric keyboard prevents non-numeric input
- If paste contains non-numeric chars, strip them out, keep only digits
- Example: User pastes "ZIP: 75080" → Input shows "75080"

---

### Edge Case: User Doesn't Know Their ZIP Code
**Scenario:** User is very new to US, doesn't know ZIP code
**Behavior:**
- User can tap "Skip for now" and set location later
- **Future Enhancement:** Add "Use my current location" button that uses GPS to find ZIP

**Alternative Solution (Future):**
- Add help text: "Don't know your ZIP? [Look it up here]" → Link to USPS ZIP lookup tool

---

### Edge Case: User Changes Mind After Skip
**Scenario:** User taps "Skip for now", sees confirmation dialog, then taps "Cancel"
**Behavior:**
- Dialog closes, return to ZIP entry screen
- Input field remains focused, keyboard still visible

---

## Accessibility Requirements

### Screen Reader Support
- **Screen Title:** "Where are you located?"
- **Reading Order:**
  1. "Where are you located?"
  2. "We'll show you posts in your metro area"
  3. "Your ZIP Code, text field. Enter your 5-digit US ZIP code. For example, 75080."
  4. "Information. We use US Census Metro Areas to show you local content. Your exact address is never shared."
  5. "Continue button, dimmed" (or "Continue button" if enabled)
  6. "Skip for now button"

### Touch Targets
- Input field: Minimum 44x44pt (iOS) / 48x48dp (Android) height - ✓ 56px/dp exceeds
- Continue button: Minimum 44x44pt / 48x48dp - ✓ 48px/56dp meets/exceeds
- Skip link: Minimum 44x44pt touch area (add invisible padding)

### Color Contrast
- Title (#212121 on #FFFFFF): 16.9:1 ✓ (exceeds WCAG AAA)
- Body text (#757575 on #FFFFFF): 4.6:1 ✓ (meets WCAG AA)
- Input text (#212121 on #FFFFFF): 16.9:1 ✓
- Info box text (#1565C0 on #E3F2FD): 6.5:1 ✓ (meets WCAG AA)
- Error text (#C62828 on #FFFFFF): 7.8:1 ✓ (meets WCAG AAA)

### Focus Indicators
- iOS: VoiceOver shows yellow outline on input field
- Android: TalkBack shows green rectangle on input field
- Keyboard navigation: Blue focus ring

---

## Animations & Transitions

### Screen Entry
**Slide In:**
- iOS: Slide in from right (300ms, ease-in-out)
- Android: Slide up from bottom (300ms, material motion)
- Input field auto-focused, keyboard slides up simultaneously

### Input Validation Success
**Green Checkmark:**
- Duration: 200ms
- Effect: Checkmark icon fades in + scales from 0.8 to 1.0
- Position: Right side of input field, inside border
- Color: #2E7D32 (Success Green)

### Continue Button Enable
**State Change:**
- Duration: 200ms
- Effect: Background color fades from gray to blue
- Subtle pulse animation to draw attention

### Error State
**Red Border:**
- Duration: 300ms
- Effect: Border color fades from gray/blue to red
- Error text slides down from input field (100ms delay)

### Loading State
**Spinner:**
- Appears inside Continue button
- Replaces "Continue" text
- Spinner color: White
- Indefinite rotation animation

---

## Content Guidelines

### Copy Requirements
- **Title:** Question format, friendly ("Where are you located?")
- **Subtitle:** Clear value proposition (why we need this)
- **Info Box:** Explain metro areas + privacy reassurance (under 100 characters)
- **Error Messages:** Helpful, action-oriented (tell user what to do)

### Localization Notes
- String keys:
  - `zipcode_title`: "Where are you located?"
  - `zipcode_subtitle`: "We'll show you posts in your metro area"
  - `zipcode_label`: "Your ZIP Code"
  - `zipcode_helper`: "e.g., 75080"
  - `zipcode_info`: "We use US Census Metro Areas to show you local content. Your exact address is never shared."
  - `zipcode_button`: "Continue"
  - `zipcode_skip`: "Skip for now"
  - `zipcode_error_invalid`: "This ZIP code doesn't exist. Please enter a valid 5-digit US ZIP code."
  - `zipcode_error_no_coverage`: "We don't have coverage in this area yet. Please try a nearby ZIP code or contact support@nusa.app"

### Tone & Voice
- **Friendly:** "Where are you located?" (not "Enter ZIP")
- **Transparent:** Explain why we need ZIP (metro areas)
- **Reassuring:** Privacy message addresses concerns
- **Helpful:** Provide example ZIP code

---

## Technical Notes

### Screen Identifier
- iOS: `ZipCodeEntryViewController` or `ZipCodeEntryScreen`
- Android: `ZipCodeEntryActivity` or `ZipCodeEntryFragment`
- Route name: `/onboarding/zip-code`

### State Management
**Screen State:**
- `zipCode`: string (5 digits)
- `isValid`: boolean (true if ZIP exists in database)
- `isLoading`: boolean (during API call)
- `errorMessage`: string | null
- `showCheckmark`: boolean (true if validation passed)

**Validation Logic:**
```javascript
function validateZipCode(zip) {
  if (zip.length !== 5) return { valid: false, error: null };
  if (!/^\d{5}$/.test(zip)) return { valid: false, error: "Please enter only numbers" };

  // Check database
  const metroArea = await fetchMetroAreaByZip(zip);
  if (!metroArea) return { valid: false, error: "This ZIP code doesn't exist. Please enter a valid 5-digit US ZIP code." };

  return { valid: true, error: null, metroArea };
}
```

### Navigation
**Entry Points:**
- From Screen 02 (Signup Method Selection) after successful OAuth/signup
- Direct link: `nusa://onboarding/zip-code` (if user is authenticated but no metro area set)

**Exit Points:**
- Continue button → API call → Navigate to Screen 04 (Metro Confirmation)
- Skip link → Confirmation dialog → Navigate to Screen 05 (Tutorial) with metro_area_id = null
- Back button (if shown): Return to previous screen

### API Integration

**Endpoint:** `POST /users/update-location`
**Request:**
```json
{
  "user_id": "abc123",
  "zip_code": "75080"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "metro_area_id": "dallas-fort-worth-arlington",
  "metro_name": "Dallas-Fort Worth-Arlington",
  "state": "TX"
}
```

**Error Response (404 - ZIP not in database):**
```json
{
  "success": false,
  "error": "ZIP_NOT_FOUND",
  "message": "This ZIP code is not in our coverage area"
}
```

**Error Response (400 - Invalid format):**
```json
{
  "success": false,
  "error": "INVALID_ZIP",
  "message": "Please enter a valid 5-digit ZIP code"
}
```

### Database Query
**Real-time validation:**
```sql
SELECT metro_area_id, metro_name, state
FROM metro_area_zipcodes
WHERE zip_code = '75080';
```

**Update user record:**
```sql
UPDATE users
SET metro_area_id = 'dallas-fort-worth-arlington',
    zip_code = '75080',
    updated_at = NOW()
WHERE id = 'user_id';
```

### Performance Considerations
- **Debounce validation:** Wait 300ms after 5th digit before API call (in case user deletes/retypes)
- **Cache metro area data:** Store in memory for instant lookup
- **Optimize API:** ZIP validation should be <500ms response time
- **Keyboard handling:** Ensure smooth keyboard animation, no lag

---

## Design References

### Inspiration
- **Nextdoor ZIP Entry:** Simple, single input focus
- **Airbnb Location Entry:** Large, centered input with real-time validation
- **WhatsApp Phone Entry:** Clean, minimal design with auto-focus

### Design System Components Used
- Text Input (Large, centered style)
- Primary Button (from design system)
- Info Box (new component - light blue callout)
- H1 Typography (34pt/sp Bold)

---

## Testing Checklist

### Functional Tests
- [ ] Input accepts numeric only (5 digits)
- [ ] Real-time validation triggers after 5th digit
- [ ] Valid ZIP shows checkmark, enables Continue button
- [ ] Invalid ZIP shows error, keeps Continue button disabled
- [ ] Continue button calls API and navigates to Screen 04
- [ ] Skip link shows confirmation dialog
- [ ] Confirmation dialog "Skip Anyway" proceeds to tutorial
- [ ] Confirmation dialog "Cancel" returns to ZIP entry

### Visual Tests
- [ ] Input field displays large, centered numbers
- [ ] Numeric keyboard appears on screen load
- [ ] Info box has light blue background
- [ ] Continue button is gray (disabled) by default
- [ ] Continue button turns blue when ZIP is valid
- [ ] Checkmark appears on right side of input when valid
- [ ] Error text appears below input when invalid

### Accessibility Tests
- [ ] VoiceOver/TalkBack reads all elements in order
- [ ] Input field announced as "text field, numeric keyboard"
- [ ] Continue button disabled state announced
- [ ] Error messages announced by screen reader
- [ ] Touch targets meet 44pt/48dp minimum

### Integration Tests
- [ ] API validates ZIP correctly
- [ ] Database query returns metro area
- [ ] User record updated with ZIP and metro area
- [ ] Navigation to Screen 04 works
- [ ] Error states handled gracefully

### Edge Case Tests
- [ ] Invalid ZIP format shows error
- [ ] ZIP not in database shows error
- [ ] Network error shows retry option
- [ ] Skip confirmation dialog works
- [ ] Paste non-numeric text strips chars
- [ ] Very long API response shows "Still loading" message

---

## Open Questions

- [ ] **Should we auto-submit on 5th digit?**
  - **Current:** User must tap Continue after entering 5 digits
  - **Alternative:** Auto-navigate immediately after 5th digit is validated
  - **Recommendation:** Keep Continue button - gives user control, prevents accidental submissions

- [ ] **Should we add "Use my current location" option?**
  - **Pro:** Easier for users who don't know ZIP
  - **Con:** Requires location permission, privacy concern
  - **Recommendation:** Add in Phase 2 after testing manual ZIP entry

- [ ] **Should we show metro area name immediately after validation?**
  - **Current:** Wait until Screen 04 (Metro Confirmation) to show metro name
  - **Alternative:** Show "Dallas-Fort Worth-Arlington" below input after checkmark
  - **Recommendation:** Keep separate confirmation screen for clear visual feedback

- [ ] **Should we allow editing ZIP later?**
  - **Yes** - User should be able to update ZIP in Settings
  - Open question: How often can users change metro area? (prevent abuse)

---

## Related Screens

**Previous Screen:** [02-signup-method-selection.md](./02-signup-method-selection.md)
**Next Screen:** [04-metro-confirmation.md](./04-metro-confirmation.md) (on success)
**Alternative Next Screen:** [05-onboarding-tutorial.md](./05-onboarding-tutorial.md) (if skip)
**Related Journeys:**
- [01-signup-and-onboarding.md](../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 8

---

**Wireframe Status:** Draft - Ready for Review
**Next Steps:** Create Screen 04 (Metro Confirmation)
