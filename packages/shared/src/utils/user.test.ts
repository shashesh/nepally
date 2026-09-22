import { describe, expect, it } from 'vitest';
import {
  formatPublicName,
  getAboutYouFormValues,
  getAvatarToneIndex,
  getFirstName,
  getInitials,
  getTrustLabel,
} from './user';
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

describe('getFirstName', () => {
  it('returns the first word of a multi-word name', () => {
    expect(getFirstName('Bikal Shrestha')).toBe('Bikal');
  });

  it('returns the whole name when only one word is given', () => {
    expect(getFirstName('Ramesh')).toBe('Ramesh');
  });

  it('returns empty string for a blank name', () => {
    expect(getFirstName('')).toBe('');
    expect(getFirstName('   ')).toBe('');
  });

  it('handles extra whitespace gracefully', () => {
    expect(getFirstName('  Hari  Prasad  ')).toBe('Hari');
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

describe('getInitials', () => {
  it('uses first and last initials for multi-word names', () => {
    expect(getInitials('Ram Bahadur Thapa')).toBe('RT');
  });

  it('uses the first two letters of a single word', () => {
    expect(getInitials('bishal')).toBe('BI');
  });

  it('collapses extra whitespace', () => {
    expect(getInitials('  Sita   Gurung ')).toBe('SG');
  });

  it('returns ? for an empty name', () => {
    expect(getInitials('   ')).toBe('?');
  });

  it('handles a first character outside the BMP without splitting the surrogate pair', () => {
    expect(getInitials('😀 Sita')).toBe('😀S');
  });

  it('handles a single astral-plane word by code point, not UTF-16 code unit', () => {
    expect(getInitials('😀😃')).toBe('😀😃');
  });
});

describe('getAvatarToneIndex', () => {
  it('is stable for the same name', () => {
    expect(getAvatarToneIndex('Alice', 8)).toBe(getAvatarToneIndex('Alice', 8));
  });

  it('stays within range', () => {
    for (const name of ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', '']) {
      const index = getAvatarToneIndex(name, 8);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(8);
    }
  });

  it('spreads different names across tones', () => {
    const tones = new Set(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'].map((name) => getAvatarToneIndex(name, 8)));
    expect(tones.size).toBeGreaterThan(1);
  });
});

describe('getAboutYouFormValues', () => {
  it('keeps a known district', () => {
    expect(getAboutYouFormValues({ hometown_district: 'Kathmandu', college: null, years_in_us: null, languages: [] }))
      .toMatchObject({ hometown_district: 'Kathmandu' });
  });

  it('drops an unknown district to null', () => {
    expect(
      getAboutYouFormValues({ hometown_district: 'Nawalparasi', college: null, years_in_us: null, languages: [] })
    ).toMatchObject({ hometown_district: null });
  });

  it('treats a missing district the same as null', () => {
    expect(getAboutYouFormValues({ hometown_district: undefined, college: null, years_in_us: null, languages: [] }))
      .toMatchObject({ hometown_district: null });
  });

  it('drops unknown languages and keeps known ones in their stored order', () => {
    expect(
      getAboutYouFormValues({
        hometown_district: null,
        college: null,
        years_in_us: null,
        languages: ['sherpa', 'nepali', 'english'],
      })
    ).toMatchObject({ languages: ['nepali', 'english'] });
  });

  it('treats a missing languages array as empty', () => {
    expect(getAboutYouFormValues({ hometown_district: null, college: null, years_in_us: null, languages: undefined }))
      .toMatchObject({ languages: [] });
  });

  it('passes college and years_in_us through unchanged', () => {
    expect(
      getAboutYouFormValues({
        hometown_district: null,
        college: 'Pulchowk Campus',
        years_in_us: 7,
        languages: [],
      })
    ).toMatchObject({ college: 'Pulchowk Campus', years_in_us: 7 });
  });

  it('maps missing college and years_in_us to null', () => {
    expect(
      getAboutYouFormValues({ hometown_district: null, college: undefined, years_in_us: undefined, languages: [] })
    ).toMatchObject({ college: null, years_in_us: null });
  });
});
