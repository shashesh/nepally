# Notifications Feature — Filled Implementation Plan Example (Features 12.1–12.4)

**Plan Version:** v3 (Template-Aligned Example)
**Date:** 2026-03-03
**Owner:** _TBD_
**Status:** Planned
**Primary Spec/Wireframe:** `docs/wireframes/15-notifications/15-notifications.md`

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
| 1 | Database Layer | _TBD_ | Not Started | 2026-03-03 | Add settings/tokens schema + triggers |
| 2 | Shared Package Foundation | _TBD_ | Not Started | 2026-03-03 | Types + APIs + unit tests |
| 3 | Web App Integration | _TBD_ | Not Started | 2026-03-03 | Bell dropdown + pages + web push |
| 4 | Mobile App Integration | _TBD_ | Not Started | 2026-03-03 | Screens + nav + Expo token flow |
| 5 | Push Delivery Scaffold | _TBD_ | Not Started | 2026-03-03 | Edge function scaffold |

---

## 1) Objective

Deliver a complete notifications system across web and mobile that includes:
- Push infrastructure setup (12.1)
- Message icon unread indicator for chat (outside notifications feed)
- In-app notification list UX (12.3)
- Notification preferences UX + persistence (12.4)

**Notification triggers:**
- New comment on post
- New like on post
- Emergency alert

**Product rule:**
- Chat/messages are excluded from Notifications surfaces (bell dropdown and notifications screens).
- Chat unread state appears only on the existing Messages icon indicator.

---

## 2) Scope and Non-Goals

### In Scope
- Database tables, triggers, and realtime support for notification workflows.
- Shared API/types for notifications, user settings, and device tokens.
- Web notification bell dropdown + full notifications page + preferences page + web push plumbing.
- Mobile notifications screen + preferences screen + bell integration in home header + Expo token registration.
- Scaffolded edge function for push fanout (not deployed).

### Out of Scope
- Production edge-function deployment and secret management.
- Final VAPID key generation/rotation process.
- Complex async aggregation jobs for likes (grouped write-time trigger logic used here).

---

## 3) Preconditions / Findings

1. No `user_settings` table exists in DB; it must be created.
2. Bell placeholders already exist in web/mobile and must be replaced, not duplicated.
3. Existing unread count in Layout is chat-specific; notifications need separate count.
4. `user_settings` table naming should match existing shared interface naming.
5. Trigger source tables confirmed: `messages`, `post_comments`, `post_likes`, `conversation_participants`.
6. `expo-notifications` not yet installed in mobile workspace.
7. Preferences need three fields in `user_settings`: `notify_chat`, `notify_comments`, `notify_likes`.
8. Mobile notifications route belongs in Home stack (not a tab).
9. Notifications queries and realtime handlers must ignore `type = 'message'` rows.

### Pre-Implementation Freshness Gate (Required)

- [ ] Feature spec reviewed and date-checked: `docs/product/features/<feature>.md`
- [ ] User journey reviewed and date-checked: `docs/user-journeys/<...>.md`
- [ ] Wireframe reviewed and date-checked: `docs/wireframes/15-notifications/15-notifications.md`
- [ ] No conflicting requirements across those sources
- [ ] If outdated/contradictory, implementation is paused and docs are updated first

---

## 4) Architecture Rules (Must Pass)

- Shared-first: all non-UI logic in `packages/shared/src/**`.
- Platform-specific concerns remain in app workspaces only.
- Shared DB-facing types stay snake_case.
- Web styling must use CSS Modules only (no inline style in JSX).
- Shared API return shape remains consistent (`{ data }` or `{ error }`).
- Every new or changed behavior includes test changes.

---

## 5) Implementation Plan

> Preferred format per step: **Goal → Deliverables → File Changes → Tests → Exit Criteria**

### Step 1 — Database Layer

**Goal**
Create data model and trigger behavior for notification generation and user/device preferences.

**Deliverables**
- `user_settings` table with defaults + preference fields
- `device_tokens` table for Expo/Web Push tokens
- Triggers/functions:
  - `notify_new_message()`
  - `notify_new_comment()`
  - `notify_new_like()`
- Realtime publication enabled for `user_settings`, `device_tokens`

**File Changes**
- `supabase/migrations/004_notifications.sql` — new incremental migration (NEVER modify 001_schema.sql; it is frozen and destructive)

**Tests / Validation**
- SQL syntax/apply sanity checks
- Trigger validation by inserting sample rows and verifying inserts in `notifications`

**Exit Criteria**
- Tables, policies, and triggers apply successfully
- Realtime publication includes both new tables

**Status Update Rule**
- Set this step to `In Progress` before coding.
- Set to `Completed` only after tests/validation for this step pass.

---

### Step 2 — Shared Package Foundation

