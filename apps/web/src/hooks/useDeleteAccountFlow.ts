import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import {
  PROFILE_NOT_FOUND,
  REAUTH_REQUIRED,
  SUPPORT_EMAIL,
  formatDeletionDate,
  getAccountDeletionErrorCode,
  getAuthErrorMessage,
  getScheduledDeletionDate,
  isRecentSignIn,
  logClientEvent,
  requestAccountDeletion,
} from '@nepally/shared';
import { supabase } from '../lib/supabase';
import { signInWithEmail, signInWithGoogle } from '../lib/auth';
import { notify } from '../components/ui/notify';
import { useAuth } from './useAuth';

/** Holds the member's user id across the Google round trip. */
export const REAUTH_USER_KEY = 'nepally.deleteAccount.userId';

const WRONG_PASSWORD = 'That password is incorrect.';
const CONFIRM_AGAIN = "Please confirm it's you again.";

export type DeleteAccountStep = 'explain' | 'confirm' | 'final' | 'wrong-account';

export interface DeleteAccountFlowState {
  step: DeleteAccountStep;
  scheduledDate: string;
  notice: string;
  error: string;
  password: string;
  setPassword: (value: string) => void;
  busy: boolean;
  supabaseUser: User | null;
  handleContinue: () => Promise<void>;
  handlePassword: (event: FormEvent) => Promise<void>;
  handleGoogle: () => Promise<void>;
  handleDelete: () => Promise<void>;
}

function readReauthUserId(): string | null {
  try {
    return window.sessionStorage.getItem(REAUTH_USER_KEY);
  } catch {
    return null;
  }
}

/** Back from Google (?step=confirm), the stored id decides where the flow starts. */
function initialStep(returnedFromGoogle: boolean, userId: string): DeleteAccountStep {
  if (!returnedFromGoogle) return 'explain';
  const expected = readReauthUserId();
  if (expected === null) return 'explain';
  return expected === userId ? 'final' : 'wrong-account';
}

function passwordErrorMessage(error: Error): string {
  return (error as { code?: unknown }).code === 'invalid_credentials'
    ? WRONG_PASSWORD
    : getAuthErrorMessage(error, 'log-in');
}

function deleteFailureMessage(code: unknown, error: Error | null | undefined): string {
  if (code === PROFILE_NOT_FOUND) {
    return `We couldn't delete this account here. Email ${SUPPORT_EMAIL} from your account's email address and we'll delete it for you.`;
  }
  return error?.message ?? "Couldn't delete your account. Please try again.";
}

/** State and handlers for the account deletion flow (spec §5.2). */
export function useDeleteAccountFlow(): DeleteAccountFlowState {
  const router = useRouter();
  const { supabaseUser, signOut, refreshUser } = useAuth();
  const userId = supabaseUser?.id ?? '';
  const returnedFromGoogle = router.query.step === 'confirm';
  const [step, setStep] = useState<DeleteAccountStep>(() =>
    initialStep(returnedFromGoogle, userId)
  );
  // Read the clock once, not on every render.
  const [scheduledDate] = useState(() => getScheduledDeletionDate());
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const handledReturnRef = useRef(false);

  // The Google round trip is over: forget the stored id. A different account
  // is signed out of this browser, and nothing is deleted.
  useEffect(() => {
    if (!returnedFromGoogle || handledReturnRef.current) return;
    handledReturnRef.current = true;
    try {
      window.sessionStorage.removeItem(REAUTH_USER_KEY);
    } catch {
      // Storage blocked: nothing to forget.
    }
    if (step === 'wrong-account') {
      void supabase.auth.signOut({ scope: 'local' }).finally(() => {
        void router.replace('/delete-account?reauth=wrong-account');
      });
    }
  }, [returnedFromGoogle, step, router]);

  async function handleContinue() {
    if (busy) return;
    setBusy(true);
    let isRecent = false;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      isRecent = Boolean(session && isRecentSignIn(session.access_token));
    } catch (sessionError) {
      // Confirming again is the safe side: the server re-checks re-auth anyway.
      logClientEvent({
        event: 'account_delete_session_read_failed',
        context: { platform: 'web' },
        error: sessionError,
      });
    } finally {
      setBusy(false);
    }
    setNotice('');
    setStep(isRecent ? 'final' : 'confirm');
  }

  async function handlePassword(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await signInWithEmail(supabaseUser?.email ?? '', password);
    setBusy(false);
    if (result.error) {
      logClientEvent({
        event: 'account_delete_reauth_failed',
        context: { platform: 'web', method: 'password' },
        error: result.error,
      });
      setError(passwordErrorMessage(result.error));
      return;
    }
    setPassword('');
    setNotice('');
    setStep('final');
  }

  async function handleGoogle() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      window.sessionStorage.setItem(REAUTH_USER_KEY, userId);
    } catch {
      // Without storage, the return from Google starts over at Explain.
    }
    const result = await signInWithGoogle({
      redirectTo: `${window.location.origin}/delete-account?step=confirm`,
      selectAccount: true,
    });
    if (result.error) {
      setBusy(false);
      logClientEvent({
        event: 'account_delete_reauth_failed',
        context: { platform: 'web', method: 'google' },
        error: result.error,
      });
      setError(getAuthErrorMessage(result.error, 'google'));
    }
  }

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await requestAccountDeletion(supabase);
    if (result.error || !result.data) {
      setBusy(false);
      const code = getAccountDeletionErrorCode(result.error);
      if (code === REAUTH_REQUIRED) {
        setNotice(CONFIRM_AGAIN);
        setStep('confirm');
        return;
      }
      logClientEvent({
        event: 'account_delete_failed',
        context: { platform: 'web' },
        error: result.error,
      });
      setError(deleteFailureMessage(code, result.error));
      return;
    }
    const scheduled = result.data;
    const { error: signOutError } = await signOut({
      redirectTo: `/delete-account?scheduled=${encodeURIComponent(scheduled)}`,
    });
    if (signOutError) {
      // Layout unmounted this flow while signing out, so state set here is
      // lost. The toast survives, and the reloaded profile (now with its date)
      // puts the restore screen, with its own sign-out, in the flow's place.
      notify.error(
        `Your account will be deleted on ${formatDeletionDate(scheduled)}, but we couldn't sign you out. Choose "Keep deletion and sign out" to try again.`
      );
      await refreshUser();
    }
  }

  return {
    step,
    scheduledDate,
    notice,
    error,
    password,
    setPassword,
    busy,
    supabaseUser,
    handleContinue,
    handlePassword,
    handleGoogle,
    handleDelete,
  };
}
