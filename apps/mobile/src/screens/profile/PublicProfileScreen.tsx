import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { HomeStackParamList } from '../../types/navigation';
import {
  TrustLevel,
  getUserById,
  getPostsByAuthorId,
  getEventsByOrganizer,
  getOrCreateConversation,
  formatRelativeTime,
  formatPublicName,
  getTrustLabel,
} from '@nepally/shared';
import type { User, Post, Event } from '@nepally/shared';
import { Avatar } from '../../components/Avatar';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius } from '../../styles/spacing';

type Navigation = NativeStackNavigationProp<HomeStackParamList, 'PublicProfileView'>;
type Route = RouteProp<HomeStackParamList, 'PublicProfileView'>;

export default function PublicProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { userId } = route.params;
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [metroName, setMetroName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'events' | 'about'>('posts');
  const [messagingLoading, setMessagingLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      const result = await getUserById(supabase, userId);

      if (!isMounted) return;

      if (result.error || !result.data) {
        setError('Could not load profile.');
        setLoading(false);
        return;
      }

      setProfileUser(result.data);
      setLoading(false);

      // Load metro area name
      if (result.data.metro_area_id) {
        const { data: metro } = await supabase
          .from('metro_areas')
          .select('name, state')
          .eq('id', result.data.metro_area_id)
          .single();
        if (isMounted && metro) {
          setMetroName(`${metro.name}, ${metro.state}`);
        }
      }
    }

    async function loadPosts() {
      setPostsLoading(true);
      const result = await getPostsByAuthorId(supabase, userId, 30);
      if (!isMounted) return;
      setUserPosts(result.data || []);
      setPostsLoading(false);
    }

    async function loadEvents() {
      setEventsLoading(true);
      const result = await getEventsByOrganizer(supabase, userId, 50);
      if (!isMounted) return;
      setUserEvents(result.data || []);
      setEventsLoading(false);
    }

    loadProfile();
    loadPosts();
    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleMessage = async () => {
    if (!currentUser || !profileUser) return;

    if (currentUser.trust_level === TrustLevel.NEW) {
      Alert.alert(
        'Verify to Message',
        'Please verify your phone number to message others.',
        [{ text: 'OK' }]
      );
      return;
    }

    setMessagingLoading(true);
    const result = await getOrCreateConversation(
      supabase,
      currentUser.id,
      currentUser.full_name,
      profileUser.id,
      profileUser.full_name
    );
    setMessagingLoading(false);

    if (result.data) {
      navigation.getParent()?.navigate('Chat', {
        screen: 'MessageThread',
        params: {
          conversationId: result.data.conversationId,
          otherUserId: profileUser.id,
          otherUserName: profileUser.full_name,
          otherUserTrustLevel: profileUser.trust_level,
          otherUserPhotoUrl: profileUser.profile_photo ?? null,
        },
      });
    } else {
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profileUser) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Profile not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const trustLevel = profileUser.trust_level;
  const trustBadgeStyle =
    trustLevel === TrustLevel.NEW
      ? styles.trustBadgeNew
      : trustLevel === TrustLevel.VERIFIED
        ? styles.trustBadgeVerified
        : styles.trustBadgeContributor;

  const memberSinceYear = new Date(profileUser.created_at).getFullYear();
  const isOwnProfile = currentUser?.id === userId;

  function renderPosts() {
    if (postsLoading) {
      return <Text style={styles.tabMessage}>Loading...</Text>;
    }
    if (userPosts.length === 0) {
      return <Text style={styles.tabMessage}>No posts yet.</Text>;
    }
    return (
      <View style={styles.postList}>
        {userPosts.map((post) => (
          <TouchableOpacity
            key={post.id}
            style={styles.postItem}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
            activeOpacity={0.75}
          >
            <View style={styles.postItemHeader}>
              <Text style={styles.postItemTitle} numberOfLines={1}>
                {post.title}
              </Text>
              <View style={[styles.scopeBadge, post.is_global ? styles.scopeGlobal : styles.scopeLocal]}>
                <Text style={post.is_global ? styles.scopeTextGlobal : styles.scopeTextLocal}>
                  {post.is_global ? '🌐 Global' : '📍 Local'}
                </Text>
              </View>
            </View>
            <Text style={styles.postItemDescription} numberOfLines={2}>
              {post.description}
            </Text>
            <View style={styles.postMetaRow}>
              <Text style={styles.postMetaText}>{formatRelativeTime(new Date(post.created_at))}</Text>
              <Text style={styles.postMetaText}>❤️ {post.likes_count || 0}</Text>
              <Text style={styles.postMetaText}>💬 {post.comments_count || 0}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function renderEvents() {
    if (eventsLoading) {
      return <Text style={styles.tabMessage}>Loading...</Text>;
    }
    if (userEvents.length === 0) {
      return <Text style={styles.tabMessage}>No events yet.</Text>;
    }

    return (
      <View style={styles.eventList}>
        {userEvents.map((event) => {
          const isPast = new Date(event.end_date ?? event.start_date) < new Date();
          const isCancelled = event.status === 'cancelled';

          return (
            <TouchableOpacity
              key={event.id}
              style={styles.eventItem}
              activeOpacity={0.75}
              onPress={() => {
                const rootNavigation = navigation.getParent();
                if (!rootNavigation) return;
                (rootNavigation.navigate as (...args: unknown[]) => void)('Events', {
                  screen: 'EventDetail',
                  params: { eventId: event.id },
                });
              }}
            >
              <View style={styles.eventItemHeader}>
                <Text style={styles.eventItemTitle} numberOfLines={1}>
                  {event.title}
                </Text>
                <View style={[styles.scopeBadge, event.is_global ? styles.scopeGlobal : styles.scopeLocal]}>
                  <Text style={event.is_global ? styles.scopeTextGlobal : styles.scopeTextLocal}>
                    {event.is_global ? '🌐 Global' : '📍 Local'}
                  </Text>
                </View>
              </View>

              <Text style={styles.eventItemMeta} numberOfLines={1}>
                {new Date(event.start_date).toLocaleDateString()} · {event.location_name}
              </Text>

              <View style={styles.eventMetaRow}>
                <Text style={styles.postMetaText}>{event.rsvp_count} going</Text>
                {isCancelled && <Text style={styles.eventCancelledText}>Cancelled</Text>}
                {!isCancelled && isPast && <Text style={styles.eventPastText}>Past</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar & Basic Info */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Avatar
              name={profileUser.full_name}
              photoUrl={profileUser.profile_photo}
              trustLevel={trustLevel}
              size="xlarge"
            />
          </View>
          <Text style={styles.name}>{formatPublicName(profileUser.full_name)}</Text>

          {/* Trust Badge */}
          <View style={[styles.trustBadge, trustBadgeStyle]}>
            <Ionicons name="shield-checkmark" size={14} color={colors.white} />
            <Text style={styles.trustText}>
              Level {trustLevel} — {getTrustLabel(trustLevel)}
            </Text>
          </View>

          {/* Message Button (only shown when viewing another user) */}
          {!isOwnProfile && (
            <TouchableOpacity
              style={[styles.messageButton, messagingLoading && styles.messageButtonDisabled]}
              onPress={handleMessage}
              disabled={messagingLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.white} />
              <Text style={styles.messageButtonText}>
                {messagingLoading ? 'Opening...' : 'Message'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'posts' ? styles.tabButtonActive : null]}
              onPress={() => setActiveTab('posts')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'posts' ? styles.tabButtonTextActive : null]}>
                Posts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'events' ? styles.tabButtonActive : null]}
              onPress={() => setActiveTab('events')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'events' ? styles.tabButtonTextActive : null]}>
                Events
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'about' ? styles.tabButtonActive : null]}
              onPress={() => setActiveTab('about')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'about' ? styles.tabButtonTextActive : null]}>
                About
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'posts' && renderPosts()}

          {activeTab === 'events' && renderEvents()}

          {activeTab === 'about' && (
            <View>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>
                  {metroName || 'Location not set'}
                </Text>
              </View>

              <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Activity</Text>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Posts</Text>
                <Text style={styles.aboutValue}>{userPosts.length}</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Events</Text>
                <Text style={styles.aboutValue}>{userEvents.length}</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Member Since</Text>
                <Text style={styles.aboutValue}>{memberSinceYear}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  scrollContent: {
    paddingBottom: spacing.l,
    paddingHorizontal: spacing.m,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingTop: spacing.l,
    paddingBottom: spacing.m,
    paddingHorizontal: spacing.l,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.card,
  },
  avatarContainer: {
    marginBottom: spacing.s,
  },
  name: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.s,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.badge,
    marginBottom: spacing.m,
  },
  trustBadgeNew: {
    backgroundColor: colors.badge.level0,
  },
  trustBadgeVerified: {
    backgroundColor: colors.badge.level1,
  },
  trustBadgeContributor: {
    backgroundColor: colors.badge.level2,
  },
  trustText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.button,
  },
  messageButtonDisabled: {
    opacity: 0.6,
  },
  messageButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  section: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.card,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.s,
  },
  tabButton: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary.main,
  },
  tabButtonText: {
    ...typography.body,
    color: colors.text.secondary,
    fontWeight: '500',
    fontSize: 15,
  },
  tabButtonTextActive: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  tabMessage: {
    ...typography.body,
    color: colors.text.secondary,
    paddingVertical: spacing.s,
  },
  postList: {
    gap: spacing.s,
  },
  eventList: {
    gap: spacing.s,
  },
  postItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
    padding: spacing.s,
  },
  eventItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
    padding: spacing.s,
  },
  postItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  eventItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  postItemTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
    flex: 1,
  },
  eventItemTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
    flex: 1,
  },
  scopeBadge: {
    borderRadius: borderRadius.badge,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  scopeLocal: {
    backgroundColor: colors.badge.localBg,
  },
  scopeGlobal: {
    backgroundColor: colors.primary.main,
  },
  scopeTextLocal: {
    ...typography.caption,
    color: colors.badge.localText,
    fontWeight: '600',
  },
  scopeTextGlobal: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  postItemDescription: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  postMetaRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.xs,
  },
  eventMetaRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.xs,
  },
  postMetaText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  eventItemMeta: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  eventCancelledText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '700',
  },
  eventPastText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.s,
  },
  sectionTitleSpaced: {
    marginTop: spacing.m,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  infoLabel: {
    ...typography.body,
    color: colors.text.primary,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  aboutLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  aboutValue: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
});
