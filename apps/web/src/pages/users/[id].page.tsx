import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Badge, Button, Tabs } from '@mantine/core';
import { formatPublicName, getFirstName, getOrCreateConversation, TrustLevel } from '@nepally/shared';
import type { Event, PublicUser } from '@nepally/shared';
import { EmptyState, LoadingState, TrustBadge, notify } from '../../components/ui';
import { PublicProfileHeader } from '../../components/users/PublicProfileHeader';
import { PostSummaryRow } from '../../components/posts/PostSummaryRow';
import { EventSummaryRow } from '../../components/events/EventSummaryRow';
import { ListingSummaryRow } from '../../components/marketplace/ListingSummaryRow';
import { useAuth } from '../../hooks/useAuth';
import { useNow } from '../../hooks/useNow';
import { usePublicProfile } from '../../hooks/usePublicProfile';
import { supabase } from '../../lib/supabase';
import styles from '../../styles/PublicProfile.module.css';

type ProfileTab = 'posts' | 'events' | 'listings' | 'about';

const TABS: { value: ProfileTab; label: string }[] = [
  { value: 'posts', label: 'Posts' },
  { value: 'events', label: 'Events' },
  { value: 'listings', label: 'Listings' },
  { value: 'about', label: 'About' },
];

interface ProfileShellProps {
  title: string;
  children: ReactNode;
  /** 'state' is the loading/not-found single-card layout; see .stateContainer. */
  variant?: 'default' | 'state';
}

function ProfileShell({ title, children, variant = 'default' }: ProfileShellProps) {
  const containerClassName =
    variant === 'state' ? `${styles.container} ${styles.stateContainer}` : styles.container;
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <div className={containerClassName}>{children}</div>
    </>
  );
}

interface RowListProps {
  loading: boolean;
  loadingLabel: string;
  isEmpty: boolean;
  emptyTitle: string;
  emptyAction?: ReactNode;
  children: ReactNode;
}

/** One tab's list: a skeleton while it loads, an empty state, or the rows. */
function RowList({ loading, loadingLabel, isEmpty, emptyTitle, emptyAction, children }: RowListProps) {
  if (loading) return <LoadingState label={loadingLabel} />;
  if (isEmpty) return <EmptyState title={emptyTitle} action={emptyAction} />;
  return <div className={styles.rowList}>{children}</div>;
}

function AboutRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.aboutRow}>
      <dt className={styles.aboutLabel}>{label}</dt>
      <dd className={styles.aboutValue}>{children}</dd>
    </div>
  );
}

interface AboutPanelProps {
  profileUser: PublicUser;
  metroName: string | null;
  postCount: number;
  eventCount: number;
  listingCount: number;
}

function AboutPanel({ profileUser, metroName, postCount, eventCount, listingCount }: AboutPanelProps) {
  return (
    <div className={styles.aboutSection}>
      <dl>
        {profileUser.bio && (
          <div className={styles.aboutBioBlock}>
            <dt className={styles.aboutLabel}>Bio</dt>
            <dd className={styles.aboutBio}>{profileUser.bio}</dd>
          </div>
        )}
        <AboutRow label="Location">{metroName || 'Not set'}</AboutRow>
        <AboutRow label="Member since">{new Date(profileUser.created_at).getFullYear()}</AboutRow>
        <AboutRow label="Trust level">
          <TrustBadge level={profileUser.trust_level} />
        </AboutRow>
      </dl>
      <div className={styles.aboutDivider} aria-hidden="true" />
      <dl>
        <AboutRow label="Posts">{postCount}</AboutRow>
        <AboutRow label="Events organized">{eventCount}</AboutRow>
        <AboutRow label="Active listings">{listingCount}</AboutRow>
      </dl>
    </div>
  );
}

interface EventsListProps {
  events: Event[];
  loading: boolean;
  emptyTitle: string;
  emptyAction?: ReactNode;
}

/**
 * The Events tab's rows. Its own component so useNow's interval runs only
 * while the tab is open: `keepMounted={false}` unmounts inactive panels.
 */
function EventsList({ events, loading, emptyTitle, emptyAction }: EventsListProps) {
  const now = useNow();
  return (
    <RowList
      loading={loading}
      loadingLabel="Loading events…"
      isEmpty={events.length === 0}
      emptyTitle={emptyTitle}
      emptyAction={emptyAction}
    >
      {events.map((event) => (
        <EventSummaryRow key={event.id} event={event} now={now} />
      ))}
    </RowList>
  );
}

export default function PublicProfilePage() {
  const router = useRouter();
  const memberId = typeof router.query.id === 'string' ? router.query.id : undefined;
  // The Pages Router keeps this page mounted from /users/A to /users/B. A new
  // key gives each visit a fresh view: tab, messaging state and loaded data
  // start over, and requests from the previous visit can't act on this one.
  return <PublicProfileView key={memberId ?? ''} memberId={memberId} />;
}

