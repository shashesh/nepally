import React, { useCallback, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { MARKETPLACE_CATEGORIES } from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { parseMarketplaceQuery, SEARCH_SLUG } from '../../lib/marketplaceQuery';
import { MarketplaceBrowse } from '../../components/marketplace/MarketplaceBrowse';
import type { FilterBarValue } from '../../components/marketplace/FilterBar';

export default function MarketplaceCategoryPage() {
  const router = useRouter();
  const { user } = useAuth();

  const query = parseMarketplaceQuery(router.query);
  const metroId = user?.metro_area_id || null;

  const categoryConfig = MARKETPLACE_CATEGORIES.find((c) => c.slug === query.category);
  const title = query.isSearch
    ? `Search: ${query.q}`
    : categoryConfig
      ? `${categoryConfig.emoji} ${categoryConfig.name}`
      : 'Category';
  const documentTitle = query.isSearch ? `Search: ${query.q}` : categoryConfig?.name ?? 'Category';

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  const handleFilterChange = useCallback(
    (next: FilterBarValue) => {
      const params: Record<string, string> = {};
      if (next.sort !== 'newest') params.sort = next.sort;
      if (next.query) params.q = next.query;

      // Picking a category is only possible in search mode, where the field is
      // unlocked; it navigates to that category's own route.
      if (query.isSearch && next.category) {
        router.push(
          { pathname: `/marketplace/${next.category}`, query: params },
          undefined,
          { shallow: true }
        );
        return;
      }

      router.push(
        {
          pathname: '/marketplace/[category]',
          query: { ...params, category: query.isSearch ? SEARCH_SLUG : query.category },
        },
        undefined,
        { shallow: true }
      );
    },
    [router, query.isSearch, query.category]
  );

  if (!user) return null;

  return (
    <>
      <Head>
        <title>{documentTitle} - Marketplace - Nepally</title>
      </Head>
      <MarketplaceBrowse
        metroId={metroId}
        query={query}
        title={title}
        ready={router.isReady}
        backHref="/marketplace"
        backLabel="Back to Marketplace"
        lockedCategory={query.isSearch ? undefined : query.category}
        // The h1 already names the category or the search, so the grid gets a
        // plain name rather than repeating it — but "All Listings" would
        // contradict an active search, which is not all of them.
        gridHeading={query.isSearch ? 'Results' : 'All Listings'}
        onFilterChange={handleFilterChange}
      />
    </>
  );
}
