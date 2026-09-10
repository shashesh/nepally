---
title: "PR 2: Metro Pulse card strip"
status: implemented
created: 2026-04-20
spec: docs/specs/2026-04-20-your-community-today-design.md
---

# PR 2: Metro Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the "Metro Pulse" horizontal card strip above the home feed on both web and mobile, composed from four rule-based cards: Cultural Calendar, Metro Highlights (24h), Events This Week, and USD↔NPR FX rate.

**Architecture:** Shared-first. A single `getPulseCards` composer in `packages/shared` runs four independent sub-queries in parallel and returns a `PulseCard[]` union. FX rate uses a **lazy-refresh** cache row (no cron, no edge function): the first reader after a rate ages out triggers an outbound `fetch()` to a free public FX API and upserts the new rate. Cards are dismissible per-session in memory (full persistence deferred).

**Tech Stack:** TypeScript, Supabase (PostgreSQL + RLS), Zod for incidental payload validation, React (Next.js 15) for web, React Native (Expo 54) for mobile, Vitest for shared/web tests, Jest for mobile tests.

**Spec:** [docs/specs/2026-04-20-your-community-today-design.md](../specs/2026-04-20-your-community-today-design.md) §3

**Branch:** `feat/metro-pulse` (already created from master)

---

## Decisions locked in (carried from brainstorm)

1. **FX refresh strategy: lazy** — no cron. `getExchangeRate(supabase)` reads the cached rate; if `fetched_at` is >24h old OR the row is missing, it fetches from `https://open.er-api.com/v6/latest/USD` (free, no key) and upserts. First reader of the day pays the network cost; subsequent readers return immediately from cache.
2. **Card dismissal: in-memory only for v1** — dismissed cards return on next app open. Spec's "do not reappear until tomorrow" persistence is deferred.
3. **No `getFollowSuggestions` / `getTopHelper` / Weekly Digest cards** — those belong to PR 3.
4. **Four cards in v1:** Cultural Calendar, Metro Highlights, Events This Week, USD↔NPR.

---

## File Structure

### Created (shared)
- `supabase/migrations/029_metro_pulse.sql` — `cultural_events` seed table, `fx_rates` cache table, RLS, initial seed data
- `packages/shared/src/types/pulse.ts` — `PulseCard` discriminated union + per-kind payload types
- `packages/shared/src/api/pulse.ts` — `getPulseCards` composer
- `packages/shared/src/api/pulse.test.ts` — composer tests (parallelism, error isolation, empty-metro fallback)
- `packages/shared/src/api/culturalEvents.ts` — `getUpcomingCulturalEvents(supabase, withinDays?)`
- `packages/shared/src/api/culturalEvents.test.ts`
- `packages/shared/src/api/fxRates.ts` — `getExchangeRate(supabase, fetcher?)` with lazy refresh
- `packages/shared/src/api/fxRates.test.ts`
- `packages/shared/src/logic/pulse.ts` — card assembly rules (priority, backfill, dismiss filter)
- `packages/shared/src/logic/pulse.test.ts`

### Created (mobile)
- `apps/mobile/src/components/pulse/PulseCard.tsx` — renders any card kind
- `apps/mobile/src/components/pulse/PulseCard.test.tsx`
- `apps/mobile/src/components/pulse/MetroPulseStrip.tsx` — horizontal FlatList wrapper
- `apps/mobile/src/components/pulse/MetroPulseStrip.test.tsx`

### Created (web)
- `apps/web/src/components/pulse/PulseCard.tsx` — renders any card kind
- `apps/web/src/components/pulse/PulseCard.module.css`
- `apps/web/src/components/pulse/PulseCard.test.tsx`
- `apps/web/src/components/pulse/MetroPulseStrip.tsx` — horizontal scroll container
- `apps/web/src/components/pulse/MetroPulseStrip.module.css`
- `apps/web/src/components/pulse/MetroPulseStrip.test.tsx`

### Modified
- `packages/shared/src/types/index.ts` — re-export pulse
- `packages/shared/src/api/index.ts` — re-export pulse / culturalEvents / fxRates
- `packages/shared/src/logic/index.ts` (or equivalent) — re-export pulse logic
- `packages/shared/src/api/posts.ts` — add `getRecentPostsCountByMetro(supabase, metroId, sinceIso)` if not present (read-only count query)
- `apps/mobile/src/screens/HomeScreen.tsx` — combine existing `renderCreatePostBanner()` with `<MetroPulseStrip />` in `ListHeaderComponent`
- `apps/web/src/pages/feed.page.tsx` — insert `<MetroPulseStrip />` above the post list
- `docs/INDEX.md` — add plan entry

---

## Execution Notes

- Repo root: `c:/Users/shash/Documents/personal-github-repos/nepally/`.
- **Branch:** stay on `feat/metro-pulse`. Commit frequently; never push without explicit user OK.
- **Shared tests:** run with `cd packages/shared && npx vitest run src/<path>` or workspace flag.
- **Mobile tests:** `cd apps/mobile && npx jest <pattern>`.
- **Web tests:** `cd apps/web && npx vitest run <path>`.
- **Migration apply:** user will apply migration 029 manually via Supabase dashboard SQL editor. **Task A2 is a manual gate.**
- **FX fetch in tests:** always pass a mock `fetcher` to `getExchangeRate` — never let a test hit the real network.

---

## Phase A — Database Foundation

### Task A1: Author migration 029

**Files:**
- Create: `supabase/migrations/029_metro_pulse.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 029_metro_pulse.sql
-- ADDITIVE: adds cultural_events (seed table for Nepali festivals) and
-- fx_rates (cache for currency rates, lazy-refreshed by the shared API).
-- See docs/specs/2026-04-20-your-community-today-design.md §3.
--
-- Rollback (forward-only migration if ever needed):
--   DROP TABLE IF EXISTS fx_rates;
--   DROP TABLE IF EXISTS cultural_events;

-- 1) cultural_events: seeded festival calendar surfaced in the Pulse strip.
CREATE TABLE IF NOT EXISTS cultural_events (
  id text PRIMARY KEY,                 -- slug, e.g. 'dashain-2026'
  title text NOT NULL,
  starts_on date NOT NULL,             -- primary display date
  ends_on date,                        -- NULL for single-day events
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cultural_events_starts_on
  ON cultural_events (starts_on);

COMMENT ON TABLE cultural_events IS
  'Nepali cultural calendar surfaced by Metro Pulse. Seeded; admin-only writes.';

ALTER TABLE cultural_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cultural_events_select_all"
  ON cultural_events
  FOR SELECT
  USING (true);

-- Writes restricted to moderators (admins will expand seed data via SQL migrations
-- or direct table inserts with service role).
CREATE POLICY "cultural_events_insert_mod_only"
  ON cultural_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid()) AND is_moderator = true
    )
  );

CREATE POLICY "cultural_events_update_mod_only"
  ON cultural_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid()) AND is_moderator = true
    )
  );

CREATE POLICY "cultural_events_delete_mod_only"
  ON cultural_events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid()) AND is_moderator = true
    )
  );

-- Seed data: major Nepali festivals over the next 12 months.
-- Dates are approximations — moderators can refine via future migrations.
INSERT INTO cultural_events (id, title, starts_on, ends_on, description) VALUES
  ('buddha-jayanti-2026',   'Buddha Jayanti',        '2026-05-02', NULL,         'Celebration of Lord Buddha''s birth.'),
  ('saun-sankranti-2026',   'Saun Sankranti',        '2026-07-17', NULL,         'First day of the month of Saun.'),
  ('teej-2026',             'Teej',                  '2026-08-26', NULL,         'Festival celebrated primarily by Hindu women.'),
  ('indra-jatra-2026',      'Indra Jatra',           '2026-09-06', '2026-09-14', 'Kathmandu''s week-long street festival.'),
  ('dashain-2026',          'Dashain',               '2026-09-19', '2026-10-02', 'Nepal''s largest festival; 15 days culminating on Kojagrat Purnima.'),
  ('tihar-2026',            'Tihar',                 '2026-11-07', '2026-11-11', 'Five-day festival of lights.'),
  ('christmas-2026',        'Christmas',             '2026-12-25', NULL,         'Observed widely across US-based communities.'),
  ('maghe-sankranti-2027',  'Maghe Sankranti',       '2027-01-14', NULL,         'Marks the end of the winter solstice month Poush.'),
  ('saraswati-puja-2027',   'Saraswati Puja',        '2027-02-11', NULL,         'Festival of learning and the arts.'),
  ('maha-shivaratri-2027',  'Maha Shivaratri',       '2027-02-15', NULL,         'Night of Lord Shiva.'),
  ('holi-2027',             'Holi',                  '2027-03-13', NULL,         'Festival of colors.'),
  ('nepali-new-year-2084',  'Nepali New Year 2084',  '2027-04-14', NULL,         'Baisakh 1, 2084 BS.')
ON CONFLICT (id) DO NOTHING;

-- 2) fx_rates: cache of exchange rates, lazy-refreshed by shared API.
CREATE TABLE IF NOT EXISTS fx_rates (
  pair text PRIMARY KEY,                -- e.g. 'USD_NPR'
  rate numeric(12, 4) NOT NULL,
  source text NOT NULL,                 -- e.g. 'open.er-api.com'
  fetched_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fx_rates IS
  'Cached FX rates. Writers are authenticated users via shared API (lazy refresh).';

ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fx_rates_select_all"
  ON fx_rates
  FOR SELECT
  USING (true);

-- Any authenticated user may upsert — collision is fine; last write wins.
CREATE POLICY "fx_rates_insert_any_authed"
  ON fx_rates
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "fx_rates_update_any_authed"
  ON fx_rates
  FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/029_metro_pulse.sql
git commit -m "feat(db): cultural_events + fx_rates tables + seed data (029)"
```

