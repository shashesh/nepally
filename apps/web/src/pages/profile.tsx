import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  TRUST_LEVELS,
  getPostsByAuthorId,
  getSavedPostsByUserId,
  unsavePost,
  formatRelativeTime,
  uploadProfilePhoto,
  deleteProfilePhoto,
  updateUserProfile,
} from '@nusa/shared';
import type { Post, TrustLevel } from '@nusa/shared';
import Avatar from '../components/Avatar';
import styles from '../styles/Profile.module.css';

type ProfileTab = 'posts' | 'saved' | 'about';

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [menuStatus, setMenuStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [unsaveMenuId, setUnsaveMenuId] = useState<string | null>(null);
  const [unsaveToast, setUnsaveToast] = useState<string | null>(null);
  const unsaveToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
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

    loadUserPosts();
    loadSavedPosts();

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
    } catch (error: any) {
      setMenuStatus({
        type: 'error',
        message: error?.message || 'Failed to log out. Please try again.',
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
      setMenuStatus({ type: 'error', message: 'Name cannot be empty' });
      setMenuOpen(false);
      return;
    }

    const { error } = await updateUserProfile(supabase, user.id, {
      full_name: fullName,
    });

    if (error) {
      setMenuStatus({ type: 'error', message: error.message || 'Failed to update profile' });
      setMenuOpen(false);
      return;
    }

    await refreshUser();
    setMenuStatus({ type: 'success', message: 'Profile updated' });
    setMenuOpen(false);
  }

  async function handleChangePassword() {
    if (!user) return;

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      setMenuStatus({ type: 'error', message: error.message || 'Failed to send password reset email' });
    } else {
      setMenuStatus({ type: 'success', message: 'Password reset email sent' });
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
    } catch (error: any) {
      setPhotoStatus({
        type: 'error',
        message: error.message || 'Failed to upload photo',
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
    } catch (error: any) {
      setPhotoStatus({
        type: 'error',
        message: error.message || 'Failed to remove photo',
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
    if (unsaveToastTimer.current) clearTimeout(unsaveToastTimer.current);
    setUnsaveToast(error ? 'Failed to unsave post.' : 'Post unsaved.');
    unsaveToastTimer.current = setTimeout(() => setUnsaveToast(null), 2500);
  }

  function renderSavedPostList() {
    if (savedLoading) return <div className={styles.tabMessage}>Loading...</div>;
    if (savedError) return <div className={styles.tabError}>{savedError}</div>;
    if (savedPosts.length === 0) return <div className={styles.tabMessage}>No saved posts yet.</div>;

    return (
      <div className={styles.postList}>
        {savedPosts.map((post) => (
          <div key={post.id} className={styles.savedPostItem}>
            <Link href={`/posts/${post.id}`} className={styles.savedPostLink}>
              <div className={styles.postItemTop}>
                <span className={styles.postItemTitle}>{post.title}</span>
                <span
                  className={`${styles.postScopeBadge} ${
                    post.is_global ? styles.postScopeGlobal : styles.postScopeLocal
                  }`}
                >
                  {post.is_global ? '🌐 Global' : '📍 Local'}
                </span>
              </div>
              <p className={styles.postItemDescription}>{post.description}</p>
              <div className={styles.postItemMeta}>
                <span>{formatRelativeTime(new Date(post.created_at))}</span>
                <span>❤️ {post.likes_count || 0}</span>
                <span>💬 {post.comments_count || 0}</span>
              </div>
            </Link>
            <div className={styles.savedPostMenu}>
              <button
                className={styles.savedPostMenuBtn}
                onClick={() => setUnsaveMenuId(unsaveMenuId === post.id ? null : post.id)}
                aria-label="Post options"
              >
                ⋮
              </button>
              {unsaveMenuId === post.id && (
                <div
                  className={styles.savedPostMenuDropdown}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    className={styles.savedPostMenuItem}
                    onClick={() => handleUnsave(post.id)}
                  >
                    Unsave Post
                  </button>
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
      return <div className={styles.tabMessage}>Loading...</div>;
    }

    if (error) {
      return <div className={styles.tabError}>{error}</div>;
    }

    if (posts.length === 0) {
      return <div className={styles.tabMessage}>{emptyText}</div>;
    }

    return (
      <div className={styles.postList}>
        {posts.map((post) => (
          <Link key={post.id} href={`/posts/${post.id}`} className={styles.postItem}>
            <div className={styles.postItemTop}>
              <span className={styles.postItemTitle}>{post.title}</span>
              <span
                className={`${styles.postScopeBadge} ${
                  post.is_global ? styles.postScopeGlobal : styles.postScopeLocal
                }`}
              >
                {post.is_global ? '🌐 Global' : '📍 Local'}
              </span>
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

  return (
    <>
      <Head>
        <title>Profile - NUSA</title>
      </Head>
      {unsaveToast && (
        <div className={styles.toast}>{unsaveToast}</div>
      )}
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
            <button
              className={styles.hamburgerBtn}
              type="button"
              aria-label="Open profile menu"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              ☰
            </button>

            {menuOpen && (
              <div className={styles.hamburgerMenu}>
                <button
                  className={styles.hamburgerItem}
                  type="button"
                  onClick={() => {
                    handleViewProfile();
                  }}
                >
                  View Profile
                </button>
                <button
                  className={styles.hamburgerItem}
                  type="button"
                  onClick={() => {
                    handleChangePassword();
                  }}
                >
                  Change Password
                </button>
                <button
                  className={`${styles.hamburgerItem} ${styles.hamburgerItemDanger}`}
                  type="button"
                  onClick={() => {
                    handleMenuLogout();
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {menuStatus && (
          <div
            className={
              menuStatus.type === 'success'
                ? styles.menuStatusSuccess
                : styles.menuStatusError
            }
          >
            {menuStatus.message}
          </div>
        )}

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
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  className={styles.photoBtn}
                >
                  {user.profile_photo ? 'Change Photo' : 'Add Photo'}
                </button>
                {user.profile_photo && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={photoUploading}
                    className={styles.photoBtnDanger}
                  >
                    Remove
                  </button>
                )}
              </div>
              {photoStatus && (
                <span
                  className={
                    photoStatus.type === 'success'
                      ? styles.photoSuccess
                      : styles.photoError
                  }
                >
                  {photoStatus.message}
                </span>
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

            {activeTab === 'saved' && renderSavedPostList()}

            {activeTab === 'about' && (
              <>
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