function PublicProfileView({ memberId }: { memberId: string | undefined }) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const profile = usePublicProfile(memberId);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [messagingLoading, setMessagingLoading] = useState(false);

  // False once this visit's view unmounts, so a conversation request that
  // finishes afterwards neither navigates nor toasts on the next member's page.
  // Set true in the effect body, not just its cleanup, so it's correct under
  // StrictMode's double mount too.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const { profileUser, posts, events, listings } = profile;

  async function handleMessage(): Promise<void> {
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
    if (!mounted.current) return;
    setMessagingLoading(false);

    if (result.data) {
      router.push(`/messages/${result.data.conversationId}`);
    } else {
      notify.error('Failed to start conversation. Please try again.');
    }
  }

  if (profile.loading) {
    return (
      <ProfileShell title="Profile · Nepally" variant="state">
        <LoadingState variant="detail" label="Loading profile…" />
      </ProfileShell>
    );
  }

  if (profile.error || !profileUser) {
    return (
      <ProfileShell title="Profile · Nepally" variant="state">
        <EmptyState
          title="Member not found"
          description={profile.error ?? undefined}
          action={
            <Button component={Link} href="/">
              Back to feed
            </Button>
          }
        />
      </ProfileShell>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;
  // /posts/create and /events/create send members below Verified away, so
  // only offer those links to members who can use them. Listings need only
  // a sign-in.
  const canPostAndOrganize =
    isOwnProfile && (currentUser?.trust_level ?? TrustLevel.NEW) >= TrustLevel.VERIFIED;
  const firstName = getFirstName(profileUser.full_name);
  const counts: Partial<Record<ProfileTab, number>> = {
    posts: posts.length,
    events: events.length,
    listings: listings.length,
  };

  return (
    <ProfileShell title={`${formatPublicName(profileUser.full_name)} · Nepally`}>
      <PublicProfileHeader
        profileUser={profileUser}
        metroName={profile.metroName}
        helperScore={profile.helperScore}
        isOwnProfile={isOwnProfile}
        viewerId={currentUser?.id ?? null}
        messaging={messagingLoading}
        onMessage={handleMessage}
      />

      <div className={styles.content}>
        <Tabs
          value={activeTab}
          onChange={(value) => {
            if (value) setActiveTab(value as ProfileTab);
          }}
          keepMounted={false}
          classNames={{ list: styles.tabList, tab: styles.tab }}
        >
          <Tabs.List aria-label="Profile sections">
            {TABS.map(({ value, label }) => {
              const count = counts[value];
              return (
                <Tabs.Tab
                  key={value}
                  value={value}
                  rightSection={
                    count ? (
                      <Badge variant="light" color="ink" size="sm">
                        {count}
                      </Badge>
                    ) : null
                  }
                  // Chromium's focus scroll skips a tab that is only partly clipped by the scroller.
                  onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })}
                >
                  {label}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>

          {/* tabIndex: with nothing focusable in a panel, Tab from the tab list would skip it. */}
          <Tabs.Panel value="posts" pt="md" tabIndex={0}>
            <RowList
              loading={profile.postsLoading}
              loadingLabel="Loading posts…"
              isEmpty={posts.length === 0}
              emptyTitle={
                isOwnProfile ? 'You haven’t posted anything yet.' : `${firstName} hasn’t posted anything yet.`
              }
              emptyAction={
                canPostAndOrganize ? (
                  <Button component={Link} href="/posts/create">
                    Start a post
                  </Button>
                ) : undefined
              }
            >
              {posts.map((post) => (
                <PostSummaryRow key={post.id} post={post} />
              ))}
            </RowList>
          </Tabs.Panel>

          <Tabs.Panel value="events" pt="md" tabIndex={0}>
            <EventsList
              events={events}
              loading={profile.eventsLoading}
              emptyTitle={
                isOwnProfile ? 'You haven’t organized any events.' : `${firstName} hasn’t organized any events.`
              }
              emptyAction={
                canPostAndOrganize ? (
                  <Button component={Link} href="/events/create">
                    Create an event
                  </Button>
                ) : undefined
              }
            />
          </Tabs.Panel>

          <Tabs.Panel value="listings" pt="md" tabIndex={0}>
            <RowList
              loading={profile.listingsLoading}
              loadingLabel="Loading listings…"
              isEmpty={listings.length === 0}
              emptyTitle={
                isOwnProfile ? 'You haven’t listed anything yet.' : `${firstName} has no active listings.`
              }
              emptyAction={
                isOwnProfile ? (
                  <Button component={Link} href="/marketplace/create">
                    Post a listing
                  </Button>
                ) : undefined
              }
            >
              {listings.map((listing) => (
                <ListingSummaryRow key={listing.id} listing={listing} />
              ))}
            </RowList>
          </Tabs.Panel>

          <Tabs.Panel value="about" pt="md" tabIndex={0}>
            <AboutPanel
              profileUser={profileUser}
              metroName={profile.metroName}
              postCount={posts.length}
              eventCount={events.length}
              listingCount={listings.length}
            />
          </Tabs.Panel>
        </Tabs>
      </div>
    </ProfileShell>
  );
}
