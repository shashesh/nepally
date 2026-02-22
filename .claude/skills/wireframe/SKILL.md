---
name: wireframe
description: Create detailed wireframe documentation for screens using WireMD format
---

# Wireframe Skill

When the user invokes `/wireframe [screen-name]`, create detailed wireframe documentation using **WireMD format** (renderable with `wiremd` CLI).

## Step 1: Gather Context

ASK these questions:
1. **Screen Purpose:** What is the primary goal of this screen?
2. **Platform Scope:** Mobile only, Web only, or Both? (Default: Both)
3. **User Entry Point:** How does the user get to this screen?
4. **Data Required:** What information must be displayed?
5. **Actions Available:** What can the user do on this screen?
6. **Exit Points:** Where can the user go from here?

## Step 2: Create Wireframe Document

### Output Structure (MANDATORY)

Each wireframe gets its own folder with one `.md` source and 5 rendered HTML files:

```
docs/wireframes/[screen-name]/
├── [screen-name].md              # WireMD source (single source of truth)
├── [screen-name]-wireframe.html  # Traditional grayscale
├── [screen-name]-clean.html      # Clean minimal style
├── [screen-name]-sketch.html     # Balsamiq hand-drawn style
├── [screen-name]-tailwind.html   # Tailwind-inspired style
└── [screen-name]-material.html   # Material Design style
```

### WireMD Format (MANDATORY)

All wireframes MUST use **WireMD syntax**. The `.md` source file is written once, then rendered to all 5 styles.

### WireMD Quick Reference

**Buttons:**
- Primary: `[Button Text]*`
- Default/secondary: `[Button Text]`
- Outline: `[Button Text]{.outline}`
- Danger/destructive: `[Delete]{variant:danger}`
- Success: `[Save]{variant:success}`
- Disabled: `[Submit]{state:disabled}` or `[Submit]{:disabled}`

**Inputs:**
- Text: `[___]` or `[Placeholder text___]`
- Email: `[___]{type:email}`
- Password: `[***]` or `[___]{type:password}`
- Number: `[___]{type:number min:1 max:100}`
- Date: `[___]{type:date}`
- Search: `[___]{type:search}`
- Textarea: `[Write something...]{rows:5}`
- Required: `[___]{required}`
- Disabled: `[___]{state:disabled}` or `[___]{:disabled}`
- Error state: `[___]{state:error}` or `[___]{:error}`

**Label-input pairing (IMPORTANT):** Labels must be directly above inputs with **no blank line**:
```
Email
[_____________________________]{type:email required}
```

**Dropdowns:**
```
[Select option...v]
- Option 1
- Option 2
- Option 3
```

**Checkboxes & Radio:**
- Checkbox: `- [ ] Label` / `- [x] Checked`
- Radio: `- ( ) Label` / `- (*) Selected`

**Icons:**
- Inline icons: `:icon-name:` (e.g., `:home:`, `:user:`, `:gear:`, `:magnifying-glass:`, `:rocket:`, `:shield:`)
- Brand icons: `:google:`, `:apple:`, `:github:`

**Progress Bar:**
- `[########__________]` (hashes = filled, underscores = empty)

**Containers:**
- `::: hero` ... `:::` — Hero/banner section
- `::: card` ... `:::` — Card container
- `::: modal` ... `:::` — Modal dialog
- `::: alert success` ... `:::` — Alert (success, info, warning, error)
- `::: footer` ... `:::` — Footer section
- `::: sidebar` ... `:::` — Sidebar section

**Navigation:**
- Tab bar: `[[ Home | Search | Post | Messages | Profile ]]`
- With icons: `[[ :home: Home | :magnifying-glass: Search | :user: Profile ]]`
- With buttons: `[[ :logo: Brand | Home | Features | [Login] | [Sign Up]* ]]`
- Breadcrumb: `[[ Home > Posts > Detail ]]`
- Active tab: `[[ Home | *Search* | Post ]]`
- Pagination: `[Previous] [1] [2] [*3*] [Next]`

**Grids:**
```
## Section Title {.grid-2}
### Column 1
Content here
### Column 2
Content here
```

**Attributes:**
- Classes: `{.primary}`, `{.outline}`, `{.secondary}`
- Variants: `{variant:primary}`, `{variant:danger}`, `{variant:success}`
- Key-value: `{rows:5}`, `{type:email}`, `{min:1 max:100}`
- States: `{state:disabled}`, `{:disabled}`, `{:loading}`, `{:active}`, `{:error}`
- Booleans: `{required}`, `{required:true}`
- Combined: `{.primary state:disabled}`, `{type:email required}`

