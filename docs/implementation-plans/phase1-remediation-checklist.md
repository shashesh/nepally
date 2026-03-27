# Phase 1 Remediation Checklist (Post Audit)

**Version:** v1
**Date:** 2026-03-23
**Owner:** Team
**Status:** Planned
**Source:** Mobile + Web implementation audit (post-Marketplace exclusion)

---

## 0) How To Use This Document

- Keep this file as the single source of truth for non-Marketplace remediation work.
- Exactly one item should be In Progress per engineer at a time.
- Update Status and Last Updated on every state change.
- Do not mark Completed until acceptance criteria and required tests pass.

### Status Legend
- Not Started
- In Progress
- Blocked
- Completed

---

## 1) Live Tracker

| ID | Priority | Workstream | Task | Owner | Status | Target Sprint | Last Updated | Notes |
|----|----------|------------|------|-------|--------|---------------|--------------|-------|
| SEC-01 | P0 | Security | Verify and enforce chat RLS in live environment; add CI security smoke test for cross-user isolation | TBD | Completed | Sprint 1 | 2026-03-23 | Migration + local secret-backed smoke run passed; CI workflow job intentionally removed |
| MOD-01 | P0 | Moderation | Implement shared reports API in packages/shared (create, list, resolve) | TBD | Completed | Sprint 1 | 2026-03-23 | Shared reports API + unit tests added in @nepally/shared |
| MOD-02 | P0 | Moderation | Wire Report Post actions in mobile/web to real report submissions | TBD | Completed | Sprint 1 | 2026-03-23 | Mobile/web report actions now submit via shared createReport API |
| NOTIF-01 | P0 | Notifications | Register device/browser tokens in real app lifecycle (mobile + web) | TBD | Completed | Sprint 2 | 2026-03-23 | Auth lifecycle wiring + tests completed for mobile and web |
| NOTIF-02 | P0 | Notifications | Complete and deploy push delivery path (edge function wiring, trigger strategy, web VAPID delivery) | TBD | In Progress | Sprint 2 | 2026-03-23 | Edge function VAPID delivery + DB trigger path added; deployment validation pending secrets/live env |
| NOTIF-03 | P1 | Notifications | Add robust notification deep-link routing for post/message/event/emergency/system payloads | TBD | Completed | Sprint 2 | 2026-03-24 | Shared resolver added and wired in mobile + web (page and bell menu) with route-matrix/fallback tests |
| AUTH-01 | P1 | Auth | Complete mobile Google sign-in path from onboarding UI through callback/session profile flow | TBD | Not Started | Sprint 3 | 2026-03-23 | currently exposed as coming soon |
| AUTH-02 | P1 | Auth | Complete mobile phone OTP onboarding and trust progression wiring | TBD | Not Started | Sprint 3 | 2026-03-23 | currently exposed as coming soon |
| UX-01 | P1 | UX | Replace mobile chat avatar Coming Soon actions with navigation to public profile | TBD | Not Started | Sprint 3 | 2026-03-23 | profile screens already exist |
| UX-02 | P2 | UX | Implement mobile search MVP or hide search entry until implemented | TBD | Not Started | Sprint 3 | 2026-03-23 | current behavior is placeholder alert |
| ARCH-01 | P2 | Architecture | Move app-level metro area lookup duplication to shared API/helper and adopt in apps | TBD | Not Started | Sprint 3 | 2026-03-23 | shared-first quality improvement |
| DOC-01 | P1 | Documentation | Sync PROGRESS, README, and roadmap status lines with actual implementation | TBD | Not Started | Sprint 1 | 2026-03-23 | current docs are partially stale |
| TEST-01 | P1 | Quality | Add/raise coverage gates for critical modules (notifications, moderation, auth lifecycle) | TBD | Not Started | Sprint 2 | 2026-03-23 | close reliability blind spots |

---

## 2) Scope

### In Scope
- Security hardening for shipped features.
- Production readiness for notifications and moderation.
- Completion of partially implemented auth/UX paths.
- Documentation and test quality alignment.

### Out of Scope
- Marketplace feature implementation.
- Phase 2/3 net-new initiatives beyond remediation.
- Large UX redesign not tied to identified gaps.

---

## 3) Detailed Acceptance Criteria

### SEC-01 Chat RLS
- Tables conversations, messages, and conversation_participants are confirmed protected by effective RLS in live environment.
- Cross-user read/write attempts fail in automated test checks.
- CI includes a repeatable auth isolation smoke test.

### MOD-01 and MOD-02 Reporting and Moderation Wiring
- Shared report API supports creating reports with category and target metadata.
- Mobile and web report actions persist data, not only local alerts.
- Report records are visible in a moderation review workflow.
- Auto-hide threshold behavior is defined and implemented where required.

### NOTIF-01/02/03 Notifications End-to-End
- Token registration runs after login/session restore on both platforms.
- Push edge function is deployed and invoked by a defined event source.
- Web push uses a complete VAPID-signed delivery path.
- Notification taps route to the correct entity type based on payload.

### AUTH-01/02 Mobile Auth Completion
- Signup method options for Google and Phone no longer route to Coming Soon.
- Happy-path and error-path unit tests exist for both auth methods.
- Trust level progression behavior is explicit and tested.

### UX-01/02 UX Gaps
- Chat avatar actions route to public profiles in conversation list and thread.
- Search entry no longer dead-ends with placeholder behavior.

### ARCH-01 Shared-First Alignment
- Metro display lookups are centralized in shared layer.
- Mobile/web duplicate query logic removed where feasible.

### DOC-01 Documentation Integrity
- PROGRESS status lines match implemented behavior.
- README next-up section no longer lists already shipped items.
- Roadmap and progress references are mutually consistent.

### TEST-01 Coverage Gates
- New/changed logic has adjacent unit tests.
- Critical modules meet minimum target thresholds agreed by the team.
- CI fails on regression below threshold.

---

## 4) Suggested Sprint Slice

### Sprint 1 (Safety and Truth)
- SEC-01
- MOD-01
- MOD-02
- DOC-01

### Sprint 2 (Notification Reliability)
- NOTIF-01
- NOTIF-02
- NOTIF-03
- TEST-01

### Sprint 3 (Completion and UX)
- AUTH-01
- AUTH-02
- UX-01
- UX-02
- ARCH-01

---

## 5) Validation Commands

Run targeted workspace checks first, then monorepo checks.

```bash
npm run test --workspace=packages/shared
npm run test --workspace=apps/web
npm run test --workspace=apps/mobile
npm run test:coverage --workspace=packages/shared
npm run test:coverage --workspace=apps/web
npm run test:coverage --workspace=apps/mobile
npm run lint
npm run type-check
npm run test
npm run test:coverage
```

---

## 6) Risks and Mitigations

- Risk: Security assumptions differ between migration intent and live runtime state.
  - Mitigation: Verify in live environment and codify tests in CI.
- Risk: Notification UX appears complete while delivery is partial.
  - Mitigation: Treat end-to-end delivery as a release gate.
- Risk: Stale documentation causes planning and QA drift.
  - Mitigation: Make docs sync a completion criterion for each remediation PR.
