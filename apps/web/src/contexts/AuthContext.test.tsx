import React, { useContext } from 'react';
import { render, waitFor } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  getUserMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signOutMock: vi.fn(),
  getUserByIdMock: vi.fn(),
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

import { AuthContext, AuthProvider } from './AuthContext';

function ContextProbe({ onSnapshot }: { onSnapshot: (value: React.ContextType<typeof AuthContext>) => void }) {
  const value = useContext(AuthContext);
  onSnapshot(value);
  return null;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getSessionMock.mockResolvedValue({ data: { session: null } });
    authMocks.getUserMock.mockResolvedValue({ data: { user: null } });
    authMocks.getUserByIdMock.mockResolvedValue({ data: undefined });
    authMocks.onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe: authMocks.unsubscribeMock } },
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
