import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  getStickyBusinessListings,
  TrustLevel,
  type ListingSortBy,
  type MarketplaceListing,
  type SponsoredListing,
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

/** Home state: three strips + sponsored + the unified "All Listings" grid, fetched in parallel. */
function fetchHomeSections(metroId: string) {
  return Promise.all([
    getFeaturedListings(supabase, metroId, { limit: STRIP_LIMIT }),
    getListingsByMetro(supabase, metroId, { sortBy: 'newest', limit: STRIP_LIMIT }),
    getTrendingListings(supabase, metroId, { limit: STRIP_LIMIT }),
    getListingsByMetro(supabase, metroId, { sortBy: 'newest', limit: GRID_LIMIT }),
    getStickyBusinessListings(supabase, metroId, { limit: 5 }),
  ]);
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
  const [sponsoredListings, setSponsoredListings] = useState<SponsoredListing[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const loadSentinelRef = useRef<HTMLDivElement | null>(null);

  const metroId = user?.metro_area_id ?? '';
  const canCreate = (user?.trust_level ?? 0) >= TrustLevel.VERIFIED;

  // Skeletons show until the results for the current metro + filters have landed,
  // so changing any filter shows skeletons again.
  const queryKey = JSON.stringify([metroId, category, sort, q, view]);
  const [loadedQueryKey, setLoadedQueryKey] = useState<string | null>(null);
  const loading = loadedQueryKey !== queryKey;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const fetchGridPage = useCallback(
    async (offset: number) => {
      if (isFiltered) {
        if (view === 'featured' && !category && !q && sort === 'newest') {
          return getFeaturedListings(supabase, metroId, { limit: GRID_LIMIT, offset });
        }
        if (view === 'trending' && !category && !q && sort === 'newest') {
          return getTrendingListings(supabase, metroId, { limit: GRID_LIMIT, offset });
        }
        return getListingsByMetro(supabase, metroId, {
          categorySlug: category || undefined,
          searchQuery: q || undefined,
          sortBy: sort,
          limit: GRID_LIMIT,
          offset,
        });
      }
      return getListingsByMetro(supabase, metroId, {
        sortBy: 'newest',
        limit: GRID_LIMIT,
        offset,
      });
    },
    [isFiltered, view, category, q, sort, metroId]
  );

  useEffect(() => {
    if (!metroId || !router.isReady) return;
    let cancelled = false;

    if (isFiltered) {
      fetchGridPage(0).then((result) => {
        if (cancelled) return;
        if (result.data) {
          setGridListings(result.data);
          setHasMore(Boolean(result.hasMore));
        } else {
          setGridListings([]);
          setHasMore(false);
        }
        setLoadedQueryKey(queryKey);
      });
    } else {
      fetchHomeSections(metroId).then(([featRes, recentRes, trendRes, allRes, sponsoredRes]) => {
        if (cancelled) return;
        if (featRes.data) setFeatured(featRes.data);
        if (recentRes.data) setRecent(recentRes.data);
        if (trendRes.data) setTrending(trendRes.data);
        if (allRes.data) {
          setGridListings(allRes.data);
          setHasMore(Boolean(allRes.hasMore));
        } else {
          setHasMore(false);
        }
        if (sponsoredRes.data) setSponsoredListings(sponsoredRes.data);
        setLoadedQueryKey(queryKey);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [metroId, router.isReady, isFiltered, fetchGridPage, queryKey]);

  const loadMoreListings = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (!metroId || !hasMore || loading) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await fetchGridPage(gridListings.length);
      if (result.data) {
        setGridListings((prev) => {
          const seen = new Set(prev.map((l) => l.id));
          const next = [...prev];
          for (const l of result.data!) {
            if (!seen.has(l.id)) next.push(l);
          }
          return next;
        });
        setHasMore(Boolean(result.hasMore));
      } else {
        setHasMore(false);
      }
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [metroId, hasMore, loading, fetchGridPage, gridListings.length]);

  useEffect(() => {
    const node = loadSentinelRef.current;
    if (!node) return;
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreListings();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMoreListings]);

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
            {sponsoredListings.length > 0 && (
              <ListingStrip
                title="Sponsored"
                titleIcon="📢"
                listings={sponsoredListings.map((s) => s.listing)}
                maxItems={5}
              />
            )}
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
          <>
            <div className={styles.listingGrid}>
              {gridListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
            {hasMore && (
              <div ref={loadSentinelRef} className={styles.loadSentinel} aria-hidden="true" />
            )}
            {loadingMore && (
              <div className={styles.footerLoader} data-testid="marketplace-loading-more">
                <Skeleton height={120} radius="md" />
              </div>
            )}
          </>
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
