import React, { useState, FormEvent, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, Stack, TextInput } from '@mantine/core';
import { isValidPhoneNumber, validateFullName, createUserProfile, markPhoneVerified, getUserById } from '@nusa/shared';
import { sendPhoneOTP, verifyPhoneOTP } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import styles from '../../styles/Auth.module.css';

const RESEND_COOLDOWN_SECONDS = 60;

type Step = 'phone-entry' | 'otp-verify';

function formatPhoneForSupabase(raw: string): string {
  const cleaned = raw.replace(/\D/g, '');
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned[0] === '1') return `+${cleaned}`;
  return `+${cleaned}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return `***-***-${digits.slice(-4)}`;
}

export default function PhoneAuthPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState<Step>('phone-entry');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // Redirect if already logged in
  if (user) {
    router.replace('/feed');
    return null;
  }

  function startCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOTP(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!validateFullName(fullName)) {
      setError('Please enter your full name (at least 2 characters, letters only).');
      return;
    }
    if (!isValidPhoneNumber(phone)) {
      setError('Enter a valid US phone number (10 digits).');
      return;
    }

    setLoading(true);
    const formatted = formatPhoneForSupabase(phone);
    const result = await sendPhoneOTP(formatted);
    setLoading(false);

    if (!result.success) {
      setError(result.error?.message ?? 'Failed to send verification code.');
      return;
    }

    setFormattedPhone(formatted);
    startCooldown();
    setStep('otp-verify');
  }

  async function handleVerifyOTP(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyPhoneOTP(formattedPhone, otp);
      if (!result.success) {
        throw result.error ?? new Error('Verification failed');
      }

      // Get the authenticated user
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) throw userError ?? new Error('No user session');

      // Create profile (handle already-exists gracefully)
      const { error: profileError } = await createUserProfile(
        supabase,
        authUser.id,
        authUser.email ?? '',
        fullName.trim()
      );
      if (profileError && !profileError.message.includes('duplicate')) {
        throw profileError;
      }

      // Mark phone verified → trust level 0 → 1
      await markPhoneVerified(supabase, authUser.id);
      await refreshUser();

      // Route based on onboarding state
      const { data: profile } = await getUserById(supabase, authUser.id);
      if (profile?.metro_area_id) {
        router.push('/feed');
      } else {
        router.push('/onboarding/zip');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      if (message.toLowerCase().includes('expired')) {
        setError('Code expired. Please request a new one.');
      } else if (message.toLowerCase().includes('invalid')) {
        setError('Invalid code. Please check and try again.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError('');
    const result = await sendPhoneOTP(formattedPhone);
    if (!result.success) {
      setError(result.error?.message ?? 'Failed to resend code.');
    } else {
      startCooldown();
    }
  }

  if (step === 'otp-verify') {
    return (
      <>
        <Head>
          <title>Verify Phone - NUSA</title>
        </Head>
        <div className={styles.authPage}>
          <div className={styles.authCard}>
            <button
              type="button"
              className={styles.backLink}
              onClick={() => { setStep('phone-entry'); setOtp(''); setError(''); }}
            >
              ← Back
            </button>

            <h1 className={styles.authTitle}>Verify Your Phone</h1>
            <p className={styles.authSubtitle}>
              Enter the 6-digit code sent to {maskPhone(formattedPhone)}
            </p>

            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}

            <form onSubmit={handleVerifyOTP}>
              <Stack gap="sm">
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.otpInput}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="one-time-code"
                  aria-label="Verification code"
                />

                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                >
                  Verify
                </Button>
              </Stack>
            </form>

            <div className={styles.resendRow}>
              <span>Didn&apos;t get it?</span>
              <button
                type="button"
                className={styles.resendBtn}
                onClick={handleResend}
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Phone Signup - NUSA</title>
      </Head>
      <div className={styles.authPage}>
        <div className={styles.authCard}>
          <button
            type="button"
            className={styles.backLink}
            onClick={() => router.push('/signup')}
          >
            ← Back to signup options
          </button>

          <h1 className={styles.authTitle}>Phone Signup</h1>
          <p className={styles.authSubtitle}>
            We&apos;ll send a verification code to your phone
          </p>

          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSendOTP}>
            <Stack gap="sm">
              <TextInput
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />

              <TextInput
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                placeholder="(555) 123-4567"
                leftSection="+1"
                inputMode="tel"
                maxLength={10}
                autoComplete="tel-national"
              />

              <Button
                type="submit"
                fullWidth
                loading={loading}
                mt="xs"
              >
                Send Verification Code
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
