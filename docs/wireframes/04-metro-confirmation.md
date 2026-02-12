# Wireframe: Metro Confirmation

**Screen Number:** 04
**Journey Reference:** [01-signup-and-onboarding.md](../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 9
**User Story:** As a new user who just entered my ZIP code, I want confirmation that NUSA mapped me to the correct metro area so I know I'll see relevant local posts.
**Last Updated:** 2026-02-12
**Status:** Draft

---

## Screen Purpose

This screen provides positive feedback after ZIP code validation, confirming the user's metro area mapping. It serves as a brief celebration moment and builds confidence that the user will see relevant local content.

**Key Goals:**
- Confirm correct metro area mapping (visual success feedback)
- Show user that they're part of an active local community
- Build excitement for what's next (tutorial and local feed)
- Provide quick, non-blocking transition to tutorial

---

## Visual Layout

### iOS Layout

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│                                         │
│                                         │
│             ✓                           │ ← Success checkmark
│                                         │    80x80px, #2E7D32 green
│                                         │    Circle background, animated
│                                         │
│                                         │ ← 32px spacing
│   You're in Dallas-Fort                 │ ← H1: 28pt Bold, #212121
│   Worth-Arlington!                      │    Center-aligned, max 2 lines
│                                         │
│                                         │ ← 16px spacing
│   Join 2,847 verified members           │ ← Body: 17pt Regular, #757575
│   in your area                          │    Center-aligned
│                                         │
│                                         │
│                                         │
│                                         │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │        Continue                   │ │ ← Primary button: 48px height
│  └───────────────────────────────────┘ │    #1565C0 blue, white text
│                                         │
│                                         │
│                                         │ ← Bottom padding
└─────────────────────────────────────────┘
```

### Android Layout

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│                                         │
│                                         │
│             ✓                           │ ← Success checkmark
│                                         │    80x80dp, #2E7D32 green
│                                         │    Circle background, animated
│                                         │
│                                         │ ← 32dp spacing
│   You're in Dallas-Fort                 │ ← H1: 28sp Medium, #212121
│   Worth-Arlington!                      │    Center-aligned, max 2 lines
│                                         │
│                                         │ ← 16dp spacing
│   Join 2,847 verified members           │ ← Body: 16sp Regular, #757575
│   in your area                          │    Center-aligned
│                                         │
│                                         │
│                                         │
│                                         │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │        CONTINUE                   │ │ ← Primary button: 56dp height
│  └───────────────────────────────────┘ │    #1565C0 blue, white text
│                                         │    ALL CAPS
│                                         │
│                                         │ ← Bottom padding
└─────────────────────────────────────────┘
```

---

## Component Details

### 1. Success Checkmark Icon

**Type:** Icon with background circle
**Symbol:** ✓ (checkmark)
**Dimensions:**
- Circle: 80x80px (iOS) / 80x80dp (Android)
- Checkmark: 40x40px/dp inside circle
**Position:** Center of screen, top third
**Colors:**
- Circle background: #2E7D32 (Success Green)
- Checkmark: White (#FFFFFF)
**Border:** None or subtle white border (2px)

**Animation on Load:**
- Circle: Scale from 0 to 1.0 (300ms, ease-out)
- Checkmark: Draw animation (path animation) from top-left to bottom-right (300ms, starts 100ms after circle)
- Optional: Subtle pulse effect (scale 1.0 → 1.05 → 1.0) after drawing completes
- Total animation time: 600ms

**Accessibility:**
- Alt text: "Success checkmark"
- Not interactive
- VoiceOver/TalkBack: "Success"

---

### 2. Metro Area Confirmation Text

**Type:** Text (Heading)
**Content:** "You're in [Metro Area Name]!"
**Example:** "You're in Dallas-Fort Worth-Arlington!"
**Typography:**
- iOS: 28pt Bold, San Francisco
- Android: 28sp Medium, Roboto
**Color:** #212121 (Almost Black)
**Alignment:** Center
**Max Width:** 320px (allows text wrapping on narrow screens)
**Line Height:** 1.2x

**Dynamic Content:**
- Metro area name fetched from API response
- Format: Always include exclamation mark for excitement
- If metro name is very long (>40 chars), consider abbreviation

**Accessibility:**
- Semantic heading level: H1
- VoiceOver/TalkBack reads: "You're in Dallas-Fort Worth-Arlington!"

---

### 3. Member Count Subtext

**Type:** Text (Body)
**Content:** "Join [X,XXX] verified members in your area"
**Example:** "Join 2,847 verified members in your area"
**Typography:**
- iOS: 17pt Regular, San Francisco
- Android: 16sp Regular, Roboto
**Color:** #757575 (Medium Gray)
**Alignment:** Center
**Max Width:** 320px

**Dynamic Content:**
- Member count fetched from API or pre-loaded database
- Format: Use comma separators (2,847 not 2847)
- If count < 100: Show "Join [X] verified members" (no comma)
- If count = 0 or 1: Show "Be among the first members in your area"

**Purpose:**
- Social proof (community exists)
- Build excitement (you're joining an active group)
- Reassurance (you're not alone)

**Accessibility:**
- Semantic role: Paragraph text
- VoiceOver/TalkBack reads: "Join 2,847 verified members in your area"

---

### 4. Continue Button (Primary)

**Type:** Button
**Label:** "Continue"
**Dimensions:**
- iOS: Full width with 16px margins, 48px height
- Android: Full width with 16dp margins, 56dp height
**Corner Radius:** 8px/dp
**Background:** #1565C0 (Primary Blue)
**Text:**
- iOS: 17pt Semibold, White
- Android: 14sp Medium, White, ALL CAPS ("CONTINUE")
**Touch Target:** Full button size
**Position:** Bottom of screen, 24px/dp above bottom edge (or safe area inset)

**States:**
- **Default:** Blue background, white text
- **Pressed:** Darker blue (#104D99), scale 0.98
- **Loading:** Show spinner (if API call needed), disable tap

**Interaction:**
- Tap/Click: Navigate to Screen 05 (Onboarding Tutorial)
- Haptic feedback on tap (iOS light impact)
- No API call needed (metro already saved on previous screen)

**Accessibility:**
- Label: "Continue"
- Hint: "Continue to onboarding tutorial"
- Trait: Button
- Touch target: 48x48pt / 56x56dp

---

## Spacing & Layout Details

### Vertical Spacing (Top to Bottom)
1. Top safe area: Auto
2. Flexible space (pushes content to center)
3. Checkmark icon: 80x80px/dp
4. 32px/dp spacing
5. Metro name text: ~70px height (2 lines max)
6. 16px/dp spacing
7. Member count text: ~50px height (2 lines max)
8. Flexible space (pushes button to bottom)
9. Continue button: 48px/56dp height
10. 24px/dp bottom padding
11. Bottom safe area: Auto

**Total Minimum Height:** ~400px (fits all small devices)
**Content is vertically centered** with button anchored to bottom

### Horizontal Spacing
- All text: Center-aligned with 16px/dp margins
- Max width: 320px for text (prevents wide wrapping on tablets)
- Button: Full width with 16px/dp margins

---

## User Interactions

### Primary Flow (Automatic Progression)
1. **Screen loads after successful ZIP validation**
2. **Checkmark animation plays** (600ms)
3. **User sees metro area name and member count** → Takes 3-5 seconds to read
4. **User taps "Continue"** → Navigate to Screen 05 (Tutorial)

### Alternative Flow (Auto-Advance)
**Optional Enhancement:** Auto-advance to tutorial after 3 seconds
- Show countdown indicator: "Continuing in 3... 2... 1..."
- User can tap "Continue" early to skip countdown
- User can tap anywhere on screen to cancel countdown

**Recommendation:** Manual Continue button is better (gives user control, prevents feeling rushed)

---

## Platform-Specific Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| **Checkmark Animation** | Scale + path draw | Scale + path draw (same) |
| **Button Height** | 48px | 56dp |
| **Button Text** | Title case ("Continue") | ALL CAPS ("CONTINUE") |
| **Typography** | San Francisco, 28pt H1 | Roboto, 28sp H1 |
| **Button Pressed State** | Scale 0.98 + haptic | Scale 0.98 + ripple |
| **Haptic Feedback** | Light impact on button tap | No haptic (ripple only) |

---

## Error States & Edge Cases

### Edge Case: No Member Count Data
**Scenario:** API doesn't return member count or count is 0
**Behavior:**
- Show alternative text: "Be among the first members in your area"
- Or: "You're all set! Let's explore NUSA"
- Still show checkmark and metro name

---

### Edge Case: Very Long Metro Area Name
**Scenario:** Metro name is >40 characters (e.g., "New York-Newark-Jersey City, NY-NJ-PA")
**Behavior:**
- Allow text to wrap to 2-3 lines
- Reduce font size slightly (24pt/sp instead of 28pt/sp)
- Ensure all text remains readable

**Example:**
```
You're in New York-
Newark-Jersey City!
```

---

### Edge Case: Metro Name Not Available
**Scenario:** API returns metro_area_id but no display name
**Behavior:**
- Show generic success message: "You're all set!"
- Show member count if available
- Log error for debugging

---

### Edge Case: User Presses Back Button
**Scenario:** User taps back (Android hardware back or iOS swipe)
**Behavior:**
- iOS: Disable swipe-back gesture (prevent going back to ZIP entry)
- Android: Intercept back button, show confirmation: "Go back and change your ZIP code?"
- Confirmation buttons: "Change ZIP" (returns to Screen 03) and "Cancel" (stays on current screen)

**Rationale:** Prevent accidental return to ZIP entry after successful validation

---

### Edge Case: API Error (Metro Name Fetch Failed)
**Scenario:** API call to get metro details fails
**Behavior:**
- Show checkmark and generic success message: "You're all set!"
- Use cached metro name from Screen 03 if available
- Continue button still works (no blocking)

---

## Accessibility Requirements

### Screen Reader Support
- **Screen Title:** "Location Confirmed"
- **Reading Order:**
  1. "Success"
  2. "You're in Dallas-Fort Worth-Arlington!"
  3. "Join 2,847 verified members in your area"
  4. "Continue button"

### Touch Targets
- Continue button: Minimum 44x44pt (iOS) / 48x48dp (Android) - ✓ 48px/56dp meets/exceeds
- Checkmark icon: Not interactive (no touch target needed)

### Color Contrast
- Metro name (#212121 on #FFFFFF): 16.9:1 ✓ (exceeds WCAG AAA)
- Member count (#757575 on #FFFFFF): 4.6:1 ✓ (meets WCAG AA)
- Button text (White on #1565C0): 7.2:1 ✓ (meets WCAG AAA)
- Checkmark (White on #2E7D32): 8.5:1 ✓ (exceeds WCAG AAA)

### Focus Indicators
- iOS: VoiceOver shows yellow outline on Continue button
- Android: TalkBack shows green rectangle on Continue button

---

## Animations & Transitions

### Screen Entry Animation
**Fade In:**
- Duration: 300ms
- Easing: Ease-out
- Background fades from transparent to white
- Content fades in simultaneously

---

### Checkmark Animation (Primary Focus)

**Phase 1: Circle Appear (0-300ms)**
- Circle scales from 0 to 1.0
- Easing: Ease-out (spring effect)
- Background: #2E7D32 green

**Phase 2: Checkmark Draw (100-400ms)**
- Checkmark path draws from top-left to bottom-right
- SVG path animation or stroke-dasharray technique
- Color: White

**Phase 3: Pulse (400-600ms)**
- Subtle pulse: Scale 1.0 → 1.05 → 1.0
- Optional: Gentle rotation ±3 degrees for playfulness

**Total Animation Time:** 600ms

**iOS-Specific:**
- Add light haptic feedback at checkmark completion (300ms mark)

---

### Text Fade In
**Stagger Effect:**
- Metro name fades in 100ms after checkmark completes
- Member count fades in 100ms after metro name
- Each fade: 200ms duration, ease-out

---

### Button Fade In
**Delayed Appearance:**
- Button fades in 200ms after all text appears
- Duration: 200ms, ease-out
- Total time to button visible: ~1 second from screen load

---

### Continue Button Press
**Press Feedback:**
- Duration: 150ms
- Effect: Scale 0.98, background darkens
- iOS: Light haptic feedback
- Android: Ripple effect from tap point

---

### Screen Exit (Navigate to Tutorial)
**Slide Transition:**
- iOS: Slide in from right (300ms, ease-in-out)
- Android: Slide up from bottom (300ms, material motion)

---

## Content Guidelines

### Copy Requirements
- **Metro Name:** Use official US Census Metro Area name
- **Member Count:** Always show if available (social proof)
- **Tone:** Celebratory, welcoming ("You're in...!" with exclamation)
- **Button Label:** Simple imperative ("Continue")

### Localization Notes
- String keys:
  - `metro_confirm_title`: "You're in {metro_name}!"
  - `metro_confirm_members_plural`: "Join {count} verified members in your area"
  - `metro_confirm_members_few`: "Join {count} verified members in your area" (same, but for counts < 100)
  - `metro_confirm_members_zero`: "Be among the first members in your area"
  - `metro_confirm_button`: "Continue"

- **Dynamic placeholders:**
  - `{metro_name}`: Dallas-Fort Worth-Arlington
  - `{count}`: 2,847 (formatted with commas)

### Tone & Voice
- **Celebratory:** "You're in...!" (exclamation mark adds excitement)
- **Welcoming:** "Join X members" (you're part of a community)
- **Encouraging:** Social proof builds confidence
- **Simple:** No jargon, clear next step

---

## Technical Notes

### Screen Identifier
- iOS: `MetroConfirmationViewController` or `MetroConfirmationScreen`
- Android: `MetroConfirmationActivity` or `MetroConfirmationFragment`
- Route name: `/onboarding/metro-confirmation`

### State Management
**Screen State:**
- `metroAreaId`: string (e.g., "dallas-fort-worth-arlington")
- `metroName`: string (e.g., "Dallas-Fort Worth-Arlington")
- `memberCount`: number (e.g., 2847)
- `animationComplete`: boolean (true after checkmark animation finishes)

**Data Source:**
- Metro area name and ID: Passed from Screen 03 (ZIP Code Entry) via navigation params
- Member count: Fetched from API or pre-loaded database

---

### Navigation
**Entry Points:**
- From Screen 03 (ZIP Code Entry) after successful ZIP validation
- Navigation params: `{ metroAreaId, metroName, memberCount }`

**Exit Points:**
- Continue button → Navigate to Screen 05 (Onboarding Tutorial)
- Back button (Android): Show confirmation dialog, optionally return to Screen 03

**Navigation Params Passed to Next Screen:**
- None (user's metro area already saved in database)

---

### API Integration

**Endpoint (Optional):** `GET /metro-areas/:metro_area_id/stats`
**Purpose:** Fetch member count for social proof
**Request:** None (metro_area_id in URL)
**Response:**
```json
{
  "metro_area_id": "dallas-fort-worth-arlington",
  "metro_name": "Dallas-Fort Worth-Arlington",
  "member_count": 2847,
  "verified_count": 1203
}
```

**Timing:**
- Fetch during Screen 03 (ZIP validation) to avoid delay
- Or pre-load metro stats on app launch
- Fallback: Show metro name without member count if API fails

---

### Performance Considerations
- **Animation Performance:** Use CSS/native animations (not JavaScript) for smooth 60fps
- **Member Count:** Cache in memory, don't fetch on every load
- **Metro Name:** Pass via navigation params (no API call needed)
- **Checkmark SVG:** Use vector graphics for crisp display at all sizes

---

## Design References

### Inspiration
- **Airbnb Booking Confirmation:** Green checkmark with celebratory message
- **Uber Ride Confirmation:** Simple success state with next steps
- **WhatsApp Verification Success:** Minimal, clear confirmation

### Design System Components Used
- Success Checkmark Icon (new component - green circle)
- Primary Button (from design system)
- H1 Typography (28pt/sp Bold)
- Body Typography (17pt/16sp Regular)

---

## Testing Checklist

### Functional Tests
- [ ] Screen receives metro area name and member count
- [ ] Checkmark animation plays on load
- [ ] Metro name displays correctly (with line wrapping if needed)
- [ ] Member count displays with comma separators
- [ ] Continue button navigates to Screen 05 (Tutorial)
- [ ] Back button (Android) shows confirmation dialog

### Visual Tests
- [ ] Checkmark is centered and sized correctly (80x80px/dp)
- [ ] Text is center-aligned and readable
- [ ] Button is positioned at bottom with proper padding
- [ ] Animation plays smoothly (60fps)
- [ ] Safe area insets respected (iPhone notch, Android nav bar)

### Accessibility Tests
- [ ] VoiceOver/TalkBack reads all elements in order
- [ ] Checkmark announced as "Success"
- [ ] Metro name and member count read correctly
- [ ] Continue button touch target meets 44pt/48dp minimum
- [ ] Color contrast meets WCAG AA standards

### Animation Tests
- [ ] Checkmark animation completes in ~600ms
- [ ] Text fades in after checkmark (stagger effect)
- [ ] Button appears last (~1 second total)
- [ ] No animation jank or lag
- [ ] Haptic feedback triggers on iOS (optional)

### Edge Case Tests
- [ ] Very long metro name wraps correctly
- [ ] Zero member count shows alternative text
- [ ] No member count data handled gracefully
- [ ] API error handled gracefully
- [ ] Back button confirmation works (Android)

---

## Open Questions

- [ ] **Should we auto-advance after 3 seconds?**
  - **Pro:** Faster onboarding, less tapping
  - **Con:** User may feel rushed, miss information
  - **Recommendation:** Keep manual Continue button (gives user control)

- [ ] **Should we show metro area map preview?**
  - **Pro:** Visual confirmation of location
  - **Con:** Adds complexity, requires map API
  - **Recommendation:** Skip for Phase 1, consider for Phase 2

- [ ] **Should we show more stats? (e.g., "1,203 verified members")**
  - **Pro:** More social proof
  - **Con:** Clutters screen, may overwhelm
  - **Recommendation:** Keep simple - just total member count

- [ ] **Should we add confetti animation?**
  - **Pro:** More celebratory, fun
  - **Con:** May feel gimmicky, slows down onboarding
  - **Recommendation:** A/B test - measure user sentiment

- [ ] **Should we allow user to change metro area here?**
  - **Pro:** Catch errors immediately
  - **Con:** Adds friction, delays progress
  - **Recommendation:** No - user can change in Settings later if needed

---

## Related Screens

**Previous Screen:** [03-zip-code-entry.md](./03-zip-code-entry.md)
**Next Screen:** [05-onboarding-tutorial.md](./05-onboarding-tutorial.md)
**Related Journeys:**
- [01-signup-and-onboarding.md](../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 9

---

**Wireframe Status:** Draft - Ready for Review
**Next Steps:** Create Screen 05 (Onboarding Tutorial)
