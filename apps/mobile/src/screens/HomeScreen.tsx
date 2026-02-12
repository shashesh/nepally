import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { Level0Banner } from '../components/banners/Level0Banner';
import { PostCard } from '../components/cards/PostCard';
import { getPostsByMetroArea } from '../services/api/posts';
import { isBannerDismissed, saveBannerDismissed } from '../utils/storage';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { spacing } from '../styles/spacing';
import { TRUST_LEVELS, POST_CATEGORIES } from '../config/constants';

type Category = 'all' | 'housing' | 'jobs' | 'emergency' | 'travel';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'grid' },
  { id: 'housing', label: 'Housing', icon: 'home' },
  { id: 'jobs', label: 'Jobs', icon: 'briefcase' },
  { id: 'emergency', label: 'Emergency', icon: 'warning' },
  { id: 'travel', label: 'Travel', icon: 'airplane' },
] as const;

export default function HomeScreen() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category>('housing');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  const isLevel0 = user?.trust_level === TRUST_LEVELS.NEW;

  useEffect(() => {
    loadBannerState();
  }, []);

  useEffect(() => {
    if (user?.metro_area_id) {
      loadPosts();
    }
  }, [selectedCategory, user?.metro_area_id]);

  const loadBannerState = async () => {
    const dismissed = await isBannerDismissed('level0-banner');
    setBannerVisible(!dismissed);
  };

  const loadPosts = async () => {
    if (!user?.metro_area_id) return;

    setLoading(true);
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const result = await getPostsByMetroArea(user.metro_area_id, category);

      if (result.data) {
        setPosts(result.data);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
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

  const handleVerifyPress = () => {
    // TODO: Navigate to verification screen (Journey #02)
    Alert.alert(
      'Phone Verification',
      'Phone verification will be implemented in Journey #02',
      [{ text: 'OK' }]
    );
  };

  const handlePostPress = (post: any) => {
    if (isLevel0) {
      Alert.alert(
        'Verify to Message',
        'Please verify your phone number to view full post details and message the author.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: handleVerifyPress },
        ]
      );
    } else {
      // TODO: Navigate to post detail screen
      console.log('Navigate to post:', post.id);
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
      // TODO: Navigate to create post screen
      console.log('Create post');
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
        <View style={styles.headerLeft}>
          <Ionicons name="location" size={20} color={colors.primary.main} />
          <Text style={styles.metroName} numberOfLines={1}>
            {user?.metro_area_id ? 'Your Metro Area' : 'No Location Set'}
          </Text>
        </View>
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
            metadata={item.metadata?.rent ? `$${item.metadata.rent}/month` : item.description}
            timestamp={`Posted ${new Date(item.created_at).toLocaleDateString()}`}
            metroArea="Metro Area"
            isVerified={item.author?.trust_level >= TRUST_LEVELS.VERIFIED}
            onPress={() => handlePostPress(item)}
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
