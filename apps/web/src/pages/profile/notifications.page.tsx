import React, { useEffect, useState } from 'react';
import { Button, Switch, Text } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { getUserSettings, upsertUserSettings } from '@nusa/shared';
import type { UserSettings, NotifyChatPref, NotifyLikesPref } from '@nusa/shared';
import styles from '../../styles/NotificationPreferences.module.css';

const DEFAULT_SETTINGS: Omit<UserSettings, 'user_id'> = {
  email_notifications: true,
  push_notifications: true,
  emergency_alerts: true,
  metro_area_alerts: true,
  notify_chat: 'all',
  notify_comments: true,
  notify_likes: 'grouped',
};

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [settings, setSettings] = useState<Omit<UserSettings, 'user_id'>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    getUserSettings(supabase, user.id).then((result) => {
      if (result.data) {
        setSettings({
          email_notifications: result.data.email_notifications,
          push_notifications: result.data.push_notifications,
          emergency_alerts: result.data.emergency_alerts,
          metro_area_alerts: result.data.metro_area_alerts,
          notify_chat: result.data.notify_chat,
          notify_comments: result.data.notify_comments,
          notify_likes: result.data.notify_likes,
        });
      }
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    const result = await upsertUserSettings(supabase, user.id, settings);
    setSaving(false);
    if (result.error) {
      setError('Failed to save preferences. Please try again.');
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Notification Preferences — NUSA</title>
      </Head>

      <div className={styles.shell}>
        <nav className={styles.breadcrumb}>
          <Link href="/notifications" className={styles.breadcrumbLink}>← Notifications</Link>
        </nav>

        <h1 className={styles.title}>⚙️ Notification Preferences</h1>

        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
          </div>
        ) : (
          <div className={styles.sections}>

            {/* Push notifications master toggle */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Push Notifications</h2>
              <p className={styles.sectionDesc}>Receive alerts even when the app is closed.</p>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Enable push notifications</span>
                <Switch
                  checked={settings.push_notifications}
                  onChange={(e) => setSettings((s) => ({ ...s, push_notifications: e.currentTarget.checked }))}
                />
              </div>
            </section>

            {/* Notification types */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Notification Types</h2>

              {/* Chat messages */}
              <div className={styles.prefGroup}>
                <div className={styles.prefGroupHeader}>
                  <span className={styles.prefGroupTitle}>💬 Chat Messages</span>
                  <span className={styles.prefGroupDesc}>New messages from conversations</span>
                </div>
                <div className={styles.radioGroup}>
                  {(['all', 'batched', 'off'] as NotifyChatPref[]).map((val) => (
                    <label key={val} className={styles.radioRow}>
                      <input
                        type="radio"
                        name="notify_chat"
                        value={val}
                        checked={settings.notify_chat === val}
                        onChange={() => setSettings((s) => ({ ...s, notify_chat: val }))}
                      />
                      <span>
                        {val === 'all' && 'Every message'}
                        {val === 'batched' && 'Batched (every 30 min)'}
                        {val === 'off' && 'Off'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className={styles.prefGroup}>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.prefGroupTitle}>💬 Comments</span>
                    <span className={styles.prefGroupDesc}>When someone comments on your post</span>
                  </div>
                  <Switch
                    checked={settings.notify_comments}
                    onChange={(e) => setSettings((s) => ({ ...s, notify_comments: e.currentTarget.checked }))}
                  />
                </div>
              </div>

              {/* Likes */}
              <div className={styles.prefGroup}>
                <div className={styles.prefGroupHeader}>
                  <span className={styles.prefGroupTitle}>❤️ Likes</span>
                  <span className={styles.prefGroupDesc}>When people like your posts</span>
                </div>
                <div className={styles.radioGroup}>
                  {(['all', 'grouped', 'off'] as NotifyLikesPref[]).map((val) => (
                    <label key={val} className={styles.radioRow}>
                      <input
                        type="radio"
                        name="notify_likes"
                        value={val}
                        checked={settings.notify_likes === val}
                        onChange={() => setSettings((s) => ({ ...s, notify_likes: val }))}
                      />
                      <span>
                        {val === 'all' && 'Every like'}
                        {val === 'grouped' && 'When 5+ likes received'}
                        {val === 'off' && 'Off'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Emergency alerts — display only, always on */}
              <div className={styles.prefGroup}>
                <div className={`${styles.toggleRow} ${styles.toggleRowDisabled}`}>
                  <div>
                    <span className={styles.prefGroupTitle}>🛡️ Emergency Alerts</span>
                    <span className={styles.prefGroupDesc}>Verified metro-wide emergency broadcasts — required for your safety</span>
                  </div>
                  <Switch checked disabled />
                </div>
              </div>
            </section>

            {error && <Text c="red" mb="sm">{error}</Text>}

            <div className={styles.actions}>
              <Button
                onClick={handleSave}
                loading={saving}
                type="button"
              >
                {saved ? '✓ Saved' : 'Save Preferences'}
              </Button>
              <Button component={Link} href="/notifications" variant="default">Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