### Task A2 (manual gate): User applies migration 029

The controller halts here. User applies `029_metro_pulse.sql` via Supabase SQL Editor or `supabase db push` and confirms:

```sql
SELECT count(*) FROM cultural_events;  -- expect 12
SELECT * FROM fx_rates;                 -- expect 0 rows (populated on first read)
```

Before proceeding with the next task, the user confirms success.

---

## Phase B — Shared Types

### Task B1: PulseCard union type

**Files:**
- Create: `packages/shared/src/types/pulse.ts`
- Modify: `packages/shared/src/types/index.ts`

- [ ] **Step 1: Create `pulse.ts`**

```typescript
/**
 * Metro Pulse card types — discriminated union, one variant per card kind.
 * See docs/specs/2026-04-20-your-community-today-design.md §3.
 */

export type PulseCardKind =
  | 'cultural_calendar'
  | 'metro_highlights'
  | 'events_this_week'
  | 'fx_rate';

export interface CulturalCalendarCard {
  kind: 'cultural_calendar';
  id: string; // e.g. 'dashain-2026'
  title: string;
  startsAt: string; // ISO date
  daysUntil: number; // 0 for today
  deepLink: string;
}

export interface MetroHighlightsCard {
  kind: 'metro_highlights';
  id: 'metro_highlights';
  count: number;
  metroLabel: string; // e.g. 'DFW' or the metro's short name
  deepLink: string;
}

export interface EventsThisWeekCard {
  kind: 'events_this_week';
  id: 'events_this_week';
  count: number;
  nextEventTitle: string;
  nextEventStartsAt: string; // ISO
  deepLink: string;
}

export interface FxRateCard {
  kind: 'fx_rate';
  id: 'fx_rate';
  pair: 'USD_NPR';
  rate: number;
  fetchedAt: string; // ISO
}

export interface CreateFirstPostCard {
  kind: 'create_first_post';
  id: 'create_first_post';
  title: string;
  deepLink: string;
}

export type PulseCard =
  | CulturalCalendarCard
  | MetroHighlightsCard
  | EventsThisWeekCard
  | FxRateCard
  | CreateFirstPostCard;

export interface PulseCardsResult {
  cards: PulseCard[];
  computedAt: string; // ISO
}
```

- [ ] **Step 2: Re-export from the types barrel**

Open `packages/shared/src/types/index.ts` and add:

```typescript
export * from './pulse';
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/shared && npx tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/pulse.ts packages/shared/src/types/index.ts
git commit -m "feat(shared): PulseCard discriminated-union type"
```

---

## Phase C — Shared API: Cultural Events

### Task C1: `getUpcomingCulturalEvents` (test-first)

**Files:**
- Create: `packages/shared/src/api/culturalEvents.test.ts`
- Create: `packages/shared/src/api/culturalEvents.ts`
- Modify: `packages/shared/src/api/index.ts`

- [ ] **Step 1: Write the test file**

`packages/shared/src/api/culturalEvents.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUpcomingCulturalEvents } from './culturalEvents';

function makeChain(final: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'gte', 'lte', 'order', 'limit']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // terminal: awaiting the builder resolves to `final`
  (chain as unknown as PromiseLike<unknown>).then = (res: (v: unknown) => unknown) =>
    Promise.resolve(res(final));
  return chain;
}

describe('getUpcomingCulturalEvents', () => {
  it('queries cultural_events with today as lower bound', async () => {
    const chain = makeChain({
      data: [
        { id: 'dashain-2026', title: 'Dashain', starts_on: '2026-09-19', ends_on: '2026-10-02' },
      ],
      error: null,
    });
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseClient;

    const res = await getUpcomingCulturalEvents(supabase, 30, new Date('2026-04-20T00:00:00Z'));

    expect(supabase.from).toHaveBeenCalledWith('cultural_events');
    expect(chain.gte).toHaveBeenCalledWith('starts_on', '2026-04-20');
    expect(chain.lte).toHaveBeenCalledWith('starts_on', '2026-05-20');
    expect(chain.order).toHaveBeenCalledWith('starts_on', { ascending: true });
    expect(res.data?.length).toBe(1);
  });

  it('returns an error field when the query fails', async () => {
    const chain = makeChain({ data: null, error: new Error('boom') });
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseClient;

    const res = await getUpcomingCulturalEvents(supabase, 30, new Date('2026-04-20'));
    expect(res.error).toBeInstanceOf(Error);
    expect(res.data).toBeUndefined();
  });

  it('defaults withinDays to 30 when omitted', async () => {
    const chain = makeChain({ data: [], error: null });
    const supabase = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseClient;

    await getUpcomingCulturalEvents(supabase, undefined, new Date('2026-04-20T00:00:00Z'));
    expect(chain.lte).toHaveBeenCalledWith('starts_on', '2026-05-20');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd packages/shared && npx vitest run src/api/culturalEvents.test.ts`
Expected: FAIL — `Cannot find module './culturalEvents'`.

- [ ] **Step 3: Implement `culturalEvents.ts`**

```typescript
/**
 * Shared Cultural Events API — reads seeded Nepali festival rows from DB.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CulturalEventRow {
  id: string;
  title: string;
  starts_on: string; // ISO date (YYYY-MM-DD)
  ends_on: string | null;
  description: string | null;
}

interface Result {
  data?: CulturalEventRow[];
  error?: Error;
}

const DEFAULT_WITHIN_DAYS = 30;
const MAX_ROWS = 10;

function toIsoDate(d: Date): string {
  // YYYY-MM-DD in UTC — seeded data uses date-only semantics
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toError(raw: unknown, fallback: string): Error {
  if (raw instanceof Error) return raw;
  if (raw && typeof raw === 'object' && 'message' in raw) {
    return new Error(String((raw as { message: unknown }).message));
  }
  return new Error(fallback);
}

/**
 * Returns cultural events whose `starts_on` is between `now` and `now + withinDays`.
 *
 * @param now optional injected "now" for testing. Defaults to `new Date()`.
 */
export async function getUpcomingCulturalEvents(
  supabase: SupabaseClient,
  withinDays: number | undefined,
  now: Date = new Date()
): Promise<Result> {
  const days = withinDays ?? DEFAULT_WITHIN_DAYS;
  const lower = toIsoDate(now);
  const upper = toIsoDate(addDays(now, days));

  try {
    const { data, error } = await supabase
      .from('cultural_events')
      .select('*')
      .gte('starts_on', lower)
      .lte('starts_on', upper)
      .order('starts_on', { ascending: true })
      .limit(MAX_ROWS);

    if (error) throw error;
    return { data: (data ?? []) as CulturalEventRow[] };
  } catch (error) {
    return { error: toError(error, 'Failed to load cultural events') };
  }
}
```

- [ ] **Step 4: Re-export from `packages/shared/src/api/index.ts`**

Add:

```typescript
export * from './culturalEvents';
```

- [ ] **Step 5: Run test — expect PASS**

