import React from 'react';
import { render, screen, fireEvent, act } from '../../test-utils';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

const callbackMocks = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  getSessionMock: vi.fn(),
  finishSignInMock: vi.fn(),
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

vi.mock('../../lib/authCallback', () => ({
  finishSignIn: callbackMocks.finishSignInMock,
}));

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}));

import AuthCallbackPage from './callback.page';

const SESSION = { user: { id: 'user-123', email: 'test@example.com' } } as unknown as Session;

const mockUnsubscribe = vi.fn();
let listener: AuthListener | null = null;

async function fireAuthEvent(event: AuthChangeEvent, session: Session | null = SESSION) {
  await act(async () => {
    listener?.(event, session);
  });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('AuthCallbackPage', () => {
  const mockPush = vi.fn();
  const mockReload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    listener = null;

    callbackMocks.useRouterMock.mockReturnValue({ push: mockPush, reload: mockReload });
    callbackMocks.onAuthStateChangeMock.mockImplementation((cb: AuthListener) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    callbackMocks.getSessionMock.mockResolvedValue({ data: { session: null } });
    callbackMocks.finishSignInMock.mockResolvedValue({ destination: '/feed' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the working state first', () => {
    render(<AuthCallbackPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Signing you in…' })).toBeDefined();
  });

  it('hands the session to finishSignIn and pushes its destination', async () => {
    callbackMocks.finishSignInMock.mockResolvedValue({ destination: '/onboarding/zip' });
    render(<AuthCallbackPage />);
    await fireAuthEvent('SIGNED_IN');
    expect(callbackMocks.finishSignInMock).toHaveBeenCalledWith(expect.anything(), SESSION);
    expect(mockPush).toHaveBeenCalledWith('/onboarding/zip');
  });

  it('runs finishSignIn from getSession when the session already exists', async () => {
    callbackMocks.getSessionMock.mockResolvedValue({ data: { session: SESSION } });
    render(<AuthCallbackPage />);
    await act(async () => {});
    expect(callbackMocks.finishSignInMock).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/feed');
  });

  it('calls finishSignIn once when SIGNED_IN and getSession both deliver a session', async () => {
    callbackMocks.getSessionMock.mockResolvedValue({ data: { session: SESSION } });
    render(<AuthCallbackPage />);
    await fireAuthEvent('SIGNED_IN');
    await act(async () => {});
    expect(callbackMocks.finishSignInMock).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('ignores events that carry no session', async () => {
    render(<AuthCallbackPage />);
    await fireAuthEvent('INITIAL_SESSION', null);
    expect(callbackMocks.finishSignInMock).not.toHaveBeenCalled();
  });

  it('shows the failed state, and Try again reloads the page', async () => {
    callbackMocks.finishSignInMock.mockResolvedValue({
      error: "We couldn't finish setting up your account. Please try again.",
    });
    render(<AuthCallbackPage />);
    await fireAuthEvent('SIGNED_IN');
    expect(
      screen.getByRole('heading', { level: 1, name: "Couldn't finish signing you in" })
    ).toBeDefined();
    expect(screen.getByText("We couldn't finish setting up your account. Please try again.")).toBeDefined();
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mockReload).toHaveBeenCalled();
  });

  it('does not flip to expired while finishSignIn is still running at 10 seconds', async () => {
    callbackMocks.finishSignInMock.mockImplementation(() => new Promise(() => {}));
    render(<AuthCallbackPage />);
    await fireAuthEvent('SIGNED_IN');
    advance(11_000);
    expect(screen.getByRole('heading', { level: 1, name: 'Signing you in…' })).toBeDefined();
    expect(screen.queryByText('Link expired')).toBeNull();
  });

  it('shows the expired state with Sign up and Log in links when no session arrives', () => {
    render(<AuthCallbackPage />);
    advance(11_000);
    expect(screen.getByRole('heading', { level: 1, name: 'Link expired' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Sign up' }).getAttribute('href')).toBe('/signup');
    expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login');
  });

  it('unsubscribes and stops the timeout on unmount', () => {
    const { unmount } = render(<AuthCallbackPage />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('drops a result that lands after unmount', async () => {
    let resolve: (value: { destination: '/feed' }) => void = () => {};
    callbackMocks.finishSignInMock.mockImplementation(
      () => new Promise((r) => {
        resolve = r;
      })
    );
    const { unmount } = render(<AuthCallbackPage />);
    await fireAuthEvent('SIGNED_IN');
    unmount();
    await act(async () => {
      resolve({ destination: '/feed' });
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
