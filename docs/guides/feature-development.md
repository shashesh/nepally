# Feature Development Process

**Last Updated:** 2026-09-08

This document defines the end-to-end process for taking a feature from initial idea to shipped, tested code. Follow this for every non-trivial feature. The process exists to prevent the most common failure modes: building the wrong thing, missing edge cases, duplicating logic across platforms, and shipping without tests.

---

## Core Principle

**Never write code before you understand what you are building and why.**

Context gathered upfront (spec, journey, wireframes) eliminates the two most expensive problems: rework from misalignment and bugs from unconsidered edge cases. The time spent on docs pays back 3x in implementation speed.

---

## The 7-Stage Workflow

```
Stage 0: Scope          /break-features      (for complex features only)
Stage 1: Spec           /design-feature
Stage 2: Journey        /user-journey        (one per key flow)
Stage 3: Wireframes     /wireframe-old       (one per screen)
Stage 4: Plan           create implementation plan doc
Stage 5: Implement      /implement-feature
Stage 6: Validate       /shared-first-check + tests
```

---

## Stage 0: Scope the Feature

**Skill:** `/break-features [feature-name]`

**When to run:** Any feature with more than ~5 sub-features, multiple screens, or that touches the DB in new ways. Always run before Events, Marketplace, Admin Dashboard, or any Phase 2+ feature.

**What it does:** Breaks the feature into phases (what ships in Phase 1 vs. Phase 2), identifies must-have vs. nice-to-have sub-features, and surfaces dependencies.

**Prompt:**

```
/break-features events
```

**Output:** A breakdown of sub-features with priority tiers and recommended Phase 1 scope. Review this output before moving to Stage 1 — it defines the boundaries of your spec.

**Skip if:** The feature is small and already well-understood (e.g., a single screen with no new DB tables and no complex flows).

---

## Stage 1: Design the Feature

**Skill:** `/design-feature [feature-name]`

**When to run:** After you know the scope from Stage 0 (or immediately for small features). Design only the scoped Phase 1 portion — not the full eventual feature.

**Prompt:**

```
/design-feature events
```

**Output:** `docs/product/features/events.md` containing:

- Problem statement and user story
- Functional requirements (scoped to what you are building now)
- Non-functional requirements (performance, trust level gating, RLS)
- Edge cases and error states
- Testable acceptance criteria (one per requirement — written as "Given / When / Then")
- Success metrics

**Key check:** Does the spec include testable acceptance criteria? If not, add them before moving forward. These become your test cases in Stage 6.

---

## Stage 2: Document User Journeys

**Skill:** `/user-journey [journey-name]`

**When to run:** After the feature spec is approved. Create one journey per distinct user flow within the feature. Do not combine multiple flows into one journey doc.

**Prompt examples for Events:**

```
/user-journey event-browsing
/user-journey event-creation
/user-journey event-rsvp
```

**Output per journey:** `docs/user-journeys/[category]/[number]-[journey-name].md` containing:

- User persona and context
- Step-by-step flow with every screen and every action documented
- Pain points and emotional states
- Decision trees and alternative paths (e.g., "what if user is Level 0?")
- Error and edge cases with expected behavior
- Technical requirements derived from each step (API calls, validations, trust gating)

**Key check:** Does every step in the journey map to a screen that needs a wireframe? List those screens before moving to Stage 3.

---

## Stage 3: Wireframe Every Screen

**Skill:** `/wireframe-old [screen-name]` — the skill is registered under the name `wireframe-old`, not `wireframe`.

**When to run:** After user journeys are documented. Wireframe every screen identified in the journeys, including empty states, error states, and loading states.

**Prompt examples for Events:**

```
/wireframe-old event-list-screen
/wireframe-old event-detail-screen
/wireframe-old event-creation-screen
/wireframe-old event-rsvp-confirmation
```

**Output per screen:** `docs/wireframes/[number]-[screen-name]/[screen-name].md` containing:

- ASCII layout showing exact component hierarchy
- Component specs (sizes, colors, touch targets)
- All interactive states: default, pressed, disabled, error, loading, empty
- Validation rules and exact error messages
- Platform-specific differences (iOS vs Android, mobile vs desktop web)
- Accessibility requirements

**Key check before moving on:**

- Every screen in every user journey has a wireframe
- Every error state from the journey has a matching wireframe state
- The design system (`docs/wireframes/00-design-system-foundation/00-design-system-foundation.md`) colors and spacing are referenced correctly

