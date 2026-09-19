# ADR: Spend GitHub Actions Minutes Only on Code That Is Ready to Merge

**Date:** 2026-09-19
**Status:** Accepted
**Category:** CI / Tooling

## Context

The repo is private on GitHub Free, which includes 2,000 Actions minutes a month. By mid-September 2026 that budget was nearly used up.

GitHub bills each job rounded up to a whole minute, so the number of jobs matters as much as how long they run. A job that only echoes a line costs a full minute.

Measured on PR #76 (2026-09-18), every push to a code PR cost:

| Workflow | Jobs | Billed minutes |
|---|---|---|
| CI | 8 (PR gate, Lint, Lint guards, Type check, Unit tests, Coverage, Web E2E, Web visual) | ~21 |
| Docs | 2 | 2 |
| Vercel preview | 1 | ~2 (one hung upload billed 34; the job had no timeout) |
| Copilot code review | 1 | ~4 |

Merging then ran CI again on master (~21) plus the dev deploy (~2).

Everything ran on every push: draft PRs, docs-only PRs, and runs that a newer push had already made obsolete. The Unit tests and Coverage jobs ran the same tests twice.

Two more facts shaped the decision:

- **Branch protection is not enforced.** Rulesets and branch protection need GitHub Pro for private repos (the API returns 403). `.github/rulesets/master-protection-strict.json` records the intended rules, but no required status checks exist.
- **The production deploy guard could never pass.** It looked for check names like `Lint`. Jobs that call a reusable workflow report as `Lint / run`, so the guard always failed with "missing required checks".

## Decision

**Actions minutes are spent only on code that is ready to merge.**

1. **Draft PRs run nothing.** CI, Docs and the Vercel preview skip every job while the PR is a draft. Skipped jobs cost nothing.
2. **PRs open as drafts, and the user starts CI.**
   - Copilot reviews the draft first.
   - Agents request that review themselves (`gh pr edit <number> --add-reviewer @copilot`), and again after pushing fixes. Copilot's "review draft pull requests" option lives in rulesets, which this repo cannot use.
   - The user marks the PR ready for review. The `ready_for_review` event starts CI. Agents never mark a PR ready.
3. **Docs-only changes never start CI.** `ci.yml` ignores `**/*.md` and `docs/**` (`paths-ignore`) on PRs and on master pushes. The Docs workflow still checks those changes.
4. **Fewer, fuller jobs.**
   - **Static checks:** lint, lint guards and type check in one job. Each check runs even if an earlier one fails, so one run reports every problem.
   - **Unit tests:** `npm run test:coverage:ci`, which runs the guard tests and then every workspace's tests with coverage. The separate `test:ci` job re-ran the same tests without coverage.
   - **Web E2E tests** and **Web visual regression:** unchanged.
   - The echo-only **PR gate** job is gone. Docs checker tests and Docs check are one **Docs check** job.
5. **A new push cancels the PR's older runs** of CI, Docs and the preview.
6. **Vercel deploy jobs time out:** 10 minutes for preview and dev, 15 for production. A healthy deploy takes about 2.
7. **CI still runs on every code merge to master.** With no enforced branch protection, it is the only check of the merged result, and the dev deploy waits for it.
8. **The production guard checks the CI run, not check names.** `scripts/ci/prod-deploy-guard.js` deploys master's head when either:
   - the latest successful CI run on master is for that commit, or
   - that run is for an ancestor, and every commit since then is docs-only.

   It trusts CI runs from pushes to master and from manual runs (`workflow_dispatch`, added to `ci.yml` for this). When it can't prove master is tested, it asks for a manual CI run on master. The guard has unit tests. One test fails if `ci.yml`'s ignore list drifts from the guard's list.

## Consequences

- **Billed minutes per push**, estimated from the 2026-09-18 timings. Copilot's review is extra, ~4 each time it runs.

  | Push | Before | After |
  |---|---|---|
  | Draft PR | up to ~25 | 0 |
  | Docs-only PR | ~23 | 1 |
  | Code PR, ready for review | up to ~25 | ~15 |

  "Up to" means the preview and Docs ran too because web code or docs changed.

- **Draft PRs show skipped checks.** Skipped does not mean passed. Commits pushed while in draft are first tested when the PR is marked ready.
- **Docs-only pushes to a code PR still run full CI.** Path filters compare the whole PR with `master`, not the latest push.
- **Path filters see only the first 300 changed files.** A change touching more than 300 docs files and some code might not start CI. Run **CI Manual** on the branch in that case.
- **Enforcing the ruleset needs a CI change first.** If the repo moves to Pro, goes public and turns on the ruleset, docs-only PRs would wait forever for required checks that never start. Before enabling it, replace `paths-ignore` in `ci.yml` with a job that detects changed files and skips the others, since skipped jobs satisfy required checks.
- **Check locally before marking a PR ready.** Run `npm run ci:local`, so the first CI run is also the last.
