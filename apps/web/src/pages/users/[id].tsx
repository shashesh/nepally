import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  TRUST_LEVELS,
  getUserById,
  getPostsByAuthorId,
  getEventsByOrganizer,
  getOrCreateConversation,
  formatRelativeTime,
  formatPublicName,
} from '@nusa/shared';
import type { User, Post, TrustLevel, Event } from '@nusa/shared';
import Avatar from '../../components/Avatar';
import styles from '../../styles/PublicProfile.module.css';

type ProfileTab = 'posts' | 'events' | 'about';

export default function PublicProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [metroName, setMetroName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [messagingLoading, setMessagingLoading] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      const result = await getUserById(supabase, id as string);

      if (!isMounted) return;

      if (result.error || !result.data) {
        setError('Could not load profile.');
        setLoading(false);
        return;
      }

      setProfileUser(result.data);
      setLoading(false);

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
      const result = await getPostsByAuthorId(supabase, id as string, 30);
      if (!isMounted) return;
      setUserPosts(result.data || []);
      setPostsLoading(false);
    }

    async function loadEvents() {
      setEventsLoading(true);
      const result = await getEventsByOrganizer(supabase, id as string);
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
  }, [id]);

  async function handleMessage() {
    if (!currentUser || !profileUser) {
      router.push('/login');
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
      router.push(`/messages/${result.data.conversationId}`);
    } else {
      alert('Failed to start conversation. Please try again.');
    }
  }

  if (loading) {
    return (
      <>
        <Head><title>Profile - NUSA</title></Head>
        <div className={styles.loadingPage}>Loading profile...</div>
      </>
    );
  }

  if (error || !profileUser) {
    return (
      <>
        <Head><title>Profile - NUSA</title></Head>
        <div className={styles.errorPage}>{error || 'Profile not found.'}</div>
      </>
    );
  }

  const trustConfig = TRUST_LEVELS[profileUser.trust_level as TrustLevel];
  const trustLabel = trustConfig?.name || 'Unknown';
  const trustClass =
    profileUser.trust_level === 0
      ? styles.trustNew
      : profileUser.trust_level === 1
        ? styles.trustVerified
        : styles.trustContributor;

  const memberSinceYear = new Date(profileUser.created_at).getFullYear();
  const isOwnProfile = currentUser?.id === profileUser.id;
  const publicName = formatPublicName(profileUser.full_name);

  function renderPosts() {
    if (postsLoading) return <div className={styles.tabMessage}>Loading...</div>;
    if (userPosts.length === 0) return <div className={styles.tabMessage}>No posts yet.</div>;

    return (
      <div className={styles.postList}>
        {userPosts.map((post) => (
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

  function renderEvents() {
    if (eventsLoading) return <div className={styles.tabMessage}>Loading...</div>;
    if (userEvents.length === 0) return <div className={styles.tabMessage}>No events yet.</div>;

    return (
      <div className={styles.eventList}>
        {userEvents.map((event) => {
          const isPast = new Date(event.end_date ?? event.start_date) < new Date();
          const isCancelled = event.status === 'cancelled';

          return (
            <Link key={event.id} href={`/events/${event.id}`} className={styles.eventItem}>
              <div className={styles.eventItemTop}>
                <span className={styles.eventItemTitle}>{event.title}</span>
                {event.is_global ? (
                  <span className={`${styles.eventScopeBadge} ${styles.eventScopeGlobal}`}>🌐 Global</span>
                ) : (
                  <span className={`${styles.eventScopeBadge} ${styles.eventScopeLocal}`}>📍 Local</span>
                )}
              </div>
              <p className={styles.eventItemMeta}>
                {new Date(event.start_date).toLocaleDateString()}
                {' · '}
                {event.location_name}
              </p>
              <div className={styles.eventItemBottom}>
                <span className={styles.eventRsvp}>{event.rsvp_count} going</span>
                {isCancelled && <span className={styles.eventStateCancelled}>Cancelled</span>}
                {!isCancelled && isPast && <span className={styles.eventStatePast}>Past</span>}
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{publicName} - NUSA</title>
      </Head>
      <div className={styles.profilePage}>
        <div className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <div className={styles.avatarSection}>
              <Avatar
                name={profileUser.full_name}
                photoUrl={profileUser.profile_photo}
                trustLevel={profileUser.trust_level}
                size="xlarge"
              />
            </div>
            <div className={styles.profileInfo}>
              <div className={styles.profileName}>{publicName}</div>
              <span className={`${styles.trustBadge} ${trustClass}`}>
                {profileUser.trust_level === 1 && '✓ '}
                {profileUser.trust_level === 2 && '✓✓ '}
                Level {profileUser.trust_level}: {trustLabel}
              </span>
              {!isOwnProfile && (
                <button
                  className={styles.messageBtn}
                  onClick={handleMessage}
                  disabled={messagingLoading}
                  type="button"
                >
                  {messagingLoading ? 'Opening...' : '💬 Message'}
                </button>
              )}
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
              className={`${styles.menuTab} ${activeTab === 'events' ? styles.menuTabActive : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Events
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
            {activeTab === 'posts' && renderPosts()}

            {activeTab === 'events' && renderEvents()}

            {activeTab === 'about' && (
              <div className={styles.infoSection}>
                <h2 className={styles.sectionTitle}>About</h2>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Location</span>
                  <span className={styles.infoValue}>{metroName || 'Not set'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Member Since</span>
                  <span className={styles.infoValue}>{memberSinceYear}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Posts</span>
                  <span className={styles.infoValue}>{userPosts.length}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Events</span>
                  <span className={styles.infoValue}>{userEvents.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
