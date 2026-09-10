---
title: Phase 1 remediation GitHub issue cards
status: abandoned
created: 2026-03-23
---

# Phase 1 Remediation - GitHub Issue Cards

Use one section below per GitHub issue. Each card is written to be copy-paste ready.

---

## Issue Card: SEC-01

**Title**
`[P0][Security] SEC-01 - Verify and enforce chat RLS with CI isolation smoke test`

**Labels**
`remediation`, `phase-1`, `p0`, `security`, `backend`, `supabase`

**Milestone**
`Sprint 1`

**Assignee**
`@TBD`

**Summary**
Verify that chat data is protected by effective RLS in live Supabase and prevent regressions by adding automated cross-user isolation checks in CI.

**Problem Statement**
Chat security posture is a release-critical gate. We need to ensure `conversations`, `messages`, and `conversation_participants` are not readable/writable by unauthorized authenticated users.

**In Scope**
- Validate live RLS behavior for chat tables.
- Enable/fix policies if misconfigured.
- Add automated security smoke test for cross-user isolation.
- Add CI step to run the smoke test.

**Out of Scope**
- Full security audit of non-chat tables.
- Role redesign for moderator/admin surfaces.

**Dependencies**
- None.

**Acceptance Criteria**
- [ ] Live RLS is verified effective on `conversations`, `messages`, and `conversation_participants`.
- [ ] Cross-user read/write attempts fail in automated tests.
- [ ] CI executes and enforces chat isolation smoke test.
- [ ] Remediation notes are documented in implementation plan/progress docs.

**Validation**
- [ ] `npm run test --workspace=packages/shared`
- [ ] Security smoke test command added and passing in CI
- [ ] `npm run lint`
- [ ] `npm run type-check`

**Definition of Done**
- [ ] Acceptance criteria met
- [ ] Tests added/updated
- [ ] Docs updated (status + what changed)

---

## Issue Card: MOD-01

**Title**
`[P0][Moderation] MOD-01 - Implement shared reports API (create/list/resolve)`

**Labels**
`remediation`, `phase-1`, `p0`, `moderation`, `shared`, `api`

**Milestone**
`Sprint 1`

**Assignee**
`@TBD`

**Summary**
Create shared report APIs in `packages/shared` to support report creation and moderation workflows across mobile and web.

**Problem Statement**
Report table/policies exist in DB, but app flows lack a shared API layer to persist and manage reports.

**In Scope**
- Add shared reports API module with dependency injection pattern.
- Implement operations:
  - create report
  - list reports for moderator queue
  - resolve/update report status
- Export API via shared barrel index.
- Add unit tests for success/error paths.

**Out of Scope**
- Full admin dashboard UI.
- Auto-hide logic wiring in feed UIs (handled by MOD-02/related).

**Dependencies**
- None.

**Acceptance Criteria**
- [ ] Shared reports API exists with DI Supabase client pattern.
- [ ] API supports create/list/resolve operations.
- [ ] API return shapes match shared conventions.
- [ ] Unit tests cover happy and failure paths.

**Validation**
- [ ] `npm run test --workspace=packages/shared`
- [ ] `npm run test:coverage --workspace=packages/shared`
- [ ] `npm run lint --workspace=packages/shared`
- [ ] `npm run type-check --workspace=packages/shared`

**Definition of Done**
- [ ] Acceptance criteria met
- [ ] Export added to shared index
- [ ] Tests and docs updated

---

## Issue Card: MOD-02

**Title**
`[P0][Moderation] MOD-02 - Wire Report Post actions to real report submissions (mobile + web)`

**Labels**
`remediation`, `phase-1`, `p0`, `moderation`, `mobile`, `web`

**Milestone**
`Sprint 1`

**Assignee**
`@TBD`

**Summary**
Replace alert-only report behavior in mobile/web with persisted report submissions using shared API.

**Problem Statement**
Current report actions are mostly UI placeholders and do not create real moderation records.

