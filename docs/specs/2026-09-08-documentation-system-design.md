---
title: Documentation System — Organization & Currency Enforcement
status: planned
created: 2026-09-08
---

# Documentation System — Organization & Currency Enforcement

**Date:** 2026-09-08
**Status:** Design spec — awaiting review
**Author:** Brainstormed collaboratively; authored by Claude Code
**Supersedes:** [specs/2026-04-13-docs-reorganization-design.md](2026-04-13-docs-reorganization-design.md) (structure landed; currency mechanism never did)
**Related docs:**
- [INDEX.md](../INDEX.md)
- [README.md](../README.md)
- [guides/feature-development.md](../guides/feature-development.md)
- [../../CLAUDE.md](../../CLAUDE.md)

---

## 1. Summary

The April 2026 reorganization gave `docs/` a sound taxonomy. It did not give it a
mechanism for staying true. Five months later the structure is intact and the
content has drifted badly, because every rule for keeping docs current lives in
prose that nobody re-reads, and nothing in CI or the PR flow ever checks.

This spec does three things:

1. **Sharpen three structural ambiguities** that let the same topic live in two places.
2. **Add mechanical enforcement** — a `docs:check` script wired into CI that fails a
   PR on broken links, docs missing from INDEX, and finished plans left in `active/`.
3. **Write down the operating procedure** as a trigger matrix, mirrored line-for-line
   by the PR template so the checklist *is* the process.

Then clean up the accumulated drift so the repo is green when enforcement turns on.

The governing idea: **this repo already enforces code quality mechanically and
documentation quality by memory.** Memory lost. Move docs onto the same footing as
lint and type-check.

---

## 2. Evidence of drift

Measured on `master` at commit `3b51c43`, 2026-09-08.

| Finding | Measurement |
|---|---|
| Broken internal links | **157**, across 66 active (non-archive) docs |
| INDEX staleness | `Last verified: 2026-06-07` — 3 months; no entry for migrations 034–036, the four `test:security:*` scripts, or the security-hardening arc |
| Finished plans still in `plans/active/` | `2026-04-20-pr2-metro-pulse.md` and `2026-04-20-pr3-helper-score-social-cards.md`, both self-labelled `[status: implemented]` |
| Plans that never closed | `2026-04-13-docs-reorganization.md` — the plan to fix docs — still `[status: in-progress]` after 5 months |
| INDEX miscategorization | `plans/active/2026-04-13-marketplace-listing-details-enhancement.md` filed under the **Specs** heading |
| Documentation asserting fiction | `user-journeys/README.md` advertises "14 journeys in 6 categories"; **7** journey files exist, and 10 of its links point at docs never written |
| Guide referencing a dead skill | `guides/feature-development.md` instructs `/wireframe`; the installed skill is `wireframe-old`. The same guide directs plan output to `docs/archive/plans/` |
| Untracked-by-INDEX orphans | Root `wireframe/` (marketplace HTML/CSS prototypes) appears nowhere in INDEX |
| Generated artifact committed | `repomix-output.xml` is tracked and absent from `.gitignore` |

### Root cause

The link breakage is diagnostic of the whole pattern. The April reorg used `git mv`
to relocate files — correctly preserving history — but never rewrote the links
*inside* the moved files. Every wireframe still points at its pre-reorg flat path
(`./06-home-screen-level-0.md` rather than
`../06-home-screen-level-0/06-home-screen-level-0.md`).

That is a single, ordinary, forgivable oversight. What matters is that **it survived
five months and roughly forty PRs without anything noticing.** CI runs lint,
lint-guards, type-check, unit tests, coverage, and Playwright e2e. It has never
looked at a document.

---

## 3. Goals & Non-Goals

### Goals

- Make a documentation regression **fail a PR**, the way a type error does.
- Give every kind of document exactly one correct home, with the rule written down.
- Give plans and specs a lifecycle that terminates, and enforce termination.
- Make the "which doc do I update?" question answerable from a single table.
- Leave the repo green: fix existing drift in the same effort, so enforcement can be
  blocking from day one rather than warn-only in perpetuity.

### Non-Goals (explicitly deferred)

- **Generating INDEX from frontmatter on all ~60 docs.** Considered and rejected in
  §4. Same enforcement, five times the churn.
- **Anchor-fragment validation** (`file.md#section`). Link checking validates the file
  path only. Anchor checking is noisier and lower value; revisit if fragments break.
