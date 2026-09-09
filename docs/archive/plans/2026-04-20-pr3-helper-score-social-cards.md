---
title: "PR 3: Helper score and social pulse cards"
status: implemented
created: 2026-04-20
spec: docs/specs/2026-04-20-your-community-today-design.md
---

# PR 3: Helper Score + Social Pulse Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the "Your Community Today" trilogy by adding a helper-reputation score (derived from user activity), a rule-based follow-suggestion engine, and two new Metro Pulse card variants (`find_your_people` and `top_helper`) — completing the identity/graph layer on top of PR 1 and PR 2.

**Architecture:** A read-only Postgres VIEW (`user_helper_scores`) aggregates helpful actions per user over the last 365 days — kept as a regular VIEW rather than materialized for YAGNI; can be upgraded later if query latency becomes a problem. Follow suggestions fetch a candidate pool (same-metro users minus blocked/followed) and rank them via a pure ranking function in shared logic. Two new `PulseCard` variants plug into the existing composer from PR 2 via `Promise.allSettled` so they can fail independently.

**Tech Stack:** TypeScript, Supabase (PostgreSQL + RLS), Zod validation where relevant, React (Next.js 15) for web, React Native (Expo 54) for mobile, Vitest for shared/web tests, Jest for mobile tests.

**Spec:** [docs/specs/2026-04-20-your-community-today-design.md](../specs/2026-04-20-your-community-today-design.md) §3.2 (cards 5+6), §4.3 (Helper Score), §5.2 (suggestion ranking)

