/**
 * App-wide constants shared across mobile and web
 */

export const APP_CONFIG = {
  name: 'Nepally',
  version: '1.0.0',
  minPasswordLength: 8,
  zipCodeLength: 5,
} as const;

/** Public web origin. Mobile deep-links legal pages here. */
export const WEB_BASE_URL = 'https://nepally.us';

/** Support / privacy contact shown on legal pages and in the Help Center. */
export const SUPPORT_EMAIL = 'support@nepally.us';

/** Canonical URLs for the policy and help pages (web routes + mobile links). */
export const LEGAL_URLS = {
  privacy: `${WEB_BASE_URL}/privacy`,
  terms: `${WEB_BASE_URL}/terms`,
  guidelines: `${WEB_BASE_URL}/guidelines`,
  help: `${WEB_BASE_URL}/help`,
} as const;

/** ISO date shown as "Last updated" on every legal page. Bump when policy text changes. */
export const LEGAL_LAST_UPDATED = '2026-09-04';
