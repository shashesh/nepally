# Wireframe: Onboarding Tutorial

**Screen Number:** 05
**Journey Reference:** [01-signup-and-onboarding.md](../user-journeys/onboarding/01-signup-and-onboarding.md) - Steps 10-12
**User Story:** As a new user, I want to quickly understand NUSA's key features (metro-first feed, trust levels, post categories) so I can use the app effectively.
**Last Updated:** 2026-02-12
**Status:** Draft

---

## Screen Purpose

This tutorial educates new users about NUSA's three core concepts through a horizontal swipeable card interface. It's designed to be skippable but valuable, providing context that improves the user experience.

**Key Goals:**
- Explain metro-first local feed concept
- Introduce 3-tier trust level system
- Showcase 4 main post categories and auto-expiry
- Keep tutorial brief (3 cards max) to reduce friction
- Allow skip for impatient users
- Use visuals + concise text for quick comprehension

---

## Visual Layout

### iOS Layout - Card 1 of 3

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│            [ILLUSTRATION]               │ ← Visual: Map pin + local area
│        [Metro-first Feed Icon]          │    120x120px illustration
│              📍                         │    Subtle Nepali touches
│                                         │
│                                         │ ← 24px spacing
│     Metro-First Local Feed              │ ← H2: 22pt Semibold, #212121
│                                         │    Center-aligned
│                                         │
│                                         │ ← 12px spacing
│  See only housing, jobs, and            │ ← Body: 17pt Regular, #757575
│  emergencies in Dallas-Fort             │    Center-aligned, 3 lines max
│  Worth. No noise from other             │    Max width: 300px
│  cities.                                │
│                                         │
│                                         │
│                                         │
│     ● ○ ○                               │ ← Progress dots: 1 of 3
│                                         │    8px circles, 8px apart
│                                         │    Active: #1565C0, Inactive: #E0E0E0
│                                         │
│                                         │ ← 24px spacing
│  ┌───────────────────────────────────┐ │
│  │        Next                       │ │ ← Primary button: 48px height
│  └───────────────────────────────────┘ │    #1565C0 blue, white text
│                                         │
│                                         │ ← 12px spacing
│     Skip                                │ ← Text link: 17pt, #757575
│     ────                                │    Underlined on press
│                                         │
│                                         │ ← 24px bottom padding
└─────────────────────────────────────────┘
```

### iOS Layout - Card 2 of 3

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│            [ILLUSTRATION]               │ ← Visual: Shield with checkmark
│        [Trust Levels Icons]             │    120x120px illustration
│          ○ ✓ ✓✓                        │    Level 0, 1, 2 badges
│                                         │
│                                         │ ← 24px spacing
│   Verified Community Members            │ ← H2: 22pt Semibold, #212121
│                                         │    Center-aligned
│                                         │
│                                         │ ← 12px spacing
│  Level 1 users are phone-verified.      │ ← Body: 17pt Regular, #757575
│  Level 2 users are highly trusted       │    Center-aligned, 4 lines max
│  by the community. You're Level 0       │    Max width: 300px
│  right now.                             │
│                                         │
│                                         │
│     ○ ● ○                               │ ← Progress dots: 2 of 3
│                                         │    Active: #1565C0
│                                         │
│                                         │ ← 24px spacing
│  ┌───────────────────────────────────┐ │
│  │        Next                       │ │ ← Primary button
│  └───────────────────────────────────┘ │
│                                         │
│                                         │ ← 12px spacing
│     Skip                                │ ← Text link
│     ────                                │
│                                         │
│                                         │ ← 24px bottom padding
└─────────────────────────────────────────┘
```

