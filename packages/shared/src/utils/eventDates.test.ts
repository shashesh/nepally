import { describe, expect, it } from 'vitest';
import { formatEventDateLong, formatEventDateShort } from './eventDates';

// Local-time constructor, so the tests pass in any time zone. ICU puts
// U+202F before "PM", so times are matched with \s.
const start = new Date(2026, 2, 5, 18, 0).toISOString(); // Thu, Mar 5, 6:00 PM
const sameDayEnd = new Date(2026, 2, 5, 21, 0).toISOString(); // 9:00 PM
const multiDayEnd = new Date(2026, 2, 7, 12, 0).toISOString(); // Sat, Mar 7

describe('formatEventDateShort', () => {
  it('shows the day and start time for a start alone', () => {
    expect(formatEventDateShort(start)).toMatch(/^Thu, Mar 5 · 6:00\sPM$/);
  });

  it('shows the day and start time for a same-day event', () => {
    expect(formatEventDateShort(start, sameDayEnd)).toMatch(/^Thu, Mar 5 · 6:00\sPM$/);
  });

  it('shows the date range for a multi-day event', () => {
    expect(formatEventDateShort(start, multiDayEnd)).toBe('Mar 5 – Mar 7');
  });

  it('treats a null end as no end', () => {
    expect(formatEventDateShort(start, null)).toBe(formatEventDateShort(start));
  });
});

describe('formatEventDateLong', () => {
  it('shows the full date and start time for a start alone', () => {
    const text = formatEventDateLong(start);
    expect(text).toMatch(/^Thursday, March 5/);
    expect(text).toMatch(/6:00\sPM$/);
  });

  it('shows the start and end times for a same-day event', () => {
    expect(formatEventDateLong(start, sameDayEnd)).toMatch(
      /^Thursday, March 5 · 6:00\sPM – 9:00\sPM$/
    );
  });

  it('shows the date range for a multi-day event', () => {
    expect(formatEventDateLong(start, multiDayEnd)).toBe('March 5 – March 7');
  });

  it('treats a null end as no end', () => {
    expect(formatEventDateLong(start, null)).toBe(formatEventDateLong(start));
  });
});
