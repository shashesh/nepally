# NUSA Design System Foundation

**Version:** 1.0
**Last Updated:** 2026-02-11
**Status:** Draft

---

## Brand Identity

### Mission Alignment
NUSA is a **utility-first community platform** that must feel:
- **Trustworthy** - Users need to feel safe sharing housing/emergency info
- **Culturally Connected** - Resonate with Nepali diaspora without being stereotypical
- **Simple & Familiar** - Like WhatsApp simplicity + Nextdoor community feel
- **Local-First** - Metro area focus must be obvious

---

## Color Psychology & Palette

### Primary Colors

**Recommendation: Blue + Nepali Red Blend**

#### Primary Blue (Trust & Stability)
- **Color:** #1565C0 (Deep Blue)
- **Psychology:** Trust, security, reliability
- **Usage:** Primary buttons, headers, links, verification badges
- **Rationale:** Blue is universally associated with trust and safety. Critical for a platform where users share personal info (housing, emergency contacts).

#### Accent Red (Nepali Identity)
- **Color:** #DC143C (Crimson Red - from Nepal flag)
- **Psychology:** Energy, urgency, cultural pride
- **Usage:** Emergency posts, important alerts, Level 2 badges, subtle accent touches
- **Rationale:** Connects to Nepali national flag without being overwhelming. Use sparingly for impact.

#### Supporting Colors
- **Success Green:** #2E7D32 (Forest Green) - Verification success, post published
- **Warning Yellow:** #F57C00 (Amber) - Level 0 banner, caution messages
- **Error Red:** #C62828 (Error Red) - Form errors, spam warnings
- **Neutral Gray Scale:**
  - Background: #F5F5F5 (Light Gray)
  - Text Primary: #212121 (Almost Black)
  - Text Secondary: #757575 (Medium Gray)
  - Borders: #E0E0E0 (Light Gray)

---

## Cultural Touches (Subtle Integration)

### Where to Add Nepali Elements