### iOS Layout - Card 3 of 3

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│            [ILLUSTRATION]               │ ← Visual: 4 category icons
│         🏠 💼 🚨 ✈️                    │    24x24px each, in row
│                                         │    120px total width
│                                         │
│                                         │ ← 24px spacing
│      Four Main Categories               │ ← H2: 22pt Semibold, #212121
│                                         │    Center-aligned
│                                         │
│                                         │ ← 12px spacing
│  Browse housing, jobs, emergencies,     │ ← Body: 17pt Regular, #757575
│  and travel coordination. All posts     │    Center-aligned, 4 lines max
│  expire automatically to keep           │    Max width: 300px
│  content fresh.                         │
│                                         │
│  Housing & Jobs: 30 days                │ ← Expiry info: 15pt, #757575
│  Emergency: 7 days • Travel: 2 days     │    2 lines, slightly smaller
│                                         │
│     ○ ○ ●                               │ ← Progress dots: 3 of 3
│                                         │    Active: #1565C0
│                                         │
│                                         │ ← 24px spacing
│  ┌───────────────────────────────────┐ │
│  │        Get Started                │ │ ← Primary button (different label)
│  └───────────────────────────────────┘ │    Larger emphasis on final card
│                                         │
│                                         │ ← No skip link (final card)
│                                         │
│                                         │ ← 24px bottom padding
└─────────────────────────────────────────┘
```

### Android Layout - Card Structure Similar

```
┌─────────────────────────────────────────┐
│                                         │
│            [ILLUSTRATION]               │ ← Same illustrations
│                                         │    120x120dp
│                                         │
│     Card Title                          │ ← H2: 22sp Regular, #212121
│                                         │
│  Description text here...               │ ← Body: 16sp Regular, #757575
│                                         │
│                                         │
│     ● ○ ○                               │ ← Progress dots
│                                         │
│  ┌───────────────────────────────────┐ │
│  │        NEXT                       │ │ ← Button: 56dp height, ALL CAPS
│  └───────────────────────────────────┘ │
│                                         │
│     SKIP                                │ ← Text link: 14sp, ALL CAPS
│                                         │
└─────────────────────────────────────────┘
```

---

## Component Details

### 1. Tutorial Cards (Horizontal Scroll Container)

**Type:** Horizontal swipeable carousel
**Count:** 3 cards total
**Card Dimensions:** Full screen width and height (minus safe areas)
**Swipe Behavior:**
- Swipe left: Next card (Card 1 → 2 → 3)
- Swipe right: Previous card (Card 3 → 2 → 1)
- Snap to card (no half-card states)
- Smooth momentum scrolling
- iOS: Paging enabled (UIScrollView with pagingEnabled)
- Android: ViewPager2 or HorizontalPager (Compose)

**Layout:**
- Each card is vertically centered
- Content is center-aligned (illustration + text + button)
- Cards are not visible off-screen (one card at a time)

**Accessibility:**
- Each card is a separate screen reader context
- Swipe actions announced: "Swipe left for next card" / "Swipe right for previous card"
- VoiceOver/TalkBack: Users can navigate card-by-card with swipe gestures

---

### 2. Illustration (Visual Aid)

**Type:** Image or vector graphic
**Dimensions:** 120x120px (iOS) / 120x120dp (Android)
**Position:** Top center of card, below status bar

**Card 1 Illustration: Metro-First Feed**
- Visual: Map pin 📍 + circular radius around it
- Color: Primary Blue (#1565C0) with light blue (#E3F2FD) background circle
- Style: Simple, line-art style (not photorealistic)
- Subtle Nepali touch: Slight organic curve in pin design

**Card 2 Illustration: Trust Levels**
- Visual: Shield icon with three badges: ○ (Level 0), ✓ (Level 1), ✓✓ (Level 2)
- Color: Gray for Level 0, Green (#2E7D32) for Level 1, Blue (#1565C0) for Level 2
- Style: Icon-based, clear hierarchy
- Layout: Horizontal row of badges

**Card 3 Illustration: Four Categories**
- Visual: Four category icons in row: 🏠 💼 🚨 ✈️
- Icons: Housing (house), Jobs (briefcase), Emergency (alert), Travel (plane)
- Size: 24x24px each, 16px spacing between
- Color: Each icon uses its category color (Housing: Blue, Jobs: Blue, Emergency: Red, Travel: Blue)

**Accessibility:**
- Alt text:
  - Card 1: "Map pin showing local metro area"
  - Card 2: "Trust level badges showing Level 0, Level 1, and Level 2"
  - Card 3: "Four category icons: Housing, Jobs, Emergency, Travel"

---

### 3. Card Title

**Type:** Text (Heading)
**Typography:**
- iOS: 22pt Semibold, San Francisco
- Android: 22sp Regular, Roboto
**Color:** #212121 (Almost Black)
**Alignment:** Center
**Max Width:** 320px

**Content:**
- Card 1: "Metro-First Local Feed"
- Card 2: "Verified Community Members"
- Card 3: "Four Main Categories"

**Accessibility:**
- Semantic heading level: H2
- VoiceOver/TalkBack reads each title

---

### 4. Card Description Text

**Type:** Text (Body)
**Typography:**
- iOS: 17pt Regular, San Francisco
- Android: 16sp Regular, Roboto
**Color:** #757575 (Medium Gray)
**Alignment:** Center
**Max Width:** 300px
**Line Height:** 1.5x
**Max Lines:** 4 lines (truncate if longer)

**Content:**
- **Card 1:** "See only housing, jobs, and emergencies in Dallas-Fort Worth. No noise from other cities."
  - Dynamic: Replace "Dallas-Fort Worth" with user's actual metro area name
- **Card 2:** "Level 1 users are phone-verified. Level 2 users are highly trusted by the community. You're Level 0 right now."
- **Card 3:** "Browse housing, jobs, emergencies, and travel coordination. All posts expire automatically to keep content fresh."

**Expiry Info (Card 3 only):**
- Additional text below main description
- Typography: 15pt/14sp Regular, #757575
- Content: "Housing & Jobs: 30 days" (line 1), "Emergency: 7 days • Travel: 2 days" (line 2)
- Slightly smaller font to differentiate from main description

**Accessibility:**
- Semantic role: Paragraph text
- VoiceOver/TalkBack reads full description

---

### 5. Progress Dots

**Type:** Page indicators
**Count:** 3 dots (one per card)
**Dimensions:** 8px diameter circles, 8px spacing between
**Position:** Horizontally centered, below description text

**Colors:**
- Active dot: #1565C0 (Primary Blue), 8px diameter
- Inactive dots: #E0E0E0 (Light Gray), 8px diameter

**Animation:**
- When swiping to next card: Active dot slides to next position (200ms, ease-in-out)
- Optional: Scale active dot to 10px for emphasis

**Interaction:**
- iOS: Not tappable (standard UIPageControl behavior)
- Android: Optional - allow tapping dot to jump to that card

**Accessibility:**
- Announced by screen reader: "Page 1 of 3", "Page 2 of 3", "Page 3 of 3"
- Not separately focusable (context announced automatically)

---

### 6. Next Button (Primary) / Get Started Button (Final Card)

**Type:** Button
**Label:**
- Cards 1-2: "Next"
- Card 3: "Get Started" (more emphasis on final card)
**Dimensions:**
- iOS: Full width with 16px margins, 48px height
- Android: Full width with 16dp margins, 56dp height
**Corner Radius:** 8px/dp
**Background:** #1565C0 (Primary Blue)
**Text:**
- iOS: 17pt Semibold, White
- Android: 14sp Medium, White, ALL CAPS

**States:**
- **Default:** Blue background, white text
- **Pressed:** Darker blue (#104D99), scale 0.98
- **Disabled:** Not applicable (always enabled)

**Interaction:**
- Cards 1-2: Tap "Next" → Swipe to next card (animate to right)
- Card 3: Tap "Get Started" → Mark onboarding complete, navigate to Screen 06 (Home Screen)
- Haptic feedback on tap (iOS)

**Accessibility:**
- Label: "Next" or "Get Started"
- Hint: "Go to next tutorial card" or "Complete onboarding and view home screen"
- Trait: Button

---

### 7. Skip Link

**Type:** Text Button (Link style)
**Label:** "Skip"
**Typography:**
- iOS: 17pt Regular, San Francisco
- Android: 14sp Regular, Roboto, ALL CAPS ("SKIP")
**Color:** #757575 (Medium Gray) - less prominent than primary button
**Alignment:** Center
**Position:** Below Next button, 12px/dp spacing
**Underline:** On press only (iOS) or always (Android)

**Visibility:**
- Cards 1-2: Visible
- Card 3: Hidden (no skip on final card, just "Get Started")

**Interaction:**
- Tap: Show confirmation dialog (optional) or skip directly to Screen 06 (Home Screen)
- Confirmation dialog (optional): "Skip tutorial? You can always access help later."
  - Buttons: "Skip Tutorial" (primary) and "Continue Learning" (secondary)

**Accessibility:**
- Label: "Skip tutorial"
- Hint: "Skip onboarding tutorial and go directly to home screen"
- Trait: Button

---

## Spacing & Layout Details

### Vertical Spacing (per card, top to bottom)
1. Top safe area: Auto
2. Flexible space (centers content vertically)
3. Illustration: 120x120px/dp
4. 24px/dp spacing
5. Title: ~30px height
6. 12px/dp spacing
7. Description: ~80-100px height (3-4 lines)
8. Card 3 only: Expiry info (~40px height)
9. 24px/dp spacing
10. Progress dots: 8px height
11. 24px/dp spacing
12. Next/Get Started button: 48px/56dp height
13. 12px/dp spacing
14. Skip link: ~30px height (hidden on card 3)
15. Flexible space
16. 24px/dp bottom padding
17. Bottom safe area: Auto

**Total Minimum Height:** ~550px (fits small devices)

### Horizontal Spacing
- All content: Center-aligned
- Screen margins: 16px/dp on sides
- Button: Full width minus 32px/dp
- Text: Max width 300px, auto margins

---

## User Interactions

### Primary Flow (Complete Tutorial)
1. **User lands on Card 1** → Reads content (10 seconds)
2. **User taps "Next"** → Animate to Card 2 (300ms slide)
3. **User reads Card 2** → Takes 10-15 seconds
4. **User taps "Next"** → Animate to Card 3 (300ms slide)
5. **User reads Card 3** → Takes 15 seconds
6. **User taps "Get Started"** → Mark onboarding complete, navigate to Screen 06

**Total Tutorial Time:** 35-45 seconds for users who read everything

---

### Alternative Flow (Skip Tutorial)
1. **User lands on Card 1** → Starts reading
2. **User taps "Skip"** → Confirmation dialog appears
3. **User taps "Skip Tutorial"** → Navigate to Screen 06 immediately
4. **Onboarding marked complete** (with flag: tutorial_skipped = true)

---

### Alternative Flow (Swipe Navigation)
1. **User lands on Card 1**
2. **User swipes left** → Animate to Card 2 (instead of tapping "Next")
3. **User swipes left** → Animate to Card 3
4. **User swipes right** → Animate back to Card 2 (allow going backwards)

---

## Platform-Specific Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| **Scroll Behavior** | UIScrollView with pagingEnabled | ViewPager2 or HorizontalPager |
| **Swipe Gesture** | Native scroll momentum | Material page transition |
| **Button Text** | Title case ("Next", "Get Started") | ALL CAPS ("NEXT", "GET STARTED") |
| **Typography** | San Francisco, 22pt title | Roboto, 22sp title |
| **Page Indicator** | UIPageControl (dots below) | Custom dots or TabLayout indicator |
| **Skip Link** | Underline on press | Always underlined, ALL CAPS |

---

## Error States & Edge Cases

### Edge Case: User Swipes Past Last Card
**Scenario:** User tries to swipe left on Card 3 (no more cards)
**Behavior:**
- iOS: Slight bounce effect (rubber-band), returns to Card 3
- Android: Edge glow effect, stays on Card 3
- No navigation action

---

### Edge Case: User Presses Back Button
**Scenario:** User presses Android hardware back button or iOS swipe-back gesture
**Behavior:**
- **Card 1:** Go back to Screen 04 (Metro Confirmation) - allow user to change metro area
- **Cards 2-3:** Go back to previous card (Card 2 → 1, Card 3 → 2)

---

### Edge Case: Very Long Metro Area Name (Card 1)
**Scenario:** Metro name is >40 characters, doesn't fit in description text
**Behavior:**
- Abbreviate metro name (e.g., "Dallas-Fort Worth" instead of full name)
- Or use generic text: "See only posts in your metro area"

---

### Edge Case: User Quickly Swipes Through All Cards
**Scenario:** User swipes left rapidly to skip through tutorial
**Behavior:**
- Allow rapid swiping (don't block)
- Final card shows "Get Started" button immediately
- User can tap button to proceed

---

### Edge Case: User Closes App Mid-Tutorial
**Scenario:** User exits app on Card 2, reopens later
**Behavior:**
- Resume tutorial from Card 2 (remember position)
- Or restart from Card 1 (simpler implementation)
- **Recommendation:** Restart from Card 1 (tutorial is only 3 cards, quick to redo)

---

## Accessibility Requirements

### Screen Reader Support
- **Screen Title:** "Onboarding Tutorial, Card [1/2/3] of 3"
- **Reading Order per Card:**
  1. "Card [X] of 3"
  2. [Illustration alt text]
  3. [Card Title]
  4. [Card Description]
  5. "Next button" or "Get Started button"
  6. "Skip button" (if visible)

### Swipe Gestures (VoiceOver/TalkBack)
- Three-finger swipe left: Next card
- Three-finger swipe right: Previous card
- Or: Focus on "Next" button and activate with tap

### Touch Targets
- Next/Get Started button: Minimum 44x44pt / 48x48dp - ✓ 48px/56dp
- Skip link: Minimum 44x44pt touch area (add invisible padding)
- Progress dots: Not tappable (informational only)

### Color Contrast
- Title (#212121 on #FFFFFF): 16.9:1 ✓
- Description (#757575 on #FFFFFF): 4.6:1 ✓
- Button text (White on #1565C0): 7.2:1 ✓

---

## Animations & Transitions

### Screen Entry (from Screen 04)
**Slide In:**
- iOS: Slide in from right (300ms, ease-in-out)
- Android: Slide up from bottom (300ms, material motion)
- Card 1 content fades in after slide completes (200ms)

---

### Card Swipe Animation
**Horizontal Slide:**
- Duration: 300ms
- Easing: Ease-in-out (with slight deceleration at end)
- Effect: Current card slides out left, next card slides in from right
- Parallax effect (optional): Outgoing card moves faster than incoming card

---

### Progress Dot Animation
**Dot Transition:**
- Active dot: Animate from current to next position (200ms, ease-in-out)
- Scale animation (optional): Active dot scales from 8px to 10px (100ms)
- Color fade: New active dot fades from gray to blue (200ms)

---

### Button Press
**Press Feedback:**
- Duration: 150ms
- Effect: Scale 0.98, background darkens
- iOS: Light haptic feedback
- Android: Ripple effect

---

### Skip Confirmation Dialog (if used)
**Modal Fade In:**
- Duration: 200ms
- Background: Semi-transparent black overlay (50% opacity)
- Dialog: Slide up from bottom (iOS) or fade in (Android)

---

## Content Guidelines

### Copy Requirements
- **Titles:** Clear, descriptive (not clever or punny)
- **Descriptions:** Under 100 characters, action-oriented
- **Expiry Info:** Specific, not vague ("30 days" not "soon")
- **Button Labels:** Imperative verbs ("Next", "Get Started")

### Localization Notes
- String keys:
  - `tutorial_card1_title`: "Metro-First Local Feed"
  - `tutorial_card1_desc`: "See only housing, jobs, and emergencies in {metro_name}. No noise from other cities."
  - `tutorial_card2_title`: "Verified Community Members"
  - `tutorial_card2_desc`: "Level 1 users are phone-verified. Level 2 users are highly trusted by the community. You're Level 0 right now."
  - `tutorial_card3_title`: "Four Main Categories"
  - `tutorial_card3_desc`: "Browse housing, jobs, emergencies, and travel coordination. All posts expire automatically to keep content fresh."
  - `tutorial_card3_expiry`: "Housing & Jobs: 30 days\nEmergency: 7 days • Travel: 2 days"
  - `tutorial_button_next`: "Next"
  - `tutorial_button_start`: "Get Started"
  - `tutorial_skip`: "Skip"

- **Dynamic placeholder:**
  - `{metro_name}`: User's metro area name (e.g., "Dallas-Fort Worth")

### Tone & Voice
- **Educational:** Explain concepts clearly
- **Friendly:** "You're Level 0 right now" (not "You are currently Level 0")
- **Concise:** Short sentences, max 3-4 lines per card
- **Action-oriented:** Focus on what user can do ("See only...", "Browse...")

---

## Technical Notes

### Screen Identifier
- iOS: `OnboardingTutorialViewController` or `TutorialPageViewController`
- Android: `OnboardingTutorialActivity` or `TutorialPagerFragment`
- Route name: `/onboarding/tutorial`

### State Management
**Screen State:**
- `currentCardIndex`: number (0, 1, or 2)
- `tutorialCards`: array of 3 card objects
- `metroName`: string (for dynamic Card 1 description)

**Card Object:**
```javascript
{
  id: 1,
  illustration: "metro-pin.svg",
  title: "Metro-First Local Feed",
  description: "See only housing, jobs, and emergencies in {metro_name}...",
  buttonLabel: "Next"
}
```

**Persistent State:**
- `onboarding_tutorial_completed`: boolean (stored in user profile)
- `tutorial_skipped`: boolean (optional analytics flag)

---

### Navigation
**Entry Points:**
- From Screen 04 (Metro Confirmation) after tapping "Continue"
- If user skipped ZIP entry: Navigate here with generic metro name

**Exit Points:**
- Tap "Get Started" (Card 3) → Navigate to Screen 06 (Home Screen)
- Tap "Skip" (Cards 1-2) → Navigate to Screen 06 (Home Screen)
- Mark onboarding complete: `UPDATE users SET onboarding_completed = true`

---

### API Integration
**No API calls needed** on this screen
- Metro name passed from previous screen via navigation params
- Card content is static (pre-defined)

**Database Update (on completion):**
```sql
UPDATE users
SET onboarding_completed = true,
    tutorial_skipped = false, -- or true if skipped
    onboarding_completed_at = NOW()
