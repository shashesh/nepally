import { describe, expect, it } from 'vitest';
import { applyEventResponseChange, isEventPast } from './events';

const NOW = new Date(2026, 2, 5, 12, 0);
const at = (hour: number, day = 5) => new Date(2026, 2, day, hour, 0).toISOString();

describe('isEventPast', () => {
  it('is past once the end has gone by', () => {
    expect(isEventPast({ start_date: at(8), end_date: at(10) }, NOW)).toBe(true);
  });

  it('is not past while the event is still running', () => {
    expect(isEventPast({ start_date: at(10), end_date: at(14) }, NOW)).toBe(false);
  });

  it('uses the start when there is no end', () => {
    expect(isEventPast({ start_date: at(10) }, NOW)).toBe(true);
    expect(isEventPast({ start_date: at(14) }, NOW)).toBe(false);
  });

  it('treats a null end as no end', () => {
    expect(isEventPast({ start_date: at(10), end_date: null }, NOW)).toBe(true);
  });

  it('is not past when the end is exactly now', () => {
    expect(isEventPast({ start_date: at(10), end_date: NOW.toISOString() }, NOW)).toBe(false);
  });
});

describe('applyEventResponseChange', () => {
  const event = { id: 'e1', title: 'Dashain', rsvp_count: 5, interested_count: 3 };

  it('adds one going for null → going', () => {
    expect(applyEventResponseChange(event, null, 'going')).toMatchObject({
      rsvp_count: 6,
      interested_count: 3,
    });
  });

  it('moves one count across for going → interested', () => {
    expect(applyEventResponseChange(event, 'going', 'interested')).toMatchObject({
      rsvp_count: 4,
      interested_count: 4,
    });
  });

  it('takes one interested for interested → null', () => {
    expect(applyEventResponseChange(event, 'interested', null)).toMatchObject({
      rsvp_count: 5,
      interested_count: 2,
    });
  });

  it('never goes below zero', () => {
    const empty = { ...event, rsvp_count: 0, interested_count: 0 };
    expect(applyEventResponseChange(empty, 'going', null)).toMatchObject({ rsvp_count: 0 });
    expect(applyEventResponseChange(empty, 'interested', null)).toMatchObject({
      interested_count: 0,
    });
  });

  it('is undone by the same call with the two swapped', () => {
    const forward = applyEventResponseChange(event, 'interested', 'going');
    expect(applyEventResponseChange(forward, 'going', 'interested')).toEqual(event);
  });

  it('returns a new object that keeps the other fields', () => {
    const result = applyEventResponseChange(event, null, 'going');
    expect(result).not.toBe(event);
    expect(result.id).toBe('e1');
    expect(result.title).toBe('Dashain');
    expect(event.rsvp_count).toBe(5);
  });
});