- **Prose linting** (Vale, write-good, spell check). Style is not the failure mode here.
- **External URL liveness checking.** Introduces network flakiness into CI for little
  gain; dead external links are a quarterly-sweep concern.
- **Auto-archiving plans by bot.** The lifecycle check *reports* a violation; a human
  does the `git mv`. Automated moves would fight the reviewer.
- **Restructuring `user-journeys/` or `wireframes/` internally.** Their layout is fine;
  only their links and their README are wrong.
- **Documenting the 7 missing user journeys.** Out of scope — the README stops
  claiming they exist, and the gap is recorded honestly.

---

## 4. Approach decision: validated index, not generated index

Three options were weighed for keeping `INDEX.md` honest.

| Approach | Enforcement strength | Cost |
|---|---|---|
| **A. Hand-written INDEX, CI-validated** *(chosen)* | CI fails until the entry exists | ~15 files get frontmatter |
| B. Fully generated from frontmatter on all docs | Identical — CI fails until frontmatter exists | ~60 files touched; generated file in git invites merge conflicts |
| C. Link-check only, no index check | None for index | Near zero |

**A is chosen.** B's advantage is theoretical: it makes the index *derivable*, but the
index is not the source of truth in either design — the doc tree is. Under A, an
orphaned doc fails CI just as hard as under B; the human simply writes the one-line
purpose in INDEX instead of in frontmatter. Those hand-written purposes are
genuinely good (they are what makes INDEX greppable for agents), and generation
would flatten them.

C is rejected because the index going stale is a *demonstrated* failure of this
repo, not a hypothetical one.

Frontmatter is therefore applied **only where a lifecycle genuinely exists** — plans
and specs — rather than to every document.

---

## 5. Structure

### 5.1 Target layout

```
docs/
  INDEX.md                    # hand-written map; CI-validated for completeness
  README.md                   # what lives where; points at the workflow guide
  guides/
    documentation-workflow.md # NEW — the SOP and trigger matrix
    setup-and-testing.md
    code-sharing.md
    deployment.md
    feature-development.md
  architecture/               # evergreen: how the system is built
  product/
    roadmap.md
    features/                 # EVERGREEN: what each feature is today
  specs/                      # POINT-IN-TIME: design for one change; dated
  plans/
    _template.md
    active/                   # in-flight only
  decisions/                  # ADRs
  user-journeys/
  wireframes/
    _prototypes/              # NEW — absorbs root wireframe/
  archive/
    plans/
    specs/
```

The folder set is unchanged apart from `guides/documentation-workflow.md` and
`wireframes/_prototypes/`. The taxonomy was never the problem.

### 5.2 Ambiguity 1 — `product/features/` vs `specs/`

Both currently hold feature designs. `product/features/marketplace.md` and
`specs/2026-04-14-mobile-marketplace-redesign-design.md` describe the same feature
with no stated rule for which wins. This violates the repo's own "one canonical home
per topic" convention.

The rule, to be documented in `README.md` and `documentation-workflow.md`:

| | `product/features/<name>.md` | `specs/YYYY-MM-DD-<topic>-design.md` |
|---|---|---|
| **Tense** | Present — what the feature *is* | Past-dated — what one change *proposed* |
| **Lifetime** | Evergreen; edited as behavior changes | Frozen at approval |
| **On ship** | Updated | Archived to `archive/specs/` |
| **Answers** | "How does marketplace work today?" | "Why did we redesign it in April?" |

Consequence: when a spec ships, the shipping PR **updates the evergreen feature doc
and archives the spec**. That is a line in the trigger matrix and the PR template.

### 5.3 Ambiguity 2 — root `wireframe/`

Root `wireframe/` holds marketplace HTML/CSS prototypes (`0304-marketplace`,
`0304-marketplace-mobile`, `0304-marketplace-search`, each with `base.css`,
`index.html`, and five `styles-optN.css` variants). It is invisible to INDEX, sits
outside `docs/`, and duplicates the *concept* of `docs/wireframes/` without its
conventions.

**Resolution:** `git mv wireframe docs/wireframes/_prototypes`. Kept, not deleted —
they are design exploration worth retaining, and the underscore prefix marks them as
distinct from the numbered, spec-backed screen wireframes. One INDEX entry covers the
folder.

### 5.4 Ambiguity 3 — `repomix-output.xml`

A generated repo-flattening artifact, tracked in git, not in `.gitignore`. Add to
`.gitignore` and `git rm --cached`. Not a docs concern strictly, but it is noise in
every diff and it is the same class of error.

---

## 6. Frontmatter contract (plans and specs only)

