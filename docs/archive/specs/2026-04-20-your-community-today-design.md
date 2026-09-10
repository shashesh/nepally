---
title: Your Community Today design
status: implemented
created: 2026-04-20
---

# "Your Community Today" — Engagement & Stickiness Design

**Date:** 2026-04-20
**Status:** Design spec — awaiting review
**Author:** Brainstormed collaboratively; authored by Claude Code
**Supersedes:** n/a
**Related docs:**
- [product/roadmap.md](../../product/roadmap.md)
- [plans/active/notifications-feature.md](../plans/notifications-feature.md)
- [architecture/monorepo-structure.md](../../architecture/monorepo-structure.md)

---

## 1. Summary

A pre-launch engagement layer that gives users **a daily reason to open the app** and **makes their identity and relationships visible** enough that community bonds form organically.

Two loosely coupled systems shipped together:

- **Metro Pulse** — a rule-composed horizontal card strip above the home feed (web + mobile). Surfaces today's local activity, upcoming events, cultural milestones, and social suggestions.
- **Social Identity** — opt-in extended profile fields + one-directional follow graph + a derived "helper reputation" score surfaced on the public profile.

Each reinforces the other: Metro Pulse has a durable surface to expose follow suggestions; Social Identity gives every new user content-graph signal from day one.

---

## 2. Goals & Non-Goals

### Goals
- Give cold-start users a reason to return daily, even without a specific utility need.
- Make shared heritage (hometown district, college, language) visible so Nepalis in the same metro can find each other.
- Create the first switching cost beyond the feed: a personal graph of followed users.
- Ship in three independently valuable PRs — none blocks another.

### Non-Goals (explicitly deferred)
- Algorithmic ranking of the feed or Pulse cards. Rule-based only in v1.
- Follower-only or "Following" home feed tab. Would fragment attention before the graph has mass.
- DMs unlocked by follows. Existing chat rules stand (Level 1+ can initiate; follow does **not** change permissions).
- Push notifications on follow events. Tracked under the existing notifications-007 plan; out of scope here.
- Nepal headlines / news brief card. Requires editorial pipeline; deferred to Phase 2.
- Helper-score badge visibility for low-score users. Suppressed to avoid negative signal.

---

## 3. Metro Pulse

### 3.1 Surface

A pinned horizontal card strip rendered **above** the existing home feed on both web and mobile. No changes to the feed itself.

- **Mobile:** React Native `FlatList` with paging, one card per viewport width, snap behavior, pull-to-refresh inherited from the home feed.
- **Web:** horizontal scroll container with CSS scroll-snap; arrow controls on hover at desktop breakpoints.
- **Card component** shared via `packages/shared` as a headless model; platform-specific presentational components consume it.

### 3.2 Card inventory (v1)

| # | Card | Data source | Refresh cadence | Show when |
|---|------|-------------|-----------------|-----------|
| 1 | Cultural Calendar | Seeded `cultural_events` table | Daily | Any festival within 30 days |
| 2 | Metro Highlights | `posts` filtered by `metro_id` + last 24h | Hourly | ≥1 new post in metro in 24h |
| 3 | Events This Week | Existing `events` table, metro + next 7 days | Hourly | ≥1 upcoming event |
| 4 | USD ↔ NPR | `fx_rates` cache row, filled once/day by edge function | Daily | Always |
| 5 | Find Your People | Follow-suggestion algorithm (§5.2) | Per session | User follows <5 people |
| 6 | Top Helper This Week | `helper_score` materialized view (§4.3) | Weekly | Metro has ≥3 Level 1+ users with a score |
| 7 | Weekly Digest ("You missed N posts") | Post count delta since user's last open | On app open after ≥7d absence | Churn-recovery only |

### 3.3 Composition rules

- 4–6 cards per session. If <3 have data, backfill with Cultural Calendar, USD ↔ NPR, and a "Be the first" CTA card linking to post creation.
- Cards are **dismissible per session** via an X icon; dismissed cards do not reappear until the next calendar day.
- Each card taps through to a deep link: festival → events feed filtered by date; metro highlights → home feed filtered by "today"; top helper → that user's public profile.
- Errors in one card drop only that card. A failed Pulse API call drops the entire strip silently — the feed still renders.

### 3.4 Ship order inside Metro Pulse

1. Metro Highlights + Events This Week (reuses existing data; cheapest signal-per-line)
2. Cultural Calendar (seed table; one migration)
3. USD ↔ NPR cache + Top Helper view
4. Find Your People (depends on Social Identity graph)
5. Weekly Digest (depends on notifications-007 landing)

---

## 4. Social Identity

### 4.1 Extended profile fields

Added to the `users` table (migration 028). All nullable, all opt-in.

