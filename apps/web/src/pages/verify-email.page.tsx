import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import styles from '../styles/Auth.module.css';

const RESEND_COOLDOWN_SECONDS = 60;

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || local.length <= 2) return email;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const email = typeof router.query.email === 'string' ? router.query.email : '';

  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startCooldown();
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
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

  async function handleResend() {
    if (resendCooldown > 0 || !email) return;

    setResendLoading(true);
    setResendError('');
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setResendSuccess(true);
      startCooldown();
    } catch (err: unknown) {
      setResendError(
        err instanceof Error ? err.message : 'Failed to resend. Please try again.'
      );
    } finally {
      setResendLoading(false);
    }
  }

  const resendLabel = resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email';

  return (
    <>
      <Head>
        <title>Verify Your Email - NUSA</title>
      </Head>
      <div className={styles.authPage}>
        <div className={styles.authCard}>
          <h1 className={styles.authTitle}>Check Your Email</h1>
          <p className={styles.authSubtitle}>
            We sent a verification link to
          </p>
          <span className={styles.emailHighlight}>
            {email ? maskEmail(email) : 'your email address'}
          </span>
          <p className={styles.authSubtitle}>
            Click the link in your email to verify your account and continue.
          </p>

          {resendError && (
            <div className={styles.error}>{resendError}</div>
          )}
          {resendSuccess && (
            <div className={styles.success}>Email resent! Check your inbox.</div>
          )}

          <div className={styles.resendRow}>
            <span>Didn&apos;t get it?</span>
            <button
              type="button"
              className={styles.resendBtn}
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
            >
              {resendLoading ? 'Sending...' : resendLabel}
            </button>
          </div>

          <p className={styles.switchText}>
            Already verified?{' '}
            <Link href="/login" className={styles.switchLink}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
