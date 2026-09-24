import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, Group, Loader, Text } from '@mantine/core';
import { getAuthErrorMessage, logClientEvent } from '@nepally/shared';
import { resendSignupEmail } from '../lib/auth';
import { useCountdown } from '../hooks/useCountdown';
import { AuthCard } from '../components/auth/AuthCard';

const RESEND_COOLDOWN_SECONDS = 60;

type ResendResult = { sent: true } | { sent: false; message: string };

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || local.length <= 2) return email;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const email = typeof router.query.email === 'string' ? router.query.email : '';
  const { remaining, restart } = useCountdown(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ResendResult | null>(null);

  // Busy and cooling down both keep Resend focusable (busy-controls rule).
  const locked = sending || remaining > 0;

  async function handleResend() {
    if (locked || !email) return;
    setSending(true);
    setResult(null);
    const { error } = await resendSignupEmail(email);
    setSending(false);
    if (error) {
      logClientEvent({ event: 'auth_resend_failed', context: { platform: 'web' }, error });
      setResult({ sent: false, message: getAuthErrorMessage(error, 'resend') });
      return;
    }
    setResult({ sent: true });
    restart();
  }

  // Pages Router: the query is empty until isReady, which would render the no-email
  // copy and then pop the resend row in a tick later.
  if (!router.isReady) return null;

  return (
    <>
      <Head>
        <title>Verify your email - Nepally</title>
      </Head>
      <AuthCard
        title="Check your email"
        description={
          <>
            We sent a verification link to{' '}
            {email ? <strong>{maskEmail(email)}</strong> : 'your email address'}. Open it to verify
            your account and continue.
          </>
        }
        // Sign-up answers a taken address exactly like a new one (so it can't
        // reveal who is registered), which also lands such a member here.
        footer={
          <>
            Already have an account? <Link href="/login">Log in</Link>. If you signed up with Google, use
            Continue with Google there.
          </>
        }
      >
        {email && (
          <Group gap="xs" justify="center">
            <Text size="sm" c="dimmed">
              Didn&apos;t get it?
            </Text>
            <Button
              variant="subtle"
              size="compact-sm"
              aria-disabled={locked || undefined}
              data-disabled={locked || undefined}
              aria-busy={sending || undefined}
              leftSection={
                sending ? <Loader size={14} color="currentColor" aria-hidden="true" /> : undefined
              }
              onClick={handleResend}
            >
              Resend email
            </Button>
            {remaining > 0 && (
              <Text size="sm" c="dimmed">
                {`You can resend in ${remaining}s`}
              </Text>
            )}
          </Group>
        )}

        {result?.sent && (
          <Alert color="green" variant="light">
            Email sent. Check your inbox.
          </Alert>
        )}
        {result && !result.sent && (
          <Alert color="red" variant="light">
            {result.message}
          </Alert>
        )}
      </AuthCard>
    </>
  );
}
