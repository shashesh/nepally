import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthErrorMessage } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  logClientEvent: vi.fn(),
}));

vi.mock('../lib/auth', () => ({ signInWithGoogle: mocks.signInWithGoogle }));
vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return { ...actual, logClientEvent: mocks.logClientEvent };
});

import { useGoogleSignIn } from './useGoogleSignIn';

describe('useGoogleSignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is idle until started', () => {
    const { result } = renderHook(() => useGoogleSignIn(vi.fn()));
    expect(result.current.busy).toBe(false);
  });

  it('stays busy on success, because the browser is leaving for Google', async () => {
    mocks.signInWithGoogle.mockResolvedValue({});
    const setError = vi.fn();
    const { result } = renderHook(() => useGoogleSignIn(setError));

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.busy).toBe(true);
    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith('');
    expect(mocks.logClientEvent).not.toHaveBeenCalled();
  });

  it('on failure clears the error first, then logs and sets the mapped sentence', async () => {
    const failure = new Error('popup blocked');
    mocks.signInWithGoogle.mockResolvedValue({ error: failure });
    const setError = vi.fn();
    const { result } = renderHook(() => useGoogleSignIn(setError));

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.busy).toBe(false);
    expect(setError.mock.calls).toEqual([[''], [getAuthErrorMessage(failure, 'google')]]);
    expect(mocks.logClientEvent).toHaveBeenCalledWith({
      event: 'auth_google_failed',
      context: { platform: 'web' },
      error: failure,
    });
  });
});
