/**
 * Location-related constants
 */

/** Maximum number of saved locations per user */
export const MAX_SAVED_LOCATIONS = 5;

/** Hours to suppress location change prompt for a snoozed metro */
export const LOCATION_SNOOZE_HOURS = 24;

/** Maximum times to show the permission-denied banner */
export const PERMISSION_BANNER_MAX_SHOWS = 3;

/** Days between permission banner re-shows */
export const PERMISSION_BANNER_COOLDOWN_DAYS = 7;

/** Suggested labels for saved locations */
export const SUGGESTED_LOCATION_LABELS = ['Home', 'Work', 'Family', 'School', 'Other'] as const;
