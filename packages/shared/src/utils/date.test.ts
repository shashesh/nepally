import { describe, expect, it } from 'vitest';
import { formatCount, formatCurrency, addDays, formatDayLabel, formatRelativeTime } from './date';

describe('formatCount', () => {
  it('returns the number as-is below 1000', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1)).toBe('1');
    expect(formatCount(999)).toBe('999');
  });

  it('formats 1000 as "1K" (no trailing .0)', () => {
    expect(formatCount(1000)).toBe('1K');
  });

  it('shows one decimal between 1000-9999 when not .0', () => {
    expect(formatCount(1500)).toBe('1.5K');
    expect(formatCount(1234)).toBe('1.2K');
    expect(formatCount(9999)).toBe('9K');
  });

  it('drops trailing .0 for exact thousands under 10000', () => {
    expect(formatCount(2000)).toBe('2K');
    expect(formatCount(5000)).toBe('5K');
  });

  it('floors to whole K for 10000 and above', () => {
    expect(formatCount(10000)).toBe('10K');
    expect(formatCount(10500)).toBe('10K');
    expect(formatCount(99999)).toBe('99K');
    expect(formatCount(100000)).toBe('100K');
  });
});

describe('formatCurrency', () => {
  it('formats cents as USD string', () => {
    expect(formatCurrency(199)).toBe('$1.99');
    expect(formatCurrency(299)).toBe('$2.99');
    expect(formatCurrency(499)).toBe('$4.99');
  });

  it('formats zero cents', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats large values', () => {
    expect(formatCurrency(10000)).toBe('$100.00');
    expect(formatCurrency(99999)).toBe('$999.99');
  });

  it('formats single-digit cents', () => {
    expect(formatCurrency(1)).toBe('$0.01');
    expect(formatCurrency(9)).toBe('$0.09');
  });
});

describe('addDays', () => {
  it('adds days to a date', () => {
    const base = new Date('2026-04-01T00:00:00Z');
    const result = addDays(base, 7);
    expect(result.toISOString()).toBe('2026-04-08T00:00:00.000Z');
  });

  it('does not mutate the input date', () => {
    const base = new Date('2026-04-01T00:00:00Z');
    const originalTime = base.getTime();
    addDays(base, 7);
    expect(base.getTime()).toBe(originalTime);
  });

  it('handles adding 0 days', () => {
    const base = new Date('2026-04-01T12:00:00Z');
    const result = addDays(base, 0);
    expect(result.getTime()).toBe(base.getTime());
  });

  it('handles month boundary crossing', () => {
    const base = new Date('2026-04-28T00:00:00Z');
    const result = addDays(base, 5);
    expect(result.getUTCMonth()).toBe(4); // May (0-indexed)
    expect(result.getUTCDate()).toBe(3);
  });
});

describe('formatDayLabel', () => {
  const now = new Date(2026, 8, 23, 15, 30);

  it('says Today for any time on the same calendar day', () => {
    expect(formatDayLabel(new Date(2026, 8, 23, 0, 5), now)).toBe('Today');
    expect(formatDayLabel(new Date(2026, 8, 23, 23, 55), now)).toBe('Today');
  });

  it('says Yesterday for the previous calendar day', () => {
    expect(formatDayLabel(new Date(2026, 8, 22, 23, 59), now)).toBe('Yesterday');
  });

  it('says Yesterday across a month boundary', () => {
    expect(formatDayLabel(new Date(2026, 1, 28, 12), new Date(2026, 2, 1, 9))).toBe('Yesterday');
  });

  it('gives month and day for earlier dates this year', () => {
    expect(formatDayLabel(new Date(2026, 2, 5, 12), now)).toBe('Mar 5');
  });

  it('adds the year for dates in another year', () => {
    expect(formatDayLabel(new Date(2025, 2, 5, 12), now)).toBe('Mar 5, 2025');
  });
});

describe('formatRelativeTime', () => {
  it('measures from the now it is given, so a caller on a ticking clock stays current', () => {
    const sent = new Date(2026, 8, 23, 12, 0);

    expect(formatRelativeTime(sent, new Date(2026, 8, 23, 12, 0, 30))).toBe('just now');
    expect(formatRelativeTime(sent, new Date(2026, 8, 23, 12, 5))).toBe('5m ago');
    expect(formatRelativeTime(sent, new Date(2026, 8, 23, 15, 0))).toBe('3h ago');
  });
});
