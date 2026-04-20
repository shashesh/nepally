/**
 * Supported spoken/written languages surfaced on the public profile.
 * Codes are lowercase English identifiers; labels are user-facing display strings.
 */

export const SUPPORTED_LANGUAGES = [
  'nepali',
  'english',
  'newari',
  'maithili',
  'bhojpuri',
  'tharu',
  'tamang',
  'other',
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  nepali: 'Nepali',
  english: 'English',
  newari: 'Newari',
  maithili: 'Maithili',
  bhojpuri: 'Bhojpuri',
  tharu: 'Tharu',
  tamang: 'Tamang',
  other: 'Other',
};

export function isLanguageCode(value: string): value is LanguageCode {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
