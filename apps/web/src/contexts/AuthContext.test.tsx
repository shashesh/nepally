import React, { useContext } from 'react';
import { act, render, waitFor } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  getUserMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signOutMock: vi.fn(),
  getMyProfileMock: vi.fn(),
  requestWebPushPermissionMock: vi.fn(),
  unsubscribeMock: vi.fn(),
  replaceMock: vi.fn(),
  logClientEventMock: vi.fn(),
}));

vi.mock('next/router', () => ({ useRouter: () => ({ replace: authMocks.replaceMock }) }));

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

vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    getMyProfile: authMocks.getMyProfileMock,
    logClientEvent: authMocks.logClientEventMock,
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
    authMocks.getMyProfileMock.mockResolvedValue({ data: undefined });
    authMocks.requestWebPushPermissionMock.mockResolvedValue(true);
    authMocks.onAuthStateChangeMock.mockImplementation((callback: unknown) => {
      authStateChangeCallback = callback as typeof authStateChangeCallback;
      return {
        data: { subscription: { unsubscribe: authMocks.unsubscribeMock } },
      };
    });
    authMocks.signOutMock.mockResolvedValue({ error: null });
    authMocks.replaceMock.mockResolvedValue(true);
  });

  it('loads initial session and user profile', async () => {
    const snapshots: Array<React.ContextType<typeof AuthContext>> = [];

    authMocks.getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    authMocks.getMyProfileMock.mockResolvedValue({
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
    authMocks.getMyProfileMock.mockResolvedValue({
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

  async function renderSignedIn() {
    const snapshots: Array<React.ContextType<typeof AuthContext>> = [];
    authMocks.getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-2' } } },
    });
    authMocks.getMyProfileMock.mockResolvedValue({ data: { id: 'user-2' } });

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
    return snapshots;
  }

  it('signOut is busy while it runs, clears the member, then replaces /', async () => {
    const snapshots = await renderSignedIn();
    let finishSignOut: (value: { error: null }) => void = () => {};
    authMocks.signOutMock.mockReturnValue(
      new Promise((resolve) => {
        finishSignOut = resolve;
      })
    );

    let result: Promise<{ error?: string }> = Promise.resolve({});
    act(() => {
      result = snapshots[snapshots.length - 1].signOut();
    });
    expect(snapshots[snapshots.length - 1].signingOut).toBe(true);
    expect(snapshots[snapshots.length - 1].user?.id).toBe('user-2');

    await act(async () => {
      finishSignOut({ error: null });
      await result;
    });

    await expect(result).resolves.toEqual({});
    const latest = snapshots[snapshots.length - 1];
    expect(authMocks.signOutMock).toHaveBeenCalledTimes(1);
    expect(authMocks.replaceMock).toHaveBeenCalledWith('/');
    expect(latest.user).toBeNull();
    expect(latest.supabaseUser).toBeNull();
    expect(latest.signingOut).toBe(false);
  });

  it('a failed signOut keeps the member, logs, and returns the sentence to show', async () => {
    const snapshots = await renderSignedIn();
    const failure = new Error('network down');
    authMocks.signOutMock.mockResolvedValue({ error: failure });

    let result: { error?: string } = {};
    await act(async () => {
      result = await snapshots[snapshots.length - 1].signOut();
    });

    expect(result).toEqual({ error: "Couldn't log you out. Please try again." });
    const latest = snapshots[snapshots.length - 1];
    expect(latest.user?.id).toBe('user-2');
    expect(latest.signingOut).toBe(false);
    expect(authMocks.replaceMock).not.toHaveBeenCalled();
    expect(authMocks.logClientEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth_sign_out_failed', error: failure })
    );
  });

  it('a signOut that throws is handled the same way', async () => {
    const snapshots = await renderSignedIn();
    authMocks.signOutMock.mockRejectedValue(new Error('offline'));

    let result: { error?: string } = {};
    await act(async () => {
      result = await snapshots[snapshots.length - 1].signOut();
    });

    expect(result.error).toBe("Couldn't log you out. Please try again.");
    expect(snapshots[snapshots.length - 1].user?.id).toBe('user-2');
    expect(authMocks.logClientEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth_sign_out_failed' })
    );
  });

  it('refreshUser resolves with the profile it loaded, or null when it loaded none', async () => {
    const snapshots: Array<React.ContextType<typeof AuthContext>> = [];
    render(
      <AuthProvider>
        <ContextProbe onSnapshot={(v) => snapshots.push(v)} />
      </AuthProvider>
    );
    await waitFor(() => expect(snapshots[snapshots.length - 1].loading).toBe(false));

    authMocks.getUserMock.mockResolvedValue({ data: { user: { id: 'user-3' } } });
    authMocks.getMyProfileMock.mockResolvedValue({ data: { id: 'user-3' } });
    await expect(snapshots[snapshots.length - 1].refreshUser()).resolves.toEqual({ id: 'user-3' });

    authMocks.getMyProfileMock.mockResolvedValue({ data: undefined, error: new Error('read failed') });
    await expect(snapshots[snapshots.length - 1].refreshUser()).resolves.toBeNull();

    authMocks.getUserMock.mockResolvedValue({ data: { user: null } });
    await expect(snapshots[snapshots.length - 1].refreshUser()).resolves.toBeNull();
  });

  it('refreshUser never rejects: a getUser that throws resolves null', async () => {
    // Login, onboarding and the callback await it on their success paths; a
    // rejection there would leave a busy button or a page stuck.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const snapshots: Array<React.ContextType<typeof AuthContext>> = [];
    render(
      <AuthProvider>
        <ContextProbe onSnapshot={(v) => snapshots.push(v)} />
      </AuthProvider>
    );
    await waitFor(() => expect(snapshots[snapshots.length - 1].loading).toBe(false));

    authMocks.getUserMock.mockRejectedValue(new Error('network down'));
    await expect(snapshots[snapshots.length - 1].refreshUser()).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
