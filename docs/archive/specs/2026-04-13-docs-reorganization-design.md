---
title: Documentation Reorganization & Audit
status: implemented
created: 2026-04-13
branch: chore/docs-reorganization
---

# Documentation Reorganization & Audit

## Problem

The Nepally repo has accumulated ~67 Markdown documents across the root and `docs/` with three recurring problems:

1. **Outdated content.** Tech stack drift (Firebase → Supabase, Flutter → RN, NUSA → Nepally, folder `unhn` → `nepally`), wrong migration numbers, "not done" claims for shipped features.
2. **Discoverability.** Two parallel planning systems (`docs/implementation-plans/` and `docs/superpowers/`), stray files at `docs/` root, completed plans mixed with active ones, no index for coding agents to ground themselves.
3. **Root clutter.** `PROGRESS.md`, `SETUP-AND-TESTING-GUIDE.md`, `product-roadmap.md`, `SKILL.md` all live at repo root with no consistent rule for what belongs there.

The goal: a `docs/` layout where both humans and coding agents can find the relevant doc in seconds, and every remaining doc reflects current reality.

## Goals

- Every doc that remains is factually current as of 2026-04-13 (Medium-depth verification — see Audit section).
- A single canonical location for every type of doc (no more "is this a plan or a spec?").
- A flat machine-readable index at `docs/INDEX.md` that lists every doc with a one-line purpose.
- Completed / obsolete docs preserved in `docs/archive/` rather than deleted.
- Repo root holds only `README.md`, `CLAUDE.md`, `TECH-VERSIONS.md` (plus the usual non-docs: `package.json`, `supabase/`, etc.).
- Zero broken internal links after the reorganization.
- Git history preserved for every moved file (`git mv`, not delete+create).

## Non-goals

- Rewriting wireframes or user-journey docs (content is behavioral, not tech-versioned; low rot risk).
- Rewriting ADRs in `docs/decisions/` (historical record; superseded decisions get a note, not a rewrite).
- Deep verification against source code for every feature-status claim — only for load-bearing docs (roadmap, CLAUDE.md, TECH-VERSIONS.md). Other docs get version/migration/log cross-checks.
- Changing the superpowers skill defaults. We update `CLAUDE.md` to point at the new paths; the skills still work.

## New `docs/` layout

```
docs/
├── INDEX.md                         ← flat machine-readable index
├── README.md                        ← human landing page
│
├── guides/
│   ├── setup-and-testing.md         ← from root SETUP-AND-TESTING-GUIDE.md
│   ├── code-sharing.md              ← from docs/code-sharing-guide.md
│   ├── deployment.md                ← from docs/deployment-guide.md
│   └── feature-development.md       ← from docs/feature-development-process.md (if distinct from CLAUDE.md)
│
├── architecture/
│   ├── monorepo-structure.md        ← from docs/monorepo-structure.md
│   ├── database-schema.md           ← from docs/database-schema.md
│   └── supabase-setup.md            ← from docs/supabase-setup.md
│
├── product/
│   ├── roadmap.md                   ← from root product-roadmap.md
│   └── features/                    ← from docs/features/
│       ├── events.md
│       ├── events-feature-breakdown.md
│       ├── in-app-chat.md
│       ├── marketplace.md
│       ├── marketplace-future-features.md
│       ├── dynamic-location-management.md
│       ├── post-likes-and-comments.md
│       └── phase1-feature-breakdown.md
│
├── plans/
│   ├── _template.md                 ← from docs/implementation-plans/_template.md
│   └── active/
│       ├── notifications-feature.md
│       ├── marketplace-ux-redesign.md
│       ├── mobile-usability-security-hardening.md
│       ├── promote-listing-feature.md
│       ├── promotion-lifecycle-and-feeds.md
│       ├── events-feature.md              (if still relevant; archive if done)
│       ├── 2026-04-10-drop-is-featured-column.md  ← from docs/superpowers/plans/
│       └── 2026-04-13-fix-promotions-display.md   ← from docs/superpowers/plans/
│
├── specs/
│   ├── 2026-04-10-drop-is-featured-column-design.md  ← from docs/superpowers/specs/
│   ├── 2026-04-13-fix-promotions-display.md          ← from docs/superpowers/specs/
│   └── 2026-04-13-docs-reorganization-design.md      ← this file
│
├── user-journeys/                   ← unchanged structure
│   └── ... (verified, not rewritten)
│
├── wireframes/                      ← unchanged structure
│   └── ... (verified, not rewritten)
│
├── decisions/                       ← unchanged
│   └── ...
│
└── archive/
    ├── PROGRESS.md                  ← from root
    ├── marketplace-category-consolidation-plan.md  ← from docs/
    ├── plans/
    │   ├── public-profile-view.md                  ← completed 2026-03-04
    │   ├── phase1-remediation-checklist.md
    │   └── phase1-remediation-github-issues.md
    └── (other completed plans identified during audit)
```

**Root after:** `README.md`, `CLAUDE.md`, `TECH-VERSIONS.md`. Everything else moves or is deleted.

**Files deleted outright:**
- `SKILL.md` (18-line scaffolding stub from `skill-create`, never filled in)

**Namespace collapse:** `docs/superpowers/specs/` → `docs/specs/`, `docs/superpowers/plans/` → `docs/plans/active/`. Rationale: a spec is a spec regardless of which skill produced it. `CLAUDE.md` gets updated to tell future brainstorming sessions to use the new paths.

