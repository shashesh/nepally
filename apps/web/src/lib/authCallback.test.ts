import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { FINISH_SIGN_IN_FAILED, finishSignIn } from './authCallback';

const { getMyProfile, createUserProfile, markEmailVerified, markGoogleVerified, logClientEvent } =
  vi.hoisted(() => ({
    getMyProfile: vi.fn(),
    createUserProfile: vi.fn(),
    markEmailVerified: vi.fn(),
    markGoogleVerified: vi.fn(),
    logClientEvent: vi.fn(),
  }));

vi.mock('@nepally/shared', () => ({
  getMyProfile,
  createUserProfile,
  markEmailVerified,
  markGoogleVerified,
  logClientEvent,
}));

const supabase = {} as SupabaseClient;

function session(provider = 'email'): Session {
  return {
    user: {
      id: 'user-1',
      email: 'new@example.com',
      user_metadata: { full_name: 'Sita Rai' },
      app_metadata: { provider },
    },
  } as unknown as Session;
}

const PROFILE = { id: 'user-1', metro_area_id: null };
const PROFILE_WITH_METRO = { id: 'user-1', metro_area_id: 'metro-1' };

describe('finishSignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createUserProfile.mockResolvedValue({ data: PROFILE });
    markEmailVerified.mockResolvedValue({ data: PROFILE });
    markGoogleVerified.mockResolvedValue({ data: PROFILE });
  });

  it('creates a missing profile, marks the email verified and sends a new member to onboarding', async () => {
    getMyProfile.mockResolvedValueOnce({ data: undefined }).mockResolvedValueOnce({ data: PROFILE });

    const result = await finishSignIn(supabase, session());

    expect(createUserProfile).toHaveBeenCalledWith(supabase, 'user-1', 'new@example.com', 'Sita Rai');
    expect(markEmailVerified).toHaveBeenCalledWith(supabase, 'user-1');
    expect(markGoogleVerified).not.toHaveBeenCalled();
    expect(getMyProfile).toHaveBeenCalledTimes(2);
    expect(createUserProfile.mock.invocationCallOrder[0]).toBeGreaterThan(
      getMyProfile.mock.invocationCallOrder[0]
    );
    expect(markEmailVerified.mock.invocationCallOrder[0]).toBeGreaterThan(
      createUserProfile.mock.invocationCallOrder[0]
    );
    expect(result).toEqual({ destination: '/onboarding/zip' });
  });

  it('skips createUserProfile when the profile exists', async () => {
    getMyProfile.mockResolvedValue({ data: PROFILE });

    await finishSignIn(supabase, session());

    expect(createUserProfile).not.toHaveBeenCalled();
  });

  it('marks a Google member Google-verified', async () => {
    getMyProfile.mockResolvedValue({ data: PROFILE });

    await finishSignIn(supabase, session('google'));

    expect(markGoogleVerified).toHaveBeenCalledWith(supabase, 'user-1');
    expect(markEmailVerified).not.toHaveBeenCalled();
  });

  it('sends a member with a metro to the feed', async () => {
    getMyProfile.mockResolvedValue({ data: PROFILE_WITH_METRO });

    const result = await finishSignIn(supabase, session());

    expect(result).toEqual({ destination: '/feed' });
  });

  describe('failures', () => {
    function expectFailed(result: Awaited<ReturnType<typeof finishSignIn>>) {
      expect(result).toEqual({ error: FINISH_SIGN_IN_FAILED });
      expect(logClientEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'auth_callback_failed' })
      );
    }

    it('fails when the first profile read fails', async () => {
      getMyProfile.mockResolvedValue({ error: new Error('read failed') });

      expectFailed(await finishSignIn(supabase, session()));
      expect(createUserProfile).not.toHaveBeenCalled();
    });

    it('fails when createUserProfile fails', async () => {
      getMyProfile.mockResolvedValue({ data: undefined });
      createUserProfile.mockResolvedValue({ error: new Error('insert failed') });

      expectFailed(await finishSignIn(supabase, session()));
      expect(markEmailVerified).not.toHaveBeenCalled();
    });

    it('fails when markEmailVerified fails', async () => {
      getMyProfile.mockResolvedValue({ data: PROFILE });
      markEmailVerified.mockResolvedValue({ error: new Error('update failed') });

      expectFailed(await finishSignIn(supabase, session()));
    });

    it('fails when markGoogleVerified fails', async () => {
      getMyProfile.mockResolvedValue({ data: PROFILE });
      markGoogleVerified.mockResolvedValue({ error: new Error('update failed') });

      expectFailed(await finishSignIn(supabase, session('google')));
    });

    it('fails when the second profile read fails', async () => {
      getMyProfile
        .mockResolvedValueOnce({ data: PROFILE })
        .mockResolvedValueOnce({ error: new Error('read failed') });

      expectFailed(await finishSignIn(supabase, session()));
    });

    it('fails when the second profile read finds no profile', async () => {
      getMyProfile.mockResolvedValueOnce({ data: PROFILE }).mockResolvedValueOnce({ data: undefined });

      expectFailed(await finishSignIn(supabase, session()));
    });

    it('fails when a step throws', async () => {
      getMyProfile.mockResolvedValue({ data: undefined });
      createUserProfile.mockRejectedValue(new Error('network down'));

      expectFailed(await finishSignIn(supabase, session()));
    });
  });
});
