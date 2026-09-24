import { useState } from 'react';
import { getAuthErrorMessage, logClientEvent } from '@nepally/shared';
import { signInWithGoogle } from '../lib/auth';

/**
 * Starts Google sign-in for log in and sign up. `setError('')` first; on
 * failure logs auth_google_failed and sets the mapped sentence. On success
 * `busy` stays true: the browser is already leaving for Google.
 */
export function useGoogleSignIn(setError: (message: string) => void): { busy: boolean; start: () => Promise<void> } {
  const [busy, setBusy] = useState(false);

  async function start(): Promise<void> {
    setError('');
    setBusy(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setBusy(false);
      logClientEvent({ event: 'auth_google_failed', context: { platform: 'web' }, error: result.error });
      setError(getAuthErrorMessage(result.error, 'google'));
    }
  }

  return { busy, start };
}
