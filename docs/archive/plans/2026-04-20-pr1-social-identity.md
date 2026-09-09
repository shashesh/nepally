---
title: "PR 1: Social identity foundation"
status: implemented
created: 2026-04-20
spec: docs/specs/2026-04-20-your-community-today-design.md
---

# PR 1: Social Identity Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the foundation for the "Your Community Today" engagement feature: a one-directional follow graph + extended opt-in profile fields (hometown district, college, years in US, languages), surfaced in profile edit and public profile views on both web and mobile.

**Architecture:** Shared-first — all types, validation, constants, and Supabase query logic live in `packages/shared` and are consumed by `apps/web` and `apps/mobile` via dependency injection of the Supabase client. Database changes ship in a single additive migration (028) with RLS policies, denormalized counters, and triggers. TDD throughout.

**Tech Stack:** TypeScript, Supabase (PostgreSQL + RLS), Zod validation, React (Next.js 15) for web, React Native (Expo 54) for mobile, Vitest for shared/web tests, Jest for mobile tests.

**Spec:** [docs/specs/2026-04-20-your-community-today-design.md](../specs/2026-04-20-your-community-today-design.md)

**Branch:** `feat/community-today-engagement` (already created; spec committed)

---

## File Structure

### Created
- `supabase/migrations/028_social_identity.sql` — user_follows table, RLS, triggers, extended profile columns
- `packages/shared/src/constants/nepalDistricts.ts` — frozen list of 77 districts
- `packages/shared/src/constants/languages.ts` — supported language enum + display labels
- `packages/shared/src/types/follow.ts` — `UserFollow` type
- `packages/shared/src/api/follows.ts` — follow graph API functions
- `packages/shared/src/api/follows.test.ts` — unit tests
- `apps/mobile/src/screens/profile/components/AboutYouSection.tsx` — extended profile edit block
- `apps/web/src/components/profile/AboutYouSection.tsx` — extended profile edit block (web)
- `apps/web/src/components/profile/AboutYouSection.module.css` — styling
- `apps/web/src/components/users/FollowButton.tsx` — web follow button component
- `apps/web/src/components/users/FollowButton.module.css`
- `apps/mobile/src/components/FollowButton.tsx` — mobile follow button

### Modified
- `packages/shared/src/types/user.ts` — add extended profile fields to `User` interface
- `packages/shared/src/types/index.ts` — export `follow.ts`
- `packages/shared/src/validation/user.ts` — add schemas for extended fields
- `packages/shared/src/api/users.ts` — expand `updateUserProfile` to accept extended fields
- `packages/shared/src/api/users.test.ts` — add tests for extended fields
- `packages/shared/src/api/index.ts` — export `follows.ts`
- `packages/shared/src/constants/index.ts` (or equivalent) — export new constants
- `apps/mobile/src/screens/profile/EditProfileScreen.tsx` — embed AboutYouSection
- `apps/mobile/src/screens/profile/PublicProfileScreen.tsx` — render follow button, counts, extended fields
- `apps/mobile/src/screens/profile/EditProfileScreen.test.tsx` — cover new section
- `apps/mobile/src/screens/profile/PublicProfileScreen.test.tsx` — cover follow button + fields
- `apps/web/src/pages/profile.page.tsx` — embed AboutYouSection
- `apps/web/src/pages/profile.test.tsx` — cover new section
- `apps/web/src/pages/users/[id].page.tsx` — render follow button, counts, extended fields
- `apps/web/src/pages/users/[id].test.tsx` — cover follow button + fields
- `docs/INDEX.md` — add plan entry

---

## Execution Notes

- **Package managers:** `npm` is used at the monorepo root. Shared + web + mobile each have their own `package.json`. Run tests from the relevant workspace dir or use `npm test -w @nepally/shared`.
- **Migration apply:** Use the Supabase `apply_migration` MCP tool against the dev project OR `supabase db push` against a local instance. NEVER re-run 001/002/003.
- **Branch:** stay on `feat/community-today-engagement`. Commit frequently; never push without explicit user OK.
- **TDD order:** tests before implementation in every task; run-to-fail then run-to-pass.

---

## Phase A — Database Foundation

### Task A1: Author migration 028

**Files:**
- Create: `supabase/migrations/028_social_identity.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 028_social_identity.sql
-- ADDITIVE: extended profile columns + one-directional follow graph.
-- See docs/specs/2026-04-20-your-community-today-design.md
--
-- Rollback: write a new forward-only migration that:
--   DROP TRIGGER IF EXISTS user_follows_after_insert ON user_follows;
--   DROP TRIGGER IF EXISTS user_follows_after_delete ON user_follows;
--   DROP TRIGGER IF EXISTS user_blocks_sever_follows ON user_blocks;
--   DROP TABLE IF EXISTS user_follows;
--   ALTER TABLE users
--     DROP COLUMN IF EXISTS hometown_district,
--     DROP COLUMN IF EXISTS college,
--     DROP COLUMN IF EXISTS years_in_us,
--     DROP COLUMN IF EXISTS languages,
--     DROP COLUMN IF EXISTS follower_count,
--     DROP COLUMN IF EXISTS following_count;

-- 1) Extended profile columns (all optional, all NULLable)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS hometown_district text,
  ADD COLUMN IF NOT EXISTS college text,
  ADD COLUMN IF NOT EXISTS years_in_us smallint,
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS follower_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD CONSTRAINT users_college_length_check
    CHECK (college IS NULL OR CHAR_LENGTH(college) <= 100),
  ADD CONSTRAINT users_years_in_us_range_check
    CHECK (years_in_us IS NULL OR (years_in_us >= 0 AND years_in_us <= 99)),
  ADD CONSTRAINT users_follower_count_nonneg CHECK (follower_count >= 0),
  ADD CONSTRAINT users_following_count_nonneg CHECK (following_count >= 0);

COMMENT ON COLUMN users.hometown_district IS
  'One of 77 Nepal districts. Validated in shared/validation/user.ts.';
COMMENT ON COLUMN users.college IS
  'Free-text college/university. Max 100 chars.';
COMMENT ON COLUMN users.years_in_us IS
  'Years the user has lived in the US. Display only.';
COMMENT ON COLUMN users.languages IS
  'Array of language codes. Validated in shared/validation/user.ts.';
COMMENT ON COLUMN users.follower_count IS
  'Denormalized count maintained by user_follows triggers.';
COMMENT ON COLUMN users.following_count IS
  'Denormalized count maintained by user_follows triggers.';

-- 2) user_follows table
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followee ON user_follows (followee_id);

COMMENT ON TABLE user_follows IS
  'One-directional follow graph. See docs/specs/2026-04-20-your-community-today-design.md';

-- 3) Counter triggers
CREATE OR REPLACE FUNCTION bump_follow_counts_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.followee_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION bump_follow_counts_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
  UPDATE users SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.followee_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS user_follows_after_insert ON user_follows;
CREATE TRIGGER user_follows_after_insert
  AFTER INSERT ON user_follows
  FOR EACH ROW EXECUTE FUNCTION bump_follow_counts_on_insert();

DROP TRIGGER IF EXISTS user_follows_after_delete ON user_follows;
CREATE TRIGGER user_follows_after_delete
  AFTER DELETE ON user_follows
  FOR EACH ROW EXECUTE FUNCTION bump_follow_counts_on_delete();

-- 4) RLS
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Public read: follower + followee lists are public.
CREATE POLICY "user_follows_select_all"
  ON user_follows
  FOR SELECT
  USING (true);

-- Follower-only insert; requires Level 1+ (verified).
CREATE POLICY "user_follows_insert_self_verified"
  ON user_follows
  FOR INSERT
  WITH CHECK (
    auth.uid() = follower_id
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND trust_level >= 1
        AND is_banned = false
    )
  );

-- Follower-only delete (unfollow); moderators can remove any.
CREATE POLICY "user_follows_delete_self_or_mod"
  ON user_follows
  FOR DELETE
  USING (
    auth.uid() = follower_id
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- 5) Block-severs-follow trigger.
-- Assumes user_blocks table exists with (blocker_id, blocked_id). If schema
-- differs, adjust column names below.
CREATE OR REPLACE FUNCTION sever_follows_on_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM user_follows
   WHERE (follower_id = NEW.blocker_id AND followee_id = NEW.blocked_id)
      OR (follower_id = NEW.blocked_id AND followee_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_blocks_sever_follows ON user_blocks;
CREATE TRIGGER user_blocks_sever_follows
  AFTER INSERT ON user_blocks
  FOR EACH ROW EXECUTE FUNCTION sever_follows_on_block();
```

