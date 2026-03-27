import React, { useState, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, PasswordInput, Stack, TextInput } from '@mantine/core';
import { validateEmail } from '@nepally/shared';
import { signInWithEmail, signInWithGoogle } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import styles from '../styles/Auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Sync email and info from query params once router is ready
  React.useEffect(() => {
    if (!router.isReady) return;
    if (router.query.email) {
      setEmail(router.query.email as string);
    }
    if (router.query.reason === 'existing-account') {
      setInfo('An account with this email already exists. If you signed up with Google, use the Google button below to sign in.');
    }
  }, [router.isReady, router.query.email, router.query.reason]);

  // Redirect if already logged in
  if (user) {
    router.replace('/feed');
    return null;
  }

  async function handleGoogleSignIn() {
    setError('');
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (result.error) {
      setError(result.error.message);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    const result = await signInWithEmail(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      await refreshUser();
      router.push('/feed');
    }
  }

  return (
    <>
      <Head>
        <title>Log In - Nepally</title>
      </Head>
      <div className={styles.authPage}>
        <div className={styles.authCard}>
          <h1 className={styles.authTitle}>Welcome Back</h1>
          <p className={styles.authSubtitle}>
            Sign in to your Nepally account
          </p>

          {info && (
            <Alert color="blue" variant="light">
              {info}
            </Alert>
          )}

          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          <div className={styles.methodGroup}>
            <button
              type="button"
              className={styles.methodButton}
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              <span className={styles.methodIcon}>🔵</span>
              <span className={styles.methodLabel}>
                {googleLoading ? 'Redirecting...' : 'Continue with Google'}
              </span>
            </button>

          </div>

          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerLabel}>or sign in with email</span>
            <span className={styles.dividerLine} />
          </div>

          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />

              <PasswordInput
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                visibilityToggleButtonProps={{ 'aria-label': 'Toggle password visibility' }}
              />

              <Button
                type="submit"
                fullWidth
                loading={loading}
                mt="xs"
              >
                Sign In
              </Button>
            </Stack>
          </form>

          <p className={styles.switchText}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className={styles.switchLink}>
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
