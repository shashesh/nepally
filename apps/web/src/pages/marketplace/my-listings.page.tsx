import React, { useCallback, useEffect, useRef } from 'react';
import { Button } from '@mantine/core';
import { IconBuildingStore } from '@tabler/icons-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useNow } from '../../hooks/useNow';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useMyListings, type ListingAction } from '../../hooks/useMyListings';
import { isFocusStranded } from '../../lib/focus';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui';
import { ListingSummaryRow } from '../../components/marketplace/ListingSummaryRow';
import { MyListingActions } from '../../components/marketplace/MyListingActions';
import styles from './myListings.module.css';

export default function MyListingsPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) return null;
  return <MyListingsView userId={user.id} />;
}

/** Where focus goes once a deleted row has left the list: a neighbour's link, else Create listing. */
interface PendingFocus {
  deletedId: string;
  targetId: string | null;
}

function MyListingsView({ userId }: { userId: string }) {
  const now = useNow();
  const list = useMyListings(userId);
  const { listings, runAction } = list;
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const createRef = useRef<HTMLAnchorElement>(null);
  const pendingFocusRef = useRef<PendingFocus | null>(null);

  // Deleting a row unmounts the menu trigger the confirm dialog would return
  // focus to, dropping it to <body>. Armed before the call (the row can be
  // gone before the await returns), and acted on only once that row has
  // actually left the list. isFocusStranded also covers focus still inside
  // the closing dialog; focus the member has moved elsewhere is left alone.
  const runRowAction = useCallback(
    async (id: string, action: ListingAction) => {
      if (action === 'delete') {
        const index = listings.findIndex((l) => l.id === id);
        const neighbour = listings[index + 1] ?? listings[index - 1] ?? null;
        pendingFocusRef.current = { deletedId: id, targetId: neighbour?.id ?? null };
      }
      const ok = await runAction(id, action);
      if (!ok && pendingFocusRef.current?.deletedId === id) pendingFocusRef.current = null;
      return ok;
    },
    [listings, runAction]
  );

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending || listings.some((l) => l.id === pending.deletedId)) return;
    pendingFocusRef.current = null;
    if (!isFocusStranded()) return;
    const row = pending.targetId ? rowRefs.current.get(pending.targetId) : undefined;
    (row?.querySelector('a') ?? createRef.current)?.focus();
  }, [listings]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore: list.hasMore,
    loading: list.loading || list.loadingMore,
    onLoadMore: list.loadMore,
  });

  return (
    <>
      <Head>
        <title>My Listings - Marketplace - Nepally</title>
      </Head>
      <div className={styles.page}>
        <PageHeader
          title="My Listings"
          backHref="/marketplace"
          backLabel="Marketplace"
          actions={
            <Button component={Link} href="/marketplace/create" ref={createRef}>
              Create listing
            </Button>
          }
        />

        {list.loading ? (
          <LoadingState label="Loading your listings…" />
        ) : list.error ? (
          <ErrorState title="Couldn't load your listings" message={list.error} onRetry={list.reload} />
        ) : listings.length === 0 ? (
          <EmptyState
            icon={<IconBuildingStore size={40} />}
            title="You haven't listed anything yet"
            description="Sell something, offer a service or promote your business to members near you."
            action={
              <Button component={Link} href="/marketplace/create">
                Create your first listing
              </Button>
            }
          />
        ) : (
          <>
            <ul className={styles.list}>
              {listings.map((listing) => (
                <li
                  key={listing.id}
                  ref={(node) => {
                    if (node) rowRefs.current.set(listing.id, node);
                    else rowRefs.current.delete(listing.id);
                  }}
                >
                  <ListingSummaryRow
                    listing={listing}
                    owner={{ now }}
                    menu={
                      <MyListingActions
                        listing={listing}
                        pending={list.pendingIds.has(listing.id)}
                        onAction={runRowAction}
                      />
                    }
                  />
                </li>
              ))}
            </ul>
            {list.hasMore && <div ref={sentinelRef} className={styles.loadSentinel} aria-hidden="true" />}
            {list.loadingMore && <LoadingState count={1} label="Loading more listings…" />}
            {list.loadMoreError && (
              <ErrorState
                title="Couldn't load more listings"
                message={list.loadMoreError}
                onRetry={list.retryLoadMore}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