- [ ] **Step 2: Verify the existing `user_blocks` column names**

Run: `grep -n "user_blocks" supabase/migrations/*.sql | head -20` (use Grep tool)
Expected: find the table definition and confirm the columns are `blocker_id` and `blocked_id`. If they differ (e.g., `blocker_user_id` / `blocked_user_id`), edit the trigger function body in step 1 to match before proceeding.

- [ ] **Step 3: Apply the migration against the dev Supabase project**

Run: use `supabase db push` OR the Supabase MCP `apply_migration` tool with the contents of `028_social_identity.sql`.
Expected: migration succeeds with no errors; verify with `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('hometown_district','college','years_in_us','languages','follower_count','following_count');` — returns 6 rows.

- [ ] **Step 4: Smoke-test the triggers manually (single session)**

In Supabase SQL editor, as a service-role user:
```sql
-- pick two existing users
SELECT id FROM users LIMIT 2;
-- then, replacing the UUIDs below:
INSERT INTO user_follows (follower_id, followee_id) VALUES ('<A>', '<B>');
SELECT following_count FROM users WHERE id = '<A>';  -- expect 1
SELECT follower_count FROM users WHERE id = '<B>';   -- expect 1
DELETE FROM user_follows WHERE follower_id = '<A>' AND followee_id = '<B>';
SELECT following_count FROM users WHERE id = '<A>';  -- expect 0
SELECT follower_count FROM users WHERE id = '<B>';   -- expect 0
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/028_social_identity.sql
git commit -m "feat(db): add user_follows table + extended profile columns (028)"
```

---

## Phase B — Shared Constants

### Task B1: Nepal districts list

**Files:**
- Create: `packages/shared/src/constants/nepalDistricts.ts`

- [ ] **Step 1: Create the constants file**

```typescript
/**
 * Frozen list of the 77 districts of Nepal.
 * Used to validate `users.hometown_district` and power the dropdown on the
 * profile edit screen.
 *
 * Source: Government of Nepal, Ministry of Federal Affairs and General Administration.
 */

export const NEPAL_DISTRICTS = [
  'Achham', 'Arghakhanchi', 'Baglung', 'Baitadi', 'Bajhang', 'Bajura',
  'Banke', 'Bara', 'Bardiya', 'Bhaktapur', 'Bhojpur', 'Chitwan',
  'Dadeldhura', 'Dailekh', 'Dang', 'Darchula', 'Dhading', 'Dhankuta',
  'Dhanusha', 'Dolakha', 'Dolpa', 'Doti', 'Eastern Rukum', 'Gorkha',
  'Gulmi', 'Humla', 'Ilam', 'Jajarkot', 'Jhapa', 'Jumla',
  'Kailali', 'Kalikot', 'Kanchanpur', 'Kapilvastu', 'Kaski', 'Kathmandu',
  'Kavrepalanchok', 'Khotang', 'Lalitpur', 'Lamjung', 'Mahottari', 'Makwanpur',
  'Manang', 'Morang', 'Mugu', 'Mustang', 'Myagdi', 'Nawalparasi East',
  'Nawalparasi West', 'Nuwakot', 'Okhaldhunga', 'Palpa', 'Panchthar', 'Parbat',
  'Parsa', 'Pyuthan', 'Ramechhap', 'Rasuwa', 'Rautahat', 'Rolpa',
  'Rupandehi', 'Salyan', 'Sankhuwasabha', 'Saptari', 'Sarlahi', 'Sindhuli',
  'Sindhupalchok', 'Siraha', 'Solukhumbu', 'Sunsari', 'Surkhet', 'Syangja',
  'Tanahun', 'Taplejung', 'Terhathum', 'Udayapur', 'Western Rukum',
] as const;

export type NepalDistrict = (typeof NEPAL_DISTRICTS)[number];

export function isNepalDistrict(value: string): value is NepalDistrict {
  return (NEPAL_DISTRICTS as readonly string[]).includes(value);
}
```

- [ ] **Step 2: Export from constants index**

Open `packages/shared/src/index.ts` and add the export line after the existing `constants/` exports:

```typescript
export * from './constants/nepalDistricts';
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck -w @nepally/shared` (from repo root) OR `cd packages/shared && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/constants/nepalDistricts.ts packages/shared/src/index.ts
git commit -m "feat(shared): add Nepal districts constant"
```

---

### Task B2: Supported languages list

**Files:**
- Create: `packages/shared/src/constants/languages.ts`

- [ ] **Step 1: Create the file**

```typescript
/**
 * Supported spoken/written languages surfaced on the public profile.
 * Codes are lowercase English identifiers; labels are user-facing display strings.
 */

export const SUPPORTED_LANGUAGES = [
  'nepali',
  'english',
  'newari',
  'maithili',
  'bhojpuri',
  'tharu',
  'tamang',
  'other',
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  nepali: 'Nepali',
  english: 'English',
  newari: 'Newari',
  maithili: 'Maithili',
  bhojpuri: 'Bhojpuri',
  tharu: 'Tharu',
  tamang: 'Tamang',
  other: 'Other',
};

export function isLanguageCode(value: string): value is LanguageCode {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
```

- [ ] **Step 2: Export from shared index**

Add to `packages/shared/src/index.ts`:

```typescript
export * from './constants/languages';
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck -w @nepally/shared`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/constants/languages.ts packages/shared/src/index.ts
git commit -m "feat(shared): add supported languages constant"
```

---

## Phase C — Shared Types

### Task C1: Extend the User type

**Files:**
- Modify: `packages/shared/src/types/user.ts`

- [ ] **Step 1: Add the new optional fields to `User`**

Open `packages/shared/src/types/user.ts`. Inside the `User` interface, add the fields below under a new `// Social identity` section immediately after the `bio?:` line:

```typescript
  // Social identity (opt-in, added in migration 028)
  hometown_district?: string | null;
  college?: string | null;
  years_in_us?: number | null;
  languages?: string[];
  follower_count?: number;
  following_count?: number;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck -w @nepally/shared`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/user.ts
