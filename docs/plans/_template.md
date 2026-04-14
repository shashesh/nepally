# <Feature Name> — Implementation Plan

**Plan Version:** v1
**Date:** <YYYY-MM-DD>
**Owner:** <name>
**Status:** Planned
**Primary Spec/Wireframe:** <path>

---

## 0) Plan Tracking Protocol (Required)

Use this plan as a live tracker during execution.

- Exactly one implementation step should be `In Progress` at a time.
- Update status immediately when work starts/finishes.
- If scope changes, add/update steps before coding.

### Step Status Legend
- `Not Started`
- `In Progress`
- `Completed`
- `Blocked`

### Live Step Tracker

| Step | Title | Owner | Status | Last Updated | Notes |
|------|-------|-------|--------|--------------|-------|
| 1 | <Step title> | <name> | Not Started | <YYYY-MM-DD> | <optional> |
| 2 | <Step title> | <name> | Not Started | <YYYY-MM-DD> | <optional> |
| 3 | <Step title> | <name> | Not Started | <YYYY-MM-DD> | <optional> |

---

## 1) Objective

Describe the user-facing outcome this implementation must deliver.

---

## 2) Scope and Non-Goals

### In Scope
- <item>
- <item>

### Out of Scope
- <item>
- <item>

---

## 3) Preconditions / Findings

1. <critical finding>
2. <critical finding>
3. <dependency or constraint>

### Pre-Implementation Freshness Gate (Required)

Before coding, verify source docs are current and aligned:

- [ ] Feature spec reviewed and date-checked: `docs/product/features/<feature>.md`
- [ ] User journey reviewed and date-checked: `docs/user-journeys/<...>.md`
- [ ] Wireframe reviewed and date-checked: `docs/wireframes/<...>.md`
- [ ] No conflicting requirements across the 3 sources
- [ ] If outdated/contradictory, plan is paused and docs are updated first

---

## 4) Architecture Rules (Must Pass)

- Shared-first: all non-UI logic goes to `packages/shared/src/**`.
- Platform-only code stays in app workspaces.
- Preserve existing naming conventions and return shapes.
- Add/update tests for every new or changed behavior.

---

## 5) Implementation Plan

> Preferred format per step: **Goal → Deliverables → File Changes → Tests → Exit Criteria**

### Step 1 — <Layer/Area>

**Goal**
- <goal>

**Deliverables**
- <deliverable>

**File Changes**
- <path>

**Tests / Validation**
- <command>

**Exit Criteria**
- <clear measurable completion>

**Status Update Rule**
- Set this step to `In Progress` before coding.
- Set to `Completed` only after tests/validation for this step pass.

---

### Step 2 — <Layer/Area>

**Goal**
- <goal>

**Deliverables**
- <deliverable>

**File Changes**
- <path>

**Tests / Validation**
- <command>

**Exit Criteria**
- <clear measurable completion>

**Status Update Rule**
- Set this step to `In Progress` before coding.
- Set to `Completed` only after tests/validation for this step pass.

---

### Step 3 — <Layer/Area>

**Goal**
- <goal>

**Deliverables**
- <deliverable>

**File Changes**
- <path>

**Tests / Validation**
- <command>

**Exit Criteria**
- <clear measurable completion>

**Status Update Rule**
- Set this step to `In Progress` before coding.
- Set to `Completed` only after tests/validation for this step pass.

---

## 6) Testing Strategy (Required)

### Change Classification
- **New functionality:** add new unit tests in same change.
- **Updated functionality:** update existing unit tests for behavior changes.
- **Cross-surface user flow change:** add/update e2e tests where user path is impacted.

### Test Plan Matrix

| Area | Change Type | Required Tests | File Targets |
|------|-------------|----------------|--------------|
| Shared logic/API | New | Unit tests (must add) | `packages/shared/src/**/*.test.ts` |
| Shared logic/API | Update | Unit tests (must update/add) | `packages/shared/src/**/*.test.ts` |
| Web UI/logic | New or update | Unit + e2e (if flow changes) | `apps/web/src/**/*.test.ts(x)`, `apps/web/e2e/**` |
| Mobile UI/logic | New or update | Unit + e2e (if available/flow changes) | `apps/mobile/src/**/*.test.ts(x)` |

### Coverage and Quality Gates
- [ ] New logic paths have unit tests
- [ ] Modified logic paths have updated tests
- [ ] E2E coverage added/updated for changed critical flow
- [ ] No failing tests in touched workspaces

---

## 7) Data Contract Snapshot

Use when schema/types or payload shapes are added/changed.

- <table/type>: <field>: <type/default/constraints>
- <table/type>: <field>: <type/default/constraints>

---

## 8) File Checklist

### New Files
- <path>
- <path>

### Modified Files
- <path>
- <path>

---

## 9) Verification Matrix (Definition of Done)

### Automated
- [ ] `npm run test --workspace=<workspace>`
- [ ] `npm run test:coverage --workspace=<workspace>`
- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run test`

### Manual
- [ ] <user flow 1>
- [ ] <user flow 2>
- [ ] <edge case>

### Plan Hygiene
- [ ] Live step tracker statuses are fully up to date
- [ ] Any blocked step has explicit blocker + next action

---

## 10) Risks + Mitigations

- **Risk:** <risk>
  - **Mitigation:** <mitigation>
- **Risk:** <risk>
  - **Mitigation:** <mitigation>

---

## 11) Operational Readiness (Suggested)

- [ ] Rollback plan documented (DB/data/UI)
- [ ] Feature flag strategy documented (if phased rollout)
- [ ] Monitoring/alerts/logging plan documented
- [ ] Performance impact and guardrails reviewed
- [ ] Security/privacy impact reviewed (PII, authz, secrets)

---

## 12) Open Questions

- <question>
- <question>

---

## 13) Handoff Commands

```bash
npm install
npm run test --workspace=<workspace>
npm run test:coverage --workspace=<workspace>
npm run lint
npm run type-check
npm run test
```