Run: `cd packages/shared && npx vitest run src/api/culturalEvents.test.ts`
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/api/culturalEvents.ts packages/shared/src/api/culturalEvents.test.ts packages/shared/src/api/index.ts
git commit -m "feat(shared): getUpcomingCulturalEvents API"
```

---

## Phase D — Shared API: FX Rate with Lazy Refresh

### Task D1: `getExchangeRate` (test-first)

**Files:**
- Create: `packages/shared/src/api/fxRates.test.ts`
- Create: `packages/shared/src/api/fxRates.ts`
- Modify: `packages/shared/src/api/index.ts`

The function signature:

```typescript
getExchangeRate(
  supabase: SupabaseClient,
  fetcher?: (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>,
  now?: Date
): Promise<{ data?: { pair: 'USD_NPR'; rate: number; fetchedAt: string }, error?: Error }>
```

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getExchangeRate } from './fxRates';

function makeSelectChain(final: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'eq', 'maybeSingle']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.maybeSingle.mockResolvedValue(final);
  return chain;
}

function makeUpsertChain(final: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['upsert', 'select', 'single']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single.mockResolvedValue(final);
  return chain;
}

describe('getExchangeRate', () => {
  it('returns cached rate when it is fresh (under 24h old)', async () => {
    const freshIso = '2026-04-20T12:00:00Z';
    const selectChain = makeSelectChain({
      data: { pair: 'USD_NPR', rate: 133.25, fetched_at: freshIso, source: 'open.er-api.com' },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(selectChain) } as unknown as SupabaseClient;
    const fetcher = vi.fn();

    const res = await getExchangeRate(
      supabase,
      fetcher as never,
      new Date('2026-04-20T18:00:00Z') // 6h after fetched_at → fresh
    );

    expect(fetcher).not.toHaveBeenCalled();
    expect(res.data?.rate).toBe(133.25);
    expect(res.data?.pair).toBe('USD_NPR');
    expect(res.data?.fetchedAt).toBe(freshIso);
  });

  it('refetches when cached rate is stale (>24h old) and upserts the new rate', async () => {
    const staleIso = '2026-04-18T00:00:00Z';
    const selectChain = makeSelectChain({
      data: { pair: 'USD_NPR', rate: 130.0, fetched_at: staleIso, source: 'open.er-api.com' },
      error: null,
    });
    const upsertChain = makeUpsertChain({
      data: { pair: 'USD_NPR', rate: 133.7, fetched_at: '2026-04-20T00:00:00Z', source: 'open.er-api.com' },
      error: null,
    });
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(upsertChain),
    } as unknown as SupabaseClient;

    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'success', rates: { NPR: 133.7 } }),
    });

    const res = await getExchangeRate(
      supabase,
      fetcher,
      new Date('2026-04-20T00:00:00Z')
    );

    expect(fetcher).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/USD');
    expect(upsertChain.upsert).toHaveBeenCalled();
    expect(res.data?.rate).toBe(133.7);
  });

  it('fetches when cache row is absent', async () => {
    const selectChain = makeSelectChain({ data: null, error: null });
    const upsertChain = makeUpsertChain({
      data: { pair: 'USD_NPR', rate: 133.7, fetched_at: '2026-04-20T00:00:00Z', source: 'open.er-api.com' },
      error: null,
    });
    const supabase = {
      from: vi.fn().mockReturnValueOnce(selectChain).mockReturnValueOnce(upsertChain),
    } as unknown as SupabaseClient;

    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'success', rates: { NPR: 133.7 } }),
    });

    const res = await getExchangeRate(supabase, fetcher, new Date('2026-04-20T00:00:00Z'));
    expect(fetcher).toHaveBeenCalled();
    expect(res.data?.rate).toBe(133.7);
  });

  it('falls back to the stale cached rate if the outbound fetch fails', async () => {
    const staleIso = '2026-04-18T00:00:00Z';
    const selectChain = makeSelectChain({
      data: { pair: 'USD_NPR', rate: 130.0, fetched_at: staleIso, source: 'open.er-api.com' },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(selectChain) } as unknown as SupabaseClient;
    const fetcher = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });

    const res = await getExchangeRate(
      supabase,
      fetcher,
      new Date('2026-04-20T00:00:00Z')
    );
    expect(res.data?.rate).toBe(130.0);
    expect(res.data?.fetchedAt).toBe(staleIso);
  });

  it('returns an error when there is no cache AND fetch fails', async () => {
    const selectChain = makeSelectChain({ data: null, error: null });
    const supabase = { from: vi.fn().mockReturnValue(selectChain) } as unknown as SupabaseClient;
    const fetcher = vi.fn().mockRejectedValue(new Error('network'));

    const res = await getExchangeRate(supabase, fetcher, new Date('2026-04-20'));
    expect(res.data).toBeUndefined();
    expect(res.error).toBeInstanceOf(Error);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`cd packages/shared && npx vitest run src/api/fxRates.test.ts` — module not found.

- [ ] **Step 3: Implement `fxRates.ts`**

```typescript
/**
 * Shared FX Rates API — lazy-refreshed cache of exchange rates.
 *
 * Reads the cached row; if stale (>24h) or missing, fetches a fresh rate from
 * https://open.er-api.com/v6/latest/USD (free, no key), upserts, and returns
 * the new value. If the refresh fails and a cached row exists, the cached row
 * is returned so the UI never shows a blank card.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const FX_SOURCE_URL = 'https://open.er-api.com/v6/latest/USD';
const FX_SOURCE_NAME = 'open.er-api.com';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface ExchangeRate {
  pair: 'USD_NPR';
  rate: number;
  fetchedAt: string; // ISO
}

interface Result {
  data?: ExchangeRate;
  error?: Error;
}

type Fetcher = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

function toError(raw: unknown, fallback: string): Error {
  if (raw instanceof Error) return raw;
  if (raw && typeof raw === 'object' && 'message' in raw) {
    return new Error(String((raw as { message: unknown }).message));
  }
  return new Error(fallback);
}

interface CacheRow {
  pair: string;
  rate: number;
  source: string;
  fetched_at: string;
}

async function readCache(supabase: SupabaseClient): Promise<CacheRow | null> {
  const { data, error } = await supabase
    .from('fx_rates')
    .select('*')
    .eq('pair', 'USD_NPR')
    .maybeSingle();
  if (error) throw error;
  return (data as CacheRow | null) ?? null;
}

async function writeCache(
  supabase: SupabaseClient,
  rate: number,
  nowIso: string
): Promise<CacheRow> {
  const { data, error } = await supabase
    .from('fx_rates')
    .upsert({
      pair: 'USD_NPR',
      rate,
      source: FX_SOURCE_NAME,
      fetched_at: nowIso,
      updated_at: nowIso,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CacheRow;
}

async function fetchFreshRate(fetcher: Fetcher): Promise<number> {
  const res = await fetcher(FX_SOURCE_URL);
  if (!res.ok) throw new Error('FX upstream returned non-ok response');
  const body = (await res.json()) as { rates?: Record<string, unknown> };
  const npr = body?.rates?.NPR;
  if (typeof npr !== 'number' || !Number.isFinite(npr) || npr <= 0) {
    throw new Error('FX upstream returned invalid NPR rate');
  }
  return npr;
}

function isFresh(fetchedAt: string, now: Date): boolean {
  const age = now.getTime() - new Date(fetchedAt).getTime();
  return age >= 0 && age < MAX_AGE_MS;
}

function toExchangeRate(row: CacheRow): ExchangeRate {
  return { pair: 'USD_NPR', rate: row.rate, fetchedAt: row.fetched_at };
}

/**
 * Get the USD↔NPR exchange rate with lazy refresh.
 *
 * @param fetcher injectable `fetch`-like function. Defaults to the global `fetch`.
 * @param now injectable "now" for tests. Defaults to `new Date()`.
 */
export async function getExchangeRate(
  supabase: SupabaseClient,
  fetcher: Fetcher = globalThis.fetch.bind(globalThis) as Fetcher,
  now: Date = new Date()
): Promise<Result> {
  let cache: CacheRow | null = null;
  try {
    cache = await readCache(supabase);
  } catch (error) {
    return { error: toError(error, 'Failed to read FX cache') };
  }

  if (cache && isFresh(cache.fetched_at, now)) {
    return { data: toExchangeRate(cache) };
  }

  try {
    const fresh = await fetchFreshRate(fetcher);
    const row = await writeCache(supabase, fresh, now.toISOString());
    return { data: toExchangeRate(row) };
  } catch (error) {
    if (cache) {
      // Serve the stale rate rather than blank.
      return { data: toExchangeRate(cache) };
    }
    return { error: toError(error, 'Failed to refresh FX rate') };
  }
}
```

- [ ] **Step 4: Re-export**

`packages/shared/src/api/index.ts`:

```typescript
export * from './fxRates';
```

- [ ] **Step 5: Run — expect PASS (5 tests)**

`cd packages/shared && npx vitest run src/api/fxRates.test.ts`
Expected: 5 pass.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/api/fxRates.ts packages/shared/src/api/fxRates.test.ts packages/shared/src/api/index.ts
git commit -m "feat(shared): lazy-refreshing USD-NPR FX rate API"
```

---

## Phase E — Shared API: Metro Highlights

### Task E1: `getRecentPostsCountByMetro` (test-first)

The spec calls for a card saying "N new posts in your metro today." Cheapest query: count-only.

**Files:**
- Modify: `packages/shared/src/api/posts.ts` (add function)
- Modify: `packages/shared/src/api/posts.test.ts` (add test)

- [ ] **Step 1: Add failing test to `posts.test.ts`**

Append (adapt import if needed):

```typescript
import { getRecentPostsCountByMetro } from './posts';

describe('getRecentPostsCountByMetro', () => {
  it('counts posts in metro created since the given timestamp', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
    } as unknown as Record<string, ReturnType<typeof vi.fn>>;
    // When used with { count: 'exact', head: true } the builder resolves to { count, error }
    (chain as unknown as PromiseLike<unknown>).then = (res: (v: unknown) => unknown) =>
      Promise.resolve(res({ count: 7, error: null }));

    const supabase = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const res = await getRecentPostsCountByMetro(
      supabase,
      'metro-dfw',
      '2026-04-19T00:00:00Z'
    );

    expect(supabase.from).toHaveBeenCalledWith('posts');
    expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(chain.eq).toHaveBeenCalledWith('metro_area_id', 'metro-dfw');
    expect(chain.gte).toHaveBeenCalledWith('created_at', '2026-04-19T00:00:00Z');
    expect(res.data).toBe(7);
    expect(res.error).toBeUndefined();
  });

  it('returns 0 when count is null', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
    } as unknown as Record<string, ReturnType<typeof vi.fn>>;
    (chain as unknown as PromiseLike<unknown>).then = (res: (v: unknown) => unknown) =>
      Promise.resolve(res({ count: null, error: null }));

    const supabase = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const res = await getRecentPostsCountByMetro(
      supabase,
      'metro-dfw',
      '2026-04-19T00:00:00Z'
    );
    expect(res.data).toBe(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`cd packages/shared && npx vitest run src/api/posts.test.ts -t "getRecentPostsCountByMetro"` — not defined.

- [ ] **Step 3: Add implementation to `packages/shared/src/api/posts.ts`**

Append at the bottom of the file:

```typescript
interface PostCountResult {
  data?: number;
  error?: Error;
}

/**
 * Count of posts in the given metro area created on or after `sinceIso`.
 * Uses count-only HEAD request — does not transfer row data.
 */
export async function getRecentPostsCountByMetro(
  supabase: SupabaseClient,
  metroAreaId: string,
  sinceIso: string
): Promise<PostCountResult> {
  try {
    const { count, error } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('metro_area_id', metroAreaId)
      .gte('created_at', sinceIso);

    if (error) throw error;
    return { data: count ?? 0 };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to count recent posts'),
    };
  }
}
```

Note: if `SupabaseClient` isn't already imported at top of `posts.ts`, verify — it should already be present since the file exports other post queries. Do not re-import.

- [ ] **Step 4: Run — expect PASS**

`cd packages/shared && npx vitest run src/api/posts.test.ts -t "getRecentPostsCountByMetro"`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/api/posts.ts packages/shared/src/api/posts.test.ts
git commit -m "feat(shared): getRecentPostsCountByMetro (count-only)"
```