git commit -m "feat(shared): extend User type with social identity fields"
```

---

### Task C2: UserFollow type

**Files:**
- Create: `packages/shared/src/types/follow.ts`
- Modify: `packages/shared/src/types/index.ts`

- [ ] **Step 1: Create the type file**

```typescript
/**
 * Follow graph row — matches the user_follows table in the DB.
 * snake_case matches DB column names (see docs/decisions/2026-02-16-shared-types-snake-case.md).
 */

export interface UserFollow {
  id: string;
  follower_id: string;
  followee_id: string;
  created_at: string;
}
```

- [ ] **Step 2: Re-export from the types barrel**

Open `packages/shared/src/types/index.ts`. Add:

```typescript
export * from './follow';
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck -w @nepally/shared`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/follow.ts packages/shared/src/types/index.ts
git commit -m "feat(shared): add UserFollow type"
```

---

## Phase D — Shared Validation

### Task D1: Extended profile validation schemas

**Files:**
- Modify: `packages/shared/src/validation/user.ts`

- [ ] **Step 1: Add the schemas**

Append to `packages/shared/src/validation/user.ts` below the existing `bioUpdateSchema`:

```typescript
import {
  NEPAL_DISTRICTS,
  type NepalDistrict,
} from '../constants/nepalDistricts';
import {
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from '../constants/languages';

export const COLLEGE_MAX_LENGTH = 100;
export const YEARS_IN_US_MIN = 0;
export const YEARS_IN_US_MAX = 99;

export const hometownDistrictSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z.enum(NEPAL_DISTRICTS as unknown as [NepalDistrict, ...NepalDistrict[]], {
      errorMap: () => ({ message: 'Select a valid Nepal district' }),
    })
  );

export const hometownDistrictUpdateSchema = hometownDistrictSchema
  .nullable()
  .optional();

export const collegeSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z
      .string()
      .max(
        COLLEGE_MAX_LENGTH,
        `College must be at most ${COLLEGE_MAX_LENGTH} characters`
      )
  )
  .transform((v) => (v.length === 0 ? null : v));

export const collegeUpdateSchema = collegeSchema.nullable().optional();

export const yearsInUsSchema = z
  .number()
  .int('Years in US must be a whole number')
  .min(YEARS_IN_US_MIN, `Years in US must be at least ${YEARS_IN_US_MIN}`)
  .max(YEARS_IN_US_MAX, `Years in US must be at most ${YEARS_IN_US_MAX}`);

export const yearsInUsUpdateSchema = yearsInUsSchema.nullable().optional();

export const languagesSchema = z
  .array(
    z.enum(SUPPORTED_LANGUAGES as unknown as [LanguageCode, ...LanguageCode[]])
  )
  .max(SUPPORTED_LANGUAGES.length, 'Too many languages selected');

export const languagesUpdateSchema = languagesSchema.optional();

/**
 * Partial update payload for the "About You" section of profile edit.
 * All fields optional; unspecified fields are not changed.
 */
export const extendedProfileUpdateSchema = z.object({
  hometown_district: hometownDistrictUpdateSchema,
  college: collegeUpdateSchema,
  years_in_us: yearsInUsUpdateSchema,
  languages: languagesUpdateSchema,
  bio: bioUpdateSchema,
});

export type ExtendedProfileUpdate = z.infer<typeof extendedProfileUpdateSchema>;
```

- [ ] **Step 2: Write tests**

Create `packages/shared/src/validation/user.test.ts` if it does not already exist, OR append to it:

```typescript
import { describe, it, expect } from 'vitest';
import {
  hometownDistrictSchema,
  collegeSchema,
  yearsInUsSchema,
  languagesSchema,
  extendedProfileUpdateSchema,
} from './user';

describe('extended profile validation', () => {
  it('accepts a valid Nepal district', () => {
    expect(hometownDistrictSchema.parse('Kathmandu')).toBe('Kathmandu');
  });

  it('rejects unknown districts', () => {
    expect(() => hometownDistrictSchema.parse('Narnia')).toThrow();
  });

  it('trims college whitespace and normalizes empty to null', () => {
    expect(collegeSchema.parse('  Pulchowk  ')).toBe('Pulchowk');
    expect(collegeSchema.parse('   ')).toBeNull();
  });

  it('rejects college longer than 100 chars', () => {
    expect(() => collegeSchema.parse('x'.repeat(101))).toThrow();
  });

  it('accepts years_in_us in range', () => {
    expect(yearsInUsSchema.parse(5)).toBe(5);
  });

  it('rejects out-of-range years_in_us', () => {
    expect(() => yearsInUsSchema.parse(-1)).toThrow();
    expect(() => yearsInUsSchema.parse(100)).toThrow();
  });

  it('accepts a list of supported language codes', () => {
    expect(languagesSchema.parse(['nepali', 'english'])).toEqual([
      'nepali',
      'english',
    ]);
  });

  it('rejects unsupported language codes', () => {
    expect(() => languagesSchema.parse(['klingon'])).toThrow();
  });

  it('extendedProfileUpdateSchema accepts a fully partial payload', () => {
    const parsed = extendedProfileUpdateSchema.parse({
      hometown_district: 'Kathmandu',
    });
    expect(parsed.hometown_district).toBe('Kathmandu');
    expect(parsed.college).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run tests — expect fail then pass**

Run: `npm test -w @nepally/shared -- validation/user`
Expected: the new tests pass. If the file didn't exist prior, tests pass on the first run because schemas are added in step 1.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/validation/user.ts packages/shared/src/validation/user.test.ts
git commit -m "feat(shared): validation schemas for extended profile fields"
```

---

## Phase E — Shared API: Follow Graph

### Task E1: Write the follows API tests first

