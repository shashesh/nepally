# Nepally Documentation

Welcome. This folder holds all documentation for the Nepally monorepo.

**Looking for a specific doc?** See [INDEX.md](INDEX.md) — a flat, greppable list of every document with a one-line purpose. It's the fastest way to find things (and what coding agents use).

## Folder layout

| Folder                                   | Contents                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| [guides/](guides/)                       | How-to docs — setup, code sharing, deployment, feature development, documentation workflow |
| [architecture/](architecture/)           | How the system is built — monorepo structure, database schema, Supabase setup              |
| [product/](product/)                     | Roadmap and feature specs                                                                  |
| [product/features/](product/features/)   | **Evergreen** per-feature specs — what each feature is today                               |
| [plans/active/](plans/active/)           | In-flight implementation plans only                                                        |
| [plans/_template.md](plans/_template.md) | Template for new implementation plans                                                      |
| [specs/](specs/)                         | **Point-in-time** design specs — one change each, archived when it ships                   |
| [user-journeys/](user-journeys/)         | Documented user flows                                                                      |
| [wireframes/](wireframes/)               | Screen-by-screen wireframes (`_prototypes/` holds HTML/CSS exploration)                    |
| [decisions/](decisions/)                 | Architecture decision records (ADRs)                                                       |
| [archive/](archive/)                     | Completed plans, shipped specs, historical progress docs                                   |

### `product/features/` vs `specs/`

Both describe features. Only one is kept current — this is the most common filing
mistake.

|              | `product/features/<name>.md`          | `specs/YYYY-MM-DD-<topic>-design.md`    |
| ------------ | ------------------------------------- | --------------------------------------- |
| **Tense**    | Present — what the feature _is_       | Past-dated — what one change _proposed_ |
| **Lifetime** | Evergreen; edited as behavior changes | Frozen at approval                      |
| **On ship**  | Updated                               | Archived to `archive/specs/`            |
| **Answers**  | "How does marketplace work today?"    | "Why did we redesign it in April?"      |

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
2. If it is a plan or spec, add frontmatter (see below).
3. Add an entry to [INDEX.md](INDEX.md) under the matching section with a one-line purpose.
4. Run `npm run docs:check` — CI fails on a doc that is not indexed.

Full procedure, including which doc to update when: [guides/documentation-workflow.md](guides/documentation-workflow.md).

## Document status

Plans and specs carry frontmatter. These four values are the whole vocabulary, and
CI validates them:

```yaml
---
title: Notifications feature
status: planned | in-progress | implemented | abandoned
created: 2026-04-13
---
```

**`implemented` or `abandoned` means the file must live under `archive/`.** That is
the one rule that stops `plans/active/` from quietly becoming a second archive.

## Checks

```bash
npm run docs:check   # broken links, unindexed docs, plan lifecycle
npm run docs:test    # unit tests for the checkers themselves
```

Both run in CI on any PR that touches markdown.

## Testing policy quickref

See [guides/setup-and-testing.md](guides/setup-and-testing.md) for the full testing workflow. Minimum pre-PR commands:

```bash
npm run lint
npm run type-check
npm run test
npm run test:coverage
```
