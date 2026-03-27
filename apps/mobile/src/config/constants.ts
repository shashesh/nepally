/**
 * Platform-specific constants (AsyncStorage keys)
 *
 * App-wide constants like APP_CONFIG, POST_CATEGORIES, TRUST_LEVELS, POST_EXPIRY_DAYS
 * are now in @nepally/shared — import from there.
 */

export const STORAGE_KEYS = {
  USER_TOKEN: '@nusa:user_token',
  USER_DATA: '@nusa:user_data',
  ONBOARDING_COMPLETE: '@nusa:onboarding_complete',
  ONBOARDING_STEP: '@nusa:onboarding_step',
  BANNER_DISMISSED: '@nusa:banner_dismissed',
  METRO_AREA: '@nusa:metro_area',
  ACTIVE_LOCATION: '@nusa:active_location',
  LOCATION_PERMISSION_STATUS: '@nusa:location_permission_status',
  LOCATION_SNOOZES: '@nusa:location_snoozes',
  PERMISSION_BANNER_STATE: '@nusa:permission_banner_state',
} as const;
