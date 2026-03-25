import React, { useState, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, List, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { validateEmail, validatePassword, validateFullName } from '@nusa/shared';
import { signUpWithEmail, signInWithGoogle } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import styles from '../styles/Auth.module.css';

export default function SignupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect if already logged in
  if (user) {
    router.replace('/feed');
    return null;
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (value) {
      const result = validatePassword(value);
      setPasswordErrors(result.errors);
    } else {
      setPasswordErrors([]);
    }
  }

  async function handleGoogleSignup() {
    setError('');
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    // If we get here, it means the redirect failed
    setGoogleLoading(false);
    if (result.error) {
      setError(result.error.message);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!validateFullName(fullName)) {
      setError('Please enter your full name (at least 2 characters, letters only).');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    const pwResult = validatePassword(password);
    if (!pwResult.isValid) {
      setError('Please fix password issues before continuing.');
      return;
    }

    setLoading(true);
    const result = await signUpWithEmail(email, password, fullName);
    setLoading(false);

    if (result.error) {
      const msg = result.error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already registered')) {
        router.push('/login?reason=existing-account&email=' + encodeURIComponent(email));
        return;
      }
      setError(result.error.message);
    } else {
      router.push('/verify-email?email=' + encodeURIComponent(email));
    }
  }

  return (
    <>
      <Head>
        <title>Sign Up - NUSA</title>
      </Head>
      <div className={styles.authPage}>
        <div className={styles.authCard}>
          <h1 className={styles.authTitle}>Join NUSA</h1>
          <p className={styles.authSubtitle}>
            Create your account to connect with the community
          </p>

          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          <div className={styles.methodGroup}>
            <button
              type="button"
              className={styles.methodButton}
              onClick={handleGoogleSignup}
              disabled={googleLoading}
            >
              <span className={styles.methodIcon}>🔵</span>
              <span className={styles.methodLabel}>
                {googleLoading ? 'Redirecting...' : 'Continue with Google'}
              </span>
            </button>

            <button
              type="button"
              className={styles.methodButton}
              onClick={() => router.push('/auth/phone')}
            >
              <span className={styles.methodIcon}>📱</span>
              <span className={styles.methodLabel}>Continue with Phone</span>
            </button>
          </div>

          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerLabel}>or sign up with email</span>
            <span className={styles.dividerLine} />
          </div>

          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />

              <TextInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />

              <div>
                <PasswordInput
                  label="Password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  error={passwordErrors.length > 0}
                  visibilityToggleButtonProps={{ 'aria-label': 'Toggle password visibility' }}
                />
                {passwordErrors.length > 0 && (
                  <List size="xs" mt={4}>
                    {passwordErrors.map((err) => (
                      <List.Item key={err}>
                        <Text size="xs" c="red">{err}</Text>
                      </List.Item>
                    ))}
                  </List>
                )}
              </div>

              <Button
                type="submit"
                fullWidth
                loading={loading}
                mt="xs"
              >
                Create Account
              </Button>
            </Stack>
          </form>

          <p className={styles.switchText}>
            Already have an account?{' '}
            <Link href="/login" className={styles.switchLink}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
