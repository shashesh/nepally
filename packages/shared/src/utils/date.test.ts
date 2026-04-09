import { describe, expect, it } from 'vitest';
import { formatCount } from './date';

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