```yaml
---
title: Notifications feature
status: planned | in-progress | implemented | abandoned
created: 2026-04-13
spec: docs/specs/2026-04-13-notifications-design.md   # plans only; optional
---
```

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Human-readable; need not match the filename |
| `status` | yes | Exactly one of the four values |
| `created` | yes | `YYYY-MM-DD` |
| `spec` | no | Repo-relative path; plans link back to their design spec |

**The one hard rule:**

> `status: implemented` or `status: abandoned` ⇒ the file MUST live under `docs/archive/`.
> Conversely, files under `docs/plans/active/` MUST carry frontmatter with a non-terminal status.

This single invariant catches every lifecycle failure observed in §2. Status
currently lives as inline `[status: planned]` text inside INDEX, which is
unparseable and duplicated; it moves into frontmatter, and INDEX stops carrying it.

---

## 7. Tooling: `npm run docs:check`

### 7.1 Placement and constraints

`scripts/docs/`, plain Node with **no new dependencies**, following the existing
`scripts/guard-no-catch-any.js` precedent. Node 20 (per `.nvmrc` and CI) provides
`node:test` and `fs.globSync`, which is all this needs.

```
scripts/docs/
  check-links.js        # exports checkLinks(rootDir) -> Violation[]
  check-index.js        # exports checkIndex(rootDir)  -> Violation[]
  check-lifecycle.js    # exports checkLifecycle(rootDir) -> Violation[]
  frontmatter.js        # minimal YAML-subset parser (flat key: value only)
  index.js              # CLI entrypoint: runs all three, prints, sets exit code
  __fixtures__/         # tiny synthetic doc trees for tests
  *.test.js             # node:test suites
```

Each checker is a **pure function of a directory path returning a violation array**.
That is what makes them testable against fixtures rather than against the live repo,
whose contents change every PR.

```js
/** @typedef {{ rule: string, file: string, line?: number, message: string }} Violation */
```

### 7.2 The three checks

**`check-links`** — For every `.md` under `docs/` plus root `README.md`,
`CLAUDE.md`, `TECH-VERSIONS.md`: extract markdown links, keep those that are
relative and resolve to `.md` or `.html`, and assert the target exists on disk.
Skips `http(s):`, `mailto:`, and bare anchors (`#section`). Anchor fragments are
stripped before resolution, not validated.

*Archive is checked too.* Archived docs are explicitly retained so an agent
searching "how did we do X" still finds the answer — links that 404 defeat that
purpose. This is a deliberate departure from treating `archive/` as inert.

**`check-index`** — Bidirectional:
- Every `.md` under `docs/` must be referenced by path somewhere in `INDEX.md`,
  **except** for these exemptions:
  - `docs/archive/**`
  - `docs/INDEX.md` itself
  - any path with an underscore-prefixed segment — `plans/_template.md`,
    `wireframes/_prototypes/**`
- Every relative path referenced in `INDEX.md` must exist.

The exclusion of `archive/**` is intentional: INDEX describes archive at folder
granularity, and enumerating every archived file would make it unreadable. Broken
*links* into archive are still caught by `check-links`.

The underscore prefix is the general escape hatch — one rule rather than a growing
literal list, and it is why §5.3 names the prototypes folder `_prototypes`.

**`check-lifecycle`** —
- Every `.md` under `plans/active/` and `specs/` (excluding `_template.md`) parses
  frontmatter with a valid `status`.
- No file outside `docs/archive/` carries `status: implemented` or `status: abandoned`.
- No file under `docs/archive/` carries `status: planned` or `status: in-progress`.

### 7.3 Frontmatter parsing

A deliberately minimal parser: split on the leading `---` fence, accept flat
`key: value` lines, ignore nesting and lists. The contract in §6 has no nested
structure, and a hand-rolled 30-line parser beats adding a YAML dependency to the
root of a monorepo for this.

### 7.4 npm scripts

```json
"docs:check": "node scripts/docs/index.js",
"docs:test":  "node --test scripts/docs/"
```

Wiring, stated precisely because the root has two separate test chains:

| Runner | Gets `docs:test` | Gets `docs:check` |
|---|---|---|
| Root `test` (local) | yes — prepended: `npm run docs:test && npm run test --workspaces --if-present` | no |
| Root `test:ci` | no — left untouched, so the existing `unit_tests` CI job is unchanged | no |
| `.github/workflows/docs.yml` | yes | yes |

