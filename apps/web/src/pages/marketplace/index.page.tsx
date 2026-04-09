import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Skeleton } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useCachedCategories } from '../../hooks/useCachedCategories';
import { supabase } from '../../lib/supabase';
import {
  getListingsByMetro,
  getFeaturedListings,
  getTrendingListings,
  TrustLevel,
  type ListingSortBy,
  type MarketplaceListing,
} from '@nepally/shared';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { FilterBar, type FilterBarValue } from '../../components/marketplace/FilterBar';
import { ListingStrip } from '../../components/marketplace/ListingStrip';
import styles from './marketplace.module.css';

const STRIP_LIMIT = 10;
const GRID_LIMIT = 20;

type DiscoveryView = 'featured' | 'trending' | null;

function readQueryParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function parseSort(raw: string): ListingSortBy {
  switch (raw) {
    case 'oldest':
    case 'featured':
    case 'price_asc':
    case 'price_desc':
      return raw;
    case 'newest':
    default:
      return 'newest';
  }
}

function parseView(raw: string): DiscoveryView {
  return raw === 'featured' || raw === 'trending' ? raw : null;
}

export default function MarketplaceIndexPage() {
  const router = useRouter();
  const { user } = useAuth();

  const category = readQueryParam(router.query.category);
  const sort = parseSort(readQueryParam(router.query.sort));
  const q = readQueryParam(router.query.q);
  const view = parseView(readQueryParam(router.query.view));

  const isFiltered = Boolean(category) || sort !== 'newest' || Boolean(q) || view !== null;

  const categories = useCachedCategories();
  const [featured, setFeatured] = useState<MarketplaceListing[]>([]);
  const [recent, setRecent] = useState<MarketplaceListing[]>([]);
  const [trending, setTrending] = useState<MarketplaceListing[]>([]);
  const [gridListings, setGridListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);

  const metroId = user?.metro_area_id ?? '';
  const canCreate = (user?.trust_level ?? 0) >= TrustLevel.VERIFIED;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const fetchData = useCallback(async () => {
    if (!metroId || !router.isReady) return;
    setLoading(true);

    if (isFiltered) {
      // Filtered / Show-All state: fetch a single unified grid
      let result;
      if (view === 'featured' && !category && !q && sort === 'newest') {
        result = await getFeaturedListings(supabase, metroId, { limit: GRID_LIMIT });
      } else if (view === 'trending' && !category && !q && sort === 'newest') {
        result = await getTrendingListings(supabase, metroId, { limit: GRID_LIMIT });
      } else {
        result = await getListingsByMetro(supabase, metroId, {
          categorySlug: category || undefined,
          searchQuery: q || undefined,
          sortBy: sort,
          limit: GRID_LIMIT,
        });
      }
      if (result.data) setGridListings(result.data);
      setLoading(false);
      return;
    }

    // Home state: fetch three strips + unified "All Listings" grid in parallel
    const [featRes, recentRes, trendRes, allRes] = await Promise.all([
      getFeaturedListings(supabase, metroId, { limit: STRIP_LIMIT }),
      getListingsByMetro(supabase, metroId, { sortBy: 'newest', limit: STRIP_LIMIT }),
      getTrendingListings(supabase, metroId, { limit: STRIP_LIMIT }),
      getListingsByMetro(supabase, metroId, { sortBy: 'newest', limit: GRID_LIMIT }),
    ]);
    if (featRes.data) setFeatured(featRes.data);
    if (recentRes.data) setRecent(recentRes.data);
    if (trendRes.data) setTrending(trendRes.data);
    if (allRes.data) setGridListings(allRes.data);
    setLoading(false);
  }, [metroId, router.isReady, isFiltered, category, sort, q, view]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filterValue: FilterBarValue = useMemo(
    () => ({ category, sort, query: q }),
    [category, sort, q]
  );

  const handleFilterChange = useCallback(
    (next: FilterBarValue) => {
      const query: Record<string, string> = {};
      if (next.category) query.category = next.category;
      if (next.sort !== 'newest') query.sort = next.sort;
      if (next.query) query.q = next.query;
      // Changing any filter clears the discovery "view"
      router.push({ pathname: '/marketplace', query }, undefined, { shallow: true });
    },
    [router]
  );

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Marketplace - Nepally</title>
      </Head>
      <div className={styles.container}>
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

        <FilterBar
          categories={categories}
          value={filterValue}
          onChange={handleFilterChange}
        />

        {!isFiltered && (
          <>
            <ListingStrip
              title="Featured"
              titleIcon="⭐"
              listings={featured}
              showAllHref="/marketplace?view=featured"
              maxItems={STRIP_LIMIT}
            />
            <ListingStrip
              title="Recently Added"
              titleIcon="🆕"
              listings={recent}
              showAllHref="/marketplace?sort=newest"
              maxItems={STRIP_LIMIT}
            />
            <ListingStrip
              title="Trending"
              titleIcon="🔥"
              listings={trending}
              showAllHref="/marketplace?view=trending"
              maxItems={STRIP_LIMIT}
            />
          </>
        )}

        <h2 className={styles.sectionTitle}>
          {view === 'featured' ? 'Featured Listings' : view === 'trending' ? 'Trending Listings' : q ? `Search: ${q}` : 'All Listings'}
        </h2>

        {loading ? (
          <div className={styles.listingGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={360} radius="md" />
            ))}
          </div>
        ) : gridListings.length > 0 ? (
          <div className={styles.listingGrid}>
            {gridListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏪</div>
            <div className={styles.emptyText}>
              {isFiltered ? 'No listings match your filters' : 'No listings in your area yet'}
            </div>
            {canCreate && !isFiltered && (
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
