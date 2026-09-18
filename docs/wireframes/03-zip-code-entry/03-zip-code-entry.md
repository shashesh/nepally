# Wireframe: ZIP Code Entry

> **Screen:** 03 | **Status:** Draft | **Updated:** 2026-02-19
> **Journey:** [01-signup-and-onboarding](../../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 8
> **Story:** As a new user who just created an account, I want to enter my ZIP code so Nepally can show me posts in my local metro area.

---

## Screen Purpose

This screen captures the user's ZIP code to map them to their local US Census Metro Area. This is critical for Nepally's metro-first location model, ensuring users only see relevant local content.

**Key Goals:**

- Collect ZIP code for metro area mapping
- Explain why we need location (transparency)
- Reassure users about privacy (exact address never shared)
- Validate ZIP code in real-time
- Allow skip option for users who want to browse first

---

## Visual Wireframe

::: hero

# Where are you located?

We'll show you posts in your metro area

Your ZIP Code
[75080___]{type:numeric,maxlength:5,align:center}

e.g., 75080

::: alert info
:information_source: We use US Census Metro Areas to show you local content. Your exact address is never shared.
:::

[Continue]{state:disabled}*

[Skip for now]{.outline}
:::

---

### Validation Success State

::: hero

# Where are you located?

We'll show you posts in your metro area

Your ZIP Code
[75080]{type:numeric,maxlength:5,align:center} ✅

e.g., 75080

::: alert info
:information_source: We use US Census Metro Areas to show you local content. Your exact address is never shared.
:::

[Continue]*

[Skip for now]{.outline}
:::

---

### Error State: Invalid ZIP Code

::: hero

# Where are you located?

We'll show you posts in your metro area

Your ZIP Code
[99999]{type:numeric,maxlength:5,align:center,state:error}

::: alert error
This ZIP code doesn't exist. Please enter a valid 5-digit US ZIP code.
:::

::: alert info
:information_source: We use US Census Metro Areas to show you local content. Your exact address is never shared.
:::

[Continue]{state:disabled}*

[Skip for now]{.outline}
:::

---

### Error State: ZIP Not in Metro Database

::: alert error
:warning: We don't have coverage in this area yet. Please try a nearby ZIP code or [contact support@nepally.us](mailto:support@nepally.us)
:::

---

### Error State: Network Error

::: alert error
:warning: Could not validate ZIP code. Please check your internet connection and try again.

[Retry]
:::

---

### Skip Confirmation Dialog

::: modal

### Skip location?

You won't see local posts until you set your location.

[Skip Anyway]* [Cancel]{.outline}
:::

---

## Component Specifications

### 1. Screen Title

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Text (Heading) | Text (Heading) |
| **Content** | "Where are you located?" | "Where are you located?" |
| **Font** | 34pt Bold, San Francisco | 34sp Medium, Roboto |
| **Color** | #212121 (Almost Black) | #212121 (Almost Black) |
| **Alignment** | Left | Left |
| **Margin** | 16px from left edge, 24px from top | 16dp from left edge, 24dp from top |

- Semantic heading: H1
- **a11y:** VoiceOver/TalkBack reads "Where are you located?"

---

### 2. Subtitle

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Text (Body) | Text (Body) |
| **Content** | "We'll show you posts in your metro area" | "We'll show you posts in your metro area" |
| **Font** | 17pt Regular, San Francisco | 16sp Regular, Roboto |
| **Color** | #757575 (Medium Gray) | #757575 (Medium Gray) |
| **Alignment** | Left | Left |
| **Margin** | 16px from left edge, 8px below title | 16dp from left edge, 8dp below title |

- Semantic role: Paragraph text
- **a11y:** VoiceOver/TalkBack reads full sentence

---

### 3. ZIP Code Input Field

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Text Input (Numeric) | Text Input (Numeric) |
| **Label** | "Your ZIP Code" (13pt Regular, #757575) | "Your ZIP Code" (12sp floating label, #757575) |
| **Placeholder** | Empty or "75080" as example | Empty or "75080" as example |
| **Input Font** | 28pt Bold, San Francisco | 24sp Medium, Roboto |
| **Input Color** | #212121 (Almost Black) | #212121 (Almost Black) |
| **Alignment** | Center (large centered numbers) | Center (large centered numbers) |
| **Height** | 56px | 56dp |
| **Width** | Full width − 32px margins | Full width − 32dp margins |
| **Corner Radius** | 8px | 8dp |
| **Border (Default)** | 1px solid #E0E0E0 | Bottom underline 1dp #E0E0E0 |
| **Border (Focused)** | 2px solid #1565C0 | Bottom underline 2dp #1565C0 |
| **Border (Error)** | 2px solid #C62828 | Bottom underline 2dp #C62828 |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Input Style** | Rounded box with border | Material underline style |
| **Keyboard** | Numeric only, "Done" button to dismiss | Numeric only, hardware back dismisses |

**Input Constraints:**

- Type: Numeric keyboard only (`inputmode="numeric"` on web)
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

- Tap field → Show numeric keyboard
- Type digits → Display in center-aligned format
- 5 digits entered → Auto-validate (check if exists in database)
- Backspace → Delete last digit
- iOS: "Done" button on keyboard dismisses keyboard
- Android: Hardware back button dismisses keyboard

**a11y:**

- Label: "Your ZIP Code"
- Hint: "Enter your 5-digit US ZIP code. For example, 75080."
- Trait: Text field, numeric keyboard
- Error state announced by screen reader

---

### 4. Helper Text

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Text (Caption) | Text (Caption) |
| **Content** | "e.g., 75080" | "e.g., 75080" |
| **Font** | 13pt Regular, San Francisco | 12sp Regular, Roboto |
| **Color** | #757575 (Medium Gray) | #757575 (Medium Gray) |
| **Alignment** | Left | Left |
| **Position** | 8px below input field | 8dp below input field |

- Purpose: Provide example format for users who are unsure
- **a11y:** Not announced by screen reader (decorative)

---

### 5. Info Box (Privacy Reassurance)

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Information callout | Information callout |
| **Background** | Light blue (#E3F2FD) | Light blue (#E3F2FD) |
| **Border** | None or 1px solid #BBDEFB | None or 1px solid #BBDEFB |
| **Corner Radius** | 8px | 8dp |
| **Padding** | 16px all around | 16dp all around |
| **Icon** | Info icon (ℹ️), 16px, #1565C0 | Material "info" icon, 16dp, #1565C0 |
| **Text Font** | 13pt Regular, San Francisco | 12sp Regular, Roboto |
| **Text Color** | #1565C0 (Primary Blue) | #1565C0 (Primary Blue) |
| **Alignment** | Left | Left |

**Content:** "ℹ️ We use US Census Metro Areas to show you local content. Your exact address is never shared."

**Purpose:**

- Explain why we need ZIP code (metro area mapping)
- Reassure privacy concerns (exact address never shared)
- Build trust with transparency

**a11y:**

- Label: "Information. We use US Census Metro Areas to show you local content. Your exact address is never shared."
- Trait: Static text
- Not tappable

---

### 6. Continue Button (Primary)

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Button (Primary) | Button (Primary) |
| **Label** | "Continue" (Title case) | "CONTINUE" (ALL CAPS) |
| **Height** | 48px | 56dp |
| **Width** | Full width − 32px margins | Full width − 32dp margins |
| **Corner Radius** | 8px | 8dp |
| **Background (Enabled)** | #1565C0 (Primary Blue) | #1565C0 (Primary Blue) |
| **Background (Disabled)** | #BDBDBD (Gray) | #BDBDBD (Gray) |
| **Background (Pressed)** | #104D99 (Darker Blue) | #104D99 (Darker Blue) |
| **Text Font** | 17pt Semibold, White | 14sp Medium, White |
| **Touch Target** | Full button size | Full button size |

**States:**

- **Disabled (Default):** Gray background, white text, no interaction
- **Enabled (5 valid digits entered):** Blue background, white text
- **Pressed:** Darker blue (#104D99), scale 0.98
- **Loading:** Show spinner, disable tap

**Interaction:**

1. User taps button
2. Show loading spinner inside button
3. Call API: `POST /users/update-location` with `{ zip_code: "75080" }`
4. API validates ZIP and returns metro area
5. Navigate to Screen 04 (Metro Confirmation)

**a11y:**

- Label: "Continue"
- Hint: "Validate your ZIP code and continue to next step"
- Trait: Button
- Disabled state: "Continue button, dimmed"
- Enabled state: "Continue button"

---

### 7. Skip Link

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Text Button (Link style) | Text Button (Link style) |
| **Label** | "Skip for now" (Title case) | "SKIP FOR NOW" (ALL CAPS) |
| **Font** | 17pt Regular, San Francisco | 14sp Regular, Roboto |
| **Color** | #1565C0 (Primary Blue) | #1565C0 (Primary Blue) |
| **Alignment** | Center | Center |
| **Position** | 16px below Continue button | 16dp below Continue button |
| **Underline** | On press only | Always shown |

**Interaction:**

- Tap → Show confirmation dialog: "Skip location? You won't see local posts until you set your location."
- Dialog buttons: "Skip Anyway" (primary) and "Cancel" (secondary)

**a11y:**

- Label: "Skip for now"
- Hint: "Skip entering your ZIP code. You can set your location later."
- Trait: Button

---

## Spacing & Layout

### Vertical Stack (Top to Bottom)

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Safe area / Status bar | Auto | — |
| 2 | Top padding | 24px/dp | — |
| 3 | Title | ~40px | 8px/dp |
| 4 | Subtitle | ~50px | 48px/dp |
| 5 | Input label | ~20px | — |
| 6 | Input field | 56px/dp | — |
| 7 | Helper text | ~20px | 24px/dp |
| 8 | Info box | ~80px | 48px/dp |
| 9 | Continue button | 48px / 56dp | 16px/dp |
| 10 | Skip link | ~30px | Flex |
| 11 | Bottom padding | 24px/dp | — |
| 12 | Numeric keyboard (overlay) | ~260px/dp | — |

**Total Height (without keyboard):** ~550px
**With Keyboard:** Screen scrolls to keep input visible

**Horizontal:** 16px/dp margins on both sides. Input field, info box, and button are full width minus 32px/dp.

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
| **Keyboard Dismiss** | "Done" button on keyboard | Hardware back dismisses |
| **Button Text** | Title case ("Continue") | ALL CAPS ("CONTINUE") |
| **Typography** | San Francisco, 28pt input | Roboto, 24sp input |
| **Auto-Focus** | Input focused on load, keyboard appears | Input focused on load, keyboard appears |
| **Validation Timing** | On 5th digit typed | On 5th digit typed |
| **Error Indication** | Red 2px border + text below | Red underline + text below |
| **Press Feedback** | Scale 0.98 + haptic | Scale 0.98 + ripple |
| **Screen Transition** | Slide in from right (300ms) | Slide up from bottom (300ms) |
| **Skip Link Underline** | On press only | Always shown |

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

**a11y:** Error announced by screen reader: "Error. This ZIP code doesn't exist. Please enter a valid 5-digit US ZIP code."

---

### Error State: ZIP Not in Metro Database

**Scenario:** User enters valid ZIP code format, but it's not mapped to any metro area in our database
**Trigger:** After tapping "Continue" and API returns 404
**Behavior:**

- Show error banner at top: "We don't have coverage in this area yet. Please try a nearby ZIP code or contact support@nepally.us"
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

**a11y:** Screen reader announces: "Continue button, dimmed. Enter your ZIP code to continue."

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

## Accessibility

### Screen Reader Order

1. "Where are you located?"
2. "We'll show you posts in your metro area"
3. "Your ZIP Code, text field. Enter your 5-digit US ZIP code. For example, 75080."
4. "Information. We use US Census Metro Areas to show you local content. Your exact address is never shared."
5. "Continue button, dimmed" (or "Continue button" if enabled)
6. "Skip for now button"

### Touch Targets

- Input field: Minimum 44×44pt (iOS) / 48×48dp (Android) height — ✓ 56px/dp exceeds
- Continue button: Minimum 44×44pt / 48×48dp — ✓ 48px/56dp meets/exceeds
- Skip link: Minimum 44×44pt touch area (add invisible padding)

### Color Contrast (WCAG)

| Element | Ratio | Level |
|---------|-------|-------|
| Title (#212121 on #FFFFFF) | 16.9:1 | AAA ✓ |
| Body text (#757575 on #FFFFFF) | 4.6:1 | AA ✓ |
| Input text (#212121 on #FFFFFF) | 16.9:1 | AAA ✓ |
| Info box text (#1565C0 on #E3F2FD) | 6.5:1 | AA ✓ |
| Error text (#C62828 on #FFFFFF) | 7.8:1 | AAA ✓ |

### Focus Indicators

- iOS VoiceOver: yellow outline on input field
- Android TalkBack: green rectangle on input field
- Keyboard navigation: Blue focus ring

---

## Animations & Transitions

### Screen Entry

| Step | Element | Delay | Duration | Effect |
|------|---------|-------|----------|--------|
| 1 | Screen | 0ms | 300ms | iOS: Slide in from right / Android: Slide up from bottom |
| 2 | Input field | 0ms | — | Auto-focused, keyboard slides up simultaneously |

### Input Validation Success

| Step | Element | Delay | Duration | Effect |
|------|---------|-------|----------|--------|
| 1 | Checkmark icon | 0ms | 200ms | Fade in + scale 0.8→1.0, right side of input, #2E7D32 |

### Continue Button Enable

| Step | Element | Delay | Duration | Effect |
|------|---------|-------|----------|--------|
| 1 | Button background | 0ms | 200ms | Color fade from gray (#BDBDBD) to blue (#1565C0) |
| 2 | Button | 200ms | 150ms | Subtle pulse to draw attention |

### Error State

| Step | Element | Delay | Duration | Effect |
|------|---------|-------|----------|--------|
| 1 | Input border | 0ms | 300ms | Color fade from gray/blue to red (#C62828) |
| 2 | Error text | 100ms | 200ms | Slide down from input field |

### Loading State

- Spinner appears inside Continue button, replaces "Continue" text
- Spinner color: White
- Indefinite rotation animation

### Button Press

- Duration: 150ms, ease-in-out
- Scale 0.98 + background darkens
- iOS: light haptic | Android: ripple from tap point

---

## Content & Localization

### Copy Requirements

- **Title:** Question format, friendly ("Where are you located?")
- **Subtitle:** Clear value proposition (why we need this)
- **Info Box:** Explain metro areas + privacy reassurance (under 100 characters)
- **Error Messages:** Helpful, action-oriented (tell user what to do)

### String Keys

| Key | Value |
|-----|-------|
| `zipcode_title` | Where are you located? |
| `zipcode_subtitle` | We'll show you posts in your metro area |
| `zipcode_label` | Your ZIP Code |
| `zipcode_helper` | e.g., 75080 |
| `zipcode_info` | We use US Census Metro Areas to show you local content. Your exact address is never shared. |
| `zipcode_button` | Continue |
| `zipcode_skip` | Skip for now |
| `zipcode_error_invalid` | This ZIP code doesn't exist. Please enter a valid 5-digit US ZIP code. |
| `zipcode_error_no_coverage` | We don't have coverage in this area yet. Please try a nearby ZIP code or contact support@nepally.us |

### Tone & Voice

- **Friendly:** "Where are you located?" (not "Enter ZIP")
- **Transparent:** Explain why we need ZIP (metro areas)
- **Reassuring:** Privacy message addresses concerns
- **Helpful:** Provide example ZIP code

---

## Technical Notes

### Identifiers

- Route: `/onboarding/zip-code`
- iOS: `ZipCodeEntryViewController` / `ZipCodeEntryScreen`
- Android: `ZipCodeEntryActivity` / `ZipCodeEntryFragment`

### State Management

| State | Type | Description |
|-------|------|-------------|
| `zipCode` | `string` | 5-digit user input |
| `isValid` | `boolean` | True if ZIP exists in database |
| `isLoading` | `boolean` | During API call |
| `errorMessage` | `string \| null` | Current error message |
| `showCheckmark` | `boolean` | True if validation passed |

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

| Direction | Trigger | Destination |
|-----------|---------|-------------|
| Entry | From Screen 02 after successful OAuth/signup | This screen |
| Entry | Deep link `nepally://onboarding/zip-code` (authenticated, no metro) | This screen |
| Exit | Tap "Continue" (valid ZIP) | `/metro-confirmation` (Screen 04) |
| Exit | Tap "Skip Anyway" in dialog | `/onboarding/tutorial` (Screen 05), metro_area_id = null |
| Back | Back button (if shown) | Previous screen |

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

**Error Response (404 — ZIP not in database):**

```json
{
  "success": false,
  "error": "ZIP_NOT_FOUND",
  "message": "This ZIP code is not in our coverage area"
}
```

**Error Response (400 — Invalid format):**

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

### Design System Components Used

- Text Input (Large, centered style)
- Primary Button (from design system)
- Info Box (new component — light blue callout)
- H1 Typography (34pt/sp Bold)

### Inspiration

- **Nextdoor ZIP Entry:** Simple, single input focus
- **Airbnb Location Entry:** Large, centered input with real-time validation
- **WhatsApp Phone Entry:** Clean, minimal design with auto-focus

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
  - **Recommendation:** Keep Continue button — gives user control, prevents accidental submissions

- [ ] **Should we add "Use my current location" option?**
  - **Pro:** Easier for users who don't know ZIP
  - **Con:** Requires location permission, privacy concern
  - **Recommendation:** Add in Phase 2 after testing manual ZIP entry

- [ ] **Should we show metro area name immediately after validation?**
  - **Current:** Wait until Screen 04 (Metro Confirmation) to show metro name
  - **Alternative:** Show "Dallas-Fort Worth-Arlington" below input after checkmark
  - **Recommendation:** Keep separate confirmation screen for clear visual feedback

- [ ] **Should we allow editing ZIP later?**
  - **Yes** — User should be able to update ZIP in Settings
  - Open question: How often can users change metro area? (prevent abuse)

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Previous | [02-signup-method-selection.md](../02-signup-method-selection/02-signup-method-selection.md) |
| Next (Success) | [04-metro-confirmation.md](../04-metro-confirmation/04-metro-confirmation.md) |
| Next (Skip) | [05-onboarding-tutorial.md](../05-onboarding-tutorial/05-onboarding-tutorial.md) |
| Journey | [01-signup-and-onboarding](../../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 8 |

---

**Status:** Draft — Ready for Review
**Next:** Create Screen 04 (Metro Confirmation)