`docs.yml` runs **both** (`npm run docs:test && npm run docs:check`), and its path
filter includes `scripts/docs/**`, so a change to a checker is covered by its own
tests before it is trusted to gate anything. `docs:check` is deliberately kept out of
the `test` chains — it validates repository content, not code, and a contributor
running `npm test` mid-feature should not be failed by a doc they have not written yet.

### 7.5 Output format

Grouped by rule, with `file:line` where available so terminal and CI annotations are
clickable:

```
docs:check — 3 violations

  broken-link (2)
    docs/wireframes/09-post-detail/09-post-detail.md:412
      → ./08-message-thread.md does not exist
    ...

  index-orphan (1)
    docs/guides/documentation-workflow.md
      → not referenced in docs/INDEX.md

Run `npm run docs:check` locally to reproduce.
```

Exit `0` on clean, `1` on any violation.

---

## 8. GitHub configuration

### 8.1 `.github/workflows/docs.yml`

A standalone workflow rather than another job in `ci.yml`, so it can carry a path
filter and skip entirely on code-only PRs.

```yaml
name: Docs
on:
  pull_request:
    branches: [master]
    paths: ['**/*.md', 'docs/**', 'scripts/docs/**', '.github/workflows/docs.yml']
  push:
    branches: [master]
    paths: ['**/*.md', 'docs/**', 'scripts/docs/**']
```

Single job: checkout, setup-node 20 with npm cache, `npm ci`, `npm run docs:check`.
**Blocking** — the cleanup in §10 lands in the same PR, so the repo is green when it
first runs.

### 8.2 PR template

A new `## Documentation` section inserted after `## Scope`, mirroring the §9 trigger
matrix line for line:

```markdown
## Documentation

- [ ] `docs/INDEX.md` updated if any doc was added, moved, or retired.
- [ ] Feature behavior change reflected in `docs/product/features/<feature>.md`.
- [ ] Schema change reflected in `docs/architecture/database-schema.md`.
- [ ] Completed plan/spec: `status:` set to `implemented` and file `git mv`'d to `docs/archive/`.
- [ ] Non-obvious architectural decision recorded as an ADR in `docs/decisions/`.
- [ ] `docs/product/roadmap.md` updated if a roadmap item shipped.
- [ ] `npm run docs:check` passes.
```

The existing Testing, Migrations, and Architecture sections are untouched — they
work.

### 8.3 Issue templates

`.github/ISSUE_TEMPLATE/` — GitHub **Forms** (`.yml`), not legacy markdown, so
fields are structured and labels apply automatically:

| File | Purpose | Auto-labels |
|---|---|---|
| `bug_report.yml` | Repro steps, platform (web/mobile/shared), expected vs actual | `bug` |
| `feature_request.yml` | Problem, proposed solution, affected surfaces, roadmap phase | `enhancement` |
| `security_finding.yml` | Affected table/policy/function, severity, smoke-test status | `security` |
| `docs_drift.yml` | Doc path, what is wrong, what it should say | `documentation` |
| `config.yml` | `blank_issues_enabled: false`; links to `docs/INDEX.md` | — |

`security_finding.yml` earns its place: migrations 034–036 and four
`scripts/security/*-smoke.ts` scripts show security findings are a recurring,
structurally distinct work item here.

**Consequence:** `plans/active/phase1-remediation-github-issues.md` — hand-written
copy-paste issue cards — becomes obsolete and is archived. It exists only because
issue templates did not.

### 8.4 `.github/CODEOWNERS`

```
*                        @shashesh
/docs/                   @shashesh
/.github/                @shashesh
/supabase/migrations/    @shashesh
/packages/shared/        @shashesh
```

Owner confirmed from `origin` = `https://github.com/shashesh/nepally.git`.

With one human contributor this is not about review routing — it is about gating the
`copilot-swe-agent[bot]` PRs (12 commits to date) so an agent cannot land migrations,
shared-package changes, or docs without human review.

---

## 9. The operating procedure

New `docs/guides/documentation-workflow.md`. Linked from `README.md`, `INDEX.md`, and
`CLAUDE.md`. Contains the following as its centerpiece:

### 9.1 Trigger matrix

