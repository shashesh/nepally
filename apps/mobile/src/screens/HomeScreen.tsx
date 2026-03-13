import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
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
import { SkeletonPostCard } from '../components/cards/SkeletonPostCard';
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
  getUnreadNotificationCount,
  getUserSavedPostIds,
  savePost,
  unsavePost,
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [morePost, setMorePost] = useState<Post | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveToastOpacity = useRef(new Animated.Value(0)).current;
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const pillTranslateY = useRef(new Animated.Value(-60)).current;

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

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    const result = await getTotalUnreadCount(supabase, user.id);
    setUnreadCount(result.count);
  }, [user?.id]);

  const refreshUnreadNotifCount = useCallback(async () => {
    if (!user?.id) return;
    const result = await getUnreadNotificationCount(supabase, user.id);
    setUnreadNotifCount(result.count);
  }, [user?.id]);

  // Realtime chat unread updates for messages icon badge
  useEffect(() => {
    if (!user?.id) return;

    const participantsChannel = supabase
      .channel(`chat-unread-mobile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshUnreadCount();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`chat-messages-unread-mobile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as { sender_id?: string };
          if (newMessage.sender_id === user.id) return;
          refreshUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user?.id, refreshUnreadCount]);

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

  const loadPosts = useCallback(async () => {
    if (!metroAreaId) {
      setPosts([]);
      setLoadError(null);
      setInitialLoading(false);
      return;
    }

    try {
      setLoadError(null);
      setNewPostsCount(0);
      const slugs = selectedTagSlugs.length > 0 ? selectedTagSlugs : undefined;
      const result = await getPostsByMetroArea(supabase, metroAreaId!, slugs);

      if (result.data) {
        setPosts(result.data);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
      setPosts([]);
      setLoadError('Could not load posts. Please check your connection and try again.');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [metroAreaId, selectedTagSlugs]);

  const loadPostsRef = useRef(loadPosts);

  useEffect(() => {
    loadPostsRef.current = loadPosts;
  }, [loadPosts]);

  const handleRefresh = () => {
    setRefreshing(true);
    setLoadError(null);
    setNewPostsCount(0);
    loadPosts();
  };

  const handleRetryLoad = () => {
    setInitialLoading(true);
    setLoadError(null);
    loadPosts();
  };

  const handleBannerDismiss = async () => {
    await saveBannerDismissed('level0-banner');
    setBannerVisible(false);
  };

  // Animate new posts pill in/out
  useEffect(() => {
    Animated.spring(pillTranslateY, {
      toValue: newPostsCount > 0 ? 0 : -60,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [newPostsCount, pillTranslateY]);

  // Realtime feed updates: show pill for others' posts, silent reload for own
  useEffect(() => {
    if (!metroAreaId) return;

    const feedChannel = supabase
      .channel(`feed-posts-mobile:${metroAreaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `metro_area_id=eq.${metroAreaId}`,
        },
        (payload) => {
          const newPost = payload.new as { author_id?: string };
          if (newPost.author_id === user?.id) {
            loadPostsRef.current();
          } else {
            setNewPostsCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(feedChannel);
    };
  }, [metroAreaId, user?.id, pillTranslateY]);

  const loadLikedPosts = useCallback(async () => {
    if (!user?.id) return;
    const result = await getUserLikedPostIds(supabase, user.id);
    if (result.data) {
      setLikedPostIds(new Set(result.data));
    }
  }, [user?.id]);

  const loadSavedPosts = useCallback(async () => {
    if (!user?.id) return;
    const result = await getUserSavedPostIds(supabase, user.id);
    if (result.data) {
      setSavedPostIds(new Set(result.data));
    }
  }, [user?.id]);

  // Reload posts, liked state, and unread count every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadPosts();
      loadLikedPosts();
      loadSavedPosts();
      refreshUnreadCount();
      refreshUnreadNotifCount();
      // Refresh unread counts periodically
      const interval = setInterval(() => {
        refreshUnreadCount();
        refreshUnreadNotifCount();
      }, 30000);
      return () => clearInterval(interval);
    }, [
      loadPosts,
      loadLikedPosts,
      loadSavedPosts,
      refreshUnreadCount,
      refreshUnreadNotifCount,
    ])
  );

  const showSaveToast = (message: string) => {
    setSaveToast(message);
    saveToastOpacity.setValue(1);
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    saveToastTimerRef.current = setTimeout(() => {
      Animated.timing(saveToastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setSaveToast(null));
    }, 2200);
  };

  const handleSaveFromCard = async (post: Post) => {
    const wasSaved = savedPostIds.has(post.id);

    setSavedPostIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(post.id);
      else next.add(post.id);
      return next;
    });

    const result = wasSaved
      ? await unsavePost(supabase, post.id)
      : await savePost(supabase, post.id);

    if (result.error) {
      setSavedPostIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      showSaveToast('Failed to update saved post.');
    } else {
      showSaveToast(wasSaved ? 'Post unsaved.' : 'Post saved.');
    }
  };

  const handleMoreSave = async () => {
    if (!morePost) return;
    const wasSaved = savedPostIds.has(morePost.id);

    // Optimistic update
    setSavedPostIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(morePost.id);
      else next.add(morePost.id);
      return next;
    });

    const result = wasSaved
      ? await unsavePost(supabase, morePost.id)
      : await savePost(supabase, morePost.id);

    if (result.error) {
      // Revert on error
      setSavedPostIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(morePost.id);
        else next.delete(morePost.id);
        return next;
      });
      showSaveToast('Failed to update saved post.');
    } else {
      showSaveToast(wasSaved ? 'Post unsaved.' : 'Post saved.');
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
    navigation.navigate('PostDetail', { postId: post.id });
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

  const handleAvatarViewProfile = (authorId: string) => {
    navigation.navigate('PublicProfileView', { userId: authorId });
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
    if (!morePost) return;
    setMorePost(null);
    navigation.navigate('Post', {
      screen: 'CreatePost',
      params: { editPostId: morePost.id },
    });
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
      navigation.navigate('Post', { screen: 'CreatePost' });
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

  const handleSearchPress = () => {
    Alert.alert('Coming Soon', 'Search will be available in a future update.');
  };

  const handleNotificationsPress = () => {
    navigation.navigate('Notifications');
  };

  const renderCreatePostBanner = () => {
    const firstName = user?.full_name?.split(' ')[0] || 'there';
    const initial = user?.full_name?.[0]?.toUpperCase() || 'U';
    return (
      <View style={styles.createPostBanner}>
        <View style={styles.createPostAvatar}>
          <Text style={styles.createPostAvatarText}>{initial}</Text>
        </View>
        <TouchableOpacity
          style={styles.createPostInput}
          onPress={handleCreatePost}
          activeOpacity={0.7}
        >
          <Text style={styles.createPostPlaceholder}>What&apos;s on your mind, {firstName}?</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.createPostButton, isLevel0 && styles.createPostButtonDisabled]}
          onPress={handleCreatePost}
          activeOpacity={0.8}
        >
          <Text style={styles.createPostButtonText}>Post</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (!metroAreaId) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIllustration}>
            <Text style={styles.emptyIllustrationEmoji}>📍</Text>
          </View>
          <Text style={styles.emptyTitle}>No location set</Text>
          <Text style={styles.emptySubtitle}>
            Set your location to see posts from your local community.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIllustration}>
          <Text style={styles.emptyIllustrationEmoji}>🏔️</Text>
        </View>
        <Text style={styles.emptyTitle}>
          {selectedTagSlugs.length > 0 ? 'No matching posts' : 'Be the first to post'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {selectedTagSlugs.length > 0
            ? 'No posts match your filters in this area.\nTry different tags or clear the filter.'
            : 'Share something useful with your\nNepalese community here.'}
        </Text>
        {!isLevel0 && selectedTagSlugs.length === 0 && (
          <TouchableOpacity
            style={styles.emptyCtaButton}
            onPress={handleCreatePost}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyCtaText}>Create first post</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderLoadingState = () => (
    <View>
      {[0, 1, 2, 3].map((i) => (
        <React.Fragment key={i}>
          <SkeletonPostCard />
          {i < 3 && <View style={styles.postDivider} />}
        </React.Fragment>
      ))}
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="warning-outline" size={48} color={colors.warning} />
      <Text style={styles.errorTitle}>Couldn&apos;t load posts</Text>
      <Text style={styles.errorMessage}>{loadError || 'Please try again.'}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetryLoad} activeOpacity={0.8}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
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
          <TouchableOpacity style={styles.iconButton} onPress={handleSearchPress}>
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
          <TouchableOpacity style={styles.iconButton} onPress={handleNotificationsPress}>
            <Ionicons name="notifications-outline" size={24} color={colors.text.primary} />
            {unreadNotifCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </Text>
              </View>
            )}
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

      {/* Posts Feed + New Posts Pill */}
      <View style={styles.feedContainer}>
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={({ item }) => (
            <PostCard
              title={item.title}
              description={item.description}
              timestamp={item.created_at}
              imageUrls={item.photos}
              tags={item.tags}
              isGlobal={item.is_global}
              isVerified={(item.author?.trust_level ?? 0) >= TrustLevel.VERIFIED}
              authorName={item.author?.full_name}
              authorPhotoUrl={item.author?.profile_photo}
              authorTrustLevel={item.author?.trust_level ?? 0}
              likesCount={item.likes_count ?? 0}
              commentsCount={item.comments_count ?? 0}
              isLiked={likedPostIds.has(item.id)}
              isSaved={savedPostIds.has(item.id)}
              onPress={() => handlePostPress(item)}
              onLikePress={() => handleLikePress(item)}
              onCommentPress={() => handleCommentPress(item)}
              onSavePress={item.author_id !== user?.id ? () => handleSaveFromCard(item) : undefined}
              authorId={item.author_id}
              currentUserId={user?.id}
              onTagPress={handleTagChipPress}
              onAvatarViewProfile={() => handleAvatarViewProfile(item.author_id)}
              onAvatarChat={() => handleAvatarChat(item)}
              onMorePress={() => handleMorePress(item)}
              onMediaPress={() => handlePostPress(item)}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.postsContent}
          ItemSeparatorComponent={() => <View style={styles.postDivider} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary.main}
            />
          }
          ListHeaderComponent={renderCreatePostBanner}
          ListEmptyComponent={initialLoading ? renderLoadingState : loadError ? renderErrorState : renderEmptyState}
        />

        {/* New Posts Pill */}
        {newPostsCount > 0 && (
          <Animated.View
            style={[styles.newPostsPill, { transform: [{ translateY: pillTranslateY }] }]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={styles.newPostsPillButton}
              onPress={() => {
                loadPostsRef.current();
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.newPostsPillText}>
                ↑ {newPostsCount} new post{newPostsCount > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

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
        isSaved={savedPostIds.has(morePost?.id ?? '')}
        onSave={handleMoreSave}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, isLevel0 && styles.fabDisabled]}
        onPress={handleCreatePost}
        activeOpacity={0.8}
        testID="create-post-fab"
      >
        <Ionicons name="add" size={32} color={colors.white} />
      </TouchableOpacity>

      {saveToast && (
        <Animated.View style={[styles.saveToast, { opacity: saveToastOpacity }]} pointerEvents="none">
          <Text style={styles.saveToastText}>{saveToast}</Text>
        </Animated.View>
      )}
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
  feedContainer: {
    flex: 1,
    position: 'relative',
  },
  postsContent: {
    paddingBottom: 80,
  },
  postDivider: {
    height: 8,
    backgroundColor: colors.background,
  },
  newPostsPill: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  newPostsPillButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 20,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
  },
  newPostsPillText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.m,
  },
  emptyIllustration: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
  },
  emptyIllustrationEmoji: {
    fontSize: 46,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyCtaButton: {
    marginTop: spacing.m,
    paddingHorizontal: spacing.l,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.primary.main,
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.m,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.s,
  },
  errorMessage: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.s,
    height: 44,
    paddingHorizontal: spacing.m,
    borderRadius: 10,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    ...typography.button,
    color: colors.white,
  },
  createPostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  createPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  createPostAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary.main,
  },
  createPostInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    paddingHorizontal: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createPostPlaceholder: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  createPostButton: {
    flexShrink: 0,
    height: 40,
    paddingHorizontal: spacing.s,
    borderRadius: 20,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPostButtonDisabled: {
    opacity: 0.5,
  },
  createPostButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
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
  saveToast: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 999,
  },
  saveToastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
