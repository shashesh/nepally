# Mobile App Usability, Security, and Proactive UX Hardening — Implementation Plan

Plan Version: v1  
Date: 2026-03-10  
Owner: _TBD_  
Status: Planned  
Primary Spec/Wireframe: [docs/guides/feature-development.md](../../guides/feature-development.md), [docs/wireframes/00-design-system-foundation.md](../../wireframes/00-design-system-foundation/00-design-system-foundation.md)

---

## 0) Plan Tracking Protocol (Required)

Use this plan as a live tracker during execution.

- Exactly one implementation step should be In Progress at a time.
- Update status immediately when work starts or finishes.
- If scope changes, add or update steps before coding.

### Step Status Legend
- Not Started
- In Progress
- Completed
- Blocked

### Live Step Tracker

| Step | Title | Owner | Status | Last Updated | Notes |
|------|-------|-------|--------|--------------|-------|
| 1 | Security Foundations | _TBD_ | Not Started | 2026-03-10 | Secure storage, OAuth callback integrity, error sanitization |
| 2 | Reliability and Lifecycle Hardening | _TBD_ | Not Started | 2026-03-10 | Realtime cleanup, timeout behavior, context race guards |
| 3 | UX and Accessibility Baseline | _TBD_ | Not Started | 2026-03-10 | Touch targets, loading states, accessibility metadata |
| 4 | Proactive Experience Enhancements | _TBD_ | Not Started | 2026-03-10 | Event-first updates, draft recovery, contextual nudges |
| 5 | Test Coverage and Release Verification | _TBD_ | Not Started | 2026-03-10 | Missing critical tests + full validation pass |

---

## 1) Objective

Make the mobile app safer, more usable, easier to navigate, and more proactive by addressing critical security and reliability risks first, then upgrading core UX and accessibility quality across onboarding, feed, posting, notifications, and profile flows.

---

## 2) Scope and Non-Goals

### In Scope
- Mobile-only hardening and UX improvements in [apps/mobile](apps/mobile).
- Security fixes for mobile client behavior and local persistence.
- Accessibility and interaction improvements for core journeys.
- Proactive UX improvements (nudges, resilient recovery, reduced user effort).
- Unit and integration-style test additions for critical untested mobile surfaces.

### Out of Scope
- Web app UI changes.
- Supabase schema or migration changes unless explicitly required by a follow-up decision.
- New product features unrelated to usability, security, or reliability hardening.

---

## 3) Preconditions / Findings