| If you changed… | You must update… | Enforced by |
|---|---|---|
| DB schema / added a migration | `architecture/database-schema.md` | PR template |
| A feature's user-visible behavior | `product/features/<feature>.md` | PR template |
| Setup, deploy, or test commands | The matching `guides/` doc | PR template |
| Monorepo layout or import rules | `architecture/monorepo-structure.md` | PR template |
| Finished a plan or spec | `status: implemented` → `git mv` to `archive/` → INDEX | **CI** (`check-lifecycle`) |
| Made a non-obvious architectural call | New ADR in `decisions/` | PR template |
| Shipped a roadmap item | `product/roadmap.md` | PR template |
| Added, moved, or retired any doc | `INDEX.md` | **CI** (`check-index`) |
| Moved a doc other docs link to | The linking docs | **CI** (`check-links`) |

Rows marked **CI** cannot be skipped. Rows marked *PR template* are prompts — this
distinction is stated plainly in the guide, because pretending a checkbox is an
enforcement mechanism is how this repo got here.

### 9.2 Document lifecycle

```
idea → specs/YYYY-MM-DD-<topic>-design.md          (status: planned)
     → plans/active/YYYY-MM-DD-<topic>.md          (status: planned → in-progress)
     → implementation
     → product/features/<feature>.md updated       (evergreen doc absorbs the truth)
     → both spec and plan: status: implemented, git mv → archive/
     → INDEX.md updated in the same commit
```

### 9.3 Quarterly freshness sweep

The only defense against drift no script can detect — a guide referencing a renamed
skill, a wireframe describing a screen that shipped differently. A recurring issue
(opened via `docs_drift.yml`) with a fixed checklist:

- Re-read every `guides/` doc against current tooling; verify every skill and command named still exists.
- Verify `TECH-VERSIONS.md` against `package.json` across all three workspaces.
- Verify `architecture/database-schema.md` against `supabase/migrations/` (highest-numbered file).
- Confirm `product/roadmap.md` phase status matches what has shipped.
- Stamp `Last verified: YYYY-MM-DD` in `INDEX.md`.

Cadence is quarterly and deliberately human. The value is in reading, not in a script.

### 9.4 CLAUDE.md changes

CLAUDE.md's "Finding Docs" section currently states three index-hygiene rules in
prose. It gains a pointer to the workflow guide, the enforcement fact, and the
evergreen/point-in-time distinction:

- `docs/guides/documentation-workflow.md` is the canonical SOP.
- `npm run docs:check` is a required local gate; CI runs it on any `.md` change.
- Feature behavior → `product/features/` (evergreen). One change's design → `specs/` (dated, archived on ship).

The existing superpowers path override (specs to `docs/specs/`, plans to
`docs/plans/active/`) is correct and stays.

---

## 10. Cleanup pass

Enforcement is meaningless against a red repo, so the drift is fixed in the same
effort.

| # | Item | Detail |
|---|---|---|
| 1 | **157 broken links** | Mostly mechanical: wireframes and user-journeys use pre-reorg flat paths. Fix by resolution rules, not blind find-replace — some targets genuinely do not exist and need the link removed rather than repointed. |
| 2 | **Archive finished plans** | `2026-04-20-pr2-metro-pulse`, `2026-04-20-pr3-helper-score-social-cards` (both `implemented`); `2026-04-13-docs-reorganization` + its spec (superseded by this one). `git mv` to preserve history. |
| 3 | **Audit remaining `plans/active/`** | `plans/active/` holds 12 files; items 2 and 4 archive 4 of them, leaving **8** to audit. Each gets a real status determined by reading it against the code — not assumed. Implemented ones archive; genuinely planned ones get frontmatter. |
| 4 | **Archive `phase1-remediation-github-issues.md`** | Superseded by issue templates (§8.3). |
| 5 | **Rewrite `user-journeys/README.md`** | Describe the 7 journeys that exist. Record the 7 unwritten ones as an explicit gap list with no links, rather than as broken promises. |
| 6 | **Fix `guides/feature-development.md`** | `/wireframe` → `wireframe-old`; plan output path `docs/archive/plans/` → `docs/plans/active/`; align its Definition of Done with §9.1. |
| 7 | **Document the security smoke scripts** | The four `npm run test:security:*` scripts (`chat-rls`, `users-privilege`, `users-pii`, `emergency-post`) are undocumented anywhere. Add a section to `guides/setup-and-testing.md` covering what each asserts, the env vars they need (`scripts/.env.example`), and when to run them. |
| 8 | **Rebuild `INDEX.md`** | Add every missing doc: `architecture/migration-workflow.md`, `guides/documentation-workflow.md`, `wireframes/_prototypes/`, and this spec. Move the miscategorized marketplace-listing plan out of the Specs section into Plans. Drop inline `[status: …]` (now frontmatter). Stamp `Last verified: 2026-09-08`. |
| 9 | **`git mv wireframe docs/wireframes/_prototypes`** | Per §5.3. |
| 10 | **`.gitignore` + `git rm --cached repomix-output.xml`** | Per §5.4. |