| Field | Type | Notes |
|-------|------|-------|
| `hometown_district` | `text` nullable | Constrained to a static list of 77 Nepal districts, enforced in shared validation |
| `college` | `text` nullable | Free text, trimmed, ≤100 chars |
| `years_in_us` | `smallint` nullable | 0–99 check constraint |
| `languages` | `text[]` default `'{}'` | Values validated against enum in shared validation: `nepali`, `english`, `newari`, `maithili`, `bhojpuri`, `tharu`, `tamang`, `other` |

`bio` is **already present** via migration 025 (200 chars). No schema change there.

Surfaced in:
- Profile edit screen, new "About You" section (collapsible on mobile).
- Public profile view — rendered as subtle metadata chips below the existing trust badge; blank fields hide gracefully.
- Public profile respects existing `formatPublicName()` PII masking. Extended fields are considered public when populated.

### 4.2 Follow graph

New table `user_follows` (migration 028).

```
user_follows
  id             uuid primary key default gen_random_uuid()
  follower_id    uuid not null references users(id) on delete cascade
  followee_id    uuid not null references users(id) on delete cascade
  created_at     timestamptz not null default now()
  unique (follower_id, followee_id)
  check (follower_id <> followee_id)
```

Denormalized counters on `users`:
- `follower_count` int not null default 0
- `following_count` int not null default 0

Maintained by `AFTER INSERT` / `AFTER DELETE` triggers on `user_follows`. Unit test verifies counters match `COUNT(*)` after a sequence of follow/unfollow/block operations.

**RLS policies:**
- `user_follows` SELECT: public read (follower + followee lists are public).
- `user_follows` INSERT: `auth.uid() = follower_id` AND follower trust level ≥ 1.
- `user_follows` DELETE: `auth.uid() = follower_id` (unfollow); moderators may delete any row.
- Blocking a user (existing `blocked_users` table) removes both follow rows via a DB trigger.

**UX touchpoints:**
- Public profile: primary "Follow" / "Following" button, plus follower/following counts that expand into list screens.
- Post card header: optional "• Following" chip next to author name for posts by followed users (social proof, no color change).
- Profile's existing Messenger-style "Message" button is unchanged.

### 4.3 Helper reputation

A derived score, not a new table. Computed via Postgres materialized view `user_helper_scores` refreshed nightly by an edge function.

Formula (v1):

```
helper_score =
    (count of comments user made on other users' posts in last 365 days) * 2
  + (count of likes received on user's own posts in last 365 days) * 1
  + (count of distinct chat threads user initiated from other users' posts) * 5
```

Rendered on the public profile as a single line:

> 🙏 Helped **47** people this year

Visibility rules:
- Hidden for scores < 10 (avoids negative signal for new users).
- Exact formula not exposed to users.
- Formula lives in `packages/shared/src/logic/helperScore.ts` so tuning happens in one place — the view mirrors it in SQL.

---

## 5. Data Flow

### 5.1 Metro Pulse

```
App open / pull-to-refresh
        │
        ▼
getPulseCards(userId, metroId, supabase)    ← single shared-API call
        │
        ▼
Server composes in parallel:
  ├─ getCulturalCalendar(today)
  ├─ getMetroHighlights(metroId, 24h)
  ├─ getUpcomingEvents(metroId, 7d)
  ├─ getExchangeRate()
  ├─ getFollowSuggestions(userId)
  └─ getTopHelper(metroId, 7d)
        │
        ▼
Returns { cards: PulseCard[], computedAt: ISO8601 }
        │
        ▼
Client renders strip, caches for session (sessionStorage on web, in-memory on mobile)
```

Single round-trip. Each sub-query is independently unit-testable. A failure in any sub-query drops that card from the response, not the whole strip.

### 5.2 Follow suggestion ranking (rule-based, v1)

Candidate pool: users in the same metro as the requester, excluding the requester, anyone blocked either direction, and anyone already followed.

Score each candidate:

| Rule | Score |
|------|-------|
| Same metro + same `hometown_district` | +10 |
| Same metro + same `college` | +8 |
| Same metro + trust level 2 | +5 |
| Same metro (baseline) | +2 |

Return top 3 by score, breaking ties by `follower_count` desc, then by `created_at` asc.

Each suggestion carries a reason string: `"Both from Pokhara"`, `"Both studied at Pulchowk"`, `"Top contributor in DFW"`, or `"Active in your metro"`. Shown as the card subtitle.

---

## 6. Integration With Existing Systems

| Existing surface | Change |
|------------------|--------|
| Home feed | Pulse strip renders above; feed logic unchanged |
| Public profile | Adds Follow button, counters, extended fields, helper badge |
| Profile edit | Adds "About You" section |
| Notifications (plan 007) | Adds two future notification types (`new_follower`, deferred to that plan) |
| Events | Pulse "Events This Week" deep-links into existing event detail |
| Chat | Unchanged; follow does **not** change messaging permissions |
| Trust levels | Unchanged; follow available at Level 1+; Level 0 can view but not follow |
| Blocking (`blocked_users`) | New trigger severs follows both directions when a block is created |

---