**In Scope**
- Wire report actions in feed and detail screens/pages.
- Add minimal report category selection UX if missing.
- Submit report through shared API and handle success/error states.
- Ensure no regressions to post menus and ownership actions.

**Out of Scope**
- Full moderator dashboard.
- Abuse scoring/risk engine.

**Dependencies**
- Depends on `MOD-01`.

**Acceptance Criteria**
- [ ] Report actions create DB report records.
- [ ] Mobile and web both use shared reports API.
- [ ] User receives clear success/failure feedback.
- [ ] Unit tests updated for affected components/flows.

**Validation**
- [ ] `npm run test --workspace=apps/mobile`
- [ ] `npm run test --workspace=apps/web`
- [ ] `npm run test:coverage --workspace=apps/mobile`
- [ ] `npm run test:coverage --workspace=apps/web`
- [ ] `npm run lint`
- [ ] `npm run type-check`

**Definition of Done**
- [ ] Acceptance criteria met
- [ ] Placeholder alert-only behavior removed where wired
- [ ] Relevant docs updated

---

## Issue Card: NOTIF-01

**Title**
`[P0][Notifications] NOTIF-01 - Register device/browser tokens in real app lifecycle`

**Labels**
`remediation`, `phase-1`, `p0`, `notifications`, `mobile`, `web`

**Milestone**
`Sprint 2`

**Assignee**
`@TBD`

**Summary**
Integrate token registration helpers into actual session lifecycle flows on both platforms.

**Problem Statement**
Push registration helpers exist but are not consistently wired into app startup/session transitions.

**In Scope**
- Wire mobile token registration after authenticated session is ready.
- Wire web push registration flow where appropriate for authenticated users.
- Handle permission-denied and retry behavior safely.
- Avoid duplicate token registration spam.

**Out of Scope**
- Push message delivery backend (NOTIF-02).
- Deep-link payload routing (NOTIF-03).

**Dependencies**
- None.

**Acceptance Criteria**
- [ ] Mobile token registration executes in authenticated lifecycle.
- [ ] Web push subscription registration executes in authenticated lifecycle.
- [ ] Duplicate registration is prevented or safely idempotent.
- [ ] Error handling/logging exists for denied/failed registration.

**Validation**
- [ ] `npm run test --workspace=apps/mobile`
- [ ] `npm run test --workspace=apps/web`
- [ ] Add/update unit tests around lifecycle hooks/services
- [ ] `npm run lint`
- [ ] `npm run type-check`

**Definition of Done**
- [ ] Acceptance criteria met
- [ ] Wiring documented in implementation notes

---

## Issue Card: NOTIF-02

**Title**
`[P0][Notifications] NOTIF-02 - Complete and deploy push delivery path (edge function + trigger strategy + web VAPID)`

**Labels**
`remediation`, `phase-1`, `p0`, `notifications`, `backend`, `supabase`

**Milestone**
`Sprint 2`

**Assignee**
`@TBD`

**Summary**
Make push delivery production-ready by completing edge function TODOs and deploying invocation strategy for relevant events.

**Problem Statement**
Push edge function is partially placeholder and not fully wired end-to-end.

**In Scope**
- Finalize `send-push-notification` implementation.
- Implement proper VAPID-signed web push delivery.
- Define and wire invocation strategy (DB trigger/event path).
- Validate Expo and web push delivery paths.
- Document required secrets and deployment steps.

**Out of Scope**
- Notification preference UX redesign.
- Long-term batching/digest optimization.

**Dependencies**
- Works best after `NOTIF-01`.

**Acceptance Criteria**
- [ ] Edge function is fully implemented with no delivery TODO placeholders.
- [ ] Web push uses proper VAPID-signed delivery.
- [ ] Delivery invocation path is defined and live.
- [ ] End-to-end test confirms at least one event type delivers correctly.

**Validation**
- [ ] Unit/integration tests for function logic where feasible
- [ ] Manual E2E verification for Expo + web push
- [ ] `npm run lint`
- [ ] `npm run type-check`

