# Mobile App — Claude Code Instructions

These rules apply to all work within `apps/mobile/`. They supplement the root `CLAUDE.md`.

## Testing Rules (React 19 + RNTL v13)

### Timer Safety (CRITICAL)

React 19's `act()` awaits pending scheduler work before closing. A real `setInterval` or `setTimeout` that triggers React state updates creates an infinite loop: the timer fires, queues new React work, act() waits for it, the timer fires again. On slow CI runners (`--runInBand`), this causes:
- Stale act() scopes that leak into subsequent test suites
- Tests hanging at their 10-second timeout
- `waitFor` never resolving in downstream test files

**Rule: Any component that uses `setInterval` or recurring `setTimeout` MUST have `jest.useFakeTimers()` in its test's `beforeEach`.**

Pattern:
```typescript
describe('ComponentWithTimers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    // ... mock setup
  });

  afterEach(() => {
    // Clear fake timers WITHOUT running them (jest.runOnlyPendingTimers
    // would fire callbacks and trigger act() warnings).
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('timer-dependent behavior', () => {
    const { getByText } = render(<Component />);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(getByText('Updated')).toBeTruthy();
  });
});
```

**Never use `jest.runOnlyPendingTimers()` or `jest.runAllTimers()` outside of `act()`** — they fire timer callbacks which update React state outside act(), producing warnings that can cascade into hangs.

### How to check if a component needs fake timers

Before writing or modifying a test, grep the component source for:
- `setInterval` / `clearInterval`
- `setTimeout` with state updates in the callback
- Any hook that internally uses intervals (e.g., countdown hooks)

If any are found, the test file MUST use `jest.useFakeTimers()` in `beforeEach`.

### Global test setup reference

`jest.setup.ts` already handles:
- `RNTL_SKIP_AUTO_CLEANUP` — disables RNTL's async cleanup that hangs with React 19
- Synchronous `cleanup()` + event-loop yield in `afterEach`
- `jest.clearAllTimers()` after cleanup
- `jest.useRealTimers()` in `beforeEach` to prevent fake-timer leaks between suites
- Global `@expo/vector-icons` mock

Do NOT duplicate these in individual test files. The per-test `jest.useFakeTimers()` in `beforeEach` intentionally overrides the global `jest.useRealTimers()` for that suite only.

### Async testing patterns

- **Never use `waitFor` in test files that use `jest.useFakeTimers()`.** `waitFor` advances fake timers while polling; once the accumulated advances reach the component's `setInterval` period (e.g., 1000ms), the interval fires, creates new React work, and `waitFor` keeps polling forever — an infinite loop that hangs on slow CI.
- Instead, use `await act(async () => {})` after `fireEvent` to flush the entire microtask chain (all chained promise resolutions from mocks), then assert directly:
  ```typescript
  fireEvent.press(button);
  await act(async () => {});
  expect(mockFn).toHaveBeenCalled();
  ```
- For synchronous state updates (validation errors with no `await` in the handler), assert directly after `fireEvent` — no `act` or `waitFor` needed.
- Never use `waitFor` with explicit timeouts or `testTimeout` overrides as a workaround for timing issues — find and fix the root cause instead.

### Expire intervals before async assertions (CRITICAL)

React 19's `act()` waits for ALL pending React work, including registered `setInterval` callbacks. With fake timers, a frozen interval never fires but `act()` still sees it as pending work — creating a **deadlock** where `act()` waits forever. This passes locally (fast machine) but hangs on slow CI runners.

**Rule: Before any `await act(async () => {})` that flushes an async handler, advance fake timers past the interval's full duration so the component clears it naturally.**

```typescript
it('async action with component that has setInterval', async () => {
  const { getByTestId } = render(<ComponentWithCooldown />);

  // Expire the interval BEFORE triggering async work
  act(() => {
    jest.advanceTimersByTime(61000); // past 60s cooldown
  });

  fireEvent.press(getByTestId('submit'));
  await act(async () => {});
  expect(mockFn).toHaveBeenCalled();
});
```

**Why not just `jest.clearAllTimers()` instead?** `clearAllTimers()` removes the timer from Jest's queue but does NOT trigger the component's cleanup logic (the `clearInterval` inside the state updater). React may still see stale scheduled work. Advancing time lets the component's own `if (prev <= 1) clearInterval(...)` logic run, cleanly removing the interval from both Jest and React's perspective.

### Multiple act() flushes for long async chains

A single `await act(async () => {})` flushes one level of the microtask queue. If the handler has many sequential `await` calls (e.g., `await a(); await b(); await c(); await d(); await e()`), one flush is not enough — React 19's scheduler on slow CI may not process all microtask boundaries in a single pass.

**Rule: Use multiple `await act(async () => {})` calls for handlers with 3+ chained awaits.**

```typescript
// Handler has 5 sequential awaits: verify → getUser → createProfile → markVerified → refresh
fireEvent.press(getByTestId('submit'));
await act(async () => {});
await act(async () => {});
expect(mockNavigate).toHaveBeenCalled();
```

**How many act() calls?** 2 is sufficient for chains up to ~5 awaits. For very long chains, add more. Reference: `CreatePostScreen.test.tsx` uses double `act()` in `renderAndSettle()` and additional `act()` calls after interactions.

### Combined pattern for components with timers + async handlers

This is the full pattern for the most common case (component with `setInterval` AND async event handlers):

```typescript
describe('ComponentWithTimerAndAsync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    // mock setup...
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // Sync assertion — no act/waitFor needed
  it('validates input synchronously', () => {
    const { getByTestId, getByText } = render(<Component />);
    fireEvent.press(getByTestId('submit'));
    expect(getByText('Validation error')).toBeTruthy();
  });

  // Short async chain (1-2 awaits) — expire interval + single act
  it('shows error from async call', async () => {
    mockApi.mockResolvedValueOnce({ success: false, error: new Error('fail') });
    const { getByTestId, getByText } = render(<Component />);
    act(() => { jest.advanceTimersByTime(61000); }); // expire interval
    fireEvent.press(getByTestId('submit'));
    await act(async () => {});
    expect(getByText('fail')).toBeTruthy();
  });

  // Long async chain (3+ awaits) — expire interval + double act
  it('completes full success flow', async () => {
    mockApi.mockResolvedValueOnce({ success: true });
    const { getByTestId } = render(<Component />);
    act(() => { jest.advanceTimersByTime(61000); }); // expire interval
    fireEvent.press(getByTestId('submit'));
    await act(async () => {});
    await act(async () => {});
    expect(mockNavigate).toHaveBeenCalled();
  });
});
```

## Running Tests Like CI

Always verify with CI-equivalent flags before pushing:

```bash
# Exact CI command (serial, single process — exposes timer leaks)
npm run test:ci --workspace=apps/mobile

# Full local CI (lint + types + all workspace tests)
npm run ci:local
```

The `--runInBand` flag in `test:ci` runs all 38 test suites in a single process sequentially. This is what exposes timer/act() leaks that parallel execution hides.
