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
});