1. Sensitive session and profile-adjacent data are persisted in AsyncStorage in [apps/mobile/src/config/supabase.ts](apps/mobile/src/config/supabase.ts#L16) and [apps/mobile/src/utils/storage.ts](apps/mobile/src/utils/storage.ts#L88).
2. OAuth callback code path lacks state validation in [apps/mobile/src/services/auth/googleAuth.ts](apps/mobile/src/services/auth/googleAuth.ts#L41).
3. Raw backend error messages are surfaced in user alerts in multiple screens, including [apps/mobile/src/screens/post/CreatePostScreen.tsx](apps/mobile/src/screens/post/CreatePostScreen.tsx#L462) and [apps/mobile/src/screens/location/AddLocationScreen.tsx](apps/mobile/src/screens/location/AddLocationScreen.tsx#L113).
4. Realtime channel teardown is inconsistent in [apps/mobile/src/screens/HomeScreen.tsx](apps/mobile/src/screens/HomeScreen.tsx#L165) and [apps/mobile/src/screens/notifications/NotificationsScreen.tsx](apps/mobile/src/screens/notifications/NotificationsScreen.tsx#L99).
5. GPS timeout uses Promise race without cancellation in [apps/mobile/src/services/location.ts](apps/mobile/src/services/location.ts#L36).
6. Small tap targets and sparse accessibility metadata are present across feed, compose, and account surfaces, including [apps/mobile/src/components/cards/PostCard.tsx](apps/mobile/src/components/cards/PostCard.tsx#L235) and [apps/mobile/src/components/inputs/TextInput.tsx](apps/mobile/src/components/inputs/TextInput.tsx#L39).
7. Critical mobile flows currently lack direct tests: [apps/mobile/src/screens/HomeScreen.tsx](apps/mobile/src/screens/HomeScreen.tsx), [apps/mobile/src/screens/post/CreatePostScreen.tsx](apps/mobile/src/screens/post/CreatePostScreen.tsx), [apps/mobile/src/contexts/AuthContext.tsx](apps/mobile/src/contexts/AuthContext.tsx), [apps/mobile/src/contexts/LocationContext.tsx](apps/mobile/src/contexts/LocationContext.tsx), [apps/mobile/src/screens/profile/EditProfileScreen.tsx](apps/mobile/src/screens/profile/EditProfileScreen.tsx).

### Pre-Implementation Freshness Gate (Required)

- [ ] Feature spec reviewed and date-checked: relevant mobile features in [docs/features](docs/features)
- [ ] User journeys reviewed and date-checked: relevant flows in [docs/user-journeys](docs/user-journeys)
- [ ] Wireframes reviewed and date-checked: relevant mobile screens in [docs/wireframes](docs/wireframes)
- [ ] No conflicting requirements across the 3 sources
- [ ] If outdated or contradictory, pause implementation and update docs first

---

## 4) Architecture Rules (Must Pass)

- Shared-first: non-UI logic belongs in packages/shared unless platform-specific.
- Mobile platform code stays in apps/mobile.
- Preserve existing API return conventions.
- Add or update tests for every behavior change.
- Avoid regressions in trust-level and metro-scoped behavior.

---

## 5) Implementation Plan

### Step 1 — Security Foundations

Goal
- Eliminate the highest-risk mobile client security and privacy weaknesses.

Deliverables
- Secure storage strategy for auth and session-sensitive data.
- OAuth callback integrity checks (state + origin/path validation).
- User-safe error handling layer for alert and form feedback.
- Defensive validation for remote media URL rendering.

File Changes
- [apps/mobile/src/config/supabase.ts](apps/mobile/src/config/supabase.ts)
- [apps/mobile/src/utils/storage.ts](apps/mobile/src/utils/storage.ts)
- [apps/mobile/src/services/auth/googleAuth.ts](apps/mobile/src/services/auth/googleAuth.ts)
- [apps/mobile/src/components/Avatar.tsx](apps/mobile/src/components/Avatar.tsx)
- [apps/mobile/src/components/cards/PostCard.tsx](apps/mobile/src/components/cards/PostCard.tsx)
- [apps/mobile/src/screens/post/CreatePostScreen.tsx](apps/mobile/src/screens/post/CreatePostScreen.tsx)
- [apps/mobile/src/screens/location/AddLocationScreen.tsx](apps/mobile/src/screens/location/AddLocationScreen.tsx)
- [apps/mobile/src/screens/onboarding/EmailSignupScreen.tsx](apps/mobile/src/screens/onboarding/EmailSignupScreen.tsx)
- [apps/mobile/src/screens/profile/ChangePasswordScreen.tsx](apps/mobile/src/screens/profile/ChangePasswordScreen.tsx)

Tests / Validation
- Add or update auth service tests in [apps/mobile/src/services/auth/googleAuth.test.ts](apps/mobile/src/services/auth/googleAuth.test.ts)
- Add storage behavior tests in [apps/mobile/src/utils/storage.test.ts](apps/mobile/src/utils/storage.test.ts)
- Run: npm run test --workspace=apps/mobile

Exit Criteria
- No sensitive data persisted via insecure store paths.
- OAuth callback rejects invalid state.
- Raw backend internals are no longer shown directly to users.
- Invalid or untrusted image URLs are blocked or safely downgraded.

Acceptance Criteria (Decision-Aligned)
- Session inactivity timeout is enforced at 30 minutes.
- Absolute session max age is enforced at 30 days from sign-in.
- Sensitive actions require recent auth within 5 minutes.
- Silent refresh is blocked once absolute max age is exceeded.
- Media URL policy Stage A is implemented: block unsafe schemes and local/private hosts, warn and fallback on unknown hosts, emit telemetry for blocked and warned URLs.

---

### Step 2 — Reliability and Lifecycle Hardening

Goal
- Reduce duplicate events, stale listeners, and race-driven inconsistent state.

Deliverables
- Unified realtime channel cleanup lifecycle.
- Timeout-safe location request behavior.
- Guarded LocationContext initialization and update flow to prevent write races.
- Reduced polling dependence where event-driven updates exist.

File Changes
- [apps/mobile/src/screens/HomeScreen.tsx](apps/mobile/src/screens/HomeScreen.tsx)
- [apps/mobile/src/screens/notifications/NotificationsScreen.tsx](apps/mobile/src/screens/notifications/NotificationsScreen.tsx)
- [apps/mobile/src/services/location.ts](apps/mobile/src/services/location.ts)
- [apps/mobile/src/contexts/LocationContext.tsx](apps/mobile/src/contexts/LocationContext.tsx)

Tests / Validation
- Extend location tests in [apps/mobile/src/services/location.test.ts](apps/mobile/src/services/location.test.ts)
- Add lifecycle-focused tests for subscription cleanup on remounts
- Run: npm run test --workspace=apps/mobile

Exit Criteria
- No duplicate realtime updates after repeated screen mount/focus cycles.
- Timed-out location calls do not continue as hidden in-flight work.
- Active location state remains deterministic across app foreground and user-switch cases.

---

### Step 3 — UX and Accessibility Baseline

Goal
- Make core interactions easier, clearer, and more accessible across major surfaces.

Deliverables
- Minimum touch target and hit area standards applied to icon-only actions.
- Loading, empty, and error states with clear user guidance and recovery actions.
- Shared input accessibility metadata support and improved form feedback consistency.
- Better labeling for navigation actions and state changes in key flows.

File Changes
- [apps/mobile/src/components/inputs/TextInput.tsx](apps/mobile/src/components/inputs/TextInput.tsx)
- [apps/mobile/src/navigation/RootNavigator.tsx](apps/mobile/src/navigation/RootNavigator.tsx)
- [apps/mobile/src/components/cards/PostCard.tsx](apps/mobile/src/components/cards/PostCard.tsx)
- [apps/mobile/src/screens/post/CreatePostScreen.tsx](apps/mobile/src/screens/post/CreatePostScreen.tsx)
- [apps/mobile/src/screens/HomeScreen.tsx](apps/mobile/src/screens/HomeScreen.tsx)
- [apps/mobile/src/screens/notifications/NotificationsScreen.tsx](apps/mobile/src/screens/notifications/NotificationsScreen.tsx)
- [apps/mobile/src/navigation/MainTabNavigator.tsx](apps/mobile/src/navigation/MainTabNavigator.tsx)

Tests / Validation
- Add component tests for accessibility labels and interactive state in shared controls.
- Add screen tests for visible error recovery and empty-state CTA behavior.
- Run: npm run test --workspace=apps/mobile

Exit Criteria
- Primary interaction controls meet target size standards.
- Screen-reader users receive meaningful labels and loading context.
- Users can recover from failed loads without dead ends.

---

### Step 4 — Proactive Experience Enhancements

Goal
- Reduce user effort and improve task completion with context-aware proactive behavior.

Deliverables
- Feed and notification updates prioritize realtime events over fixed interval polling.
- Post draft resilience for interrupted compose sessions.
- Contextual nudges for empty feeds, location mismatch, and next-best actions.

File Changes
- [apps/mobile/src/screens/HomeScreen.tsx](apps/mobile/src/screens/HomeScreen.tsx)
- [apps/mobile/src/screens/post/CreatePostScreen.tsx](apps/mobile/src/screens/post/CreatePostScreen.tsx)
- [apps/mobile/src/contexts/LocationContext.tsx](apps/mobile/src/contexts/LocationContext.tsx)
- [apps/mobile/src/utils/storage.ts](apps/mobile/src/utils/storage.ts)

Tests / Validation
- Add tests for draft recovery behavior and event-first unread updates.
- Manual test: background and restore during draft compose, then confirm draft restoration.
- Run: npm run test --workspace=apps/mobile

Exit Criteria
- Users recover in-progress posts after interruption.
- Badge and list freshness depends primarily on realtime events.
- Empty and mismatch states present clear, actionable next steps.

Acceptance Criteria (Decision-Aligned)
- Proactive nudges ship in phased order: Feed first, Compose second, Notifications third.
- Each phase is guarded by KPI and stability checks before progressing.
- Phase rollout can be paused or rolled back independently without impacting other surfaces.

---

### Step 5 — Test Coverage and Release Verification

Goal
- Prevent regressions in the highest-risk mobile flows and finalize release readiness.

Deliverables
- New tests for currently untested critical files.
- Updated tests for all changed behavior from Steps 1 to 4.
- Full mobile and monorepo validation runs.

File Changes
- apps/mobile/src/screens/HomeScreen.test.tsx (new)
- apps/mobile/src/screens/post/CreatePostScreen.test.tsx (new)
- apps/mobile/src/contexts/AuthContext.test.tsx (new)
- apps/mobile/src/contexts/LocationContext.test.tsx (new)
- apps/mobile/src/screens/profile/EditProfileScreen.test.tsx (new)

Tests / Validation
- npm run test --workspace=apps/mobile
- npm run test:coverage --workspace=apps/mobile
- npm run lint
- npm run type-check
- npm run test

Exit Criteria
- Critical-path mobile tests exist and pass.
- No lint or type errors introduced.
- End-to-end behavior matches expected UX and safety outcomes.

---

## 6) Testing Strategy (Required)

### Change Classification
- New functionality: add new unit tests in same change.
- Updated functionality: update existing unit tests for behavior changes.
- Cross-surface flow change: add or update integration/E2E tests where feasible.

### Test Plan Matrix

| Area | Change Type | Required Tests | File Targets |
|------|-------------|----------------|--------------|
| Mobile auth and storage | Update | Unit tests | apps/mobile/src/services/auth/*.test.ts, apps/mobile/src/utils/*.test.ts |
| Mobile contexts | Update | Unit tests | apps/mobile/src/contexts/*.test.tsx |
| Mobile feed and compose | Update/new | Unit + focused integration scenarios | apps/mobile/src/screens/**/*.test.tsx |
| Shared logic touched by mobile | Update | Unit tests | packages/shared/src/**/*.test.ts |

### Coverage and Quality Gates
- [ ] New logic paths have unit tests
- [ ] Modified logic paths have updated tests
- [ ] Critical user flows validated manually
- [ ] No failing tests in touched workspaces

---

## 7) Data Contract Snapshot

- Session persistence contract: secure storage adapter for auth/session data in mobile client.
- Error presentation contract: user-facing errors map to safe messages, with internal diagnostics kept separate.
- Remote media contract: accepted URI protocol and host validation before rendering.

---

## 8) File Checklist

### New Files
- apps/mobile/src/screens/HomeScreen.test.tsx
- apps/mobile/src/screens/post/CreatePostScreen.test.tsx
- apps/mobile/src/contexts/AuthContext.test.tsx
- apps/mobile/src/contexts/LocationContext.test.tsx
- apps/mobile/src/screens/profile/EditProfileScreen.test.tsx

### Modified Files
- [apps/mobile/src/config/supabase.ts](apps/mobile/src/config/supabase.ts)
- [apps/mobile/src/utils/storage.ts](apps/mobile/src/utils/storage.ts)
- [apps/mobile/src/services/auth/googleAuth.ts](apps/mobile/src/services/auth/googleAuth.ts)
- [apps/mobile/src/services/location.ts](apps/mobile/src/services/location.ts)
- [apps/mobile/src/contexts/LocationContext.tsx](apps/mobile/src/contexts/LocationContext.tsx)
- [apps/mobile/src/screens/HomeScreen.tsx](apps/mobile/src/screens/HomeScreen.tsx)
- [apps/mobile/src/screens/notifications/NotificationsScreen.tsx](apps/mobile/src/screens/notifications/NotificationsScreen.tsx)
- [apps/mobile/src/screens/post/CreatePostScreen.tsx](apps/mobile/src/screens/post/CreatePostScreen.tsx)
- [apps/mobile/src/components/Avatar.tsx](apps/mobile/src/components/Avatar.tsx)
- [apps/mobile/src/components/cards/PostCard.tsx](apps/mobile/src/components/cards/PostCard.tsx)
- [apps/mobile/src/components/inputs/TextInput.tsx](apps/mobile/src/components/inputs/TextInput.tsx)
- [apps/mobile/src/navigation/RootNavigator.tsx](apps/mobile/src/navigation/RootNavigator.tsx)

---

## 9) Verification Matrix (Definition of Done)

### Automated
- [ ] npm run test --workspace=apps/mobile
- [ ] npm run test:coverage --workspace=apps/mobile
- [ ] npm run lint
- [ ] npm run type-check
- [ ] npm run test

### Manual
- [ ] Onboarding: ZIP + auth errors are clear and safe
- [ ] Feed: loading, empty, and retry behavior is clear and recoverable
- [ ] Create Post: validation, draft recovery, and media behavior are predictable
- [ ] Notifications: unread counts and realtime updates behave consistently
- [ ] Accessibility pass: touch targets, labels, and loading states are screen-reader friendly

### Plan Hygiene
- [ ] Live step tracker statuses are fully up to date
- [ ] Any blocked step has explicit blocker and next action

---

## 10) Risks + Mitigations

- Risk: Secure-storage migration may disrupt existing user sessions.
  - Mitigation: implement migration path with fallback and explicit invalid-session recovery UX.
- Risk: Realtime lifecycle changes could regress unread badge behavior.
  - Mitigation: add focused tests and repeated mount/focus manual checks.
- Risk: Accessibility and hit-target changes could alter layout density.
  - Mitigation: apply shared sizing tokens and validate on common device sizes.

---

## 11) Operational Readiness (Suggested)

- [ ] Rollback plan documented for auth persistence migration
- [ ] Feature-flag strategy for proactive nudges if staged rollout is desired
- [ ] Sanitized error telemetry path defined
- [ ] Performance impact reviewed for realtime vs polling mix
- [ ] Security/privacy impact reviewed and signed off

---

## 12) Decisions (Resolved)

### Session Timeout Policy

Decision: Adopt a hybrid timeout model.

- Inactivity timeout: 30 minutes.
- Absolute max session age: 30 days from sign-in.
- Sensitive-action recency gate: require re-auth for high-risk actions if last auth is older than 5 minutes.
- Session refresh: allow silent refresh only while within absolute max age.

Rationale:
- Protects against unattended or stolen-device scenarios.
- Keeps normal daily use low-friction.
- Adds tighter control for account-critical operations.

### Proactive Nudges Rollout

Decision: Ship in phased rollout by surface, not one batch.

- Phase 1: Feed nudges.
- Phase 2: Compose nudges.
- Phase 3: Notifications nudges.

Rationale:
- Lowers release risk and regression blast radius.
- Enables KPI-based tuning per surface before broader rollout.
- Improves experiment quality and rollback safety.

### Media Host Validation Strategy

Decision: Use staged warning-first rollout, then strict allowlisting.

- Stage A (current release): block unsafe schemes and private/local hosts; warn + fallback for unknown hosts; collect telemetry.
- Stage B (next release): enforce strict allowlist in production.
- Stage C: tighten with MIME, size, and response-safety checks.

Rationale:
- Reduces immediate risk without breaking valid legacy URLs unexpectedly.
- Uses telemetry to finalize safe allowlist before hard enforcement.
- Preserves UX while moving to strict policy.

---

## 13) Handoff Commands

npm install  
npm run test --workspace=apps/mobile  
npm run test:coverage --workspace=apps/mobile  
npm run lint  
npm run type-check  
npm run test
