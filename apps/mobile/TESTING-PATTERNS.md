# Mobile Testing Patterns (React 19 + RNTL v13)

Reference document for detailed testing patterns. See `apps/mobile/CLAUDE.md` for the golden rules summary.

## Timer Safety

React 19's `act()` awaits pending scheduler work before closing. A real `setInterval`/`setTimeout` that triggers React state updates creates an infinite loop. On slow CI runners (`--runInBand`), this causes stale act() scopes, hanging tests, and `waitFor` never resolving.

### How to check if a component needs fake timers

Grep the component source for:

- `setInterval` / `clearInterval`
- `setTimeout` with state updates in the callback
- Any hook that internally uses intervals (e.g., countdown hooks)

If any are found, the test file MUST use `jest.useFakeTimers()` in `beforeEach`.

### Pattern: Component with timers

```typescript
describe('ComponentWithTimers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
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

**Never use `jest.runOnlyPendingTimers()` or `jest.runAllTimers()` outside of `act()`.**

## Async Testing Patterns

- Use `await act(async () => {})` after `fireEvent` to flush the microtask chain:

  ```typescript
  fireEvent.press(button);
  await act(async () => {});
  expect(mockFn).toHaveBeenCalled();
  ```

- For synchronous state updates (validation errors), assert directly after `fireEvent`.

## Expire Intervals Before Async Assertions

Before any `await act(async () => {})` that flushes an async handler, advance fake timers past the interval's full duration so the component clears it naturally:

```typescript
it('async action with component that has setInterval', async () => {
  const { getByTestId } = render(<ComponentWithCooldown />);
  act(() => { jest.advanceTimersByTime(61000); }); // past 60s cooldown
  fireEvent.press(getByTestId('submit'));
  await act(async () => {});
  expect(mockFn).toHaveBeenCalled();
});
```

**Why not `jest.clearAllTimers()`?** It removes the timer from Jest's queue but doesn't trigger the component's cleanup logic. Advancing time lets the component's own `clearInterval` logic run cleanly.

## Multiple act() Flushes

A single `await act(async () => {})` flushes one level of the microtask queue. For handlers with 3+ chained awaits, use multiple:

```typescript
fireEvent.press(getByTestId('submit'));
await act(async () => {});
await act(async () => {});
expect(mockNavigate).toHaveBeenCalled();
```

2 act() calls is sufficient for chains up to ~5 awaits.

## Combined Pattern: Timers + Async Handlers

```typescript
describe('ComponentWithTimerAndAsync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
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

  // Short async chain (1-2 awaits)
  it('shows error from async call', async () => {
    mockApi.mockResolvedValueOnce({ success: false, error: new Error('fail') });
    const { getByTestId, getByText } = render(<Component />);
    act(() => { jest.advanceTimersByTime(61000); });
    fireEvent.press(getByTestId('submit'));
    await act(async () => {});
    expect(getByText('fail')).toBeTruthy();
  });

  // Long async chain (3+ awaits)
  it('completes full success flow', async () => {
    mockApi.mockResolvedValueOnce({ success: true });
    const { getByTestId } = render(<Component />);
    act(() => { jest.advanceTimersByTime(61000); });
    fireEvent.press(getByTestId('submit'));
    await act(async () => {});
    await act(async () => {});
    expect(mockNavigate).toHaveBeenCalled();
  });
});
```