---

## Stage 4: Create an Implementation Plan

**When to run:** Before any code is written. Create `docs/plans/active/[feature-name].md` using the template at `docs/plans/_template.md`.

**This is the most skipped step and the one that prevents the most mistakes.**

**Prompt:**

```
Using docs/plans/_template.md as the template, create an implementation plan
for the events feature. Reference the spec at docs/product/features/events.md, the user journeys
at docs/user-journeys/events/, and the wireframes at docs/wireframes/[relevant screens].

The plan must include:
- A Pre-Implementation Freshness Gate verifying all docs are read
- A DB section naming the specific migration file (e.g., 004_events.sql) — NEVER 001_schema.sql
- Step-by-step implementation steps with exit criteria for each
- A file checklist (new files and modified files)
- A test plan matrix
```

**Critical checks in the plan:**

- DB changes must reference a NEW incremental migration file (`004_events.sql`, `005_marketplace.sql`, etc.). Never reference `001_schema.sql`, `002_seed_data.sql`, or `003_storage.sql` — these are frozen and destructive.
- Every step must have explicit exit criteria (how you know the step is done)
- Shared layer steps come before platform UI steps (types → API → validation → utils → mobile UI → web UI)

**Review the plan before proceeding to Stage 5.** If the plan reveals unclear requirements, go back to the spec/wireframes to resolve them first.

---

## Stage 5: Implement

**Skill:** `/implement-feature [feature-name]`

**When to run:** After the implementation plan is reviewed and approved.

**Prompt:**

```
/implement-feature events
```

The skill will gather all context docs (spec, journeys, wireframes, design system, code-sharing-guide) and build the feature following the shared-first architecture:

1. Shared types (`packages/shared/src/types/`)
2. Shared validation schemas (`packages/shared/src/validation/`)
3. Shared API functions (`packages/shared/src/api/`) — dependency injection pattern
4. Shared utils/constants (`packages/shared/src/utils/`, `constants/`)
5. Export from `packages/shared/src/index.ts`
6. Mobile UI (React Native screens, StyleSheet — no inline styles)
7. Web UI (Next.js pages, CSS Modules — no inline styles)

**During implementation, add tests immediately as each layer is built** — not at the end. See Stage 6 for test placement rules.

**Red flags to watch for:**

- Types defined inside `apps/` instead of `packages/shared/src/types/`
- Supabase `.from()` calls inside `apps/` instead of `packages/shared/src/api/`
- `style={{}}` inline styles in web JSX
- Inline style objects in mobile components (not in StyleSheet)
- Same constant/enum defined in two places

---

## Stage 6: Validate and Test

### 6a. Shared-First Compliance

**Skill:** `/shared-first-check`

Run this before closing the feature. It checks:

1. No types/interfaces defined in `apps/` that belong in `packages/shared/`
2. No Supabase query logic living in `apps/` instead of `packages/shared/src/api/`
3. No duplicated validation schemas or constants
4. `packages/shared/` has no platform-specific imports (`react-native`, `expo-*`, `next`)
5. Apps correctly import from `@nepally/shared`
6. All new modules exported from `packages/shared/src/index.ts`
7. New logic has unit tests

### 6b. Test Placement Rules

| What changed | Where tests go |
|---|---|
| Shared logic (types, API, utils, validation) | `packages/shared/src/**/*.test.ts` |
| Web logic/pages/components | `apps/web/src/**/*.test.ts(x)` |
| Mobile screens/hooks/services | `apps/mobile/src/**/*.test.ts(x)` |

Tests should cover:

- Pure logic paths (utils, validation, API behavior with mocked Supabase client)
- Loading, success, and error states for hooks/contexts
- Trust-level gating (Level 0 vs Level 1 behavior)

### 6c. Run Tests in Order

```bash
# 1. Workspace-level first (fix issues here before going broader)
npm run test --workspace=packages/shared
npm run test:coverage --workspace=packages/shared

npm run test --workspace=apps/web
npm run test:coverage --workspace=apps/web

npm run test --workspace=apps/mobile
npm run test:coverage --workspace=apps/mobile

# 2. Full monorepo validation
npm run test
npm run test:coverage

# 3. Type and lint check
npm run type-check
npm run lint
```

**Do not mark a feature complete until all workspace and monorepo test commands pass.**

---

## Definition of Done

A feature is done when ALL of the following are true:

