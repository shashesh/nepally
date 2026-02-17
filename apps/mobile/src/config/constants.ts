/**
 * Platform-specific constants (AsyncStorage keys)
 *
 * App-wide constants like APP_CONFIG, POST_CATEGORIES, TRUST_LEVELS, POST_EXPIRY_DAYS
 * are now in @nusa/shared — import from there.
 */

export const STORAGE_KEYS = {
  USER_TOKEN: '@nusa:user_token',
  USER_DATA: '@nusa:user_data',
  ONBOARDING_COMPLETE: '@nusa:onboarding_complete',
  ONBOARDING_STEP: '@nusa:onboarding_step',
  BANNER_DISMISSED: '@nusa:banner_dismissed',
  METRO_AREA: '@nusa:metro_area',
} as const;
