import React, { useState, type ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Badge, Button, Tabs } from '@mantine/core';
import { formatPublicName, getFirstName, TrustLevel } from '@nepally/shared';
import type { Event } from '@nepally/shared';
import {
  EmptyState,
  ErrorState,
  ListStates,
  LoadingState,
  scrollFocusedTabIntoView,
  scrollingTabsClassNames,
} from '../../components/ui';
import { AboutPanel } from '../../components/users/AboutPanel';
import { PublicProfileHeader } from '../../components/users/PublicProfileHeader';
import { PostSummaryRow } from '../../components/posts/PostSummaryRow';
import { EventSummaryRow } from '../../components/events/EventSummaryRow';
import { ListingSummaryRow } from '../../components/marketplace/ListingSummaryRow';
import { useAuth } from '../../hooks/useAuth';
import { useNow } from '../../hooks/useNow';
import { usePublicProfile } from '../../hooks/usePublicProfile';
import type { ListResource } from '../../hooks/useUserList';
import { useStartConversation } from '../../hooks/useStartConversation';
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

interface EventsListProps {
  events: ListResource<Event>;
  emptyTitle: string;
  emptyAction?: ReactNode;
}

/**
 * The Events tab's rows. Its own component so useNow's interval runs only
 * while the tab is open: `keepMounted={false}` unmounts inactive panels.
 */
function EventsList({ events, emptyTitle, emptyAction }: EventsListProps) {
  const now = useNow();
  return (
    <ListStates
      loading={events.loading}
      loadingLabel="Loading events…"
      error={events.error}
      onRetry={events.reload}
      isEmpty={events.items.length === 0}
      empty={<EmptyState title={emptyTitle} action={emptyAction} />}
    >
      <div className={styles.rowList}>
        {events.items.map((event) => (
          <EventSummaryRow key={event.id} event={event} now={now} />
        ))}
      </div>
    </ListStates>
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
  const { user: currentUser } = useAuth();
  const profile = usePublicProfile(memberId);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  // The view is keyed by member, so a conversation that finishes opening
  // after the visitor has moved on lands on an unmounted hook and is dropped.
  const { start: startConversation, starting: messaging } = useStartConversation();

  const { profileUser, posts, events, listings } = profile;

  if (profile.status === 'loading') {
    return (
      <ProfileShell title="Profile · Nepally" variant="state">
        <LoadingState variant="detail" label="Loading profile…" />
      </ProfileShell>
    );
  }

  if (profile.status === 'error') {
    return (
      <ProfileShell title="Profile · Nepally" variant="state">
        <ErrorState message="Couldn’t load this profile." onRetry={profile.reload} />
      </ProfileShell>
    );
  }

  if (!profileUser) {
    return (
      <ProfileShell title="Profile · Nepally" variant="state">
        <EmptyState
          title="Member not found"
          titleOrder={1}
          description="The link may be wrong, or this member may have left Nepally."
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
    posts: posts.items.length,
    events: events.items.length,
    listings: listings.items.length,
  };

  return (
    <ProfileShell title={`${formatPublicName(profileUser.full_name)} · Nepally`}>
      <PublicProfileHeader
        profileUser={profileUser}
        metroName={profile.metroName}
        helperScore={profile.helperScore}
        isOwnProfile={isOwnProfile}
        viewerId={currentUser?.id ?? null}
        messaging={messaging}
        onMessage={() => void startConversation({ id: profileUser.id, name: profileUser.full_name })}
      />

      <div className={styles.content}>
        <Tabs
          value={activeTab}
          onChange={(value) => {
            if (value) setActiveTab(value as ProfileTab);
          }}
          keepMounted={false}
          classNames={scrollingTabsClassNames}
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
                  onFocus={scrollFocusedTabIntoView}
                >
                  {label}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>

          {/* tabIndex: with nothing focusable in a panel, Tab from the tab list would skip it. */}
          <Tabs.Panel value="posts" pt="md" tabIndex={0}>
            <ListStates
              loading={posts.loading}
              loadingLabel="Loading posts…"
              error={posts.error}
              onRetry={posts.reload}
              isEmpty={posts.items.length === 0}
              empty={
                <EmptyState
                  title={
                    isOwnProfile ? 'You haven’t posted anything yet.' : `${firstName} hasn’t posted anything yet.`
                  }
                  action={
                    canPostAndOrganize ? (
                      <Button component={Link} href="/posts/create">
                        Start a post
                      </Button>
                    ) : undefined
                  }
                />
              }
            >
              <div className={styles.rowList}>
                {posts.items.map((post) => (
                  <PostSummaryRow key={post.id} post={post} />
                ))}
              </div>
            </ListStates>
          </Tabs.Panel>

          <Tabs.Panel value="events" pt="md" tabIndex={0}>
            <EventsList
              events={events}
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
            <ListStates
              loading={listings.loading}
              loadingLabel="Loading listings…"
              error={listings.error}
              onRetry={listings.reload}
              isEmpty={listings.items.length === 0}
              empty={
                <EmptyState
                  title={isOwnProfile ? 'You haven’t listed anything yet.' : `${firstName} has no active listings.`}
                  action={
                    isOwnProfile ? (
                      <Button component={Link} href="/marketplace/create">
                        Post a listing
                      </Button>
                    ) : undefined
                  }
                />
              }
            >
              <div className={styles.rowList}>
                {listings.items.map((listing) => (
                  <ListingSummaryRow key={listing.id} listing={listing} />
                ))}
              </div>
            </ListStates>
          </Tabs.Panel>

          <Tabs.Panel value="about" pt="md" tabIndex={0}>
            <AboutPanel
              profileUser={profileUser}
              metroName={profile.metroName}
              postCount={posts.items.length}
              eventCount={events.items.length}
              listingCount={listings.items.length}
            />
          </Tabs.Panel>
        </Tabs>
      </div>
    </ProfileShell>
  );
}