**✅ DO Use:**
1. **Icon Style** - Slightly rounded, friendly icons (like Nepali art's organic curves)
2. **Empty States** - Subtle mountain silhouette illustrations (Mt. Everest connection)
3. **Success Animations** - Brief khata (prayer flag) flutter animation on verification success
4. **Accent Patterns** - Thin red line dividers (subtle nod to flag colors)
5. **Font Weight** - Slightly bolder for better Devanagari rendering (future Nepali language support)

**❌ DON'T Use:**
- Heavy traditional patterns (too busy for mobile)
- Mandala backgrounds (cliché, reduces readability)
- Temple imagery (not relevant to housing/jobs)
- Devanagari script in English version (confusing, wait for Phase 2 localization)

### Cultural Connection Through Functionality
- Metro-first approach resonates with Nepali culture (strong local community bonds)
- Trust level system mirrors Nepali "parichaya" (introduction/reference) culture
- Emergency post system aligns with community helping each other

---

## Typography

### Font Family

**Primary Font: San Francisco (iOS) / Roboto (Android)**
- **Rationale:** Use platform defaults for familiarity and performance
- **Future:** Consider adding Nepali-compatible font (e.g., Noto Sans Devanagari) for Phase 2

### Type Scale

| Element | iOS (SF Pro) | Android (Roboto) | Use Case |
|---------|--------------|------------------|----------|
| **H1** | 34pt Bold | 34sp Medium | Screen titles |
| **H2** | 28pt Bold | 28sp Medium | Section headers |
| **H3** | 22pt Semibold | 22sp Regular | Card titles |
| **Body** | 17pt Regular | 16sp Regular | Body text, descriptions |
| **Caption** | 13pt Regular | 12sp Regular | Metadata (time, location) |
| **Button** | 17pt Semibold | 14sp Medium | Button labels |

---

## Spacing System (8pt Grid)

Use multiples of 8 for consistency:
- **XXS:** 4px (tight spacing, icon padding)
- **XS:** 8px (small gaps, list item padding)
- **S:** 16px (default spacing between elements)
- **M:** 24px (section spacing)
- **L:** 32px (screen padding, major sections)
- **XL:** 48px (hero elements, onboarding)

---

## Component Library

### Buttons

#### Primary Button
```
┌─────────────────────────────────┐
│     Continue to NUSA            │  <- 17pt Semibold, White
└─────────────────────────────────┘
Background: #1565C0 (Primary Blue)
Height: 48px (iOS) / 56dp (Android)
Corner Radius: 8px
```

**States:**
- Default: Blue background, white text
- Pressed: 10% darker blue (#104D99)
- Disabled: #BDBDBD gray background, #FFFFFF white text
- Loading: Spinner inside button, text hidden

#### Secondary Button (Outline)
```
┌─────────────────────────────────┐
│     Skip for Now                │  <- 17pt Regular, Blue
└─────────────────────────────────┘
Background: Transparent
Border: 2px solid #1565C0
Height: 48px
```

#### Text Button (Link Style)
```
Skip Tutorial  <- Blue underline on press
```

---

### Input Fields

#### Standard Text Input
```
┌─────────────────────────────────────┐
│ Label                               │ <- 13pt Regular, Gray
├─────────────────────────────────────┤
│ Placeholder text                    │ <- 17pt Regular, Light Gray
└─────────────────────────────────────┘
Border: 1px solid #E0E0E0
Height: 56px
Corner Radius: 8px
Active State: 2px border #1565C0
Error State: 2px border #C62828 + error text below
```

#### Number Input (with prefix)
```
┌─────────────────────────────────────┐
│ Monthly Rent                        │
├─────────────────────────────────────┤
│ $ 650                               │ <- Dollar sign prefix
└─────────────────────────────────────┘
```

---

### Cards

#### Post Card (Feed Item)
```
┌─────────────────────────────────────────┐
│ 🏠 Private Room in Richardson       ✓  │ <- Verified badge
│                                         │
│ $650/month • Available March 1          │
│                                         │
│ [Photo thumbnail]                       │
│                                         │
│ Posted 2 days ago • Dallas-Fort Worth   │
└─────────────────────────────────────────┘
Background: White
Border: 1px solid #E0E0E0
Corner Radius: 12px
Padding: 16px
Shadow: 0 2px 4px rgba(0,0,0,0.1)
```

---

### Badges

#### Trust Level Badges
```
Level 0: ◯ New          (Gray circle)
Level 1: ✓ Verified     (Green checkmark)
Level 2: ✓✓ Contributor (Blue double checkmark)
```

#### Status Badges
```
Active:  🟢 Active      (Green)
Expired: 🔴 Expired     (Red)
```

---

### Banners

#### Level 0 Banner (Promotional)
```
┌─────────────────────────────────────────────┐
│ ⚠️ You're viewing only. Verify phone to    │
│    post and message. [Verify Now]      [X] │
└─────────────────────────────────────────────┘
Background: #FFF3E0 (Light Amber)
Text: #E65100 (Dark Amber)
Height: 64px
Dismissible: Yes
```

---

## iOS vs Android Differences

### Navigation

**iOS:**
- Back button: "< Back" (text-based, top-left)
- Tab bar at bottom
- Large title headers (collapsible)
- Swipe right to go back (native gesture)

**Android:**
- Back button: "←" (icon-based, top-left)
- Bottom nav or hamburger menu
- Standard size headers
- Hardware back button support

### Modals

**iOS:**
- Slide up from bottom (card style)
- Pull-down-to-dismiss gesture
- Rounded top corners

**Android:**
- Slide up from bottom (full screen or bottom sheet)
- Back button to dismiss
- Square corners or slightly rounded

### Keyboards

**iOS:**
- "Done" button on number keyboards
- Return key says "Next" or "Done"

**Android:**
- Hardware back button dismisses
- Return key says "Next" or "Done"

---

## Icon Style

### Design Philosophy
- **Rounded:** 2px corner radius on square elements
- **Stroke Width:** 2px for consistency
- **Size:** 24x24px default
- **Color:** Inherit from text color or use Primary Blue

### Icon Set (Recommended: SF Symbols for iOS / Material Icons for Android)

| Function | iOS Symbol | Material Icon |
|----------|-----------|---------------|
| Housing | house.fill | home |
| Jobs | briefcase.fill | work |
| Emergency | exclamationmark.triangle.fill | warning |
| Travel | airplane | flight |
| Verified | checkmark.seal.fill | verified |
| Location | location.fill | location_on |
| Search | magnifyingglass | search |
| Profile | person.circle.fill | account_circle |

---

## Animations & Transitions

### Screen Transitions
- **Duration:** 300ms (iOS standard)
- **Easing:** Ease-in-out cubic bezier
- **Direction:**
  - Forward navigation: Slide in from right
  - Back navigation: Slide out to right

### Micro-interactions
- **Button Press:** Scale 0.95 (subtle press feedback)
- **Card Tap:** Scale 0.98 + shadow increase
- **Success State:** ✓ fade in + scale from 0.8 to 1.0 (200ms)
- **Loading:** Spinner fade in after 500ms (don't show for quick loads)

### Onboarding Tutorial
- **Card Swipe:** Smooth horizontal scroll with momentum
- **Progress Dots:** Animate active dot with scale pulse

---

## Accessibility

### Minimum Requirements (WCAG AA)

**Color Contrast:**
- Text on background: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- Interactive elements: 3:1 minimum

**Touch Targets:**
- Minimum: 44x44pt (iOS) / 48x48dp (Android)
- Recommended: 48x48pt / 56x56dp for primary actions

**Screen Reader Support:**
- All buttons have descriptive labels
- Form fields have associated labels
- Error messages are announced
- Images have alt text

**Dynamic Type:**
- Support iOS Dynamic Type (user can increase text size)
- Support Android Large Text accessibility setting

---

## Dark Mode (Future Phase)

**Not implementing in Phase 1, but plan ahead:**
- Use semantic color names (primary, secondary, background) not hex values
- Avoid pure white (#FFFFFF) - use off-white (#F5F5F5) for easier dark mode inversion
- Test high contrast for accessibility

---

## Platform-Specific Guidelines Followed

### iOS Human Interface Guidelines
- ✅ 44pt minimum touch targets
- ✅ SF Symbols for icons
- ✅ Native navigation patterns
- ✅ System fonts (San Francisco)

### Android Material Design
- ✅ 48dp minimum touch targets
- ✅ Material Icons
- ✅ Elevation and shadows
- ✅ Roboto font family

---

## Design Inspiration

### References
1. **Nextdoor** - Local feed design, trust badges, community feel
2. **WhatsApp** - Simple, clean, familiar to Nepali users
3. **Airbnb** - Verification UI, trust indicators, clean cards

### What We're Borrowing
- **From Nextdoor:** Trust level badges, local-first navigation
- **From WhatsApp:** Minimalist design, familiar chat patterns
- **From Airbnb:** Verification flow, clear photo guidelines

### What Makes NUSA Unique
- Metro-first location model (not neighborhood or city)
- 3-tier trust system (Level 0, 1, 2)
- Category-specific structured forms
- Auto-expiry indicators on posts
- Subtle Nepali cultural touches

---

## File Structure for Wireframes

```
docs/wireframes/
├── 00-design-system-foundation.md     (this file)
├── 01-welcome-screen.md
├── 02-signup-method-selection.md
├── 03-zip-code-entry.md
├── 04-metro-confirmation.md
├── 05-onboarding-tutorial.md
├── 06-home-screen-level-0.md
└── README.md                          (index of all wireframes)
```

---

## Next Steps

After design system is approved:
1. Create low-fidelity wireframes for all 6 onboarding screens
2. Review and iterate based on feedback
3. Create high-fidelity mockups (with actual colors, photos)
4. Build interactive prototype (Figma or similar)
5. User testing with 5 Nepali community members

---

**Design System Status:** Ready for Review
**Next:** Create individual screen wireframes
