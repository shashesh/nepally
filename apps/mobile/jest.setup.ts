// ---------------------------------------------------------------------------
// RNTL v13 + React 19 compat: the default async afterEach cleanup can hang
// because React 19's act() awaits scheduler work that never settles.
// Disable RNTL's auto-cleanup and perform synchronous cleanup instead.
// ---------------------------------------------------------------------------
process.env.RNTL_SKIP_AUTO_CLEANUP = 'true';
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(async () => {
  // Lazy-require so the module loads after the test environment is ready.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cleanup } = require('@testing-library/react-native/pure');
  // Sync cleanup: renderer.unmount() executes immediately, but the act() scope
  // from unmountAsync() is still pending.
  cleanup();
  // Yield one event-loop turn so the pending act() scope can close (after
  // unmount there is no remaining React work, so it resolves instantly).
  // Without this, the next test's act()/waitFor() would overlap with the stale
  // scope — which React 19 blocks, causing hangs on slower CI runners.
  await new Promise((resolve) => setTimeout(resolve, 0));
  jest.clearAllTimers();
});

// Expo icons load fonts asynchronously, which can trigger act warnings and slow CI tests.
jest.mock('@expo/vector-icons', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  const MockIcon = ({ name }: { name?: string }) => {
    return React.createElement(Text, null, name ?? 'icon');
  };

  return {
    Ionicons: MockIcon,
    MaterialIcons: MockIcon,
    MaterialCommunityIcons: MockIcon,
    FontAwesome: MockIcon,
    Feather: MockIcon,
    Entypo: MockIcon,
    AntDesign: MockIcon,
  };
});

beforeEach(() => {
  // Ensure one suite cannot leak fake timers into the next suite.
  jest.useRealTimers();
});