**Definition of Done**
- [ ] Acceptance criteria met
- [ ] Deployment + secrets documented
- [ ] Operational runbook notes added

---

## Issue Card: NOTIF-03

**Title**
`[P1][Notifications] NOTIF-03 - Add robust deep-link routing for notification payload types`

**Labels**
`remediation`, `phase-1`, `p1`, `notifications`, `mobile`, `web`

**Milestone**
`Sprint 2`

**Assignee**
`@TBD`

**Summary**
Extend notification click handling beyond `post_id` to route correctly for message/event/emergency/system payloads.

**Problem Statement**
Current notification click handling is largely post-centric and can misroute or no-op for other types.

**In Scope**
- Define payload schema per type.
- Implement routing handlers for message, event, emergency, system, and post.
- Add safe fallback behavior for malformed/missing payloads.
- Keep parity between mobile and web behavior.

**Out of Scope**
- New notification categories.

**Dependencies**
- Prefer after `NOTIF-02`.

**Acceptance Criteria**
- [ ] Notification tap routes correctly for all defined types.
- [ ] Invalid payloads fail gracefully without crash.
- [ ] Tests cover routing matrix and fallback behavior.

**Validation**
- [ ] `npm run test --workspace=apps/mobile`
- [ ] `npm run test --workspace=apps/web`
- [ ] `npm run lint`
- [ ] `npm run type-check`

**Definition of Done**
- [ ] Acceptance criteria met
- [ ] Payload contract documented

---

## Issue Card: AUTH-01

**Title**
`[P1][Auth] AUTH-01 - Complete mobile Google sign-in onboarding path`

**Labels**
`remediation`, `phase-1`, `p1`, `auth`, `mobile`

**Milestone**
`Sprint 3`

**Assignee**
`@TBD`

**Summary**
Complete Google sign-in flow from onboarding UI through callback/session/profile readiness.

**Problem Statement**
Google option is visible in onboarding but behavior is still treated as incomplete/coming soon in key paths.

**In Scope**
- Wire onboarding button to real Google auth flow.
- Ensure callback/session handling and profile state are correct.
- Handle failure/retry UX.
- Add unit tests for success and error paths.

**Out of Scope**
- Web Google auth changes unless needed for shared behavior.

**Dependencies**
- None.

**Acceptance Criteria**
- [ ] Google onboarding path is enabled and functional in mobile.
- [ ] Callback/session/profile state is correctly handled.
- [ ] Error path UX is clear and tested.
- [ ] No Coming Soon fallback remains for Google path.

**Validation**
- [ ] `npm run test --workspace=apps/mobile`
- [ ] `npm run test:coverage --workspace=apps/mobile`
- [ ] `npm run lint --workspace=apps/mobile`
- [ ] `npm run type-check --workspace=apps/mobile`

**Definition of Done**
- [ ] Acceptance criteria met
- [ ] Onboarding docs/status updated

---

## Issue Card: AUTH-02

**Title**
`[P1][Auth] AUTH-02 - Complete mobile phone OTP onboarding and trust progression wiring`

**Labels**
`remediation`, `phase-1`, `p1`, `auth`, `mobile`

**Milestone**
`Sprint 3`

**Assignee**
`@TBD`

**Summary**
Ship phone OTP onboarding flow and ensure trust-level progression behavior is explicitly implemented and tested.

**Problem Statement**
Phone onboarding is exposed but effectively still coming-soon from the user perspective.

**In Scope**
- Wire onboarding phone option to OTP send/verify flow.
- Ensure trust-level progression logic is consistent with product rules.
- Add happy/failure path tests.
- Add user feedback for OTP send/verify states.

**Out of Scope**
- Contributor (Level 2) automation unless required by this flow.

**Dependencies**
- None.

**Acceptance Criteria**
- [ ] Phone OTP send/verify works from onboarding.
- [ ] Trust progression behavior is explicit, correct, and tested.
- [ ] Coming Soon fallback removed for phone path.

