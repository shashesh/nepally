/**
 * General validation utility functions
 * Pure functions, no platform dependencies
 */

/**
 * Validate email address format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength.
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number.
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Clean and format ZIP code input (digits only, max 5)
 */
export function cleanZipCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, 5);
}