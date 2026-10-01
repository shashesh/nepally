/**
 * Account deletion RPCs (migrations 048 and 050). Both take the caller from
 * the JWT, so neither takes a user id.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError, toApiError } from '../utils/apiError';
import {
  DELETION_IN_PROGRESS,
  PROFILE_NOT_FOUND,
  REAUTH_REQUIRED,
} from '../constants/accountDeletion';

export type AccountDeletionErrorCode =
  typeof REAUTH_REQUIRED | typeof DELETION_IN_PROGRESS | typeof PROFILE_NOT_FOUND;

/** What each error the RPCs raise tells the member. */
const SENTENCES: Record<AccountDeletionErrorCode, string> = {
  [REAUTH_REQUIRED]: "Please confirm it's you again.",
  [DELETION_IN_PROGRESS]: 'Your account is already being deleted.',
  [PROFILE_NOT_FOUND]: "We couldn't find your profile.",
};

function isAccountDeletionErrorCode(value: unknown): value is AccountDeletionErrorCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SENTENCES, value);
}

/** The RPCs raise their error as the message; it becomes an ApiError carrying it as the code. */
function toAccountDeletionError(raw: unknown, fallback: string): Error {
  const message =
    typeof raw === 'object' && raw !== null ? (raw as { message?: unknown }).message : undefined;
  if (isAccountDeletionErrorCode(message)) {
    return new ApiError(SENTENCES[message], { code: message });
  }
  return toApiError(raw, fallback);
}

/** The account deletion error an error from these functions carries, or null. */
export function getAccountDeletionErrorCode(error: unknown): AccountDeletionErrorCode | null {
  if (!(error instanceof ApiError)) return null;
  return isAccountDeletionErrorCode(error.code) ? error.code : null;
}

export interface AccountDeletionResult {
  /** The ISO purge date. */
  data?: string;
  error?: Error;
}

/**
 * Schedules the caller's account for deletion. It needs a sign-in within
 * REAUTH_MAX_AGE_SECONDS; repeating it returns the same date.
 */
export async function requestAccountDeletion(
  supabase: SupabaseClient
): Promise<AccountDeletionResult> {
  try {
    const { data, error } = await supabase.rpc('request_account_deletion');
    if (error) throw error;
    if (typeof data !== 'string') throw new Error('No deletion date returned');
    return { data };
  } catch (error) {
    return {
      error: toAccountDeletionError(error, "Couldn't delete your account. Please try again."),
    };
  }
}

/** Restores the caller's account. Refused with DELETION_IN_PROGRESS once the date has passed. */
export async function cancelAccountDeletion(supabase: SupabaseClient): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase.rpc('cancel_account_deletion');
    if (error) throw error;
    return {};
  } catch (error) {
    return {
      error: toAccountDeletionError(error, "Couldn't restore your account. Please try again."),
    };
  }
}
