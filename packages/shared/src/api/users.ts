/**
 * Shared Users API functions
 * All Supabase query logic — accepts SupabaseClient via dependency injection
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '../types/user';

interface UserResult {
  data?: User;
  error?: Error;
}

/**
 * Get user by ID
 */
export async function getUserById(
  supabase: SupabaseClient,
  userId: string
): Promise<UserResult> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('User not found');

    return { data: data as User };
  } catch (error) {
    return {
      error: error instanceof Error
        ? error
        : new Error('Failed to fetch user'),
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
    const { data, error } = await supabase
      .from('users')
      .update({
        zip_code: zipCode,
        metro_area_id: metroAreaId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update user');

    return { data: data as User };
  } catch (error) {
    return {
      error: error instanceof Error
        ? error
        : new Error('Failed to update user location'),
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
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update profile');

    return { data: data as User };
  } catch (error) {
    return {
      error: error instanceof Error
        ? error
        : new Error('Failed to update profile'),
    };
  }
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
      error: error instanceof Error
        ? error
        : new Error('Failed to mark user verified'),
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
      error: error instanceof Error
        ? error
        : new Error('Failed to resend verification email'),
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
 * Create user profile (called after email verification)
 */
export async function createUserProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  fullName: string
): Promise<UserResult> {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        trust_level: 0, // Start at Level 0
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create profile');

    return { data: data as User };
  } catch (error) {
    return {
      error: error instanceof Error
        ? error
        : new Error('Failed to create profile'),
    };
  }
}
