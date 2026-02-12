/**
 * App-wide constants
 */

export const APP_CONFIG = {
  name: 'NUSA',
  version: '1.0.0',
  minPasswordLength: 8,
  zipCodeLength: 5,
} as const;

export const STORAGE_KEYS = {
  USER_TOKEN: '@nusa:user_token',
  USER_DATA: '@nusa:user_data',
  ONBOARDING_COMPLETE: '@nusa:onboarding_complete',
  ONBOARDING_STEP: '@nusa:onboarding_step',
  BANNER_DISMISSED: '@nusa:banner_dismissed',
  METRO_AREA: '@nusa:metro_area',
} as const;

export const POST_CATEGORIES = {
  HOUSING: 'housing',
  JOBS: 'jobs',
  EMERGENCY: 'emergency',
  TRAVEL: 'travel',
} as const;

export const TRUST_LEVELS = {
  NEW: 0,
  VERIFIED: 1,
  CONTRIBUTOR: 2,
} as const;

export const POST_EXPIRY_DAYS = {
  housing: 30,
  jobs: 30,
  emergency: 7,
  travel: 2,
} as const;
