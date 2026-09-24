import { useRef, useState, type FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, Divider, Loader, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import {
  fullNameSchema,
  getAuthErrorMessage,
  isExistingAccountError,
  logClientEvent,
  validateEmail,
  validatePassword,
} from '@nepally/shared';
import { signInWithGoogle, signUpWithEmail } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import { useRedirectWhen } from '../hooks/useRedirectWhen';
import { AuthCard } from '../components/auth/AuthCard';
import { GoogleButton } from '../components/auth/GoogleButton';

const PASSWORD_RULE = 'At least 8 characters, with an uppercase letter, a lowercase letter and a number';

interface SignupErrors {
  fullName?: string;
  email?: string;
  /** The unmet password rules. */
  password?: string[];
}

function validateSignup(fullName: string, email: string, password: string): SignupErrors {
  const name = fullNameSchema.safeParse(fullName);
  const passwordResult = validatePassword(password);
  return {
    ...(name.success ? {} : { fullName: name.error.issues[0]?.message }),
    ...(validateEmail(email) ? {} : { email: 'Enter a valid email address.' }),
    ...(passwordResult.isValid ? {} : { password: passwordResult.errors }),
  };
}

export default function SignupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [signingUp, setSigningUp] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const redirecting = useRedirectWhen(!!user, '/feed');
  if (redirecting) return null;

  // Nothing shows before the first submit; after it, errors follow every change.
  const errors = submitted ? validateSignup(fullName, email, password) : {};

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
    if (signingUp) return;
    setSubmitted(true);
    setServerError('');

    const found = validateSignup(fullName, email, password);
    const fields = [
      [found.fullName, nameRef],
      [found.email, emailRef],
      [found.password, passwordRef],
    ] as const;
    const firstInvalid = fields.find(([error]) => error)?.[1];
    if (firstInvalid) {
      firstInvalid.current?.focus();
      return;
    }

    setSigningUp(true);
    const result = await signUpWithEmail(email, password, fullNameSchema.parse(fullName));
    if (!result.error) {
      void router.push('/verify-email?email=' + encodeURIComponent(email));
      return;
    }
    if (isExistingAccountError(result.error)) {
      void router.push('/login?reason=existing-account&email=' + encodeURIComponent(email));
      return;
    }
    setSigningUp(false);
    logClientEvent({ event: 'auth_sign_up_failed', context: { platform: 'web' }, error: result.error });
    setServerError(getAuthErrorMessage(result.error, 'sign-up'));
  }

  return (
    <>
      <Head>
        <title>Sign up - Nepally</title>
      </Head>
      <AuthCard
        title="Join Nepally"
        description="Create your account to connect with the community"
        footer={
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        }
      >
        {serverError && (
          <Alert color="red" variant="light">
            {serverError}
          </Alert>
        )}

        <GoogleButton onClick={handleGoogle} busy={googleBusy} />

        <Divider label="or sign up with email" labelPosition="center" />

        <form noValidate onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              ref={nameRef}
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
              error={errors.fullName}
            />

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
              description={PASSWORD_RULE}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              autoComplete="new-password"
              // One unmet rule per line. Mantine's error is a <p>, which can't hold a <ul>.
              error={errors.password?.map((rule) => (
                <Text key={rule} component="span" display="block" inherit>
                  {rule}
                </Text>
              ))}
              // Mantine's PasswordInput links the error but doesn't set aria-invalid.
              aria-invalid={errors.password ? true : undefined}
              visibilityToggleButtonProps={{ 'aria-label': 'Toggle password visibility' }}
            />

            <Button
              type="submit"
              fullWidth
              mt="xs"
              aria-disabled={signingUp || undefined}
              data-disabled={signingUp || undefined}
              aria-busy={signingUp || undefined}
              leftSection={
                signingUp ? <Loader size={16} color="currentColor" aria-hidden="true" /> : undefined
              }
            >
              Create account
            </Button>
          </Stack>
        </form>

        <Text size="sm" c="dimmed" ta="center">
          By creating an account you agree to the <Link href="/terms">Terms of Service</Link> and{' '}
          <Link href="/privacy">Privacy Policy</Link>.
        </Text>
      </AuthCard>
    </>
  );
}
