import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'placeholder-anon-key';

// jsdom does not implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = function () {};

// jsdom does not implement ResizeObserver (required by Mantine's FloatingIndicator, used by Tabs)
window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom does not implement the object-URL store (required by ImageUploader,
// which mints a preview URL per picked file and revokes it again).
let objectUrlCounter = 0;
URL.createObjectURL = () => `blob:nepally/${(objectUrlCounter += 1)}`;
URL.revokeObjectURL = () => {};

// jsdom does not implement matchMedia (required by Mantine)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Vitest destroys the jsdom environment when a test file ends, but the timers
// scheduled inside it are ordinary Node timers that keep running. Mantine
// schedules several it never clears — the focus trap's restore, AppShell's
// resize flag, a Transition's duration — so a stray one fires after teardown,
// calls setState against a window that no longer exists, and fails the whole
// run with an unhandled "window is not defined" charged to whichever file
// happened to be running. Cancel whatever a test leaves behind. Ids of timers
// that already fired stay in the sets until the sweep, where clearing them is
// a no-op. Fake timers install over these wrappers and restore them on the way
// out, so `vi.useFakeTimers()` is unaffected.
const nativeSetTimeout = window.setTimeout.bind(window);
const nativeClearTimeout = window.clearTimeout.bind(window);
const nativeSetInterval = window.setInterval.bind(window);
const nativeClearInterval = window.clearInterval.bind(window);
const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
const nativeCancelAnimationFrame = window.cancelAnimationFrame.bind(window);

const pendingTimeouts = new Set<number>();
const pendingIntervals = new Set<number>();
const pendingFrames = new Set<number>();

window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
  const id = nativeSetTimeout(handler, timeout, ...args);
  pendingTimeouts.add(id);
  return id;
}) as typeof window.setTimeout;

window.clearTimeout = ((id?: number) => {
  if (id !== undefined) {
    pendingTimeouts.delete(id);
  }
  nativeClearTimeout(id);
}) as typeof window.clearTimeout;

window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
  const id = nativeSetInterval(handler, timeout, ...args);
  pendingIntervals.add(id);
  return id;
}) as typeof window.setInterval;

window.clearInterval = ((id?: number) => {
  if (id !== undefined) {
    pendingIntervals.delete(id);
  }
  nativeClearInterval(id);
}) as typeof window.clearInterval;

window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
  const id = nativeRequestAnimationFrame(callback);
  pendingFrames.add(id);
  return id;
}) as typeof window.requestAnimationFrame;

window.cancelAnimationFrame = ((id: number) => {
  pendingFrames.delete(id);
  nativeCancelAnimationFrame(id);
}) as typeof window.cancelAnimationFrame;

afterEach(() => {
  // Unmount first: a component's own cleanup cancels most of this, and some of
  // it only schedules work on the way out.
  cleanup();

  for (const id of pendingTimeouts) {
    nativeClearTimeout(id);
  }
  for (const id of pendingIntervals) {
    nativeClearInterval(id);
  }
  for (const id of pendingFrames) {
    nativeCancelAnimationFrame(id);
  }

  pendingTimeouts.clear();
  pendingIntervals.clear();
  pendingFrames.clear();
});
