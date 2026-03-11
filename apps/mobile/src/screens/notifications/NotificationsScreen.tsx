import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../config/supabase';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '@nusa/shared';
import type { Notification } from '@nusa/shared';
import { useAuth } from '../../hooks/useAuth';
import type { HomeStackParamList } from '../../types/navigation';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

function notifIcon(type: Notification['type']): string {
  switch (type) {
    case 'message': return '💬';
    case 'post_response': return '💬';
    case 'emergency_alert': return '🛡️';
    default: return '📩';
  }
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (target.getTime() === today.getTime()) return 'Today';
  if (target.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface SectionData {
  title: string;
  data: Notification[];
}

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const result = await getNotifications(supabase, user.id, 50, 0);
    if (result.data) setNotifications(result.data);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-mobile:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as Notification;
          if (newNotif.type === 'message') return;
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleNotifPress = useCallback(async (notif: Notification) => {
    if (!notif.read) {
      await markNotificationRead(supabase, notif.id);
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
    }
    const data = notif.data as Record<string, string>;
    if (data.post_id) {
      navigation.navigate('PostDetail', { postId: data.post_id });
    }
  }, [navigation]);

  const handleDismiss = useCallback(async (notifId: string) => {
    await deleteNotification(supabase, notifId);
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    if (!user) return;
    await markAllNotificationsRead(supabase, user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  const sections: SectionData[] = useMemo(() => {
    const emergency = notifications.filter((n) => n.type === 'emergency_alert');
    const rest = notifications.filter((n) => n.type !== 'emergency_alert');
    const result: SectionData[] = [];
    if (emergency.length > 0) result.push({ title: '🛡️ Emergency Alerts', data: emergency });
    const byDay = new Map<string, Notification[]>();
    for (const n of rest) {
      const label = dayLabel(n.sent_at);
      if (!byDay.has(label)) byDay.set(label, []);
      byDay.get(label)!.push(n);
    }
    for (const [label, items] of byDay) result.push({ title: label, data: items });
    return result;
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.navHeaderActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('NotificationPreferences')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, unreadCount, handleMarkAllRead]);

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notifItem,
        !item.read && styles.notifItemUnread,
        item.type === 'emergency_alert' && styles.notifItemEmergency,
      ]}
      onPress={() => handleNotifPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notifIconCircle}>
        <Text style={styles.notifIconText}>{notifIcon(item.type)}</Text>
      </View>
      <View style={styles.notifContent}>
        <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.notifTime}>{timeAgo(item.sent_at)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
      <TouchableOpacity
        style={styles.dismissBtn}
        onPress={() => handleDismiss(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={16} color={colors.text.secondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {loading && (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      )}

      {!loading && notifications.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyDesc}>
            Comments, likes, and emergency alerts will appear here.
          </Text>
        </View>
      )}

      {!loading && notifications.length > 0 && (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          onRefresh={() => { setRefreshing(true); loadNotifications(); }}
          refreshing={refreshing}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingRight: spacing.xs,
  },
  markAllBtn: {
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 13,
    color: colors.primary.main,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.m,
    gap: spacing.xs,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
    marginTop: spacing.s,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.m,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.s,
  },
  notifItemUnread: {
    backgroundColor: '#F0F4FF',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.main,
    paddingLeft: spacing.m - 4,
  },
  notifItemEmergency: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.red,
    paddingLeft: spacing.m - 4,
  },
  notifIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifIconText: {
    fontSize: 18,
  },
  notifContent: {
    flex: 1,
    gap: 3,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  notifBody: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.main,
    marginTop: 4,
    flexShrink: 0,
  },
  dismissBtn: {
    padding: 2,
    flexShrink: 0,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.l,
    gap: spacing.s,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
});
