import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  StatusBar,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getMetroArea } from '../../utils/storage';
import { supabase } from '../../config/supabase';
import { ProfileStackParamList } from '../../types/navigation';
import {
  TrustLevel,
  getPostsByAuthorId,
  getSavedPostsByUserId,
  unsavePost,
  formatRelativeTime,
  getTrustLabel,
} from '@nepally/shared';
import type { Post, MarketplaceListing } from '@nepally/shared';
import { getListingsByOwner, LISTING_SOFT_EXPIRY_DAYS } from '@nepally/shared';
import { Avatar } from '../../components/Avatar';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius } from '../../styles/spacing';

type Navigation = NativeStackNavigationProp<ProfileStackParamList, 'ProfileView'>;

export function ProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const { user, signOut } = useAuth();
  const userId = user?.id ?? null;
  const [metroName, setMetroName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const menuButtonRef = useRef<View>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'listings' | 'saved' | 'about'>('posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [userListings, setUserListings] = useState<MarketplaceListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveToastOpacity = useRef(new Animated.Value(0)).current;
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadMetroArea();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.metro_area_id]);

  useEffect(() => {
    if (!userId) return;
    const currentUserId = userId;

    let isMounted = true;

    async function loadUserPosts() {
      setPostsLoading(true);
      setPostsError(null);
      // includeOwnPending: this is the viewer's own profile, so a pending
      // Emergency post they submitted should still show up while it waits.
      const result = await getPostsByAuthorId(supabase, currentUserId, 30, undefined, true);

      if (!isMounted) return;

      if (result.error) {
        setPostsError(result.error.message || 'Failed to load posts');
        setUserPosts([]);
      } else {
        setUserPosts(result.data || []);
      }

      setPostsLoading(false);
    }

    async function loadSavedPosts() {
      setSavedLoading(true);
      setSavedError(null);
      const result = await getSavedPostsByUserId(supabase, currentUserId, 30);

      if (!isMounted) return;

      if (result.error) {
        setSavedError(result.error.message || 'Failed to load saved posts');
        setSavedPosts([]);
      } else {
        setSavedPosts(result.data || []);
      }

      setSavedLoading(false);
    }

    async function loadUserListings() {
      setListingsLoading(true);
      const result = await getListingsByOwner(supabase, currentUserId, 30);
      if (!isMounted) return;
      setUserListings(result.data || []);
      setListingsLoading(false);
    }

    loadUserPosts();
    loadSavedPosts();
    loadUserListings();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const loadMetroArea = async () => {
    // Try cached first
    const cached = await getMetroArea();
    if (cached) {
      setMetroName(`${cached.name}, ${cached.state}`);
      return;
    }

    // Fallback to Supabase
    if (user?.metro_area_id) {
      const { data } = await supabase
        .from('metro_areas')
        .select('name, state')
        .eq('id', user.metro_area_id)
        .single();
      if (data) {
        setMetroName(`${data.name}, ${data.state}`);
      }
    }
  };

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

  const handleUnsave = (postId: string) => {
    Alert.alert('Unsave Post', 'Remove this post from your saved posts?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unsave',
        style: 'destructive',
        onPress: async () => {
          setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
          const { error } = await unsavePost(supabase, postId);
          showSaveToast(error ? 'Failed to unsave post.' : 'Post unsaved.');
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleViewProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleOpenChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleMenuPress = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    if (menuButtonRef.current) {
      menuButtonRef.current.measure((_x, _y, width, height, pageX, pageY) => {
        const screenWidth = Dimensions.get('window').width;
        setMenuAnchor({ top: pageY + height + 4, right: screenWidth - pageX - width });
        setMenuOpen(true);
      });
    } else {
      setMenuOpen(true);
    }
  };

  const trustLevel = user?.trust_level ?? 0;

  const trustBadgeStyle =
    trustLevel === TrustLevel.NEW
      ? styles.trustBadgeNew
      : trustLevel === TrustLevel.VERIFIED
        ? styles.trustBadgeVerified
        : styles.trustBadgeContributor;

  function renderPosts(posts: Post[], loading: boolean, error: string | null, emptyMessage: string) {
    if (loading) {
      return <Text style={styles.tabMessage}>Loading...</Text>;
    }

    if (error) {
      return <Text style={styles.tabError}>{error}</Text>;
    }

    if (posts.length === 0) {
      return <Text style={styles.tabMessage}>{emptyMessage}</Text>;
    }

    return (
      <View style={styles.postList}>
        {posts.map((post) => (
          <View key={post.id} style={styles.postItem}>
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
          </View>
        ))}
      </View>
    );
  }

  function renderListingsTab() {
    if (listingsLoading) {
      return <Text style={styles.tabMessage}>Loading...</Text>;
    }
    if (userListings.length === 0) {
      return <Text style={styles.tabMessage}>No marketplace listings yet.</Text>;
    }

    return (
      <View style={styles.postList}>
        {userListings.map((listing) => {
          const statusColor =
            listing.status === 'active' ? '#2E7D32' :
            listing.status === 'inactive' ? '#F57C00' : '#C62828';
          const statusBg =
            listing.status === 'active' ? '#E8F5E9' :
            listing.status === 'inactive' ? '#FFF3E0' : '#FFEBEE';
          const daysUntilExpiry = Math.max(
            0,
            LISTING_SOFT_EXPIRY_DAYS -
              Math.floor((Date.now() - new Date(listing.refreshed_at).getTime()) / (1000 * 60 * 60 * 24))
          );

          return (
            <TouchableOpacity
              key={listing.id}
              style={styles.postItem}
              onPress={() => navigation.getParent()?.navigate('Marketplace', {
                screen: 'ListingDetail',
                params: { listingId: listing.id },
              })}
            >
              {listing.photos.length > 0 ? (
                <Image source={listing.photos[0]} style={styles.listingThumb} contentFit="cover" />
              ) : (
                <View style={[styles.listingThumbPlaceholder, { backgroundColor: (listing.category?.color ?? '#9E9E9E') + '20' }]}>
                  <Text style={styles.listingThumbEmoji}>{listing.category?.emoji ?? '📦'}</Text>
                </View>
              )}
              <View style={styles.postItemHeader}>
                <Text style={styles.postItemTitle} numberOfLines={1}>
                  {listing.title}
                </Text>
                <View style={[styles.listingStatusBadge, { backgroundColor: statusBg }]}>
                  <Text style={[styles.listingStatusText, { color: statusColor }]}>
                    {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.postMetaRow}>
                <Text style={styles.postMetaText}>{listing.category?.emoji} {listing.category?.name}</Text>
                {listing.price ? <Text style={styles.postMetaText}>{listing.price}</Text> : null}
              </View>
              <View style={styles.postMetaRow}>
                <Text style={styles.postMetaText}>{listing.views_count} views</Text>
                <Text style={styles.postMetaText}>{listing.saves_count} saves</Text>
                <Text style={styles.postMetaText}>{listing.contacts_count} contacts</Text>
              </View>
              {daysUntilExpiry <= 14 && listing.status === 'active' && (
                <Text style={styles.listingExpiryWarning}>
                  Expires in {daysUntilExpiry} days
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderSavedPostsTab() {
    if (savedLoading) {
      return <Text style={styles.tabMessage}>Loading...</Text>;
    }
    if (savedError) {
      return <Text style={styles.tabError}>{savedError}</Text>;
    }
    if (savedPosts.length === 0) {
      return <Text style={styles.tabMessage}>No saved posts yet.</Text>;
    }

    return (
      <View style={styles.postList}>
        {savedPosts.map((post) => (
          <View key={post.id} style={styles.postItem}>
            <View style={styles.postItemHeader}>
              <Text style={styles.postItemTitle} numberOfLines={1}>
                {post.title}
              </Text>
              <View style={[styles.scopeBadge, post.is_global ? styles.scopeGlobal : styles.scopeLocal]}>
                <Text style={post.is_global ? styles.scopeTextGlobal : styles.scopeTextLocal}>
                  {post.is_global ? '🌐 Global' : '📍 Local'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.savedPostMenuBtn}
                onPress={() => handleUnsave(post.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.postItemDescription} numberOfLines={2}>
              {post.description}
            </Text>
            <View style={styles.postMetaRow}>
              <Text style={styles.postMetaText}>{formatRelativeTime(new Date(post.created_at))}</Text>
              <Text style={styles.postMetaText}>❤️ {post.likes_count || 0}</Text>
              <Text style={styles.postMetaText}>💬 {post.comments_count || 0}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <Text style={styles.pageTitle}>Profile</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity
              ref={menuButtonRef}
              style={styles.menuButton}
              onPress={handleMenuPress}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={22} color={colors.text.primary} />
            </TouchableOpacity>

            <Modal
              visible={menuOpen}
              transparent
              animationType="none"
              onRequestClose={() => setMenuOpen(false)}
            >
              <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
                <View style={styles.modalBackdrop}>
                  <TouchableWithoutFeedback onPress={() => {}}>
                    <View style={[styles.menuDropdown, { top: menuAnchor.top, right: menuAnchor.right }]}>
                      <TouchableOpacity
                        style={styles.menuDropdownItem}
                        onPress={() => { setMenuOpen(false); handleViewProfile(); }}
                      >
                        <Text style={styles.menuDropdownText}>Edit Profile</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.menuDropdownItem}
                        onPress={() => { setMenuOpen(false); handleOpenChangePassword(); }}
                      >
                        <Text style={styles.menuDropdownText}>Change Password</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.menuDropdownItem}
                        onPress={() => { setMenuOpen(false); handleLogout(); }}
                      >
                        <Text style={styles.menuDropdownDanger}>Logout</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          </View>
        </View>

        {/* Avatar & Basic Info */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Avatar
              name={user?.full_name || '?'}
              photoUrl={user?.profile_photo}
              trustLevel={trustLevel}
              size="xlarge"
            />
          </View>
          <Text style={styles.name}>{user?.full_name || 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          {/* Trust Badge */}
          <View style={[styles.trustBadge, trustBadgeStyle]}>
            <Ionicons name="shield-checkmark" size={14} color={colors.white} />
            <Text style={styles.trustText}>
              Level {trustLevel} — {getTrustLabel(trustLevel)}
            </Text>
          </View>
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
              style={[styles.tabButton, activeTab === 'listings' ? styles.tabButtonActive : null]}
              onPress={() => setActiveTab('listings')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'listings' ? styles.tabButtonTextActive : null]}>
                Listings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'saved' ? styles.tabButtonActive : null]}
              onPress={() => setActiveTab('saved')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'saved' ? styles.tabButtonTextActive : null]}>
                Saved Posts
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

          {activeTab === 'posts' && renderPosts(userPosts, postsLoading, postsError, 'You have not created any posts yet.')}
          {activeTab === 'listings' && renderListingsTab()}
          {activeTab === 'saved' && renderSavedPostsTab()}

          {activeTab === 'about' && (
            <View>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    {metroName || 'No metro area set'}
                  </Text>
                  {user?.zip_code && (
                    <Text style={styles.infoSubtext}>ZIP {user.zip_code}</Text>
                  )}
                </View>
              </View>

              <Text style={styles.sectionTitle}>Activity</Text>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Posts</Text>
                <Text style={styles.aboutValue}>{userPosts.length}</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Listings</Text>
                <Text style={styles.aboutValue}>{userListings.length}</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Saved Posts</Text>
                <Text style={styles.aboutValue}>{savedPosts.length}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

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
  scrollContent: {
    paddingBottom: spacing.l,
    paddingHorizontal: spacing.m,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.s,
    marginBottom: spacing.s,
  },
  pageTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  menuContainer: {
    position: 'relative',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
  },
  menuDropdown: {
    position: 'absolute',
    minWidth: 170,
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  menuDropdownItem: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuDropdownText: {
    ...typography.body,
    color: colors.text.primary,
  },
  menuDropdownDanger: {
    ...typography.body,
    color: colors.error,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingTop: spacing.l,
    paddingBottom: spacing.m,
    paddingHorizontal: spacing.l,
  },
  avatarContainer: {
    marginBottom: spacing.s,
  },
  name: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  email: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.s,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.badge,
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
  section: {
    backgroundColor: colors.white,
    marginTop: spacing.xs,
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
  tabError: {
    ...typography.body,
    color: colors.error,
    paddingVertical: spacing.s,
  },
  postList: {
    gap: spacing.s,
  },
  postItem: {
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
  postItemTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
    flex: 1,
  },
  savedPostMenuBtn: {
    padding: 4,
    marginLeft: spacing.xs,
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
  postMetaText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.s,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.body,
    color: colors.text.primary,
  },
  infoSubtext: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
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
  listingThumb: {
    width: '100%',
    height: 120,
    borderRadius: borderRadius.input,
    resizeMode: 'cover',
    marginBottom: spacing.s,
  },
  listingThumbPlaceholder: {
    width: '100%',
    height: 80,
    borderRadius: borderRadius.input,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  listingThumbEmoji: {
    fontSize: 32,
  },
  listingStatusBadge: {
    borderRadius: borderRadius.badge,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  listingStatusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  listingExpiryWarning: {
    ...typography.caption,
    color: '#F57C00',
    marginTop: spacing.xs,
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
