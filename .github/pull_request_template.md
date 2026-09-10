## Summary

- What changed?
- Why was this change needed?

## Scope

- [ ] `packages/shared`
- [ ] `apps/web`
- [ ] `apps/mobile`

## Documentation

- [ ] `npm run docs:check` passes.
- [ ] `docs/INDEX.md` updated if any doc was added, moved, or retired.
- [ ] Feature behavior change reflected in `docs/product/features/<feature>.md` (the evergreen doc).
- [ ] Schema change reflected in `docs/architecture/database-schema.md`.
- [ ] Completed plan/spec: `status:` set to `implemented` and the file `git mv`'d to `docs/archive/`.
- [ ] Non-obvious architectural decision recorded as an ADR in `docs/decisions/`.
- [ ] `docs/product/roadmap.md` updated if a roadmap item shipped.

Which doc to update when: [docs/guides/documentation-workflow.md](../docs/guides/documentation-workflow.md).

## Testing (Required)

### Unit Test Policy

- [ ] New functionality includes unit tests in this PR.
- [ ] Changed behavior includes updated unit tests.
- [ ] Test files are placed in the correct workspace location.

### Workspace Validation (mark N/A if untouched)

- [ ] `npm run test --workspace=packages/shared`
- [ ] `npm run test:coverage --workspace=packages/shared`
- [ ] `npm run test --workspace=apps/web`
- [ ] `npm run test:coverage --workspace=apps/web`
- [ ] `npm run test --workspace=apps/mobile`
- [ ] `npm run test:coverage --workspace=apps/mobile`

### Monorepo Validation

- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run test`
- [ ] `npm run test:coverage`

## Database Migrations (if applicable)

- [ ] All schema changes use a **new incremental file** (`004_*.sql`, `005_*.sql`, etc.) — never modifying `001`, `002`, or `003`.
- [ ] Migration SQL is additive/non-destructive (`ALTER TABLE`, `CREATE INDEX`, `CREATE POLICY`, etc.).
- [ ] No `DROP TABLE` or `DROP TYPE` without explicit confirmation that no live data is affected.
- [ ] Filename uses sequential numeric prefix, not a timestamp.

## Architecture Compliance

- [ ] Shared-first rules followed (no duplicated business logic across apps).
- [ ] New shared modules are exported from `packages/shared/src/index.ts` (if applicable).
- [ ] Web changes do not introduce JSX inline styles (if applicable).

## Notes for Reviewers

- Known limitations, follow-ups, or migration notes.
