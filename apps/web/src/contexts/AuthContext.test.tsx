import React, { useContext } from 'react';
import { render, waitFor } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  getUserMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signOutMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  requestWebPushPermissionMock: vi.fn(),
  unsubscribeMock: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSessionMock,
      getUser: authMocks.getUserMock,
      onAuthStateChange: authMocks.onAuthStateChangeMock,
      signOut: authMocks.signOutMock,
    },
  },
}));

vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    getUserById: authMocks.getUserByIdMock,
  };
});

vi.mock('../lib/webPush', () => ({
  requestWebPushPermission: authMocks.requestWebPushPermissionMock,
}));

import { AuthContext, AuthProvider } from './AuthContext';

function ContextProbe({ onSnapshot }: { onSnapshot: (value: React.ContextType<typeof AuthContext>) => void }) {
  const value = useContext(AuthContext);
  onSnapshot(value);
  return null;
}

describe('AuthProvider', () => {
  let authStateChangeCallback:
    | ((event: string, session: { user?: { id: string } } | null) => Promise<void>)
    | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    authStateChangeCallback = null;
    authMocks.getSessionMock.mockResolvedValue({ data: { session: null } });
    authMocks.getUserMock.mockResolvedValue({ data: { user: null } });
    authMocks.getUserByIdMock.mockResolvedValue({ data: undefined });
    authMocks.requestWebPushPermissionMock.mockResolvedValue(true);
    authMocks.onAuthStateChangeMock.mockImplementation((callback: unknown) => {
      authStateChangeCallback = callback as typeof authStateChangeCallback;
      return {
        data: { subscription: { unsubscribe: authMocks.unsubscribeMock } },
      };
    });
    authMocks.signOutMock.mockResolvedValue({ error: null });
  });

  it('loads initial session and user profile', async () => {
    const snapshots: Array<React.ContextType<typeof AuthContext>> = [];

    authMocks.getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    authMocks.getUserByIdMock.mockResolvedValue({
      data: { id: 'user-1', full_name: 'Nusa User' },
    });

    render(
      <AuthProvider>
        <ContextProbe onSnapshot={(v) => snapshots.push(v)} />
      </AuthProvider>
    );

    await waitFor(() => {
      const latest = snapshots[snapshots.length - 1];
      expect(latest.loading).toBe(false);
      expect(latest.user?.id).toBe('user-1');
      expect(latest.supabaseUser?.id).toBe('user-1');
    });

    await waitFor(() => {
      expect(authMocks.requestWebPushPermissionMock).toHaveBeenCalledWith(
        expect.any(Object),
        'user-1'
      );
    });
  });

  it('does not register web push when no authenticated user exists', async () => {
    render(
      <AuthProvider>
        <ContextProbe onSnapshot={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(authMocks.getSessionMock).toHaveBeenCalled();
    });

    expect(authMocks.requestWebPushPermissionMock).not.toHaveBeenCalled();
  });

  it('avoids duplicate web push registration for repeated same-user auth events', async () => {
    authMocks.getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    authMocks.getUserByIdMock.mockResolvedValue({
      data: { id: 'user-1', full_name: 'Nusa User' },
    });

    render(
      <AuthProvider>
        <ContextProbe onSnapshot={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(authMocks.requestWebPushPermissionMock).toHaveBeenCalledTimes(1);
    });

    expect(authStateChangeCallback).not.toBeNull();

    await authStateChangeCallback?.('SIGNED_IN', { user: { id: 'user-1' } });

    await waitFor(() => {
      expect(authMocks.requestWebPushPermissionMock).toHaveBeenCalledTimes(1);
    });
  });

  it('signOut clears user state and calls supabase signOut', async () => {
    const snapshots: Array<React.ContextType<typeof AuthContext>> = [];

    authMocks.getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-2' } } },
    });
    authMocks.getUserByIdMock.mockResolvedValue({ data: { id: 'user-2' } });

    render(
      <AuthProvider>
        <ContextProbe onSnapshot={(v) => snapshots.push(v)} />
      </AuthProvider>
    );

    await waitFor(() => {
      const latest = snapshots[snapshots.length - 1];
      expect(latest.loading).toBe(false);
      expect(latest.user?.id).toBe('user-2');
    });

    await snapshots[snapshots.length - 1].signOut();

    await waitFor(() => {
      const latest = snapshots[snapshots.length - 1];
      expect(authMocks.signOutMock).toHaveBeenCalled();
      expect(latest.user).toBeNull();
      expect(latest.supabaseUser).toBeNull();
    });
  });
});