**Standard Markdown:** Headings (#-######), **bold**, *italic*, [links](url), ![images](url), tables, blockquotes, horizontal rules, lists

### Document Template

````markdown
# Wireframe: [Screen Name]

> **Screen:** [Number] | **Status:** Draft | **Updated:** [Date]
> **Journey:** [Link to user journey]
> **Story:** As a [user], I want to [action] so I can [goal].

---

## Screen Purpose

[1-2 sentences describing what this screen does]

**Key Goals:**
- Goal 1
- Goal 2
- Goal 3

---

## Visual Wireframe

<!-- Use WireMD syntax for ALL visual layouts. -->
<!-- Each major screen state gets its own WireMD block. -->

::: hero
![Logo](assets/logo.png)

# Screen Title

Description text here.

[Primary CTA]*

[Secondary CTA]{.outline}
:::

::: footer
Footer content here
:::

---

<!-- Error states, modals, empty states as separate WireMD blocks: -->

::: alert error
:warning: **Error Title**
Error description text.

[Dismiss]
:::

::: modal
## Confirmation Title

Are you sure you want to proceed?

[Cancel]{.outline}  [Confirm]*
:::

---

## Component Specifications

### 1. Component Name

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Value | Value |
| **Height** | 48px | 56dp |
| **Background** | #1565C0 | #1565C0 |
| **Font** | 17pt Semibold, SF | 14sp Medium, Roboto |
| **Color** | White | White |

**States:**
- Default: description
- Pressed: description
- Disabled: description

**a11y:** Label, Hint, min touch target

---

### 2. Next Component

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Value | Value |
| ... | ... | ... |

---

## Spacing & Layout

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Status bar / safe area | Auto | — |
| 2 | Component 1 | Xpx/dp | Ypx/dp |
| 3 | Component 2 | Xpx/dp | Ypx/dp |
| ... | ... | ... | ... |

---

## User Interactions

### Primary Flow
1. Step 1
2. Step 2
3. Step 3

### Alternative Flows
- **Flow name:** Step-by-step description

---

## Platform-Specific Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| **Button Height** | 48px | 56dp |
| **Typography** | San Francisco | Roboto |
| **Press Feedback** | Scale + haptic | Ripple |
| ... | ... | ... |

---

## Error States & Edge Cases

| Scenario | Behavior |
|----------|----------|
| No internet | Description |
| Error condition | Description |
| Edge case | Description |

---

## Accessibility

### Screen Reader Order
1. Element 1
2. Element 2
3. ...

### Touch Targets
- All buttons: min 44×44pt (iOS) / 48×48dp (Android)

### Color Contrast (WCAG)
| Element | Ratio | Level |
|---------|-------|-------|
| Text on bg | X:1 | AA/AAA ✓ |

---

## Animations & Transitions

| Step | Element | Delay | Duration | Effect |
|------|---------|-------|----------|--------|
| 1 | Component | 0ms | 300ms | Fade in |
| ... | ... | ... | ... | ... |

---

## Content & Localization

### String Keys
| Key | Value |
|-----|-------|
| `key_name` | Display text |

---

## Technical Notes

### Identifiers
- Route: `/route-name`
- iOS: `ScreenName`
- Android: `ScreenActivity`

### Navigation
| Direction | Trigger | Destination |
|-----------|---------|-------------|
| Entry | Action | Source screen |
| Exit | Action | Target screen |

---

## Testing Checklist

### Functional Tests
- [ ] Test case 1
- [ ] Test case 2

### Visual Tests
- [ ] Visual check 1

### Accessibility Tests
- [ ] A11y check 1

### Edge Case Tests
- [ ] Edge case 1

---

## Open Questions

- [ ] Question 1? → **Rec:** Recommendation
- [ ] Question 2?

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Previous | [Link](./file.md) |
| Next | [Link](./file.md) |
| Journey | [Link](../user-journeys/path.md) |

---

**Status:** Draft — Ready for Review
````

## Step 3: Render All Styles (MANDATORY)

After creating the `.md` file, render all 5 HTML styles automatically using Bash:

```bash
wiremd docs/wireframes/[screen-name]/[screen-name].md --style wireframe -o docs/wireframes/[screen-name]/[screen-name]-wireframe.html
wiremd docs/wireframes/[screen-name]/[screen-name].md --style clean -o docs/wireframes/[screen-name]/[screen-name]-clean.html
wiremd docs/wireframes/[screen-name]/[screen-name].md --style sketch -o docs/wireframes/[screen-name]/[screen-name]-sketch.html
wiremd docs/wireframes/[screen-name]/[screen-name].md --style tailwind -o docs/wireframes/[screen-name]/[screen-name]-tailwind.html
wiremd docs/wireframes/[screen-name]/[screen-name].md --style material -o docs/wireframes/[screen-name]/[screen-name]-material.html
```

Run all 5 commands. If any fail, report the error to the user.

## Step 4: Review Against Principles

Check wireframe against:
- Metro-first model (is location clear?)
- Trust level (does user have permission?)
- Mandatory fields (from roadmap)
- Mobile-first design
- **Web parity:** If platform scope is "Both", does the web wireframe exist?
- **Shared data:** Are the data requirements the same for both platforms? (They should use the same shared types from `packages/shared/`)
- **All 5 HTMLs generated:** Confirm all style variants rendered without errors

## Step 5: Present to User

Show the wireframe and ASK:
1. Does this match your vision?
2. Are we missing any fields/actions?
3. Any concerns about the user flow?
4. Should I create variations/alternatives?

Tell the user they can open any of the 5 HTML files to compare visual styles.