**Goal**
Create platform-agnostic notification/settings/token APIs and types.

**Deliverables**
- Notification types file
- UserSettings type extension
- Notifications API module
- User settings API module
- Device token API module
- Shared exports wired
- Unit tests

**File Changes**
- `packages/shared/src/types/notification.ts`
- `packages/shared/src/types/user.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/api/notifications.ts`
- `packages/shared/src/api/userSettings.ts`
- `packages/shared/src/api/deviceTokens.ts`
- `packages/shared/src/api/index.ts`
- `packages/shared/src/api/notifications.test.ts`
- `packages/shared/src/api/userSettings.test.ts`

**Tests / Validation**
- `npm run test --workspace=packages/shared`

**Exit Criteria**
- APIs follow shared return shape conventions
- Unit tests cover fetch/count/update/delete and upsert paths

**Status Update Rule**
- Set this step to `In Progress` before coding.
- Set to `Completed` only after tests/validation for this step pass.

---

### Step 3 — Web App Integration

**Goal**
Ship web notifications UX (bell dropdown, full page, preferences, web push plumbing).

**Deliverables**
- Functional bell dropdown in Layout with unread badge
- `/notifications` page with grouping + pagination + mark read/all read
- `/profile/notifications` preferences screen
- Service worker + web push subscription utilities
- Web tests updated/added

**File Changes**
- `apps/web/src/components/Layout.tsx`
- `apps/web/src/components/Layout.module.css`
- `apps/web/src/components/Layout.test.tsx`
- `apps/web/src/pages/notifications.tsx`
- `apps/web/src/pages/notifications.test.tsx`
- `apps/web/src/styles/Notifications.module.css`
- `apps/web/src/pages/profile/notifications.tsx`
- `apps/web/src/pages/profile/notifications.test.tsx`
- `apps/web/src/styles/NotificationPreferences.module.css`
- `apps/web/public/sw.js`
- `apps/web/src/lib/webPush.ts`

**Tests / Validation**
- `npm run test --workspace=apps/web`
- Search guard for `style=` in `apps/web/src/**`

**Exit Criteria**
- Bell badge reflects notification unread count (independent of chat unread count)
- Dropdown/page actions mark notifications read correctly
- Chat rows (`type = 'message'`) are not shown in bell dropdown or `/notifications`
- Preferences persist correctly across reloads

**Status Update Rule**
- Set this step to `In Progress` before coding.
- Set to `Completed` only after tests/validation for this step pass.

---

### Step 4 — Mobile App Integration

**Goal**
Ship mobile notifications list + preferences + push token registration.

**Deliverables**
- `expo-notifications` dependency and plugin config
- Home stack routes for notifications and preferences
- Notifications screen with grouping/unread state/navigation actions
- Preferences screen persisted to `user_settings`
- HomeScreen bell wired to notifications with unread badge
- Push helper service for token registration

