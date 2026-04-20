import { describe, it, expect } from 'vitest';
import { bioSchema, bioUpdateSchema, BIO_MAX_LENGTH } from './user';

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
