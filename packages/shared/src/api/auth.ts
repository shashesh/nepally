/**
 * Auth API functions
 * All functions accept SupabaseClient via dependency injection.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { toApiError } from '../utils/apiError';

/**
 * Sends a password-reset email; its link lands on `redirectTo`.
 * Never rejects: a returned or thrown failure comes back as `{ error }`.
 */
export async function requestPasswordReset(
  supabase: SupabaseClient,
  email: string,
  redirectTo: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { error };
    return {};
  } catch (error) {
    return { error: toApiError(error, 'Failed to send password reset email') };
  }
}
