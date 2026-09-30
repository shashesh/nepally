/**
 * Account deletion (spec: docs/specs/2026-09-28-account-deletion.md). The
 * numbers and error names mirror the database; keep them in step with
 * request_account_deletion() and cancel_account_deletion() in
 * supabase/migrations/050_account_deletion_timing.sql.
 */

/** Days between a deletion request and the purge (050: c_grace_period). */
export const ACCOUNT_DELETION_GRACE_DAYS = 29;

/** How recent a sign-in request_account_deletion accepts, in seconds (c_reauth_max_age_seconds). */
export const REAUTH_MAX_AGE_SECONDS = 600;

/** Raised by request_account_deletion() without a recent sign-in (P0001). Also the ApiError code. */
export const REAUTH_REQUIRED = 'reauth_required';

/** Raised by cancel_account_deletion() once the date has passed (P0001). Also the ApiError code. */
export const DELETION_IN_PROGRESS = 'deletion_in_progress';

/** Raised by request_account_deletion() when the caller has no profile row (P0002). Also the ApiError code. */
export const PROFILE_NOT_FOUND = 'profile_not_found';

/** Shown in place of a chat partner who is pending deletion or purged. */
export const UNAVAILABLE_ACCOUNT_NAME = 'Unavailable account';
