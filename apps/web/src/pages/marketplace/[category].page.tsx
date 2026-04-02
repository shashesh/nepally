import React, { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  getListingsByMetro,
  MARKETPLACE_CATEGORIES,
  type MarketplaceListing,
} from '@nepally/shared';
import { ListingCard } from '../../components/marketplace/ListingCard';
import styles from './marketplace.module.css';

const PAGE_SIZE = 20;

export default function MarketplaceCategoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { category: categorySlug, q: searchQuery } = router.query;

  const slug = typeof categorySlug === 'string' ? categorySlug : '';
  const query = typeof searchQuery === 'string' ? searchQuery : '';
  const isSearch = slug === 'search';

  const categoryConfig = MARKETPLACE_CATEGORIES.find((c) => c.slug === slug);
  const pageTitle = isSearch ? `Search: ${query}` : categoryConfig?.name ?? 'Category';

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState(query);

  const metroId = user?.metro_area_id ?? '';

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const fetchListings = useCallback(async () => {
    if (!metroId || !router.isReady) return;
    setLoading(true);
    const result = await getListingsByMetro(supabase, metroId, {
      categorySlug: isSearch ? undefined : slug,
      searchQuery: localSearch || undefined,
      limit: PAGE_SIZE,
    });
    if (result.data) setListings(result.data);
    setLoading(false);
  }, [metroId, slug, localSearch, isSearch, router.isReady]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isSearch) {
        router.replace(
          { pathname: router.pathname, query: { ...router.query, q: localSearch } },
          undefined,
          { shallow: true }
        );
      }
      fetchListings();
    },
    [fetchListings, isSearch, localSearch, router]
  );

  if (!user) return null;

  return (
    <>
      <Head>
        <title>{pageTitle} - Marketplace - Nepally</title>
      </Head>
      <div className={styles.container}>
        <Link href="/marketplace" className={styles.backLink}>
          ← Back to Marketplace
        </Link>

        <h1 className={styles.title}>
          {categoryConfig?.emoji} {pageTitle}
        </h1>

        {/* Search */}
        <form className={styles.searchContainer} onSubmit={handleSearch}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={isSearch ? 'Search marketplace...' : `Search in ${pageTitle}...`}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
        </form>

        {loading ? (
          <div className={styles.listingGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={120} radius="md" />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className={styles.listingGrid}>
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <div className={styles.emptyText}>
              {localSearch ? 'No listings match your search' : 'No listings in this category yet'}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
