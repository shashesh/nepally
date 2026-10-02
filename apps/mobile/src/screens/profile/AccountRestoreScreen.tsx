import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DELETION_IN_PROGRESS,
  RESTORE_ACCOUNT_FAILED,
  cancelAccountDeletion,
  formatDeletionDate,
  getAccountDeletionErrorCode,
  isDeletionDatePassed,
  logClientEvent,
} from '@nepally/shared';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNow } from '../../hooks/useNow';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';

/**
 * Restore went through, but the reloaded profile is missing or still dated,
 * so we can't say it's restored. Reopening the app shows the database's answer.
 */
const RELOAD_FAILED = "We couldn't confirm the restore. Close and reopen the app.";

type Busy = 'restore' | 'sign-out' | null;

/**
 * What a member pending deletion sees in place of the app (RootNavigator's
 * gate, spec §5.5): restore the account, or keep the deletion and sign out.
 * Once the date has passed, restoring is closed (050) and only Sign out is left.
 */
export function AccountRestoreScreen() {
  const { user, refreshUser, signOut } = useAuth();
  const scheduledFor = user?.deletion_scheduled_for ?? null;
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState('');
  const [refused, setRefused] = useState(false);
  // useNow ticks, so a screen left open past the date closes Restore by itself.
  const now = useNow();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (!scheduledFor) return null;
  const beingDeleted = refused || isDeletionDatePassed(scheduledFor, now.getTime());

  async function handleRestore() {
    if (busy) return;
    setBusy('restore');
    setError('');
    const result = await cancelAccountDeletion(supabase);
    if (!mountedRef.current) return;
    if (result.error) {
      setBusy(null);
      if (getAccountDeletionErrorCode(result.error) === DELETION_IN_PROGRESS) {
        setRefused(true);
        return;
      }
      logClientEvent({
        event: 'account_restore_failed',
        context: { platform: 'mobile' },
        error: result.error,
      });
      setError(RESTORE_ACCOUNT_FAILED);
      return;
    }
    const refreshed = await refreshUser();
    // The gate swaps this screen for the app once the profile has no date.
    if (!mountedRef.current) return;
    if (!refreshed || refreshed.deletion_scheduled_for) {
      setBusy(null);
      logClientEvent({ event: 'account_restore_reload_failed', context: { platform: 'mobile' } });
      setError(RELOAD_FAILED);
    }
  }

  async function handleSignOut() {
    if (busy) return;
    setBusy('sign-out');
    setError('');
    // Signing out clears the profile, so the gate shows sign-in in this screen's place.
    await signOut();
    if (mountedRef.current) setBusy(null);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {beingDeleted
            ? 'Your account is being deleted'
            : 'Your account is scheduled for deletion'}
        </Text>
        <Text style={styles.description}>
          {beingDeleted
            ? 'Its deletion date has passed, so it can no longer be restored.'
            : `It will be deleted on ${formatDeletionDate(scheduledFor)}. Restore it to keep using Nepally.`}
        </Text>
        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        {beingDeleted ? (
          <PrimaryButton
            title="Sign out"
            onPress={() => void handleSignOut()}
            loading={busy === 'sign-out'}
            disabled={busy !== null}
          />
        ) : (
          <>
            <PrimaryButton
              title="Restore my account"
              onPress={() => void handleRestore()}
              loading={busy === 'restore'}
              disabled={busy !== null}
            />
            <SecondaryButton
              title="Keep deletion and sign out"
              onPress={() => void handleSignOut()}
              loading={busy === 'sign-out'}
              disabled={busy !== null}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.l,
    gap: spacing.s,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
});