**Validation**
- [ ] `npm run test --workspace=apps/mobile`
- [ ] `npm run test:coverage --workspace=apps/mobile`
- [ ] `npm run lint --workspace=apps/mobile`
- [ ] `npm run type-check --workspace=apps/mobile`

**Definition of Done**
- [ ] Acceptance criteria met
- [ ] Product/docs notes updated

---

## Issue Card: UX-01

**Title**
`[P1][UX] UX-01 - Replace mobile chat avatar Coming Soon with public profile navigation`

**Labels**
`remediation`, `phase-1`, `p1`, `ux`, `mobile`, `chat`

**Milestone**
`Sprint 3`

**Assignee**
`@TBD`

**Summary**
Update chat avatar interactions to route to existing public profile screens instead of showing placeholder alerts.

**Problem Statement**
User profile surfaces already exist, but chat avatar actions still show Coming Soon in key screens.

**In Scope**
- Conversation list avatar action routes to `PublicProfileView`.
- Message thread avatar action routes to `PublicProfileView`.
- Preserve own-profile redirect behavior where applicable.
- Add/update tests for navigation behavior.

**Out of Scope**
- New profile UI features.

**Dependencies**
- None.

**Acceptance Criteria**
- [ ] No Coming Soon alerts remain for chat avatar profile entry points.
- [ ] Navigation works from both conversation list and thread.
- [ ] Tests cover navigation behavior.

**Validation**
- [ ] `npm run test --workspace=apps/mobile`
- [ ] `npm run lint --workspace=apps/mobile`
- [ ] `npm run type-check --workspace=apps/mobile`

**Definition of Done**
- [ ] Acceptance criteria met
- [ ] UX parity notes updated

---

## Issue Card: UX-02

**Title**
`[P2][UX] UX-02 - Implement mobile search MVP or hide placeholder search entry`

**Labels**
`remediation`, `phase-1`, `p2`, `ux`, `mobile`, `search`

**Milestone**
`Sprint 3`

**Assignee**
`@TBD`

**Summary**
Resolve placeholder search behavior by either shipping a small search MVP or removing/hiding non-functional entry points.

**Problem Statement**
Search icon currently dead-ends in placeholder behavior, which hurts trust and discoverability.

**In Scope**
- Option A: ship MVP search with clear scoped behavior.
- Option B: hide/remove search entry until implemented.
- Add tests for whichever option is chosen.

**Out of Scope**
- Full advanced search/ranking system.

**Dependencies**
- None.

**Acceptance Criteria**
- [ ] Search no longer dead-ends to placeholder alert.
- [ ] Chosen behavior is consistent with roadmap status.
- [ ] Tests updated for new behavior.

**Validation**
- [ ] `npm run test --workspace=apps/mobile`
- [ ] `npm run lint --workspace=apps/mobile`
- [ ] `npm run type-check --workspace=apps/mobile`

**Definition of Done**
- [ ] Acceptance criteria met
- [ ] Decision documented (MVP vs hide)

---

## Issue Card: ARCH-01

**Title**
`[P2][Architecture] ARCH-01 - Move metro lookup duplication to shared API/helper and adopt in apps`

**Labels**
`remediation`, `phase-1`, `p2`, `architecture`, `shared-first`

**Milestone**
`Sprint 3`

**Assignee**
`@TBD`

**Summary**
Reduce duplicated app-level metro lookup logic by centralizing it in shared layer and consuming from both platforms.

**Problem Statement**
Metro lookup/display logic is duplicated in app code, reducing consistency and increasing maintenance burden.

**In Scope**
- Add shared helper/API for metro display lookup.
- Replace duplicated app-level queries where feasible.
- Preserve existing behavior and return shape conventions.
- Add shared tests and update app tests as needed.

**Out of Scope**
- Full location architecture redesign.

**Dependencies**
- None.

