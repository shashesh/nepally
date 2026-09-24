import React, { useEffect, useId } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, Loader, Radio, Stack, Switch, Text, Title } from '@mantine/core';
import type { NotifyChatPref, NotifyLikesPref } from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { useUserSettings } from '../../hooks/useUserSettings';
import { ErrorState, LoadingState, PageHeader } from '../../components/ui';
import { notify } from '../../components/ui/notify';
import styles from './notificationPreferences.module.css';

const CHAT_OPTIONS: ReadonlyArray<{ value: NotifyChatPref; label: string }> = [
  { value: 'all', label: 'Every message' },
  { value: 'batched', label: 'Batched, every 30 minutes' },
  { value: 'off', label: 'Off' },
];

const LIKES_OPTIONS: ReadonlyArray<{ value: NotifyLikesPref; label: string }> = [
  { value: 'all', label: 'Every like' },
  { value: 'grouped', label: 'When 5 or more likes arrive' },
  { value: 'off', label: 'Off' },
];

interface PreferenceSwitchProps {
  label: string;
  description: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * A Switch with its description outside the label. Mantine's own
 * `description` renders inside the <label>, which makes it part of the
 * accessible name; here it is announced as a description instead.
 */
function PreferenceSwitch({ label, description, checked, onChange, disabled }: PreferenceSwitchProps) {
  const descriptionId = useId();
  return (
    <div className={styles.switchRow}>
      <Switch
        label={label}
        checked={checked}
        disabled={disabled}
        readOnly={!onChange}
        aria-describedby={descriptionId}
        onChange={onChange ? (event) => onChange(event.currentTarget.checked) : undefined}
      />
      <Text id={descriptionId} className={styles.switchDescription}>
        {description}
      </Text>
    </div>
  );
}

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (!user) return null;
  return <PreferencesView userId={user.id} />;
}

function PreferencesView({ userId }: { userId: string }) {
  const settings = useUserSettings(userId);
  const { values } = settings;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Save stays focusable while it saves (aria-disabled), so presses land here.
    if (settings.saving) return;
    if (await settings.save()) notify.success('Preferences saved.');
    else notify.error("Couldn't save your preferences. Please try again.");
  };

  return (
    <>
      <Head>
        <title>Notification preferences - Nepally</title>
      </Head>
      <div className={styles.page}>
        <PageHeader title="Notification preferences" backHref="/notifications" backLabel="Notifications" />

        {settings.loading ? (
          <LoadingState variant="detail" label="Loading your preferences…" />
        ) : !values ? (
          <ErrorState
            message={settings.error ?? "Couldn't load your notification preferences."}
            onRetry={settings.reload}
          />
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <section className={styles.section} aria-labelledby="delivery-heading">
              <Title order={2} id="delivery-heading" className={styles.sectionTitle}>
                Delivery
              </Title>
              <PreferenceSwitch
                label="Push notifications"
                description="Receive alerts even when the app is closed."
                checked={values.push_notifications}
                onChange={(checked) => settings.setValue('push_notifications', checked)}
              />
            </section>

            <section className={styles.section} aria-labelledby="types-heading">
              <Title order={2} id="types-heading" className={styles.sectionTitle}>
                Notification types
              </Title>
              <Radio.Group
                label="Chat messages"
                description="New messages from your conversations"
                value={values.notify_chat}
                onChange={(value) => settings.setValue('notify_chat', value as NotifyChatPref)}
              >
                <Stack gap="xs" mt="xs">
                  {CHAT_OPTIONS.map((option) => (
                    <Radio key={option.value} value={option.value} label={option.label} />
                  ))}
                </Stack>
              </Radio.Group>
              <PreferenceSwitch
                label="Comments"
                description="When someone comments on your post"
                checked={values.notify_comments}
                onChange={(checked) => settings.setValue('notify_comments', checked)}
              />
              <Radio.Group
                label="Likes"
                description="When people like your posts"
                value={values.notify_likes}
                onChange={(value) => settings.setValue('notify_likes', value as NotifyLikesPref)}
              >
                <Stack gap="xs" mt="xs">
                  {LIKES_OPTIONS.map((option) => (
                    <Radio key={option.value} value={option.value} label={option.label} />
                  ))}
                </Stack>
              </Radio.Group>
              {/* Always on, so native disabled: the member can't have just used it. */}
              <PreferenceSwitch
                label="Emergency alerts"
                description="Verified metro-wide emergency broadcasts. Always on for your safety."
                checked
                disabled
              />
            </section>

            <div className={styles.actions}>
              <Button
                type="submit"
                aria-disabled={settings.saving || undefined}
                data-disabled={settings.saving || undefined}
                leftSection={settings.saving ? <Loader size={14} color="currentColor" aria-hidden="true" /> : undefined}
              >
                Save preferences
              </Button>
              <Button component={Link} href="/notifications" variant="default">
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
