import { describe, expect, it } from 'vitest';
import {
  cleanZipCode,
  validateEmail,
  validateFullName,
  validatePassword,
} from './validators';

describe('validators utils', () => {
  it('validates email format', () => {
    expect(validateEmail('test@nusa.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
  });

  it('validates password strength and returns errors', () => {
    const valid = validatePassword('StrongPass1');
    expect(valid.isValid).toBe(true);
    expect(valid.errors).toHaveLength(0);

    const invalid = validatePassword('weak');
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  it('validates full name rules', () => {
    expect(validateFullName('Nusa User')).toBe(true);
    expect(validateFullName('A')).toBe(false);
    expect(validateFullName('User123')).toBe(false);
  });

  it('cleans zip code input to 5 digits', () => {
    expect(cleanZipCode('75a-00123')).toBe('75001');
    expect(cleanZipCode('123')).toBe('123');
  });

});
