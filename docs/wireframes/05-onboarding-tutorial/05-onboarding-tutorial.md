# Wireframe: Onboarding Tutorial

> **Screen:** 05 | **Status:** Draft | **Updated:** 2026-02-19
> **Journey:** [01-signup-and-onboarding](../../user-journeys/onboarding/01-signup-and-onboarding.md) - Steps 10-12
> **Story:** As a new user, I want to quickly understand Nepally's key features (metro-first feed, trust levels, post categories) so I can use the app effectively.

---

## Screen Purpose

This tutorial educates new users about Nepally's three core concepts through a horizontal swipeable card interface. It's designed to be skippable but valuable, providing context that improves the user experience.

**Key Goals:**

- Explain metro-first local feed concept
- Introduce 3-tier trust level system
- Showcase 4 main post categories and auto-expiry
- Keep tutorial brief (3 cards max) to reduce friction
- Allow skip for impatient users
- Use visuals + concise text for quick comprehension

---

## Visual Wireframe

### Card 1 of 3: Metro-First Local Feed

::: card
![Metro-First Feed](assets/metro-pin.svg){alt:"Map pin showing local metro area" size:120x120}

## Metro-First Local Feed

See only housing, jobs, and emergencies in Dallas-Fort Worth. No noise from other cities.

● ○ ○ {role:page-indicator current:1 total:3}

[Next]*

[Skip]{.secondary}
:::

---

### Card 2 of 3: Verified Community Members

::: card
![Trust Levels](assets/trust-levels.svg){alt:"Trust level badges showing Level 0, Level 1, and Level 2" size:120x120}

## Verified Community Members

Level 1 users are phone-verified. Level 2 users are highly trusted by the community. You're Level 0 right now.

○ ● ○ {role:page-indicator current:2 total:3}

[Next]*

[Skip]{.secondary}
:::

---

### Card 3 of 3: Four Main Categories

::: card
![Four Categories](assets/categories.svg){alt:"Four category icons: Housing, Jobs, Emergency, Travel" size:120x120}

## Four Main Categories

Browse housing, jobs, emergencies, and travel coordination. All posts expire automatically to keep content fresh.

Housing & Jobs: 30 days
Emergency: 7 days · Travel: 2 days {.caption}

○ ○ ● {role:page-indicator current:3 total:3}

[Get Started]*
:::

---

::: alert info
**Dynamic Content:** Card 1 description replaces "Dallas-Fort Worth" with the user's actual metro area name passed from Screen 04.
:::

---

## Component Specifications

### 1. Tutorial Cards (Horizontal Scroll Container)

| Property        | iOS                                           | Android                                        |
| --------------- | --------------------------------------------- | ---------------------------------------------- |
| **Type**        | UIScrollView (pagingEnabled)                  | ViewPager2 / HorizontalPager                   |
| **Count**       | 3 cards                                       | 3 cards                                        |
| **Dimensions**  | Full screen width × height (minus safe areas) | Full screen width × height (minus system bars) |
| **Snap**        | Paging enabled (snap to card)                 | Page snap behavior                             |
| **Swipe Left**  | Next card (1→2→3)                             | Next card (1→2→3)                              |
| **Swipe Right** | Previous card (3→2→1)                         | Previous card (3→2→1)                          |

- Smooth momentum scrolling, no half-card states
- Each card is vertically centered with content center-aligned
- Cards are not visible off-screen (one card at a time)
- **a11y:** Each card is a separate screen reader context; swipe actions announced

---

### 2. Illustration (Visual Aid)

| Property       | iOS                                 | Android                             |
| -------------- | ----------------------------------- | ----------------------------------- |
| **Dimensions** | 120×120px                           | 120×120dp                           |
| **Position**   | Top center, below status bar        | Top center, below status bar        |
| **Format**     | SVG or 2×/3× PNG                    | SVG or vector drawable              |
| **Style**      | Simple line-art, not photorealistic | Simple line-art, not photorealistic |

**Card 1 — Metro-First Feed:**

