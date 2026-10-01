import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  REAUTH_REQUIRED,
  formatDeletionDate,
  getAccountDeletionErrorCode,
  getAuthErrorMessage,
  getDeleteAccountFailureMessage,
  getReauthMethod,
  getReauthPasswordErrorMessage,
  getScheduledDeletionDate,
  hasGoogleIdentity,
  isRecentSignIn,
  logClientEvent,
  requestAccountDeletion,
} from '@nepally/shared';
import type { ReauthMethod } from '@nepally/shared';
import { supabase } from '../config/supabase';
import { isGoogleSignInCancelled, signInWithGoogle } from '../services/auth/googleAuth';
import { useAuth } from './useAuth';

export type DeleteAccountStep = 'explain' | 'confirm' | 'final';

const ENTER_PASSWORD = 'Enter your password.';
const WRONG_ACCOUNT_TITLE = 'You signed in as a different account';
const WRONG_ACCOUNT_MESSAGE = 'Nothing was deleted. Sign in again as yourself.';
const PLATFORM = { platform: 'mobile' } as const;

export interface DeleteAccountFlowState {
  step: DeleteAccountStep;
  /** The account being deleted, named on the explain and final steps. */
  email: string;
  reauthMethod: ReauthMethod;
  /** A password account that also has Google, which can stand in for a forgotten password. */
  offersGoogle: boolean;
  scheduledDate: string;
  notice: string;
  error: string;
  password: string;
  setPassword: (value: string) => void;
  busy: boolean;
  handleContinue: () => Promise<void>;
  handlePassword: () => Promise<void>;
  handleGoogle: () => Promise<void>;
  handleDelete: () => Promise<void>;
}

/** State and handlers for the account deletion flow (spec §5.2 and §5.4). */
export function useDeleteAccountFlow(): DeleteAccountFlowState {
  const { user, supabaseUser, signOut, pauseAuthListener, resumeAuthListener } = useAuth();
  const [step, setStep] = useState<DeleteAccountStep>('explain');
  // Read the clock once, not on every render.
  const [scheduledDate] = useState(() => getScheduledDeletionDate());
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const email = supabaseUser?.email ?? user?.email ?? '';
  const reauthMethod: ReauthMethod = supabaseUser ? getReauthMethod(supabaseUser) : 'password';
  const offersGoogle =
    reauthMethod === 'password' && supabaseUser !== null && hasGoogleIdentity(supabaseUser);

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
        context: PLATFORM,
        error: sessionError,
      });
    }
    if (!mountedRef.current) return;
    setBusy(false);
    setNotice('');
    setStep(isRecent ? 'final' : 'confirm');
  }

  async function handlePassword() {
    if (busy) return;
    if (!password) {
      setError(ENTER_PASSWORD);
      return;
    }
    setBusy(true);
    setError('');
    // Paused as ChangePasswordScreen does, so the fresh sign-in doesn't
    // reload the auth state under this screen.
    pauseAuthListener();
    let signInError: unknown;
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      signInError = authError;
    } catch (thrown) {
      signInError = thrown;
    } finally {
      resumeAuthListener();
    }
    if (!mountedRef.current) return;
    setBusy(false);
    if (signInError) {
      logClientEvent({
        event: 'account_delete_reauth_failed',
        context: { ...PLATFORM, method: 'password' },
        error: signInError,
      });
      setError(getReauthPasswordErrorMessage(signInError));
      return;
    }
    setPassword('');
    setNotice('');
    setStep('final');
  }

  async function handleGoogle() {
    const expectedUserId = supabaseUser?.id;
    if (busy || !expectedUserId) return;
    setBusy(true);
    setError('');
    // googleAuth exchanges the code straight into the live session, so keep
    // the listener from loading whichever account comes back.
    pauseAuthListener();
    let googleError: Error | undefined;
    let sessionUserId: string | null = null;
    try {
      ({ error: googleError } = await signInWithGoogle({ selectAccount: true }));
      const {
        data: { session },
      } = await supabase.auth.getSession();
      sessionUserId = session?.user.id ?? null;
    } catch (thrown) {
      googleError = thrown instanceof Error ? thrown : new Error('Google sign-in failed');
    } finally {
      resumeAuthListener();
    }

    if (sessionUserId !== expectedUserId) {
      // Another account, or none we can read, now holds this device's
      // session, and the RPC would delete whichever account the JWT names.
      // Sign it out of this device only, delete nothing, and the member signs
      // in again. Signing out replaces the whole tree, so the alert must show.
      logClientEvent({
        event: 'account_delete_reauth_failed',
        context: { ...PLATFORM, method: 'google', reason: 'wrong_account' },
      });
      await signOut({ scope: 'local' });
      Alert.alert(WRONG_ACCOUNT_TITLE, WRONG_ACCOUNT_MESSAGE);
      return;
    }
    if (!mountedRef.current) return;
    setBusy(false);
    if (googleError) {
      if (isGoogleSignInCancelled(googleError)) return;
      logClientEvent({
        event: 'account_delete_reauth_failed',
        context: { ...PLATFORM, method: 'google' },
        error: googleError,
      });
      setError(getAuthErrorMessage(googleError, 'google'));
      return;
    }
    setNotice('');
    setStep('final');
  }

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await requestAccountDeletion(supabase);
    if (result.error || !result.data) {
      if (!mountedRef.current) return;
      setBusy(false);
      if (getAccountDeletionErrorCode(result.error) === REAUTH_REQUIRED) {
        // The RPC's sentence: "Please confirm it's you again."
        setNotice(result.error?.message ?? '');
        setStep('confirm');
        return;
      }
      logClientEvent({ event: 'account_delete_failed', context: PLATFORM, error: result.error });
      setError(getDeleteAccountFailureMessage(result.error));
      return;
    }
    // Scheduled. Sign out every device (the default scope) and clear this
    // one's data. RootNavigator then shows the welcome screen, and the alert
    // gives the date over it.
    const scheduled = result.data;
    await signOut();
    Alert.alert(
      'Account scheduled for deletion',
      `Your account will be deleted on ${formatDeletionDate(scheduled)}. Sign in before then to restore it.`
    );
  }

  return {
    step,
    email,
    reauthMethod,
    offersGoogle,
    scheduledDate,
    notice,
    error,
    password,
    setPassword,
    busy,
    handleContinue,
    handlePassword,
    handleGoogle,
    handleDelete,
  };
}
