import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, List, PasswordInput, Stack, Text } from '@mantine/core';
import {
  PROFILE_NOT_FOUND,
  REAUTH_REQUIRED,
  SUPPORT_EMAIL,
  formatDeletionDate,
  getAccountDeletionErrorCode,
  getAuthErrorMessage,
  getReauthMethod,
  getScheduledDeletionDate,
  isRecentSignIn,
  logClientEvent,
  requestAccountDeletion,
} from '@nepally/shared';
import { supabase } from '../../lib/supabase';
import { signInWithEmail, signInWithGoogle } from '../../lib/auth';
import { useAuth } from '../../hooks/useAuth';
import { AuthCard } from '../auth/AuthCard';
import { GoogleButton } from '../auth/GoogleButton';
import { busyButtonProps, notify } from '../ui';

/** Holds the member's user id across the Google round trip. */
export const REAUTH_USER_KEY = 'nepally.deleteAccount.userId';

const WRONG_PASSWORD = 'That password is incorrect.';
const CONFIRM_AGAIN = "Please confirm it's you again.";

type Step = 'explain' | 'confirm' | 'final' | 'wrong-account';

function readReauthUserId(): string | null {
  try {
    return window.sessionStorage.getItem(REAUTH_USER_KEY);
  } catch {
    return null;
  }
}

/** Back from Google (?step=confirm), the stored id decides where the flow starts. */
function initialStep(returnedFromGoogle: boolean, userId: string): Step {
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

/**
 * Deleting a signed-in member's account (spec §5.2): explain, confirm it's
 * them, delete. /delete-account renders it for any session, so a Google
 * re-auth as a different account, even one with no profile, still lands
 * here and is signed out.
 */
export function DeleteAccountFlow() {
  const router = useRouter();
  const { supabaseUser, signOut, refreshUser } = useAuth();
  const userId = supabaseUser?.id ?? '';
  const returnedFromGoogle = router.query.step === 'confirm';
  const [step, setStep] = useState<Step>(() => initialStep(returnedFromGoogle, userId));
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
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setBusy(false);
    setNotice('');
    setStep(session && isRecentSignIn(session.access_token) ? 'final' : 'confirm');
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
      setError(
        code === PROFILE_NOT_FOUND
          ? `We couldn't delete this account here. Email ${SUPPORT_EMAIL} from your account's email address and we'll delete it for you.`
          : (result.error?.message ?? "Couldn't delete your account. Please try again.")
      );
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

  const errorAlert = error ? (
    <Alert color="red" variant="light">
      {error}
    </Alert>
  ) : null;

  let content: React.ReactNode;
  if (step === 'wrong-account') {
    content = (
      <AuthCard
        title="You signed in as a different account"
        description="Signing that account out…"
      >
        <Text>Nothing was deleted.</Text>
      </AuthCard>
    );
  } else if (step === 'explain') {
    content = (
      <AuthCard
        title="Delete your account"
        description="Read this first. After the grace period it can't be undone."
      >
        <Stack gap="sm">
          <Text>Deleting your account removes:</Text>
          <List>
            <List.Item>your profile and photos</List.Item>
            <List.Item>your posts and comments</List.Item>
            <List.Item>
              the messages you sent (messages other members sent you stay in their chats)
            </List.Item>
            <List.Item>
              your listings and events (active promotions end with the listings)
            </List.Item>
          </List>
          <Text>
            Your account is hidden from other members right away and deleted on{' '}
            {formatDeletionDate(scheduledDate)}. Sign in before then to restore it.
          </Text>
          <Button onClick={() => void handleContinue()} {...busyButtonProps(busy, busy)}>
            Continue
          </Button>
          <Button variant="default" component={Link} href="/profile">
            Cancel
          </Button>
        </Stack>
      </AuthCard>
    );
  } else if (step === 'confirm' && supabaseUser && getReauthMethod(supabaseUser) === 'password') {
    content = (
      <AuthCard title="Confirm it's you" description={notice || 'Enter your password to continue.'}>
        {errorAlert}
        <form noValidate onSubmit={(event) => void handlePassword(event)}>
          <Stack gap="sm">
            <PasswordInput
              label="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              visibilityToggleButtonProps={{ 'aria-label': 'Toggle password visibility' }}
            />
            <Button type="submit" {...busyButtonProps(busy, busy)}>
              Confirm
            </Button>
          </Stack>
        </form>
      </AuthCard>
    );
  } else if (step === 'confirm') {
    content = (
      <AuthCard
        title="Confirm it's you"
        description={notice || 'Sign in with Google again to continue.'}
      >
        {errorAlert}
        <GoogleButton onClick={() => void handleGoogle()} busy={busy} />
      </AuthCard>
    );
  } else {
    content = (
      <AuthCard
        title="Delete your account?"
        description={`Your account will be hidden now and deleted on ${formatDeletionDate(scheduledDate)}.`}
      >
        <Stack gap="sm">
          {errorAlert}
          <Button color="red" onClick={() => void handleDelete()} {...busyButtonProps(busy, busy)}>
            Delete my account
          </Button>
          <Button variant="default" component={Link} href="/profile">
            Cancel
          </Button>
        </Stack>
      </AuthCard>
    );
  }

  return (
    <>
      <Head>
        <title>Delete account - Nepally</title>
      </Head>
      {content}
    </>
  );
}
