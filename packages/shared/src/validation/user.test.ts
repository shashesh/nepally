import { describe, it, expect } from 'vitest';
import {
  bioSchema,
  bioUpdateSchema,
  BIO_MAX_LENGTH,
  fullNameSchema,
  FULL_NAME_MAX_LENGTH,
  hometownDistrictSchema,
  collegeSchema,
  yearsInUsSchema,
  languagesSchema,
  extendedProfileUpdateSchema,
  normalizeFullName,
} from './user';

describe('normalizeFullName', () => {
  it('trims, strips control and bidi characters, and collapses whitespace as the schema does', () => {
    const input = '  Sita\u0000\u202E\t  Gurung\u200B  ';

    expect(normalizeFullName(input)).toBe('Sita Gurung');
    expect(fullNameSchema.parse(input)).toBe(normalizeFullName(input));
  });

  it('keeps ZWJ and ZWNJ, which Devanagari conjuncts and emoji sequences need', () => {
    const input = 'क\u094D\u200Dष 👩\u200D💻';

    expect(normalizeFullName(input)).toBe(input);
  });

  it('applies no length limit or minimum of its own', () => {
    expect(normalizeFullName('A')).toBe('A');
    expect(normalizeFullName('a'.repeat(FULL_NAME_MAX_LENGTH + 5))).toHaveLength(FULL_NAME_MAX_LENGTH + 5);
  });
});

describe('fullNameSchema', () => {
  it('trims surrounding whitespace', () => {
    expect(fullNameSchema.parse('  Sita Gurung  ')).toBe('Sita Gurung');
  });

  it('rejects a single-character name', () => {
    expect(() => fullNameSchema.parse('A')).toThrow('Name must be at least 2 characters');
  });

  it('accepts a two-character name', () => {
    expect(fullNameSchema.parse('Jo')).toBe('Jo');
  });

  it('accepts Devanagari characters', () => {
    const input = 'सीता गुरुङ';
    expect(fullNameSchema.parse(input)).toBe(input);
  });

  it("accepts apostrophes and hyphens (O'Brien-Rai)", () => {
    expect(fullNameSchema.parse("O'Brien-Rai")).toBe("O'Brien-Rai");
  });

  it(`rejects strings longer than ${FULL_NAME_MAX_LENGTH} characters`, () => {
    const input = 'a'.repeat(FULL_NAME_MAX_LENGTH + 1);
    expect(() => fullNameSchema.parse(input)).toThrow(
      `Name must be at most ${FULL_NAME_MAX_LENGTH} characters`
    );
  });

  it(`accepts exactly ${FULL_NAME_MAX_LENGTH} characters`, () => {
    const input = 'a'.repeat(FULL_NAME_MAX_LENGTH);
    expect(fullNameSchema.parse(input)).toBe(input);
  });

  it('strips control characters', () => {
    const input = 'Sita\u0000\u0007Gurung';
    expect(fullNameSchema.parse(input)).toBe('SitaGurung');
  });

  it('removes a bidi override character (U+202E)', () => {
    const input = 'Sita‮Gurung';
    expect(fullNameSchema.parse(input)).toBe('SitaGurung');
  });

  it('collapses a run of tabs and spaces to a single space', () => {
    expect(fullNameSchema.parse('Sita\t  Gurung')).toBe('Sita Gurung');
  });

  it('keeps a zero-width joiner (U+200D)', () => {
    const input = 'Sita‍Gurung';
    expect(fullNameSchema.parse(input)).toBe(input);
  });
});

