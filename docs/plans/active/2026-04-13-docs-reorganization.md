# Documentation Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize Nepally's 60+ markdown docs into a clean `docs/` layout with a flat agent-readable index, fix outdated content (branding, tech versions, phone SMS references, paths), and archive completed plans — on branch `chore/docs-reorganization` off master.

**Architecture:** Move via `git mv` to preserve history, apply content fixes inline, generate `docs/INDEX.md` as the single machine-readable map, point CLAUDE.md at the new paths. Changes grouped into logical commits: moves → content fixes → index → CLAUDE.md → verification.

**Tech Stack:** No code. Just Markdown edits and `git mv`. Verification uses `git grep`, `git log --follow`, and link sweeps.

**Spec:** [docs/superpowers/specs/2026-04-13-docs-reorganization-design.md](../../specs/2026-04-13-docs-reorganization-design.md) — note: this spec file itself moves to `docs/specs/` in Task 6.

**Branch:** `chore/docs-reorganization` (already created, off master). Working tree has `.gitignore` modification unrelated to this work; leave untouched.

**Git commit policy:** Per CLAUDE.md non-negotiable rule, DO NOT `git commit` or `git push` without explicit user approval. This plan includes commit steps so the reviewer knows what WOULD be committed; when executing, pause and ask before each commit.

---

## File Fate Reference Table

Locked during audit read-pass. Use this as the canonical decision list.

### Root files

| File | Fate | New path |
|---|---|---|
| `README.md` | keep at root | `README.md` |
| `CLAUDE.md` | keep at root | `CLAUDE.md` |
| `TECH-VERSIONS.md` | keep at root | `TECH-VERSIONS.md` |
| `SETUP-AND-TESTING-GUIDE.md` | move | `docs/guides/setup-and-testing.md` |
| `product-roadmap.md` | move | `docs/product/roadmap.md` |
| `PROGRESS.md` | archive | `docs/archive/PROGRESS.md` |
| `SKILL.md` | delete | — |

### docs/ top-level files

| File | Fate | New path |
|---|---|---|
| `docs/README.md` | rewrite | `docs/README.md` |
| `docs/code-sharing-guide.md` | move | `docs/guides/code-sharing.md` |
| `docs/deployment-guide.md` | move | `docs/guides/deployment.md` |
| `docs/feature-development-process.md` | move | `docs/guides/feature-development.md` |
| `docs/monorepo-structure.md` | move | `docs/architecture/monorepo-structure.md` |
| `docs/database-schema.md` | move | `docs/architecture/database-schema.md` |
| `docs/supabase-setup.md` | move | `docs/architecture/supabase-setup.md` |
| `docs/marketplace-category-consolidation-plan.md` | archive | `docs/archive/marketplace-category-consolidation-plan.md` |

### docs/features/ → docs/product/features/

All 8 files move, none archived:
- `dynamic-location-management.md`
- `events-feature-breakdown.md`
- `events.md`
- `in-app-chat.md`
- `marketplace-future-features.md`
- `marketplace.md`
- `phase1-feature-breakdown.md`
- `post-likes-and-comments.md`

### docs/implementation-plans/ → docs/plans/

**Active (→ `docs/plans/active/`):**
- `marketplace-ux-redesign.md` — Planned 2026-04-05
- `mobile-usability-security-hardening.md` — Planned 2026-03-10
- `notifications-feature.md` — Planned
- `phase1-remediation-checklist.md` — Planned 2026-03-23
- `phase1-remediation-github-issues.md` — companion to checklist

**Template (→ `docs/plans/_template.md`):**
- `_template.md`

**Archive (→ `docs/archive/plans/`):**
- `events-feature.md` — Completed 2026-03-10
- `public-profile-view.md` — Completed 2026-03-04
- `promote-listing-feature.md` — work shipped via migrations 020-024
- `promotion-lifecycle-and-feeds.md` — Implemented 2026-04-10

### docs/superpowers/ → docs/specs/ + docs/plans/active/