**Files:**
- Create: `packages/shared/src/api/follows.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
} from './follows';

function makeChain(final: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'insert', 'delete', 'order', 'limit', 'range', 'single', 'maybeSingle']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // terminal resolvers
  chain.single.mockResolvedValue(final);
  chain.maybeSingle.mockResolvedValue(final);
  return chain;
}

describe('follows api', () => {
  it('followUser inserts a row and returns data', async () => {
    const chain = makeChain({
      data: {
        id: 'f-1',
        follower_id: 'u-1',
        followee_id: 'u-2',
        created_at: '2026-04-20T00:00:00Z',
      },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await followUser(supabase, 'u-1', 'u-2');

    expect(supabase.from).toHaveBeenCalledWith('user_follows');
    expect(chain.insert).toHaveBeenCalledWith({
      follower_id: 'u-1',
      followee_id: 'u-2',
    });
    expect(res.error).toBeUndefined();
    expect(res.data?.follower_id).toBe('u-1');
  });

  it('followUser treats duplicate-key errors as idempotent success', async () => {
    const chain = makeChain({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await followUser(supabase, 'u-1', 'u-2');

    expect(res.error).toBeUndefined();
    expect(res.alreadyFollowing).toBe(true);
  });

  it('followUser rejects self-follow client-side before calling supabase', async () => {
    const supabase = { from: vi.fn() } as unknown as SupabaseClient;
    const res = await followUser(supabase, 'u-1', 'u-1');

    expect(res.error).toBeDefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('unfollowUser deletes the row', async () => {
    const chain = makeChain({ data: null, error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await unfollowUser(supabase, 'u-1', 'u-2');

    expect(supabase.from).toHaveBeenCalledWith('user_follows');
    expect(chain.delete).toHaveBeenCalled();
    expect(res.error).toBeUndefined();
  });

  it('isFollowing returns true when row exists', async () => {
    const chain = makeChain({ data: { id: 'f-1' }, error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await isFollowing(supabase, 'u-1', 'u-2');

    expect(res.data).toBe(true);
  });

  it('isFollowing returns false when row is absent', async () => {
    const chain = makeChain({ data: null, error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await isFollowing(supabase, 'u-1', 'u-2');

    expect(res.data).toBe(false);
  });

  it('getFollowers returns list sorted by created_at desc', async () => {
    const chain = makeChain({ data: null, error: null });
    const list = [
      { id: 'f-1', follower_id: 'a', followee_id: 'u-1', created_at: '2' },
      { id: 'f-2', follower_id: 'b', followee_id: 'u-1', created_at: '1' },
    ];
    // getFollowers awaits the query builder itself, not .single(). Replace the
    // terminal behavior:
    (chain.range as any).mockResolvedValue({ data: list, error: null });

    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getFollowers(supabase, 'u-1', { limit: 20, offset: 0 });

    expect(chain.eq).toHaveBeenCalledWith('followee_id', 'u-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(res.data?.length).toBe(2);
  });

  it('getFollowing filters by follower_id', async () => {
    const chain = makeChain({ data: null, error: null });
    (chain.range as any).mockResolvedValue({ data: [], error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getFollowing(supabase, 'u-1', { limit: 10, offset: 0 });

    expect(chain.eq).toHaveBeenCalledWith('follower_id', 'u-1');
  });
});
```

- [ ] **Step 2: Run the test — expect fail**

Run: `npm test -w @nepally/shared -- api/follows`
Expected: FAIL with "Cannot find module './follows'" or similar.

---

### Task E2: Implement the follows API

**Files:**
- Create: `packages/shared/src/api/follows.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Implement the API**

```typescript
/**
 * Shared Follows API — one-directional follow graph.
 * All functions accept SupabaseClient via dependency injection.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { UserFollow } from '../types/follow';

interface FollowResult {
  data?: UserFollow;
  error?: Error;
  /** True when the follow row already existed (idempotent success). */
  alreadyFollowing?: boolean;
}

interface UnfollowResult {
  error?: Error;
}

interface BoolResult {
  data?: boolean;
  error?: Error;
}

interface FollowListResult {
  data?: UserFollow[];
  error?: Error;
}

interface Pagination {
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function clampLimit(limit: number | undefined): number {
  if (!limit || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}

function toError(raw: unknown, fallback: string): Error {
  if (raw instanceof Error) return raw;
  if (raw && typeof raw === 'object' && 'message' in raw) {
    return new Error(String((raw as { message: unknown }).message));
  }
  return new Error(fallback);
}

/**
 * Follow another user. No-op if the follow already exists.
 * Rejects self-follows client-side (DB also has a CHECK constraint).
 */
export async function followUser(
  supabase: SupabaseClient,
  followerId: string,
  followeeId: string
): Promise<FollowResult> {
  if (followerId === followeeId) {
    return { error: new Error('You cannot follow yourself') };
  }

  try {
    const { data, error } = await supabase
      .from('user_follows')
      .insert({ follower_id: followerId, followee_id: followeeId })
      .select()
      .single();

    if (error) {
      // 23505 = unique_violation (already following); treat as idempotent success.
      if ((error as { code?: string }).code === '23505') {
        return { alreadyFollowing: true };
      }
      throw error;
    }

    return { data: data as UserFollow };
  } catch (error) {
    return { error: toError(error, 'Failed to follow user') };
  }
}

/** Unfollow another user. No-op if the row does not exist. */
export async function unfollowUser(
  supabase: SupabaseClient,
  followerId: string,
  followeeId: string
): Promise<UnfollowResult> {
  try {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followee_id', followeeId);

    if (error) throw error;
    return {};
  } catch (error) {
    return { error: toError(error, 'Failed to unfollow user') };
  }
}

/** Returns true if `followerId` currently follows `followeeId`. */
export async function isFollowing(
  supabase: SupabaseClient,
  followerId: string,
  followeeId: string
): Promise<BoolResult> {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('followee_id', followeeId)
      .maybeSingle();

    if (error) throw error;
    return { data: Boolean(data) };
  } catch (error) {
    return { error: toError(error, 'Failed to check follow status') };
  }
}

/** Users who follow `userId`. Sorted newest-first. */
export async function getFollowers(
  supabase: SupabaseClient,
  userId: string,
  pagination: Pagination = {}
): Promise<FollowListResult> {
  const limit = clampLimit(pagination.limit);
  const offset = Math.max(pagination.offset ?? 0, 0);

  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('*')
      .eq('followee_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: (data ?? []) as UserFollow[] };
  } catch (error) {
    return { error: toError(error, 'Failed to load followers') };
  }
}

/** Users that `userId` follows. Sorted newest-first. */
export async function getFollowing(
  supabase: SupabaseClient,
  userId: string,
  pagination: Pagination = {}
): Promise<FollowListResult> {
  const limit = clampLimit(pagination.limit);
  const offset = Math.max(pagination.offset ?? 0, 0);

  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('*')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: (data ?? []) as UserFollow[] };
  } catch (error) {
    return { error: toError(error, 'Failed to load following') };
  }
}
```

- [ ] **Step 2: Export from the shared index**

Open `packages/shared/src/index.ts` and confirm `export * from './api'` exists (it does per step 1 of Task B1). If follows is not re-exported automatically, open `packages/shared/src/api/index.ts` and add:

```typescript
export * from './follows';
```

(Inspect that file first; if it uses explicit re-exports add one line, if it uses `export *` from each module add the line above.)

- [ ] **Step 3: Run tests — expect pass**

Run: `npm test -w @nepally/shared -- api/follows`
Expected: all 8 tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/api/follows.ts packages/shared/src/api/follows.test.ts packages/shared/src/api/index.ts
git commit -m "feat(shared): follow graph API (follow, unfollow, isFollowing, lists)"
```

---

## Phase F — Shared API: Extended Profile Updates

### Task F1: Expand updateUserProfile to accept extended fields

**Files:**
- Modify: `packages/shared/src/api/users.ts`
- Modify: `packages/shared/src/api/users.test.ts`

- [ ] **Step 1: Add a failing test**

Append to `packages/shared/src/api/users.test.ts`:

```typescript
describe('updateUserProfile — extended fields', () => {
  it('accepts hometown_district, college, years_in_us, languages', async () => {
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.single.mockResolvedValue({
      data: {
        id: 'u-3',
        hometown_district: 'Kathmandu',
        college: 'Pulchowk',
        years_in_us: 5,
        languages: ['nepali', 'english'],
      },
      error: null,
    });
    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await updateUserProfile(supabase, 'u-3', {
      hometown_district: 'Kathmandu',
      college: 'Pulchowk',
      years_in_us: 5,
      languages: ['nepali', 'english'],
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.hometown_district).toBe('Kathmandu');
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        hometown_district: 'Kathmandu',
        college: 'Pulchowk',
        years_in_us: 5,
        languages: ['nepali', 'english'],
      })
    );
  });
});
```

