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

  it('never splits an emoji at the length limit', () => {
    expect(normalizeSearchInput(`${'x'.repeat(99)}😀tail`)).toBe(`${'x'.repeat(99)}😀`);
  });

  it('counts the limits in code points, not UTF-16 units', () => {
    expect(Array.from(normalizeSearchInput('😀'.repeat(150)) ?? '')).toHaveLength(100);
    expect(normalizeSearchInput('😀')).toBeNull();
  });

  it('counts a Devanagari vowel sign as its own character', () => {
    expect(normalizeSearchInput('रा')).toBe('रा');
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

describe('highlightSegments with English word endings', () => {
  // Each pair shares one Postgres `english` stem, read with
  // ts_lexize('english_stem', …) on nusa-staging (2026-09-19), so the database
  // already matches these to each other.
  const SAME_STEM: Array<[query: string, word: string]> = [
    ['rooms', 'Room'],
    ['jobs', 'Job'],
    ['houses', 'Housing'],
    ['housing', 'house'],
    ['renting', 'rented'],
    ['cities', 'City'],
    ['sharing', 'shared'],
    ['nurses', 'Nursing'],
    ['studies', 'studying'],
    ['classes', 'class'],
    ['riding', 'rides'],
    ['hiring', 'Hired'],
    ['moving', 'move'],
    ['parking', 'Park'],
    ['cleaning', 'clean'],
    ['running', 'run'],
    ['speeds', 'speed'],
  ];

  it.each(SAME_STEM)('"%s" highlights "%s"', (query, word) => {
    expect(highlightSegments(word, query)).toEqual([{ text: word, match: true }]);
  });

  // The database keeps these apart: irregular forms, a different suffix, and a
  // word that would only match if a stem were allowed to shrink below 3 letters.
  const DIFFERENT_STEM: Array<[query: string, word: string]> = [
    ['sold', 'sell'],
    ['cleaner', 'cleaning'],
    ['ride', 'ridge'],
    ['bed', 'be'],
  ];

  it.each(DIFFERENT_STEM)('"%s" does not highlight "%s"', (query, word) => {
    expect(highlightSegments(word, query)).toEqual([{ text: word, match: false }]);
  });

  // Postgres stems both to "manag", so the post is found. These rules do not
  // strip -ment, so the word is not marked. Documented in search.md.
  it('finds but does not mark longer derivations', () => {
    expect(highlightSegments('Property manage services', 'management')).toEqual([
      { text: 'Property manage services', match: false },
    ]);
  });

  it('marks inflected words inside a sentence', () => {
    expect(highlightSegments('Room for rent in Queens', 'rooms renting')).toEqual([
      { text: 'Room', match: true },
      { text: ' for ', match: false },
      { text: 'rent', match: true },
      { text: ' in Queens', match: false },
    ]);
  });
});
