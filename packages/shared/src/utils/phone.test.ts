import { describe, expect, it } from 'vitest';
import { formatPhoneNumber, isValidPhoneNumber } from './phone';

describe('phone utils', () => {
  it('formats 10-digit phone numbers', () => {
    expect(formatPhoneNumber('4695551212')).toBe('(469) 555-1212');
  });

  it('formats 11-digit phone numbers with country code', () => {
    expect(formatPhoneNumber('14695551212')).toBe('+1 (469) 555-1212');
  });

  it('returns original value for unexpected formats', () => {
    expect(formatPhoneNumber('12345')).toBe('12345');
  });

  it('validates supported phone number lengths', () => {
    expect(isValidPhoneNumber('4695551212')).toBe(true);
    expect(isValidPhoneNumber('+1 (469) 555-1212')).toBe(true);
    expect(isValidPhoneNumber('555')).toBe(false);
  });
});
