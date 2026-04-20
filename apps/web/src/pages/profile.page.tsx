import React, { useEffect, useState, useRef } from 'react';
import { ActionIcon, Badge, Button, Center, Text, UnstyledButton } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  TRUST_LEVELS,
  BIO_MAX_LENGTH,
  bioSchema,
  getPostsByAuthorId,
  getSavedPostsByUserId,
  unsavePost,
  formatRelativeTime,
  uploadProfilePhoto,
  deleteProfilePhoto,
  updateUserProfile,
} from '@nepally/shared';
import type { Post, TrustLevel, MarketplaceListing } from '@nepally/shared';
import { getListingsByOwner, LISTING_SOFT_EXPIRY_DAYS } from '@nepally/shared';
import Avatar from '../components/Avatar';
import styles from '../styles/Profile.module.css';

type ProfileTab = 'posts' | 'listings' | 'saved' | 'about';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [unsaveMenuId, setUnsaveMenuId] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [userListings, setUserListings] = useState<MarketplaceListing[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [savedError, setSavedError] = useState<string | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      router.replace('/login');
    }
  }, [user, router]);


  useEffect(() => {
    if (!userId) return;
    const currentUserId = userId;

    let isMounted = true;

    async function loadUserPosts() {
      setPostsLoading(true);
      setPostsError(null);

      const result = await getPostsByAuthorId(supabase, currentUserId, 30);
      if (!isMounted) return;

      if (result.error) {
        setPostsError(result.error.message || 'Failed to load your posts');
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

  useEffect(() => {
    if (!unsaveMenuId) return;
    function handleClickOutside() {
      setUnsaveMenuId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [unsaveMenuId]);

  if (!user) {
    return null;
  }

  const trustConfig = TRUST_LEVELS[user.trust_level as TrustLevel];
  const trustClass =
    user.trust_level === 0
      ? styles.trustNew
      : user.trust_level === 1
        ? styles.trustVerified
        : styles.trustContributor;

  const trustLabel = trustConfig?.name || 'Unknown';

  async function handleSignOut() {
    try {
      await signOut();
      router.push('/');
    } catch (error: unknown) {
      notifications.show({
        message: getErrorMessage(error, 'Failed to log out. Please try again.'),
        color: 'red',
      });
    }
  }

  async function handleViewProfile() {
    if (!user) return;

    const nextName = window.prompt('Update your full name', user.full_name || '');
    if (nextName === null) {
      setMenuOpen(false);
      return;
    }

    const fullName = nextName.trim();
    if (!fullName) {
      notifications.show({ message: 'Name cannot be empty', color: 'red' });
      setMenuOpen(false);
      return;
    }

    const { error } = await updateUserProfile(supabase, user.id, {
      full_name: fullName,
    });

    if (error) {
      notifications.show({ message: error.message || 'Failed to update profile', color: 'red' });
      setMenuOpen(false);
      return;
    }

    await refreshUser();
    notifications.show({ message: 'Profile updated' });
    setMenuOpen(false);
  }

  async function handleEditBio() {
    if (!user) return;

    const currentBio = user.bio ?? '';
    const nextBio = window.prompt(
      `Update your bio (max ${BIO_MAX_LENGTH} characters)`,
      currentBio
    );

    if (nextBio === null) {
      setMenuOpen(false);
      return;
    }

    const parsed = bioSchema.safeParse(nextBio);
    if (!parsed.success) {
      notifications.show({
        message: parsed.error.issues[0]?.message || 'Invalid bio',
        color: 'red',
      });
      setMenuOpen(false);
      return;
    }

    const { error } = await updateUserProfile(supabase, user.id, {
      bio: parsed.data,
    });

    if (error) {
      notifications.show({
        message: error.message || 'Failed to update bio',
        color: 'red',
      });
      setMenuOpen(false);
      return;
    }

    await refreshUser();
    notifications.show({
      message: parsed.data ? 'Bio updated' : 'Bio cleared',
    });
    setMenuOpen(false);
  }

  async function handleChangePassword() {
    if (!user) return;

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      notifications.show({ message: error.message || 'Failed to send password reset email', color: 'red' });
    } else {
      notifications.show({ message: 'Password reset email sent' });
    }

    setMenuOpen(false);
  }

  async function handleMenuLogout() {
    setMenuOpen(false);
    await handleSignOut();
  }

  async function processAndUpload(file: File) {
    setPhotoUploading(true);
    setPhotoStatus(null);

    try {
      // Resize image on a canvas
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 500;
      const ctx = canvas.getContext('2d')!;

      // Center-crop: draw the largest square from the center of the image
      const srcSize = Math.min(bitmap.width, bitmap.height);
      const srcX = (bitmap.width - srcSize) / 2;
      const srcY = (bitmap.height - srcSize) / 2;
      ctx.drawImage(bitmap, srcX, srcY, srcSize, srcSize, 0, 0, 500, 500);

      // Convert to JPEG blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
          'image/jpeg',
          0.8
        );
      });

      // Convert blob to ArrayBuffer for the shared API
      const arrayBuffer = await blob.arrayBuffer();

      const { url, error: uploadError } = await uploadProfilePhoto(
        supabase,
        user!.id,
        arrayBuffer
      );
      if (uploadError) throw uploadError;

      const { error: profileError } = await updateUserProfile(supabase, user!.id, {
        profile_photo: url,
      });
      if (profileError) throw profileError;

      await refreshUser();
      setPhotoStatus({ type: 'success', message: 'Photo updated' });
    } catch (error: unknown) {
      setPhotoStatus({
        type: 'error',
        message: getErrorMessage(error, 'Failed to upload photo'),
      });
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleRemovePhoto() {
    setPhotoUploading(true);
    setPhotoStatus(null);

    try {
      await deleteProfilePhoto(supabase, user!.id);
      const { error: profileError } = await updateUserProfile(supabase, user!.id, {
        profile_photo: undefined,
      });
      if (profileError) throw profileError;

      await refreshUser();
      setPhotoStatus({ type: 'success', message: 'Photo removed' });
    } catch (error: unknown) {
      setPhotoStatus({
        type: 'error',
        message: getErrorMessage(error, 'Failed to remove photo'),
      });
    } finally {
      setPhotoUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processAndUpload(file);
    }
    // Reset so the same file can be re-selected
    e.target.value = '';
  }

  async function handleUnsave(postId: string) {
    setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
    setUnsaveMenuId(null);
    const { error } = await unsavePost(supabase, postId);
    notifications.show({
      message: error ? 'Failed to unsave post.' : 'Post unsaved.',
      autoClose: 2500,
    });
  }

  function renderSavedPostList() {
    if (savedLoading) return <Center p="xl"><Text c="dimmed">Loading...</Text></Center>;
    if (savedError) return <Text c="red" p="md">{savedError}</Text>;
    if (savedPosts.length === 0) return <Center p="xl"><Text c="dimmed">No saved posts yet.</Text></Center>;

    return (
      <div className={styles.postList}>
        {savedPosts.map((post) => (
          <div key={post.id} className={styles.savedPostItem}>
            <Link href={`/posts/${post.id}`} className={styles.savedPostLink}>
              <div className={styles.postItemTop}>
                <span className={styles.postItemTitle}>{post.title}</span>
                <Badge variant="light" color={post.is_global ? 'orange' : 'blue'}>
                  {post.is_global ? '🌐 Global' : '📍 Local'}
                </Badge>
              </div>
              <p className={styles.postItemDescription}>{post.description}</p>
              <div className={styles.postItemMeta}>
                <span>{formatRelativeTime(new Date(post.created_at))}</span>
                <span>❤️ {post.likes_count || 0}</span>
                <span>💬 {post.comments_count || 0}</span>
              </div>
            </Link>
            <div className={styles.savedPostMenu}>
              <ActionIcon variant="subtle" color="gray" size="sm"
                onClick={() => setUnsaveMenuId(unsaveMenuId === post.id ? null : post.id)}
                aria-label="Post options"
              >
                ⋮
              </ActionIcon>
              {unsaveMenuId === post.id && (
                <div
                  className={styles.savedPostMenuDropdown}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <UnstyledButton
                    className={styles.savedPostMenuItem}
                    onClick={() => handleUnsave(post.id)}
                  >
                    Unsave Post
                  </UnstyledButton>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderPostList(
    posts: Post[],
    loading: boolean,
    error: string | null,
    emptyText: string
  ) {
    if (loading) {
      return <Center p="xl"><Text c="dimmed">Loading...</Text></Center>;
    }

    if (error) {
      return <Text c="red" p="md">{error}</Text>;
    }

    if (posts.length === 0) {
      return <Center p="xl"><Text c="dimmed">{emptyText}</Text></Center>;
    }

    return (
      <div className={styles.postList}>
        {posts.map((post) => (
          <Link key={post.id} href={`/posts/${post.id}`} className={styles.postItem}>
            <div className={styles.postItemTop}>
              <span className={styles.postItemTitle}>{post.title}</span>
              <Badge variant="light" color={post.is_global ? 'orange' : 'blue'}>
                {post.is_global ? '🌐 Global' : '📍 Local'}
              </Badge>
            </div>
            <p className={styles.postItemDescription}>{post.description}</p>
            <div className={styles.postItemMeta}>
              <span>{formatRelativeTime(new Date(post.created_at))}</span>
              <span>❤️ {post.likes_count || 0}</span>
              <span>💬 {post.comments_count || 0}</span>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  function renderListingsList() {
    if (listingsLoading) return <Center p="xl"><Text c="dimmed">Loading...</Text></Center>;
    if (userListings.length === 0) return <Center p="xl"><Text c="dimmed">No marketplace listings yet.</Text></Center>;

    return (
      <div className={styles.postList}>
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
          const isExpiringSoon = daysUntilExpiry <= 14 && listing.status === 'active';

          return (
            <Link key={listing.id} href={`/marketplace/listing/${listing.id}`} className={styles.postItem}>
              {listing.photos.length > 0 ? (
                <div className={styles.listingThumbWrapper}>
                  <Image src={listing.photos[0]} alt={listing.title} className={styles.listingThumb} fill />
                </div>
              ) : (
                <div className={styles.listingThumbPlaceholder}>
                  {listing.category?.emoji ?? '📦'}
                </div>
              )}
              <div className={styles.postItemTop}>
                <span className={styles.postItemTitle}>{listing.title}</span>
                <Badge variant="light" styles={{ root: { backgroundColor: statusBg, color: statusColor } }}>
                  {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                </Badge>
              </div>
              <div className={styles.postItemMeta}>
                <span>{listing.category?.emoji} {listing.category?.name}</span>
                {listing.price && <span className={styles.listingPrice}>{listing.price}</span>}
              </div>
              <div className={styles.postItemMeta}>
                <span>{listing.views_count} views</span>
                <span>{listing.saves_count} saves</span>
                <span>{listing.contacts_count} contacts</span>
              </div>
              {isExpiringSoon && (
                <div className={styles.listingExpiry}>
                  Expires in {daysUntilExpiry} days
                </div>
              )}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Profile - Nepally</title>
      </Head>
      <div className={styles.profilePage}>
        {menuOpen && (
          <div
            className={styles.menuOverlay}
            onClick={() => setMenuOpen(false)}
            onTouchStart={() => setMenuOpen(false)}
          />
        )}
        <div className={styles.topBar}>
          <h1 className={styles.pageTitle}>Profile</h1>
          <div className={styles.menuWrap}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              aria-label="Open profile menu"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              ☰
            </ActionIcon>

            {menuOpen && (
              <div className={styles.hamburgerMenu}>
                <UnstyledButton
                  className={styles.hamburgerItem}
                  onClick={() => {
                    handleViewProfile();
                  }}
                >
                  Edit Name
                </UnstyledButton>
                <UnstyledButton
                  className={styles.hamburgerItem}
                  onClick={() => {
                    handleEditBio();
                  }}
                >
                  Edit Bio
                </UnstyledButton>
                <UnstyledButton
                  className={styles.hamburgerItem}
                  onClick={() => {
                    handleChangePassword();
                  }}
                >
                  Change Password
                </UnstyledButton>
                <UnstyledButton
                  className={`${styles.hamburgerItem} ${styles.hamburgerItemDanger}`}
                  onClick={() => {
                    handleMenuLogout();
                  }}
                >
                  Logout
                </UnstyledButton>
              </div>
            )}
          </div>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrapper}>
                <Avatar
                  name={user.full_name || '?'}
                  photoUrl={user.profile_photo}
                  trustLevel={user.trust_level}
                  size="xlarge"
                />
                {photoUploading && <div className={styles.avatarOverlay}>...</div>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                aria-label="Upload profile photo"
                onChange={handleFileChange}
                className={styles.hiddenInput}
              />
              <div className={styles.photoActions}>
                <Button
                  variant="light"
                  size="compact-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                >
                  {user.profile_photo ? 'Change Photo' : 'Add Photo'}
                </Button>
                {user.profile_photo && (
                  <Button
                    variant="light"
                    color="red"
                    size="compact-sm"
                    onClick={handleRemovePhoto}
                    disabled={photoUploading}
                  >
                    Remove
                  </Button>
                )}
              </div>
              {photoStatus && (
                <Text
                  size="xs"
                  c={photoStatus.type === 'success' ? 'green' : 'red'}
                >
                  {photoStatus.message}
                </Text>
              )}
            </div>
            <div>
              <div className={styles.profileName}>{user.full_name}</div>
              <div className={styles.profileEmail}>{user.email}</div>
              <span className={`${styles.trustBadge} ${trustClass}`}>
                {user.trust_level === 1 && '✓ '}
                {user.trust_level === 2 && '✓✓ '}
                Level {user.trust_level}: {trustLabel}
              </span>
            </div>
          </div>
          <div className={styles.menuTabs}>
            <button
              type="button"
              className={`${styles.menuTab} ${activeTab === 'posts' ? styles.menuTabActive : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              Posts
            </button>
            <button
              type="button"
              className={`${styles.menuTab} ${activeTab === 'listings' ? styles.menuTabActive : ''}`}
              onClick={() => setActiveTab('listings')}
            >
              Listings
            </button>
            <button
              type="button"
              className={`${styles.menuTab} ${activeTab === 'saved' ? styles.menuTabActive : ''}`}
              onClick={() => setActiveTab('saved')}
            >
              Saved Posts
            </button>
            <button
              type="button"
              className={`${styles.menuTab} ${activeTab === 'about' ? styles.menuTabActive : ''}`}
              onClick={() => setActiveTab('about')}
            >
              About
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'posts' &&
              renderPostList(userPosts, postsLoading, postsError, 'You have not created any posts yet.')}

            {activeTab === 'listings' && renderListingsList()}

            {activeTab === 'saved' && renderSavedPostList()}

            {activeTab === 'about' && (
              <>
                <div className={styles.infoSection}>
                  <h2 className={styles.sectionTitle}>Bio</h2>
                  <div className={styles.infoRow}>
                    <span className={styles.infoValue}>
                      {user.bio || 'No bio set. Tap the menu → Edit Bio to add one.'}
                    </span>
                  </div>
                </div>

                <div className={styles.infoSection}>
                  <h2 className={styles.sectionTitle}>Account Info</h2>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Email</span>
                    <span className={styles.infoValue}>{user.email}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Phone</span>
                    <span className={styles.infoValue}>
                      {user.phone || 'Not set'}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>ZIP Code</span>
                    <span className={styles.infoValue}>
                      {user.zip_code || 'Not set'}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Member Since</span>
                    <span className={styles.infoValue}>
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className={styles.infoSection}>
                  <h2 className={styles.sectionTitle}>Activity</h2>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Posts</span>
                    <span className={styles.infoValue}>{user.posts_count || 0}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Helpful Votes</span>
                    <span className={styles.infoValue}>
                      {user.helpful_votes_received || 0}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
