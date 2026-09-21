import { describe, expect, it } from 'vitest';

// Timers scheduled inside jsdom outlive the environment that owns them, so one
// left running at the end of a file fires against a torn-down window and takes
// the whole run down with it. vitest.setup.ts sweeps them; this guards that.
let timeoutFired = false;
let frameFired = false;
let intervalTicks = 0;

describe('test harness', () => {
  it('lets a test schedule work it never waits for', () => {
    window.setTimeout(() => {
      timeoutFired = true;
    }, 0);
    window.requestAnimationFrame(() => {
      frameFired = true;
    });
    window.setInterval(() => {
      intervalTicks += 1;
    }, 5);

    expect(timeoutFired).toBe(false);
  });

  it('cancels that work before the next test runs', async () => {
    // Long enough for a 0ms timer and a frame to have run. A machine too slow
    // to reach them in 50ms makes this pass for the wrong reason; it cannot
    // make it fail.
    await new Promise((resolve) => {
      window.setTimeout(resolve, 50);
    });

    expect(timeoutFired).toBe(false);
    expect(frameFired).toBe(false);
    expect(intervalTicks).toBe(0);
  });
});
