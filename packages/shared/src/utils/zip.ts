/**
 * ZIP code validation utility.
 * Metro area lookups are handled by Supabase (edge function + DB query).
 */

export function isValidZipCode(zipCode: string): boolean {
  return /^\d{5}$/.test(zipCode);
}
