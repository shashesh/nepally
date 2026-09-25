/**
 * Shared Users API functions
 * All Supabase query logic — accepts SupabaseClient via dependency injection
 *
 * Column visibility (migration 036): clients hold a column-level SELECT grant
 * on public.users covering only public-profile columns, so reads of *other*
 * users select PUBLIC_USER_COLUMNS and return `PublicUser`. The caller's own
 * full row — email, phone, zip_code, moderation flags — is only available via
 * the `get_my_profile()` SECURITY DEFINER RPC, which every own-row read and
 * every profile write in this module goes through. A `select('*')` or bare
 * `.select()` on users fails with "permission denied".
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { toApiError } from '../utils/apiError';
import type { PublicUser, User } from '../types/user';
import { PUBLIC_USER_COLUMNS } from '../constants/users';
import { FULL_NAME_MAX_LENGTH, normalizeFullName } from '../validation/user';
import { deleteProfilePhoto, uploadProfilePhoto } from './storage';

export interface UserResult {
  data?: User;
  error?: Error;
}

export interface PublicUserResult {
  data?: PublicUser;
  error?: Error;
}

/**
 * Read the calling user's own full profile row through the get_my_profile RPC.
 * Resolves with no data (and no error) when the profile row does not exist yet,
 * e.g. mid-signup before createUserProfile has run.
 */
async function fetchOwnProfile(
  supabase: SupabaseClient
): Promise<{ data: User | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_my_profile').maybeSingle();
  if (error) {
    return { data: null, error };
  }
  return { data: (data as User | null) ?? null, error: null };
}

/**
 * Read-back for a write that targeted a specific `userId`. get_my_profile()
 * is driven by auth.uid(), not by the `userId` a caller passed to
 * update/insert — if a mismatched userId meant the write's RLS policy
 * silently matched zero rows (no PostgREST error on an UPDATE that touches
 * nothing), this would otherwise return the caller's own unrelated profile
 * as if the write had succeeded. Fail loudly instead.
 */
async function fetchOwnProfileForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: User | null; error: Error | null }> {
  const { data, error } = await fetchOwnProfile(supabase);
  if (error) return { data: null, error };
  if (data && data.id !== userId) {
    return {
      data: null,
      error: new Error(
        `Profile read-back (${data.id}) does not match the requested user (${userId}); the write may not have applied`
      ),
    };
  }
  return { data, error: null };
}

/**
 * Get another member's public profile by ID.
 * Only public-profile columns are returned — see PUBLIC_USER_COLUMNS.
 * For the signed-in user's own full row use getMyProfile().
 */
export async function getUserById(
  supabase: SupabaseClient,
  userId: string
): Promise<PublicUserResult> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(PUBLIC_USER_COLUMNS)
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('User not found');

    return { data: data as unknown as PublicUser };
  } catch (error) {
    return {
      error: toApiError(error, 'Failed to fetch user'),
    };
  }
}

/**
 * Get the signed-in user's own full profile (including email, phone, zip_code
 * and moderation flags). Resolves with `data: undefined` and no error when the
 * profile row does not exist yet (e.g. mid-signup before createUserProfile),
 * so callers can distinguish "not created" from a failed read.
 */
export async function getMyProfile(
  supabase: SupabaseClient
): Promise<UserResult> {
  try {
    const { data, error } = await fetchOwnProfile(supabase);

    if (error) throw error;

    return { data: data ?? undefined };
  } catch (error) {
    return {
      error: toApiError(error, 'Failed to fetch profile'),
    };
  }
}

/**
 * Update user location (ZIP code and metro area)
 */
export async function updateUserLocation(
  supabase: SupabaseClient,
  userId: string,
  zipCode: string,
  metroAreaId: string
): Promise<UserResult> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        zip_code: zipCode,
        metro_area_id: metroAreaId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    const { data, error: readError } = await fetchOwnProfileForUser(supabase, userId);
    if (readError) throw readError;
    if (!data) throw new Error('Failed to update user');

    return { data };
  } catch (error) {
    return {
      error: toApiError(error, 'Failed to update user location'),
    };
  }
}

/**
 * Update user profile fields
 */
export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<
    Pick<
      User,
      | 'full_name'
      | 'phone'
      | 'profile_photo'
      | 'bio'
      | 'hometown_district'
      | 'college'
      | 'years_in_us'
      | 'languages'
    >
  >
): Promise<UserResult> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    const { data, error: readError } = await fetchOwnProfileForUser(supabase, userId);
    if (readError) throw readError;
    if (!data) throw new Error('Failed to update profile');

    return { data };
  } catch (error) {
    return {
      error: toApiError(error, 'Failed to update profile'),
    };
  }
}

