import React, { useCallback, useEffect } from 'react';
import { Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { TrustLevel } from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { parseMarketplaceQuery } from '../../lib/marketplaceQuery';
import { MarketplaceBrowse } from '../../components/marketplace/MarketplaceBrowse';
import type { FilterBarValue } from '../../components/marketplace/FilterBar';

export default function MarketplaceIndexPage() {
  const router = useRouter();
  const { user } = useAuth();

  const query = parseMarketplaceQuery(router.query);
  const metroId = user?.metro_area_id || null;
  const canCreate = (user?.trust_level ?? 0) >= TrustLevel.VERIFIED;

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  const handleFilterChange = useCallback(
    (next: FilterBarValue) => {
      const params: Record<string, string> = {};
      if (next.category) params.category = next.category;
      if (next.sort !== 'newest') params.sort = next.sort;
      if (next.query) params.q = next.query;
      // Changing any filter clears the discovery view.
      router.push({ pathname: '/marketplace', query: params }, undefined, { shallow: true });
    },
    [router]
  );

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Marketplace - Nepally</title>
      </Head>
      <MarketplaceBrowse
        metroId={metroId}
        query={query}
        title="Marketplace"
        ready={router.isReady}
        onFilterChange={handleFilterChange}
        actions={
          canCreate ? (
            <>
              <Button component={Link} href="/marketplace/my-listings" variant="outline" size="sm">
                My Listings
              </Button>
              <Button
                component={Link}
                href="/marketplace/create"
                size="sm"
                leftSection={<IconPlus size={16} aria-hidden="true" />}
              >
                Create Listing
              </Button>
            </>
          ) : undefined
        }
        emptyAction={
          canCreate ? (
            <Button component={Link} href="/marketplace/create">
              Create the first listing
            </Button>
          ) : undefined
        }
      />
    </>
  );
}
