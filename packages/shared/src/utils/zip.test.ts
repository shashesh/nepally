import { describe, expect, it } from 'vitest';
import { isValidZipCode } from './zip';

describe('isValidZipCode', () => {
  it('returns true for valid 5-digit ZIPs', () => {
    expect(isValidZipCode('75001')).toBe(true);
    expect(isValidZipCode('10001')).toBe(true);
  });

  it('returns false for invalid ZIP formats', () => {
    expect(isValidZipCode('1234')).toBe(false);
    expect(isValidZipCode('123456')).toBe(false);
    expect(isValidZipCode('12a45')).toBe(false);
    expect(isValidZipCode('')).toBe(false);
  });
});
