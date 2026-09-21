import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Badge, Button, Tabs } from '@mantine/core';
import { formatPublicName, getFirstName, getOrCreateConversation } from '@nepally/shared';
import type { PublicUser } from '@nepally/shared';
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

function ProfileShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>{children}</div>
      </div>
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

export default function PublicProfilePage() {
  const router = useRouter();
  const memberId = typeof router.query.id === 'string' ? router.query.id : undefined;
  const { user: currentUser } = useAuth();
  const profile = usePublicProfile(memberId);
  const now = useNow();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [tabMemberId, setTabMemberId] = useState(memberId);
  const [messagingLoading, setMessagingLoading] = useState(false);

  // The Pages Router keeps this page mounted from /users/A to /users/B, so the
  // tab and A's "Opening conversation…" would carry over. Open each member
  // fresh, resetting during render as usePublicProfile does with its data.
  if (memberId !== tabMemberId) {
    setTabMemberId(memberId);
    setActiveTab('posts');
    setMessagingLoading(false);
  }

  // The member on screen, for handleMessage to check after its await (its own
  // closure still holds the member it started for). Written in an effect,
  // never during render.
  const shownMemberIdRef = useRef(memberId);
  useEffect(() => {
    shownMemberIdRef.current = memberId;
  }, [memberId]);

  const { profileUser, posts, events, listings } = profile;

  async function handleMessage(): Promise<void> {
    if (!currentUser || !profileUser) {
      router.push('/login');
      return;
    }

    const startedFor = memberId;
    setMessagingLoading(true);
    const result = await getOrCreateConversation(
      supabase,
      currentUser.id,
      currentUser.full_name,
      profileUser.id,
      profileUser.full_name
    );
    // Moved on to another member: the reset above already cleared the label,
    // and neither A's conversation nor A's failure belongs on B's page.
    if (shownMemberIdRef.current !== startedFor) return;
    setMessagingLoading(false);

    if (result.data) {
      router.push(`/messages/${result.data.conversationId}`);
    } else {
      notify.error('Failed to start conversation. Please try again.');
    }
  }

  if (profile.loading) {
    return (
      <ProfileShell title="Profile · Nepally">
        <LoadingState variant="detail" label="Loading profile…" />
      </ProfileShell>
    );
  }

  if (profile.error || !profileUser) {
    return (
      <ProfileShell title="Profile · Nepally">
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
  const firstName = getFirstName(profileUser.full_name);
  const counts: Record<ProfileTab, number> = {
    posts: posts.length,
    events: events.length,
    listings: listings.length,
    about: 0,
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
        >
          <Tabs.List aria-label="Profile sections">
            {TABS.map(({ value, label }) => (
              <Tabs.Tab
                key={value}
                value={value}
                rightSection={
                  counts[value] > 0 ? (
                    <Badge variant="light" color="ink" size="sm">
                      {counts[value]}
                    </Badge>
                  ) : null
                }
              >
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          <Tabs.Panel value="posts" pt="md">
            <RowList
              loading={profile.postsLoading}
              loadingLabel="Loading posts…"
              isEmpty={posts.length === 0}
              emptyTitle={
                isOwnProfile ? 'You haven’t posted anything yet.' : `${firstName} hasn’t posted anything yet.`
              }
              emptyAction={
                isOwnProfile ? (
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

          <Tabs.Panel value="events" pt="md">
            <RowList
              loading={profile.eventsLoading}
              loadingLabel="Loading events…"
              isEmpty={events.length === 0}
              emptyTitle={`${firstName} hasn’t organized any events.`}
            >
              {events.map((event) => (
                <EventSummaryRow key={event.id} event={event} now={now} />
              ))}
            </RowList>
          </Tabs.Panel>

          <Tabs.Panel value="listings" pt="md">
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

          <Tabs.Panel value="about" pt="md">
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