## 7. Shared-First Placement

Per [guides/code-sharing.md](../../guides/code-sharing.md):

```
packages/shared/src/
  api/
    follows.ts           — followUser, unfollowUser, getFollowers,
                           getFollowing, isFollowing, getFollowSuggestions
    pulse.ts             — getPulseCards (composer), sub-queries
    profile.ts           — updateExtendedProfile, getExtendedProfile (or
                           extend existing users.ts)
  types/
    user-follow.ts       — UserFollow, extended User type
    pulse.ts             — PulseCard, PulseCardKind, PulseCardPayload union
  validation/
    user.ts              — add hometown_district, college, years_in_us,
                           languages validation (Zod or existing approach)
  logic/
    helperScore.ts       — score formula (pure function, mirrored in SQL)
    followSuggestions.ts — candidate scoring + reason string builder
  constants/
    nepal-districts.ts   — frozen list of 77 districts
    languages.ts         — supported language enum
```

Web and mobile consume via dependency injection of the Supabase client, matching the existing pattern.

---

## 8. Rollout Plan

Three PRs. Each ships user-visible value on its own.

### PR 1 — Social Identity foundation
- Migration 028: `user_follows` table + triggers + RLS, extended profile columns
- Shared API: follows + extended profile
- Web + mobile: profile edit "About You" section, public profile Follow button + counters + fields
- Tests: shared unit, web component, mobile component, RLS integration
- **User-visible value:** users can fill out richer profiles and follow each other immediately

### PR 2 — Metro Pulse core
- Migration 029: `cultural_events` seed table, `fx_rates` cache table, seed data for 2026–2027 Nepali festivals
- Edge function: daily FX rate refresh (cron)
- Shared API: `getPulseCards` + 4 sub-queries (Calendar, Highlights, Events, FX)
- Components: `PulseCard` model + 4 card variants
- Web: horizontal scroll strip. Mobile: FlatList pager. Pinned above feed.
- Tests: each card variant isolated, composition logic, empty-metro fallback
- **User-visible value:** daily-refreshing surface above the feed even with zero follows

### PR 3 — Social cards + helper score
- Migration 030: `user_helper_scores` materialized view + nightly refresh
- Edge function: nightly view refresh
- Shared API: `getFollowSuggestions`, `getTopHelper`
- Pulse card variants: Find Your People, Top Helper This Week
- Public profile helper badge
- Tests: view correctness against known fixtures, suggestion ranking, badge visibility threshold
- **User-visible value:** the graph starts *recommending* people, reputation becomes visible

---

## 9. Error Handling

| Failure mode | Behavior |
|-------------|----------|
| `getPulseCards` call fails | Strip does not render; home feed loads normally; no user-facing error |
| A single sub-query fails | That card is omitted from the response; logged server-side |
| Follow INSERT fails (race, duplicate) | Caught via unique constraint; treated as idempotent success on client |
| Helper score view missing (pre-refresh) | Public profile hides the badge rather than rendering "Helped 0 people" |
| FX API down during daily refresh | Keep serving the previous day's cached rate; surface a subtle "as of <date>" caption |
| Materialized view refresh fails | Alert via existing monitoring; Pulse card "Top Helper" omits that day |

---

## 10. Testing

Aligned with the existing 80% coverage bar and unit-testing policy.

- **Shared package (`packages/shared`)** — unit tests for every API function, helper score formula, follow suggestion ranking (deterministic inputs → table-driven tests), validation rules for extended profile.
- **Web (`apps/web`)** — component tests for each Pulse card, follow button state transitions, extended profile edit form. Async tests use `await act(async () => {})` per project convention.
- **Mobile (`apps/mobile`)** — mirrored component tests; FlatList snap behavior smoke-tested.
- **RLS/DB** — integration tests for `user_follows` policies, trigger-maintained counters, block-severs-follow trigger.
- **End-to-end** — one Playwright journey per PR exercising the happy path (follow a user; see a Pulse strip with ≥3 cards; view a helper badge).

---

## 11. Open Questions

None blocking. Possible future refinements (out of scope for v1):

- Should the Pulse strip support a user-defined "pinned" card (e.g., always show FX)? Revisit after telemetry.
- Do we expose the helper score formula in an about page for transparency? Lean no for v1 to keep tuning room.
- Is a "mutual follows" badge worth the schema cost later? Defer until the graph is dense enough to test.

---

## 12. Success Signals (Post-Launch)

Explicitly not commitments — signals to watch if this works:

- **Daily-active / weekly-active ratio** rises after Pulse ships (primary stickiness signal).
- **Median sessions per user per week** increases, especially for users with zero posts of their own.
- **Follow-graph density** (median follows per Level 1+ user) grows past ~5 within the first month.
- **Session length** on app-open after ≥7d absence rises — the Weekly Digest card is doing its job.
- **Share of Metro Pulse taps** vs. raw feed scrolls — tells us which cards are worth keeping.
