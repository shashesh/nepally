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
import {
  getPostsByMetroArea,
  getUserLikedPostIds,
  likePost,
  unlikePost,
  getOrCreateConversation,
  TrustLevel,
} from '@nusa/shared';
import type { Post } from '@nusa/shared';
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

type Category = 'all' | 'housing' | 'jobs' | 'emergency' | 'travel';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'grid' },
  { id: 'housing', label: 'Housing', icon: 'home' },
  { id: 'jobs', label: 'Jobs', icon: 'briefcase' },
  { id: 'emergency', label: 'Emergency', icon: 'warning' },
  { id: 'travel', label: 'Travel', icon: 'airplane' },
] as const;

function getPostMetadata(item: Post): string {
  if (item.category === 'housing' && item.fields?.rentAmount) {
    return `$${item.fields.rentAmount}/month`;
  }
  if (item.category === 'jobs' && item.fields?.payRate) {
    const pay = item.fields.payRate;
    return `$${pay.min}–$${pay.max} ${pay.type}`;
  }
  if (item.category === 'travel' && item.fields?.route) {
    return `${item.fields.route.from} → ${item.fields.route.to}`;
  }
  if (item.category === 'emergency' && item.fields?.emergencyType) {
    return `${item.fields.urgency} – ${item.fields.emergencyType}`;
  }
  return item.description;
}

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
  const [selectedCategory, setSelectedCategory] = useState<Category>('housing');
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());

  const isLevel0 = user?.trust_level === TrustLevel.NEW;

  // Derive metroName from activeLocation (or fall back to user's metro)
  const metroAreaId = activeLocation?.metro_area_id ?? user?.metro_area_id;
  const metroName = activeLocation
    ? `${activeLocation.metro_name}, ${activeLocation.metro_state}`
    : null;

  useEffect(() => {
    loadBannerState();
  }, []);

  // Reload posts and liked state every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (metroAreaId) {
        loadPosts();
      }
      loadLikedPosts();
    }, [selectedCategory, metroAreaId])
  );

  const loadBannerState = async () => {
    const dismissed = await isBannerDismissed('level0-banner');
    setBannerVisible(!dismissed);
  };

  const loadPosts = async () => {
    if (!metroAreaId) return;

    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const result = await getPostsByMetroArea(supabase, metroAreaId!, category);

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

  const handleMessagePress = async (post: Post) => {
    if (!user || !post.author) return;

    if (isLevel0) {
      Alert.alert(
        'Verify to Message',
        'Please verify your phone number to message post authors.',
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
      post.author.full_name,
      post.id
    );

    if (result.data) {
      navigation.navigate('Messages', {
        screen: 'MessageThread',
        params: {
          conversationId: result.data.conversationId,
          otherUserId: post.author.id,
          otherUserName: post.author.full_name,
          otherUserTrustLevel: post.author.trust_level,
          postId: post.id,
          postTitle: post.title,
          postCategory: post.category,
        },
      });
    } else if (result.error) {
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
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

  const renderCategoryTab = (category: typeof CATEGORIES[number]) => {
    const isSelected = selectedCategory === category.id;

    return (
      <TouchableOpacity
        key={category.id}
        style={[styles.categoryTab, isSelected && styles.categoryTabActive]}
        onPress={() => setSelectedCategory(category.id as Category)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={category.icon as any}
          size={20}
          color={isSelected ? colors.primary.main : colors.text.secondary}
        />
        <Text
          style={[
            styles.categoryLabel,
            isSelected && styles.categoryLabelActive,
          ]}
        >
          {category.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color={colors.text.disabled} />
      <Text style={styles.emptyTitle}>No posts yet</Text>
      <Text style={styles.emptySubtitle}>
        Be the first to post in this category!
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
          <Text style={styles.metroName} numberOfLines={1}>
            {metroName || (metroAreaId ? 'Loading...' : 'No Location Set')}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.text.secondary} />
          {activeLocation?.is_temporary && (
            <Text style={styles.visitingLabel}>(Visiting)</Text>
          )}
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search" size={24} color={colors.text.primary} />
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

      {/* Category Tabs */}
      <View style={styles.categoryTabs}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          renderItem={({ item }) => renderCategoryTab(item)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoryTabsContent}
        />
      </View>

      {/* Posts Feed */}
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard
            category={item.category}
            title={item.title}
            description={item.description}
            metadata={getPostMetadata(item)}
            timestamp={item.created_at}
            metroArea={item.location_city ? `${item.location_city}, ${item.location_state}` : 'Metro Area'}
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
            onMessagePress={
              item.author_id !== user?.id
                ? () => handleMessagePress(item)
                : undefined
            }
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
    gap: spacing.xs,
  },
  metroName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  visitingLabel: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  iconButton: {
    padding: spacing.xs,
  },
  categoryTabs: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryTabsContent: {
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    gap: spacing.xs,
    borderRadius: 20,
  },
  categoryTabActive: {
    backgroundColor: colors.primary.light,
  },
  categoryLabel: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 14,
  },
  categoryLabelActive: {
    color: colors.primary.main,
    fontWeight: '600',
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
