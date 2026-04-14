import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useCachedCategories } from '../../hooks/useCachedCategories';
import { supabase } from '../../lib/supabase';
import {
  getListingsByMetro,
  getFeaturedListings,
  MARKETPLACE_CATEGORIES,
  type ListingSortBy,
  type MarketplaceListing,
} from '@nepally/shared';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { ListingStrip } from '../../components/marketplace/ListingStrip';
import { FilterBar, type FilterBarValue } from '../../components/marketplace/FilterBar';
import styles from './marketplace.module.css';

const PAGE_SIZE = 20;

function parseSort(raw: string | string[] | undefined): ListingSortBy {
  const v = Array.isArray(raw) ? raw[0] : raw;
  switch (v) {
    case 'oldest':
    case 'featured':
    case 'price_asc':
    case 'price_desc':
      return v;
    default:
      return 'newest';
  }
}

function readQueryParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function MarketplaceCategoryPage() {
  const router = useRouter();
  const { user } = useAuth();

  const slug = readQueryParam(router.query.category);
  const q = readQueryParam(router.query.q);
  const sort = parseSort(router.query.sort);
  const isSearch = slug === 'search';

  const categoryConfig = MARKETPLACE_CATEGORIES.find((c) => c.slug === slug);
  const pageTitle = isSearch ? `Search: ${q}` : categoryConfig?.name ?? 'Category';

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [featuredListings, setFeaturedListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const categories = useCachedCategories();

  const metroId = user?.metro_area_id ?? '';

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const fetchListings = useCallback(async () => {
    if (!metroId || !router.isReady) return;
    setLoading(true);
    const [result, featuredResult] = await Promise.all([
      getListingsByMetro(supabase, metroId, {
        categorySlug: isSearch ? undefined : slug,
        searchQuery: q || undefined,
        sortBy: sort,
        limit: PAGE_SIZE,
      }),
      !isSearch
        ? getFeaturedListings(supabase, metroId, { categorySlug: slug, limit: 10 })
        : Promise.resolve({ data: [] as MarketplaceListing[] }),
    ]);
    if (result.data) setListings(result.data);
    // Always reset featured state. In search mode the parallel fetch above
    // short-circuits to an empty array, which clears any stale strip carried
    // over from a previous category instance of this page.
    setFeaturedListings(featuredResult.data ?? []);
    setLoading(false);
  }, [metroId, slug, q, sort, isSearch, router.isReady]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const filterValue: FilterBarValue = useMemo(
    () => ({ category: isSearch ? '' : slug, sort, query: q }),
    [isSearch, slug, sort, q]
  );

  const handleFilterChange = useCallback(
    (next: FilterBarValue) => {
      // If user changes category via the FilterBar (only possible in search mode),
      // navigate to that category. Otherwise update the current route's query.
      if (isSearch && next.category) {
        const params: Record<string, string> = {};
        if (next.sort !== 'newest') params.sort = next.sort;
        if (next.query) params.q = next.query;
        router.push({ pathname: `/marketplace/${next.category}`, query: params }, undefined, { shallow: true });
        return;
      }
      const query: Record<string, string> = { category: slug };
      if (next.sort !== 'newest') query.sort = next.sort;
      if (next.query) query.q = next.query;
      router.push({ pathname: '/marketplace/[category]', query }, undefined, { shallow: true });
    },
    [router, slug, isSearch]
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

        <FilterBar
          categories={categories}
          value={filterValue}
          onChange={handleFilterChange}
          lockedCategory={isSearch ? undefined : slug}
        />

        {!isSearch && featuredListings.length > 0 && (
          <ListingStrip
            title="Featured"
            titleIcon="⭐"
            listings={featuredListings}
            maxItems={10}
          />
        )}

        {loading ? (
          <div className={styles.listingGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={360} radius="md" />
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
              {q ? 'No listings match your search' : 'No listings in this category yet'}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
