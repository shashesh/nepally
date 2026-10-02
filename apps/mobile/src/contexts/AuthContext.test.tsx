import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signOut: jest.fn(),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    })),
  },
}));

const mockRegisterForPushNotificationsAsync = jest.fn();
const mockGetMyProfile = jest.fn();

jest.mock('@nepally/shared', () => ({
  getMyProfile: (...args: unknown[]) => mockGetMyProfile(...args),
}));

jest.mock('../services/notifications', () => ({
  registerForPushNotificationsAsync: (...args: unknown[]) =>
    mockRegisterForPushNotificationsAsync(...args),
  isExpoGo: false,
}));

import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { AuthContext, AuthProvider } from './AuthContext';
import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockAuth = supabase.auth as jest.Mocked<typeof supabase.auth>;
type GetSessionResult = Awaited<ReturnType<typeof mockAuth.getSession>>;
type GetUserResult = Awaited<ReturnType<typeof mockAuth.getUser>>;
type OnAuthStateChangeResult = ReturnType<typeof mockAuth.onAuthStateChange>;
type SignOutResult = Awaited<ReturnType<typeof mockAuth.signOut>>;

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage as jest.Mocked<typeof AsyncStorage>).clear();
    mockRegisterForPushNotificationsAsync.mockResolvedValue(true);
    mockGetMyProfile.mockResolvedValue({ data: undefined });
    // Default: no active session
    mockAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    } as GetSessionResult);
    mockAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    } as unknown as OnAuthStateChangeResult);
  });

  it('starts with loading true and user null', () => {
    mockAuth.getSession.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('sets loading to false when no session exists', async () => {
    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('loads user profile when session exists', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'test@nusa.com' },
        },
      },
      error: null,
    } as GetSessionResult);
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    } as GetUserResult);
    mockGetMyProfile.mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'test@nusa.com',
        full_name: 'Test User',
        trust_level: 1,
        is_premium: false,
      },
    });

    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });
    // Flush all pending microtasks (getSession → getUser → profile fetch chain).
    await act(async () => {});
    await act(async () => {});
    await act(async () => {});

    expect(result.current.user?.id).toBe('user-1');
    expect(result.current.user?.full_name).toBe('Test User');
    expect(result.current.loading).toBe(false);
    expect(mockRegisterForPushNotificationsAsync).toHaveBeenCalledWith(supabase, 'user-1');
  });

  it('does not register push token when no session exists', async () => {
    renderHook(() => React.useContext(AuthContext), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRegisterForPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it('avoids duplicate push registration for same user across auth transitions', async () => {
    let authStateChangeCallback:
      ((event: string, session: { user?: { id: string } } | null) => Promise<void>) | null = null;
    mockAuth.onAuthStateChange.mockImplementation((callback) => {
      authStateChangeCallback = callback as typeof authStateChangeCallback;
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      } as unknown as OnAuthStateChangeResult;
    });

    mockAuth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'test@nusa.com' },
        },
      },
      error: null,
    } as GetSessionResult);
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    } as GetUserResult);
    mockGetMyProfile.mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'test@nusa.com',
        full_name: 'Test User',
        trust_level: 1,
        is_premium: false,
      },
    });

    renderHook(() => React.useContext(AuthContext), { wrapper });
    await act(async () => {});
    await act(async () => {});
    await act(async () => {});

    expect(mockRegisterForPushNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(authStateChangeCallback).not.toBeNull();

    await act(async () => {
      await authStateChangeCallback!('SIGNED_IN', { user: { id: 'user-1' } });
    });
    await act(async () => {});

    expect(mockRegisterForPushNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps a persisted session however long the user has been away', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'test@nusa.com' } } },
      error: null,
    } as GetSessionResult);
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    } as GetUserResult);
    mockGetMyProfile.mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'test@nusa.com',
        full_name: 'Test User',
        trust_level: 1,
        is_premium: false,
      },
    });

    // Timestamps an older build left behind: last active 90 days ago,
    // signed in 400 days ago. Sessions no longer expire on either.
    const DAY_MS = 24 * 60 * 60 * 1000;
    await AsyncStorage.setItem('@nusa:session_last_activity', String(Date.now() - 90 * DAY_MS));
    await AsyncStorage.setItem('@nusa:session_sign_in_at', String(Date.now() - 400 * DAY_MS));

    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });
    await act(async () => {});
    await act(async () => {});
    await act(async () => {});

    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(result.current.user?.id).toBe('user-1');
  });

  it('refreshes the session token only while the app is in the foreground', async () => {
    let handleAppStateChange: ((state: AppStateStatus) => void) | null = null;
    // The react-native Jest preset already mocks addEventListener; override
    // one call only so later tests keep the preset's default subscription.
    jest.spyOn(AppState, 'addEventListener').mockImplementationOnce((_type, handler) => {
      handleAppStateChange = handler as (state: AppStateStatus) => void;
      return { remove: jest.fn() };
    });

    renderHook(() => React.useContext(AuthContext), { wrapper });
    await act(async () => {});

    expect(handleAppStateChange).not.toBeNull();

    act(() => handleAppStateChange!('background'));
    expect(mockAuth.stopAutoRefresh).toHaveBeenCalledTimes(1);
    expect(mockAuth.startAutoRefresh).not.toHaveBeenCalled();

    act(() => handleAppStateChange!('active'));
    expect(mockAuth.startAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it('stops listening for app state changes on unmount', async () => {
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementationOnce(() => ({ remove }));

    const { unmount } = renderHook(() => React.useContext(AuthContext), { wrapper });
    await act(async () => {});
    unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('signs out and clears user', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null } as SignOutResult);

    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });
    await act(async () => {
      await result.current.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  const SCHEDULED_FOR = '2026-10-30T12:00:00.000Z';

  function signedInAs(profile: Record<string, unknown> | undefined) {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'test@nusa.com' } } },
      error: null,
    } as GetSessionResult);
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    } as GetUserResult);
    mockGetMyProfile.mockResolvedValue({ data: profile });
  }

  function profile(deletionScheduledFor: string | null) {
    return {
      id: 'user-1',
      email: 'test@nusa.com',
      full_name: 'Test User',
      trust_level: 1,
      is_premium: false,
      deletion_scheduled_for: deletionScheduledFor,
    };
  }

  async function settle() {
    await act(async () => {});
    await act(async () => {});
    await act(async () => {});
  }

  it('registers push only once the profile has loaded', async () => {
    // Signed in, but the profile row isn't there yet (sign-up still creating it).
    signedInAs(undefined);
    renderHook(() => React.useContext(AuthContext), { wrapper });
    await settle();

    expect(mockRegisterForPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it('keeps the deletion date, and registers no push for a pending account', async () => {
    signedInAs(profile(SCHEDULED_FOR));
    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });
    await settle();

    expect(result.current.user?.deletion_scheduled_for).toBe(SCHEDULED_FOR);
    expect(mockRegisterForPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it('registers push after a restore, and refreshUser resolves with the profile', async () => {
    signedInAs(profile(SCHEDULED_FOR));
    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });
    await settle();

    mockGetMyProfile.mockResolvedValue({ data: profile(null) });
    let refreshed: Awaited<ReturnType<typeof result.current.refreshUser>> = null;
    await act(async () => {
      refreshed = await result.current.refreshUser();
    });

    expect(refreshed).toEqual(
      expect.objectContaining({ id: 'user-1', deletion_scheduled_for: null })
    );
    expect(result.current.user?.deletion_scheduled_for).toBeNull();
    expect(mockRegisterForPushNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(mockRegisterForPushNotificationsAsync).toHaveBeenCalledWith(supabase, 'user-1');
  });

  it('registers again after a restore on a device that registered before the deletion', async () => {
    // Device B registered; then device A deleted the account (removing every
    // token) and B, still running, loaded the pending profile.
    signedInAs(profile(null));
    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });
    await settle();
    expect(mockRegisterForPushNotificationsAsync).toHaveBeenCalledTimes(1);

    mockGetMyProfile.mockResolvedValue({ data: profile(SCHEDULED_FOR) });
    await act(async () => {
      await result.current.refreshUser();
    });
    expect(mockRegisterForPushNotificationsAsync).toHaveBeenCalledTimes(1);

    mockGetMyProfile.mockResolvedValue({ data: profile(null) });
    await act(async () => {
      await result.current.refreshUser();
    });
    expect(mockRegisterForPushNotificationsAsync).toHaveBeenCalledTimes(2);
  });

  it('drops a profile that arrives after sign-out', async () => {
    signedInAs(profile(null));
    mockAuth.signOut.mockResolvedValue({ error: null } as SignOutResult);
    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });
    await settle();
    expect(mockRegisterForPushNotificationsAsync).toHaveBeenCalledTimes(1);

    // A refresh's profile read is still out when the member signs out.
    let resolveProfile: (value: { data: ReturnType<typeof profile> }) => void = () => {};
    mockGetMyProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveProfile = resolve;
      })
    );
    let refreshing: Promise<unknown> = Promise.resolve();
    await act(async () => {
      refreshing = result.current.refreshUser();
    });
    await act(async () => {
      await result.current.signOut();
    });
    let refreshed: unknown = 'unset';
    await act(async () => {
      resolveProfile({ data: profile(null) });
      refreshed = await refreshing;
    });

    expect(refreshed).toBeNull();
    expect(result.current.user).toBeNull();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
    expect(mockRegisterForPushNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('refreshUser resolves with null when nobody is signed in', async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    } as unknown as GetUserResult);
    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });
    await settle();

    let refreshed: Awaited<ReturnType<typeof result.current.refreshUser>> | 'unset' = 'unset';
    await act(async () => {
      refreshed = await result.current.refreshUser();
    });

    expect(refreshed).toBeNull();
  });

  it('signs out every device by default, and only this one when asked', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null } as SignOutResult);
    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });
    await settle();

    await act(async () => {
      await result.current.signOut();
    });
    expect(mockAuth.signOut).toHaveBeenLastCalledWith({ scope: 'global' });

    await act(async () => {
      await result.current.signOut({ scope: 'local' });
    });
    expect(mockAuth.signOut).toHaveBeenLastCalledWith({ scope: 'local' });
  });
});
