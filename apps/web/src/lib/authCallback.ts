/**
 * The steps /auth/callback runs once Supabase hands it a session: create the
 * profile if it's missing, mark the member verified by their provider, then
 * route by whether they have a metro yet. Every step's result is checked, so
 * the page always ends in a destination or an error, never a hang.
 */
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  createUserProfile,
  getMyProfile,
  logClientEvent,
  markEmailVerified,
  markGoogleVerified,
} from '@nepally/shared';

export type FinishSignInResult =
  | { destination: '/feed' | '/onboarding/zip' }
  | { error: string };

export const FINISH_SIGN_IN_FAILED = "We couldn't finish setting up your account. Please try again.";

type Step = 'read_profile' | 'create_profile' | 'mark_verified' | 'route';

class StepFailure extends Error {
  constructor(
    readonly step: Step,
    readonly cause: unknown
  ) {
    super(`finishSignIn failed at ${step}`);
  }
}

function check<T extends { error?: Error }>(result: T, step: Step): T {
  if (result.error) throw new StepFailure(step, result.error);
  return result;
}

/** The callback's steps: profile if missing, mark verified by provider, route by metro (decision 9). */
export async function finishSignIn(
  supabase: SupabaseClient,
  session: Session
): Promise<FinishSignInResult> {
  const { user } = session;
  try {
    const existing = check(await getMyProfile(supabase), 'read_profile');
    if (!existing.data) {
      const email = user.email ?? '';
      const fullName = (user.user_metadata?.full_name as string | undefined) ?? '';
      check(await createUserProfile(supabase, user.id, email, fullName), 'create_profile');
    }

    const markVerified = user.app_metadata?.provider === 'google' ? markGoogleVerified : markEmailVerified;
    check(await markVerified(supabase, user.id), 'mark_verified');

    const { data: profile } = check(await getMyProfile(supabase), 'route');
    if (!profile) throw new StepFailure('route', new Error('Profile missing after sign-in'));

    return { destination: profile.metro_area_id ? '/feed' : '/onboarding/zip' };
  } catch (error) {
    const failure = error instanceof StepFailure ? error : null;
    logClientEvent({
      event: 'auth_callback_failed',
      context: { step: failure?.step ?? 'unknown', provider: user.app_metadata?.provider },
      error: failure ? failure.cause : error,
    });
    return { error: FINISH_SIGN_IN_FAILED };
  }
}
