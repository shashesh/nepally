---
title: React Compiler lint cleanup
status: implemented
created: 2026-09-10
---

> **Outcome (2026-09-18):** done in one pass on `chore/fix-lint-warnings`.
> `npm run lint` went from 174 warnings (135 mobile, 39 web, including 2
> `no-unused-vars` in `apps/mobile/create-placeholder-assets.js`) to 0. The
> `warn` overrides were deleted from both ESLint configs, so all five rules are
> back to the plugin's `recommended` severity, `error`. No `eslint-disable` was
> added, and four stale `react-hooks/exhaustive-deps` disables were removed.
> Fixes are code changes, not suppressions. The fix patterns, each checked
> against the plugin, are summarised in
> [setup-and-testing.md](../../guides/setup-and-testing.md#issue-react-hooks-lint-errors-react-compiler-rules).
> Several fixes also closed real bugs:
>
> - Stale responses overwriting newer ones: cancel flags on every
>   effect-driven fetch.
> - FollowButton showing an enabled "Follow" before the status loaded.
> - The web home-metro lookup overwriting a metro the user had just picked.
> - A second ProfileScreen toast being wiped mid-fade.
> - Pull-to-refresh spinners stuck on the no-metro and no-user paths.
>
> The "days since refresh" and "days until soft expiry" math, previously
> duplicated across both apps, now lives in `@nepally/shared`
> (`getDaysSinceRefresh`, `getDaysUntilSoftExpiry`). Components get the time
> from a `useNow()` hook, one in each app, which updates every minute. That
> keeps "Open now" and day counts current on screens that stay mounted, such
> as the mobile Profile tab.
>
> Follow-ups deliberately left out of scope:
>
> - Shared `formatRelativeTime` still reads the clock itself. Give it a `now`
>   parameter.
> - The feed first-page load, the web post-edit form and web notifications
>   realtime depend on the whole `user` object, which is replaced on every
>   token refresh. They should depend on `user?.id`.
> - The web active location was never actually restored from localStorage, so
>   the dead read was removed. Restoring the last-chosen metro is a product
>   decision.
> - Three pre-existing `exhaustive-deps` disables remain in mobile
>   `CreatePostScreen.tsx`: the draft prompt and the header `setOptions`.
> - From PR #71's review: a profile fetch that is in flight when the user
>   signs out can repopulate the signed-out user. Web `fetchUserProfile` and
>   mobile `refreshUser` both need a sign-out generation guard.
> - Also from that review: the mobile home-metro lookup
>   (`initActiveLocationFromUser`) can overwrite a metro picked while it is
>   pending. Web fixed this in #71; mobile needs its own change because of its
>   once-per-user init guard.

# React Compiler Lint Cleanup

## Why this exists

Upgrading the lint toolchain to ESLint 10 brought `eslint-plugin-react-hooks`
from v4 to v7. v7 ships the React Compiler rule set, which v4 did not have, and
its `recommended` config turns those rules on as **errors**.

That surfaced 169 pre-existing findings in application code. They are real
signals — the rules describe patterns that break under the React Compiler and
that can cause stale renders today — but fixing them is application refactoring
with behavior risk, not part of a toolchain upgrade. Landing them together
would have made the upgrade unreviewable.

So the five new rules are set to `warn` in both `eslint.config.mjs` (monorepo
root, covers mobile + shared) and `apps/web/eslint.config.mjs`. Lint exits 0,
CI stays honest about actual errors, and the findings stay visible.

**Nothing regressed here.** These findings existed before the upgrade; the old
toolchain simply could not see them.

## Current state

Counts as of 2026-09-10, immediately after the ESLint 10 migration:

| Rule | mobile | web | total |
|---|---|---|---|
| `react-hooks/refs` | 90 | 2 | 92 |
| `react-hooks/set-state-in-effect` | 17 | 26 | 43 |
| `react-hooks/preserve-manual-memoization` | 12 | 4 | 16 |
| `react-hooks/immutability` | 12 | 2 | 14 |
| `react-hooks/purity` | 2 | 2 | 4 |
| **Total** | **133** | **36** | **169** |

`packages/shared` is clean — these rules only apply to component code.

Regenerate the breakdown with:

```bash
npm run lint --workspace=apps/mobile -- -f json > mobile.json
npm run lint --workspace=apps/web -- -f json > web.json
```

## Approach

Burn down one rule at a time, smallest first, promoting each back to `error` in
**both** config files as it reaches zero. Keeping the two files in step matters —
web inherits these rules from `eslint-config-next`, not from the root config.

Suggested order (ascending risk, not ascending count):

1. **`react-hooks/purity`** (4) — smallest, and each is usually a
   `Math.random()` / `Date.now()` call that moves into an effect or a ref.
2. **`react-hooks/immutability`** (14) — mutation of props or state objects;
   fix by copying before mutating.
3. **`react-hooks/preserve-manual-memoization`** (16) — `useMemo`/`useCallback`
   dependency arrays the compiler cannot verify. Often the memo is unnecessary.
4. **`react-hooks/set-state-in-effect`** (43) — the highest-value group.
   Most are derived state that should be computed during render, or an effect
   that should be an event handler. See
   <https://react.dev/learn/you-might-not-need-an-effect>.
5. **`react-hooks/refs`** (92) — largest, and concentrated in mobile. Reading
   `ref.current` during render. Usually resolved by moving the read into an
   event handler or effect.

## Constraints

- Per CLAUDE.md, any behavior change needs its unit tests updated in the same
  change. Several of these fixes *are* behavior changes (that is the point of
  the rule) — budget for test work, not just source edits.
- `react-hooks/refs` in mobile is concentrated in a few large screens
  (`ProfileScreen.tsx` among them). Split by file, not by rule, once that rule
  comes up.

## Definition of done

All five rules set to `error` in both config files, with `npm run lint` clean,
and this document moved to `docs/archive/` with `status: implemented`.
