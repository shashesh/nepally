import React, { useState, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, List, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { validateEmail, validatePassword, validateFullName } from '@nusa/shared';
import { signUpWithEmail } from '../lib/auth';
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
      setError(result.error.message);
    } else {
      // No session yet — email confirmation is required.
      // Profile creation happens in /auth/callback after the user clicks the link.
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
