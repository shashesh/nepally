/**
 * App-wide constants shared across mobile and web
 */

export const APP_CONFIG = {
  name: 'NUSA',
  version: '1.0.0',
  minPasswordLength: 8,
  zipCodeLength: 5,
} as const;

/**
 * Post expiry days by category
 * (Also available in POST_CATEGORIES config but convenient as a flat lookup)
 */
export const POST_EXPIRY_DAYS = {
  housing: 30,
  jobs: 30,
  emergency: 7,
  travel: 2,
} as const;
