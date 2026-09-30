import React, { useState } from 'react';
import Head from 'next/head';
import { Alert, Button, Stack } from '@mantine/core';
import {
  DELETION_IN_PROGRESS,
  cancelAccountDeletion,
  formatDeletionDate,
  getAccountDeletionErrorCode,
  isDeletionDatePassed,
  logClientEvent,
} from '@nepally/shared';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { AuthCard } from '../auth/AuthCard';
import { busyButtonProps, notify } from '../ui';

/**
 * Restore succeeded, but the reloaded profile is missing or still dated, so we
 * can't say for sure it's restored. Refreshing shows the database's answer.
 */
const RELOAD_FAILED = "We couldn't confirm the restore. Please refresh the page.";

type Busy = 'restore' | 'sign-out' | null;

export interface AccountRestoreScreenProps {
  /** The member's deletion_scheduled_for. */
  scheduledFor: string;
}

/**
 * What a member pending deletion sees in place of every page (Layout's gate,
 * spec §5.5): restore the account, or keep the deletion and sign out. Once
 * the date has passed, restoring is closed (050) and only Sign out is left.
 */
export function AccountRestoreScreen({ scheduledFor }: AccountRestoreScreenProps) {
  const { refreshUser, signOut } = useAuth();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState('');
  const [refused, setRefused] = useState(false);
  // Read the clock once, not on every render.
  const [passedAtOpen] = useState(() => isDeletionDatePassed(scheduledFor));
  const beingDeleted = refused || passedAtOpen;

  async function handleRestore() {
    if (busy) return;
    setBusy('restore');
    setError('');
    const result = await cancelAccountDeletion(supabase);
    if (result.error) {
      setBusy(null);
      if (getAccountDeletionErrorCode(result.error) === DELETION_IN_PROGRESS) {
        setRefused(true);
        return;
      }
      logClientEvent({
        event: 'account_restore_failed',
        context: { platform: 'web' },
        error: result.error,
      });
      setError(result.error.message);
      return;
    }
    const refreshed = await refreshUser();
    // Layout swaps this screen for the page once the profile has no date.
    if (!refreshed || refreshed.deletion_scheduled_for) {
      setBusy(null);
      logClientEvent({
        event: 'account_restore_reload_failed',
        context: { platform: 'web' },
      });
      setError(RELOAD_FAILED);
    }
  }

  async function handleSignOut() {
    if (busy) return;
    setBusy('sign-out');
    setError('');
    // Layout swaps this screen for its loader while signing out, so a failure
    // comes back as a toast, like the menu's Log out.
    const { error: signOutError } = await signOut();
    if (signOutError) {
      setBusy(null);
      notify.error(signOutError);
    }
  }

  return (
    <>
      <Head>
        <title>
          {beingDeleted ? 'Account being deleted - Nepally' : 'Restore your account - Nepally'}
        </title>
      </Head>
      <AuthCard
        title={
          beingDeleted ? 'Your account is being deleted' : 'Your account is scheduled for deletion'
        }
        description={
          beingDeleted
            ? 'Its deletion date has passed, so it can no longer be restored.'
            : `It will be deleted on ${formatDeletionDate(scheduledFor)}. Restore it to keep using Nepally.`
        }
      >
        <Stack gap="sm">
          {error ? (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          ) : null}
          {beingDeleted ? null : (
            <Button
              onClick={() => void handleRestore()}
              {...busyButtonProps(busy !== null, busy === 'restore')}
            >
              Restore my account
            </Button>
          )}
          <Button
            variant={beingDeleted ? 'filled' : 'default'}
            onClick={() => void handleSignOut()}
            {...busyButtonProps(busy !== null, busy === 'sign-out')}
          >
            {beingDeleted ? 'Sign out' : 'Keep deletion and sign out'}
          </Button>
        </Stack>
      </AuthCard>
    </>
  );
}
