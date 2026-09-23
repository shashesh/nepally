import React, { useEffect } from 'react';
import { Button } from '@mantine/core';
import { IconBuildingStore } from '@tabler/icons-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useNow } from '../../hooks/useNow';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useMyListings } from '../../hooks/useMyListings';
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

function MyListingsView({ userId }: { userId: string }) {
  const now = useNow();
  const list = useMyListings(userId);
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
            <Button component={Link} href="/marketplace/create">
              Create listing
            </Button>
          }
        />

        {list.loading ? (
          <LoadingState label="Loading your listings…" />
        ) : list.error ? (
          <ErrorState title="Couldn't load your listings" message={list.error} onRetry={list.reload} />
        ) : list.listings.length === 0 ? (
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
              {list.listings.map((listing) => (
                <li key={listing.id}>
                  <ListingSummaryRow
                    listing={listing}
                    owner={{ now }}
                    menu={
                      <MyListingActions
                        listing={listing}
                        pending={list.pendingIds.has(listing.id)}
                        onAction={list.runAction}
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
