---
name: implement-feature
description: Implement features with full context from specs, journeys, and wireframes
---

# Feature Implementation Skill

When the user invokes `/implement-feature [feature-name]`, follow this context-first approach.

## Step 0: Identify the Feature

ASK:
1. **Feature Name:** What feature? (e.g., "housing-post-creation")
2. **Platform:** Mobile, Web, or Both? (Default: Both)
3. **Scope:** Full feature or specific screens?
4. **Related Journey:** Which user journey number?

**Regardless of platform answer, all non-UI code goes in `packages/shared/`.**

---

## Step 1: Gather Context

Read these files (skip any that don't exist):
- `docs/features/[feature-name].md` — Feature spec: requirements, edge cases, metrics
- `docs/user-journeys/[category]/[number]-[journey-name].md` — Step-by-step flow, pain points, API needs
- `docs/wireframes/[screen-name].md` — Layout, component specs, states, validation
- `docs/wireframes/00-design-system-foundation.md` — Colors, typography, spacing tokens
- `docs/code-sharing-guide.md` — Shared vs platform-specific decisions
- `docs/monorepo-structure.md` — Package boundaries, import rules

---

## Step 2: Create Implementation Plan

**Use EnterPlanMode for non-trivial implementations.**

Plan should cover:
1. **Shared layer** — Types, API functions, validation schemas, utils, constants needed in `packages/shared/`
2. **Platform UI** — Screens, components, navigation for each target platform
3. **File list** — All files to create/modify, organized by package
4. **Build order** — Shared types → validation → API → utils → constants → export from index.ts → mobile UI → web UI
5. **Validation checklist** — How you'll verify against docs

**Red flags (stop and restructure if you see these):**
- Types/interfaces defined in `apps/` instead of `packages/shared/src/types/`
- Supabase query logic in `apps/` instead of `packages/shared/src/api/`
- Validation schemas in `apps/` instead of `packages/shared/src/validation/`
- Same constant/enum defined in more than one place

Exit plan mode and get user approval before coding.

---

## Step 3: Implement Shared Layer First

1. **Types** in `packages/shared/src/types/` — snake_case matching Supabase columns
2. **Validation** in `packages/shared/src/validation/` — Zod schemas
3. **API functions** in `packages/shared/src/api/` — Accept `SupabaseClient` as first parameter
4. **Utils/Constants** in `packages/shared/src/utils/` and `src/constants/`
5. **Update exports** in `packages/shared/src/index.ts`
6. **Add tests** alongside each layer in `packages/shared/src/**/*.test.ts`

---

## Step 4: Implement Platform UI

For each target platform:

### Mobile (`apps/mobile/`)
- Create screens in `src/screens/[category]/`
- Build components importing types/validation/API from `@nepally/shared`
- Use `StyleSheet.create()` for all styles (never inline)
- Add navigation to appropriate navigator
- Add tests in `src/**/*.test.tsx`

### Web (`apps/web/`)
- Create pages in `src/pages/`
- Build components importing from `@nepally/shared`
- Use CSS Modules for all styles (never inline `style={{}}`)
- Add tests in `src/**/*.test.tsx`

Match wireframes: layout, spacing tokens, colors, all interactive states (default, pressed, disabled, error, loading), all validation rules, all error messages.

---

## Step 5: Validate

Before marking complete:
- [ ] All types/API/validation/utils/constants in `packages/shared/` (none in `apps/`)
- [ ] `packages/shared/src/index.ts` exports all new code
- [ ] Apps import from `@nepally/shared` only
- [ ] `packages/shared/` has zero platform-specific imports
- [ ] Implementation matches wireframes and journey flow
- [ ] All interactive states and error cases handled
- [ ] Tests added for all new/changed logic
- [ ] Workspace tests pass (`npm run test --workspace=<workspace>`)
- [ ] Monorepo tests pass (`npm run test`)
- [ ] Run `/shared-first-check` for compliance
- [ ] Demo to user for approval
