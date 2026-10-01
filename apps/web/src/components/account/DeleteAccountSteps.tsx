import React, { type FormEvent } from 'react';
import Link from 'next/link';
import { Alert, Button, Divider, List, PasswordInput, Stack, Text } from '@mantine/core';
import { SUPPORT_EMAIL, formatDeletionDate } from '@nepally/shared';
import { AuthCard } from '../auth/AuthCard';
import { GoogleButton } from '../auth/GoogleButton';
import { busyButtonProps } from '../ui';

function ErrorAlert({ message }: { message: string }) {
  if (!message) return null;
  return (
    <Alert color="red" variant="light">
      {message}
    </Alert>
  );
}

/** Says which account is about to go, so a Google chooser slip can't go unnoticed. */
function SignedInAs({ email }: { email?: string }) {
  if (!email) return null;
  return <Text fw={500}>{`Signed in as ${email}`}</Text>;
}

export function WrongAccountStep() {
  return (
    <AuthCard title="You signed in as a different account" description="Signing that account out…">
      <Text>Nothing was deleted.</Text>
    </AuthCard>
  );
}

interface ExplainStepProps {
  email?: string;
  scheduledDate: string;
  busy: boolean;
  onContinue: () => void;
}

export function ExplainStep({ email, scheduledDate, busy, onContinue }: ExplainStepProps) {
  return (
    <AuthCard
      title="Delete your account"
      description="Read this first. After the grace period it can't be undone."
    >
      <Stack gap="sm">
        <SignedInAs email={email} />
        <Text>Deleting your account removes:</Text>
        <List>
          <List.Item>your profile and photos</List.Item>
          <List.Item>your posts and comments</List.Item>
          <List.Item>
            the messages you sent (messages other members sent you stay in their chats)
          </List.Item>
          <List.Item>your listings and events (active promotions end with the listings)</List.Item>
        </List>
        <Text>
          Your account is hidden from other members right away and deleted on{' '}
          {formatDeletionDate(scheduledDate)}. Sign in before then to restore it.
        </Text>
        <Button onClick={onContinue} {...busyButtonProps(busy, busy)}>
          Continue
        </Button>
        <Button variant="default" component={Link} href="/profile">
          Cancel
        </Button>
      </Stack>
    </AuthCard>
  );
}

interface PasswordConfirmStepProps {
  notice: string;
  error: string;
  password: string;
  busy: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  /** Set when the account has Google too, which can stand in for a forgotten password. */
  onGoogle?: () => void;
}

export function PasswordConfirmStep({
  notice,
  error,
  password,
  busy,
  onPasswordChange,
  onSubmit,
  onGoogle,
}: PasswordConfirmStepProps) {
  return (
    <AuthCard title="Confirm it's you" description={notice || 'Enter your password to continue.'}>
      <ErrorAlert message={error} />
      <form noValidate onSubmit={onSubmit}>
        <Stack gap="sm">
          <PasswordInput
            label="Password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="current-password"
            visibilityToggleButtonProps={{ 'aria-label': 'Toggle password visibility' }}
          />
          <Button type="submit" {...busyButtonProps(busy, busy)}>
            Confirm
          </Button>
        </Stack>
      </form>
      {onGoogle ? (
        <>
          <Divider label="or" labelPosition="center" />
          <GoogleButton onClick={onGoogle} busy={busy} />
        </>
      ) : null}
      <Text size="sm">
        Forgot your password? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from
        your account&apos;s email address and we&apos;ll delete it for you.
      </Text>
    </AuthCard>
  );
}

interface GoogleConfirmStepProps {
  notice: string;
  error: string;
  busy: boolean;
  onGoogle: () => void;
}

export function GoogleConfirmStep({ notice, error, busy, onGoogle }: GoogleConfirmStepProps) {
  return (
    <AuthCard
      title="Confirm it's you"
      description={notice || 'Sign in with Google again to continue.'}
    >
      <ErrorAlert message={error} />
      <GoogleButton onClick={onGoogle} busy={busy} />
    </AuthCard>
  );
}

interface FinalStepProps {
  email?: string;
  scheduledDate: string;
  error: string;
  busy: boolean;
  onDelete: () => void;
}

export function FinalStep({ email, scheduledDate, error, busy, onDelete }: FinalStepProps) {
  return (
    <AuthCard
      title="Delete your account?"
      description={`Your account will be hidden now and deleted on ${formatDeletionDate(scheduledDate)}.`}
    >
      <Stack gap="sm">
        <SignedInAs email={email} />
        <ErrorAlert message={error} />
        <Button color="red" onClick={onDelete} {...busyButtonProps(busy, busy)}>
          Delete my account
        </Button>
        <Button variant="default" component={Link} href="/profile">
          Cancel
        </Button>
      </Stack>
    </AuthCard>
  );
}
