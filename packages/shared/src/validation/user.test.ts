import { describe, it, expect } from 'vitest';
import { bioSchema, bioUpdateSchema, BIO_MAX_LENGTH } from './user';
import {
  hometownDistrictSchema,
  collegeSchema,
  yearsInUsSchema,
  languagesSchema,
  extendedProfileUpdateSchema,
} from './user';

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
    expect(languagesSchema.parse(['nepali', 'english'])).toEqual([
      'nepali',
      'english',
    ]);
  });

  it('rejects unsupported language codes', () => {
    expect(() => languagesSchema.parse(['klingon'])).toThrow();
  });

  it('rejects duplicate language codes', () => {
    expect(() => languagesSchema.parse(['nepali', 'nepali'])).toThrow(
      /unique/i
    );
  });

  it('extendedProfileUpdateSchema accepts a fully partial payload', () => {
    const parsed = extendedProfileUpdateSchema.parse({
      hometown_district: 'Kathmandu',
    });
    expect(parsed.hometown_district).toBe('Kathmandu');
    expect(parsed.college).toBeUndefined();
  });
});
