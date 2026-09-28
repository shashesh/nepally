import { describe, expect, it } from 'vitest';
import { formatClockTime, parseTimeToMinutes } from './clockTime';

describe('formatClockTime', () => {
  it('shows a morning time with AM', () => {
    expect(formatClockTime('9:00')).toBe('9:00 AM');
    expect(formatClockTime('09:30')).toBe('9:30 AM');
  });

  it('shows an afternoon time in 12-hour form with PM', () => {
    expect(formatClockTime('17:00')).toBe('5:00 PM');
    expect(formatClockTime('23:45')).toBe('11:45 PM');
  });

  it('shows noon and midnight as 12', () => {
    expect(formatClockTime('12:00')).toBe('12:00 PM');
    expect(formatClockTime('00:15')).toBe('12:15 AM');
  });

  it('leaves a value it cannot read as it is', () => {
    expect(formatClockTime('late')).toBe('late');
    expect(formatClockTime('25:00')).toBe('25:00');
  });
});

describe('parseTimeToMinutes', () => {
  it('reads hours and minutes as minutes since midnight', () => {
    expect(parseTimeToMinutes('9:05')).toBe(545);
  });

  it('returns null for anything else', () => {
    expect(parseTimeToMinutes('9')).toBeNull();
    expect(parseTimeToMinutes('12:60')).toBeNull();
  });
});
