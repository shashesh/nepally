import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useNow } from '../../hooks/useNow';
import { supabase } from '../../lib/supabase';
import {
  getListingsByOwner,
  deactivateListing,
  reactivateListing,
  deleteListing,
  refreshListing,
  getDaysUntilSoftExpiry,
  type MarketplaceListing,
} from '@nepally/shared';
import styles from './marketplace.module.css';

export default function MyListingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  // Bumping this re-runs the fetch effect after a listing is changed.
  const [reloadKey, setReloadKey] = useState(0);
  const now = useNow();

  const getStatusClass = (status: string): string => {
    const statusClassMap: Record<string, string> = {
      active: styles.statusActive,
      inactive: styles.statusInactive,
      removed: styles.statusRemoved,
    };
    return statusClassMap[status] || styles.statusActive;
  };

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getListingsByOwner(supabase, userId).then((result) => {
      if (cancelled) return;
      if (result.data) setListings(result.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const reloadListings = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const handleDeactivate = useCallback(async (id: string) => {
    if (!confirm('Deactivate this listing? It will be hidden from the marketplace.')) return;
    await deactivateListing(supabase, id);
    reloadListings();
  }, [reloadListings]);

  const handleReactivate = useCallback(async (id: string) => {
    await reactivateListing(supabase, id);
    reloadListings();
  }, [reloadListings]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this listing permanently?')) return;
    await deleteListing(supabase, id);
    reloadListings();
  }, [reloadListings]);

  const handleRefresh = useCallback(async (id: string) => {
    await refreshListing(supabase, id);
    reloadListings();
  }, [reloadListings]);

  if (!user) return null;

  return (
    <>
      <Head>
        <title>My Listings - Marketplace - Nepally</title>
      </Head>
      <div className={styles.container}>
        <Link href="/marketplace" className={styles.backLink}>
          ← Back to Marketplace
        </Link>

        <div className={styles.header}>
          <h1 className={styles.title}>My Listings</h1>
          <Link href="/marketplace/create">
            <Button size="sm">Create Listing</Button>
          </Link>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : listings.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏪</div>
            <div className={styles.emptyText}>You haven&apos;t created any listings yet</div>
            <Link href="/marketplace/create">
              <Button>Create your first listing</Button>
            </Link>
          </div>
        ) : (
          listings.map((listing) => {
            const daysUntilExpiry = getDaysUntilSoftExpiry(listing.refreshed_at, now);
            const isExpiringSoon = daysUntilExpiry <= 14 && listing.status === 'active';

            return (
              <div key={listing.id} className={styles.myListingCard}>
                {listing.photos.length > 0 ? (
                  <Image
                    src={listing.photos[0]}
                    alt={listing.title}
                    className={styles.myListingThumb}
                    fill
                  />
                ) : (
                  <div className={styles.myListingThumbPlaceholder}>
                    {listing.category?.emoji ?? '📦'}
                  </div>
                )}
                <div className={styles.myListingHeader}>
                  <Link href={`/marketplace/listing/${listing.id}`}>
                    <strong>{listing.title}</strong>
                  </Link>
                  <span
                    className={`${styles.badge} ${getStatusClass(listing.status)}`}
                  >
                    {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                  </span>
                </div>

                <div className={styles.listingMeta}>
                  <span>{listing.category?.emoji} {listing.category?.name}</span>
                  {listing.price && <span className={styles.priceText}>{listing.price}</span>}
                </div>

                <div className={styles.listingStats}>
                  <span>{listing.views_count} views</span>
                  <span>{listing.saves_count} saves</span>
                  <span>{listing.contacts_count} contacts</span>
                </div>

                {isExpiringSoon && (
                  <div className={styles.expiryWarning}>
                    ⏰ Expires in {daysUntilExpiry} days — refresh to stay visible
                  </div>
                )}

                <div className={styles.myListingActions}>
                  <Link href={`/marketplace/create?edit=${listing.id}`}>
                    <button className={`${styles.actionLink} ${styles.actionEdit}`}>
                      ✏️ Edit
                    </button>
                  </Link>

                  {listing.status === 'active' && (
                    <Link href={`/marketplace/listing/promote/${listing.id}`}>
                      <button className={`${styles.actionLink} ${styles.actionEdit}`}>
                        🚀 Promote
                      </button>
                    </Link>
                  )}

                  {listing.status === 'active' && (
                    <button
                      className={`${styles.actionLink} ${styles.actionRefresh}`}
                      onClick={() => handleRefresh(listing.id)}
                    >
                      🔄 Refresh
                    </button>
                  )}

                  {listing.status === 'active' ? (
                    <button
                      className={`${styles.actionLink} ${styles.actionDeactivate}`}
                      onClick={() => handleDeactivate(listing.id)}
                    >
                      ⏸️ Deactivate
                    </button>
                  ) : listing.status === 'inactive' ? (
                    <button
                      className={`${styles.actionLink} ${styles.actionReactivate}`}
                      onClick={() => handleReactivate(listing.id)}
                    >
                      ▶️ Reactivate
                    </button>
                  ) : null}

                  <button
                    className={`${styles.actionLink} ${styles.actionDelete}`}
                    onClick={() => handleDelete(listing.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
