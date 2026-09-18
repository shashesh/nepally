# Documentation Workflow

**Last Updated:** 2026-09-08

How documentation stays current in this repo, and what happens when it does not.

---

## The short version

Some documentation rules are **enforced by CI** and cannot be skipped. Others are
**prompts in the PR template** and rely on you. This guide is explicit about which is
which, because treating a checkbox as an enforcement mechanism is how this repo
accumulated 115 broken links and an index that went stale for three months.

Before opening a PR:

```bash
npm run docs:check
```

---

## Trigger matrix

The answer to "which doc do I update?"

| If you changed… | You must update… | Enforced by |
|---|---|---|
| DB schema / added a migration | `architecture/database-schema.md` | PR template |
| A feature's user-visible behavior | `product/features/<feature>.md` | PR template |
| Setup, deploy, or test commands | The matching `guides/` doc | PR template |
| Monorepo layout or import rules | `architecture/monorepo-structure.md` | PR template |
| Added a `test:security:*` script | The table in `guides/setup-and-testing.md` | PR template |
| Made a non-obvious architectural call | New ADR in `decisions/` | PR template |
| Shipped a roadmap item | `product/roadmap.md` | PR template |
| **Finished a plan or spec** | `status: implemented` → `git mv` to `archive/` | **CI** |
| **Added, moved, or retired any doc** | `INDEX.md` | **CI** |
| **Moved a doc other docs link to** | The linking docs | **CI** |

Rows marked **CI** fail the build. Rows marked *PR template* are prompts a human can
skip — they are honest about being unenforced rather than pretending otherwise.

---

## Evergreen vs point-in-time

The most common filing mistake. Both describe features; only one is kept current.

| | `product/features/<name>.md` | `specs/YYYY-MM-DD-<topic>-design.md` |
|---|---|---|
| **Tense** | Present — what the feature *is* | Past-dated — what one change *proposed* |
| **Lifetime** | Evergreen; edited as behavior changes | Frozen at approval |
| **On ship** | Updated | Archived to `archive/specs/` |
| **Answers** | "How does marketplace work today?" | "Why did we redesign it in April?" |

When a spec ships, the shipping PR updates the evergreen feature doc **and** archives
the spec. If you only archive the spec, the knowledge leaves the repo. If you only
update the feature doc, the reasoning does.

---

## Document lifecycle

```text
idea → specs/YYYY-MM-DD-<topic>-design.md          (status: planned)
     → plans/active/YYYY-MM-DD-<topic>.md          (status: planned → in-progress)
     → implementation
     → product/features/<feature>.md updated       (evergreen doc absorbs the truth)
     → spec and plan: status: implemented, git mv → archive/
     → INDEX.md updated in the same commit
```

Archived docs are **kept, not deleted** — an agent searching "how did we do X" should
still find the answer. That is also why the link checker covers `archive/`: an
archived doc full of 404s is not a usable record.

---

## Frontmatter contract

Required on every file under `plans/` and `specs/`, including `archive/`:

```yaml
---
title: Notifications feature
status: planned | in-progress | implemented | abandoned
created: 2026-04-13
spec: docs/specs/2026-04-13-notifications-design.md   # plans only; optional
---
```

Flat `key: value` only — no nesting, no lists. The parser is 40 lines in
`scripts/docs/frontmatter.js` rather than a YAML dependency at the monorepo root.

**The hard rule:** `status: implemented` or `abandoned` means the file MUST live under
`docs/archive/`. CI fails otherwise. This one invariant is what stops `plans/active/`
from silently becoming an archive.

Use `abandoned` for work that was superseded or dropped — it is not a failure state,
it is how a plan stops being live without pretending it shipped.

---

## What `npm run docs:check` checks

| Rule | Meaning | Fix |
|---|---|---|
| `broken-link` | A relative `.md`/`.html` link does not resolve | Repoint it, or remove it if the target was never written |
| `index-orphan` | A doc exists but `INDEX.md` never mentions it | Add a one-line entry |
| `index-dangling` | `INDEX.md` points at something that does not exist | Fix or remove the entry |
| `missing-frontmatter` | A plan/spec has no frontmatter block | Add one per the contract above |
| `invalid-status` | `status:` is not one of the four values | Use a valid value |
| `unarchived-terminal` | `implemented`/`abandoned` outside `archive/` | `git mv` it into `archive/` |
| `archived-non-terminal` | `planned`/`in-progress` inside `archive/` | Fix the status, or move it back to `active/` |

**Exempt from `index-orphan`:** `INDEX.md` itself, anything under `archive/`, and any
path with an underscore-prefixed segment (`plans/_template.md`,
`wireframes/_prototypes/`). Underscore is the general escape hatch — prefix a folder
with `_` to keep it out of the index.

**Not checked, deliberately:** anchor fragments (`file.md#section`), external URL
liveness, and prose style. Links inside fenced code blocks and inline code spans are
skipped — they are examples, not links.

---

## Quarterly freshness sweep

The residue no script can catch: a guide naming a renamed skill, a wireframe
describing a screen that shipped differently, a version table that drifted. Open an
issue with the **Documentation drift** template each quarter and work this list:

- [ ] Re-read every `guides/` doc against current tooling — verify every skill name and command still exists.
- [ ] Verify `TECH-VERSIONS.md` against `package.json` across all three workspaces.
- [ ] Verify `architecture/database-schema.md` against the highest-numbered file in `supabase/migrations/`.
- [ ] Confirm `product/roadmap.md` phase status matches what has actually shipped.
- [ ] Re-check `plans/active/` — is anything there actually finished?
- [ ] Stamp `Last verified: YYYY-MM-DD` in `INDEX.md`.

Deliberately human and deliberately short. A sweep that takes an afternoon gets
skipped; six checks does not.

---

## Adding a new doc

1. Pick the folder from the table in [../README.md](../README.md).
2. If it is a plan or spec, add frontmatter.
3. Add a one-line entry to [../INDEX.md](../INDEX.md) — CI fails without it.
4. Run `npm run docs:check`.

---

## Why this exists

The April 2026 reorganization built a good folder taxonomy and left no way to keep it
true. Five months later: 115 broken links, an index three months stale, two plans
labelled `implemented` still sitting in `plans/active/`, and a journeys README
advertising fourteen documents when seven existed.

None of that was carelessness. It was the predictable result of enforcing code
quality mechanically and documentation quality by memory. The fix is not more
discipline — it is putting docs on the same footing as lint and type-check.