describe('bioSchema', () => {
  it('accepts a normal bio string', () => {
    const input = 'Software engineer, happy to help new arrivals in Austin.';
    expect(bioSchema.parse(input)).toBe(input);
  });

  it('trims surrounding whitespace', () => {
    expect(bioSchema.parse('  hello world  ')).toBe('hello world');
  });

  it('normalizes an empty string to null', () => {
    expect(bioSchema.parse('')).toBeNull();
  });

  it('normalizes whitespace-only input to null', () => {
    expect(bioSchema.parse('   \t  ')).toBeNull();
  });

  it('strips control characters', () => {
    const input = 'hello\u0000\u0007world';
    expect(bioSchema.parse(input)).toBe('helloworld');
  });

  it('preserves newlines and tabs', () => {
    const input = 'line one\nline two\tindented';
    expect(bioSchema.parse(input)).toBe('line one\nline two\tindented');
  });

  it('keeps line breaks but removes a bidi override character (U+202E)', () => {
    const input = 'line one‮\nline two';
    expect(bioSchema.parse(input)).toBe('line one\nline two');
  });

  it('accepts emoji', () => {
    const input = 'Momo evangelist 🥟 in NYC';
    expect(bioSchema.parse(input)).toBe(input);
  });

  it('accepts Devanagari characters', () => {
    const input = 'नमस्ते, I live in Queens.';
    expect(bioSchema.parse(input)).toBe(input);
  });

  it(`accepts exactly ${BIO_MAX_LENGTH} characters`, () => {
    const input = 'a'.repeat(BIO_MAX_LENGTH);
    expect(bioSchema.parse(input)).toBe(input);
  });

  it(`rejects strings longer than ${BIO_MAX_LENGTH} characters`, () => {
    const input = 'a'.repeat(BIO_MAX_LENGTH + 1);
    expect(() => bioSchema.parse(input)).toThrow();
  });

  it(`accepts ${BIO_MAX_LENGTH} chars of content surrounded by whitespace`, () => {
    const input = `  ${'a'.repeat(BIO_MAX_LENGTH)}  `;
    expect(bioSchema.parse(input)).toBe('a'.repeat(BIO_MAX_LENGTH));
  });

  it(`accepts ${BIO_MAX_LENGTH} chars of content mixed with control characters`, () => {
    const input = `${'a'.repeat(BIO_MAX_LENGTH)}\u0000\u0007`;
    expect(bioSchema.parse(input)).toBe('a'.repeat(BIO_MAX_LENGTH));
  });
});

describe('bioUpdateSchema', () => {
  it('accepts undefined (field not included in update)', () => {
    expect(bioUpdateSchema.parse(undefined)).toBeUndefined();
  });

  it('accepts null (explicit clear)', () => {
    expect(bioUpdateSchema.parse(null)).toBeNull();
  });

  it('accepts a valid bio', () => {
    expect(bioUpdateSchema.parse('hello')).toBe('hello');
  });

  it('normalizes empty string to null', () => {
    expect(bioUpdateSchema.parse('')).toBeNull();
  });
});

describe('extended profile validation', () => {
  it('accepts a valid Nepal district', () => {
    expect(hometownDistrictSchema.parse('Kathmandu')).toBe('Kathmandu');
  });

  it('rejects unknown districts', () => {
    expect(() => hometownDistrictSchema.parse('Narnia')).toThrow();
  });

  it('trims college whitespace and normalizes empty to null', () => {
    expect(collegeSchema.parse('  Pulchowk  ')).toBe('Pulchowk');
    expect(collegeSchema.parse('   ')).toBeNull();
  });

  it('rejects college longer than 100 chars', () => {
    expect(() => collegeSchema.parse('x'.repeat(101))).toThrow();
  });

  it('accepts years_in_us in range', () => {
    expect(yearsInUsSchema.parse(5)).toBe(5);
  });

  it('rejects out-of-range years_in_us', () => {
    expect(() => yearsInUsSchema.parse(-1)).toThrow();
    expect(() => yearsInUsSchema.parse(100)).toThrow();
  });

  it('accepts a list of supported language codes', () => {
    expect(languagesSchema.parse(['nepali', 'english'])).toEqual(['nepali', 'english']);
  });

  it('rejects unsupported language codes', () => {
    expect(() => languagesSchema.parse(['klingon'])).toThrow();
  });

  it('rejects duplicate language codes', () => {
    expect(() => languagesSchema.parse(['nepali', 'nepali'])).toThrow(/unique/i);
  });

  it('extendedProfileUpdateSchema accepts a fully partial payload', () => {
    const parsed = extendedProfileUpdateSchema.parse({
      hometown_district: 'Kathmandu',
    });
    expect(parsed.hometown_district).toBe('Kathmandu');
    expect(parsed.college).toBeUndefined();
  });
});
