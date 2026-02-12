/**
 * Validation utility functions
 */

/**
 * Validate ZIP code (5 digits)
 */
export function validateZipCode(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (10 digits, US format)
 */
export function validatePhone(phone: string): boolean {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
}

/**
 * Format phone number for display (xxx) xxx-xxxx
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10) return phone;

  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}

/**
 * Validate password strength
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number
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

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate full name (at least 2 characters, letters and spaces only)
 */
export function validateFullName(name: string): boolean {
  return name.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(name);
}

/**
 * Clean and format ZIP code input
 */
export function cleanZipCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, 5);
}

/**
 * Clean phone number input (remove all non-digits)
 */
export function cleanPhone(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10);
}
