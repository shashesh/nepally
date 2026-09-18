# ADR: Long-Lived Sessions, Like Facebook and Reddit

**Date:** 2026-09-18
**Status:** Accepted
**Category:** Auth / Security
**Supersedes:** the "Session Timeout Policy" decision in `docs/plans/active/mobile-usability-security-hardening.md` (2026-03-10)

## Context

The March 2026 mobile hardening plan chose a hybrid timeout model, and the mobile app enforced it in `apps/mobile/src/contexts/AuthContext.tsx`:

- sign out after 30 minutes without activity
- sign out 30 days after sign-in, whatever the activity
- a 5-minute "recent activity" window meant for sensitive actions (never used by any screen)

For a community app people open a few times a week, that means signing in again on almost every visit. The web app never had these limits, so the two platforms behaved differently. Facebook and Reddit, the apps Nepally's users know best, keep people signed in.

## Decision

**Sessions are long-lived on every platform. A user stays signed in on a device until they sign out.**

- No inactivity timeout and no maximum session age, on web or mobile.
- Access tokens stay short-lived (Supabase default: 1 hour) and refresh silently. Refresh tokens rotate on every use, and Supabase revokes the session if an old refresh token is reused.
- On mobile, token refresh runs only while the app is in the foreground.
  - supabase-js starts the refresh timer itself when the client initialises (`autoRefreshToken: true`), so a cold start is covered.
  - `AuthContext` pauses the timer when the app goes to the background and resumes it on return (`stopAutoRefresh` / `startAutoRefresh` on `AppState` changes).
  - This is Supabase's React Native pattern, and it keeps a session valid however long the app sat unused.
- Supabase Auth → Sessions keeps "Time-box user sessions" and "Inactivity timeout" at never, and "Single session per user" off, in every project.
- Sensitive actions ask the user to confirm who they are instead: deleting the account, and changing email or password. Email accounts re-enter the password; Google and Apple accounts confirm an emailed code (`supabase.auth.reauthenticate()`).
- The user controls their sessions:
  - A password change signs out other devices (`signOut({ scope: 'others' })`).
  - **Sign out of all devices** in Settings (`signOut({ scope: 'global' })`) covers a lost or stolen phone.

The re-authentication and sign-out options are scheduled in `docs/plans/active/2026-09-18-production-launch.md` (W3).

## Consequences

- People stay signed in between visits on mobile, matching web and the apps they already use.
- A stolen, unlocked phone stays signed in until the owner uses **Sign out of all devices** or changes their password. Re-authentication limits the damage to actions that cannot be undone.
- The session is now a long-term credential on the device, so storing it in `expo-secure-store` instead of AsyncStorage (SEC-06) matters more.
- `recordActivity`, `isWithinSensitiveActionWindow` and `apps/mobile/src/utils/sessionActivity.ts` are removed. Old builds left `@nusa:session_*` keys in AsyncStorage. Nothing reads them any more, and they are cleared on sign-out.
