import React from 'react';
import { render, screen, waitFor, act } from '../../test-utils';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

const callbackMocks = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  getSessionMock: vi.fn(),
  createUserProfileMock: vi.fn(),
  markEmailVerifiedMock: vi.fn(),
  markGoogleVerifiedMock: vi.fn(),
  getUserByIdMock: vi.fn(),
}));

vi.mock('next/router', () => ({
  useRouter: callbackMocks.useRouterMock,
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: callbackMocks.onAuthStateChangeMock,
      getSession: callbackMocks.getSessionMock,
    },
  },
}));

vi.mock('@nusa/shared', () => ({
  createUserProfile: callbackMocks.createUserProfileMock,
  markEmailVerified: callbackMocks.markEmailVerifiedMock,
  markGoogleVerified: callbackMocks.markGoogleVerifiedMock,
  getUserById: callbackMocks.getUserByIdMock,
}));

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}));

const mockUnsubscribe = vi.fn();

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
      ...overrides,
    },
  } as unknown as Session;
}

import AuthCallbackPage from './callback.page';

describe('AuthCallbackPage', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    callbackMocks.useRouterMock.mockReturnValue({ push: mockPush });
    callbackMocks.onAuthStateChangeMock.mockImplementation(() => ({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    }));
    callbackMocks.getSessionMock.mockResolvedValue({ data: { session: null } });
    callbackMocks.createUserProfileMock.mockResolvedValue({ data: { id: 'user-123' }, error: null });
    callbackMocks.markEmailVerifiedMock.mockResolvedValue({ data: { id: 'user-123' }, error: null });
    callbackMocks.markGoogleVerifiedMock.mockResolvedValue({ data: { id: 'user-123' }, error: null });
    callbackMocks.getUserByIdMock.mockResolvedValue({ data: null, error: { message: 'Not found' } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders verifying state initially', () => {
    render(<AuthCallbackPage />);
    expect(screen.getByText('Verifying your email...')).toBeDefined();
  });

  it('creates profile and marks email verified when SIGNED_IN fires for new user', async () => {
    let capturedCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;

    callbackMocks.onAuthStateChangeMock.mockImplementation(
      (cb: (event: AuthChangeEvent, session: Session | null) => void) => {
        capturedCallback = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }
    );

    // New user: first getUserById returns null, second returns profile with no metro
    callbackMocks.getUserByIdMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'user-123', metro_area_id: null }, error: null });

    render(<AuthCallbackPage />);

    await act(async () => {
      capturedCallback!('SIGNED_IN', makeSession());
    });

    await waitFor(() => {
      expect(callbackMocks.createUserProfileMock).toHaveBeenCalledWith(
        expect.anything(),
        'user-123',
        'test@example.com',
        'Test User'
      );
      expect(callbackMocks.markEmailVerifiedMock).toHaveBeenCalledWith(
        expect.anything(),
        'user-123'
      );
    });
  });

  it('redirects to /onboarding/zip when metro_area_id is null', async () => {
    let capturedCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;

    callbackMocks.onAuthStateChangeMock.mockImplementation(
      (cb: (event: AuthChangeEvent, session: Session | null) => void) => {
        capturedCallback = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }
    );

    callbackMocks.getUserByIdMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'user-123', metro_area_id: null }, error: null });

    render(<AuthCallbackPage />);

    await act(async () => {
      capturedCallback!('SIGNED_IN', makeSession());
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding/zip');
    });
  });

  it('redirects to /feed when metro_area_id is already set (returning user)', async () => {
    let capturedCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;

    callbackMocks.onAuthStateChangeMock.mockImplementation(
      (cb: (event: AuthChangeEvent, session: Session | null) => void) => {
        capturedCallback = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }
    );

    // Returning user: profile exists with metro_area_id set
    callbackMocks.getUserByIdMock
      .mockResolvedValueOnce({ data: { id: 'user-123', metro_area_id: '35620' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'user-123', metro_area_id: '35620' }, error: null });

    render(<AuthCallbackPage />);

    await act(async () => {
      capturedCallback!('SIGNED_IN', makeSession());
    });

    await waitFor(() => {
      expect(callbackMocks.createUserProfileMock).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/feed');
    });
  });

  it('shows error state after timeout when no SIGNED_IN fires', async () => {
    render(<AuthCallbackPage />);

    act(() => {
      vi.advanceTimersByTime(11000);
    });

    await waitFor(() => {
      expect(screen.getByText('Link Expired')).toBeDefined();
    });
  });

  it('shows links to Sign Up and Sign In on error state', async () => {
    render(<AuthCallbackPage />);

    act(() => {
      vi.advanceTimersByTime(11000);
    });

    await waitFor(() => {
      const backLink = screen.getByText('Back to Sign Up').closest('a');
      expect(backLink?.getAttribute('href')).toBe('/signup');
      const signInLink = screen.getByText('Sign In').closest('a');
      expect(signInLink?.getAttribute('href')).toBe('/login');
    });
  });

  it('unsubscribes from onAuthStateChange on unmount', () => {
    const { unmount } = render(<AuthCallbackPage />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('calls markGoogleVerified instead of markEmailVerified for Google provider', async () => {
    let capturedCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;

    callbackMocks.onAuthStateChangeMock.mockImplementation(
      (cb: (event: AuthChangeEvent, session: Session | null) => void) => {
        capturedCallback = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }
    );

    callbackMocks.getUserByIdMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'user-123', metro_area_id: null }, error: null });

    render(<AuthCallbackPage />);

    const googleSession = {
      user: {
        id: 'user-123',
        email: 'test@gmail.com',
        user_metadata: { full_name: 'Google User' },
        app_metadata: { provider: 'google' },
      },
    } as unknown as Session;

    await act(async () => {
      capturedCallback!('SIGNED_IN', googleSession);
    });

    await waitFor(() => {
      expect(callbackMocks.markGoogleVerifiedMock).toHaveBeenCalledWith(
        expect.anything(),
        'user-123'
      );
      expect(callbackMocks.markEmailVerifiedMock).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/onboarding/zip');
    });
  });
});