- [ ] **Step 2: Run the test — expect fail**

Run: `npm test -w @nepally/shared -- api/users`
Expected: TypeScript or runtime failure because the `updateUserProfile` signature currently rejects the new fields.

- [ ] **Step 3: Widen the accepted update type**

Open `packages/shared/src/api/users.ts` and change the `updates` parameter in `updateUserProfile` from:

```typescript
  updates: Partial<Pick<User, 'full_name' | 'phone' | 'profile_photo' | 'bio'>>
```

to:

```typescript
  updates: Partial<
    Pick<
      User,
      | 'full_name'
      | 'phone'
      | 'profile_photo'
      | 'bio'
      | 'hometown_district'
      | 'college'
      | 'years_in_us'
      | 'languages'
    >
  >
```

No other logic changes — the existing body already spreads `updates` into the update payload.

- [ ] **Step 4: Run tests — expect pass**

Run: `npm test -w @nepally/shared -- api/users`
Expected: all tests including the new one pass.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/api/users.ts packages/shared/src/api/users.test.ts
git commit -m "feat(shared): updateUserProfile accepts extended identity fields"
```

---

## Phase G — Mobile UI

### Task G1: Build the AboutYouSection mobile component

**Files:**
- Create: `apps/mobile/src/screens/profile/components/AboutYouSection.tsx`

- [ ] **Step 1: Inspect EditProfileScreen for styling conventions**

Run (Read tool): `apps/mobile/src/screens/profile/EditProfileScreen.tsx`
Note: the colors, spacing, and input styles used. The new component must match.

- [ ] **Step 2: Write the component**

```tsx
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  NEPAL_DISTRICTS,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  type LanguageCode,
} from '@nepally/shared';

export interface AboutYouValues {
  hometown_district: string | null;
  college: string | null;
  years_in_us: number | null;
  languages: string[];
}

interface Props {
  values: AboutYouValues;
  onChange: (next: AboutYouValues) => void;
  disabled?: boolean;
}

