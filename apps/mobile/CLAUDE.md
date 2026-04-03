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
6. **For async `useEffect` components (data fetching, no timers): NEVER use `act()`.** Use `render()` + `await waitFor()` exclusively — `act()` hangs on CI runners.
7. **Every async `useEffect` or `useCallback` that calls `setState` must have a cancel/mounted guard** to prevent updates after unmount (`mountedRef.current` or `cancelled` flag).

### Async useEffect Components (NO timers) — `waitFor` only, NEVER `act()`

Components that fetch data in `useEffect` (via async callbacks or IIFE) with intermediate
`setState` calls cause `act()` to hang on slow Ubuntu CI runners. React 19's `act()` detects
the intermediate re-render as "pending work" and re-enters its flush loop, which never converges.

**Symptoms:** All tests in the file pass locally on Windows but hang indefinitely on GitHub CI.

**Component-level fix — cancel guard to prevent setState after unmount:**

For `useCallback` + `useEffect` (shared fetch function called from multiple effects):
```typescript
const mountedRef = useRef(true);
useEffect(() => { return () => { mountedRef.current = false; }; }, []);

const fetchData = useCallback(async () => {
  const result = await fetchSomething(supabase, id);
  if (mountedRef.current) setData(result.data); // guard every setState
}, [id]);
```

For inline async IIFE in `useEffect`:
```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    const result = await fetchSomething(supabase, id);
    if (!cancelled) setData(result.data);
  })();
  return () => { cancelled = true; };
}, [id]);
```

**Test-level fix — `render()` + `waitFor()`, zero `act()` calls:**
```typescript
const screen = render(<Component />);
await waitFor(() => {
  expect(screen.getByText('Expected content')).toBeTruthy();
});
// For interactions:
fireEvent.press(screen.getByText('Submit'));
await waitFor(() => { expect(mockFn).toHaveBeenCalled(); });
```

**Additional test-file requirements:**
- Add a local `jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }))` in every
  marketplace test file (global mock alone is insufficient for CI).
- Use `children?: React.ReactNode` (not `children: unknown`) in SafeAreaView mocks.
- All mock variables must be used in assertions — unused mock casts trigger TS6133. If testing
  Alert-based actions (deactivate, delete), invoke the confirm callback from `Alert.alert` spy
  and assert the API mock was called.

**Screens already fixed with this pattern:**
ListingDetailScreen, CreateListingScreen, MarketplaceCategoryScreen, MarketplaceHomeScreen,
MyListingsScreen.

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
