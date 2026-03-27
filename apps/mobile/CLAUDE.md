# Mobile App — Claude Code Instructions

These rules apply to all work within `apps/mobile/`. They supplement the root `CLAUDE.md`.

## Testing Rules (React 19 + RNTL v13)

**Before writing or modifying tests, read `apps/mobile/TESTING-PATTERNS.md` for full patterns and examples.**

### Golden Rules (memorize these)

1. **Any component using `setInterval`/`setTimeout` with state updates MUST have `jest.useFakeTimers()` in `beforeEach`.**
2. **NEVER use `waitFor` in test files that use `jest.useFakeTimers()`.** Use `await act(async () => {})` instead.
3. **Before `await act(async () => {})`, advance fake timers past any interval duration** so the component clears it naturally — prevents act() deadlocks.
4. **Use multiple `await act(async () => {})` calls** for handlers with 3+ chained awaits.
5. **Never use `waitFor` with explicit timeouts or `testTimeout` overrides** — find and fix the root cause.

### Global test setup (`jest.setup.ts` already handles)
- `RNTL_SKIP_AUTO_CLEANUP`, synchronous `cleanup()` + event-loop yield in `afterEach`
- `jest.clearAllTimers()` after cleanup, `jest.useRealTimers()` in `beforeEach`
- Global `@expo/vector-icons` mock
- Do NOT duplicate these in individual test files.

## Running Tests Like CI

```bash
npm run test:ci --workspace=apps/mobile   # Serial, single process — exposes timer leaks
npm run ci:local                          # Full local CI (lint + types + all workspace tests)
```