export function AboutYouSection({ values, onChange, disabled }: Props) {
  const toggleLanguage = (code: LanguageCode) => {
    const set = new Set(values.languages);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    onChange({ ...values, languages: Array.from(set) });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>About You</Text>
      <Text style={styles.sectionSubtitle}>
        Optional. Helps people in your metro find others from home.
      </Text>

      <Text style={styles.label}>Hometown district</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {NEPAL_DISTRICTS.map((d) => {
          const selected = values.hometown_district === d;
          return (
            <TouchableOpacity
              key={d}
              disabled={disabled}
              onPress={() =>
                onChange({
                  ...values,
                  hometown_district: selected ? null : d,
                })
              }
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{d}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.label}>College / university</Text>
      <TextInput
        testID="about-college-input"
        style={styles.input}
        placeholder="e.g. Pulchowk Campus"
        value={values.college ?? ''}
        editable={!disabled}
        onChangeText={(t) => onChange({ ...values, college: t.length === 0 ? null : t })}
        maxLength={100}
      />

      <Text style={styles.label}>Years in the US</Text>
      <TextInput
        testID="about-years-input"
        style={styles.input}
        placeholder="5"
        keyboardType="number-pad"
        value={values.years_in_us === null ? '' : String(values.years_in_us)}
        editable={!disabled}
        onChangeText={(t) => {
          if (t.length === 0) return onChange({ ...values, years_in_us: null });
          const n = parseInt(t, 10);
          if (Number.isFinite(n) && n >= 0 && n <= 99) {
            onChange({ ...values, years_in_us: n });
          }
        }}
      />

      <Text style={styles.label}>Languages you speak</Text>
      <View style={styles.languageGrid}>
        {SUPPORTED_LANGUAGES.map((code) => {
          const selected = values.languages.includes(code);
          return (
            <TouchableOpacity
              key={code}
              disabled={disabled}
              onPress={() => toggleLanguage(code)}
              style={[styles.chip, selected && styles.chipSelected]}
              testID={`about-lang-${code}`}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {LANGUAGE_LABELS[code]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4, color: '#111' },
  sectionSubtitle: { fontSize: 13, color: '#666', marginBottom: 12 },
  label: { fontSize: 14, color: '#333', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  chipRow: { flexDirection: 'row' },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#c8102e', borderColor: '#c8102e' },
  chipText: { color: '#333', fontSize: 13 },
  chipTextSelected: { color: '#fff' },
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/profile/components/AboutYouSection.tsx
git commit -m "feat(mobile): AboutYouSection component for extended profile fields"
```

---

### Task G2: Embed AboutYouSection into EditProfileScreen

**Files:**
- Modify: `apps/mobile/src/screens/profile/EditProfileScreen.tsx`
- Modify: `apps/mobile/src/screens/profile/EditProfileScreen.test.tsx`

- [ ] **Step 1: Add failing test**

Open `EditProfileScreen.test.tsx` and append:

```tsx
it('renders the About You section with the initial values', async () => {
  // reuse the existing render setup used by neighboring tests
  const { findByText, getByTestId } = renderEditProfile({
    user: {
      ...BASE_USER,
      hometown_district: 'Kathmandu',
      college: 'Pulchowk',
      years_in_us: 5,
      languages: ['nepali'],
    },
  });
  await act(async () => {});

  expect(await findByText('About You')).toBeTruthy();
  expect(getByTestId('about-college-input').props.value).toBe('Pulchowk');
  expect(getByTestId('about-years-input').props.value).toBe('5');
});

it('propagates About You changes into updateUserProfile', async () => {
  const updateMock = vi.fn().mockResolvedValue({ data: { id: 'u-1' } });
  const { getByTestId, getByText } = renderEditProfile({
    updateUserProfile: updateMock,
  });
  await act(async () => {});

  await act(async () => {
    fireEvent.changeText(getByTestId('about-college-input'), 'TU Kirtipur');
  });
  await act(async () => {
    fireEvent.press(getByText('Save'));
  });

  expect(updateMock).toHaveBeenCalledWith(
    expect.anything(),
    'u-1',
    expect.objectContaining({ college: 'TU Kirtipur' })
  );
});
```

If helpers `renderEditProfile`, `BASE_USER`, `fireEvent`, `act` do not exist in the neighboring suite, copy their setup from the existing passing test at the top of the same file — do not change those helpers. If the neighboring suite uses a different rendering pattern, mirror it exactly.

- [ ] **Step 2: Run — expect fail**

Run: `npm test -w @nepally/mobile -- EditProfileScreen`
Expected: the two new tests fail ("About You" not found).

- [ ] **Step 3: Embed AboutYouSection into EditProfileScreen**

In `EditProfileScreen.tsx`:

1. Import the section at the top:

```tsx
import { AboutYouSection, type AboutYouValues } from './components/AboutYouSection';
```

2. Add local state alongside the existing profile fields:

```tsx
const [aboutYou, setAboutYou] = useState<AboutYouValues>({
  hometown_district: user?.hometown_district ?? null,
  college: user?.college ?? null,
  years_in_us: user?.years_in_us ?? null,
  languages: user?.languages ?? [],
});
```

3. Render the section just above the Save button:

```tsx
<AboutYouSection values={aboutYou} onChange={setAboutYou} disabled={saving} />
```

4. In the save handler, pass the extended fields into `updateUserProfile`:

```tsx
await updateUserProfile(supabase, user.id, {
  full_name: fullName,
  bio,
  hometown_district: aboutYou.hometown_district,
  college: aboutYou.college,
  years_in_us: aboutYou.years_in_us,
  languages: aboutYou.languages,
});
```

Preserve existing update call arguments — only add the new fields.

- [ ] **Step 4: Run — expect pass**

Run: `npm test -w @nepally/mobile -- EditProfileScreen`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/profile/EditProfileScreen.tsx apps/mobile/src/screens/profile/EditProfileScreen.test.tsx
git commit -m "feat(mobile): wire AboutYouSection into EditProfileScreen"
```

---

### Task G3: Mobile FollowButton component

**Files:**
- Create: `apps/mobile/src/components/FollowButton.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import { followUser, unfollowUser, isFollowing } from '@nepally/shared';

interface Props {
  supabase: SupabaseClient;
  viewerId: string | null;
  targetUserId: string;
  onChange?: (nowFollowing: boolean) => void;
}

export function FollowButton({ supabase, viewerId, targetUserId, onChange }: Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const [following, setFollowing] = useState<boolean>(false);

  useEffect(() => {
    if (!viewerId || viewerId === targetUserId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await isFollowing(supabase, viewerId, targetUserId);
      if (!cancelled) {
        setFollowing(Boolean(res.data));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, viewerId, targetUserId]);

  if (!viewerId || viewerId === targetUserId) return null;

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    const prev = following;
    setFollowing(!prev);
    const res = prev
      ? await unfollowUser(supabase, viewerId, targetUserId)
      : await followUser(supabase, viewerId, targetUserId);
    if (res.error) setFollowing(prev); // roll back
    else onChange?.(!prev);
    setLoading(false);
  };

  return (
    <TouchableOpacity
      testID="follow-button"
      style={[styles.btn, following ? styles.btnFollowing : styles.btnFollow]}
      onPress={toggle}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={following ? '#111' : '#fff'} />
      ) : (
        <Text style={[styles.label, following ? styles.labelFollowing : styles.labelFollow]}>
          {following ? 'Following' : 'Follow'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFollow: { backgroundColor: '#c8102e' },
  btnFollowing: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  label: { fontSize: 14, fontWeight: '600' },
  labelFollow: { color: '#fff' },
  labelFollowing: { color: '#111' },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/FollowButton.tsx
git commit -m "feat(mobile): FollowButton component"
```

---

### Task G4: Surface FollowButton + extended fields on PublicProfileScreen

**Files:**
- Modify: `apps/mobile/src/screens/profile/PublicProfileScreen.tsx`
- Modify: `apps/mobile/src/screens/profile/PublicProfileScreen.test.tsx`

- [ ] **Step 1: Add failing tests**

Append to `PublicProfileScreen.test.tsx`:

```tsx
it('renders follow button, counts, and extended fields', async () => {
  const { findByTestId, findByText } = renderPublicProfile({
    user: {
      ...BASE_USER,
      id: 'target-1',
      hometown_district: 'Pokhara',
      college: 'Pulchowk',
      years_in_us: 6,
      languages: ['nepali', 'newari'],
      follower_count: 12,
      following_count: 4,
    },
    viewerId: 'viewer-1',
  });
  await act(async () => {});

  expect(await findByTestId('follow-button')).toBeTruthy();
  expect(await findByText('12 followers')).toBeTruthy();
  expect(await findByText('4 following')).toBeTruthy();
  expect(await findByText('Pokhara')).toBeTruthy();
  expect(await findByText('Pulchowk')).toBeTruthy();
  expect(await findByText('6 years in US')).toBeTruthy();
});

it('hides empty extended fields gracefully', async () => {
  const { queryByText } = renderPublicProfile({
    user: {
      ...BASE_USER,
      id: 'target-2',
      hometown_district: null,
      college: null,
      years_in_us: null,
      languages: [],
    },
    viewerId: 'viewer-1',
  });
  await act(async () => {});

  expect(queryByText(/years in US/)).toBeNull();
});
```

Use the existing `renderPublicProfile` helper / `BASE_USER` fixture from the same file; do not introduce new helpers.

- [ ] **Step 2: Run — expect fail**

Run: `npm test -w @nepally/mobile -- PublicProfileScreen`

- [ ] **Step 3: Implement UI**

Inside `PublicProfileScreen.tsx`:

1. Import at the top:
```tsx
import { FollowButton } from '../../components/FollowButton';
import { LANGUAGE_LABELS, type LanguageCode } from '@nepally/shared';
```

2. Below the existing name/trust-badge area, render:

```tsx
{viewerId && viewerId !== user.id && (
  <FollowButton
    supabase={supabase}
    viewerId={viewerId}
    targetUserId={user.id}
  />
)}

<View style={styles.countsRow}>
  <Text style={styles.count}>{user.follower_count ?? 0} followers</Text>
  <Text style={styles.countDot}>·</Text>
  <Text style={styles.count}>{user.following_count ?? 0} following</Text>
</View>

<View style={styles.chipsRow}>
  {user.hometown_district && (
    <View style={styles.chip}><Text style={styles.chipText}>{user.hometown_district}</Text></View>
  )}
  {user.college && (
    <View style={styles.chip}><Text style={styles.chipText}>{user.college}</Text></View>
  )}
  {typeof user.years_in_us === 'number' && (
    <View style={styles.chip}><Text style={styles.chipText}>{user.years_in_us} years in US</Text></View>
  )}
  {(user.languages ?? []).map((code) => (
    <View key={code} style={styles.chip}>
      <Text style={styles.chipText}>{LANGUAGE_LABELS[code as LanguageCode] ?? code}</Text>
    </View>
  ))}
</View>
```

3. Add to the `StyleSheet.create` block at the bottom:

```tsx
countsRow: { flexDirection: 'row', marginTop: 12 },
count: { fontSize: 14, color: '#555' },
countDot: { marginHorizontal: 6, color: '#999' },
chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
chip: {
  backgroundColor: '#f4f4f4',
  borderRadius: 14,
  paddingHorizontal: 10,
  paddingVertical: 4,
  marginRight: 6,
  marginBottom: 6,
},
chipText: { fontSize: 12, color: '#333' },
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -w @nepally/mobile -- PublicProfileScreen`
Expected: both new tests pass; existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/profile/PublicProfileScreen.tsx apps/mobile/src/screens/profile/PublicProfileScreen.test.tsx
git commit -m "feat(mobile): show follow button, counts, and identity fields on public profile"
```

---

## Phase H — Web UI

### Task H1: Build the web AboutYouSection component

**Files:**
- Create: `apps/web/src/components/profile/AboutYouSection.tsx`
- Create: `apps/web/src/components/profile/AboutYouSection.module.css`

- [ ] **Step 1: CSS module**

```css
.section { margin-top: 32px; }
.title { font-size: 18px; font-weight: 600; color: #111; margin: 0 0 4px; }
.subtitle { font-size: 13px; color: #666; margin: 0 0 16px; }
.label { display: block; font-size: 14px; color: #333; margin: 16px 0 6px; }
.input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 15px;
  background: #fff;
}
.select { composes: input; }
.chipGrid { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid #ccc;
  background: #fff;
  color: #333;
  cursor: pointer;
  font-size: 13px;
}
.chipSelected {
  background: #c8102e;
  color: #fff;
  border-color: #c8102e;
}
```

- [ ] **Step 2: Component**

```tsx
import React from 'react';
import {
  NEPAL_DISTRICTS,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  type LanguageCode,
} from '@nepally/shared';
import styles from './AboutYouSection.module.css';

export interface AboutYouValues {
  hometown_district: string | null;
  college: string | null;
  years_in_us: number | null;
  languages: string[];
}

interface Props {
  values: AboutYouValues;
  onChange: (next: AboutYouValues) => void;
  disabled?: boolean;
}

export function AboutYouSection({ values, onChange, disabled }: Props) {
  const toggleLanguage = (code: LanguageCode) => {
    const set = new Set(values.languages);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    onChange({ ...values, languages: Array.from(set) });
  };

  return (
    <section className={styles.section} aria-labelledby="about-you-title">
      <h3 id="about-you-title" className={styles.title}>About You</h3>
      <p className={styles.subtitle}>
        Optional. Helps people in your metro find others from home.
      </p>

      <label className={styles.label} htmlFor="about-district">
        Hometown district
      </label>
      <select
        id="about-district"
        className={styles.select}
        disabled={disabled}
        value={values.hometown_district ?? ''}
        onChange={(e) =>
          onChange({
            ...values,
            hometown_district: e.target.value === '' ? null : e.target.value,
          })
        }
      >
        <option value="">— Select —</option>
        {NEPAL_DISTRICTS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      <label className={styles.label} htmlFor="about-college">
        College / university
      </label>
      <input
        id="about-college"
        className={styles.input}
        placeholder="e.g. Pulchowk Campus"
        value={values.college ?? ''}
        disabled={disabled}
        maxLength={100}
        onChange={(e) =>
          onChange({
            ...values,
            college: e.target.value.length === 0 ? null : e.target.value,
          })
        }
      />

      <label className={styles.label} htmlFor="about-years">Years in the US</label>
      <input
        id="about-years"
        className={styles.input}
        type="number"
        min={0}
        max={99}
        placeholder="5"
        disabled={disabled}
        value={values.years_in_us === null ? '' : values.years_in_us}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw.length === 0) return onChange({ ...values, years_in_us: null });
          const n = parseInt(raw, 10);
          if (Number.isFinite(n) && n >= 0 && n <= 99) {
            onChange({ ...values, years_in_us: n });
          }
        }}
      />

      <label className={styles.label}>Languages you speak</label>
      <div className={styles.chipGrid} role="group" aria-label="Languages">
        {SUPPORTED_LANGUAGES.map((code) => {
          const selected = values.languages.includes(code);
          return (
            <button
              key={code}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
              onClick={() => toggleLanguage(code)}
            >
              {LANGUAGE_LABELS[code]}
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck -w @nepally/web`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/profile/AboutYouSection.tsx apps/web/src/components/profile/AboutYouSection.module.css
git commit -m "feat(web): AboutYouSection component"
```

---

### Task H2: Wire AboutYouSection into the web profile page

**Files:**
- Modify: `apps/web/src/pages/profile.page.tsx`
- Modify: `apps/web/src/pages/profile.test.tsx`

- [ ] **Step 1: Add failing test**

Append to `apps/web/src/pages/profile.test.tsx`:

```tsx
it('renders the About You section with initial values', async () => {
  renderProfilePage({
    user: {
      ...BASE_USER,
      hometown_district: 'Kathmandu',
      college: 'Pulchowk',
      years_in_us: 5,
      languages: ['nepali'],
    },
  });
  await act(async () => {});

  expect(screen.getByText('About You')).toBeInTheDocument();
  expect((screen.getByLabelText('Hometown district') as HTMLSelectElement).value).toBe(
    'Kathmandu'
  );
  expect((screen.getByLabelText('College / university') as HTMLInputElement).value).toBe(
    'Pulchowk'
  );
});

it('sends About You values to updateUserProfile on save', async () => {
  const updateMock = vi.fn().mockResolvedValue({ data: { id: 'u-1' } });
  renderProfilePage({ updateUserProfile: updateMock });
  await act(async () => {});

  await act(async () => {
    fireEvent.change(screen.getByLabelText('Hometown district'), {
      target: { value: 'Pokhara' },
    });
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
  });

  expect(updateMock).toHaveBeenCalledWith(
    expect.anything(),
    'u-1',
    expect.objectContaining({ hometown_district: 'Pokhara' })
  );
});
```

Use existing test helpers (`renderProfilePage`, `BASE_USER`) from the same file.

- [ ] **Step 2: Run — expect fail**

Run: `npm test -w @nepally/web -- profile`

- [ ] **Step 3: Wire the section into the page**

In `profile.page.tsx`:

1. Import:
```tsx
import { AboutYouSection, type AboutYouValues } from '../components/profile/AboutYouSection';
```

2. Add state:
```tsx
const [aboutYou, setAboutYou] = useState<AboutYouValues>({
  hometown_district: user?.hometown_district ?? null,
  college: user?.college ?? null,
  years_in_us: user?.years_in_us ?? null,
  languages: user?.languages ?? [],
});
```

3. Render above the Save button.

4. Include the fields in the save handler payload alongside existing fields.

- [ ] **Step 4: Run — expect pass**

Run: `npm test -w @nepally/web -- profile`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/profile.page.tsx apps/web/src/pages/profile.test.tsx
git commit -m "feat(web): wire AboutYouSection into profile edit page"
```

---

### Task H3: Web FollowButton component

**Files:**
- Create: `apps/web/src/components/users/FollowButton.tsx`
- Create: `apps/web/src/components/users/FollowButton.module.css`

- [ ] **Step 1: CSS module**

```css
.btn {
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  min-width: 100px;
}
.follow { background: #c8102e; color: #fff; }
.following { background: #fff; color: #111; border-color: #ccc; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
```

- [ ] **Step 2: Component**

```tsx
import React, { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { followUser, unfollowUser, isFollowing } from '@nepally/shared';
import styles from './FollowButton.module.css';

interface Props {
  supabase: SupabaseClient;
  viewerId: string | null;
  targetUserId: string;
  onChange?: (nowFollowing: boolean) => void;
}

export function FollowButton({ supabase, viewerId, targetUserId, onChange }: Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const [following, setFollowing] = useState<boolean>(false);

  useEffect(() => {
    if (!viewerId || viewerId === targetUserId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await isFollowing(supabase, viewerId, targetUserId);
      if (!cancelled) {
        setFollowing(Boolean(res.data));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, viewerId, targetUserId]);

  if (!viewerId || viewerId === targetUserId) return null;

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    const prev = following;
    setFollowing(!prev);
    const res = prev
      ? await unfollowUser(supabase, viewerId, targetUserId)
      : await followUser(supabase, viewerId, targetUserId);
    if (res.error) setFollowing(prev);
    else onChange?.(!prev);
    setLoading(false);
  };

  return (
    <button
      type="button"
      data-testid="follow-button"
      aria-pressed={following}
      className={`${styles.btn} ${following ? styles.following : styles.follow}`}
      disabled={loading}
      onClick={toggle}
    >
      {loading ? '…' : following ? 'Following' : 'Follow'}
    </button>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck -w @nepally/web`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/users/FollowButton.tsx apps/web/src/components/users/FollowButton.module.css
git commit -m "feat(web): FollowButton component"
```

---

### Task H4: Surface FollowButton + extended fields on `/users/[id]`

**Files:**
- Modify: `apps/web/src/pages/users/[id].page.tsx`
- Modify: `apps/web/src/pages/users/[id].test.tsx`

- [ ] **Step 1: Add failing tests**

Append to `apps/web/src/pages/users/[id].test.tsx`:

```tsx
it('renders follow button, counts, and identity chips', async () => {
  renderUserPage({
    user: {
      ...BASE_USER,
      id: 'target-1',
      hometown_district: 'Pokhara',
      college: 'Pulchowk',
      years_in_us: 6,
      languages: ['nepali', 'newari'],
      follower_count: 12,
      following_count: 4,
    },
    viewerId: 'viewer-1',
  });
  await act(async () => {});

  expect(screen.getByTestId('follow-button')).toBeInTheDocument();
  expect(screen.getByText(/12 followers/)).toBeInTheDocument();
  expect(screen.getByText(/4 following/)).toBeInTheDocument();
  expect(screen.getByText('Pokhara')).toBeInTheDocument();
  expect(screen.getByText('Pulchowk')).toBeInTheDocument();
  expect(screen.getByText('6 years in US')).toBeInTheDocument();
});

it('hides identity chips that are empty', async () => {
  renderUserPage({
    user: {
      ...BASE_USER,
      id: 'target-2',
      hometown_district: null,
      college: null,
      years_in_us: null,
      languages: [],
    },
    viewerId: 'viewer-1',
  });
  await act(async () => {});

  expect(screen.queryByText(/years in US/)).toBeNull();
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npm test -w @nepally/web -- users`

- [ ] **Step 3: Update the page**

In `[id].page.tsx`:

1. Import:
```tsx
import { FollowButton } from '../../components/users/FollowButton';
import { LANGUAGE_LABELS, type LanguageCode } from '@nepally/shared';
```

2. Below the existing name/trust-badge block, render:

```tsx
<div className={styles.socialRow}>
  <FollowButton
    supabase={supabase}
    viewerId={viewerId}
    targetUserId={user.id}
  />
  <span className={styles.count}>{user.follower_count ?? 0} followers</span>
  <span className={styles.countDot}>·</span>
  <span className={styles.count}>{user.following_count ?? 0} following</span>
</div>

<div className={styles.chipRow}>
  {user.hometown_district && <span className={styles.chip}>{user.hometown_district}</span>}
  {user.college && <span className={styles.chip}>{user.college}</span>}
  {typeof user.years_in_us === 'number' && (
    <span className={styles.chip}>{user.years_in_us} years in US</span>
  )}
  {(user.languages ?? []).map((code) => (
    <span key={code} className={styles.chip}>
      {LANGUAGE_LABELS[code as LanguageCode] ?? code}
    </span>
  ))}
</div>
```

4. Add to the page's existing CSS module (find the matching `.module.css`):

```css
.socialRow { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
.count { font-size: 14px; color: #555; }
.countDot { color: #999; }
.chipRow { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.chip {
  background: #f4f4f4;
  border-radius: 14px;
  padding: 4px 10px;
  font-size: 12px;
  color: #333;
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -w @nepally/web -- users`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/users/[id].page.tsx apps/web/src/pages/users/[id].test.tsx apps/web/src/pages/users/*.module.css
git commit -m "feat(web): show follow button, counts, and identity chips on public profile"
```

---

## Phase I — Verification and Wrap-Up

### Task I1: Full monorepo test

**Files:** none

- [ ] **Step 1: Run shared tests**

Run: `npm test -w @nepally/shared`
Expected: pass.

- [ ] **Step 2: Run mobile tests**

Run: `npm test -w @nepally/mobile`
Expected: pass.

- [ ] **Step 3: Run web tests**

Run: `npm test -w @nepally/web`
Expected: pass.

- [ ] **Step 4: Monorepo typecheck**

Run: `npm run typecheck`
Expected: clean across all workspaces.

- [ ] **Step 5: Build sanity (web)**

Run: `npm run build -w @nepally/web`
Expected: success.

---

### Task I2: Docs + index update

**Files:**
- Modify: `docs/INDEX.md`

- [ ] **Step 1: Add the plan to the index**

In `docs/INDEX.md`, under the "Plans (active implementation plans)" section, add:

```markdown
- [plans/active/2026-04-20-pr1-social-identity.md](plans/active/2026-04-20-pr1-social-identity.md) — PR 1 of "Your Community Today": follow graph + extended profile [status: planned]
```

- [ ] **Step 2: Commit**

```bash
git add docs/INDEX.md
git commit -m "docs: index PR 1 Social Identity plan"
```

---

### Task I3: Open a pull request (manual step, ask the user)

**Files:** none

- [ ] **Step 1: Confirm with the user before pushing**

Per CLAUDE.md: `git push` always requires explicit user confirmation. Before pushing, print the summary:

- Branch: `feat/community-today-engagement`
- Commits: run `git log master..HEAD --oneline`
- Diff stat: `git diff --stat master...HEAD`

Ask the user for explicit approval to run `git push -u origin feat/community-today-engagement`.

- [ ] **Step 2: On approval, push and open the PR**

Run: `git push -u origin feat/community-today-engagement`
Then draft the PR body:

```
## Summary
- Adds one-directional follow graph (user_follows) with triggers + RLS (migration 028)
- Adds extended opt-in profile fields: hometown district, college, years in US, languages
- Shared API: followUser / unfollowUser / isFollowing / getFollowers / getFollowing
- UI: "About You" section on profile edit (web + mobile); FollowButton + counters + identity chips on public profile (web + mobile)

## Test plan
- [ ] Shared unit tests pass (follows, validation, updateUserProfile extended)
- [ ] Mobile component tests pass (EditProfileScreen, PublicProfileScreen)
- [ ] Web component tests pass (profile page, users/[id] page)
- [ ] Manual: follow another user, confirm counters update, unfollow, confirm rollback
- [ ] Manual: block a user, confirm both follow directions are severed
- [ ] Manual: Level 0 user cannot follow (RLS rejects)
```

---

## Self-Review Summary

Checked the plan against the spec:

- **§3 Metro Pulse** — deferred to PR 2 (explicit scope).
- **§4.1 Extended profile fields** — covered by Task A1 + C1 + D1 + G1/G2 + H1/H2. `bio` already shipped (migration 025) — not re-covered.
- **§4.2 Follow graph** — covered by Task A1 (schema, RLS, triggers) + E1/E2 (API) + G3/G4 + H3/H4 (UI).
- **§4.3 Helper reputation** — deferred to PR 3 (explicit scope).
- **§9 Error handling** — covered inline (idempotent follow on duplicate, rollback on error in FollowButton).
- **§10 Testing** — every new function has unit tests; every UI touchpoint has a component test.

No placeholders; all code blocks are complete; types referenced in later tasks (`AboutYouValues`, `UserFollow`, `LanguageCode`, `LANGUAGE_LABELS`, `NEPAL_DISTRICTS`) are defined in earlier tasks. Method names are consistent across tasks (`followUser`, `unfollowUser`, `isFollowing`, `getFollowers`, `getFollowing`).