- Map pin 📍 + circular radius
- Primary Blue (#1565C0) pin, light blue (#E3F2FD) background circle
- Subtle Nepali organic curve in pin design

**Card 2 — Trust Levels:**

- Shield icon with three badges: ○ (Level 0), ✓ (Level 1), ✓✓ (Level 2)
- Gray for Level 0, Green (#2E7D32) for Level 1, Blue (#1565C0) for Level 2
- Horizontal row of badges

**Card 3 — Four Categories:**

- Four icons in row: 🏠 💼 🚨 ✈️ (Housing, Jobs, Emergency, Travel)
- 24×24px each, 16px spacing between
- Each icon uses its category color

**a11y:**

- Card 1: "Map pin showing local metro area"
- Card 2: "Trust level badges showing Level 0, Level 1, and Level 2"
- Card 3: "Four category icons: Housing, Jobs, Emergency, Travel"

---

### 3. Card Title

| Property      | iOS                          | Android              |
| ------------- | ---------------------------- | -------------------- |
| **Font**      | 22pt Semibold, San Francisco | 22sp Regular, Roboto |
| **Color**     | #212121 (Almost Black)       | #212121              |
| **Alignment** | Center                       | Center               |
| **Max Width** | 320px                        | 320dp                |
| **Semantic**  | H2                           | H2                   |

**Content:**

- Card 1: "Metro-First Local Feed"
- Card 2: "Verified Community Members"
- Card 3: "Four Main Categories"

**a11y:** VoiceOver/TalkBack reads each title

---

### 4. Card Description Text

| Property        | iOS                         | Android                |
| --------------- | --------------------------- | ---------------------- |
| **Font**        | 17pt Regular, San Francisco | 16sp Regular, Roboto   |
| **Color**       | #757575 (Medium Gray)       | #757575                |
| **Alignment**   | Center                      | Center                 |
| **Max Width**   | 300px                       | 300dp                  |
| **Line Height** | 1.5×                        | 1.5×                   |
| **Max Lines**   | 4 (truncate if longer)      | 4 (truncate if longer) |

**Content:**

- **Card 1:** "See only housing, jobs, and emergencies in Dallas-Fort Worth. No noise from other cities."
  - Dynamic: Replace "Dallas-Fort Worth" with user's actual metro area name
- **Card 2:** "Level 1 users are phone-verified. Level 2 users are highly trusted by the community. You're Level 0 right now."
- **Card 3:** "Browse housing, jobs, emergencies, and travel coordination. All posts expire automatically to keep content fresh."

**Expiry Info (Card 3 only):**

| Property    | iOS                                                              | Android              |
| ----------- | ---------------------------------------------------------------- | -------------------- |
| **Font**    | 15pt Regular, San Francisco                                      | 14sp Regular, Roboto |
| **Color**   | #757575                                                          | #757575              |
| **Content** | "Housing & Jobs: 30 days" / "Emergency: 7 days · Travel: 2 days" | Same                 |

**a11y:** Semantic paragraph, screen reader reads full description

---

### 5. Progress Dots

| Property           | iOS                                      | Android                                  |
| ------------------ | ---------------------------------------- | ---------------------------------------- |
| **Count**          | 3 dots                                   | 3 dots                                   |
| **Size**           | 8px diameter                             | 8dp diameter                             |
| **Spacing**        | 8px between                              | 8dp between                              |
| **Position**       | Horizontally centered, below description | Horizontally centered, below description |
| **Active Color**   | #1565C0 (Primary Blue)                   | #1565C0                                  |
| **Inactive Color** | #E0E0E0 (Light Gray)                     | #E0E0E0                                  |
| **Implementation** | UIPageControl                            | Custom dots or TabLayout indicator       |
| **Tappable**       | No (standard UIPageControl)              | Optional (tap to jump)                   |

**Animation:** Active dot slides to next position (200ms, ease-in-out). Optional: scale active dot to 10px.

**a11y:** Announced: "Page 1 of 3", "Page 2 of 3", "Page 3 of 3". Not separately focusable.

---

### 6. Next / Get Started Button (Primary)

| Property             | iOS                                 | Android                           |
| -------------------- | ----------------------------------- | --------------------------------- |
| **Height**           | 48px                                | 56dp                              |
| **Width**            | Full width − 32px margins           | match_parent − 32dp margins       |
| **Corner Radius**    | 8px                                 | 8dp                               |
| **Background**       | #1565C0 (Primary Blue)              | #1565C0                           |
| **Text (Cards 1-2)** | 17pt Semibold, White, "Next"        | 14sp Medium, White, "NEXT"        |
| **Text (Card 3)**    | 17pt Semibold, White, "Get Started" | 14sp Medium, White, "GET STARTED" |

**States:**

- Default: #1565C0 background, white text
- Pressed: #104D99 background, scale 0.98
- Disabled: N/A (always enabled)

**Interaction:**

- Cards 1-2: Tap "Next" → animate to next card (300ms slide)
- Card 3: Tap "Get Started" → mark onboarding complete, navigate to Screen 06 (Home Screen)
- iOS: haptic feedback on tap

**a11y:** Label "Next" or "Get Started", Hint "Go to next tutorial card" or "Complete onboarding and view home screen", Trait: Button, min touch target 44pt/48dp

---

### 7. Skip Link

| Property       | iOS                                 | Android                             |
| -------------- | ----------------------------------- | ----------------------------------- |
| **Font**       | 17pt Regular, San Francisco         | 14sp Regular, Roboto                |
| **Color**      | #757575 (Medium Gray)               | #757575                             |
| **Text**       | "Skip" (title case)                 | "SKIP" (ALL CAPS)                   |
| **Alignment**  | Center                              | Center                              |
| **Position**   | Below Next button, 12px spacing     | Below Next button, 12dp spacing     |
| **Underline**  | On press only                       | Always underlined                   |
| **Visibility** | Cards 1-2: Visible / Card 3: Hidden | Cards 1-2: Visible / Card 3: Hidden |

**Interaction:**

- Tap: Skip directly to Screen 06 (Home Screen)
- Optional confirmation dialog: "Skip tutorial? You can always access help later." with "Skip Tutorial" (primary) and "Continue Learning" (secondary)

**a11y:** Label "Skip tutorial", Hint "Skip onboarding tutorial and go directly to home screen", Trait: Button, min touch area 44pt/48dp (invisible padding)

---

## Spacing & Layout

### Vertical Stack (per card, top to bottom)

| #   | Element                   | Height                | Spacing After |
| --- | ------------------------- | --------------------- | ------------- |
| 1   | Safe area / Status bar    | Auto                  | —             |
| 2   | Flexible space            | Flex                  | —             |
| 3   | Illustration              | 120px/dp              | 24px/dp       |
| 4   | Title                     | ~30px                 | 12px/dp       |
| 5   | Description               | ~80–100px (3-4 lines) | —             |
| 6   | Expiry info (Card 3 only) | ~40px                 | —             |
| 7   | Spacing                   | —                     | 24px/dp       |
| 8   | Progress dots             | 8px                   | 24px/dp       |
| 9   | Next / Get Started button | 48px / 56dp           | 12px/dp       |
| 10  | Skip link (Cards 1-2)     | ~30px                 | —             |
| 11  | Flexible space            | Flex                  | —             |
| 12  | Bottom padding            | 24px/dp               | —             |
| 13  | Bottom safe area          | Auto                  | —             |

**Total Minimum Height:** ~550px (fits small devices)

**Horizontal:** All content center-aligned. Screen margins 16px/dp on sides. Buttons full width minus 32px/dp. Text max width 300px with auto margins.

---

## User Interactions

### Primary Flow (Complete Tutorial)

1. **User lands on Card 1** → Reads content (~10 seconds)
2. **User taps "Next"** → Animate to Card 2 (300ms slide)
3. **User reads Card 2** → ~10-15 seconds
4. **User taps "Next"** → Animate to Card 3 (300ms slide)
5. **User reads Card 3** → ~15 seconds
6. **User taps "Get Started"** → Mark onboarding complete, navigate to Screen 06

**Total Tutorial Time:** 35-45 seconds for users who read everything

### Alternative Flow (Skip Tutorial)

1. **User lands on Card 1** → Starts reading
2. **User taps "Skip"** → Confirmation dialog appears (if enabled)
3. **User taps "Skip Tutorial"** → Navigate to Screen 06 immediately
4. **Onboarding marked complete** (with flag: `tutorial_skipped = true`)

### Alternative Flow (Swipe Navigation)

1. **User lands on Card 1**
2. **User swipes left** → Animate to Card 2 (instead of tapping "Next")
3. **User swipes left** → Animate to Card 3
4. **User swipes right** → Animate back to Card 2 (allow going backwards)

---

## Platform-Specific Differences

| Aspect                | iOS                                | Android                            |
| --------------------- | ---------------------------------- | ---------------------------------- |
| **Scroll Behavior**   | UIScrollView with pagingEnabled    | ViewPager2 or HorizontalPager      |
| **Swipe Gesture**     | Native scroll momentum             | Material page transition           |
| **Button Text**       | Title case ("Next", "Get Started") | ALL CAPS ("NEXT", "GET STARTED")   |
| **Typography**        | San Francisco, 22pt Semibold title | Roboto, 22sp Regular title         |
| **Page Indicator**    | UIPageControl (dots below)         | Custom dots or TabLayout indicator |
| **Skip Link**         | Underline on press                 | Always underlined, ALL CAPS        |
| **Button Height**     | 48px                               | 56dp (Material Design)             |
| **Press Feedback**    | Scale 0.98 + haptic                | Scale 0.98 + ripple                |
| **Screen Transition** | Slide from right (300ms)           | Slide up from bottom (300ms)       |

---

## Error States & Edge Cases

### Swipe Past Last Card

- **iOS:** Slight bounce effect (rubber-band), returns to Card 3
- **Android:** Edge glow effect, stays on Card 3
- No navigation action

### Back Button Pressed

- **Card 1:** Go back to Screen 04 (Metro Confirmation)
- **Cards 2-3:** Go back to previous card (Card 2→1, Card 3→2)

### Very Long Metro Area Name (Card 1)

- Metro name >40 characters: abbreviate (e.g., "Dallas-Fort Worth" instead of full name)
- Or use generic: "See only posts in your metro area"

### Rapid Swiping

- Allow rapid swiping (don't block)
- Final card shows "Get Started" immediately
- User can tap button to proceed

### App Close Mid-Tutorial

- Resume from Card 1 on reopen (tutorial is only 3 cards, quick to redo)
- Recommended: restart from Card 1 (simpler implementation)

---

## Accessibility

### Screen Reader Order (per card)

1. "Onboarding Tutorial, Card [X] of 3"
2. Illustration alt text
3. Card Title
4. Card Description
5. "Next" button or "Get Started" button
6. "Skip" button (if visible)

### Swipe Gestures (VoiceOver/TalkBack)

- Three-finger swipe left: Next card
- Three-finger swipe right: Previous card
- Or: Focus on "Next" button and activate with tap

### Touch Targets

| Element                   | iOS                      | Android                  | Meets Min |
| ------------------------- | ------------------------ | ------------------------ | --------- |
| Next / Get Started button | 48px                     | 56dp                     | ✓         |
| Skip link                 | 44pt (invisible padding) | 48dp (invisible padding) | ✓         |
| Progress dots             | Not tappable             | Not tappable             | N/A       |

### Color Contrast (WCAG)

| Element                          | Ratio  | Level |
| -------------------------------- | ------ | ----- |
| Title (#212121 on #FFFFFF)       | 16.9:1 | AAA ✓ |
| Description (#757575 on #FFFFFF) | 4.6:1  | AA ✓  |
| Button text (White on #1565C0)   | 7.2:1  | AAA ✓ |

---

## Animations & Transitions

### Screen Entry (from Screen 04)

| Step | Element        | Delay | Duration | Effect                                         |
| ---- | -------------- | ----- | -------- | ---------------------------------------------- |
| 1    | Screen         | 0ms   | 300ms    | Slide in from right (iOS) / Slide up (Android) |
| 2    | Card 1 content | 300ms | 200ms    | Fade in (ease-out)                             |

### Card Swipe Animation

- **Duration:** 300ms
- **Easing:** Ease-in-out (slight deceleration at end)
- **Effect:** Current card slides out left, next card slides in from right
- **Optional:** Parallax effect — outgoing card moves faster than incoming card

### Progress Dot Animation

- Active dot animates to next position (200ms, ease-in-out)
- Optional scale: active dot 8px → 10px (100ms)
- Color fade: gray → blue (200ms)

### Button Press

- **Duration:** 150ms
- **Effect:** Scale 0.98, background darkens
- iOS: light haptic | Android: ripple effect

### Skip Confirmation Dialog (if used)

- **Duration:** 200ms
- Background: semi-transparent black overlay (50% opacity)
- Dialog: slide up from bottom (iOS) or fade in (Android)

---

## Content & Localization

### Copy Requirements

- **Titles:** Clear, descriptive (not clever or punny)
- **Descriptions:** Under 100 characters, action-oriented
- **Expiry Info:** Specific, not vague ("30 days" not "soon")
- **Button Labels:** Imperative verbs ("Next", "Get Started")

### String Keys

| Key                     | Value                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `tutorial_card1_title`  | Metro-First Local Feed                                                                                            |
| `tutorial_card1_desc`   | See only housing, jobs, and emergencies in {metro_name}. No noise from other cities.                              |
| `tutorial_card2_title`  | Verified Community Members                                                                                        |
| `tutorial_card2_desc`   | Level 1 users are phone-verified. Level 2 users are highly trusted by the community. You're Level 0 right now.    |
| `tutorial_card3_title`  | Four Main Categories                                                                                              |
| `tutorial_card3_desc`   | Browse housing, jobs, emergencies, and travel coordination. All posts expire automatically to keep content fresh. |
| `tutorial_card3_expiry` | Housing & Jobs: 30 days\nEmergency: 7 days · Travel: 2 days                                                       |
| `tutorial_button_next`  | Next                                                                                                              |
| `tutorial_button_start` | Get Started                                                                                                       |
| `tutorial_skip`         | Skip                                                                                                              |

**Dynamic placeholder:** `{metro_name}` — User's metro area name (e.g., "Dallas-Fort Worth")

### Tone & Voice

- **Educational:** Explain concepts clearly
- **Friendly:** "You're Level 0 right now" (not "You are currently Level 0")
- **Concise:** Short sentences, max 3-4 lines per card
- **Action-oriented:** Focus on what user can do ("See only...", "Browse...")

---

## Technical Notes

### Identifiers

- Route: `/onboarding/tutorial`
- iOS: `OnboardingTutorialViewController` / `TutorialPageViewController`
- Android: `OnboardingTutorialActivity` / `TutorialPagerFragment`

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

### Navigation

| Direction | Trigger                                              | Destination                      |
| --------- | ---------------------------------------------------- | -------------------------------- |
| Entry     | From Screen 04 (Metro Confirmation) after "Continue" | This screen                      |
| Entry     | Skipped ZIP entry                                    | This screen (generic metro name) |
| Exit      | Tap "Get Started" (Card 3)                           | `/home` (Screen 06)              |
| Exit      | Tap "Skip" (Cards 1-2)                               | `/home` (Screen 06)              |

**On exit:** `UPDATE users SET onboarding_completed = true, tutorial_skipped = [true/false], onboarding_completed_at = NOW() WHERE id = 'user_id';`

### API Integration

- **No API calls needed** on this screen
- Metro name passed from previous screen via navigation params
- Card content is static (pre-defined)

### Performance

- Pre-load all card content (only 3 cards, don't lazy-load)
- Optimize illustrations: vector SVG or 2×/3× PNG (~20KB per image)
- Smooth animations: use native scroll views for 60fps
- All 3 cards loaded in memory (minimal footprint)

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
- [ ] Illustrations render at correct size (120×120px/dp)
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

- [ ] **Should we add a fourth card?** (Red Alert system) — Rec: Keep 3 cards, add contextual tips in-app later
- [ ] **Should progress dots be tappable?** — Rec: No, linear flow is clearer
- [ ] **Illustrations vs real screenshots?** — Rec: Keep illustrations (cleaner, easier to localize)
- [ ] **Should Skip show confirmation dialog?** — Rec: No, allow direct skip
- [ ] **Auto-advance cards every 5 seconds?** — Rec: No, let user control pace

---

## Related Screens

| Relation | Screen                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Previous | [04-metro-confirmation.md](../04-metro-confirmation/04-metro-confirmation.md)                        |
| Next     | [06-home-screen-level-0.md](../06-home-screen-level-0/06-home-screen-level-0.md)                     |
| Journey  | [01-signup-and-onboarding](../../user-journeys/onboarding/01-signup-and-onboarding.md) - Steps 10-12 |

---

**Status:** Draft — Ready for Review
**Next:** Create Screen 06 (Home Screen - Level 0)
