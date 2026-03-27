# Wireframe: Metro Confirmation

> **Screen:** 04 | **Status:** Draft | **Updated:** 2026-02-19
> **Journey:** [01-signup-and-onboarding](../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 9
> **Story:** As a new user who just entered my ZIP code, I want confirmation that Nepally mapped me to the correct metro area so I know I'll see relevant local posts.

---

## Screen Purpose

This screen provides positive feedback after ZIP code validation, confirming the user's metro area mapping. It serves as a brief celebration moment and builds confidence that the user will see relevant local content.

**Key Goals:**
- Confirm correct metro area mapping (visual success feedback)
- Show user that they're part of an active local community
- Build excitement for what's next (tutorial and local feed)
- Provide quick, non-blocking transition to tutorial

---

## Visual Wireframe

::: hero
![Success Checkmark](assets/success-checkmark.svg){icon:80x80 color:#2E7D32 bg:circle animated}

# You're in Dallas-Fort Worth-Arlington!

Join 2,847 verified members in your area

[Continue]*
:::

---

::: alert info
:info: **Edge Case — No Member Data**
Be among the first members in your area

[Continue]*
:::

---

::: alert info
:info: **Edge Case — Long Metro Name**

# You're in New York-Newark-Jersey City!

Join 12,503 verified members in your area

[Continue]*
:::

---

## Component Specifications

### 1. Success Checkmark Icon

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Icon with background circle | Icon with background circle |
| **Circle Size** | 80×80px | 80×80dp |
| **Checkmark Size** | 40×40px inside circle | 40×40dp inside circle |
| **Position** | Centered, top third of screen | Centered, top third of screen |
| **Circle Background** | #2E7D32 (Success Green) | #2E7D32 (Success Green) |
| **Checkmark Color** | White (#FFFFFF) | White (#FFFFFF) |
| **Border** | None or subtle white (2px) | None or subtle white (2px) |

**Animation on Load:**
- Circle: Scale from 0 to 1.0 (300ms, ease-out)
- Checkmark: Draw animation (path animation) from top-left to bottom-right (300ms, starts 100ms after circle)
- Optional: Subtle pulse effect (scale 1.0 → 1.05 → 1.0) after drawing completes
- Total animation time: 600ms

- **a11y:** Alt text "Success checkmark", not interactive; VoiceOver/TalkBack announces "Success"

---

### 2. Metro Area Confirmation Text

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Heading (H1) | Heading (H1) |
| **Font** | 28pt Bold, San Francisco | 28sp Medium, Roboto |
| **Color** | #212121 (Almost Black) | #212121 (Almost Black) |
| **Alignment** | Center | Center |
| **Max Width** | 320px | 320dp |
| **Line Height** | 1.2× | 1.2× |

**Dynamic Content:**
- Content template: "You're in {metro_name}!"
- Metro area name fetched from API response
- Always include exclamation mark for excitement
- If metro name is >40 chars, consider abbreviation

- **a11y:** Semantic heading H1; VoiceOver/TalkBack reads full text (e.g., "You're in Dallas-Fort Worth-Arlington!")

---

### 3. Member Count Subtext

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Body text (paragraph) | Body text (paragraph) |
| **Font** | 17pt Regular, San Francisco | 16sp Regular, Roboto |
| **Color** | #757575 (Medium Gray) | #757575 (Medium Gray) |
| **Alignment** | Center | Center |
| **Max Width** | 320px | 320dp |

**Dynamic Content:**
- Content template: "Join {count} verified members in your area"
- Member count uses comma separators (2,847 not 2847)
- If count < 100: Show "Join {count} verified members" (no comma)
- If count = 0 or 1: Show "Be among the first members in your area"

**Purpose:** Social proof, excitement, reassurance

- **a11y:** Semantic paragraph; VoiceOver/TalkBack reads full text

---

### 4. Continue Button (Primary)

| Property | iOS | Android |
|----------|-----|---------|
| **Height** | 48px | 56dp |
| **Width** | Full width − 32px margins | match_parent − 32dp margins |
| **Corner Radius** | 8px | 8dp |
| **Background** | #1565C0 (Primary Blue) | #1565C0 (Primary Blue) |
| **Text** | 17pt Semibold, White, "Continue" | 14sp Medium, White, "CONTINUE" |
| **Position** | Bottom, 24px above bottom edge / safe area | Bottom, 24dp above bottom edge / safe area |

**States:**
- Default: #1565C0 background, white text
- Pressed: #104D99 background, scale 0.98
- Loading: Show spinner (if API call needed), disable tap

**Interaction:** Tap → Navigate to Screen 05 (Onboarding Tutorial) + haptic (iOS light impact)
- No API call needed (metro already saved on previous screen)

**a11y:** Label "Continue", Hint "Continue to onboarding tutorial", min touch target 48×48pt (iOS) / 56×56dp (Android)

---

## Spacing & Layout

### Vertical Stack (Top to Bottom)

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Safe area / Status bar | Auto | — |
| 2 | Flexible space | Flex | Pushes content to center |
| 3 | Checkmark icon | 80px/dp | 32px/dp |
| 4 | Metro name text | ~70px (2 lines max) | 16px/dp |
| 5 | Member count text | ~50px (2 lines max) | Flex |
| 6 | Continue button | 48px / 56dp | 24px/dp |
| 7 | Bottom safe area | Auto | — |

**Total Minimum Height:** ~400px (fits all small devices)
**Content is vertically centered** with button anchored to bottom

**Horizontal:** 16px/dp margins on both sides. Button full width minus 32px/dp. Text max 320px centered.

---

## User Interactions

### Primary Flow
1. **Screen loads after successful ZIP validation** → Checkmark animation plays (600ms)
2. **User reads metro area name and member count** → ~3–5 seconds
3. **User taps "Continue"** → Navigate to Screen 05 (Onboarding Tutorial)

### Alternative Flow (Auto-Advance — Optional Enhancement)
- Auto-advance to tutorial after 3 seconds
- Show countdown indicator: "Continuing in 3... 2... 1..."
- User can tap "Continue" early to skip countdown
- User can tap anywhere on screen to cancel countdown
- **Recommendation:** Keep manual Continue button (gives user control, prevents feeling rushed)

---

## Platform-Specific Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| **Checkmark Animation** | Scale + path draw | Scale + path draw (same) |
| **Button Height** | 48px | 56dp (Material Design) |
| **Button Text** | Title case ("Continue") | ALL CAPS ("CONTINUE") |
| **Typography** | San Francisco (28pt H1, 17pt body) | Roboto (28sp H1, 16sp body) |
| **Press Feedback** | Scale 0.98 + haptic (light impact) | Scale 0.98 + ripple |
| **Haptic Feedback** | Light impact on button tap | No haptic (ripple only) |
| **Screen Transition** | Slide in from right (300ms) | Slide up from bottom (300ms, material motion) |

---

## Error States & Edge Cases

### Edge Case: No Member Count Data
**Scenario:** API doesn't return member count or count is 0
**Behavior:**
- Show alternative text: "Be among the first members in your area"
- Or: "You're all set! Let's explore Nepally"
- Still show checkmark and metro name

### Edge Case: Very Long Metro Area Name
**Scenario:** Metro name is >40 characters (e.g., "New York-Newark-Jersey City, NY-NJ-PA")
**Behavior:**
- Allow text to wrap to 2–3 lines
- Reduce font size slightly (24pt/sp instead of 28pt/sp)
- Ensure all text remains readable

### Edge Case: Metro Name Not Available
**Scenario:** API returns metro_area_id but no display name
**Behavior:**
- Show generic success message: "You're all set!"
- Show member count if available
- Log error for debugging

### Edge Case: User Presses Back Button
**Scenario:** User taps back (Android hardware back or iOS swipe)
**Behavior:**
- iOS: Disable swipe-back gesture (prevent going back to ZIP entry)
- Android: Intercept back button, show confirmation: "Go back and change your ZIP code?"
- Confirmation buttons: "Change ZIP" (returns to Screen 03) and "Cancel" (stays on current screen)
- **Rationale:** Prevent accidental return to ZIP entry after successful validation

### Edge Case: API Error (Metro Name Fetch Failed)
**Scenario:** API call to get metro details fails
**Behavior:**
- Show checkmark and generic success message: "You're all set!"
- Use cached metro name from Screen 03 if available
- Continue button still works (no blocking)

---

## Accessibility

### Screen Reader Order
1. "Success" (checkmark icon)
2. "You're in Dallas-Fort Worth-Arlington!" (metro name heading)
3. "Join 2,847 verified members in your area" (member count)
4. "Continue" button

### Screen Title
- Announced as: "Location Confirmed"

### Touch Targets
- Continue button: 48×48pt (iOS) / 56×56dp (Android) — meets minimum
- Checkmark icon: Not interactive (no touch target needed)

### Color Contrast (WCAG)

| Element | Ratio | Level |
|---------|-------|-------|
| Metro name (#212121 on #FFFFFF) | 16.9:1 | AAA ✓ |
| Member count (#757575 on #FFFFFF) | 4.6:1 | AA ✓ |
| Button text (White on #1565C0) | 7.2:1 | AAA ✓ |
| Checkmark (White on #2E7D32) | 8.5:1 | AAA ✓ |

### Focus Indicators
- iOS VoiceOver: yellow outline on Continue button
- Android TalkBack: green rectangle on Continue button

---

## Animations & Transitions

### Screen Entry Animation

| Step | Element | Delay | Duration | Effect |
|------|---------|-------|----------|--------|
| 1 | Background | 0ms | 300ms | Fade from transparent to white (ease-out) |
| 2 | Checkmark circle | 0ms | 300ms | Scale 0→1.0, ease-out (spring effect), bg #2E7D32 |
| 3 | Checkmark path | 100ms | 300ms | Path draw top-left to bottom-right, white |
| 4 | Checkmark pulse | 400ms | 200ms | Scale 1.0→1.05→1.0 (optional gentle rotation ±3°) |
| 5 | Metro name text | 700ms | 200ms | Fade in (ease-out) |
| 6 | Member count text | 800ms | 200ms | Fade in (ease-out) |
| 7 | Continue button | 1000ms | 200ms | Fade in (ease-out) |

**Total:** ~1200ms to full visibility

- iOS: Light haptic feedback at checkmark completion (300ms mark)

### Button Press
- Duration: 150ms, ease-in-out
- Scale 0.98 + background darkens to #104D99
- iOS: light haptic | Android: ripple from tap point

### Screen Exit (Navigate to Tutorial)
- iOS: Slide in from right (300ms, ease-in-out)
- Android: Slide up from bottom (300ms, material motion)

---

## Content & Localization

### Copy Requirements
- **Metro Name:** Use official US Census Metro Area name
- **Member Count:** Always show if available (social proof)
- **Tone:** Celebratory, welcoming ("You're in...!" with exclamation)
- **Button Label:** Simple imperative ("Continue")

### String Keys

| Key | Value |
|-----|-------|
| `metro_confirm_title` | You're in {metro_name}! |
| `metro_confirm_members_plural` | Join {count} verified members in your area |
| `metro_confirm_members_few` | Join {count} verified members in your area |
| `metro_confirm_members_zero` | Be among the first members in your area |
| `metro_confirm_button` | Continue |

### Dynamic Placeholders
- `{metro_name}`: Dallas-Fort Worth-Arlington
- `{count}`: 2,847 (formatted with commas)

### Tone
- **Celebratory:** "You're in...!" (exclamation mark adds excitement)
- **Welcoming:** "Join X members" (you're part of a community)
- **Encouraging:** Social proof builds confidence
- **Simple:** No jargon, clear next step

---

## Technical Notes

### Identifiers
- Route: `/onboarding/metro-confirmation`
- iOS: `MetroConfirmationViewController` / `MetroConfirmationScreen`
- Android: `MetroConfirmationActivity` / `MetroConfirmationFragment`

### State Management
- `metroAreaId`: string (e.g., "dallas-fort-worth-arlington")
- `metroName`: string (e.g., "Dallas-Fort Worth-Arlington")
- `memberCount`: number (e.g., 2847)
- `animationComplete`: boolean (true after checkmark animation finishes)

**Data Source:**
- Metro area name + ID: Passed from Screen 03 via navigation params
- Member count: Fetched from API or pre-loaded database

### Navigation

| Direction | Trigger | Destination |
|-----------|---------|-------------|
| Entry | ZIP validation success (Screen 03) | This screen |
| Entry | Nav params: `{ metroAreaId, metroName, memberCount }` | — |
| Exit | Tap "Continue" | `/onboarding/tutorial` (Screen 05) |
| Exit | Back button (Android) | Confirmation dialog → Screen 03 or stay |

**Params passed to next screen:** None (metro area already saved in DB)

### API Integration

**Endpoint (Optional):** `GET /metro-areas/:metro_area_id/stats`
**Purpose:** Fetch member count for social proof

```json
{
  "metro_area_id": "dallas-fort-worth-arlington",
  "metro_name": "Dallas-Fort Worth-Arlington",
  "member_count": 2847,
  "verified_count": 1203
}
```

**Timing:** Fetch during Screen 03 (ZIP validation) to avoid delay; fallback: show metro name without count

### Performance
- Use CSS/native animations (not JavaScript) for smooth 60fps
- Cache member count in memory
- Pass metro name via navigation params (no API call needed on this screen)
- Use vector SVG for checkmark (crisp at all sizes)

### Design System Components Used
- Success Checkmark Icon (new component — green circle)
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
- [ ] Checkmark is centered and sized correctly (80×80px/dp)
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
  - Pro: Faster onboarding, less tapping
  - Con: User may feel rushed, miss information
  - **Rec:** Keep manual Continue button (gives user control)

- [ ] **Should we show metro area map preview?**
  - Pro: Visual confirmation of location
  - Con: Adds complexity, requires map API
  - **Rec:** Skip for Phase 1, consider for Phase 2

- [ ] **Should we show more stats? (e.g., "1,203 verified members")**
  - Pro: More social proof
  - Con: Clutters screen, may overwhelm
  - **Rec:** Keep simple — just total member count

- [ ] **Should we add confetti animation?**
  - Pro: More celebratory, fun
  - Con: May feel gimmicky, slows down onboarding
  - **Rec:** A/B test — measure user sentiment

- [ ] **Should we allow user to change metro area here?**
  - Pro: Catch errors immediately
  - Con: Adds friction, delays progress
  - **Rec:** No — user can change in Settings later if needed

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Previous | [03-zip-code-entry.md](./03-zip-code-entry.md) |
| Next | [05-onboarding-tutorial.md](./05-onboarding-tutorial.md) |
| Journey | [01-signup-and-onboarding](../user-journeys/onboarding/01-signup-and-onboarding.md) - Step 9 |

---

**Status:** Draft — Ready for Review
**Next:** Create Screen 05 (Onboarding Tutorial)
