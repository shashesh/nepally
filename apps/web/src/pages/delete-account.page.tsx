import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, Stack, Text } from '@mantine/core';
import { ACCOUNT_DELETION_GRACE_DAYS, SUPPORT_EMAIL, formatDeletionDate } from '@nepally/shared';
import { useAuth } from '../hooks/useAuth';
import { AuthCard } from '../components/auth/AuthCard';
import { DeleteAccountFlow } from '../components/account/DeleteAccountFlow';

const LOGIN_HERE = `/login?redirect=${encodeURIComponent('/delete-account')}`;

function ScheduledCard({ date }: { date: string }) {
  return (
    <AuthCard title="Your account will be deleted" footer={<Link href="/login">Log in</Link>}>
      <Text>{`Your account will be deleted on ${date}. Sign in before then to restore it.`}</Text>
    </AuthCard>
  );
}

function SignedOutCard({ wrongAccount }: { wrongAccount: boolean }) {
  return (
    <AuthCard title="Delete your Nepally account">
      <Stack gap="sm">
        {wrongAccount ? (
          <Alert color="red" variant="light">
            You signed in as a different account. Sign in again as yourself to delete your account.
          </Alert>
        ) : null}
        <Text>
          Sign in, then confirm it&apos;s you. Your account is hidden right away and deleted after{' '}
          {ACCOUNT_DELETION_GRACE_DAYS} days: your profile, posts, comments, the messages you sent,
          listings, events and photos. Sign in before then to restore it.
        </Text>
        <Button component={Link} href={LOGIN_HERE}>
          Sign in to delete your account
        </Button>
        <Text>
          Can&apos;t sign in? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from
          your account&apos;s email address with the subject &quot;Delete my account&quot;.
        </Text>
      </Stack>
    </AuthCard>
  );
}

/**
 * The public account deletion page, and the URL given to the Play Console.
 * With a session it runs the flow. A member pending deletion never gets here:
 * Layout shows them the restore screen.
 */
export default function DeleteAccountPage() {
  const router = useRouter();
  const { supabaseUser } = useAuth();
  if (!router.isReady) return null;

  const scheduledParam = router.query.scheduled;
  const scheduled =
    typeof scheduledParam === 'string' && !Number.isNaN(Date.parse(scheduledParam))
      ? scheduledParam
      : null;

  return (
    <>
      <Head>
        <title>Delete your account - Nepally</title>
      </Head>
      {supabaseUser ? (
        <DeleteAccountFlow />
      ) : scheduled ? (
        <ScheduledCard date={formatDeletionDate(scheduled)} />
      ) : (
        <SignedOutCard wrongAccount={router.query.reauth === 'wrong-account'} />
      )}
    </>
  );
}
