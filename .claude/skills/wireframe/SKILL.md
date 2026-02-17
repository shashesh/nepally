---
name: wireframe
description: Create detailed wireframe documentation for screens
---

# Wireframe Skill

When the user invokes `/wireframe [screen-name]`, create detailed wireframe documentation.

## Step 1: Gather Context

ASK these questions:
1. **Screen Purpose:** What is the primary goal of this screen?
2. **Platform Scope:** Mobile only, Web only, or Both? (Default: Both)
3. **User Entry Point:** How does the user get to this screen?
4. **Data Required:** What information must be displayed?
5. **Actions Available:** What can the user do on this screen?
6. **Exit Points:** Where can the user go from here?

## Step 2: Create Wireframe Document

Create: `docs/wireframes/[screen-name].md`

Use this structure:

```markdown
# [Screen Name] Wireframe

**Feature:** [Related feature]
**User Type:** [Who sees this]
**Last Updated:** [Date]

## Screen Overview

**Purpose:** [1 sentence]
**Entry Points:** [List of ways to reach this screen]
**Exit Points:** [List of navigation options]

## Layout

### ASCII Wireframe

[Create visual representation using ASCII art]

Example:
```
┌─────────────────────────────────────┐
│  ← Back        NUSA         Menu ≡  │
├─────────────────────────────────────┤
│                                     │
│  🏠 Post a Room                     │
│                                     │
│  Monthly Rent *                     │
│  ┌───────────────────────────────┐ │
│  │ $                             │ │
│  └───────────────────────────────┘ │
│                                     │
│  Move-in Date *                     │
│  ┌───────────────────────────────┐ │
│  │ MM/DD/YYYY         📅         │ │
│  └───────────────────────────────┘ │
│                                     │
│  Room Type *                        │
│  ┌───────────────────────────────┐ │
│  │ Select...              ▼      │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │      Post to My Metro         │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Components

| Component | Type | Behavior |
|-----------|------|----------|
| Rent Input | Number field | Required, $ prefix, validation |
| Date Picker | Date selector | Required, future dates only |
| ... | ... | ... |

## Interaction Details

### Form Validation

- **Rent Field:**
  - Required
  - Numeric only
  - Min: $0, Max: $10,000
  - Error: "Please enter a valid rent amount"

- **Move-in Date:**
  - Required
  - Must be future date
  - Error: "Move-in date must be in the future"

### Button States

| State | Visual | Condition |
|-------|--------|-----------|
| Enabled | Blue, white text | All required fields valid |
| Disabled | Gray, white text | Missing/invalid fields |
| Loading | Spinner | During submission |

### Error States

[List all possible error conditions and how they're displayed]

## Mobile Considerations

- [ ] Touch targets min 44x44px
- [ ] Keyboard dismissal
- [ ] Scroll behavior
- [ ] Safe area insets

## Web / Desktop Considerations

- [ ] Responsive layout (mobile web ≤768px, desktop ≥1024px)
- [ ] Desktop layout variant (wider content area, optional sidebar)
- [ ] Hover states for interactive elements
- [ ] Keyboard navigation (Tab order, Enter to submit)
- [ ] Browser back button behavior
- [ ] Max content width (e.g., 640px for forms, 1200px for feeds)

### Desktop Layout Variant (if platform scope includes Web)

[If this screen needs a web variant, create a second ASCII wireframe for desktop breakpoint]

```
┌──────────────────────────────────────────────────────────────────┐
│  Logo          Home   Browse   Messages   Profile    [Sign Out] │
├────────────────────┬─────────────────────────────────────────────┤
│                    │                                             │
│  Sidebar (nav)     │  Main Content Area                         │
│                    │  [Same form/content as mobile, wider]       │
│                    │                                             │
│                    │                                             │
└────────────────────┴─────────────────────────────────────────────┘
```

## Accessibility

- [ ] Screen reader labels
- [ ] Focus order
- [ ] Color contrast (WCAG AA)
- [ ] Error announcements

## Next Screen

**On Success:** [Where user goes]
**On Cancel:** [Where user goes]
**On Error:** [Stay on screen with error message]

## Notes & Open Questions

- Question 1?
- Design decision rationale
```

## Step 3: Review Against Principles

Check wireframe against:
- Metro-first model (is location clear?)
- Trust level (does user have permission?)
- Mandatory fields (from roadmap)
- Mobile-first design
- **Web parity:** If platform scope is "Both", does the web wireframe exist?
- **Shared data:** Are the data requirements the same for both platforms? (They should use the same shared types from `packages/shared/`)

## Step 4: Present to User

Show the wireframe and ASK:
1. Does this match your vision?
2. Are we missing any fields/actions?
3. Any concerns about the user flow?
4. Should I create variations/alternatives?
