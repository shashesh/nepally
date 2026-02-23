import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { Level0Banner } from '../components/banners/Level0Banner';
import { LocationPermissionBanner } from '../components/banners/LocationPermissionBanner';
import { LocationChangeSheet } from '../components/location/LocationChangeSheet';
import { LocationSwitcherSheet } from '../components/location/LocationSwitcherSheet';
import { PostCard } from '../components/cards/PostCard';
import { TagFilterBar } from '../components/filters/TagFilterBar';
import { PostMoreSheet } from '../components/sheets/PostMoreSheet';
import {
  getPostsByMetroArea,
  getTags,
  getUserLikedPostIds,
  likePost,
  unlikePost,
  deletePost,
  getOrCreateConversation,
  getTotalUnreadCount,
  TrustLevel,
} from '@nusa/shared';
import type { Post, Tag } from '@nusa/shared';
import { isBannerDismissed, saveBannerDismissed } from '../utils/storage';
import { supabase } from '../config/supabase';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { spacing } from '../styles/spacing';
import { MainTabParamList, HomeStackParamList } from '../types/navigation';

type HomeScreenNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>,
  BottomTabNavigationProp<MainTabParamList>
>;

export default function HomeScreen() {
  const { user } = useAuth();
  const {
    activeLocation,
    detectedLocation,
    savedLocations,
    showChangePrompt,
    browseMetro,
    updateMetroPermanent,
    snoozeMetro,
    dismissChangePrompt,
    setManualOverride,
  } = useLocation();
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const navigation = useNavigation<HomeScreenNavProp>();

  // Tag filter state (multi-select)
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>([]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [morePost, setMorePost] = useState<Post | null>(null);

  const isLevel0 = user?.trust_level === TrustLevel.NEW;

  // Derive metroName from activeLocation (or fall back to user's metro)
  const metroAreaId = activeLocation?.metro_area_id ?? user?.metro_area_id;
  const matchedSavedLocation = savedLocations.find(
    (location) => location.metro_area_id === metroAreaId && location.metro_area
  );
  const metroName = activeLocation
    ? `${activeLocation.metro_name}, ${activeLocation.metro_state}`
    : matchedSavedLocation?.metro_area
      ? `${matchedSavedLocation.metro_area.name}, ${matchedSavedLocation.metro_area.state}`
      : metroAreaId
        ? 'Your Metro Area'
        : null;
  const locationLabel = activeLocation?.is_temporary
    ? 'Visiting'
    : matchedSavedLocation?.label || 'Home';

  useEffect(() => {
    loadBannerState();
    loadTags();
  }, []);

  // Reload posts, liked state, and unread count every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (metroAreaId) {
        loadPosts();
      }
      loadLikedPosts();
      refreshUnreadCount();
      // Refresh unread count periodically
      const interval = setInterval(refreshUnreadCount, 30000);
      return () => clearInterval(interval);
    }, [selectedTagSlugs, metroAreaId])
  );

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    const result = await getTotalUnreadCount(supabase, user.id);
    setUnreadCount(result.count);
  }, [user?.id]);

  const loadBannerState = async () => {
    const dismissed = await isBannerDismissed('level0-banner');
    setBannerVisible(!dismissed);
  };

  const loadTags = async () => {
    const result = await getTags(supabase);
    if (result.data) {
      setAvailableTags(result.data);
    }
  };

  const loadPosts = async () => {
    if (!metroAreaId) return;

    try {
      const slugs = selectedTagSlugs.length > 0 ? selectedTagSlugs : undefined;
      const result = await getPostsByMetroArea(supabase, metroAreaId!, slugs);

      if (result.data) {
        setPosts(result.data);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handleBannerDismiss = async () => {
    await saveBannerDismissed('level0-banner');
    setBannerVisible(false);
  };

  const loadLikedPosts = async () => {
    if (!user?.id) return;
    const result = await getUserLikedPostIds(supabase, user.id);
    if (result.data) {
      setLikedPostIds(new Set(result.data));
    }
  };

  const handleLikePress = async (post: Post) => {
    if (isLevel0) {
      Alert.alert(
        'Verify to Like',
        'Please verify your phone number to like posts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: handleVerifyPress },
        ]
      );
      return;
    }

    const wasLiked = likedPostIds.has(post.id);

    // Optimistic update
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likes_count: p.likes_count + (wasLiked ? -1 : 1) }
          : p
      )
    );

    // Persist
    const result = wasLiked ? await unlikePost(supabase, post.id) : await likePost(supabase, post.id);
    if (result.error) {
      // Revert on error
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likes_count: p.likes_count + (wasLiked ? 1 : -1) }
            : p
        )
      );
      Alert.alert('Error', 'Failed to update like. Please try again.');
    }
  };

  const handleCommentPress = (post: Post) => {
    navigation.navigate('PostDetail', { postId: post.id, scrollToComments: true } as any);
  };

  const handleVerifyPress = () => {
    Alert.alert(
      'Phone Verification',
      'Phone verification will be implemented in Journey #02',
      [{ text: 'OK' }]
    );
  };

  const handlePostPress = (post: Post) => {
    navigation.navigate('PostDetail', { postId: post.id });
  };

  const handleAvatarViewProfile = (post: Post) => {
    Alert.alert('Coming Soon', 'User profiles will be available in a future update.');
  };

  const handleAvatarChat = async (post: Post) => {
    if (!user || !post.author) return;

    if (isLevel0) {
      Alert.alert(
        'Verify to Message',
        'Please verify your phone number to message others.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: handleVerifyPress },
        ]
      );
      return;
    }

    const result = await getOrCreateConversation(
      supabase,
      user.id,
      user.full_name,
      post.author.id,
      post.author.full_name
    );

    if (result.data) {
      navigation.getParent()?.navigate('Chat', {
        screen: 'MessageThread',
        params: {
          conversationId: result.data.conversationId,
          otherUserId: post.author.id,
          otherUserName: post.author.full_name,
          otherUserTrustLevel: post.author.trust_level,
        },
      });
    } else if (result.error) {
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  const handleMorePress = (post: Post) => {
    setMorePost(post);
  };

  const handleMoreEdit = () => {
    Alert.alert('Coming Soon', 'Post editing will be available in a future update.');
  };

  const handleMoreDelete = async () => {
    if (!morePost) return;
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deletePost(supabase, morePost.id);
            if (result.error) {
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            } else {
              setPosts((prev) => prev.filter((p) => p.id !== morePost.id));
            }
          },
        },
      ]
    );
  };

  const handleMoreReport = () => {
    Alert.alert('Post Reported', 'Thank you. Our moderation team will review this post.');
  };

  const handleMoreShare = async () => {
    if (!morePost) return;
    await Share.share({ message: morePost.title });
  };

  const handleCreatePost = () => {
    if (isLevel0) {
      Alert.alert(
        'Verify to Post',
        'Please verify your phone number to create posts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: handleVerifyPress },
        ]
      );
    } else {
      navigation.navigate('Post' as any);
    }
  };

  const handleTagChipPress = (slug: string) => {
    setSelectedTagSlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      return [...prev, slug];
    });
  };

  const handleAllChipPress = () => {
    setSelectedTagSlugs([]);
  };

  const handleMessagesPress = () => {
    // Navigate to Chat/Conversations screen
    navigation.getParent()?.navigate('Chat', {
      screen: 'ConversationList',
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color={colors.text.disabled} />
      <Text style={styles.emptyTitle}>No posts yet</Text>
      <Text style={styles.emptySubtitle}>
        {selectedTagSlugs.length > 0
          ? 'No posts matching your filters in this area. Try different tags!'
          : 'Be the first to post in your community!'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Top Navigation */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => setSwitcherVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="location" size={20} color={colors.primary.main} />
          <View style={styles.locationTextContainer}>
            <Text style={styles.metroName} numberOfLines={2}>
              {metroName || 'No Location Set'}
            </Text>
            <Text
              style={activeLocation?.is_temporary ? styles.visitingLabel : styles.locationLabel}
              numberOfLines={1}
            >
              {locationLabel}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={14} color={colors.text.secondary} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleMessagesPress}>
            <Ionicons name="chatbubbles-outline" size={24} color={colors.text.primary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Level 0 Banner */}
      {isLevel0 && bannerVisible && (
        <Level0Banner
          onVerifyPress={handleVerifyPress}
          onDismiss={handleBannerDismiss}
        />
      )}

      {/* Location Permission Banner */}
      <LocationPermissionBanner />

      {/* Tag Filter Chips */}
      <TagFilterBar
        tags={availableTags}
        selectedSlugs={selectedTagSlugs}
        onTagPress={handleTagChipPress}
        onAllPress={handleAllChipPress}
      />

      {/* Posts Feed */}
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard
            title={item.title}
            description={item.description}
            timestamp={item.created_at}
            tags={item.tags}
            isGlobal={item.is_global}
            isVerified={(item.author?.trust_level ?? 0) >= TrustLevel.VERIFIED}
            authorName={item.author?.full_name}
            authorPhotoUrl={item.author?.profile_photo}
            authorTrustLevel={item.author?.trust_level ?? 0}
            likesCount={item.likes_count ?? 0}
            commentsCount={item.comments_count ?? 0}
            isLiked={likedPostIds.has(item.id)}
            onPress={() => handlePostPress(item)}
            onLikePress={() => handleLikePress(item)}
            onCommentPress={() => handleCommentPress(item)}
            authorId={item.author_id}
            currentUserId={user?.id}
            onTagPress={handleTagChipPress}
            onAvatarViewProfile={() => handleAvatarViewProfile(item)}
            onAvatarChat={() => handleAvatarChat(item)}
            onMorePress={() => handleMorePress(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.postsContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.main}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      {/* Location Switcher */}
      <LocationSwitcherSheet
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
        savedLocations={savedLocations}
        activeLocation={activeLocation}
        detectedLocation={detectedLocation}
        onSelectSaved={(loc) => {
          setSwitcherVisible(false);
          if (loc.metro_area) {
            setManualOverride({
              metro_area_id: loc.metro_area_id,
              metro_name: loc.metro_area.name,
              metro_state: loc.metro_area.state,
              source: 'saved',
              is_temporary: false,
            });
          }
        }}
        onSelectDetected={() => {
          setSwitcherVisible(false);
          if (detectedLocation) {
            browseMetro({
              metro_area_id: detectedLocation.metro_area_id,
              metro_name: detectedLocation.metro_name,
              metro_state: detectedLocation.metro_state,
              source: 'gps',
              is_temporary: true,
            });
          }
        }}
      />

      {/* Location Change Prompt */}
      <LocationChangeSheet
        visible={showChangePrompt}
        detectedLocation={detectedLocation}
        activeLocation={activeLocation}
        onBrowse={() => {
          if (detectedLocation) {
            browseMetro({
              metro_area_id: detectedLocation.metro_area_id,
              metro_name: detectedLocation.metro_name,
              metro_state: detectedLocation.metro_state,
              source: 'gps',
              is_temporary: true,
            });
          }
        }}
        onUpdate={() => {
          if (detectedLocation) {
            updateMetroPermanent(
              detectedLocation.metro_area_id,
              detectedLocation.metro_name,
              detectedLocation.metro_state,
              detectedLocation.zip_code
            );
          }
        }}
        onKeep={dismissChangePrompt}
        onSnooze={snoozeMetro}
      />

      {/* Post More Sheet */}
      <PostMoreSheet
        visible={morePost !== null}
        isOwnPost={morePost?.author_id === user?.id}
        onClose={() => setMorePost(null)}
        onEdit={handleMoreEdit}
        onDelete={handleMoreDelete}
        onReport={handleMoreReport}
        onShare={handleMoreShare}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, isLevel0 && styles.fabDisabled]}
        onPress={handleCreatePost}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    gap: spacing.xs,
    marginRight: spacing.s,
  },
  locationTextContainer: {
    flexShrink: 1,
    flexDirection: 'column',
  },
  metroName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    flexShrink: 1,
  },
  locationLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  visitingLabel: {
    ...typography.caption,
    color: colors.warning,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    flexShrink: 0,
    gap: spacing.s,
  },
  iconButton: {
    padding: spacing.xs,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.accent.red,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  postsContent: {
    padding: spacing.s,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.s,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.m,
    right: spacing.m,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabDisabled: {
    opacity: 0.5,
  },
});