**Active specs (→ `docs/specs/`):**
- `2026-04-13-docs-reorganization-design.md` (this reorg's spec — moves during Task 6)

**Active plans (→ `docs/plans/active/`):**
- `2026-04-13-docs-reorganization.md` (this plan itself — moves during Task 5)

**Archive (→ `docs/archive/plans/` and `docs/archive/specs/`):**
- `docs/superpowers/plans/2026-04-10-drop-is-featured-column.md` — migration 023 shipped
- `docs/superpowers/plans/2026-04-13-fix-promotions-display.md` — migration 024 shipped (recent commits confirm)
- `docs/superpowers/specs/2026-04-10-drop-is-featured-column-design.md` — paired with above
- `docs/superpowers/specs/2026-04-13-fix-promotions-display.md` — paired with above

### Unchanged folders

- `docs/decisions/` (3 files — keep as-is, structure preserved)
- `docs/user-journeys/` (7 files + README — keep as-is, structure preserved; update README date in Task 11)
- `docs/wireframes/` (18 screen subdirs — keep as-is; spot-check in Task 11)

### Content fixes discovered during audit

Exact edits live in Task 10 and Task 11. Files touched:
- `README.md` (phone SMS reference)
- `TECH-VERSIONS.md` (Last Updated date)
- `docs/guides/setup-and-testing.md` (`unhn` → `nepally` × 2, phone SMS)
- `docs/product/roadmap.md` (Last Updated date, phone SMS)
- `docs/guides/deployment.md` (`nusa.app` → verify, Nepally capitalization)
- `docs/architecture/monorepo-structure.md` (`nusa/` → `nepally/`)
- `docs/architecture/supabase-setup.md` (phone SMS / Twilio × 2)
- `docs/product/features/marketplace.md` (Last Updated date)
- `docs/user-journeys/README.md` (Last Updated date)

---

## Task 1: Create new folder skeleton

**Files:**
- Create: `docs/guides/` (directory)
- Create: `docs/architecture/` (directory)
- Create: `docs/product/` (directory)
- Create: `docs/product/features/` (directory)
- Create: `docs/plans/` (directory)
- Create: `docs/plans/active/` (directory)
- Create: `docs/specs/` (directory)
- Create: `docs/archive/` (directory)
- Create: `docs/archive/plans/` (directory)
- Create: `docs/archive/specs/` (directory)

Git does not track empty directories. Placeholder `.gitkeep` files are NOT needed — the subsequent `git mv` tasks populate each folder before the first commit, so directories become tracked implicitly.

- [ ] **Step 1: Create the skeleton**

```bash
mkdir -p docs/guides docs/architecture docs/product/features docs/plans/active docs/specs docs/archive/plans docs/archive/specs
```

- [ ] **Step 2: Verify the skeleton exists**

```bash
ls -d docs/guides docs/architecture docs/product docs/product/features docs/plans docs/plans/active docs/specs docs/archive docs/archive/plans docs/archive/specs
```

Expected: all ten paths listed without error.

- [ ] **Step 3: Do NOT commit yet**

Empty dirs aren't tracked. Task 2 creates the first populated commit.

---

## Task 2: Move guide files

**Files:**
- Move: `SETUP-AND-TESTING-GUIDE.md` → `docs/guides/setup-and-testing.md`
- Move: `docs/code-sharing-guide.md` → `docs/guides/code-sharing.md`
- Move: `docs/deployment-guide.md` → `docs/guides/deployment.md`
- Move: `docs/feature-development-process.md` → `docs/guides/feature-development.md`

- [ ] **Step 1: git mv all four files**

```bash
git mv SETUP-AND-TESTING-GUIDE.md docs/guides/setup-and-testing.md
git mv docs/code-sharing-guide.md docs/guides/code-sharing.md
git mv docs/deployment-guide.md docs/guides/deployment.md
git mv docs/feature-development-process.md docs/guides/feature-development.md
```

- [ ] **Step 2: Verify moves**

```bash
ls docs/guides/
git status --short
```

Expected: four files under `docs/guides/`, `git status` shows four `R  ` (renamed) entries.

- [ ] **Step 3: Pause — ask user before committing**

Staged renames only (no content changes yet). Ask user:

> "Task 2 complete: 4 guide files moved. Ready to commit as `refactor(docs): move guide files into docs/guides/`?"

Wait for approval. On approval:

```bash
git commit -m "refactor(docs): move guide files into docs/guides/"
```

---

## Task 3: Move architecture files

**Files:**
- Move: `docs/monorepo-structure.md` → `docs/architecture/monorepo-structure.md`
- Move: `docs/database-schema.md` → `docs/architecture/database-schema.md`
- Move: `docs/supabase-setup.md` → `docs/architecture/supabase-setup.md`

- [ ] **Step 1: git mv the three files**

```bash
git mv docs/monorepo-structure.md docs/architecture/monorepo-structure.md
git mv docs/database-schema.md docs/architecture/database-schema.md
git mv docs/supabase-setup.md docs/architecture/supabase-setup.md
```

- [ ] **Step 2: Verify**

```bash
ls docs/architecture/
git status --short
```

Expected: three files listed, three `R  ` entries.

- [ ] **Step 3: Pause, ask, then commit**

> "Task 3 complete: 3 architecture files moved. Ready to commit as `refactor(docs): move architecture files into docs/architecture/`?"

On approval:

```bash
git commit -m "refactor(docs): move architecture files into docs/architecture/"
```

---

## Task 4: Move product (roadmap + features)

**Files:**
- Move: `product-roadmap.md` → `docs/product/roadmap.md`
- Move: `docs/features/dynamic-location-management.md` → `docs/product/features/dynamic-location-management.md`
- Move: `docs/features/events-feature-breakdown.md` → `docs/product/features/events-feature-breakdown.md`
- Move: `docs/features/events.md` → `docs/product/features/events.md`
- Move: `docs/features/in-app-chat.md` → `docs/product/features/in-app-chat.md`
- Move: `docs/features/marketplace-future-features.md` → `docs/product/features/marketplace-future-features.md`
- Move: `docs/features/marketplace.md` → `docs/product/features/marketplace.md`
- Move: `docs/features/phase1-feature-breakdown.md` → `docs/product/features/phase1-feature-breakdown.md`
- Move: `docs/features/post-likes-and-comments.md` → `docs/product/features/post-likes-and-comments.md`

- [ ] **Step 1: Move roadmap from root**

```bash
git mv product-roadmap.md docs/product/roadmap.md
```

- [ ] **Step 2: Move all 8 feature files**

```bash
git mv docs/features/dynamic-location-management.md docs/product/features/dynamic-location-management.md
git mv docs/features/events-feature-breakdown.md docs/product/features/events-feature-breakdown.md
git mv docs/features/events.md docs/product/features/events.md
git mv docs/features/in-app-chat.md docs/product/features/in-app-chat.md
git mv docs/features/marketplace-future-features.md docs/product/features/marketplace-future-features.md
git mv docs/features/marketplace.md docs/product/features/marketplace.md
git mv docs/features/phase1-feature-breakdown.md docs/product/features/phase1-feature-breakdown.md
git mv docs/features/post-likes-and-comments.md docs/product/features/post-likes-and-comments.md
```

- [ ] **Step 3: Remove now-empty docs/features directory**

```bash
rmdir docs/features
```

- [ ] **Step 4: Verify**

```bash
ls docs/product/features/ | wc -l
ls docs/product/roadmap.md
test ! -e docs/features && echo "docs/features removed"
git status --short
```

Expected: 8 files in features, roadmap exists, old dir removed, 9 rename entries.

- [ ] **Step 5: Pause, ask, then commit**

> "Task 4 complete: roadmap + 8 feature files moved into docs/product/. Ready to commit as `refactor(docs): move roadmap and features into docs/product/`?"

On approval:

```bash
git commit -m "refactor(docs): move roadmap and features into docs/product/"
```

---

## Task 5: Move active implementation plans

**Files:**
- Move: `docs/implementation-plans/_template.md` → `docs/plans/_template.md`
- Move: `docs/implementation-plans/marketplace-ux-redesign.md` → `docs/plans/active/marketplace-ux-redesign.md`
- Move: `docs/implementation-plans/mobile-usability-security-hardening.md` → `docs/plans/active/mobile-usability-security-hardening.md`
- Move: `docs/implementation-plans/notifications-feature.md` → `docs/plans/active/notifications-feature.md`
- Move: `docs/implementation-plans/phase1-remediation-checklist.md` → `docs/plans/active/phase1-remediation-checklist.md`
- Move: `docs/implementation-plans/phase1-remediation-github-issues.md` → `docs/plans/active/phase1-remediation-github-issues.md`
- Move: `docs/superpowers/plans/2026-04-13-docs-reorganization.md` → `docs/plans/active/2026-04-13-docs-reorganization.md` (this plan itself)

- [ ] **Step 1: Move template**

```bash
git mv docs/implementation-plans/_template.md docs/plans/_template.md
```

- [ ] **Step 2: Move active plans**

```bash
git mv docs/implementation-plans/marketplace-ux-redesign.md docs/plans/active/marketplace-ux-redesign.md
git mv docs/implementation-plans/mobile-usability-security-hardening.md docs/plans/active/mobile-usability-security-hardening.md
git mv docs/implementation-plans/notifications-feature.md docs/plans/active/notifications-feature.md
git mv docs/implementation-plans/phase1-remediation-checklist.md docs/plans/active/phase1-remediation-checklist.md
git mv docs/implementation-plans/phase1-remediation-github-issues.md docs/plans/active/phase1-remediation-github-issues.md
```

- [ ] **Step 3: Move this reorg plan itself**

```bash
git mv docs/superpowers/plans/2026-04-13-docs-reorganization.md docs/plans/active/2026-04-13-docs-reorganization.md
```

Executor note: after this step, the file you are reading is now at `docs/plans/active/2026-04-13-docs-reorganization.md`. Continue reading from there.

- [ ] **Step 4: Verify**

```bash
ls docs/plans/active/
ls docs/plans/_template.md
git status --short
```

Expected: 6 active files + template + the reorg plan itself.

- [ ] **Step 5: Pause, ask, then commit**

> "Task 5 complete: 5 active plans + template + reorg plan moved into docs/plans/. Ready to commit as `refactor(docs): move active plans and template into docs/plans/`?"

On approval:

```bash
git commit -m "refactor(docs): move active plans and template into docs/plans/"
```

---

## Task 6: Move active specs

**Files:**
- Move: `docs/superpowers/specs/2026-04-13-docs-reorganization-design.md` → `docs/specs/2026-04-13-docs-reorganization-design.md`

- [ ] **Step 1: git mv**

```bash
git mv docs/superpowers/specs/2026-04-13-docs-reorganization-design.md docs/specs/2026-04-13-docs-reorganization-design.md
```

- [ ] **Step 2: Verify**

```bash
ls docs/specs/
git status --short
```

Expected: reorg spec in `docs/specs/`, one `R  ` entry.

- [ ] **Step 3: Pause, ask, then commit**

> "Task 6 complete: reorg spec moved into docs/specs/. Ready to commit as `refactor(docs): move active specs into docs/specs/`?"

On approval:

```bash
git commit -m "refactor(docs): move active specs into docs/specs/"
```

---

## Task 7: Archive completed plans and specs

**Files:**
- Move: `docs/implementation-plans/events-feature.md` → `docs/archive/plans/events-feature.md`
- Move: `docs/implementation-plans/public-profile-view.md` → `docs/archive/plans/public-profile-view.md`
- Move: `docs/implementation-plans/promote-listing-feature.md` → `docs/archive/plans/promote-listing-feature.md`
- Move: `docs/implementation-plans/promotion-lifecycle-and-feeds.md` → `docs/archive/plans/promotion-lifecycle-and-feeds.md`
- Move: `docs/superpowers/plans/2026-04-10-drop-is-featured-column.md` → `docs/archive/plans/2026-04-10-drop-is-featured-column.md`
- Move: `docs/superpowers/plans/2026-04-13-fix-promotions-display.md` → `docs/archive/plans/2026-04-13-fix-promotions-display.md`
- Move: `docs/superpowers/specs/2026-04-10-drop-is-featured-column-design.md` → `docs/archive/specs/2026-04-10-drop-is-featured-column-design.md`
- Move: `docs/superpowers/specs/2026-04-13-fix-promotions-display.md` → `docs/archive/specs/2026-04-13-fix-promotions-display.md`
- Move: `docs/marketplace-category-consolidation-plan.md` → `docs/archive/marketplace-category-consolidation-plan.md`

- [ ] **Step 1: Archive completed implementation-plans entries**

```bash
git mv docs/implementation-plans/events-feature.md docs/archive/plans/events-feature.md
git mv docs/implementation-plans/public-profile-view.md docs/archive/plans/public-profile-view.md
git mv docs/implementation-plans/promote-listing-feature.md docs/archive/plans/promote-listing-feature.md
git mv docs/implementation-plans/promotion-lifecycle-and-feeds.md docs/archive/plans/promotion-lifecycle-and-feeds.md
```

- [ ] **Step 2: Archive shipped superpowers plans**

```bash
git mv docs/superpowers/plans/2026-04-10-drop-is-featured-column.md docs/archive/plans/2026-04-10-drop-is-featured-column.md
git mv docs/superpowers/plans/2026-04-13-fix-promotions-display.md docs/archive/plans/2026-04-13-fix-promotions-display.md
```

- [ ] **Step 3: Archive shipped superpowers specs**

```bash
git mv docs/superpowers/specs/2026-04-10-drop-is-featured-column-design.md docs/archive/specs/2026-04-10-drop-is-featured-column-design.md
git mv docs/superpowers/specs/2026-04-13-fix-promotions-display.md docs/archive/specs/2026-04-13-fix-promotions-display.md
```

- [ ] **Step 4: Archive stray marketplace category consolidation plan**

```bash
git mv docs/marketplace-category-consolidation-plan.md docs/archive/marketplace-category-consolidation-plan.md
```

- [ ] **Step 5: Remove now-empty legacy directories**

```bash
rmdir docs/implementation-plans
rmdir docs/superpowers/plans
rmdir docs/superpowers/specs
rmdir docs/superpowers
```

If any `rmdir` fails, something wasn't moved. Stop and investigate.

- [ ] **Step 6: Verify**

```bash
ls docs/archive/plans/ | wc -l   # expect 6
ls docs/archive/specs/ | wc -l   # expect 2
ls docs/archive/marketplace-category-consolidation-plan.md
test ! -e docs/implementation-plans && echo "ok implementation-plans gone"
test ! -e docs/superpowers && echo "ok superpowers gone"
git status --short
```

- [ ] **Step 7: Pause, ask, then commit**

> "Task 7 complete: 9 files archived, 4 legacy directories removed. Ready to commit as `refactor(docs): archive completed plans and specs`?"

On approval:

```bash
git commit -m "refactor(docs): archive completed plans and specs"
```

---

## Task 8: Archive PROGRESS.md

**Files:**
- Move: `PROGRESS.md` → `docs/archive/PROGRESS.md`

- [ ] **Step 1: Move and verify**

```bash
git mv PROGRESS.md docs/archive/PROGRESS.md
ls docs/archive/PROGRESS.md
git status --short
```

- [ ] **Step 2: Pause, ask, then commit**

> "Task 8 complete: PROGRESS.md archived. Ready to commit as `refactor(docs): archive PROGRESS.md (roadmap + memory supersede it)`?"

On approval:

```bash
git commit -m "refactor(docs): archive PROGRESS.md (roadmap + memory supersede it)"
```

---

## Task 9: Delete SKILL.md stub

**Files:**
- Delete: `SKILL.md` (18-line scaffolding stub, unused)

- [ ] **Step 1: Confirm it is still the stub**

```bash
wc -l SKILL.md
head -5 SKILL.md
```

Expected: 18 lines, starts with `---\nname: nepally\ndescription: A brief description of what this skill does`. If the content has changed, STOP and ask the user before deleting.

- [ ] **Step 2: Delete via git**

```bash
git rm SKILL.md
```

- [ ] **Step 3: Verify**

```bash
test ! -e SKILL.md && echo "deleted"
git status --short
```

- [ ] **Step 4: Pause, ask, then commit**

> "Task 9 complete: SKILL.md stub deleted. Ready to commit as `chore(docs): delete empty SKILL.md scaffolding stub`?"

On approval:

```bash
git commit -m "chore(docs): delete empty SKILL.md scaffolding stub"
```

---

## Task 10: Content fixes — branding, paths, phone SMS

All edits target files at their **new** locations (after Tasks 2–8).

Audit found these specific issues:

| File | Issue | Fix |
|---|---|---|
| `README.md` | `phone SMS` reference in Auth row (~line 44) | Replace with "Email + Google (phone SMS removed 2026-03-25)" |
| `TECH-VERSIONS.md` | `Last Updated: 2026-02-24` (line 3) | Change to `Last Updated: 2026-04-13` |
| `docs/guides/setup-and-testing.md` | `unhn` in paths (lines ~33, ~583) | Replace both with `nepally` |
| `docs/guides/setup-and-testing.md` | `Phone SMS auth` mention (~line 56) | Remove or note removed 2026-03-25 |
| `docs/product/roadmap.md` | `Last Updated: 2026-03-10` (line 4) | Change to `Last Updated: 2026-04-13` |
| `docs/product/roadmap.md` | `phone SMS verification planned for long-term` (~line 46) | Remove the line (auth is email + Google only) |
| `docs/guides/deployment.md` | `nusa.app` (~line 149) | Replace with `nepally.app` if deployed there, else `nepally.us` |
| `docs/guides/deployment.md` | Inconsistent `Nepally` capitalization (~lines 344, 351) | Normalize to `Nepally` |
| `docs/architecture/monorepo-structure.md` | `nusa/` as root dir (~line 12) | Replace with `nepally/` |
| `docs/architecture/supabase-setup.md` | `phone SMS` auth (~line 57) | Note removed 2026-03-25 |
| `docs/architecture/supabase-setup.md` | `Twilio` secrets section (~line 365) | Add note: phone SMS auth removed 2026-03-25; section kept for historical reference |
| `docs/product/features/marketplace.md` | `Last Updated: 2026-03-27` (line 4) | Change to `Last Updated: 2026-04-13` |
| `docs/user-journeys/README.md` | `Last Updated: 2026-03-10` (line 4) | Change to `Last Updated: 2026-04-13` |

Line numbers are approximate (from audit) — use grep to locate the exact line before editing.

- [ ] **Step 1: Fix README.md**

First locate the line:

```bash
grep -n "phone SMS\|Phone SMS\|SMS" README.md
```

Then open the file, find the Auth row in the Phase 1 status table, and replace any "phone SMS" text with "Email + Google (phone SMS removed 2026-03-25)". Verify the change with `grep` — it should no longer match the old text.

- [ ] **Step 2: Fix TECH-VERSIONS.md**

```bash
grep -n "Last Updated" TECH-VERSIONS.md
```

Edit line 3 to `**Last Updated:** 2026-04-13`. Verify:

```bash
grep "Last Updated" TECH-VERSIONS.md
```

Expected output: `**Last Updated:** 2026-04-13`.

- [ ] **Step 3: Fix docs/guides/setup-and-testing.md — unhn path**

```bash
grep -n "unhn" docs/guides/setup-and-testing.md
```

Replace every occurrence of `unhn` with `nepally` in this file. After:

```bash
grep -n "unhn" docs/guides/setup-and-testing.md
```

Expected: no output (no matches).

- [ ] **Step 4: Fix docs/guides/setup-and-testing.md — phone SMS**

```bash
grep -n -i "phone sms\|sms verification\|twilio" docs/guides/setup-and-testing.md
```

For each match, replace the paragraph/step with: `(Phone SMS auth was removed 2026-03-25 — current auth is email + Google only.)` or delete the step entirely if it's pure setup for SMS.

- [ ] **Step 5: Fix docs/product/roadmap.md — date + phone SMS**

```bash
grep -n "Last Updated\|phone SMS\|Phone SMS" docs/product/roadmap.md
```

- Edit `Last Updated:` line to `2026-04-13`.
- Remove the phone SMS "deferred to long-term" bullet (auth is email + Google only).

Verify:

```bash
grep -i "phone sms\|sms verification" docs/product/roadmap.md
```

Expected: no output.

- [ ] **Step 6: Fix docs/guides/deployment.md — domain + capitalization**

```bash
grep -n "nusa\.app\|NUSA\|nepally" docs/guides/deployment.md
```

- Replace `nusa.app` with `nepally.us` (the chosen domain per memory). If the file has specific deployment instructions that depend on an actual deployed domain, prefer `nepally.us` and add a comment if uncertain.
- Normalize `NUSA` → `Nepally`.

Verify:

```bash
grep -i "nusa" docs/guides/deployment.md
```

Expected: no output.

- [ ] **Step 7: Fix docs/architecture/monorepo-structure.md**

```bash
grep -n "nusa\|unhn" docs/architecture/monorepo-structure.md
```

Replace `nusa/` with `nepally/` (and any `unhn` with `nepally`). Verify:

```bash
grep -n "nusa\|unhn" docs/architecture/monorepo-structure.md
```

Expected: no output.

- [ ] **Step 8: Fix docs/architecture/supabase-setup.md**

```bash
grep -n -i "phone sms\|twilio\|sms verification" docs/architecture/supabase-setup.md
```

For each match, add an inline note: `> **Note (2026-04-13):** Phone SMS authentication was removed 2026-03-25. This section is retained for historical reference; current auth is email + Google only.` Place the note once at the top of the first relevant section rather than repeating it.

- [ ] **Step 9: Fix docs/product/features/marketplace.md**

```bash
grep -n "Last Updated" docs/product/features/marketplace.md
```

Edit to `Last Updated: 2026-04-13`.

- [ ] **Step 10: Fix docs/user-journeys/README.md**

```bash
grep -n "Last Updated" docs/user-journeys/README.md
```

Edit to `Last Updated: 2026-04-13`.

- [ ] **Step 11: Verify no residual rot in active docs**

```bash
git grep -l -i "NUSA\|unhn\|Firebase\|Flutter" -- ':!docs/archive' ':!docs/decisions' ':!docs/wireframes' ':!docs/user-journeys'
```

Expected: no output. If any file is listed, investigate — it may be a legitimate historical reference (e.g., ADR explaining the rename) or an unfixed rot spot.

For any legitimate historical references in `docs/decisions/` or similar, leave alone. For rot in active docs, fix inline.

- [ ] **Step 12: Pause, ask, then commit**

> "Task 10 complete: 10 content files updated — branding fixed, paths fixed, phone SMS references removed/annotated, dates bumped. Ready to commit as `docs: fix outdated branding, paths, phone SMS references, and dates`?"

On approval:

```bash
git add -u
git commit -m "docs: fix outdated branding, paths, phone SMS references, and dates"
```

---

## Task 11: Verify wireframes and user-journeys for rot

Low-priority spot-check. Wireframes and user journeys are visual/behavioral and were intentionally excluded from the main audit, but we do a one-shot scan to catch any remaining NUSA/Firebase references.

- [ ] **Step 1: Scan wireframes**

```bash
git grep -l -i "NUSA\|unhn\|Firebase\|Flutter\|Twilio\|phone sms" -- 'docs/wireframes/'
```

- [ ] **Step 2: Scan user-journeys**

```bash
git grep -l -i "NUSA\|unhn\|Firebase\|Flutter\|Twilio\|phone sms" -- 'docs/user-journeys/'
```

- [ ] **Step 3: Fix any matches**

For each file in the output, read it, find the offending line, and apply the same fix rules as Task 10 (branding/tech rot → replace; phone SMS → add the removed-2026-03-25 note). If no matches, skip to Step 4.

- [ ] **Step 4: Commit only if there were changes**

```bash
git status --short
```

If there are staged changes:

> "Task 11 complete: wireframes/user-journeys rot fixed. Ready to commit as `docs: fix rot in wireframes and user-journeys`?"

On approval:

```bash
git add -u
git commit -m "docs: fix rot in wireframes and user-journeys"
```

If no changes, skip the commit.

---

## Task 12: Rewrite docs/README.md

**Files:**
- Modify: `docs/README.md`

The old `docs/README.md` described the old folder layout. Replace it with a human-oriented landing page that reflects the new structure and points at `docs/INDEX.md` for the flat list.

- [ ] **Step 1: Read the current file**

```bash
cat docs/README.md
```

Note anything worth preserving (e.g., references to external docs like copilot-instructions).

- [ ] **Step 2: Replace contents**

Overwrite `docs/README.md` with:

```markdown
# Nepally Documentation

Welcome. This folder holds all documentation for the Nepally monorepo.

**Looking for a specific doc?** See [INDEX.md](INDEX.md) — a flat, greppable list of every document with a one-line purpose. It's the fastest way to find things (and what coding agents use).

## Folder layout

| Folder | Contents |
|---|---|
| [guides/](guides/) | How-to docs — setup, code sharing, deployment, feature development workflow |
| [architecture/](architecture/) | How the system is built — monorepo structure, database schema, Supabase setup |
| [product/](product/) | Roadmap and feature specs |
| [product/features/](product/features/) | Per-feature specifications |
| [plans/active/](plans/active/) | In-progress and planned implementation plans |
| [plans/_template.md](plans/_template.md) | Template for new implementation plans |
| [specs/](specs/) | Active design specs from brainstorming sessions |
| [user-journeys/](user-journeys/) | Documented user flows |
| [wireframes/](wireframes/) | Screen-by-screen wireframes |
| [decisions/](decisions/) | Architecture decision records (ADRs) |
| [archive/](archive/) | Completed plans, superseded specs, historical progress docs |

## Canonical references at repo root

- [../README.md](../README.md) — project overview, setup quickstart
- [../CLAUDE.md](../CLAUDE.md) — rules for coding agents working in this repo
- [../TECH-VERSIONS.md](../TECH-VERSIONS.md) — canonical tech stack versions

## Conventions

- **Plans** live in `plans/active/` while in flight, then move to `archive/plans/` when shipped or abandoned.
- **Specs** live in `specs/` while relevant, then move to `archive/specs/` when the work they describe is complete.
- **Completed work stays discoverable** — we archive rather than delete so a coding agent searching "how did we do X" still finds the answer.
- **One canonical home per topic.** If two docs cover the same ground, pick one and delete/archive the other rather than letting them drift.

## Adding a new doc

1. Pick the right folder from the table above.
2. Add an entry to `INDEX.md` under the matching section with a one-line purpose.
3. Follow the filename conventions of siblings.
```

- [ ] **Step 3: Verify**

```bash
head -5 docs/README.md
wc -l docs/README.md
```

Expected: first line `# Nepally Documentation`, ~35 lines.

- [ ] **Step 4: Pause, ask, then commit**

> "Task 12 complete: docs/README.md rewritten to reflect new layout. Ready to commit as `docs: rewrite docs/README.md for new folder layout`?"

On approval:

```bash
git commit -m "docs: rewrite docs/README.md for new folder layout"
```

---

## Task 13: Write docs/INDEX.md

**Files:**
- Create: `docs/INDEX.md`

This is the flat machine-readable map. One line per doc, grouped by folder. Large folders (wireframes, user-journeys, archive) get folder-level pointers rather than per-file lines.

- [ ] **Step 1: Confirm the current file inventory before writing the index**

```bash
ls docs/guides/
ls docs/architecture/
ls docs/product/
ls docs/product/features/
ls docs/plans/
ls docs/plans/active/
ls docs/specs/
ls docs/decisions/
```

The index must match what's actually on disk. If any file listed in this task is missing or extra, fix the index accordingly rather than blindly pasting the template.

- [ ] **Step 2: Create docs/INDEX.md**

Write the file with this content (adjust per-file one-liners if the actual file purpose differs from the description here — open the file and skim the first paragraph if unsure):

```markdown
# Documentation Index

> Flat list of every active document in `docs/` with a one-line purpose.
> Coding agents: this is your map — grep it for keywords to find the right doc fast.
> Humans: also see [README.md](README.md) for the folder overview.

**Last verified:** 2026-04-13
**If you add, move, or retire a doc, update this file in the same commit.**

## Repo root

- [../README.md](../README.md) — project overview and quickstart
- [../CLAUDE.md](../CLAUDE.md) — rules for coding agents working in this repo
- [../TECH-VERSIONS.md](../TECH-VERSIONS.md) — canonical tech stack versions

## Guides (how to work in this repo)

- [guides/setup-and-testing.md](guides/setup-and-testing.md) — environment setup, running apps, testing policy
- [guides/code-sharing.md](guides/code-sharing.md) — shared-first architecture rules and examples
- [guides/deployment.md](guides/deployment.md) — deploying web (Vercel) and mobile (EAS)
- [guides/feature-development.md](guides/feature-development.md) — 7-stage feature development workflow (design → plan → implement → validate)

## Architecture (how the system is built)

- [architecture/monorepo-structure.md](architecture/monorepo-structure.md) — packages/apps layout and import rules
- [architecture/database-schema.md](architecture/database-schema.md) — tables, RLS policies, migration numbering
- [architecture/supabase-setup.md](architecture/supabase-setup.md) — project config, auth providers, storage

## Product

- [product/roadmap.md](product/roadmap.md) — phases, current status, what's next
- [product/features/phase1-feature-breakdown.md](product/features/phase1-feature-breakdown.md) — Phase 1 feature index
- [product/features/events.md](product/features/events.md) — events feature spec
- [product/features/events-feature-breakdown.md](product/features/events-feature-breakdown.md) — events feature sub-breakdown
- [product/features/in-app-chat.md](product/features/in-app-chat.md) — in-app chat feature spec
- [product/features/marketplace.md](product/features/marketplace.md) — marketplace Phase 1 spec
- [product/features/marketplace-future-features.md](product/features/marketplace-future-features.md) — marketplace Phase 2+ backlog
- [product/features/dynamic-location-management.md](product/features/dynamic-location-management.md) — location switcher feature
- [product/features/post-likes-and-comments.md](product/features/post-likes-and-comments.md) — post engagement feature spec

## Plans (active implementation plans)

- [plans/_template.md](plans/_template.md) — template for new implementation plans
- [plans/active/2026-04-13-docs-reorganization.md](plans/active/2026-04-13-docs-reorganization.md) — this plan: reorganize docs (status: in-progress)
- [plans/active/marketplace-ux-redesign.md](plans/active/marketplace-ux-redesign.md) — marketplace filter bar + featured/recent/trending strips (status: planned)
- [plans/active/mobile-usability-security-hardening.md](plans/active/mobile-usability-security-hardening.md) — mobile usability and security hardening (status: planned)
- [plans/active/notifications-feature.md](plans/active/notifications-feature.md) — full notifications (DB + shared API + push) (status: planned)
- [plans/active/phase1-remediation-checklist.md](plans/active/phase1-remediation-checklist.md) — Phase 1 post-audit remediation tasks (status: planned)
- [plans/active/phase1-remediation-github-issues.md](plans/active/phase1-remediation-github-issues.md) — GitHub issue cards for Phase 1 remediation

## Specs (active design specs)

- [specs/2026-04-13-docs-reorganization-design.md](specs/2026-04-13-docs-reorganization-design.md) — this reorg's design spec

## User journeys

Documented user flows for every major surface. See [user-journeys/README.md](user-journeys/README.md) for the full index.

## Wireframes

Screen-by-screen wireframes for Phase 1 UI. See [wireframes/](wireframes/) — 18+ screen folders, each with its own markdown spec.

## Decisions (ADRs)

- [decisions/2026-02-06-facebook-bridge-removal.md](decisions/2026-02-06-facebook-bridge-removal.md) — why we dropped the Facebook group bridge
- [decisions/2026-02-16-shared-types-snake-case.md](decisions/2026-02-16-shared-types-snake-case.md) — shared types use snake_case to match Supabase
- [decisions/2026-02-17-post-tags-redesign-and-premium.md](decisions/2026-02-17-post-tags-redesign-and-premium.md) — post tags redesign and premium toggle

## Archive

Completed plans, shipped specs, historical progress docs. See [archive/](archive/). Notable contents:
- `archive/PROGRESS.md` — historical implementation tracker (superseded by roadmap + memory)
- `archive/marketplace-category-consolidation-plan.md` — shipped as migration 016
- `archive/plans/` — completed implementation plans (events, public-profile-view, promote-listing, promotion-lifecycle, drop-is-featured, fix-promotions-display)
- `archive/specs/` — design specs for shipped features
```

- [ ] **Step 3: Verify the file exists and the section count matches actual inventory**

```bash
wc -l docs/INDEX.md
ls docs/guides/ docs/architecture/ docs/product/features/ docs/plans/active/ docs/specs/ docs/decisions/
```

Cross-check: every file in the `ls` output should appear in `docs/INDEX.md`. Use:

```bash
for f in $(ls docs/guides docs/architecture docs/product docs/product/features docs/plans docs/plans/active docs/specs docs/decisions 2>/dev/null); do
  grep -q "$f" docs/INDEX.md || echo "MISSING FROM INDEX: $f"
done
```

Expected: no `MISSING FROM INDEX` output. If any file is missing, add it to the index before proceeding.

- [ ] **Step 4: Pause, ask, then commit**

> "Task 13 complete: docs/INDEX.md created with flat list of all active docs. Ready to commit as `docs: add INDEX.md as canonical flat map of all docs`?"

On approval:

```bash
git add docs/INDEX.md
git commit -m "docs: add INDEX.md as canonical flat map of all docs"
```

---

## Task 14: Update CLAUDE.md with "Finding docs" section and new paths

**Files:**
- Modify: `CLAUDE.md`

Two changes:
1. Add a "Finding docs" section that points agents at `docs/INDEX.md` as the canonical map.
2. Update the brainstorming/writing-plans default-path references so future superpowers sessions use the new paths (`docs/specs/` and `docs/plans/active/` instead of `docs/superpowers/specs/` and `docs/superpowers/plans/`).

- [ ] **Step 1: Read the current CLAUDE.md**

```bash
cat CLAUDE.md
```

Identify where to insert the "Finding docs" section — after the "Project Overview" section but before "Core Architecture Principles" is a good spot.

- [ ] **Step 2: Add "Finding docs" section**

Insert this block after the Project Overview section of `CLAUDE.md`:

```markdown
## Finding Docs

The canonical map of every document in this repo is **[docs/INDEX.md](./docs/INDEX.md)**. It's a flat, greppable list — search it first before reading through the folder tree. The index covers guides, architecture, product specs, plans, and decisions. Completed plans live in `docs/archive/`.

Rules for keeping the index honest:
- Adding a doc? Add a one-line entry to `docs/INDEX.md` in the same commit.
- Moving or archiving a doc? Update `docs/INDEX.md` in the same commit.
- Superpowers brainstorming/writing-plans: save specs to `docs/specs/` and plans to `docs/plans/active/` (not `docs/superpowers/...`).
```

- [ ] **Step 3: Search for any other references to the old doc paths**

```bash
grep -n "docs/superpowers\|docs/implementation-plans\|docs/features" CLAUDE.md
```

For each hit, update the path to the new location:
- `docs/implementation-plans/` → `docs/plans/active/`
- `docs/features/` → `docs/product/features/`
- `docs/superpowers/specs/` → `docs/specs/`
- `docs/superpowers/plans/` → `docs/plans/active/`

Also update any reference to `docs/code-sharing-guide.md` → `docs/guides/code-sharing.md`, and `docs/monorepo-structure.md` → `docs/architecture/monorepo-structure.md`.

- [ ] **Step 4: Verify CLAUDE.md has no broken doc links**

```bash
grep -n "docs/" CLAUDE.md
```

Every path should exist:

```bash
for p in $(grep -oE 'docs/[a-zA-Z0-9_/.-]+\.md' CLAUDE.md); do
  test -e "$p" && echo "ok $p" || echo "MISSING $p"
done
```

Expected: all `ok`, no `MISSING`.

- [ ] **Step 5: Pause, ask, then commit**

> "Task 14 complete: CLAUDE.md updated with 'Finding docs' section and new doc paths. Ready to commit as `docs: point CLAUDE.md at docs/INDEX.md and update doc paths`?"

On approval:

```bash
git add CLAUDE.md
git commit -m "docs: point CLAUDE.md at docs/INDEX.md and update doc paths"
```

---

## Task 15: Broken-link sweep

**Files:**
- Potentially modify: any file with a broken internal `.md` link.

Every move risks breaking internal links. Sweep the entire repo for references to the old paths.

- [ ] **Step 1: Search for references to moved/deleted paths**

```bash
git grep -l "SETUP-AND-TESTING-GUIDE\|product-roadmap\.md\|PROGRESS\.md\|SKILL\.md\|docs/code-sharing-guide\|docs/deployment-guide\|docs/feature-development-process\|docs/monorepo-structure\|docs/database-schema\|docs/supabase-setup\|docs/features/\|docs/implementation-plans/\|docs/superpowers/\|docs/marketplace-category-consolidation-plan"
```

This returns every file that mentions any old path.

- [ ] **Step 2: For each file, fix the references**

For each file in the output:
1. Open it.
2. Find each reference to an old path.
3. Replace with the new path per the File Fate Reference Table at the top of this plan.

Common replacements:
- `SETUP-AND-TESTING-GUIDE.md` → `docs/guides/setup-and-testing.md` (or relative path if inside docs/)
- `product-roadmap.md` → `docs/product/roadmap.md`
- `PROGRESS.md` → `docs/archive/PROGRESS.md`
- `docs/code-sharing-guide.md` → `docs/guides/code-sharing.md`
- `docs/deployment-guide.md` → `docs/guides/deployment.md`
- `docs/feature-development-process.md` → `docs/guides/feature-development.md`
- `docs/monorepo-structure.md` → `docs/architecture/monorepo-structure.md`
- `docs/database-schema.md` → `docs/architecture/database-schema.md`
- `docs/supabase-setup.md` → `docs/architecture/supabase-setup.md`
- `docs/features/<file>.md` → `docs/product/features/<file>.md`
- `docs/implementation-plans/<active-file>.md` → `docs/plans/active/<file>.md`
- `docs/implementation-plans/<archived-file>.md` → `docs/archive/plans/<file>.md`
- `docs/superpowers/specs/<active>.md` → `docs/specs/<file>.md`
- `docs/superpowers/plans/<active>.md` → `docs/plans/active/<file>.md`
- `docs/superpowers/{specs,plans}/<archived>.md` → `docs/archive/{specs,plans}/<file>.md`
- `docs/marketplace-category-consolidation-plan.md` → `docs/archive/marketplace-category-consolidation-plan.md`

Note: do NOT modify files inside `docs/archive/` — historical docs should be left pointing at their old paths (preserves the snapshot-in-time record). Only fix active files.

- [ ] **Step 3: Re-sweep**

```bash
git grep -l "SETUP-AND-TESTING-GUIDE\|product-roadmap\.md\|docs/code-sharing-guide\|docs/deployment-guide\|docs/feature-development-process\|docs/monorepo-structure\b\|docs/database-schema\b\|docs/supabase-setup\b\|docs/features/\|docs/implementation-plans/\|docs/superpowers/" -- ':!docs/archive'
```

Expected: no output (no live references to old paths outside archive). If any files appear, fix them and re-sweep.

- [ ] **Step 4: Verify archive/ still contains the old path references (sanity check)**

```bash
git grep -l "docs/features\|docs/implementation-plans" -- docs/archive/ | head -5
```

These are fine — archive docs are historical snapshots. No action needed.

- [ ] **Step 5: Pause, ask, then commit**

> "Task 15 complete: broken-link sweep done, all live references updated. Ready to commit as `docs: fix broken internal links after reorganization`?"

On approval:

```bash
git add -u
git commit -m "docs: fix broken internal links after reorganization"
```

---

## Task 16: Final verification

No writes. Just run the success-criteria checks and report the result.

- [ ] **Step 1: Repo root has only the 3 sanctioned doc files**

```bash
ls *.md
```

Expected output (exactly these three, no more):
```
CLAUDE.md
README.md
TECH-VERSIONS.md
```

If any other `.md` file appears at root, it was missed in Tasks 2-9. Fix it.

- [ ] **Step 2: No branding/tech rot in active docs**

```bash
git grep -l -i "NUSA\|unhn\|Firebase\|Flutter" -- ':!docs/archive' ':!docs/decisions' ':!docs/wireframes'
```

Expected: no output. Any remaining hit in `docs/wireframes/` or `docs/decisions/` is likely a legitimate historical reference — spot-check each; only fix if it's an active claim about current state.

- [ ] **Step 3: Every file in docs/INDEX.md exists**

```bash
for p in $(grep -oE 'docs/[a-zA-Z0-9_/.-]+\.md\|\([a-zA-Z0-9_/.-]+\.md' docs/INDEX.md | tr -d '(' | sort -u); do
  test -e "docs/$p" -o -e "$p" || echo "MISSING $p"
done
```

Expected: no `MISSING` output.

- [ ] **Step 4: No live references to old paths**

```bash
git grep -c "docs/superpowers\|docs/implementation-plans\|docs/features/" -- ':!docs/archive' ':!docs/plans/active/2026-04-13-docs-reorganization.md' ':!docs/specs/2026-04-13-docs-reorganization-design.md'
```

The exclusions: archive is allowed to reference old paths, and this plan + its spec are allowed to reference old paths in their historical "file fate" documentation.

Expected: no output.

- [ ] **Step 5: Git history preserved for a sample of moved files**

```bash
git log --follow --oneline docs/guides/setup-and-testing.md | head -5
git log --follow --oneline docs/product/roadmap.md | head -5
git log --follow --oneline docs/architecture/monorepo-structure.md | head -5
```

Expected: each command shows commits from before the reorg (proving `--follow` works through the rename).

- [ ] **Step 6: Count check — nothing was lost**

```bash
git log master..HEAD --oneline
find docs -type f -name '*.md' | wc -l
```

Compare file count against the pre-reorg count (60 + the new spec + INDEX.md + reorg plan ≈ 63). Exact count is less important than: no unexpected deletions. If the count is way off, investigate with `git log --diff-filter=D --summary master..HEAD`.

- [ ] **Step 7: Final status and summary**

```bash
git status
git log master..HEAD --oneline
```

Report to user:

> "Task 16 (final verification) complete:
> - ✅ Root contains only README.md, CLAUDE.md, TECH-VERSIONS.md
> - ✅ No branding/tech rot in active docs
> - ✅ Every file in docs/INDEX.md exists
> - ✅ No live references to old paths
> - ✅ Git history preserved via --follow
> - ✅ File count consistent
>
> Branch `chore/docs-reorganization` is ready for review. Total commits: <N>. Would you like me to push and open a PR, or do you want to review locally first?"

Per CLAUDE.md, do NOT push without explicit approval.

---

## Rollback

If at any point the result is wrong and you want to start over:

```bash
git checkout master
git branch -D chore/docs-reorganization
```

All moves were on the branch, so master is untouched. Create a new branch from master and retry.

Partial rollback (undo last task only):

```bash
git reset --hard HEAD~1
```

This drops the most recent commit. Safe because nothing has been pushed.

---

## Post-execution followups

Not part of this plan, but worth noting for a future session:

- Update auto-memory `MEMORY.md` to reflect new doc paths (the memory currently references `docs/implementation-plans/` in a few places — those should move to `docs/plans/active/`).
- Consider whether the `docs/wireframes/` tree deserves its own README index (18 screens with no top-level map is a lot).
- Consider adding a CI check that greps `docs/INDEX.md` against actual file inventory so the index can't drift.
