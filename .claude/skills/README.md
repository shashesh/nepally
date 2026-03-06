# NUSA Skills - Command Reference

This directory contains custom skills for building NUSA with a structured, documentation-first approach.

## Available Skills

### 1. Design Feature (`/design-feature`)
**Purpose**: Create detailed feature specifications

**When to use**: Starting a new feature or significant functionality

**Usage**:
```
/design-feature [feature-name]
```

**Example**:
```
/design-feature housing-post-creation
```

**What it creates**:
- `docs/features/[feature-name].md` - Complete feature specification with:
  - Problem statement and user story
  - Functional and non-functional requirements
  - User flow
  - Edge cases and error states
  - Trust & safety considerations
  - Success metrics

**Next step**: `/user-journey` to document user flow

---

### 2. User Journey (`/user-journey`)
**Purpose**: Document detailed step-by-step user flows

**When to use**: After feature design, before wireframing

**Usage**:
```
/user-journey [journey-name]
```

**Example**:
```
/user-journey signup-and-onboarding
```

**What it creates**:
- `docs/user-journeys/[category]/[number]-[journey-name].md` - Comprehensive journey with:
  - User persona and context
  - Step-by-step flow (every screen, every action)
  - Pain points and emotional states
  - Decision trees and alternative paths
  - Error and edge cases
  - Technical requirements (APIs, validations)
  - Success metrics

**Next step**: `/wireframe` to design screens

---

### 3. Wireframe (`/wireframe`)
**Purpose**: Create detailed screen wireframes

**When to use**: After user journey is documented

**Usage**:
```
/wireframe [screen-name]
```

**Example**:
```
/wireframe welcome-screen
```

**What it creates**:
- `docs/wireframes/[screen-name].md` - Low-fidelity wireframe with:
  - ASCII visual layout
  - Component specifications (sizes, colors, touch targets)
  - All interactive states (default, pressed, disabled, error, loading)
  - Validation rules and error messages
  - Platform differences (iOS vs Android)
  - Accessibility requirements

**Next step**: `/implement-feature` to build the feature

---

### 4. Implement Feature (`/implement-feature`)
**Purpose**: Guided feature implementation with full context

**When to use**: After feature spec, user journey, and wireframes are complete

**Usage**:
```
/implement-feature [feature-name]
```

**Example**:
```
/implement-feature signup-and-onboarding
```

**What it does**:
1. **Context Gathering**: Reads all relevant documentation
   - Feature specification
   - User journey
   - Wireframes
   - Design system

2. **Planning** (in plan mode):
   - Maps documentation to code structure
   - Identifies components, screens, services needed
   - Defines file structure and implementation order
   - Creates validation checklist

3. **Implementation** (after approval):
   - Creates design tokens from design system
   - Builds shared components
   - Implements screens matching wireframes exactly
   - Implements services and API integration
   - Connects navigation following user journey
   - Handles all error and edge cases

4. **Validation**:
   - Verifies pixel-perfect implementation
   - Tests all interactive states
   - Tests all edge cases
   - Demos to user for feedback

**Output**: Working feature that matches design documentation

---

### 5. Refine Roadmap (`/refine-roadmap`)
**Purpose**: Analyze and improve product roadmap sections

**When to use**: Reviewing or updating the product roadmap

**Usage**:
```
/refine-roadmap [section-name]
```

**What it does**: Reviews and suggests improvements to roadmap sections

---

### 6. Break Features (`/break-features`)
**Purpose**: Break down large features into smaller, implementable pieces

**When to use**: When a feature is too large to implement at once

**Usage**:
```
/break-features [feature-name]
```

**What it does**: Analyzes a feature and suggests logical breakdown into phases

---

### 7. Shared-First Check (`/shared-first-check`)
**Purpose**: Validate that code follows shared-first architecture — no duplicated types, API logic, or constants between apps

**When to use**: After every `/implement-feature` and before marking any feature complete

**Usage**:
```
/shared-first-check
```

**What it does**:
1. Checks for type/interface duplication across workspaces
2. Verifies all Supabase query logic lives in `packages/shared/src/api/` (not in `apps/`)
3. Checks for duplicated validation schemas or constants
4. Verifies `packages/shared/` has no platform-specific imports
5. Checks that `apps/` import from `@nusa/shared`
6. Verifies `packages/shared/src/index.ts` exports all new modules
7. Checks that new logic has corresponding unit tests