**Branch:** `feat/community-today-pr3` (create off master **after** #41 and #42 merge).

---

## Dependencies

**BLOCKED until both prior PRs merge to master:**
- **PR 1 (#42 — `feat/community-today-engagement`)** — provides `user_follows` table, extended profile columns (hometown_district, college, follower_count, etc.), and the shared `follows.ts` API. PR 3's suggestion ranking reads those columns; the candidate-exclusion SQL joins `user_follows`.
- **PR 2 (#41 — `feat/metro-pulse`)** — provides the `PulseCard` discriminated union, `assemblePulseCards` pure logic, `getPulseCards` composer, and `MetroPulseStrip` components on web + mobile. PR 3 extends all of these with two new card kinds.

Confirm on master before starting: `git log master --oneline | head -30` should show commits from BOTH feat branches.

---

## Key Decisions Locked In

1. **Helper score uses a regular VIEW, not a materialized view** — YAGNI pre-launch. Compute on every read. If a metro-wide query (`getTopHelperInMetro`) becomes a hot path, migrate to materialized + lazy refresh (same pattern as PR 2's `fx_rates`). This is called out in the spec §11 as an open optimization.
2. **Helper score formula (simplified from spec §4.3):**
   ```
   helper_score =
       (count of comments user made on other users' posts in last 365 days) * 2
     + (count of likes user's own posts received in last 365 days) * 1
   ```
   The spec originally included `+ 5 * distinct chat threads user initiated from other users' posts` — dropped because the `conversations` table has no FK to `posts`, so that signal is not derivable without schema changes. A future migration can add `conversations.source_post_id` and reincorporate.
3. **Helper score visibility threshold:** Spec says hide for `score < 10`. Enforced in UI (API always returns the raw score). Keeps the API pure.
4. **"Find Your People" card shape:** one primary suggestion per card + tapping the card deep-links to that user's public profile. Fits the passive-card model better than embedding a Follow button inside the strip. The suggestion count is exposed so we can show "& 2 more" if desired later.
5. **Ranking algorithm is pure:** candidate fetch lives in `packages/shared/src/api/`; scoring lives in `packages/shared/src/logic/`. Matches the assembleCards pattern from PR 2.
6. **PII masking:** all display names going into cards pass through `formatPublicName` (already in shared) — protects first-name-last-name exposure.

---

## File Structure

### Created
- `supabase/migrations/031_helper_score.sql` — `user_helper_scores` VIEW + indexes on source tables if missing
- `packages/shared/src/api/helperScore.ts` — `getHelperScore`, `getTopHelperInMetro`
- `packages/shared/src/api/helperScore.test.ts`
- `packages/shared/src/api/followSuggestions.ts` — `getFollowSuggestionCandidates`
- `packages/shared/src/api/followSuggestions.test.ts`
- `packages/shared/src/logic/followSuggestions.ts` — `rankFollowSuggestions` pure function
- `packages/shared/src/logic/followSuggestions.test.ts`

### Modified
- `packages/shared/src/types/pulse.ts` — add `FindYourPeopleCard` + `TopHelperCard` variants; extend `PulseCard` union
- `packages/shared/src/logic/pulse.ts` — extend `assemblePulseCards` to build the two new card kinds
- `packages/shared/src/logic/pulse.test.ts` — add coverage for new builders
- `packages/shared/src/api/pulse.ts` — `getPulseCards` composer adds two more parallel sub-queries
- `packages/shared/src/api/pulse.test.ts` — cover new cards end-to-end
- `packages/shared/src/api/index.ts` — re-export new files
- `packages/shared/src/logic/index.ts` — re-export new logic file
- `apps/mobile/src/components/pulse/PulseCard.tsx` — render the two new card kinds (name + photo for one, rank string for the other)
- `apps/mobile/src/components/pulse/PulseCard.test.tsx` — cover new renders
- `apps/mobile/src/screens/profile/PublicProfileScreen.tsx` — helper badge (renders iff `helperScore >= 10`)
- `apps/mobile/src/screens/profile/PublicProfileScreen.test.tsx` — cover badge visibility threshold
- `apps/web/src/components/pulse/PulseCard.tsx` + `.module.css` — mirror of mobile
- `apps/web/src/components/pulse/PulseCard.test.tsx` — mirror
- `apps/web/src/pages/users/[id].page.tsx` — helper badge
- `apps/web/src/pages/users/[id].test.tsx` — badge coverage
- `docs/INDEX.md` — add plan entry

---

## Execution Notes

- Repo root: `c:/Users/shash/Documents/personal-github-repos/nepally/`.
- **Branch:** stay on `feat/community-today-pr3` (create off master once deps merge). Commit frequently; never push without explicit user OK.
- **Migration apply:** Task A2 is a manual user-gated step, same pattern as PR 1/PR 2.
- **Tests:** mock helper-score API in UI tests; never hit a live view.
- **Migration number:** 031 (030 was taken by `030_fx_rates_tighten_rls.sql` on master after this plan was authored).

---

## Phase A — Database Foundation

### Task A1: Author migration 031

**Files:**
- Create: `supabase/migrations/031_helper_score.sql`

- [ ] **Step 1: Verify no unrelated migrations landed after 029**

Run (Glob): `supabase/migrations/*.sql` — confirm the next sequential number is 031. If a newer number exists, use the next free integer and update all references in this plan.

- [ ] **Step 2: Write the migration**

```sql
-- 031_helper_score.sql
-- ADDITIVE: creates a read-only VIEW aggregating helper-reputation signals
-- per user over the last 365 days. No source tables modified.
--
-- Formula (v1, simplified from design spec §4.3):
--   helper_score =
--       (count of comments user made on OTHER users' posts in last 365 days) * 2
--     + (count of likes user's own posts received in last 365 days) * 1
--
-- The spec mentioned a third signal (chat threads from other users' posts);
-- dropped because conversations has no FK to posts. Revisit when that schema
-- link exists.
--
-- Why a VIEW not a materialized view:
--   Pre-launch scale is small. Per-read computation is acceptable. If the
--   hot path `getTopHelperInMetro` becomes slow, a future migration can
--   swap this for a MATERIALIZED VIEW with a lazy-refresh pattern mirroring
--   PR 2's fx_rates approach.
--
-- Rollback: write a new forward-only migration that runs:
--   DROP VIEW IF EXISTS user_helper_scores;

CREATE OR REPLACE VIEW user_helper_scores AS
WITH comments_on_others AS (
  SELECT
    c.author_id AS user_id,
    COUNT(*) AS n
  FROM post_comments c
  JOIN posts p ON p.id = c.post_id
  WHERE c.is_deleted = false
    AND c.author_id <> p.author_id
    AND c.created_at >= (now() - interval '365 days')
  GROUP BY c.author_id
),
likes_received AS (
  SELECT
    p.author_id AS user_id,
    COUNT(*) AS n
  FROM post_likes pl
  JOIN posts p ON p.id = pl.post_id
  WHERE pl.created_at >= (now() - interval '365 days')
  GROUP BY p.author_id
)
SELECT
  u.id AS user_id,
  u.metro_area_id,
  COALESCE(coa.n, 0) AS helpful_comments,
  COALESCE(lr.n, 0) AS likes_received_on_own_posts,
  (COALESCE(coa.n, 0) * 2 + COALESCE(lr.n, 0) * 1) AS helper_score
FROM users u
LEFT JOIN comments_on_others coa ON coa.user_id = u.id
LEFT JOIN likes_received lr ON lr.user_id = u.id
WHERE u.is_banned = false;

COMMENT ON VIEW user_helper_scores IS
  'Derived helper-reputation score per user over last 365 days. Read-only.';

-- Supporting indexes (idempotent; skip if already present).
CREATE INDEX IF NOT EXISTS idx_post_comments_author_created
  ON post_comments (author_id, created_at)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_post_likes_post_created
  ON post_likes (post_id, created_at);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/031_helper_score.sql
git commit -m "feat(db): user_helper_scores view (031)"
```

### Task A2 (manual gate): User applies migration 031

User applies via Supabase SQL Editor (or `supabase db push`) and verifies:

```sql
SELECT COUNT(*) FROM user_helper_scores;   -- should match COUNT(*) FROM users WHERE is_banned = false
SELECT * FROM user_helper_scores WHERE helper_score > 0 ORDER BY helper_score DESC LIMIT 5;
```

Before the next phase, confirm success.

---

## Phase B — Shared Types (Extend PulseCard Union)

### Task B1: Add two new card variants to the union

**Files:**
- Modify: `packages/shared/src/types/pulse.ts`

- [ ] **Step 1: Open the file and extend the type module**

Append after the existing `CreateFirstPostCard` interface (and before the `export type PulseCard = ...` union line — you'll also modify the union). Insert:

```typescript
export interface FindYourPeopleCard {
  kind: 'find_your_people';
  id: 'find_your_people';
  suggestionCount: number;
  featured: {
    userId: string;
    displayName: string; // already masked via formatPublicName
    photo: string | null;
    reason: string; // e.g. 'Both from Pokhara'
  };
  deepLink: string; // `/users/${userId}`
}

export interface TopHelperCard {
  kind: 'top_helper';
  id: 'top_helper';
  helper: {
    userId: string;
    displayName: string; // masked
    photo: string | null;
    helperScore: number;
  };
  metroLabel: string;
  deepLink: string;
}
```

- [ ] **Step 2: Extend the `PulseCardKind` union AND the `PulseCard` union**

Change:

```typescript
export type PulseCardKind =
  | 'cultural_calendar'
  | 'metro_highlights'
  | 'events_this_week'
  | 'fx_rate';
```

to:

```typescript
export type PulseCardKind =
  | 'cultural_calendar'
  | 'metro_highlights'
  | 'events_this_week'
  | 'fx_rate'
  | 'find_your_people'
  | 'top_helper';
```

Change:

```typescript
export type PulseCard =
  | CulturalCalendarCard
  | MetroHighlightsCard
  | EventsThisWeekCard
  | FxRateCard
  | CreateFirstPostCard;
```

to:

```typescript
export type PulseCard =
  | CulturalCalendarCard
  | MetroHighlightsCard
  | EventsThisWeekCard
  | FxRateCard
  | FindYourPeopleCard
  | TopHelperCard
  | CreateFirstPostCard;
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/shared && npx tsc --noEmit -p tsconfig.json`
Expected: clean. NOTE: extending `PulseCard` will likely surface non-exhaustive `switch` statements in the rendering code — that is handled in later phases.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/pulse.ts
git commit -m "feat(shared): extend PulseCard union with find_your_people + top_helper"
```

---

## Phase C — Shared API: Helper Score

### Task C1: `getHelperScore` + `getTopHelperInMetro` (TDD)

**Files:**
- Create: `packages/shared/src/api/helperScore.test.ts`
- Create: `packages/shared/src/api/helperScore.ts`
- Modify: `packages/shared/src/api/index.ts`

- [ ] **Step 1: Write the failing tests**

`packages/shared/src/api/helperScore.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getHelperScore, getTopHelperInMetro } from './helperScore';

function makeSingleChain(final: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'maybeSingle']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.maybeSingle.mockResolvedValue(final);
  return chain;
}

describe('getHelperScore', () => {
  it('returns the helper_score when a row exists', async () => {
    const chain = makeSingleChain({
      data: { user_id: 'u-1', helper_score: 42, helpful_comments: 15, likes_received_on_own_posts: 12 },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getHelperScore(supabase, 'u-1');

    expect(supabase.from).toHaveBeenCalledWith('user_helper_scores');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u-1');
    expect(res.data?.helperScore).toBe(42);
  });

  it('returns score 0 when the row is absent (banned or brand new)', async () => {
    const chain = makeSingleChain({ data: null, error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getHelperScore(supabase, 'u-2');
    expect(res.data?.helperScore).toBe(0);
  });

  it('returns error on query failure', async () => {
    const chain = makeSingleChain({ data: null, error: new Error('boom') });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getHelperScore(supabase, 'u-3');
    expect(res.error).toBeInstanceOf(Error);
    expect(res.data).toBeUndefined();
  });
});

describe('getTopHelperInMetro', () => {
  function makeListChain(final: { data: unknown; error: unknown }) {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of ['select', 'eq', 'gte', 'order', 'limit']) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    (chain as unknown as { then: (res: (v: unknown) => unknown) => Promise<unknown> }).then =
      (res: (v: unknown) => unknown) => Promise.resolve(res(final));
    return chain;
  }

  it('returns the single highest-scoring non-viewer in the metro', async () => {
    const chain = makeListChain({
      data: [
        { user_id: 'u-1', helper_score: 80, metro_area_id: 'm-1' },
      ],
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getTopHelperInMetro(supabase, 'm-1', 'viewer-1');

    expect(supabase.from).toHaveBeenCalledWith('user_helper_scores');
    expect(chain.eq).toHaveBeenCalledWith('metro_area_id', 'm-1');
    // threshold filter: helper_score >= 10 per spec visibility rule for the card
    expect(chain.gte).toHaveBeenCalledWith('helper_score', 10);
    expect(chain.order).toHaveBeenCalledWith('helper_score', { ascending: false });
    expect(res.data?.userId).toBe('u-1');
    expect(res.data?.helperScore).toBe(80);
  });

  it('skips the viewer when they are the top helper', async () => {
    const chain = makeListChain({
      data: [
        { user_id: 'viewer-1', helper_score: 99, metro_area_id: 'm-1' },
        { user_id: 'u-2', helper_score: 60, metro_area_id: 'm-1' },
      ],
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getTopHelperInMetro(supabase, 'm-1', 'viewer-1');
    expect(res.data?.userId).toBe('u-2');
  });

  it('returns null when no qualifying helper exists', async () => {
    const chain = makeListChain({ data: [], error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getTopHelperInMetro(supabase, 'm-1', 'viewer-1');
    expect(res.data).toBeNull();
    expect(res.error).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`cd packages/shared && npx vitest run src/api/helperScore.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`packages/shared/src/api/helperScore.ts`:

```typescript
/**
 * Shared Helper Score API — reads from the user_helper_scores VIEW.
 * See docs/specs/2026-04-20-your-community-today-design.md §4.3
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface HelperScore {
  userId: string;
  helperScore: number;
  helpfulComments: number;
  likesReceivedOnOwnPosts: number;
}

export interface TopHelper {
  userId: string;
  helperScore: number;
  metroAreaId: string;
}

interface ScoreResult {
  data?: HelperScore;
  error?: Error;
}

interface TopHelperResult {
  data?: TopHelper | null;
  error?: Error;
}

// Spec §4.3: hide helper badge when score < 10. Same threshold applied to
// the Top Helper card so we don't surface a "top helper" who barely qualifies.
export const HELPER_SCORE_VISIBILITY_THRESHOLD = 10;

// How many rows to pull when skipping the viewer — small constant avoids a
// self-join while still tolerating the case where the viewer IS the top.
const TOP_HELPER_FETCH_LIMIT = 5;

function toError(raw: unknown, fallback: string): Error {
  if (raw instanceof Error) return raw;
  if (raw && typeof raw === 'object' && 'message' in raw) {
    return new Error(String((raw as { message: unknown }).message));
  }
  return new Error(fallback);
}

interface ScoreRow {
  user_id: string;
  helper_score: number;
  helpful_comments: number;
  likes_received_on_own_posts: number;
}

interface TopRow {
  user_id: string;
  helper_score: number;
  metro_area_id: string;
}

/** Returns the helper score for a single user. Score is 0 when no row exists. */
export async function getHelperScore(
  supabase: SupabaseClient,
  userId: string
): Promise<ScoreResult> {
  try {
    const { data, error } = await supabase
      .from('user_helper_scores')
      .select('user_id, helper_score, helpful_comments, likes_received_on_own_posts')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        data: {
          userId,
          helperScore: 0,
          helpfulComments: 0,
          likesReceivedOnOwnPosts: 0,
        },
      };
    }

    const row = data as ScoreRow;
    return {
      data: {
        userId: row.user_id,
        helperScore: row.helper_score,
        helpfulComments: row.helpful_comments,
        likesReceivedOnOwnPosts: row.likes_received_on_own_posts,
      },
    };
  } catch (error) {
    return { error: toError(error, 'Failed to load helper score') };
  }
}

/**
 * Returns the single highest-scoring qualifying helper in the metro (excluding
 * the viewer). Returns `null` (not an error) when nobody qualifies.
 */
export async function getTopHelperInMetro(
  supabase: SupabaseClient,
  metroAreaId: string,
  viewerId: string
): Promise<TopHelperResult> {
  try {
    const { data, error } = await supabase
      .from('user_helper_scores')
      .select('user_id, helper_score, metro_area_id')
      .eq('metro_area_id', metroAreaId)
      .gte('helper_score', HELPER_SCORE_VISIBILITY_THRESHOLD)
      .order('helper_score', { ascending: false })
      .limit(TOP_HELPER_FETCH_LIMIT);

    if (error) throw error;

    const rows = (data ?? []) as TopRow[];
    const firstNonViewer = rows.find((r) => r.user_id !== viewerId) ?? null;

    if (!firstNonViewer) return { data: null };

    return {
      data: {
        userId: firstNonViewer.user_id,
        helperScore: firstNonViewer.helper_score,
        metroAreaId: firstNonViewer.metro_area_id,
      },
    };
  } catch (error) {
    return { error: toError(error, 'Failed to load top helper') };
  }
}
```

- [ ] **Step 4: Export from the api barrel**

`packages/shared/src/api/index.ts`: append (matching existing `export * from './X';` style):

```typescript
export * from './helperScore';
```

- [ ] **Step 5: Run — expect PASS**

`cd packages/shared && npx vitest run src/api/helperScore.test.ts`
Expected: 6 tests pass.

- [ ] **Step 6: Typecheck**

`cd packages/shared && npx tsc --noEmit -p tsconfig.json`

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/api/helperScore.ts packages/shared/src/api/helperScore.test.ts packages/shared/src/api/index.ts
git commit -m "feat(shared): helper score API (getHelperScore, getTopHelperInMetro)"
```

---

## Phase D — Shared Logic: Follow Suggestion Ranking

### Task D1: `rankFollowSuggestions` pure function (TDD)

**Files:**
- Create: `packages/shared/src/logic/followSuggestions.test.ts`
- Create: `packages/shared/src/logic/followSuggestions.ts`
- Modify: `packages/shared/src/logic/index.ts`

Spec §5.2 rules:

| Rule | Score |
|------|-------|
| Same metro + same hometown_district | +10 |
| Same metro + same college | +8 |
| Same metro + trust level 2 | +5 |
| Same metro (baseline) | +2 |

Return top 3 by score, break ties by `follower_count` desc, then by `created_at` asc. Each suggestion carries a reason string.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { rankFollowSuggestions } from './followSuggestions';

interface TestViewer {
  id: string;
  metroAreaId: string;
  hometownDistrict: string | null;
  college: string | null;
}

interface TestCandidate {
  id: string;
  fullName: string;
  hometownDistrict: string | null;
  college: string | null;
  trustLevel: number;
  followerCount: number;
  createdAt: string;
  profilePhoto: string | null;
}

const viewer: TestViewer = {
  id: 'viewer',
  metroAreaId: 'm-dfw',
  hometownDistrict: 'Pokhara',
  college: 'Pulchowk',
};

describe('rankFollowSuggestions', () => {
  it('ranks a same-district candidate above a same-college candidate', () => {
    const district: TestCandidate = {
      id: 'a', fullName: 'Anish Shrestha', hometownDistrict: 'Pokhara', college: 'Other U',
      trustLevel: 1, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
    };
    const college: TestCandidate = {
      id: 'b', fullName: 'Bina K.C.', hometownDistrict: 'Kathmandu', college: 'Pulchowk',
      trustLevel: 1, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
    };
    const ranked = rankFollowSuggestions(viewer, [college, district]);
    expect(ranked[0].userId).toBe('a');
    expect(ranked[0].reason).toContain('Pokhara');
    expect(ranked[1].userId).toBe('b');
  });

  it('gives a Level 2 contributor a bonus over a baseline candidate', () => {
    const contributor: TestCandidate = {
      id: 'c', fullName: 'Contributor', hometownDistrict: 'Bhaktapur', college: 'Other',
      trustLevel: 2, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
    };
    const baseline: TestCandidate = {
      id: 'd', fullName: 'Basic', hometownDistrict: 'Bhaktapur', college: 'Other',
      trustLevel: 1, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
    };
    const ranked = rankFollowSuggestions(viewer, [baseline, contributor]);
    expect(ranked[0].userId).toBe('c');
    expect(ranked[0].reason).toContain('contributor');
  });

  it('tie-breaks by follower_count desc, then created_at asc', () => {
    const older: TestCandidate = {
      id: 'e', fullName: 'Older', hometownDistrict: 'Pokhara', college: 'Pulchowk',
      trustLevel: 1, followerCount: 5, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
    };
    const newer: TestCandidate = {
      id: 'f', fullName: 'Newer', hometownDistrict: 'Pokhara', college: 'Pulchowk',
      trustLevel: 1, followerCount: 10, createdAt: '2026-03-01T00:00:00Z', profilePhoto: null,
    };
    const ranked = rankFollowSuggestions(viewer, [older, newer]);
    // both score identically; higher follower_count wins
    expect(ranked[0].userId).toBe('f');
    expect(ranked[1].userId).toBe('e');
  });

  it('caps output at 3 suggestions', () => {
    const cs: TestCandidate[] = Array.from({ length: 6 }, (_, i) => ({
      id: `u-${i}`,
      fullName: `U${i}`,
      hometownDistrict: 'Bhaktapur',
      college: 'Other',
      trustLevel: 1,
      followerCount: i, // create an order
      createdAt: '2026-01-01T00:00:00Z',
      profilePhoto: null,
    }));
    const ranked = rankFollowSuggestions(viewer, cs);
    expect(ranked.length).toBe(3);
  });

  it('masks names via formatPublicName-compatible logic (first + last initial)', () => {
    const c: TestCandidate = {
      id: 'g', fullName: 'Anish Shrestha', hometownDistrict: 'Pokhara', college: null,
      trustLevel: 1, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
    };
    const ranked = rankFollowSuggestions(viewer, [c]);
    expect(ranked[0].displayName).toBe('Anish S.');
  });

  it('returns an empty array when the candidate list is empty', () => {
    expect(rankFollowSuggestions(viewer, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`cd packages/shared && npx vitest run src/logic/followSuggestions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`packages/shared/src/logic/followSuggestions.ts`:

```typescript
/**
 * Pure follow-suggestion ranking. Takes a pre-filtered candidate pool (viewer
 * excluded, blocked excluded, already-followed excluded) and scores each with
 * a rule-based formula from docs/specs/2026-04-20-your-community-today-design.md §5.2.
 */
import { formatPublicName } from '../utils/user';

const SCORE_SAME_DISTRICT = 10;
const SCORE_SAME_COLLEGE = 8;
const SCORE_CONTRIBUTOR_BONUS = 5;
const SCORE_BASELINE = 2;
const MAX_SUGGESTIONS = 3;
const CONTRIBUTOR_TRUST_LEVEL = 2;

export interface SuggestionViewer {
  id: string;
  metroAreaId: string;
  hometownDistrict: string | null;
  college: string | null;
}

export interface SuggestionCandidate {
  id: string;
  fullName: string;
  hometownDistrict: string | null;
  college: string | null;
  trustLevel: number;
  followerCount: number;
  createdAt: string; // ISO
  profilePhoto: string | null;
}

export interface RankedSuggestion {
  userId: string;
  displayName: string; // masked
  photo: string | null;
  reason: string;
  score: number;
}

function scoreAndReason(
  viewer: SuggestionViewer,
  candidate: SuggestionCandidate
): { score: number; reason: string } {
  // Choose the single strongest reason to surface to the user; all candidates
  // are assumed same-metro by the caller (filtered at the query layer).
  if (
    viewer.hometownDistrict &&
    candidate.hometownDistrict &&
    viewer.hometownDistrict === candidate.hometownDistrict
  ) {
    return {
      score: SCORE_SAME_DISTRICT,
      reason: `Both from ${candidate.hometownDistrict}`,
    };
  }
  if (
    viewer.college &&
    candidate.college &&
    viewer.college === candidate.college
  ) {
    return {
      score: SCORE_SAME_COLLEGE,
      reason: `Both studied at ${candidate.college}`,
    };
  }
  if (candidate.trustLevel >= CONTRIBUTOR_TRUST_LEVEL) {
    return {
      score: SCORE_BASELINE + SCORE_CONTRIBUTOR_BONUS,
      reason: 'Top contributor in your metro',
    };
  }
  return { score: SCORE_BASELINE, reason: 'Active in your metro' };
}

export function rankFollowSuggestions(
  viewer: SuggestionViewer,
  candidates: SuggestionCandidate[]
): RankedSuggestion[] {
  const scored = candidates.map((c) => {
    const { score, reason } = scoreAndReason(viewer, c);
    return {
      candidate: c,
      score,
      reason,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.candidate.followerCount !== a.candidate.followerCount) {
      return b.candidate.followerCount - a.candidate.followerCount;
    }
    // earlier createdAt wins on tie
    return a.candidate.createdAt.localeCompare(b.candidate.createdAt);
  });

  return scored.slice(0, MAX_SUGGESTIONS).map((s) => ({
    userId: s.candidate.id,
    displayName: formatPublicName(s.candidate.fullName),
    photo: s.candidate.profilePhoto,
    reason: s.reason,
    score: s.score,
  }));
}
```

- [ ] **Step 4: Export from the logic barrel**

`packages/shared/src/logic/index.ts`: append:

```typescript
export * from './followSuggestions';
```

- [ ] **Step 5: Run — expect PASS**

`cd packages/shared && npx vitest run src/logic/followSuggestions.test.ts`
Expected: 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/logic/followSuggestions.ts packages/shared/src/logic/followSuggestions.test.ts packages/shared/src/logic/index.ts
git commit -m "feat(shared): pure rankFollowSuggestions ranking function"
```

---

## Phase E — Shared API: Follow Suggestion Candidate Fetch

### Task E1: `getFollowSuggestionCandidates` (TDD)

**Files:**
- Create: `packages/shared/src/api/followSuggestions.test.ts`
- Create: `packages/shared/src/api/followSuggestions.ts`
- Modify: `packages/shared/src/api/index.ts`

Fetches the raw candidate pool for a viewer in a metro. Handles exclusions via Supabase query builder (same metro, not banned, not self). The `not-followed` and `not-blocked` filters are applied client-side as post-filters to avoid complex PostgREST joins — acceptable at pre-launch metro sizes (pool is capped at `FETCH_LIMIT`).

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getFollowSuggestionCandidates } from './followSuggestions';

function makeListChain(final: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'eq', 'neq', 'order', 'limit']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as unknown as { then: (res: (v: unknown) => unknown) => Promise<unknown> }).then =
    (res: (v: unknown) => unknown) => Promise.resolve(res(final));
  return chain;
}

describe('getFollowSuggestionCandidates', () => {
  it('queries users in the same metro and excludes the viewer + banned', async () => {
    const usersChain = makeListChain({
      data: [
        {
          id: 'u-1', full_name: 'Anish Shrestha', hometown_district: 'Pokhara',
          college: 'Pulchowk', trust_level: 1, follower_count: 3,
          created_at: '2026-02-01T00:00:00Z', profile_photo: null,
        },
      ],
      error: null,
    });
    const followsChain = makeListChain({ data: [], error: null });
    const blocksChain = makeListChain({ data: [], error: null });

    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(usersChain)
        .mockReturnValueOnce(followsChain)
        .mockReturnValueOnce(blocksChain),
    } as unknown as SupabaseClient;

    const res = await getFollowSuggestionCandidates(supabase, 'viewer-1', 'm-dfw');

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(usersChain.eq).toHaveBeenCalledWith('metro_area_id', 'm-dfw');
    expect(usersChain.eq).toHaveBeenCalledWith('is_banned', false);
    expect(usersChain.neq).toHaveBeenCalledWith('id', 'viewer-1');
    expect(res.data?.length).toBe(1);
    expect(res.data?.[0].id).toBe('u-1');
  });

  it('filters out users the viewer already follows', async () => {
    const usersChain = makeListChain({
      data: [
        { id: 'u-1', full_name: 'A', hometown_district: null, college: null, trust_level: 1, follower_count: 0, created_at: '2026-01-01T00:00:00Z', profile_photo: null },
        { id: 'u-2', full_name: 'B', hometown_district: null, college: null, trust_level: 1, follower_count: 0, created_at: '2026-01-01T00:00:00Z', profile_photo: null },
      ],
      error: null,
    });
    const followsChain = makeListChain({
      data: [{ followee_id: 'u-2' }],
      error: null,
    });
    const blocksChain = makeListChain({ data: [], error: null });

    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(usersChain)
        .mockReturnValueOnce(followsChain)
        .mockReturnValueOnce(blocksChain),
    } as unknown as SupabaseClient;

    const res = await getFollowSuggestionCandidates(supabase, 'viewer-1', 'm-dfw');
    expect(res.data?.map((c) => c.id)).toEqual(['u-1']);
  });

  it('filters out users in either direction of a block relationship', async () => {
    const usersChain = makeListChain({
      data: [
        { id: 'u-1', full_name: 'A', hometown_district: null, college: null, trust_level: 1, follower_count: 0, created_at: '2026-01-01T00:00:00Z', profile_photo: null },
        { id: 'u-2', full_name: 'B', hometown_district: null, college: null, trust_level: 1, follower_count: 0, created_at: '2026-01-01T00:00:00Z', profile_photo: null },
        { id: 'u-3', full_name: 'C', hometown_district: null, college: null, trust_level: 1, follower_count: 0, created_at: '2026-01-01T00:00:00Z', profile_photo: null },
      ],
      error: null,
    });
    const followsChain = makeListChain({ data: [], error: null });
    // viewer blocked u-1; u-3 blocked viewer. Both should be removed.
    const blocksChain = makeListChain({
      data: [
        { blocker_id: 'viewer-1', blocked_id: 'u-1' },
        { blocker_id: 'u-3', blocked_id: 'viewer-1' },
      ],
      error: null,
    });

    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(usersChain)
        .mockReturnValueOnce(followsChain)
        .mockReturnValueOnce(blocksChain),
    } as unknown as SupabaseClient;

    const res = await getFollowSuggestionCandidates(supabase, 'viewer-1', 'm-dfw');
    expect(res.data?.map((c) => c.id)).toEqual(['u-2']);
  });

  it('returns error when the users query fails', async () => {
    const usersChain = makeListChain({ data: null, error: new Error('boom') });
    const supabase = { from: vi.fn().mockReturnValueOnce(usersChain) } as unknown as SupabaseClient;

    const res = await getFollowSuggestionCandidates(supabase, 'viewer-1', 'm-dfw');
    expect(res.error).toBeInstanceOf(Error);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`cd packages/shared && npx vitest run src/api/followSuggestions.test.ts`

- [ ] **Step 3: Implement**

`packages/shared/src/api/followSuggestions.ts`:

```typescript
/**
 * Fetches a raw candidate pool for follow suggestions. Does NOT rank — see
 * packages/shared/src/logic/followSuggestions.ts for ranking.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SuggestionCandidate } from '../logic/followSuggestions';

const CANDIDATE_LIMIT = 50;

interface Result {
  data?: SuggestionCandidate[];
  error?: Error;
}

function toError(raw: unknown, fallback: string): Error {
  if (raw instanceof Error) return raw;
  if (raw && typeof raw === 'object' && 'message' in raw) {
    return new Error(String((raw as { message: unknown }).message));
  }
  return new Error(fallback);
}

interface UserRow {
  id: string;
  full_name: string;
  hometown_district: string | null;
  college: string | null;
  trust_level: number;
  follower_count: number;
  created_at: string;
  profile_photo: string | null;
}

interface FollowRow {
  followee_id: string;
}

interface BlockRow {
  blocker_id: string;
  blocked_id: string;
}

/**
 * Returns the candidate pool (same-metro, not-banned, not-self, not-followed,
 * not-blocked-either-direction). Ranking happens in logic/followSuggestions.
 */
export async function getFollowSuggestionCandidates(
  supabase: SupabaseClient,
  viewerId: string,
  metroAreaId: string
): Promise<Result> {
  try {
    const { data: usersData, error: usersErr } = await supabase
      .from('users')
      .select(
        'id, full_name, hometown_district, college, trust_level, follower_count, created_at, profile_photo'
      )
      .eq('metro_area_id', metroAreaId)
      .eq('is_banned', false)
      .neq('id', viewerId)
      .order('follower_count', { ascending: false })
      .limit(CANDIDATE_LIMIT);

    if (usersErr) throw usersErr;
    const users = (usersData ?? []) as UserRow[];
    if (users.length === 0) return { data: [] };

    const { data: followsData, error: followsErr } = await supabase
      .from('user_follows')
      .select('followee_id')
      .eq('follower_id', viewerId);

    if (followsErr) throw followsErr;
    const followedIds = new Set(
      ((followsData ?? []) as FollowRow[]).map((r) => r.followee_id)
    );

    const { data: blocksData, error: blocksErr } = await supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id');

    if (blocksErr) throw blocksErr;
    const blockedIds = new Set<string>();
    for (const b of (blocksData ?? []) as BlockRow[]) {
      if (b.blocker_id === viewerId) blockedIds.add(b.blocked_id);
      else if (b.blocked_id === viewerId) blockedIds.add(b.blocker_id);
    }

    const filtered: SuggestionCandidate[] = users
      .filter((u) => !followedIds.has(u.id) && !blockedIds.has(u.id))
      .map((u) => ({
        id: u.id,
        fullName: u.full_name,
        hometownDistrict: u.hometown_district,
        college: u.college,
        trustLevel: u.trust_level,
        followerCount: u.follower_count ?? 0,
        createdAt: u.created_at,
        profilePhoto: u.profile_photo,
      }));

    return { data: filtered };
  } catch (error) {
    return { error: toError(error, 'Failed to load follow suggestion candidates') };
  }
}
```

- [ ] **Step 4: Export from the api barrel**

`packages/shared/src/api/index.ts`: append:

```typescript
export * from './followSuggestions';
```

- [ ] **Step 5: Run — expect PASS**

`cd packages/shared && npx vitest run src/api/followSuggestions.test.ts`
Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/api/followSuggestions.ts packages/shared/src/api/followSuggestions.test.ts packages/shared/src/api/index.ts
git commit -m "feat(shared): follow suggestion candidate fetch"
```

---

## Phase F — Update assemblePulseCards

### Task F1: Build two new card kinds

**Files:**
- Modify: `packages/shared/src/logic/pulse.ts`
- Modify: `packages/shared/src/logic/pulse.test.ts`

Extend the existing `assemblePulseCards` input type + add builders for the new kinds. `find_your_people` appears when the viewer follows fewer than 5 users AND suggestions are non-empty. `top_helper` appears when the metro has a qualifying helper. Display order (after the existing four):

- cultural_calendar (0)
- metro_highlights (1)
- events_this_week (2)
- fx_rate (3)
- **find_your_people (4)**  ← new
- **top_helper (5)**        ← new
- create_first_post (6)

- [ ] **Step 1: Add failing tests to `pulse.test.ts`**

APPEND to the existing describe block — do not replace existing tests. Adapt imports if needed.

```typescript
import type { RankedSuggestion } from './followSuggestions';
import type { TopHelper } from '../api/helperScore';
// (add these imports at the top of the file alongside the existing imports)

describe('assemblePulseCards — PR 3 cards', () => {
  const baseInput = {
    now: new Date('2026-04-20T00:00:00Z'),
    cultural: [],
    metroHighlightsCount: 0,
    metroLabel: 'DFW',
    eventsCount: 0,
    nextEventTitle: null,
    nextEventStartsAt: null,
    fx: null,
    dismissedIds: new Set<string>(),
  };

  const suggestions: RankedSuggestion[] = [
    { userId: 'u-1', displayName: 'Anish S.', photo: null, reason: 'Both from Pokhara', score: 10 },
    { userId: 'u-2', displayName: 'Bina K.', photo: null, reason: 'Both studied at Pulchowk', score: 8 },
  ];

  const topHelper = {
    userId: 'h-1',
    displayName: 'Deepak G.',
    photo: null,
    helperScore: 84,
  };

  it('builds a find_your_people card when viewer follows <5 and suggestions are non-empty', () => {
    const cards = assemblePulseCards({
      ...baseInput,
      viewerFollowingCount: 2,
      suggestions,
      topHelper: null,
    } as any);

    const card = cards.find((c) => c.kind === 'find_your_people');
    expect(card?.kind).toBe('find_your_people');
    if (card?.kind === 'find_your_people') {
      expect(card.suggestionCount).toBe(2);
      expect(card.featured.userId).toBe('u-1');
      expect(card.featured.reason).toContain('Pokhara');
      expect(card.deepLink).toBe('/users/u-1');
    }
  });

  it('omits find_your_people when viewer follows >= 5', () => {
    const cards = assemblePulseCards({
      ...baseInput,
      viewerFollowingCount: 5,
      suggestions,
      topHelper: null,
    } as any);
    expect(cards.find((c) => c.kind === 'find_your_people')).toBeUndefined();
  });

  it('omits find_your_people when suggestions list is empty', () => {
    const cards = assemblePulseCards({
      ...baseInput,
      viewerFollowingCount: 0,
      suggestions: [],
      topHelper: null,
    } as any);
    expect(cards.find((c) => c.kind === 'find_your_people')).toBeUndefined();
  });

  it('builds a top_helper card when one exists', () => {
    const cards = assemblePulseCards({
      ...baseInput,
      viewerFollowingCount: 0,
      suggestions: [],
      topHelper,
    } as any);
    const card = cards.find((c) => c.kind === 'top_helper');
    expect(card?.kind).toBe('top_helper');
    if (card?.kind === 'top_helper') {
      expect(card.helper.userId).toBe('h-1');
      expect(card.helper.helperScore).toBe(84);
      expect(card.metroLabel).toBe('DFW');
      expect(card.deepLink).toBe('/users/h-1');
    }
  });

  it('respects display order after the existing four cards', () => {
    const cards = assemblePulseCards({
      ...baseInput,
      fx: { pair: 'USD_NPR', rate: 133, fetchedAt: '2026-04-20T00:00:00Z' },
      metroHighlightsCount: 2,
      viewerFollowingCount: 0,
      suggestions,
      topHelper,
    } as any);

    const order = cards.map((c) => c.kind);
    const idxHighlights = order.indexOf('metro_highlights');
    const idxFx = order.indexOf('fx_rate');
    const idxFind = order.indexOf('find_your_people');
    const idxTop = order.indexOf('top_helper');

    expect(idxHighlights).toBeLessThan(idxFx);
    expect(idxFx).toBeLessThan(idxFind);
    expect(idxFind).toBeLessThan(idxTop);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`cd packages/shared && npx vitest run src/logic/pulse.test.ts`
Expected: compile error (extra fields on `AssemblePulseCardsInput`) or assertion failures.

- [ ] **Step 3: Extend `pulse.ts`**

In `packages/shared/src/logic/pulse.ts`:

1. Update imports at the top:

```typescript
import type {
  PulseCard,
  CulturalCalendarCard,
  MetroHighlightsCard,
  EventsThisWeekCard,
  FxRateCard,
  CreateFirstPostCard,
  FindYourPeopleCard,
  TopHelperCard,
} from '../types/pulse';
import type { CulturalEventRow } from '../api/culturalEvents';
import type { ExchangeRate } from '../api/fxRates';
import type { RankedSuggestion } from './followSuggestions';
import type { TopHelper } from '../api/helperScore';
```

2. Update `CARD_ORDER`:

```typescript
const CARD_ORDER: Record<PulseCard['kind'], number> = {
  cultural_calendar: 0,
  metro_highlights: 1,
  events_this_week: 2,
  fx_rate: 3,
  find_your_people: 4,
  top_helper: 5,
  create_first_post: 6,
};
```

3. Extend `AssemblePulseCardsInput`:

```typescript
export interface AssemblePulseCardsInput {
  now: Date;
  cultural: CulturalEventRow[];
  metroHighlightsCount: number;
  metroLabel: string;
  eventsCount: number;
  nextEventTitle: string | null;
  nextEventStartsAt: string | null;
  fx: ExchangeRate | null;
  dismissedIds: Set<string>;
  // PR 3 additions
  viewerFollowingCount: number;
  suggestions: RankedSuggestion[];
  topHelper: {
    userId: string;
    displayName: string;
    photo: string | null;
    helperScore: number;
  } | null;
}
```

4. Add constants + builders (before the `assemblePulseCards` function body):

```typescript
const FIND_YOUR_PEOPLE_FOLLOW_THRESHOLD = 5;

function buildFindYourPeopleCard(
  suggestions: RankedSuggestion[],
  viewerFollowingCount: number
): FindYourPeopleCard | null {
  if (viewerFollowingCount >= FIND_YOUR_PEOPLE_FOLLOW_THRESHOLD) return null;
  if (suggestions.length === 0) return null;
  const top = suggestions[0];
  return {
    kind: 'find_your_people',
    id: 'find_your_people',
    suggestionCount: suggestions.length,
    featured: {
      userId: top.userId,
      displayName: top.displayName,
      photo: top.photo,
      reason: top.reason,
    },
    deepLink: `/users/${top.userId}`,
  };
}

function buildTopHelperCard(
  topHelper: AssemblePulseCardsInput['topHelper'],
  metroLabel: string
): TopHelperCard | null {
  if (!topHelper) return null;
  return {
    kind: 'top_helper',
    id: 'top_helper',
    helper: {
      userId: topHelper.userId,
      displayName: topHelper.displayName,
      photo: topHelper.photo,
      helperScore: topHelper.helperScore,
    },
    metroLabel,
    deepLink: `/users/${topHelper.userId}`,
  };
}
```

5. Inside `assemblePulseCards`, after the existing `buildFxCard` push and BEFORE the `dismissedIds` filter, add:

```typescript
  const findYourPeople = buildFindYourPeopleCard(
    input.suggestions,
    input.viewerFollowingCount
  );
  if (findYourPeople) cards.push(findYourPeople);

  const topHelperCard = buildTopHelperCard(input.topHelper, input.metroLabel);
  if (topHelperCard) cards.push(topHelperCard);
```

- [ ] **Step 4: Run — expect PASS**

`cd packages/shared && npx vitest run src/logic/pulse.test.ts`
Expected: all tests pass (existing + 5 new).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/logic/pulse.ts packages/shared/src/logic/pulse.test.ts
git commit -m "feat(shared): assemble find_your_people and top_helper cards"
```

---

## Phase G — Update getPulseCards Composer

### Task G1: Plumb new sub-queries through

**Files:**
- Modify: `packages/shared/src/api/pulse.ts`
- Modify: `packages/shared/src/api/pulse.test.ts`

Composer gains three new parallel calls: one for helper score of the viewer (to pass through `viewerFollowingCount` from a different source — see below), one for top helper in metro, one for follow suggestion candidates + ranking.

Note: `viewerFollowingCount` is already on the `users` row (see PR 1's migration 028 denormalized counter). We'll read it from a simple `users` select.

- [ ] **Step 1: Add failing tests**

APPEND to `packages/shared/src/api/pulse.test.ts`:

```typescript
import { rankFollowSuggestions } from '../logic/followSuggestions';

// Extend existing mocks to cover new sub-queries
vi.mock('./helperScore', () => ({
  getHelperScore: vi.fn(),
  getTopHelperInMetro: vi.fn(),
  HELPER_SCORE_VISIBILITY_THRESHOLD: 10,
}));
vi.mock('./followSuggestions', () => ({
  getFollowSuggestionCandidates: vi.fn(),
}));

import { getHelperScore, getTopHelperInMetro } from './helperScore';
import { getFollowSuggestionCandidates } from './followSuggestions';

describe('getPulseCards composer — PR 3 cards', () => {
  it('includes a find_your_people card when suggestions exist and viewer follows <5', async () => {
    (getUpcomingCulturalEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getRecentPostsCountByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 0 });
    (getUpcomingEventsByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getExchangeRate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });
    (getFollowSuggestionCandidates as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'u-1', fullName: 'Anish Shrestha', hometownDistrict: 'Pokhara', college: null,
          trustLevel: 1, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
        },
      ],
    });
    (getTopHelperInMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });

    // A fakeSupabase.from for the viewer lookup. We stub the viewer row separately
    // by intercepting from('users') below.
    const viewerRow = {
      id: 'viewer-1',
      metro_area_id: 'metro-dfw',
      hometown_district: 'Pokhara',
      college: null,
      following_count: 2,
    };
    const viewerSelectChain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of ['select', 'eq', 'maybeSingle']) {
      viewerSelectChain[m] = vi.fn().mockReturnValue(viewerSelectChain);
    }
    viewerSelectChain.maybeSingle.mockResolvedValue({ data: viewerRow, error: null });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'users') return viewerSelectChain;
        return { select: vi.fn() };
      }),
    } as unknown as SupabaseClient;

    const res = await getPulseCards(supabase, {
      metroAreaId: 'metro-dfw',
      metroLabel: 'DFW',
      viewerId: 'viewer-1',
      now: new Date('2026-04-20T00:00:00Z'),
    });

    expect(res.error).toBeUndefined();
    const card = res.data?.cards.find((c) => c.kind === 'find_your_people');
    expect(card?.kind).toBe('find_your_people');
    if (card?.kind === 'find_your_people') {
      expect(card.featured.userId).toBe('u-1');
      expect(card.featured.reason).toContain('Pokhara');
    }
  });

  it('includes a top_helper card when one exists', async () => {
    (getUpcomingCulturalEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getRecentPostsCountByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 0 });
    (getUpcomingEventsByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getExchangeRate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });
    (getFollowSuggestionCandidates as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getTopHelperInMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { userId: 'h-1', helperScore: 72, metroAreaId: 'metro-dfw' },
    });

    // Also mock a user row for the top helper's display name/photo (the composer
    // fetches this in a follow-up query).
    const viewerRow = {
      id: 'viewer-1', metro_area_id: 'metro-dfw', hometown_district: null,
      college: null, following_count: 0,
    };
    const topHelperUserRow = { id: 'h-1', full_name: 'Deepak Gautam', profile_photo: null };

    const makeSingleChain = (row: unknown) => {
      const c: Record<string, ReturnType<typeof vi.fn>> = {};
      for (const m of ['select', 'eq', 'maybeSingle']) {
        c[m] = vi.fn().mockReturnValue(c);
      }
      c.maybeSingle.mockResolvedValue({ data: row, error: null });
      return c;
    };

    const supabase = {
      from: vi.fn((_table: string) => {
        // We don't differentiate tables; first from('users') is viewer, second is top helper.
        return {};
      }),
    } as unknown as SupabaseClient;
    let fromCalls = 0;
    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      fromCalls += 1;
      if (fromCalls === 1) return makeSingleChain(viewerRow);
      if (fromCalls === 2) return makeSingleChain(topHelperUserRow);
      return makeSingleChain(null);
    });

    const res = await getPulseCards(supabase, {
      metroAreaId: 'metro-dfw',
      metroLabel: 'DFW',
      viewerId: 'viewer-1',
      now: new Date('2026-04-20T00:00:00Z'),
    });

    const card = res.data?.cards.find((c) => c.kind === 'top_helper');
    expect(card?.kind).toBe('top_helper');
    if (card?.kind === 'top_helper') {
      expect(card.helper.userId).toBe('h-1');
      expect(card.helper.displayName).toBe('Deepak G.');
      expect(card.helper.helperScore).toBe(72);
    }
  });

  it('tolerates viewer row missing (no hometown/college): falls back to baseline ranking', async () => {
    (getUpcomingCulturalEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getRecentPostsCountByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 0 });
    (getUpcomingEventsByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (getExchangeRate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });
    (getFollowSuggestionCandidates as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{
        id: 'u-1', fullName: 'Anish Shrestha', hometownDistrict: null, college: null,
        trustLevel: 1, followerCount: 0, createdAt: '2026-01-01T00:00:00Z', profilePhoto: null,
      }],
    });
    (getTopHelperInMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });

    const emptyChain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of ['select', 'eq', 'maybeSingle']) emptyChain[m] = vi.fn().mockReturnValue(emptyChain);
    emptyChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const supabase = { from: vi.fn().mockReturnValue(emptyChain) } as unknown as SupabaseClient;

    const res = await getPulseCards(supabase, {
      metroAreaId: 'metro-dfw',
      metroLabel: 'DFW',
      viewerId: 'viewer-1',
      now: new Date('2026-04-20T00:00:00Z'),
    });

    expect(res.error).toBeUndefined();
    const card = res.data?.cards.find((c) => c.kind === 'find_your_people');
    expect(card?.kind).toBe('find_your_people');
    if (card?.kind === 'find_your_people') {
      expect(card.featured.reason).toBe('Active in your metro');
    }
  });
});
```

(Ignore the existing tests at the top of the file — they should still pass unchanged.)

- [ ] **Step 2: Run — expect FAIL**

`cd packages/shared && npx vitest run src/api/pulse.test.ts`

- [ ] **Step 3: Extend the composer**

In `packages/shared/src/api/pulse.ts`:

1. Imports at the top:

```typescript
import { getTopHelperInMetro } from './helperScore';
import { getFollowSuggestionCandidates } from './followSuggestions';
import {
  rankFollowSuggestions,
  type SuggestionViewer,
  type RankedSuggestion,
} from '../logic/followSuggestions';
```

2. Extend `Params`:

```typescript
interface Params {
  metroAreaId: string;
  metroLabel: string;
  viewerId: string; // REQUIRED for PR 3 — composer now reads viewer profile
  dismissedIds?: Set<string>;
  now?: Date;
  fetcher?: Parameters<typeof getExchangeRate>[1];
}
```

3. Inside the composer body, **before** the `Promise.allSettled` block, read the viewer row (single row, fast):

```typescript
  const viewerRowPromise = supabase
    .from('users')
    .select('id, metro_area_id, hometown_district, college, following_count')
    .eq('id', params.viewerId)
    .maybeSingle();
```

4. Add two new sub-queries to the existing `Promise.allSettled` call:

```typescript
  const [culturalRes, highlightsRes, eventsRes, fxRes, viewerRowRes, suggestionsRes, topHelperRes] =
    await Promise.allSettled([
      getUpcomingCulturalEvents(supabase, 30, now),
      getRecentPostsCountByMetro(supabase, params.metroAreaId, hoursAgo(now, HIGHLIGHTS_WINDOW_HOURS)),
      getUpcomingEventsByMetro(supabase, params.metroAreaId, EVENTS_FETCH_LIMIT),
      getExchangeRate(supabase, params.fetcher, now),
      viewerRowPromise,
      getFollowSuggestionCandidates(supabase, params.viewerId, params.metroAreaId),
      getTopHelperInMetro(supabase, params.metroAreaId, params.viewerId),
    ]);
```

5. After the existing `unwrap` calls, add:

```typescript
  // Viewer row uses Supabase's raw { data, error } shape (not the app's convention)
  const viewerRow =
    viewerRowRes.status === 'fulfilled' && !viewerRowRes.value.error
      ? (viewerRowRes.value.data as { id: string; metro_area_id: string | null; hometown_district: string | null; college: string | null; following_count: number | null } | null)
      : null;

  const viewerFollowingCount = viewerRow?.following_count ?? 0;

  // Rank candidates if we have them, else []
  const rawCandidates = unwrap(suggestionsRes) ?? [];
  const suggestionViewer: SuggestionViewer = {
    id: params.viewerId,
    metroAreaId: params.metroAreaId,
    hometownDistrict: viewerRow?.hometown_district ?? null,
    college: viewerRow?.college ?? null,
  };
  const suggestions: RankedSuggestion[] = rankFollowSuggestions(
    suggestionViewer,
    rawCandidates
  );

  // Top helper needs display name + photo from users table
  const topHelperBase = unwrap(topHelperRes);
  let topHelperForCard: {
    userId: string;
    displayName: string;
    photo: string | null;
    helperScore: number;
  } | null = null;
  if (topHelperBase) {
    const { data: hRow } = await supabase
      .from('users')
      .select('id, full_name, profile_photo')
      .eq('id', topHelperBase.userId)
      .maybeSingle();
    if (hRow) {
      const row = hRow as { id: string; full_name: string; profile_photo: string | null };
      topHelperForCard = {
        userId: row.id,
        displayName: formatPublicName(row.full_name),
        photo: row.profile_photo,
        helperScore: topHelperBase.helperScore,
      };
    }
  }
```

6. Replace the existing `assemblePulseCards` call with:

```typescript
    const cards = assemblePulseCards({
      now,
      cultural,
      metroHighlightsCount: highlightsCount,
      metroLabel: params.metroLabel,
      eventsCount: windowedEvents.length,
      nextEventTitle: nextEvent ? nextEvent.title : null,
      nextEventStartsAt: nextEvent ? nextEvent.start_date : null,
      fx,
      dismissedIds,
      viewerFollowingCount,
      suggestions,
      topHelper: topHelperForCard,
    });
```

7. Add the missing import at top of the file:

```typescript
import { formatPublicName } from '../utils/user';
```

- [ ] **Step 4: Run — expect PASS**

`cd packages/shared && npx vitest run src/api/pulse.test.ts`
Expected: all tests pass (existing + 3 new).

- [ ] **Step 5: Update mobile + web callers (non-test code only) to pass `viewerId`**

Find every caller of `getPulseCards`. Previously it was called without `viewerId`; now it's required. Grep:

```
grep -rn "getPulseCards" apps/ packages/shared/src
```

Expected callers:
- `apps/mobile/src/components/pulse/MetroPulseStrip.tsx`
- `apps/web/src/components/pulse/MetroPulseStrip.tsx`

For each, add `viewerId` to the `Props` + pass it to `getPulseCards`. The parent `HomeScreen` / `feed.page.tsx` already has access to `user?.id` from `useAuth()`:

**Mobile (`apps/mobile/src/components/pulse/MetroPulseStrip.tsx`):**

Change `Props`:

```typescript
interface Props {
  metroAreaId: string;
  metroLabel: string;
  viewerId: string;
}
```

Pass through to `getPulseCards`:

```typescript
const res = await getPulseCards(supabase, {
  metroAreaId,
  metroLabel,
  viewerId,
  dismissedIds,
});
```

Add `viewerId` to the effect dependency array.

**Web mirror:** identical edits to `apps/web/src/components/pulse/MetroPulseStrip.tsx`.

**Parent components** (`HomeScreen.tsx` mobile, `feed.page.tsx` web): update the `<MetroPulseStrip>` usage to pass `viewerId={user?.id ?? ''}` with the strip conditionally rendered only when `user?.id` exists. If the strip is already gated on `metroAreaId`, extend the gate to include the user id.

- [ ] **Step 6: Typecheck both apps**

```
cd apps/mobile && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
```

- [ ] **Step 7: Run full shared + mobile + web suites to confirm no regression**

```
cd packages/shared && npx vitest run
cd apps/mobile && npx jest --silent
cd apps/web && npx vitest run
```

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/api/pulse.ts packages/shared/src/api/pulse.test.ts apps/mobile/src/components/pulse/MetroPulseStrip.tsx apps/mobile/src/screens/HomeScreen.tsx apps/web/src/components/pulse/MetroPulseStrip.tsx apps/web/src/pages/feed.page.tsx
git commit -m "feat(shared): compose find_your_people + top_helper cards; thread viewerId"
```

---

## Phase H — Mobile UI

### Task H1: Extend `PulseCard` mobile component

**Files:**
- Modify: `apps/mobile/src/components/pulse/PulseCard.tsx`
- Modify: `apps/mobile/src/components/pulse/PulseCard.test.tsx`

- [ ] **Step 1: Add failing tests**

APPEND to `PulseCard.test.tsx`:

```tsx
describe('PulseCard (mobile) — PR 3 cards', () => {
  it('renders a find_your_people card with featured name + reason', () => {
    const card = {
      kind: 'find_your_people',
      id: 'find_your_people',
      suggestionCount: 3,
      featured: {
        userId: 'u-1',
        displayName: 'Anish S.',
        photo: null,
        reason: 'Both from Pokhara',
      },
      deepLink: '/users/u-1',
    } as const;
    render(<PulseCard card={card} onPress={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.getByText(/Anish S\./)).toBeTruthy();
    expect(screen.getByText(/Both from Pokhara/)).toBeTruthy();
  });

  it('renders a top_helper card with score', () => {
    const card = {
      kind: 'top_helper',
      id: 'top_helper',
      helper: {
        userId: 'h-1',
        displayName: 'Deepak G.',
        photo: null,
        helperScore: 84,
      },
      metroLabel: 'DFW',
      deepLink: '/users/h-1',
    } as const;
    render(<PulseCard card={card} onPress={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.getByText(/Deepak G\./)).toBeTruthy();
    expect(screen.getByText(/Top helper in DFW/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`cd apps/mobile && npx jest PulseCard`

- [ ] **Step 3: Extend `renderBody` in `PulseCard.tsx`**

Locate the existing `renderBody(card)` function. Add cases at the end of the switch:

```typescript
    case 'find_your_people':
      return {
        headline: card.featured.displayName,
        detail: card.featured.reason,
      };
    case 'top_helper':
      return {
        headline: card.helper.displayName,
        detail: `Top helper in ${card.metroLabel}`,
      };
```

The switch statement must remain exhaustive over the PulseCard union — if TypeScript complains about `create_first_post` or any existing case, do not touch them; only add the two new ones.

- [ ] **Step 4: Run — expect PASS**

`cd apps/mobile && npx jest PulseCard`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/pulse/PulseCard.tsx apps/mobile/src/components/pulse/PulseCard.test.tsx
git commit -m "feat(mobile): render find_your_people + top_helper Pulse cards"
```

---

### Task H2: Helper badge on PublicProfileScreen

**Files:**
- Modify: `apps/mobile/src/screens/profile/PublicProfileScreen.tsx`
- Modify: `apps/mobile/src/screens/profile/PublicProfileScreen.test.tsx`

Show "🙏 Helped **N** people this year" iff `helperScore >= 10`. Fetched on mount alongside other profile data.

- [ ] **Step 1: Read the existing file to find the mount-time data fetch pattern**

Read `PublicProfileScreen.tsx` — locate how `getUserById`, `getPostsByAuthorId` etc. are called (likely inside a `useEffect` with a cancel guard). You'll add a parallel call to `getHelperScore` using the same pattern.

- [ ] **Step 2: Add failing tests**

APPEND to `PublicProfileScreen.test.tsx` (inspect existing test file for how mocks are structured — extend the existing `jest.mock('@nepally/shared', ...)` factory to include `getHelperScore`):

```tsx
it('renders the helper badge when score >= threshold', async () => {
  // Extend the shared mock in place — not a new jest.mock call.
  // The factory defined at top of file must now return getHelperScore:
  //   getHelperScore: (...args) => mockGetHelperScore(...args),
  // and mockGetHelperScore must be defined next to mockGetUserById.
  mockGetHelperScore.mockResolvedValue({
    data: {
      userId: 'profile-user',
      helperScore: 42,
      helpfulComments: 15,
      likesReceivedOnOwnPosts: 12,
    },
  });
  render(<PublicProfileScreen />);
  await waitFor(() => {
    expect(screen.getByText(/Helped 42 people this year/)).toBeTruthy();
  });
});

it('hides the helper badge when score < threshold', async () => {
  mockGetHelperScore.mockResolvedValue({
    data: {
      userId: 'profile-user',
      helperScore: 4,
      helpfulComments: 2,
      likesReceivedOnOwnPosts: 0,
    },
  });
  render(<PublicProfileScreen />);
  await waitFor(() => {
    expect(screen.getByText(/Bikal S\./)).toBeTruthy(); // sanity: page loaded
  });
  expect(screen.queryByText(/Helped \d+ people this year/)).toBeNull();
});
```

Also: at the top of the test file, add the `mockGetHelperScore` definition near the other mocks:

```typescript
const mockGetHelperScore = jest.fn();
```

And extend the `@nepally/shared` mock factory to include:

```typescript
  getHelperScore: (...args: Parameters<typeof mockGetHelperScore>) => mockGetHelperScore(...args),
  HELPER_SCORE_VISIBILITY_THRESHOLD: 10,
```

Add a default return in `beforeEach`:

```typescript
mockGetHelperScore.mockResolvedValue({
  data: { userId: 'profile-user', helperScore: 0, helpfulComments: 0, likesReceivedOnOwnPosts: 0 },
});
```

- [ ] **Step 3: Run — expect FAIL**

`cd apps/mobile && npx jest PublicProfileScreen`

- [ ] **Step 4: Wire the badge into `PublicProfileScreen.tsx`**

1. Add the import:

```typescript
import {
  // ...existing imports,
  getHelperScore,
  HELPER_SCORE_VISIBILITY_THRESHOLD,
} from '@nepally/shared';
```

2. Add state near the existing state:

```typescript
const [helperScore, setHelperScore] = useState<number | null>(null);
```

3. In the existing mount-time `useEffect` that fetches profile data, add alongside other calls:

```typescript
const scoreRes = await getHelperScore(supabase, userId);
if (!cancelled) {
  setHelperScore(scoreRes.data?.helperScore ?? 0);
}
```

(Use `supabase` / `userId` / `cancelled` matching the variable names already in the file — do not rename them.)

4. In the JSX, below the existing identity chips row, render:

```tsx
{typeof helperScore === 'number' && helperScore >= HELPER_SCORE_VISIBILITY_THRESHOLD && (
  <Text style={styles.helperBadge}>🙏 Helped {helperScore} people this year</Text>
)}
```

5. Add to the bottom `StyleSheet.create` block:

```typescript
helperBadge: {
  marginTop: 10,
  fontSize: 14,
  color: '#333',
  fontWeight: '500',
},
```

- [ ] **Step 5: Run — expect PASS**

`cd apps/mobile && npx jest PublicProfileScreen`

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/profile/PublicProfileScreen.tsx apps/mobile/src/screens/profile/PublicProfileScreen.test.tsx
git commit -m "feat(mobile): helper score badge on public profile"
```

---

## Phase I — Web UI

### Task I1: Extend `PulseCard` web component

**Files:**
- Modify: `apps/web/src/components/pulse/PulseCard.tsx`
- Modify: `apps/web/src/components/pulse/PulseCard.test.tsx`

- [ ] **Step 1: Add failing tests**

APPEND to the web test file:

```tsx
describe('PulseCard (web) — PR 3 cards', () => {
  it('renders a find_your_people card with featured name + reason', () => {
    const card = {
      kind: 'find_your_people',
      id: 'find_your_people',
      suggestionCount: 3,
      featured: {
        userId: 'u-1', displayName: 'Anish S.', photo: null, reason: 'Both from Pokhara',
      },
      deepLink: '/users/u-1',
    } as const;
    render(<PulseCard card={card} onPress={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText(/Anish S\./)).toBeDefined();
    expect(screen.getByText(/Both from Pokhara/)).toBeDefined();
  });

  it('renders a top_helper card with score metadata', () => {
    const card = {
      kind: 'top_helper',
      id: 'top_helper',
      helper: { userId: 'h-1', displayName: 'Deepak G.', photo: null, helperScore: 84 },
      metroLabel: 'DFW',
      deepLink: '/users/h-1',
    } as const;
    render(<PulseCard card={card} onPress={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText(/Deepak G\./)).toBeDefined();
    expect(screen.getByText(/Top helper in DFW/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`cd apps/web && npx vitest run src/components/pulse/PulseCard.test.tsx`

- [ ] **Step 3: Extend `renderBody` in `apps/web/src/components/pulse/PulseCard.tsx`**

Add the two cases to the switch (identical strings to mobile):

```typescript
    case 'find_your_people':
      return {
        headline: card.featured.displayName,
        detail: card.featured.reason,
      };
    case 'top_helper':
      return {
        headline: card.helper.displayName,
        detail: `Top helper in ${card.metroLabel}`,
      };
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/pulse/PulseCard.tsx apps/web/src/components/pulse/PulseCard.test.tsx
git commit -m "feat(web): render find_your_people + top_helper Pulse cards"
```

---

### Task I2: Helper badge on `/users/[id]`

**Files:**
- Modify: `apps/web/src/pages/users/[id].page.tsx`
- Modify: `apps/web/src/pages/users/[id].test.tsx`

Mirror of mobile — fetches `getHelperScore` on mount and renders the badge iff score >= 10.

- [ ] **Step 1: Add failing tests**

APPEND to `[id].test.tsx`:

```tsx
it('renders the helper badge when score >= threshold', async () => {
  mockGetHelperScore.mockResolvedValue({
    data: {
      userId: 'target-1', helperScore: 42, helpfulComments: 15, likesReceivedOnOwnPosts: 12,
    },
  });
  renderUserPage({
    user: { ...BASE_USER, id: 'target-1' },
    viewerId: 'viewer-1',
  });
  await act(async () => {});
  expect(screen.getByText(/Helped 42 people this year/)).toBeDefined();
});

it('hides the helper badge when score < threshold', async () => {
  mockGetHelperScore.mockResolvedValue({
    data: {
      userId: 'target-2', helperScore: 4, helpfulComments: 2, likesReceivedOnOwnPosts: 0,
    },
  });
  renderUserPage({
    user: { ...BASE_USER, id: 'target-2' },
    viewerId: 'viewer-1',
  });
  await act(async () => {});
  expect(screen.queryByText(/Helped \d+ people this year/)).toBeNull();
});
```

Extend the `@nepally/shared` vi.mock factory at the top of the test file to include `getHelperScore` and `HELPER_SCORE_VISIBILITY_THRESHOLD`:

```typescript
const mockGetHelperScore = vi.fn();
// in the vi.mock('@nepally/shared', ...) factory, add:
//   getHelperScore: (...args: unknown[]) => mockGetHelperScore(...args),
//   HELPER_SCORE_VISIBILITY_THRESHOLD: 10,
```

Default return in `beforeEach`:

```typescript
mockGetHelperScore.mockResolvedValue({
  data: { userId: 'target', helperScore: 0, helpfulComments: 0, likesReceivedOnOwnPosts: 0 },
});
```

- [ ] **Step 2: Run — expect FAIL**

`cd apps/web && npx vitest run src/pages/users`

- [ ] **Step 3: Wire into `[id].page.tsx`**

Imports:

```tsx
import { getHelperScore, HELPER_SCORE_VISIBILITY_THRESHOLD } from '@nepally/shared';
```

State + fetch inside the existing mount-effect:

```tsx
const [helperScore, setHelperScore] = useState<number | null>(null);

// inside the existing effect body, alongside other fetches:
const scoreRes = await getHelperScore(supabase, user.id);
if (!cancelled) setHelperScore(scoreRes.data?.helperScore ?? 0);
```

(Adapt `supabase` / `user.id` / `cancelled` to actual variable names.)

JSX (just after the identity chips row):

```tsx
{typeof helperScore === 'number' && helperScore >= HELPER_SCORE_VISIBILITY_THRESHOLD && (
  <p className={styles.helperBadge}>🙏 Helped {helperScore} people this year</p>
)}
```

CSS in the matching `.module.css`:

```css
.helperBadge {
  margin-top: 10px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/users/[id].page.tsx apps/web/src/pages/users/[id].test.tsx apps/web/src/pages/users/*.module.css
git commit -m "feat(web): helper score badge on public profile"
```

---

## Phase J — Verification & PR Prep

### Task J1: Full monorepo verification

- [ ] **Step 1: Shared tests + typecheck**

```
cd packages/shared && npx vitest run
cd packages/shared && npx tsc --noEmit -p tsconfig.json
cd packages/shared && npm run build
```

- [ ] **Step 2: Mobile typecheck + tests**

```
cd c:/Users/shash/Documents/personal-github-repos/nepally && npx tsc --noEmit -p apps/mobile/tsconfig.json
cd apps/mobile && npx jest --silent
```

- [ ] **Step 3: Web typecheck + tests**

```
cd c:/Users/shash/Documents/personal-github-repos/nepally && npx tsc --noEmit -p apps/web/tsconfig.json
cd apps/web && npx vitest run
```

All green before continuing.

---

### Task J2: Docs + index

- [ ] **Step 1: Mark the plan as implemented in `docs/INDEX.md`**

Find the line added when this plan was authored and update status:

```markdown
- [plans/active/2026-04-20-pr3-helper-score-social-cards.md](plans/active/2026-04-20-pr3-helper-score-social-cards.md) — PR 3 of "Your Community Today": helper score + find_your_people + top_helper cards [status: implemented]
```

(If the entry does not yet exist, add it.)

- [ ] **Step 2: Commit**

```bash
git add docs/INDEX.md
git commit -m "docs: mark PR 3 plan implemented"
```

---

### Task J3: Manual PR preparation (user-gated)

- [ ] **Step 1: Summarize changes for user**

```
git log master..HEAD --oneline
git diff --stat master...HEAD
```

- [ ] **Step 2: Await user approval before `git push`**

Per CLAUDE.md, never push without explicit user OK. Offer this PR body to the user:

```
## Summary
- Adds migration 031 — user_helper_scores VIEW (formula: 2 × comments-on-others + 1 × likes-received, last 365 days)
- Shared API: getHelperScore, getTopHelperInMetro, getFollowSuggestionCandidates
- Shared logic: rankFollowSuggestions pure function (rule-based, deterministic)
- Extends PulseCard union with find_your_people + top_helper variants; composer now reads the viewer row and ranks candidates
- UI: both new card kinds render on mobile + web; helper badge added to public profile (hidden when score < 10)

## Test plan
- [ ] Migration 031 applied + user_helper_scores returns rows
- [ ] Shared tests pass (includes new helperScore + followSuggestions coverage)
- [ ] Mobile tests pass
- [ ] Web tests pass
- [ ] Manual: log in as a user who follows <5 people in a metro with ≥1 other Nepali user, verify find_your_people card renders with a correct reason
- [ ] Manual: make a post + have it comment+liked until helper_score >= 10; verify badge renders on /users/[id]
- [ ] Manual: block a candidate and verify they disappear from suggestions on the next Pulse refresh
```

On approval: `git push -u origin feat/community-today-pr3 && gh pr create ...`

---

## Self-Review Summary

Spec coverage check:

- **Spec §3.2 card 5 (Find Your People)** — Task B1 type, F1 builder, G1 composer, H1/I1 render. ✅
- **Spec §3.2 card 6 (Top Helper)** — Same phases. ✅
- **Spec §4.3 Helper Score** — Task A1 view, C1 API, H2/I2 badge. Simplified formula (chat-thread signal dropped) is documented in the plan's Key Decisions. ✅
- **Spec §5.2 Follow suggestion ranking** — Task D1 pure function + E1 candidate fetch. ✅
- **Spec privacy rules** — `formatPublicName` applied to all display names; deep-links use user id (no email/phone/district exposed). ✅
- **Spec error handling** — new sub-queries threaded through the existing `Promise.allSettled` path; each card can fail without dropping the strip. ✅

Placeholder scan: none. Every code block is complete; every commented-out "adapt to your file" note is bounded to a single identifier rename, not a content gap.

Type consistency: `PulseCard` union, `HelperScore`, `TopHelper`, `SuggestionViewer`, `RankedSuggestion`, `HELPER_SCORE_VISIBILITY_THRESHOLD` — all defined in the earliest phase that uses them, and referenced by the same names in every later phase.
