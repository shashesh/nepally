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
2. Add an entry to [INDEX.md](INDEX.md) under the matching section with a one-line purpose.
3. Follow the filename conventions of siblings.

## Document status labels

- **Draft** — Work in progress
- **In Review** — Ready for feedback
- **Approved** — Finalized, ready for implementation
- **Implemented** — Feature has been built
- **Deprecated** — No longer relevant (candidate for archive)

## Testing policy quickref

See [guides/setup-and-testing.md](guides/setup-and-testing.md) for the full testing workflow. Minimum pre-PR commands:

```bash
npm run lint
npm run type-check
npm run test
npm run test:coverage
```