- [ ] Implementation matches wireframes (layout, states, validation, error messages)
- [ ] All user journey flows work end-to-end on mobile and web
- [ ] All edge cases from the journey are handled
- [ ] `/shared-first-check` reports no violations
- [ ] Unit tests cover all new shared logic
- [ ] Unit tests cover all new web/mobile logic
- [ ] All workspace test commands pass
- [ ] Monorepo `npm run test` and `npm run test:coverage` pass
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] Implementation plan step tracker is fully updated to "Completed"
- [ ] `phase1-feature-breakdown.md` updated (new implementation update block at top)
- [ ] `docs/product/roadmap.md` updated if feature is now complete (new section or status change)
- [ ] `CLAUDE.md` "Done" list updated
- [ ] `npm run docs:check` passes
- [ ] Plan `status:` updated; if complete, `git mv`'d to `docs/archive/plans/`
- [ ] `docs/INDEX.md` updated for any doc added, moved, or retired

See [documentation-workflow.md](documentation-workflow.md) for the full trigger matrix
of which doc to update when, and which rows CI enforces.

---

## Quick Reference: Which Skill for What

| Situation | Skill/Action |
|---|---|
| Feature is large or unclear in scope | `/break-features` first |
| Starting a new feature | `/design-feature` |
| Documenting a user flow | `/user-journey` |
| Designing a screen | `/wireframe-old` |
| About to write code | Create implementation plan first |
| Building the feature | `/implement-feature` |
| Feature built, verifying architecture | `/shared-first-check` |
| Roadmap feels stale or unclear | `/refine-roadmap` |

---

## Guidance for Complex Features (Events, Marketplace, Admin)

These features share properties that make the process especially important:

**Multiple DB tables.** Each needs its own incremental migration file. Name it before you design the schema. Never touch `001_schema.sql`.

**Multiple user flows.** Events has browsing, creation, and RSVP flows — each deserves its own journey doc and potentially its own implementation plan step.

**Multiple screens per flow.** Wireframe all of them. Complex features have 6-10 screens. Skipping wireframes for "obvious" screens leads to inconsistent layouts and missed states.

**Phase gating.** Both Events and Marketplace start as Phase 2 features. Use `/break-features` to determine exactly what ships first (e.g., events list + detail only, no creation) so the spec doesn't overreach.

**Trust level gating.** Every action that requires Level 1+ needs a corresponding disabled/prompt state for Level 0. Document this explicitly in the wireframe for every interactive element.

**Business logic in shared.** Event RSVP logic, capacity checks, date formatting, and business open-hours parsing all belong in `packages/shared/src/` — not in screen components.

---

## Example: Full Prompt Sequence for Events

```
# 1. Scope
/break-features events

# 2. Spec (after reviewing scope output)
/design-feature events

# 3. Journeys (after spec approved)
/user-journey event-browsing
/user-journey event-creation
/user-journey event-rsvp

# 4. Wireframes (after journeys documented)
/wireframe-old event-list-screen
/wireframe-old event-detail-screen
/wireframe-old event-creation-screen
/wireframe-old event-rsvp-confirmation

# 5. Plan (write implementation plan doc before any code)
# Prompt: "Create docs/plans/active/events-feature.md using the template.
#          Reference all the docs above. DB changes go in 004_events.sql."

# 6. Implement (after plan reviewed)
/implement-feature events

# 7. Validate (after implementation)
/shared-first-check
npm run test && npm run test:coverage
```

---

## Anti-Patterns to Avoid

**Skipping Stage 0 for large features.** Starting `/design-feature marketplace` without scoping first produces an unimplementable spec. Break it down first.

**Combining multiple flows into one journey.** A single 40-step journey is hard to use as a reference during implementation. Shorter, focused journeys are more useful.

**Skipping wireframes for "obvious" screens.** Empty states, permission prompts, and loading skeletons feel obvious until they're not. Wireframe them.

**Writing the implementation plan in your head.** The plan's value is in being written down — it catches DB mistakes (like the frozen migration file issue), scope creep, and missing shared-layer steps before any code is written.

**Adding tests at the end as an afterthought.** Tests written after implementation tend to test implementation details rather than behavior. Write tests for shared logic as each layer is built.

**Defining types or API logic in `apps/` "just for now."** It never moves. Define it in `packages/shared/` from the start.

**Implementing mobile only.** The default platform scope is Both. If only mobile is in scope, explicitly confirm this — don't silently skip web.
