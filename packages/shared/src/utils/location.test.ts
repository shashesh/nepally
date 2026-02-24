import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCATION_SNOOZE_HOURS } from '../constants/location';
import {
  createSnoozeEntry,
  getShortMetroName,
  hasMetroChanged,
  isMetroSnoozed,
  shouldShowPermissionBanner,
} from './location';

describe('location utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-24T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates snooze entries using configured snooze window', () => {
    const snooze = createSnoozeEntry('19100');

    expect(snooze.metro_area_id).toBe('19100');
    const diffHours =
      (new Date(snooze.snoozed_until).getTime() - Date.now()) / (1000 * 60 * 60);

    expect(Math.round(diffHours)).toBe(LOCATION_SNOOZE_HOURS);
  });

  it('detects if metro is snoozed', () => {
    const activeSnoozes = [
      { metro_area_id: '19100', snoozed_until: '2026-02-25T12:00:00.000Z' },
    ];

    expect(isMetroSnoozed('19100', activeSnoozes)).toBe(true);
    expect(isMetroSnoozed('35620', activeSnoozes)).toBe(false);
  });

  it('evaluates metro changes correctly', () => {
    expect(hasMetroChanged('19100', '19100')).toBe(false);
    expect(hasMetroChanged('19100', '35620')).toBe(true);
    expect(hasMetroChanged(null, '35620')).toBe(true);
  });

  it('applies permission banner cooldown and max rules', () => {
    expect(shouldShowPermissionBanner(0, null, 3, 7)).toBe(true);
    expect(shouldShowPermissionBanner(3, null, 3, 7)).toBe(false);
    expect(shouldShowPermissionBanner(1, '2026-02-20T12:00:00.000Z', 3, 7)).toBe(false);
    expect(shouldShowPermissionBanner(1, '2026-02-10T12:00:00.000Z', 3, 7)).toBe(true);
  });

  it('shortens long metro names for display', () => {
    expect(getShortMetroName('Dallas-Fort Worth-Arlington, TX')).toBe('Dallas-Fort Worth');
    expect(getShortMetroName('New York-Newark-Jersey City, NY-NJ')).toBe('New York-Newark');
    expect(getShortMetroName('Seattle, WA')).toBe('Seattle');
  });
});