**Output**: Consolidated compliance report with pass/fail per category and specific remediation actions

---

## Recommended Workflow

**Full process is documented in [`docs/feature-development-process.md`](../../docs/feature-development-process.md).** Read that first for complex features.

### Quick Reference (7 Stages)

```
Stage 0: /break-features [feature]     ← for complex features only
Stage 1: /design-feature [feature]     ← feature specification
Stage 2: /user-journey [flow-name]     ← one per user flow
Stage 3: /wireframe [screen-name]      ← one per screen
Stage 4: create implementation plan    ← docs/implementation-plans/
Stage 5: /implement-feature [feature]  ← build shared layer first, then UI
Stage 6: /shared-first-check + tests   ← validate before marking done
```

### Example: Building Events Feature

```bash
# Stage 0: Break down scope first (events is complex)
/break-features events

# Stage 1: Design (scoped to Phase 2 output from Stage 0)
/design-feature events

# Stage 2: Journeys (one per flow)
/user-journey event-browsing
/user-journey event-creation
/user-journey event-rsvp

# Stage 3: Wireframes (one per screen)
/wireframe event-list-screen
/wireframe event-detail-screen
/wireframe event-creation-screen

# Stage 4: Implementation plan
# Prompt Claude: "Create docs/implementation-plans/events-feature.md
#                 using the template. DB changes go in 004_events.sql."

# Stage 5: Implement
/implement-feature events

# Stage 6: Validate
/shared-first-check
npm run test && npm run test:coverage
```

---

## Why This Workflow?

### Problems with "Code-First" Approach
- ❌ Build the wrong thing (misaligned with user needs)
- ❌ Inconsistent UI (no design system)
- ❌ Missing edge cases (no documented error states)
- ❌ Poor UX (no validated user journey)
- ❌ Rework and wasted effort

### Benefits of "Context-First" Approach
- ✅ Build exactly what users need (validated through journey)
- ✅ Consistent UI (design system enforced)
- ✅ All edge cases handled (documented in journey)
- ✅ Great UX (validated through wireframes)
- ✅ Faster implementation (clear specifications)
- ✅ Less rework (alignment before coding)

---

## File Organization

After following the workflow, you'll have:

```
docs/
├── features/
│   └── signup-and-onboarding.md          # Feature specification
├── user-journeys/
│   ├── README.md                          # Journey index
│   └── onboarding/
│       └── 01-signup-and-onboarding.md   # User journey
├── wireframes/
│   ├── 00-design-system-foundation.md    # Design system
│   ├── 01-welcome-screen.md              # Screen wireframes
│   ├── 02-signup-method-selection.md
│   └── ...
└── implementation/
    └── signup-and-onboarding.md          # Implementation notes

apps/mobile/src/
├── styles/
│   ├── colors.ts                         # Design tokens
│   ├── typography.ts
│   └── spacing.ts
├── components/
│   ├── buttons/
│   │   ├── PrimaryButton.tsx
│   │   └── SecondaryButton.tsx
│   └── inputs/
│       └── TextInput.tsx
├── screens/
│   └── onboarding/
│       ├── WelcomeScreen.tsx
│       ├── SignupMethodScreen.tsx
│       └── ...
└── navigation/
    └── OnboardingNavigator.tsx
```

---

## Tips

1. **Always follow the sequence**: Design → Journey → Wireframe → Implement
2. **Don't skip steps**: Each builds on the previous
3. **One feature at a time**: Don't try to document/build everything at once
4. **Iterate**: Get feedback at each stage before moving forward
5. **Reference docs in code**: Add comments linking to journey/wireframe docs
6. **Validate constantly**: Check implementation against documentation

---

## Questions?

See individual skill documentation:
- `.claude/skills/design-feature/SKILL.md`
- `.claude/skills/user-journey/SKILL.md`
- `.claude/skills/wireframe/SKILL.md`
- `.claude/skills/implement-feature/SKILL.md`

Or check project configuration:
- `.clauderc` - Project-specific Claude Code configuration
- `CLAUDE.md` - Project overview and principles