**File Changes**
- `apps/mobile/package.json`
- `apps/mobile/app.json`
- `apps/mobile/src/types/navigation.ts`
- `apps/mobile/src/navigation/HomeNavigator.tsx`
- `apps/mobile/src/screens/notifications/NotificationsScreen.tsx`
- `apps/mobile/src/screens/notifications/NotificationPreferencesScreen.tsx`
- `apps/mobile/src/screens/notifications/index.ts`
- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/src/services/notifications.ts`

**Tests / Validation**
- `npm run test --workspace=apps/mobile`

**Exit Criteria**
- Home bell navigates to notifications screen (no new tab)
- Unread badge updates on focus/realtime updates
- Chat rows (`type = 'message'`) are not shown in mobile notifications list
- Preferences persist and reflect permission state

**Status Update Rule**
- Set this step to `In Progress` before coding.
- Set to `Completed` only after tests/validation for this step pass.

---

### Step 5 — Push Delivery Scaffold

**Goal**
Create deploy-ready scaffold for push fanout logic.

**Deliverables**
- Edge function scaffold for Expo + Web Push fanout
- TODO markers for production deployment wiring/secrets

**File Changes**
- `supabase/functions/send-push-notification/index.ts`

**Tests / Validation**
- Lint/type pass for scaffolded function

**Exit Criteria**
- Function accepts payload and queries tokens correctly
- Clear TODO path for deployment/secrets

**Status Update Rule**
- Set this step to `In Progress` before coding.
- Set to `Completed` only after tests/validation for this step pass.

---

## 6) Testing Strategy (Required)

### Change Classification
- **New functionality:** add new unit tests in same change.
- **Updated functionality:** update existing unit tests for behavior changes.
- **Cross-surface user flow changes:** add/update e2e tests where impacted.

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

### `user_settings` additions
- `notify_chat: 'all' | 'batched' | 'off'`
- `notify_comments: boolean`
- `notify_likes: 'all' | 'grouped' | 'off'`

### Notification type model
- `type: 'message' | 'post_response' | 'emergency_alert' | 'system'`
- `data: Record<string, unknown>` for source navigation payloads
- In-app notifications surfaces filter out `type = 'message'`

---

## 8) File Checklist

### New Files
- `packages/shared/src/types/notification.ts`
- `packages/shared/src/api/notifications.ts`
- `packages/shared/src/api/userSettings.ts`
- `packages/shared/src/api/deviceTokens.ts`
- `packages/shared/src/api/notifications.test.ts`
- `packages/shared/src/api/userSettings.test.ts`
- `apps/web/src/pages/notifications.tsx`
- `apps/web/src/pages/notifications.test.tsx`
- `apps/web/src/styles/Notifications.module.css`
- `apps/web/src/pages/profile/notifications.tsx`
- `apps/web/src/pages/profile/notifications.test.tsx`
- `apps/web/src/styles/NotificationPreferences.module.css`
- `apps/web/public/sw.js`
- `apps/web/src/lib/webPush.ts`
- `apps/mobile/src/screens/notifications/NotificationsScreen.tsx`
- `apps/mobile/src/screens/notifications/NotificationPreferencesScreen.tsx`
- `apps/mobile/src/screens/notifications/index.ts`
- `apps/mobile/src/services/notifications.ts`
- `supabase/functions/send-push-notification/index.ts`

### New Migration File
- `supabase/migrations/004_notifications.sql` — incremental, additive only (ALTER TABLE / CREATE TABLE / CREATE POLICY / CREATE OR REPLACE FUNCTION)

### Modified Files
- `packages/shared/src/types/user.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/api/index.ts`
- `apps/web/src/components/Layout.tsx`
- `apps/web/src/components/Layout.module.css`
- `apps/web/src/components/Layout.test.tsx`
- `apps/mobile/package.json`
- `apps/mobile/app.json`
- `apps/mobile/src/types/navigation.ts`
- `apps/mobile/src/navigation/HomeNavigator.tsx`
- `apps/mobile/src/screens/HomeScreen.tsx`

---

## 9) Verification Matrix (Definition of Done)

### Automated
- [ ] `npm run test --workspace=packages/shared`
- [ ] `npm run test:coverage --workspace=packages/shared`
- [ ] `npm run test --workspace=apps/web`
- [ ] `npm run test:coverage --workspace=apps/web`
- [ ] `npm run test --workspace=apps/mobile`
- [ ] `npm run test:coverage --workspace=apps/mobile`
- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run test`

### Manual
- [ ] Web: bell badge updates for unread notifications
- [ ] Web: dropdown open/close, mark all read, navigate from item
- [ ] Web: chat/message rows do not appear in notifications surfaces
- [ ] Web: preferences save/reload persists values
- [ ] Mobile: Home bell opens notifications screen
- [ ] Mobile: notification tap routes to expected target
- [ ] Mobile: chat/message rows do not appear in notifications screen
- [ ] Mobile: preferences save + permission flow works
- [ ] DB: message/comment/like inserts create expected notifications
- [ ] Shared-first check completed (`/shared-first-check`)

### Plan Hygiene
- [ ] Live step tracker statuses are fully up to date
- [ ] Any blocked step has blocker and next action documented

---

## 10) Risks + Mitigations

- **Risk:** Realtime duplication in badge/list updates  
  **Mitigation:** De-dupe client state by notification ID.
- **Risk:** Trigger noise under high-like volume  
  **Mitigation:** Use grouped strategy (`% 5 == 0`) and monitor volume.
- **Risk:** Web push permission denial reduces push reach  
  **Mitigation:** Keep in-app notifications fully functional without push.
- **Risk:** Token staleness across devices  
  **Mitigation:** Update `last_used_at` on register and schedule stale-token cleanup.

---

## 11) Operational Readiness (Suggested)

- [ ] Rollback plan documented (DB/data/UI)
- [ ] Feature flag strategy documented (if phased rollout)
- [ ] Monitoring/alerts/logging plan documented
- [ ] Performance impact and guardrails reviewed
- [ ] Security/privacy impact reviewed (PII, authz, secrets)

---

## 12) Open Questions

- Should `message` notifications continue to be written to DB for analytics/audit, or be disabled at trigger level?
- Should emergency alerts bypass master push toggle or respect it strictly?
- Should web/mobile both support swipe/dismiss parity in this scope or later?

---

## 13) Handoff Commands

```bash
npm install
npm run test --workspace=packages/shared
npm run test:coverage --workspace=packages/shared
npm run test --workspace=apps/web
npm run test:coverage --workspace=apps/web
npm run test --workspace=apps/mobile
npm run test:coverage --workspace=apps/mobile
npm run lint
npm run type-check
npm run test
```
