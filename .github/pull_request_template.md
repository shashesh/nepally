## Summary

- What changed?
- Why was this change needed?

## Scope

- [ ] `packages/shared`
- [ ] `apps/web`
- [ ] `apps/mobile`

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

## Architecture Compliance

- [ ] Shared-first rules followed (no duplicated business logic across apps).
- [ ] New shared modules are exported from `packages/shared/src/index.ts` (if applicable).
- [ ] Web changes do not introduce JSX inline styles (if applicable).

## Notes for Reviewers

- Known limitations, follow-ups, or migration notes.
