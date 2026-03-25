import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { createUserProfile, markEmailVerified, markGoogleVerified, getUserById } from '@nusa/shared';
import styles from '../../styles/Auth.module.css';

type CallbackState = 'verifying' | 'error';

const VERIFICATION_TIMEOUT_MS = 10000;

export default function AuthCallbackPage() {
  const router = useRouter();
  const [state, setState] = useState<CallbackState>('verifying');

  useEffect(() => {
    let settled = false;

    async function handleVerifiedSession(session: Session) {
      if (settled) return;
      settled = true;

      const { user } = session;
      const email = user.email ?? '';
      const fullName = (user.user_metadata?.full_name as string | undefined) ?? '';
      const provider = user.app_metadata?.provider;

      // Check if profile already exists (e.g. returning user via magic link)
      const { data: existingProfile } = await getUserById(supabase, user.id);

      if (!existingProfile) {
        await createUserProfile(supabase, user.id, email, fullName);
      }

      // Mark the appropriate verification based on the auth provider
      if (provider === 'google') {
        await markGoogleVerified(supabase, user.id);
      } else {
        await markEmailVerified(supabase, user.id);
      }

      // Route based on onboarding state
      const { data: profile } = await getUserById(supabase, user.id);
      if (profile?.metro_area_id) {
        router.push('/feed');
      } else {
        router.push('/onboarding/zip');
      }
    }

    // detectSessionInUrl: true on the web client means Supabase parses the
    // hash fragment automatically and fires SIGNED_IN when the token is valid.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await handleVerifiedSession(session);
        }
      }
    );

    // Fallback: if no SIGNED_IN fires within the timeout, show an error.
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setState('error');
      }
    }, VERIFICATION_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  if (state === 'error') {
    return (
      <>
        <Head>
          <title>Verification Failed - NUSA</title>
        </Head>
        <div className={styles.authPage}>
          <div className={styles.authCard}>
            <h1 className={styles.authTitle}>Link Expired</h1>
            <p className={styles.authSubtitle}>
              This verification link may have expired or already been used.
            </p>
            <p className={styles.switchText}>
              <Link href="/signup" className={styles.switchLink}>
                Back to Sign Up
              </Link>
              {' or '}
              <Link href="/login" className={styles.switchLink}>
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Verifying Email - NUSA</title>
      </Head>
      <div className={styles.authPage}>
        <div className={styles.authCard}>
          <h1 className={styles.authTitle}>Verifying your email...</h1>
          <p className={styles.authSubtitle}>Please wait a moment.</p>
        </div>
      </div>
    </>
  );
}
