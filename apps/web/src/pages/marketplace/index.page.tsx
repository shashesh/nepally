import React, { useCallback, useEffect, useState } from 'react';
import { Button, Skeleton } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  getCategories,
  getListingsByMetro,
  TrustLevel,
  type MarketplaceCategory,
  type MarketplaceListing,
} from '@nepally/shared';
import { ListingCard } from '../../components/marketplace/ListingCard';
import styles from './marketplace.module.css';

export default function MarketplaceIndexPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [recentListings, setRecentListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const metroId = user?.metro_area_id ?? '';
  const canCreate = (user?.trust_level ?? 0) >= TrustLevel.VERIFIED;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const fetchData = useCallback(async () => {
    if (!metroId) {
      setLoading(false);
      return;
    }
    const [catResult, listingsResult] = await Promise.all([
      getCategories(supabase),
      getListingsByMetro(supabase, metroId, { limit: 10 }),
    ]);
    if (catResult.data) setCategories(catResult.data);
    if (listingsResult.data) setRecentListings(listingsResult.data);
    setLoading(false);
  }, [metroId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        router.push(`/marketplace/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    },
    [router, searchQuery]
  );

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Marketplace - Nepally</title>
      </Head>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Marketplace</h1>
          <div className={styles.headerActions}>
            {canCreate && (
              <>
                <Link href="/marketplace/my-listings">
                  <Button variant="outline" size="sm">My Listings</Button>
                </Link>
                <Link href="/marketplace/create">
                  <Button size="sm">Create Listing</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <form className={styles.searchContainer} onSubmit={handleSearch}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search marketplace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        {/* Categories */}
        <h2 className={styles.sectionTitle}>Categories</h2>
        {loading ? (
          <div className={styles.categoryGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} height={100} radius="md" />
            ))}
          </div>
        ) : (
          <div className={styles.categoryGrid}>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/marketplace/${cat.slug}`}
                className={styles.categoryCard}
                style={{ borderColor: (cat.color ?? '#e0e0e0') + '40' }}
              >
                <span className={styles.categoryEmoji}>{cat.emoji}</span>
                <span className={styles.categoryName}>{cat.name}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Recent Listings */}
        {recentListings.length > 0 && (
          <>
            <h2 className={styles.sectionTitle}>Recently Added</h2>
            <div className={styles.listingGrid}>
              {recentListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </>
        )}

        {!loading && recentListings.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏪</div>
            <div className={styles.emptyText}>No listings in your area yet</div>
            {canCreate && (
              <Link href="/marketplace/create">
                <Button>Create the first listing</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
