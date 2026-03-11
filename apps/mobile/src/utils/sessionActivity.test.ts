import { shouldRecordSessionActivity } from './sessionActivity';

describe('sessionActivity', () => {
  it('returns false when user is not authenticated', () => {
    expect(
      shouldRecordSessionActivity({
        isAuthenticated: false,
        lastRecordedAt: 0,
        now: 1000,
        minIntervalMs: 15_000,
      })
    ).toBe(false);
  });

  it('returns true when forced for authenticated users', () => {
    expect(
      shouldRecordSessionActivity({
        isAuthenticated: true,
        lastRecordedAt: 10_000,
        now: 11_000,
        minIntervalMs: 15_000,
        force: true,
      })
    ).toBe(true);
  });

  it('returns false when interval threshold has not elapsed', () => {
    expect(
      shouldRecordSessionActivity({
        isAuthenticated: true,
        lastRecordedAt: 10_000,
        now: 20_000,
        minIntervalMs: 15_000,
      })
    ).toBe(false);
  });

  it('returns true when interval threshold has elapsed', () => {
    expect(
      shouldRecordSessionActivity({
        isAuthenticated: true,
        lastRecordedAt: 10_000,
        now: 25_000,
        minIntervalMs: 15_000,
      })
    ).toBe(true);
  });
});
