---
name: wireframe
description: Create detailed wireframe documentation for screens using WireMD format
---

# Wireframe Skill

When the user invokes `/wireframe [screen-name]`, create wireframe documentation using **WireMD format**.

## Step 1: Gather Context

ASK:

1. **Screen Purpose:** Primary goal of this screen?
2. **Platform Scope:** Mobile only, Web only, or Both? (Default: Both)
3. **User Entry Point:** How does the user get here?
4. **Data / Actions / Exit Points:** What's displayed, what can user do, where can they go?

## Step 2: Create Wireframe Document

### Output Structure

Each wireframe gets its own folder:

```text
docs/wireframes/[screen-name]/
├── [screen-name].md              # WireMD source (single source of truth)
└── [screen-name]-wireframe.html  # Rendered wireframe (no styles)
```

### WireMD Quick Reference

- **Buttons:** `[Text]*` (primary), `[Text]` (default), `[Text]{.outline}`, `[Text]{variant:danger}`, `[Text]{state:disabled}`
- **Inputs:** `[___]`, `[Placeholder___]`, `[***]` (password), `[___]{type:email required}`, `[___]{state:error}`, `[Write...]{rows:5}` (textarea)
- **Labels:** Place directly above input with no blank line
- **Dropdowns:** `[Select...v]` followed by `- Option` list items
- **Checkboxes:** `- [ ] Label` / `- [x] Checked` | **Radio:** `- ( ) Label` / `- (*) Selected`
- **Icons:** `:icon-name:` (e.g., `:home:`, `:user:`, `:gear:`) | Brand: `:google:`, `:apple:`
- **Progress:** `[########__________]`
- **Containers:** `::: hero`, `::: card`, `::: modal`, `::: alert success|info|warning|error`, `::: footer`, `::: sidebar`
- **Navigation:** `[[ Home | Search | *Active* | Profile ]]` | With icons: `[[ :home: Home | :user: Profile ]]`
- **Grids:** `## Title {.grid-2}` with `### Column` children
- **Attributes:** `{.class}`, `{variant:x}`, `{state:disabled}`, `{type:email}`, `{required}`, combined: `{type:email required}`

### Required Document Sections

```markdown
# Wireframe: [Screen Name]

> Metadata: Screen number, Status, Date, Journey link, User story

- Screen Purpose & Key Goals
- Visual Wireframe (WireMD blocks for each state: default, error, empty, modals)
- Component Specifications (table per component: properties by iOS/Android, states, a11y)
- Spacing & Layout (table: element, height, spacing after)
- User Interactions (primary flow + alternative flows)
- Platform-Specific Differences (table: aspect, iOS, Android)
- Error States & Edge Cases (table: scenario, behavior)
- Accessibility (screen reader order, touch targets 44×44pt/48×48dp, color contrast)
- Animations & Transitions (table: element, delay, duration, effect)
- Technical Notes (route, identifiers, navigation directions)
- Testing Checklist (functional, visual, a11y, edge cases)
- Related Screens (previous, next, journey link)
```

## Step 3: Render Wireframe

After creating the `.md` file, render a single unstyled wireframe HTML:

```bash
wiremd docs/wireframes/[name]/[name].md -o docs/wireframes/[name]/[name]-wireframe.html
```

## Step 4: Review & Present

Check against: metro-first model, trust levels, required fields, mobile-first design, web parity, shared data types. Ask user about vision alignment, missing fields/actions, flow concerns, and alternative variations.
