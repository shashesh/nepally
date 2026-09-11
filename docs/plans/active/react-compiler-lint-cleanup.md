---
title: React Compiler lint cleanup
status: planned
created: 2026-09-10
---

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
