import { describe, it, expect } from 'vitest';
import { isBusinessOpenNow } from './isBusinessOpenNow';
import type { BusinessHours } from '../../types/marketplace';

// Monday 2026-04-13 10:00 local
const MONDAY_10AM = new Date(2026, 3, 13, 10, 0, 0);
// Monday 2026-04-13 20:00 local
const MONDAY_8PM = new Date(2026, 3, 13, 20, 0, 0);
// Sunday 2026-04-12 14:00 local
const SUNDAY_2PM = new Date(2026, 3, 12, 14, 0, 0);

const HOURS: BusinessHours = {
  monday: { open: '09:00', close: '17:00' },
  tuesday: { open: '09:00', close: '17:00' },
};

describe('isBusinessOpenNow', () => {
  it('returns isOpen=true during hours', () => {
    expect(isBusinessOpenNow(HOURS, MONDAY_10AM)).toEqual({
      isOpen: true,
      nextChangeLabel: 'Closes 5p',
    });
  });

  it('returns isOpen=false after close', () => {
    expect(isBusinessOpenNow(HOURS, MONDAY_8PM)).toEqual({
      isOpen: false,
      nextChangeLabel: undefined,
    });
  });

  it('returns isOpen=false on day with no entry', () => {
    expect(isBusinessOpenNow(HOURS, SUNDAY_2PM)).toEqual({
      isOpen: false,
      nextChangeLabel: undefined,
    });
  });

  it('returns isOpen=false for null input', () => {
    expect(isBusinessOpenNow(null, MONDAY_10AM)).toEqual({
      isOpen: false,
      nextChangeLabel: undefined,
    });
  });

  it('returns isOpen=false for undefined input', () => {
    expect(isBusinessOpenNow(undefined, MONDAY_10AM)).toEqual({
      isOpen: false,
      nextChangeLabel: undefined,
    });
  });

  it('returns isOpen=false before open', () => {
    const MONDAY_8AM = new Date(2026, 3, 13, 8, 0, 0);
    expect(isBusinessOpenNow(HOURS, MONDAY_8AM)).toEqual({
      isOpen: false,
      nextChangeLabel: undefined,
    });
  });
});
