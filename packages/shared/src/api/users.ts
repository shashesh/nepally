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
  updates: Partial<Pick<User, 'full_name' | 'phone' | 'profile_photo'>>
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
 * Mark a user's email as verified (called after OTP/link verification)
 */
export async function markEmailVerified(
  supabase: SupabaseClient,
  userId: string
): Promise<UserResult> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        email_verified: true,
        trust_level: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to mark email verified');

    return { data: data as User };
  } catch (error) {
    return {
      error: error instanceof Error
        ? error
        : new Error('Failed to mark email verified'),
    };
  }
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
