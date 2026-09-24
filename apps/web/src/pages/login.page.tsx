import { useRef, useState, type FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, Divider, Loader, PasswordInput, Stack, TextInput } from '@mantine/core';
import { getAuthErrorMessage, logClientEvent, validateEmail } from '@nepally/shared';
import { signInWithEmail, signInWithGoogle } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import { useRedirectWhen } from '../hooks/useRedirectWhen';
import { AuthCard } from '../components/auth/AuthCard';
import { GoogleButton } from '../components/auth/GoogleButton';

const EXISTING_ACCOUNT_INFO =
  'An account with this email already exists. If you signed up with Google, use the Google button below to sign in.';

interface LoginErrors {
  email?: string;
  password?: string;
}

function validateLogin(email: string, password: string): LoginErrors {
  return {
    ...(validateEmail(email) ? {} : { email: 'Enter a valid email address.' }),
    ...(password ? {} : { password: 'Enter your password.' }),
  };
}

export default function LoginPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  // Pages Router: `router.query` is empty until `router.isReady`.
  const queryEmail =
    router.isReady && typeof router.query.email === 'string' ? router.query.email : '';
  const info =
    router.isReady && router.query.reason === 'existing-account' ? EXISTING_ACCOUNT_INFO : '';
  const [email, setEmail] = useState(queryEmail);
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Pre-fill the email field from ?email= once the query is available (or when it
  // changes) — adjusted during render rather than synced in an effect.
  const [prefilledEmail, setPrefilledEmail] = useState(queryEmail);
  if (queryEmail !== prefilledEmail) {
    setPrefilledEmail(queryEmail);
    if (queryEmail) setEmail(queryEmail);
  }

  const redirecting = useRedirectWhen(!!user, '/feed');
  if (redirecting) return null;

  // Nothing shows before the first submit; after it, errors follow every change.
  const errors = submitted ? validateLogin(email, password) : {};

  async function handleGoogle() {
    setServerError('');
    setGoogleBusy(true);
    const result = await signInWithGoogle();
    // On success the browser is already navigating to Google, so stay busy.
    if (result.error) {
      setGoogleBusy(false);
      logClientEvent({ event: 'auth_google_failed', context: { platform: 'web' }, error: result.error });
      setServerError(getAuthErrorMessage(result.error, 'google'));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (signingIn) return;
    setSubmitted(true);
    setServerError('');

    const found = validateLogin(email, password);
    if (found.email) {
      emailRef.current?.focus();
      return;
    }
    if (found.password) {
      passwordRef.current?.focus();
      return;
    }

    setSigningIn(true);
    const result = await signInWithEmail(email, password);
    if (result.error) {
      setSigningIn(false);
      logClientEvent({ event: 'auth_log_in_failed', context: { platform: 'web' }, error: result.error });
      setServerError(getAuthErrorMessage(result.error, 'log-in'));
      return;
    }
    await refreshUser();
    void router.push('/feed');
  }

  return (
    <>
      <Head>
        <title>Log in - Nepally</title>
      </Head>
      <AuthCard
        title="Welcome back"
        description="Log in to your Nepally account"
        footer={
          <>
            Don&apos;t have an account? <Link href="/signup">Sign up</Link>
          </>
        }
      >
        {info && (
          <Alert color="blue" variant="light">
            {info}
          </Alert>
        )}

        {serverError && (
          <Alert color="red" variant="light">
            {serverError}
          </Alert>
        )}

        <GoogleButton onClick={handleGoogle} busy={googleBusy} />

        <Divider label="or log in with email" labelPosition="center" />

        <form noValidate onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              ref={emailRef}
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email}
            />

            <PasswordInput
              ref={passwordRef}
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              error={errors.password}
              // Mantine's PasswordInput links the error but doesn't set aria-invalid.
              aria-invalid={errors.password ? true : undefined}
              visibilityToggleButtonProps={{ 'aria-label': 'Toggle password visibility' }}
            />

            <Button
              type="submit"
              fullWidth
              mt="xs"
              aria-disabled={signingIn || undefined}
              data-disabled={signingIn || undefined}
              aria-busy={signingIn || undefined}
              leftSection={
                signingIn ? <Loader size={16} color="currentColor" aria-hidden="true" /> : undefined
              }
            >
              Log in
            </Button>
          </Stack>
        </form>
      </AuthCard>
    </>
  );
}