/**
 * Upload an already-cropped avatar and point the profile at it. The
 * platform-neutral half of a photo change — web crops in a canvas, mobile
 * would crop with its own APIs, but both hand this the same raw bytes.
 *
 * uploadProfilePhoto always upserts the same fixed `<userId>.jpg` path, so
 * if the upload succeeds but the profile write below fails, the file in
 * storage has already been overwritten — there is nothing to roll back.
 * The next successful call simply overwrites it again.
 */
export async function setProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
  fileData: ArrayBuffer | Uint8Array
): Promise<{ url?: string; error?: Error }> {
  const { url, error: uploadError } = await uploadProfilePhoto(supabase, userId, fileData);
  if (uploadError) return { error: uploadError };
  if (!url) return { error: new Error('Failed to upload photo') };

  const { error: profileError } = await updateUserProfile(supabase, userId, { profile_photo: url });
  if (profileError) return { error: profileError };

  return { url };
}

/**
 * Clears the member's photo. The file is deleted first: the photo is public
 * at its URL, so a delete that fails must leave the profile as it was, with
 * the photo still showing and the member able to try again. Clearing the
 * column first would hide the failure and orphan a public file.
 *
 * If the delete succeeds and the column write then fails, the profile points
 * at a missing file. Uploading a new photo recovers, since it rewrites both.
 */
export async function removeProfilePhoto(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error?: Error }> {
  const { error: deleteError } = await deleteProfilePhoto(supabase, userId);
  if (deleteError) return { error: deleteError };

  // null, not undefined: JSON drops undefined keys, so the column would never clear.
  const { error } = await updateUserProfile(supabase, userId, { profile_photo: null });
  if (error) return { error };
  return {};
}

/**
 * Promote the calling user to Verified (trust_level 1) through the
 * `mark_user_verified` SECURITY DEFINER RPC. The server reads auth.users for
 * the current session and promotes only when the email is confirmed or a
 * Google identity is linked. Never demotes.
 *
 * Clients cannot write trust_level / *_verified directly — migration 034
 * rejects those writes — so this is the only promotion path.
 */
export async function markUserVerified(
  supabase: SupabaseClient
): Promise<UserResult> {
  try {
    const { data, error } = await supabase.rpc('mark_user_verified');

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Failed to mark user verified');

    return { data: row as User };
  } catch (error) {
    return {
      error: toApiError(error, 'Failed to mark user verified'),
    };
  }
}

/**
 * Mark a user's email as verified (called after OTP/link verification).
 * Delegates to markUserVerified — identity comes from the session, so the
 * userId argument is retained only for call-site compatibility.
 */
export async function markEmailVerified(
  supabase: SupabaseClient,
  _userId: string
): Promise<UserResult> {
  return markUserVerified(supabase);
}

/**
 * Resend verification email (wraps Supabase auth.resend)
 */
export async function resendVerificationEmail(
  supabase: SupabaseClient,
  email: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
    return {};
  } catch (error) {
    return {
      error: toApiError(error, 'Failed to resend verification email'),
    };
  }
}

/**
 * Mark a user's Google account as verified and promote trust level.
 * Delegates to markUserVerified — the server checks auth.identities for a
 * linked Google provider, so the userId argument is retained only for
 * call-site compatibility.
 */
export async function markGoogleVerified(
  supabase: SupabaseClient,
  _userId: string
): Promise<UserResult> {
  return markUserVerified(supabase);
}

/**
 * A provider's name (Google, or the sign-up form before the schema ran) as
 * the users table will take it: normalised as fullNameSchema does, then cut
 * to FULL_NAME_MAX_LENGTH code points so it fits the 040 length check.
 * Array.from walks code points, so a surrogate pair is never split.
 */
function toStoredFullName(fullName: string): string {
  return Array.from(normalizeFullName(fullName)).slice(0, FULL_NAME_MAX_LENGTH).join('').trimEnd();
}

/**
 * Create user profile (called after email verification)
 */
export async function createUserProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  fullName: string
): Promise<UserResult> {
  try {
    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: toStoredFullName(fullName),
        trust_level: 0, // Start at Level 0
      });

    if (error) throw error;

    const { data, error: readError } = await fetchOwnProfileForUser(supabase, userId);
    if (readError) throw readError;
    if (!data) throw new Error('Failed to create profile');

    return { data };
  } catch (error) {
    return {
      error: toApiError(error, 'Failed to create profile'),
    };
  }
}