## `docs/INDEX.md` format

Flat list grouped by folder, one line per doc, shape:

```
- [path](path) — one-sentence purpose [status: X]
```

Properties:
- Grouped by folder (Guides, Architecture, Product, Plans, Specs, User Journeys, Wireframes, Decisions, Archive).
- Greppable — a coding agent can `grep 'notifications' docs/INDEX.md` and get the path.
- Plan entries carry an inline `status:` hint (`planned` / `in-progress`).
- Wireframes, user-journeys, and archive get folder-level pointers plus a link to a per-folder README, not per-file lines in the main index (too many files, low per-file value).
- Top of file has `Last verified: YYYY-MM-DD` so future readers know when the map was audited.
- No per-doc frontmatter elsewhere — the index is the single source of machine-readable metadata.

`CLAUDE.md` gets a "Finding docs" section pointing at `docs/INDEX.md` as the canonical map.

## Audit pass (Medium depth)

For each surviving doc, cross-check against:

1. `TECH-VERSIONS.md`
2. `package.json` (root, apps/mobile, apps/web, packages/shared)
3. `supabase/migrations/` (latest migration number)
4. `git log` (last 3 months for feature-status claims)
5. Auto-memory `MEMORY.md`

**Fixed inline:**
- Branding: `NUSA` → `Nepally`, `unhn` → `nepally`
- Dead tech: `Firebase`, `Flutter`, `Expo <54`, wrong React/Next versions
- Wrong migration numbers
- Broken internal links (from the moves in this reorg)
- Status claims that contradict shipped reality or vice-versa
- Obsolete deferred items (e.g., phone SMS auth was removed 2026-03-25)

**Flagged for user decision (not auto-fixed):**
- Docs whose core premise is obsolete (rewrite / archive / delete?)
- Contradictions between two docs where the right answer isn't obvious
- Docs that look like they should merge with another

**Left alone:**
- Wireframes, user-journeys, decisions (low rot risk / historical record)

**Load-bearing docs that get deep verification** (grep code, not just cross-check):
- `CLAUDE.md`
- `TECH-VERSIONS.md`
- `docs/product/roadmap.md`
- `docs/INDEX.md` itself

## Merges and fold-ins

Planned consolidations (confirmed during audit):

1. **`PROGRESS.md` → `docs/archive/PROGRESS.md`.** Roadmap carries phase status; auto-memory already tracks done/not-done more accurately.
2. **`feature-development-process.md`** — read against `CLAUDE.md`. If it's a subset, fold content into CLAUDE.md and archive. If it's distinct how-to content, keep as `docs/guides/feature-development.md`.
3. **`phase1-remediation-checklist.md` + `phase1-remediation-github-issues.md`** — paired docs, archive both.
4. **`marketplace-future-features.md` vs `marketplace.md`** — keep both (one is spec, the other is a backlog dump), but cross-link them.
5. **`marketplace-category-consolidation-plan.md`** (stray at `docs/` root) — archive.

## Execution phases

1. **Read pass.** Read every doc without writing. Build the per-file action list.
2. **Spec written + approved** (this doc).
3. **Implementation plan** via writing-plans skill, enumerating every move, delete, merge, and content fix.
4. **Execute:**
   a. Create new folder skeleton.
   b. `git mv` all relocations (preserves history).
   c. Apply content fixes file-by-file.
   d. Write `docs/INDEX.md`.
   e. Update `CLAUDE.md` with "Finding docs" pointer and new superpowers default paths.
   f. Broken-link sweep (grep for old paths across the repo, including CLAUDE.md, README.md, and memory).
5. **Verification:** manual link check, `git grep` for old paths, confirm root contains only the three sanctioned files, confirm `docs/INDEX.md` entry count matches actual file count.

## Safety and rollback

- All work on branch `chore/docs-reorganization` off master.
- Moves via `git mv` so history survives.
- No `git commit` or `git push` without explicit per-task user approval (per CLAUDE.md non-negotiable rule).
- Rollback = `git reset --hard master` on the branch, or `git checkout master` and delete the branch.
- Changes staged in logical groups (moves separate from content fixes) for reviewable commits.

## Success criteria

- [ ] Repo root contains only `README.md`, `CLAUDE.md`, `TECH-VERSIONS.md` (plus non-docs).
- [ ] Every doc in `docs/` is either factually current or lives in `docs/archive/`.
- [ ] `docs/INDEX.md` exists and lists every non-archive doc with a one-line purpose.
- [ ] `CLAUDE.md` points agents at `docs/INDEX.md` as the map.
- [ ] `git grep` for `Firebase`, `Flutter`, `NUSA`, `unhn` in `docs/` and root returns no live hits (archive allowed).
- [ ] Zero broken internal links (`grep -r '](.*\.md' docs/` clean).
- [ ] Git history preserved for every moved file (`git log --follow` works).
- [ ] Every doc in `docs/INDEX.md` is reachable from `docs/README.md` or one of its sub-READMEs.

## Note on this spec's own path

This spec is being written to `docs/superpowers/specs/` (the current default) before the reorganization runs. During execution phase 4b, it will `git mv` to `docs/specs/` along with the other superpowers specs. The path in the layout tree above (`docs/specs/2026-04-13-docs-reorganization-design.md`) reflects the post-reorg location.

## Open questions

None — all resolved during brainstorming (questions Q1–Q5 in session log).