WHERE id = 'user_id';
```

---

### Performance Considerations
- **Pre-load all card content:** Don't lazy-load (only 3 cards)
- **Optimize illustrations:** Use vector SVG or 2x/3x PNG (~20KB per image)
- **Smooth animations:** Use native scroll views (UIScrollView, ViewPager2) for 60fps
- **Memory:** All 3 cards loaded in memory (minimal footprint)

---

## Design References

### Inspiration
- **Nextdoor Onboarding:** Simple card-based tutorial with progress dots
- **Instagram Onboarding:** Horizontal swipe cards with illustrations
- **Duolingo Onboarding:** Colorful, friendly illustrations with concise text

### Design System Components Used
- Primary Button (from design system)
- Text Link (Skip)
- H2 Typography (22pt/sp Semibold)
- Body Typography (17pt/16sp Regular)
- Progress Dots (new component)

---

## Testing Checklist

### Functional Tests
- [ ] Swipe left advances to next card
- [ ] Swipe right returns to previous card
- [ ] Tap "Next" advances to next card
- [ ] Tap "Get Started" (Card 3) navigates to Home Screen
- [ ] Tap "Skip" navigates to Home Screen
- [ ] Progress dots update correctly
- [ ] Back button navigates to previous card or Screen 04

### Visual Tests
- [ ] All 3 cards display correctly
- [ ] Illustrations render at correct size (120x120px/dp)
- [ ] Text is center-aligned and readable
- [ ] Progress dots are centered
- [ ] Button and Skip link are positioned correctly
- [ ] Safe area insets respected

### Accessibility Tests
- [ ] VoiceOver/TalkBack reads all elements in order
- [ ] Swipe gestures work with screen reader
- [ ] Progress announced: "Page 1 of 3", etc.
- [ ] All touch targets meet 44pt/48dp minimum
- [ ] Color contrast meets WCAG AA

### Animation Tests
- [ ] Card swipe animation is smooth (60fps)
- [ ] Progress dot animation works
- [ ] No animation jank or lag
- [ ] Haptic feedback triggers on iOS (button press)

### Integration Tests
- [ ] Metro name dynamically inserted in Card 1
- [ ] Onboarding completion flag saved to database
- [ ] Navigation to Home Screen works
- [ ] Skip flag saved correctly

### Edge Case Tests
- [ ] Swipe past last card shows bounce effect
- [ ] Very long metro name handled
- [ ] Rapid swiping works smoothly
- [ ] App close/reopen resumes or restarts tutorial

---

## Open Questions

- [ ] **Should we add a fourth card?**
  - **Topic:** Red Alert system or Emergency posts
  - **Pro:** More comprehensive education
  - **Con:** Longer onboarding, higher skip rate
  - **Recommendation:** Keep 3 cards, add contextual tips in-app later

- [ ] **Should progress dots be tappable?**
  - **Pro:** Allows jumping to specific card
  - **Con:** May confuse users, adds complexity
  - **Recommendation:** No - linear flow is clearer

- [ ] **Should we add illustrations or use real screenshots?**
  - **Current:** Simple illustrations
  - **Alternative:** Actual app screenshots with annotations
  - **Recommendation:** Keep illustrations (cleaner, easier to localize)

- [ ] **Should Skip show confirmation dialog?**
  - **Pro:** Prevents accidental skips
  - **Con:** Adds friction, annoying if intentional
  - **Recommendation:** Skip confirmation dialog, allow direct skip

- [ ] **Should we auto-advance cards every 5 seconds?**
  - **Pro:** Ensures users see all cards
  - **Con:** Frustrating if user is still reading
  - **Recommendation:** No auto-advance, let user control pace

---

## Related Screens

**Previous Screen:** [04-metro-confirmation.md](./04-metro-confirmation.md)
**Next Screen:** [06-home-screen-level-0.md](./06-home-screen-level-0.md)
**Related Journeys:**
- [01-signup-and-onboarding.md](../user-journeys/onboarding/01-signup-and-onboarding.md) - Steps 10-12

---

**Wireframe Status:** Draft - Ready for Review
**Next Steps:** Create Screen 06 (Home Screen - Level 0)
