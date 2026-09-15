import { describe, expect, it } from 'vitest';
import { highlightSegments, normalizeSearchInput } from './searchQuery';

describe('normalizeSearchInput', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeSearchInput('  room   in  queens ')).toBe('room in queens');
  });

  it('returns null below the minimum length', () => {
    expect(normalizeSearchInput('a')).toBeNull();
    expect(normalizeSearchInput('   ')).toBeNull();
    expect(normalizeSearchInput(undefined)).toBeNull();
  });

  it('truncates to 100 characters', () => {
    expect(normalizeSearchInput('x'.repeat(150))).toHaveLength(100);
  });

  it('keeps tsquery operator characters (the database sanitises them)', () => {
    expect(normalizeSearchInput("thapa's & (nclex)")).toBe("thapa's & (nclex)");
  });
});

describe('highlightSegments', () => {
  it('marks words that start with a query word, case-insensitively', () => {
    expect(highlightSegments('Thapa Catering: momo orders', 'tha')).toEqual([
      { text: 'Thapa', match: true },
      { text: ' Catering: momo orders', match: false },
    ]);
  });

  it('matches several query words', () => {
    expect(highlightSegments('Room near Jackson Heights', 'jackson room')).toEqual([
      { text: 'Room', match: true },
      { text: ' near ', match: false },
      { text: 'Jackson', match: true },
      { text: ' Heights', match: false },
    ]);
  });

  it('handles Devanagari names', () => {
    expect(highlightSegments('राम थापा', 'थापा')).toEqual([
      { text: 'राम ', match: false },
      { text: 'थापा', match: true },
    ]);
  });

  it('returns the whole text unmarked without a query', () => {
    expect(highlightSegments('Hello world', null)).toEqual([{ text: 'Hello world', match: false }]);
  });

  it('returns nothing for empty text', () => {
    expect(highlightSegments('', 'room')).toEqual([]);
  });
});
