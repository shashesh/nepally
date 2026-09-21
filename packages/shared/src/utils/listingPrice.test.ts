import { describe, expect, it } from 'vitest';
import { formatListingPrice } from './listingPrice';

describe('formatListingPrice', () => {
  it('formats a whole-number number as whole dollars', () => {
    expect(formatListingPrice(80)).toBe('$80');
  });

  it('formats a whole-number string as whole dollars', () => {
    expect(formatListingPrice('80')).toBe('$80');
  });

  it('formats a decimal string as dollars and cents', () => {
    expect(formatListingPrice('80.5')).toBe('$80.50');
  });

  it('keeps a formatted price with a dollar sign and thousands separator', () => {
    expect(formatListingPrice('$1,200')).toBe('$1,200');
  });

  it('shows free-text price as typed', () => {
    expect(formatListingPrice('Negotiable')).toBe('Negotiable');
  });

  it('returns null for a blank string', () => {
    expect(formatListingPrice('  ')).toBeNull();
  });

  it('returns null for null', () => {
    expect(formatListingPrice(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(formatListingPrice(undefined)).toBeNull();
  });

  it('shows a lone dollar sign as typed', () => {
    expect(formatListingPrice('$')).toBe('$');
  });

  it('shows a number with trailing free text as typed, not just the number', () => {
    expect(formatListingPrice('80 OBO')).toBe('80 OBO');
  });

  it('formats zero as a whole dollar amount', () => {
    expect(formatListingPrice('0')).toBe('$0');
  });

  it('shows a malformed thousands separator as typed, not silently reparsed', () => {
    expect(formatListingPrice('80,50')).toBe('80,50');
  });

  it('shows a negative value as typed, not as negative currency', () => {
    expect(formatListingPrice('-5')).toBe('-5');
  });

  it('tolerates internal whitespace between the dollar sign and digits', () => {
    expect(formatListingPrice('$ 80')).toBe('$80');
  });

  it('rounds a near-whole decimal to whole dollars', () => {
    expect(formatListingPrice('1.999')).toBe('$2');
  });

  it('returns null for NaN', () => {
    expect(formatListingPrice(NaN)).toBeNull();
  });
});
