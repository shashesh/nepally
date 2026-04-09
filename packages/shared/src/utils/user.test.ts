import { describe, expect, it } from 'vitest';
import { formatPublicName, getTrustLabel } from './user';
import { TrustLevel } from '../constants/trustLevels';

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

describe('getTrustLabel', () => {
  it('returns "New Member" for TrustLevel.NEW', () => {
    expect(getTrustLabel(TrustLevel.NEW)).toBe('New Member');
  });

  it('returns "Verified" for TrustLevel.VERIFIED', () => {
    expect(getTrustLabel(TrustLevel.VERIFIED)).toBe('Verified');
  });

  it('returns "Contributor" for TrustLevel.CONTRIBUTOR', () => {
    expect(getTrustLabel(TrustLevel.CONTRIBUTOR)).toBe('Contributor');
  });

  it('returns "Unknown" for an unrecognized level', () => {
    expect(getTrustLabel(99)).toBe('Unknown');
    expect(getTrustLabel(-1)).toBe('Unknown');
  });
});
