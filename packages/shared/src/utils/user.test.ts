import { describe, expect, it } from 'vitest';
import { formatPublicName } from './user';

describe('formatPublicName', () => {
  it('returns "Firstname L." for a two-part name', () => {
    expect(formatPublicName('Shashank Kumar')).toBe('Shashank K.');
  });

  it('returns "Firstname L." for a three-part name (uses last word as surname)', () => {
    expect(formatPublicName('Ram Bahadur Thapa')).toBe('Ram T.');
  });

  it('returns first name only when only one word is given', () => {
    expect(formatPublicName('Ramesh')).toBe('Ramesh');
  });

  it('returns empty string for empty input', () => {
    expect(formatPublicName('')).toBe('');
  });

  it('handles extra whitespace gracefully', () => {
    expect(formatPublicName('  Hari  Prasad  ')).toBe('Hari P.');
  });

  it('uppercases the last initial', () => {
    expect(formatPublicName('anjali sharma')).toBe('anjali S.');
  });
});
