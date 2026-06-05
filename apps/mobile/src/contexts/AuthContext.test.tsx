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

jest.mock('../services/notifications', () => ({
  registerForPushNotificationsAsync: (...args: unknown[]) =>
    mockRegisterForPushNotificationsAsync(...args),
  isExpoGo: false,
}));

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthContext, AuthProvider } from './AuthContext';
import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockAuth = supabase.auth as jest.Mocked<typeof supabase.auth>;
const mockFrom = supabase.from as jest.Mock;
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
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'user-1',
          email: 'test@nusa.com',
          full_name: 'Test User',
          trust_level: 1,
          is_premium: false,
        },
        error: null,
      }),
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
      | ((event: string, session: { user?: { id: string } } | null) => Promise<void>)
      | null = null;
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
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'user-1',
          email: 'test@nusa.com',
          full_name: 'Test User',
          trust_level: 1,
          is_premium: false,
        },
        error: null,
      }),
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

  it('initializes session timestamps when missing on cold start with existing session', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'test@nusa.com' } } },
      error: null,
    } as GetSessionResult);
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    } as GetUserResult);
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'user-1', email: 'test@nusa.com', full_name: 'Test User', trust_level: 1, is_premium: false },
        error: null,
      }),
    });

    // No timestamps in storage — simulates first launch after upgrade or storage clear
    renderHook(() => React.useContext(AuthContext), { wrapper });
    await act(async () => {});
    await act(async () => {});
    await act(async () => {});

    const signInAt = await AsyncStorage.getItem('@nusa:session_sign_in_at');
    const lastActivity = await AsyncStorage.getItem('@nusa:session_last_activity');
    const userId = await AsyncStorage.getItem('@nusa:session_user_id');
    expect(signInAt).not.toBeNull();
    expect(lastActivity).not.toBeNull();
    expect(userId).toBe('user-1');
  });

  it('signs out when session timestamps are corrupted (NaN)', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'test@nusa.com' } } },
      error: null,
    } as GetSessionResult);
    mockAuth.signOut.mockResolvedValue({ error: null } as SignOutResult);

    await AsyncStorage.setItem('@nusa:session_last_activity', 'corrupted');
    await AsyncStorage.setItem('@nusa:session_sign_in_at', 'corrupted');

    const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });
    await act(async () => {});
    await act(async () => {});
    await act(async () => {});

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
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
});