---

## Phase F — Shared Logic: Card Assembly

### Task F1: `assemblePulseCards` pure function (test-first)

**Files:**
- Create: `packages/shared/src/logic/pulse.ts`
- Create: `packages/shared/src/logic/pulse.test.ts`
- Modify: `packages/shared/src/logic/index.ts` (or equivalent barrel — inspect the file to match its re-export style)

Inputs: results from the four sub-queries + metro label + dismissed ids.
Output: ordered `PulseCard[]` following spec composition rules.

Rules (from spec §3.3):
- Show cultural card if `daysUntil ≤ 30`.
- Show metro highlights if `count ≥ 1`.
- Show events card if `count ≥ 1`.
- Always show FX if a rate was returned.
- Exclude any card whose `id` is in `dismissedIds`.
- If fewer than 3 cards remain, backfill with `CreateFirstPostCard` to avoid an empty strip.
- Display order: cultural_calendar → metro_highlights → events_this_week → fx_rate → create_first_post.

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { assemblePulseCards } from './pulse';
import type { CulturalEventRow } from '../api/culturalEvents';
import type { ExchangeRate } from '../api/fxRates';

const now = new Date('2026-04-20T00:00:00Z');

describe('assemblePulseCards', () => {
  it('builds all four cards in display order when inputs are non-empty', () => {
    const cultural: CulturalEventRow[] = [
      {
        id: 'buddha-jayanti-2026',
        title: 'Buddha Jayanti',
        starts_on: '2026-05-02',
        ends_on: null,
        description: null,
      },
    ];
    const fx: ExchangeRate = {
      pair: 'USD_NPR',
      rate: 133.25,
      fetchedAt: '2026-04-20T00:00:00Z',
    };
    const result = assemblePulseCards({
      now,
      cultural,
      metroHighlightsCount: 5,
      metroLabel: 'DFW',
      eventsCount: 3,
      nextEventTitle: 'Dashain Meetup',
      nextEventStartsAt: '2026-04-24T18:00:00Z',
      fx,
      dismissedIds: new Set(),
    });

    expect(result.map((c) => c.kind)).toEqual([
      'cultural_calendar',
      'metro_highlights',
      'events_this_week',
      'fx_rate',
    ]);

    const cultCard = result.find((c) => c.kind === 'cultural_calendar');
    expect(cultCard?.kind).toBe('cultural_calendar');
    if (cultCard?.kind === 'cultural_calendar') {
      expect(cultCard.daysUntil).toBe(12);
      expect(cultCard.title).toBe('Buddha Jayanti');
    }
  });

  it('omits metro_highlights when count is 0', () => {
    const result = assemblePulseCards({
      now,
      cultural: [],
      metroHighlightsCount: 0,
      metroLabel: 'DFW',
      eventsCount: 0,
      nextEventTitle: null,
      nextEventStartsAt: null,
      fx: null,
      dismissedIds: new Set(),
    });
    expect(result.find((c) => c.kind === 'metro_highlights')).toBeUndefined();
  });

  it('filters out cards whose id is in dismissedIds', () => {
    const fx: ExchangeRate = { pair: 'USD_NPR', rate: 133, fetchedAt: '2026-04-20T00:00:00Z' };
    const result = assemblePulseCards({
      now,
      cultural: [],
      metroHighlightsCount: 0,
      metroLabel: 'DFW',
      eventsCount: 0,
      nextEventTitle: null,
      nextEventStartsAt: null,
      fx,
      dismissedIds: new Set(['fx_rate']),
    });
    expect(result.find((c) => c.kind === 'fx_rate')).toBeUndefined();
  });

  it('backfills a create-first-post card when fewer than 3 real cards remain', () => {
    const fx: ExchangeRate = { pair: 'USD_NPR', rate: 133, fetchedAt: '2026-04-20T00:00:00Z' };
    const result = assemblePulseCards({
      now,
      cultural: [],
      metroHighlightsCount: 0,
      metroLabel: 'DFW',
      eventsCount: 0,
      nextEventTitle: null,
      nextEventStartsAt: null,
      fx,
      dismissedIds: new Set(),
    });
    // fx_rate present + create_first_post backfill → 2 cards
    expect(result.some((c) => c.kind === 'create_first_post')).toBe(true);
  });

  it('does not backfill when three or more real cards are present', () => {
    const cultural: CulturalEventRow[] = [
      { id: 'x', title: 'X', starts_on: '2026-04-25', ends_on: null, description: null },
    ];
    const fx: ExchangeRate = { pair: 'USD_NPR', rate: 133, fetchedAt: '2026-04-20T00:00:00Z' };
    const result = assemblePulseCards({
      now,
      cultural,
      metroHighlightsCount: 4,
      metroLabel: 'DFW',
      eventsCount: 0,
      nextEventTitle: null,
      nextEventStartsAt: null,
      fx,
      dismissedIds: new Set(),
    });
    expect(result.some((c) => c.kind === 'create_first_post')).toBe(false);
  });

  it('skips cultural events more than 30 days out', () => {
    const cultural: CulturalEventRow[] = [
      { id: 'far-away', title: 'Far', starts_on: '2026-06-01', ends_on: null, description: null },
    ];
    const result = assemblePulseCards({
      now,
      cultural,
      metroHighlightsCount: 0,
      metroLabel: 'DFW',
      eventsCount: 0,
      nextEventTitle: null,
      nextEventStartsAt: null,
      fx: null,
      dismissedIds: new Set(),
    });
    expect(result.find((c) => c.kind === 'cultural_calendar')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`cd packages/shared && npx vitest run src/logic/pulse.test.ts`

- [ ] **Step 3: Implement `packages/shared/src/logic/pulse.ts`**

```typescript
/**
 * Pure card-assembly logic for Metro Pulse.
 * No IO. Takes already-fetched sub-query results and returns ordered PulseCard[].
 */
import type {
  PulseCard,
  CulturalCalendarCard,
  MetroHighlightsCard,
  EventsThisWeekCard,
  FxRateCard,
  CreateFirstPostCard,
} from '../types/pulse';
import type { CulturalEventRow } from '../api/culturalEvents';
import type { ExchangeRate } from '../api/fxRates';

const CULTURAL_WINDOW_DAYS = 30;
const MIN_CARDS_BEFORE_BACKFILL = 3;

const CARD_ORDER: Record<PulseCard['kind'], number> = {
  cultural_calendar: 0,
  metro_highlights: 1,
  events_this_week: 2,
  fx_rate: 3,
  create_first_post: 4,
};

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
}

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((bUtc - aUtc) / MS_PER_DAY);
}

function buildCulturalCard(
  event: CulturalEventRow,
  now: Date
): CulturalCalendarCard | null {
  const startsAt = new Date(`${event.starts_on}T00:00:00Z`);
  const daysUntil = daysBetween(now, startsAt);
  if (daysUntil < 0 || daysUntil > CULTURAL_WINDOW_DAYS) return null;
  return {
    kind: 'cultural_calendar',
    id: event.id,
    title: event.title,
    startsAt: startsAt.toISOString(),
    daysUntil,
    deepLink: `/events?from=${event.starts_on}`,
  };
}

function buildMetroHighlightsCard(
  count: number,
  metroLabel: string
): MetroHighlightsCard | null {
  if (count < 1) return null;
  return {
    kind: 'metro_highlights',
    id: 'metro_highlights',
    count,
    metroLabel,
    deepLink: '/?range=24h',
  };
}

function buildEventsCard(
  count: number,
  nextEventTitle: string | null,
  nextEventStartsAt: string | null
): EventsThisWeekCard | null {
  if (count < 1 || !nextEventTitle || !nextEventStartsAt) return null;
  return {
    kind: 'events_this_week',
    id: 'events_this_week',
    count,
    nextEventTitle,
    nextEventStartsAt,
    deepLink: '/events',
  };
}

function buildFxCard(fx: ExchangeRate | null): FxRateCard | null {
  if (!fx) return null;
  return {
    kind: 'fx_rate',
    id: 'fx_rate',
    pair: fx.pair,
    rate: fx.rate,
    fetchedAt: fx.fetchedAt,
  };
}

function buildCreateFirstPostCard(): CreateFirstPostCard {
  return {
    kind: 'create_first_post',
    id: 'create_first_post',
    title: 'Be the first to post in your metro today',
    deepLink: '/post/new',
  };
}

export function assemblePulseCards(input: AssemblePulseCardsInput): PulseCard[] {
  const cards: PulseCard[] = [];

  // Pick the nearest cultural event within the window.
  for (const event of input.cultural) {
    const card = buildCulturalCard(event, input.now);
    if (card) {
      cards.push(card);
      break; // one cultural card max
    }
  }

  const highlights = buildMetroHighlightsCard(
    input.metroHighlightsCount,
    input.metroLabel
  );
  if (highlights) cards.push(highlights);

  const events = buildEventsCard(
    input.eventsCount,
    input.nextEventTitle,
    input.nextEventStartsAt
  );
  if (events) cards.push(events);

  const fx = buildFxCard(input.fx);
  if (fx) cards.push(fx);

  const filtered = cards.filter((c) => !input.dismissedIds.has(c.id));

  if (filtered.length < MIN_CARDS_BEFORE_BACKFILL) {
    filtered.push(buildCreateFirstPostCard());
  }

  filtered.sort((a, b) => CARD_ORDER[a.kind] - CARD_ORDER[b.kind]);
  return filtered;
}
```

- [ ] **Step 4: Wire up the logic barrel**

Inspect `packages/shared/src/logic/index.ts` (or equivalent re-export file). Match its style and add `export * from './pulse';` (or the equivalent named-export form).

- [ ] **Step 5: Run — expect PASS (6 tests)**

`cd packages/shared && npx vitest run src/logic/pulse.test.ts`

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/logic/pulse.ts packages/shared/src/logic/pulse.test.ts packages/shared/src/logic/index.ts
git commit -m "feat(shared): pure pulse card assembly logic"
```

---

## Phase G — Shared API: getPulseCards Composer

### Task G1: Composer (test-first)

**Files:**
- Create: `packages/shared/src/api/pulse.ts`
- Create: `packages/shared/src/api/pulse.test.ts`
- Modify: `packages/shared/src/api/index.ts`

The composer runs the four sub-queries in parallel via `Promise.allSettled` so a failure in one drops only that card. It then delegates to `assemblePulseCards`.

Signature:

```typescript
export async function getPulseCards(
  supabase: SupabaseClient,
  params: {
    metroAreaId: string;
    metroLabel: string;
    dismissedIds?: Set<string>;
    now?: Date;
    fetcher?: Fetcher;
  }
): Promise<{ data?: PulseCardsResult, error?: Error }>
```

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPulseCards } from './pulse';

// The composer depends on three API modules. We mock them wholesale so
// the test exercises only the composition, not the sub-queries.
vi.mock('./culturalEvents', () => ({
  getUpcomingCulturalEvents: vi.fn(),
}));
vi.mock('./fxRates', () => ({
  getExchangeRate: vi.fn(),
}));
vi.mock('./posts', async (original) => {
  const mod: Record<string, unknown> = await (original as () => Promise<Record<string, unknown>>)();
  return {
    ...mod,
    getRecentPostsCountByMetro: vi.fn(),
    getUpcomingEventsByMetro: vi.fn(),
  };
});

import { getUpcomingCulturalEvents } from './culturalEvents';
import { getExchangeRate } from './fxRates';
import { getRecentPostsCountByMetro, getUpcomingEventsByMetro } from './posts';

function fakeSupabase() {
  return { from: vi.fn() } as unknown as SupabaseClient;
}

describe('getPulseCards composer', () => {
  it('returns assembled cards when all sub-queries succeed', async () => {
    (getUpcomingCulturalEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'buddha-jayanti-2026',
          title: 'Buddha Jayanti',
          starts_on: '2026-05-02',
          ends_on: null,
          description: null,
        },
      ],
    });
    (getRecentPostsCountByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: 4,
    });
    (getUpcomingEventsByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'e-1',
          title: 'Dashain Meetup',
          start_date: '2026-04-22T18:00:00Z',
        },
      ],
    });
    (getExchangeRate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { pair: 'USD_NPR', rate: 133.25, fetchedAt: '2026-04-20T00:00:00Z' },
    });

    const res = await getPulseCards(fakeSupabase(), {
      metroAreaId: 'metro-dfw',
      metroLabel: 'DFW',
      now: new Date('2026-04-20T00:00:00Z'),
    });

    expect(res.error).toBeUndefined();
    expect(res.data?.cards.length).toBeGreaterThanOrEqual(3);
    expect(res.data?.cards[0].kind).toBe('cultural_calendar');
  });

  it('isolates failures: a single sub-query error drops only that card', async () => {
    (getUpcomingCulturalEvents as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: new Error('boom'),
    });
    (getRecentPostsCountByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: 4,
    });
    (getUpcomingEventsByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
    });
    (getExchangeRate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { pair: 'USD_NPR', rate: 133, fetchedAt: '2026-04-20T00:00:00Z' },
    });

    const res = await getPulseCards(fakeSupabase(), {
      metroAreaId: 'metro-dfw',
      metroLabel: 'DFW',
      now: new Date('2026-04-20T00:00:00Z'),
    });

    expect(res.error).toBeUndefined();
    expect(res.data?.cards.every((c) => c.kind !== 'cultural_calendar')).toBe(true);
    expect(res.data?.cards.some((c) => c.kind === 'metro_highlights')).toBe(true);
  });

  it('calls sub-queries in parallel (single await round-trip)', async () => {
    const callOrder: string[] = [];
    (getUpcomingCulturalEvents as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async () => {
        callOrder.push('cultural-start');
        await new Promise((r) => setTimeout(r, 5));
        callOrder.push('cultural-end');
        return { data: [] };
      }
    );
    (getRecentPostsCountByMetro as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async () => {
        callOrder.push('highlights-start');
        return { data: 0 };
      }
    );
    (getUpcomingEventsByMetro as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
    });
    (getExchangeRate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { pair: 'USD_NPR', rate: 1, fetchedAt: '2026-04-20T00:00:00Z' },
    });

    await getPulseCards(fakeSupabase(), {
      metroAreaId: 'metro-dfw',
      metroLabel: 'DFW',
      now: new Date('2026-04-20T00:00:00Z'),
    });

    // highlights should start before cultural finishes (parallel, not sequential)
    const culturalEnd = callOrder.indexOf('cultural-end');
    const highlightsStart = callOrder.indexOf('highlights-start');
    expect(highlightsStart).toBeLessThan(culturalEnd);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`cd packages/shared && npx vitest run src/api/pulse.test.ts`

- [ ] **Step 3: Confirm `getUpcomingEventsByMetro` exists in `packages/shared/src/api/`**

Run (Grep tool): search for `getUpcomingEventsByMetro` in `packages/shared/src/api/`.
- If it exists: use it.
- If it doesn't exist but a similarly-named function does (e.g. `getEventsByMetroArea`, `getUpcomingEvents`): record that and use that name consistently in the composer below.

If no upcoming-events-by-metro function exists in shared, add a minimal one to `packages/shared/src/api/events.ts` with this signature:

```typescript
export async function getUpcomingEventsByMetro(
  supabase: SupabaseClient,
  metroAreaId: string,
  sinceIso: string,
  untilIso: string
): Promise<{ data?: { id: string; title: string; start_date: string }[]; error?: Error }>
```

Implementation: `from('events').select('id, title, start_date').eq('metro_area_id', metroAreaId).gte('start_date', sinceIso).lte('start_date', untilIso).order('start_date').limit(3)`. Check `events.ts` for the exact column names before adding.

- [ ] **Step 4: Implement `packages/shared/src/api/pulse.ts`**

```typescript
/**
 * Metro Pulse composer — runs the four sub-queries in parallel and assembles
 * the card list.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PulseCardsResult } from '../types/pulse';
import { assemblePulseCards } from '../logic/pulse';
import { getUpcomingCulturalEvents } from './culturalEvents';
import { getExchangeRate } from './fxRates';
import { getRecentPostsCountByMetro } from './posts';
import { getUpcomingEventsByMetro } from './events';

interface Params {
  metroAreaId: string;
  metroLabel: string;
  dismissedIds?: Set<string>;
  now?: Date;
  fetcher?: Parameters<typeof getExchangeRate>[1];
}

interface Result {
  data?: PulseCardsResult;
  error?: Error;
}

const HIGHLIGHTS_WINDOW_HOURS = 24;
const EVENTS_WINDOW_DAYS = 7;

function hoursAgo(now: Date, hours: number): string {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function daysAhead(now: Date, days: number): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function getPulseCards(
  supabase: SupabaseClient,
  params: Params
): Promise<Result> {
  const now = params.now ?? new Date();
  const dismissedIds = params.dismissedIds ?? new Set<string>();

  const [culturalRes, highlightsRes, eventsRes, fxRes] = await Promise.allSettled([
    getUpcomingCulturalEvents(supabase, 30, now),
    getRecentPostsCountByMetro(supabase, params.metroAreaId, hoursAgo(now, HIGHLIGHTS_WINDOW_HOURS)),
    getUpcomingEventsByMetro(
      supabase,
      params.metroAreaId,
      now.toISOString(),
      daysAhead(now, EVENTS_WINDOW_DAYS)
    ),
    getExchangeRate(supabase, params.fetcher, now),
  ]);

  function unwrap<T>(settled: PromiseSettledResult<{ data?: T; error?: Error }>): T | null {
    if (settled.status !== 'fulfilled') return null;
    if (settled.value.error) return null;
    return (settled.value.data ?? null) as T | null;
  }

  const cultural = unwrap(culturalRes) ?? [];
  const highlightsCount = unwrap(highlightsRes) ?? 0;
  const events = unwrap(eventsRes) ?? [];
  const fx = unwrap(fxRes);

  const nextEvent = events[0] ?? null;

  try {
    const cards = assemblePulseCards({
      now,
      cultural,
      metroHighlightsCount: highlightsCount,
      metroLabel: params.metroLabel,
      eventsCount: events.length,
      nextEventTitle: nextEvent ? nextEvent.title : null,
      nextEventStartsAt: nextEvent ? nextEvent.start_date : null,
      fx,
      dismissedIds,
    });
    return {
      data: { cards, computedAt: now.toISOString() },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to assemble Pulse'),
    };
  }
}
```

- [ ] **Step 5: Re-export from api barrel**

`packages/shared/src/api/index.ts`: add `export * from './pulse';`

- [ ] **Step 6: Run — expect PASS (3 tests)**

`cd packages/shared && npx vitest run src/api/pulse.test.ts`

- [ ] **Step 7: Full shared test run + typecheck**

```
cd packages/shared && npx vitest run
cd packages/shared && npx tsc --noEmit -p tsconfig.json
```

Expected: all green.

- [ ] **Step 8: Rebuild the shared dist (apps consume built types for some paths)**

```
cd packages/shared && npm run build
```

- [ ] **Step 9: Commit**

```bash
git add packages/shared/src/api/pulse.ts packages/shared/src/api/pulse.test.ts packages/shared/src/api/index.ts packages/shared/src/api/events.ts packages/shared/dist
git commit -m "feat(shared): getPulseCards composer with parallel sub-queries"
```

(Omit `packages/shared/src/api/events.ts` and/or `packages/shared/dist` from the `add` if they were not actually modified.)

---

## Phase H — Mobile UI

### Task H1: `PulseCard` component (renders any kind)

**Files:**
- Create: `apps/mobile/src/components/pulse/PulseCard.tsx`
- Create: `apps/mobile/src/components/pulse/PulseCard.test.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { PulseCard as PulseCardType } from '@nepally/shared';

interface Props {
  card: PulseCardType;
  onPress: (card: PulseCardType) => void;
  onDismiss: (card: PulseCardType) => void;
}

function formatFx(card: Extract<PulseCardType, { kind: 'fx_rate' }>): string {
  return `1 USD = ${card.rate.toFixed(2)} NPR`;
}

function formatRelativeDay(daysUntil: number): string {
  if (daysUntil === 0) return 'today';
  if (daysUntil === 1) return 'tomorrow';
  return `in ${daysUntil} days`;
}

function renderBody(card: PulseCardType): { headline: string; detail: string } {
  switch (card.kind) {
    case 'cultural_calendar':
      return {
        headline: card.title,
        detail: `Starts ${formatRelativeDay(card.daysUntil)}`,
      };
    case 'metro_highlights':
      return {
        headline: `${card.count} new in ${card.metroLabel}`,
        detail: 'in the last 24h',
      };
    case 'events_this_week':
      return {
        headline: `${card.count} events this week`,
        detail: `Next: ${card.nextEventTitle}`,
      };
    case 'fx_rate':
      return {
        headline: formatFx(card),
        detail: 'USD · NPR',
      };
    case 'create_first_post':
      return {
        headline: card.title,
        detail: 'Tap to create the first post today',
      };
  }
}

export function PulseCard({ card, onPress, onDismiss }: Props) {
  const { headline, detail } = renderBody(card);

  return (
    <TouchableOpacity
      testID={`pulse-card-${card.id}`}
      style={styles.card}
      onPress={() => onPress(card)}
      activeOpacity={0.85}
    >
      <TouchableOpacity
        testID={`pulse-card-dismiss-${card.id}`}
        style={styles.dismiss}
        onPress={() => onDismiss(card)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.dismissText}>×</Text>
      </TouchableOpacity>
      <Text style={styles.headline} numberOfLines={2}>
        {headline}
      </Text>
      <Text style={styles.detail} numberOfLines={1}>
        {detail}
      </Text>
    </TouchableOpacity>
  );
}

const CARD_WIDTH = 240;
const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'flex-end',
    minHeight: 96,
  },
  dismiss: {
    position: 'absolute',
    top: 4,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dismissText: { fontSize: 18, color: '#999', lineHeight: 18 },
  headline: { fontSize: 15, fontWeight: '600', color: '#111' },
  detail: { marginTop: 4, fontSize: 12, color: '#666' },
});
```

- [ ] **Step 2: Write the test**

`apps/mobile/src/components/pulse/PulseCard.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PulseCard } from './PulseCard';
import type { PulseCard as PulseCardType } from '@nepally/shared';

describe('PulseCard (mobile)', () => {
  const makeFx = (): PulseCardType => ({
    kind: 'fx_rate',
    id: 'fx_rate',
    pair: 'USD_NPR',
    rate: 133.25,
    fetchedAt: '2026-04-20T00:00:00Z',
  });

  it('renders an FX card with rate formatted to 2 decimals', () => {
    const onPress = jest.fn();
    const onDismiss = jest.fn();
    render(<PulseCard card={makeFx()} onPress={onPress} onDismiss={onDismiss} />);

    expect(screen.getByText('1 USD = 133.25 NPR')).toBeTruthy();
  });

  it('fires onPress with the card payload', () => {
    const onPress = jest.fn();
    render(<PulseCard card={makeFx()} onPress={onPress} onDismiss={jest.fn()} />);
    fireEvent.press(screen.getByTestId('pulse-card-fx_rate'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress.mock.calls[0][0].id).toBe('fx_rate');
  });

  it('fires onDismiss with the card payload', () => {
    const onDismiss = jest.fn();
    render(<PulseCard card={makeFx()} onPress={jest.fn()} onDismiss={onDismiss} />);
    fireEvent.press(screen.getByTestId('pulse-card-dismiss-fx_rate'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss.mock.calls[0][0].id).toBe('fx_rate');
  });

  it('renders a cultural card with relative-day detail', () => {
    const card: PulseCardType = {
      kind: 'cultural_calendar',
      id: 'buddha-jayanti-2026',
      title: 'Buddha Jayanti',
      startsAt: '2026-05-02T00:00:00Z',
      daysUntil: 12,
      deepLink: '/events',
    };
    render(<PulseCard card={card} onPress={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.getByText('Buddha Jayanti')).toBeTruthy();
    expect(screen.getByText('Starts in 12 days')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run — expect PASS**

`cd apps/mobile && npx jest PulseCard`
Expected: 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/pulse/PulseCard.tsx apps/mobile/src/components/pulse/PulseCard.test.tsx
git commit -m "feat(mobile): PulseCard component for Metro Pulse"
```

---

### Task H2: `MetroPulseStrip` horizontal strip

**Files:**
- Create: `apps/mobile/src/components/pulse/MetroPulseStrip.tsx`
- Create: `apps/mobile/src/components/pulse/MetroPulseStrip.test.tsx`

The strip:
- Takes `metroAreaId` and `metroLabel` as props
- Fetches cards via `getPulseCards` on mount
- Holds dismissed-ids in local `useState<Set<string>>`
- Renders a horizontal `FlatList` of `<PulseCard />`
- Hides itself when `cards.length === 0` (silent failure)
- Uses `mountedRef` cancel guard per `apps/mobile/CLAUDE.md`

- [ ] **Step 1: Implement the strip**

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getPulseCards, type PulseCard as PulseCardType } from '@nepally/shared';
import { supabase } from '../../config/supabase';
import { PulseCard } from './PulseCard';

interface Props {
  metroAreaId: string;
  metroLabel: string;
}

export function MetroPulseStrip({ metroAreaId, metroLabel }: Props) {
  const [cards, setCards] = useState<PulseCardType[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const navigation = useNavigation();

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getPulseCards(supabase, {
        metroAreaId,
        metroLabel,
        dismissedIds,
      });
      if (cancelled || !mountedRef.current) return;
      if (res.data) setCards(res.data.cards);
      else setCards([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [metroAreaId, metroLabel, dismissedIds]);

  const handlePress = useCallback(
    (card: PulseCardType) => {
      switch (card.kind) {
        case 'cultural_calendar':
        case 'events_this_week':
          (navigation as unknown as { navigate: (r: string) => void }).navigate('Events');
          break;
        case 'metro_highlights':
          // current feed already displays recent posts; no-op
          break;
        case 'fx_rate':
          // no navigation target yet
          break;
        case 'create_first_post':
          (navigation as unknown as { navigate: (r: string) => void }).navigate('CreatePost');
          break;
      }
    },
    [navigation]
  );

  const handleDismiss = useCallback((card: PulseCardType) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(card.id);
      return next;
    });
  }, []);

  if (cards.length === 0) return null;

  return (
    <View style={styles.wrapper} testID="metro-pulse-strip">
      <FlatList
        horizontal
        data={cards}
        keyExtractor={(c) => `${c.kind}:${c.id}`}
        renderItem={({ item }) => (
          <PulseCard card={item} onPress={handlePress} onDismiss={handleDismiss} />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingVertical: 12 },
  content: { paddingHorizontal: 12 },
});
```

- [ ] **Step 2: Write the test**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { MetroPulseStrip } from './MetroPulseStrip';

const mockGetPulseCards = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('../../config/supabase', () => ({
  supabase: { from: jest.fn() },
}));
jest.mock('@nepally/shared', () => ({
  getPulseCards: (...args: unknown[]) => mockGetPulseCards(...args),
}));

describe('MetroPulseStrip', () => {
  beforeEach(() => {
    mockGetPulseCards.mockReset();
  });

  it('renders cards returned by the composer', async () => {
    mockGetPulseCards.mockResolvedValue({
      data: {
        computedAt: '2026-04-20T00:00:00Z',
        cards: [
          {
            kind: 'fx_rate',
            id: 'fx_rate',
            pair: 'USD_NPR',
            rate: 133.25,
            fetchedAt: '2026-04-20T00:00:00Z',
          },
        ],
      },
    });

    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" />);
    await waitFor(() => {
      expect(screen.getByTestId('metro-pulse-strip')).toBeTruthy();
    });
    expect(screen.getByTestId('pulse-card-fx_rate')).toBeTruthy();
  });

  it('removes a card when its dismiss button is tapped', async () => {
    mockGetPulseCards.mockResolvedValue({
      data: {
        computedAt: '2026-04-20T00:00:00Z',
        cards: [
          {
            kind: 'fx_rate',
            id: 'fx_rate',
            pair: 'USD_NPR',
            rate: 133.25,
            fetchedAt: '2026-04-20T00:00:00Z',
          },
        ],
      },
    });

    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" />);
    await waitFor(() => {
      expect(screen.getByTestId('pulse-card-fx_rate')).toBeTruthy();
    });

    // When dismiss is tapped, the component re-fetches with the dismissed id in the set.
    // Arrange the next fetch to return an empty cards array so the strip hides.
    mockGetPulseCards.mockResolvedValue({
      data: { computedAt: '2026-04-20T00:00:00Z', cards: [] },
    });

    fireEvent.press(screen.getByTestId('pulse-card-dismiss-fx_rate'));

    await waitFor(() => {
      expect(screen.queryByTestId('metro-pulse-strip')).toBeNull();
    });
  });

  it('renders nothing when the composer returns no cards', async () => {
    mockGetPulseCards.mockResolvedValue({
      data: { computedAt: '2026-04-20T00:00:00Z', cards: [] },
    });
    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" />);
    await waitFor(() => {
      expect(screen.queryByTestId('metro-pulse-strip')).toBeNull();
    });
  });
});
```

- [ ] **Step 3: Run — expect PASS (3 tests)**

`cd apps/mobile && npx jest MetroPulseStrip`

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/pulse/MetroPulseStrip.tsx apps/mobile/src/components/pulse/MetroPulseStrip.test.tsx
git commit -m "feat(mobile): MetroPulseStrip horizontal card list"
```

---

### Task H3: Embed strip in HomeScreen

**Files:**
- Modify: `apps/mobile/src/screens/HomeScreen.tsx`

HomeScreen already renders `ListHeaderComponent={renderCreatePostBanner()}`. Combine the banner with the pulse strip using a small inline wrapper.

- [ ] **Step 1: Import the strip**

At the top of `HomeScreen.tsx` alongside the other component imports, add:

```tsx
import { MetroPulseStrip } from '../components/pulse/MetroPulseStrip';
```

- [ ] **Step 2: Identify the metro label**

The spec's pulse uses a short metro label (e.g. "DFW"). Search the file for where the metro short label or name is derived — likely from `activeLocation` / `useLocation()`. If only a long name exists, pass that.

Find the nearest variable (e.g. `metroAreaId`, `activeLocationId`, `activeMetroLabel`) — do not invent a new helper.

- [ ] **Step 3: Wrap the banner and pulse together**

Replace `ListHeaderComponent={renderCreatePostBanner()}` with:

```tsx
ListHeaderComponent={() => (
  <>
    {metroAreaId ? (
      <MetroPulseStrip
        metroAreaId={metroAreaId}
        metroLabel={activeMetroLabel ?? 'your metro'}
      />
    ) : null}
    {renderCreatePostBanner()}
  </>
)}
```

Adapt variable names to what exists in the file.

- [ ] **Step 4: Run mobile tests**

`cd apps/mobile && npx jest HomeScreen`
Expected: pre-existing tests still pass. Fix any regression before proceeding.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/HomeScreen.tsx
git commit -m "feat(mobile): show MetroPulseStrip above home feed"
```

---

## Phase I — Web UI

### Task I1: `PulseCard` web component

**Files:**
- Create: `apps/web/src/components/pulse/PulseCard.tsx`
- Create: `apps/web/src/components/pulse/PulseCard.module.css`
- Create: `apps/web/src/components/pulse/PulseCard.test.tsx`

- [ ] **Step 1: CSS module**

```css
.card {
  position: relative;
  flex: 0 0 240px;
  min-height: 96px;
  padding: 14px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid #eee;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  cursor: pointer;
  text-align: left;
}
.card:hover { border-color: #ccc; }
.dismiss {
  position: absolute;
  top: 4px;
  right: 6px;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #999;
  font-size: 18px;
  line-height: 18px;
  cursor: pointer;
}
.headline { margin: 0; font-size: 15px; font-weight: 600; color: #111; }
.detail { margin: 4px 0 0; font-size: 12px; color: #666; }
```

- [ ] **Step 2: Component**

```tsx
import React from 'react';
import type { PulseCard as PulseCardType } from '@nepally/shared';
import styles from './PulseCard.module.css';

interface Props {
  card: PulseCardType;
  onPress: (card: PulseCardType) => void;
  onDismiss: (card: PulseCardType) => void;
}

function formatFx(card: Extract<PulseCardType, { kind: 'fx_rate' }>): string {
  return `1 USD = ${card.rate.toFixed(2)} NPR`;
}

function formatRelativeDay(daysUntil: number): string {
  if (daysUntil === 0) return 'today';
  if (daysUntil === 1) return 'tomorrow';
  return `in ${daysUntil} days`;
}

function renderBody(card: PulseCardType): { headline: string; detail: string } {
  switch (card.kind) {
    case 'cultural_calendar':
      return { headline: card.title, detail: `Starts ${formatRelativeDay(card.daysUntil)}` };
    case 'metro_highlights':
      return { headline: `${card.count} new in ${card.metroLabel}`, detail: 'in the last 24h' };
    case 'events_this_week':
      return { headline: `${card.count} events this week`, detail: `Next: ${card.nextEventTitle}` };
    case 'fx_rate':
      return { headline: formatFx(card), detail: 'USD · NPR' };
    case 'create_first_post':
      return { headline: card.title, detail: 'Click to create the first post today' };
  }
}

export function PulseCard({ card, onPress, onDismiss }: Props) {
  const { headline, detail } = renderBody(card);
  return (
    <button
      type="button"
      data-testid={`pulse-card-${card.id}`}
      className={styles.card}
      onClick={() => onPress(card)}
    >
      <button
        type="button"
        data-testid={`pulse-card-dismiss-${card.id}`}
        className={styles.dismiss}
        aria-label="Dismiss card"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(card);
        }}
      >
        ×
      </button>
      <p className={styles.headline}>{headline}</p>
      <p className={styles.detail}>{detail}</p>
    </button>
  );
}
```

- [ ] **Step 3: Test**

```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PulseCard } from './PulseCard';
import type { PulseCard as PulseCardType } from '@nepally/shared';

const fx: PulseCardType = {
  kind: 'fx_rate',
  id: 'fx_rate',
  pair: 'USD_NPR',
  rate: 133.25,
  fetchedAt: '2026-04-20T00:00:00Z',
};

describe('PulseCard (web)', () => {
  it('renders an FX card with rate formatted to 2 decimals', () => {
    render(<PulseCard card={fx} onPress={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('1 USD = 133.25 NPR')).toBeInTheDocument();
  });

  it('fires onPress when the card is clicked', () => {
    const onPress = vi.fn();
    render(<PulseCard card={fx} onPress={onPress} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTestId('pulse-card-fx_rate'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('stops propagation on dismiss and calls onDismiss', () => {
    const onPress = vi.fn();
    const onDismiss = vi.fn();
    render(<PulseCard card={fx} onPress={onPress} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('pulse-card-dismiss-fx_rate'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run — expect PASS**

`cd apps/web && npx vitest run src/components/pulse/PulseCard.test.tsx`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/pulse/PulseCard.tsx apps/web/src/components/pulse/PulseCard.module.css apps/web/src/components/pulse/PulseCard.test.tsx
git commit -m "feat(web): PulseCard component"
```

---

### Task I2: `MetroPulseStrip` web component

**Files:**
- Create: `apps/web/src/components/pulse/MetroPulseStrip.tsx`
- Create: `apps/web/src/components/pulse/MetroPulseStrip.module.css`
- Create: `apps/web/src/components/pulse/MetroPulseStrip.test.tsx`

- [ ] **Step 1: CSS**

```css
.wrapper {
  padding: 12px 0;
}
.row {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  overflow-x: auto;
  padding: 0 16px;
  scroll-snap-type: x mandatory;
}
.row > * {
  scroll-snap-align: start;
}
```

- [ ] **Step 2: Component**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getPulseCards, type PulseCard as PulseCardType } from '@nepally/shared';
import { supabase } from '../../lib/supabase';
import { PulseCard } from './PulseCard';
import styles from './MetroPulseStrip.module.css';

interface Props {
  metroAreaId: string;
  metroLabel: string;
}

export function MetroPulseStrip({ metroAreaId, metroLabel }: Props) {
  const [cards, setCards] = useState<PulseCardType[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getPulseCards(supabase, {
        metroAreaId,
        metroLabel,
        dismissedIds,
      });
      if (cancelled) return;
      setCards(res.data?.cards ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [metroAreaId, metroLabel, dismissedIds]);

  const handlePress = useCallback(
    (card: PulseCardType) => {
      switch (card.kind) {
        case 'cultural_calendar':
        case 'events_this_week':
          router.push('/events');
          return;
        case 'create_first_post':
          router.push('/post/new');
          return;
        case 'metro_highlights':
        case 'fx_rate':
          return; // no navigation target in v1
      }
    },
    [router]
  );

  const handleDismiss = useCallback((card: PulseCardType) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(card.id);
      return next;
    });
  }, []);

  if (cards.length === 0) return null;

  return (
    <section className={styles.wrapper} data-testid="metro-pulse-strip" aria-label="Metro pulse">
      <div className={styles.row}>
        {cards.map((card) => (
          <PulseCard
            key={`${card.kind}:${card.id}`}
            card={card}
            onPress={handlePress}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Test**

```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MetroPulseStrip } from './MetroPulseStrip';

const pushMock = vi.fn();
const getPulseCardsMock = vi.fn();

vi.mock('next/router', () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock('../../lib/supabase', () => ({
  supabase: {},
}));
vi.mock('@nepally/shared', () => ({
  getPulseCards: (...args: unknown[]) => getPulseCardsMock(...args),
}));

describe('MetroPulseStrip (web)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    getPulseCardsMock.mockReset();
  });

  it('renders cards from the composer', async () => {
    getPulseCardsMock.mockResolvedValue({
      data: {
        computedAt: '2026-04-20T00:00:00Z',
        cards: [
          { kind: 'fx_rate', id: 'fx_rate', pair: 'USD_NPR', rate: 133.25, fetchedAt: '2026-04-20T00:00:00Z' },
        ],
      },
    });
    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" />);
    await waitFor(() => {
      expect(screen.getByTestId('metro-pulse-strip')).toBeInTheDocument();
    });
  });

  it('navigates to /events when the events card is clicked', async () => {
    getPulseCardsMock.mockResolvedValue({
      data: {
        computedAt: '2026-04-20T00:00:00Z',
        cards: [
          {
            kind: 'events_this_week',
            id: 'events_this_week',
            count: 2,
            nextEventTitle: 'Dashain Meetup',
            nextEventStartsAt: '2026-04-22T18:00:00Z',
            deepLink: '/events',
          },
        ],
      },
    });
    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" />);
    await waitFor(() => {
      expect(screen.getByTestId('pulse-card-events_this_week')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('pulse-card-events_this_week'));
    expect(pushMock).toHaveBeenCalledWith('/events');
  });

  it('hides the strip when no cards are returned', async () => {
    getPulseCardsMock.mockResolvedValue({
      data: { computedAt: '2026-04-20T00:00:00Z', cards: [] },
    });
    render(<MetroPulseStrip metroAreaId="m-1" metroLabel="DFW" />);
    await waitFor(() => {
      expect(screen.queryByTestId('metro-pulse-strip')).toBeNull();
    });
  });
});
```

- [ ] **Step 4: Run — expect PASS**

`cd apps/web && npx vitest run src/components/pulse/MetroPulseStrip.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/pulse/MetroPulseStrip.tsx apps/web/src/components/pulse/MetroPulseStrip.module.css apps/web/src/components/pulse/MetroPulseStrip.test.tsx
git commit -m "feat(web): MetroPulseStrip horizontal scroll container"
```

---

### Task I3: Embed strip in the web feed page

**Files:**
- Modify: `apps/web/src/pages/feed.page.tsx`

- [ ] **Step 1: Import**

Near the other component imports in `feed.page.tsx`:

```tsx
import { MetroPulseStrip } from '../components/pulse/MetroPulseStrip';
```

- [ ] **Step 2: Identify metro variables**

Locate where `activeLocation` / `metroAreaId` / `metroLabel` live in the page. Likely `useLocation()` returns the shape. Use the short label if available; otherwise pass the full metro name.

- [ ] **Step 3: Render the strip**

Find the top of the feed's visible JSX (above the post list / filter chips). Insert:

```tsx
{activeLocation?.metro_area_id ? (
  <MetroPulseStrip
    metroAreaId={activeLocation.metro_area_id}
    metroLabel={activeLocation.short_label ?? activeLocation.metro_name ?? 'your metro'}
  />
) : null}
```

Adapt to the actual property names on `activeLocation` — inspect the file and the `useLocation` hook's return type before committing.

- [ ] **Step 4: Run web tests**

`cd apps/web && npx vitest run` — all tests must pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/feed.page.tsx
git commit -m "feat(web): render MetroPulseStrip above the feed"
```

---

## Phase J — Verification and Wrap-Up

### Task J1: Monorepo verification

- [ ] **Step 1: Shared tests + typecheck**

```
cd packages/shared && npx vitest run
cd packages/shared && npx tsc --noEmit -p tsconfig.json
```

Expected: all green.

- [ ] **Step 2: Rebuild shared dist (apps may read from it)**

```
cd packages/shared && npm run build
```

- [ ] **Step 3: Mobile typecheck + tests**

```
cd /c/Users/shash/Documents/personal-github-repos/nepally && npx tsc --noEmit -p apps/mobile/tsconfig.json
cd apps/mobile && npx jest --silent
```

- [ ] **Step 4: Web typecheck + tests**

```
cd /c/Users/shash/Documents/personal-github-repos/nepally && npx tsc --noEmit -p apps/web/tsconfig.json
cd apps/web && npx vitest run
```

All green before proceeding.

---

### Task J2: Docs + index update

**Files:** Modify: `docs/INDEX.md`

- [ ] **Step 1: Add a plan entry**

In the "Plans (active implementation plans)" section, add:

```markdown
- [plans/active/2026-04-20-pr2-metro-pulse.md](plans/active/2026-04-20-pr2-metro-pulse.md) — PR 2 of "Your Community Today": Metro Pulse card strip [status: planned]
```

- [ ] **Step 2: Commit**

```bash
git add docs/INDEX.md
git commit -m "docs: index PR 2 Metro Pulse plan"
```

---

### Task J3: Request user approval before pushing

- [ ] **Step 1: Summarize for the user**

Print:

```
git log master..HEAD --oneline
git diff --stat master...HEAD
```

Await explicit "push" approval per CLAUDE.md.

- [ ] **Step 2: On approval, push and draft PR**

```
git push -u origin feat/metro-pulse
gh pr create --title "feat: Metro Pulse card strip above home feed" --body "$(cat <<'EOF'
## Summary
- Adds migration 029 (`cultural_events` seed + `fx_rates` cache).
- Shared API: `getUpcomingCulturalEvents`, `getRecentPostsCountByMetro`, `getExchangeRate` (lazy refresh), `getPulseCards` composer.
- Shared logic: pure `assemblePulseCards` with priority + backfill rules.
- UI: `PulseCard` + `MetroPulseStrip` on web and mobile. Strip appears above the home feed.

## Test plan
- [ ] Shared tests pass (composer, lazy FX, logic, cultural events, post count)
- [ ] Mobile tests pass (PulseCard, MetroPulseStrip, HomeScreen smoke)
- [ ] Web tests pass (PulseCard, MetroPulseStrip, feed page smoke)
- [ ] Manual: open home, verify pulse strip renders with ≥1 card
- [ ] Manual: dismiss a card, confirm it disappears for this session
- [ ] Manual: wait 24h (or manually stale `fx_rates.fetched_at`), confirm FX refreshes on next reader
EOF
)"
```

---

## Self-Review Summary

Checked against the spec §3 and the brainstorm decisions:

- **§3.1 Surface** — mobile `FlatList` + web scroll-snap container. ✅ (Task H2, I2)
- **§3.2 Card inventory** — 4 cards in v1 (cultural, metro highlights, events, FX). Follow-suggestions & top-helper deferred to PR 3 per brainstorm. ✅
- **§3.3 Composition rules** — priority order, dismissible per session, empty-metro fallback (create-first-post), error isolation (Promise.allSettled). ✅ (Task F1, G1)
- **§3.4 Ship order** — implemented inside one PR; lazy FX replaces the edge-function bullet per user choice. ✅
- **§9 Error handling** — strip silently hides on total failure; sub-query failures drop individual cards. ✅
- **§10 Testing** — unit tests on each function + component; `await waitFor` for async-useEffect mobile components per apps/mobile/CLAUDE.md. ✅

No placeholders, no missing types, consistent naming across tasks (`PulseCard`, `MetroPulseStrip`, `getPulseCards`, `assemblePulseCards`). Types referenced in later tasks (`PulseCard`, `ExchangeRate`, `CulturalEventRow`) are all defined in earlier tasks.

One known-deferred compromise captured in the plan: card dismissal is in-memory only for v1 (spec's "until tomorrow" persistence is listed as future work, not lost).