**Acceptance Criteria**
- [ ] Shared metro lookup helper/API introduced and exported.
- [ ] Mobile/web duplicate lookup logic reduced.
- [ ] Behavior parity retained across platforms.
- [ ] Tests updated accordingly.

**Validation**
- [ ] `npm run test --workspace=packages/shared`
- [ ] `npm run test --workspace=apps/mobile`
- [ ] `npm run test --workspace=apps/web`
- [ ] `npm run lint`
- [ ] `npm run type-check`

**Definition of Done**
- [ ] Acceptance criteria met
- [ ] Shared-first compliance check passes

---

## Issue Card: DOC-01

**Title**
`[P1][Docs] DOC-01 - Sync PROGRESS, README, and roadmap status with implementation reality`

**Labels**
`remediation`, `phase-1`, `p1`, `documentation`

**Milestone**
`Sprint 1`

**Assignee**
`@TBD`

**Summary**
Align status docs so shipped work and in-progress items are accurately represented across core project documents.

**Problem Statement**
Current docs have stale or conflicting status lines, creating planning and QA drift.

**In Scope**
- Update `PROGRESS.md` status rows that are no longer accurate.
- Update `README.md` next-up section to remove already shipped items.
- Ensure roadmap/progress references are consistent.
- Add a lightweight doc-sync checklist to PR expectations.

**Out of Scope**
- Major content rewrite of product strategy.

**Dependencies**
- None (can start immediately).

**Acceptance Criteria**
- [ ] `PROGRESS.md` reflects current implementation state.
- [ ] `README.md` next-up list is accurate.
- [ ] Roadmap/progress statements are mutually consistent.
- [ ] Doc-sync check is noted in team process.

**Validation**
- [ ] Manual cross-doc consistency check complete
- [ ] `npm run lint` (if docs linting applies)

**Definition of Done**
- [ ] Acceptance criteria met
- [ ] Updated dates and change note included where applicable

---

## Issue Card: TEST-01

**Title**
`[P1][Quality] TEST-01 - Add coverage gates for critical modules (notifications, moderation, auth lifecycle)`

**Labels**
`remediation`, `phase-1`, `p1`, `testing`, `quality`

**Milestone**
`Sprint 2`

**Assignee**
`@TBD`

**Summary**
Define and enforce coverage thresholds for high-risk modules to reduce blind spots and catch regressions earlier.

**Problem Statement**
Critical reliability/security modules currently have weak or uneven coverage and insufficient enforcement.

**In Scope**
- Set practical minimum thresholds for selected critical modules.
- Add/update tests to meet thresholds.
- Enforce thresholds in CI.
- Document threshold rationale and ownership.

**Out of Scope**
- Forcing global 100% coverage.

**Dependencies**
- Coordinate with `NOTIF-01`, `NOTIF-02`, `NOTIF-03`, `MOD-01`, `MOD-02`, `AUTH-01`, `AUTH-02` changes.

**Acceptance Criteria**
- [ ] Module-level thresholds are defined and agreed.
- [ ] CI fails when critical modules fall below threshold.
- [ ] Tests added to close key gaps in notifications/moderation/auth lifecycle.

**Validation**
- [ ] `npm run test:coverage --workspace=packages/shared`
- [ ] `npm run test:coverage --workspace=apps/web`
- [ ] `npm run test:coverage --workspace=apps/mobile`
- [ ] `npm run test:coverage`

**Definition of Done**
- [ ] Acceptance criteria met
- [ ] Coverage policy documented

---

## Optional: Bulk Creation Workflow (Manual Friendly)

1. Create issues in the order below to respect dependencies:
- SEC-01
- MOD-01
- MOD-02
- DOC-01
- NOTIF-01
- NOTIF-02
- NOTIF-03
- TEST-01
- AUTH-01
- AUTH-02
- UX-01
- UX-02
- ARCH-01

2. After creating each issue:
- Copy in the corresponding Title, Labels, Milestone, and body section.
- Link dependency issues using `Depends on #<issue_number>`.
- Add owner and sprint board status.