---

## 11. Testing

Per the CLAUDE.md unit-test mandate.

### 11.1 Unit tests — `scripts/docs/*.test.js`, `node:test`

Each checker runs against a synthetic fixture tree under `__fixtures__/`, never
against the live repo.

| Suite | Cases |
|---|---|
| `check-links` | resolves valid relative link; flags missing target; ignores `http(s)`/`mailto`; strips anchor before resolving; flags a link that is valid pre-move and broken post-move; handles links from a nested dir (`../../`) |
| `check-index` | flags doc absent from INDEX; flags INDEX entry pointing at a missing file; correctly exempts `archive/**`, `INDEX.md`, `_template.md`; passes a well-formed tree |
| `check-lifecycle` | flags `implemented` outside `archive/`; flags `planned` inside `archive/`; flags missing frontmatter in `plans/active/`; flags invalid `status` value; passes a valid tree |
| `frontmatter` | parses flat keys; returns null with no fence; tolerates CRLF; ignores unknown keys; handles values containing `:` |

CRLF handling is called out explicitly: this repo is developed on Windows, and a
parser that only splits on `\n` will silently mis-parse every frontmatter block.

### 11.2 Integration verification

- `npm run docs:check` exits `0` on the cleaned repo — the acceptance gate for §10.
- A deliberately broken link, introduced and then reverted, produces exit `1` and
  names the correct file. Verifies the check actually fails rather than passing vacuously.
- `npm run docs:test` passes standalone and inside the root `test` chain.
- `npm run lint` and `npm run type-check` still pass (new files are plain JS under
  `scripts/`, matching `guard-no-catch-any.js`).

### 11.3 Out of scope for testing

The workflow YAML and issue-form YAML are validated by GitHub on push, not by local
tests. They are verified by observing the first PR that runs them.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| **Fixing 157 links mechanically introduces wrong-but-resolving links** | Some targets do not exist at all (e.g. 10 journeys in the journeys README). Each link is resolved by intent, not by pattern match; where no correct target exists the link is removed and the gap stated. Reviewed as its own commit, separate from tooling. |
| **Blocking CI on day one blocks unrelated work** | The cleanup lands in the same PR as the workflow, so `master` is green the moment enforcement starts. If §10 cannot be completed, the workflow ships warn-only (`continue-on-error: true`) and flips in a follow-up — the fallback, not the plan. |
| **`check-index` becomes noisy for scratch docs** | The exemption list (`archive/**`, `INDEX.md`, `_template.md`, `_prototypes/**`) is explicit and extensible. Underscore-prefixed paths are the escape hatch. |
| **Hand-rolled frontmatter parser mis-parses valid YAML** | The contract is flat `key: value` only, documented in §6, enforced by `check-lifecycle` rejecting unparseable frontmatter loudly rather than silently skipping. |
| **The quarterly sweep is itself forgotten** | Acknowledged and unmitigated by tooling — it is the residue that cannot be automated. It is scoped small (five checks) so it stays cheap enough to actually do. |
| **Large diff obscures review** | Commits are grouped by kind: tooling → GitHub config → link fixes → archival moves → INDEX rebuild → CLAUDE.md. Each is independently reviewable. |

---

## 13. Definition of done

- [ ] `npm run docs:check` exits 0 on a full checkout.
- [ ] `npm run docs:test` passes; included in the root `test` chain.
- [ ] Zero broken relative links across `docs/`, including `archive/`.
- [ ] Every non-archive doc appears in `INDEX.md`; every `INDEX.md` path resolves.
- [ ] No file outside `archive/` carries `status: implemented` or `abandoned`.
- [ ] Every file in `plans/active/` and `specs/` carries valid frontmatter.
- [ ] `.github/workflows/docs.yml` runs and passes on the PR that introduces it.
- [ ] PR template, four issue forms + `config.yml`, and `CODEOWNERS` in place.
- [ ] `docs/guides/documentation-workflow.md` exists and is linked from `README.md`, `INDEX.md`, and `CLAUDE.md`.
- [ ] `user-journeys/README.md` describes only journeys that exist.
- [ ] `guides/feature-development.md` names no dead skill and no wrong path.
- [ ] Root `wireframe/` relocated; `repomix-output.xml` untracked and ignored.
- [ ] `npm run lint` and `npm run type-check` pass.
