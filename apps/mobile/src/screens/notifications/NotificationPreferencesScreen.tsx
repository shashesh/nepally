import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { getUserSettings, upsertUserSettings } from '@nusa/shared';
import type { UserSettings, NotifyChatPref, NotifyLikesPref } from '@nusa/shared';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

const DEFAULT_SETTINGS: Omit<UserSettings, 'user_id'> = {
  email_notifications: true,
  push_notifications: true,
  emergency_alerts: true,
  metro_area_alerts: true,
  notify_chat: 'all',
  notify_comments: true,
  notify_likes: 'grouped',
};

export function NotificationPreferencesScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Omit<UserSettings, 'user_id'>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserSettings(supabase, user.id).then((result) => {
      if (result.data) {
        const { user_id: _id, created_at: _c, updated_at: _u, ...rest } = result.data;
        setSettings(rest as Omit<UserSettings, 'user_id'>);
      }
      setLoading(false);
    });
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    const result = await upsertUserSettings(supabase, user.id, settings);
    setSaving(false);
    if (result.error) {
      Alert.alert('Error', 'Could not save preferences. Please try again.');
    } else {
      Alert.alert('Saved', 'Your notification preferences have been updated.');
    }
  }, [user, settings]);

  const openDeviceSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Push Notifications master toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <Text style={styles.sectionDesc}>Receive alerts when the app is in the background.</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Enable push notifications</Text>
            <Switch
              value={settings.push_notifications}
              onValueChange={(v) => setSettings((s) => ({ ...s, push_notifications: v }))}
              trackColor={{ false: colors.border, true: colors.primary.light }}
              thumbColor={settings.push_notifications ? colors.primary.main : colors.text.disabled}
            />
          </View>
          <TouchableOpacity style={styles.settingsLink} onPress={openDeviceSettings}>
            <Text style={styles.settingsLinkText}>Open device notification settings →</Text>
          </TouchableOpacity>
        </View>

        {/* Chat Messages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Chat Messages</Text>
          <Text style={styles.sectionDesc}>New messages from conversations</Text>
          {(['all', 'batched', 'off'] as NotifyChatPref[]).map((val) => (
            <TouchableOpacity
              key={val}
              style={styles.radioRow}
              onPress={() => setSettings((s) => ({ ...s, notify_chat: val }))}
            >
              <View style={[styles.radioCircle, settings.notify_chat === val && styles.radioCircleSelected]}>
                {settings.notify_chat === val && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>
                {val === 'all' && 'Every message'}
                {val === 'batched' && 'Batched (every 30 min)'}
                {val === 'off' && 'Off'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comments */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelGroup}>
              <Text style={styles.sectionTitle}>💬 Comments</Text>
              <Text style={styles.sectionDesc}>When someone comments on your post</Text>
            </View>
            <Switch
              value={settings.notify_comments}
              onValueChange={(v) => setSettings((s) => ({ ...s, notify_comments: v }))}
              trackColor={{ false: colors.border, true: colors.primary.light }}
              thumbColor={settings.notify_comments ? colors.primary.main : colors.text.disabled}
            />
          </View>
        </View>

        {/* Likes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❤️ Likes</Text>
          <Text style={styles.sectionDesc}>When people like your posts</Text>
          {(['all', 'grouped', 'off'] as NotifyLikesPref[]).map((val) => (
            <TouchableOpacity
              key={val}
              style={styles.radioRow}
              onPress={() => setSettings((s) => ({ ...s, notify_likes: val }))}
            >
              <View style={[styles.radioCircle, settings.notify_likes === val && styles.radioCircleSelected]}>
                {settings.notify_likes === val && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>
                {val === 'all' && 'Every like'}
                {val === 'grouped' && 'When 5+ likes received'}
                {val === 'off' && 'Off'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Emergency Alerts — display only */}
        <View style={[styles.section, styles.sectionDisabled]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelGroup}>
              <Text style={styles.sectionTitle}>🛡️ Emergency Alerts</Text>
              <Text style={styles.sectionDesc}>
                Verified metro-wide emergency broadcasts — required for your safety
              </Text>
            </View>
            <Switch
              value={true}
              disabled={true}
              trackColor={{ false: colors.border, true: colors.primary.light }}
              thumbColor={colors.primary.main}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Preferences'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.m,
    gap: spacing.s,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  sectionDisabled: {
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sectionDesc: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  toggleLabelGroup: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    flex: 1,
  },
  settingsLink: {
    marginTop: 4,
  },
  settingsLinkText: {
    fontSize: 13,
    color: colors.primary.main,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.primary.main,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.main,
  },
  radioLabel: {
    fontSize: 14,
    color: colors.text.primary,
  },
  saveBtn: {
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    padding: spacing.m,
    alignItems: 'center',
    marginTop: spacing.s,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});
