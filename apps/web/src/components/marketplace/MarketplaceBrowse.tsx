import React, { type ReactNode, useMemo } from 'react';
import { IconBuildingStore } from '@tabler/icons-react';
import { MARKETPLACE_CATEGORIES } from '@nepally/shared';
import { useCachedCategories } from '../../hooks/useCachedCategories';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed';
import type { MarketplaceQuery } from '../../lib/marketplaceQuery';
import { isFilteredQuery } from '../../lib/marketplaceQuery';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../ui';
import { FilterBar, type FilterBarValue } from './FilterBar';
import { ListingCard } from './ListingCard';
import { ListingStrip } from './ListingStrip';
import styles from '../../pages/marketplace/browse.module.css';

export interface MarketplaceBrowseProps {
  metroId: string | null;
  query: MarketplaceQuery;
  /** The page's h1. */
  title: string;
  /** Rendered beside the title, e.g. My Listings and Create Listing. */
  actions?: ReactNode;
  /** A back link above the header. The category route uses it. */
  backHref?: string;
  backLabel?: string;
  /** Locks the category field, for a route that is already scoped to one. */
  lockedCategory?: string;
  onFilterChange: (next: FilterBarValue) => void;
  /**
   * Overrides the grid section's name. The category route passes one, because
   * its h1 already names the category.
   */
  gridHeading?: string;
  /** Rendered in the empty state, e.g. Create the first listing. */
  emptyAction?: ReactNode;
  /**
   * False while the Pages Router has not parsed the URL yet. The first fetch
   * then waits, rather than asking for the unfiltered marketplace and
   * immediately asking again with the real query.
   */
  ready?: boolean;
}

const GRID_SECTION_ID = 'marketplace-grid';

function categoryName(slug: string): string | null {
  return MARKETPLACE_CATEGORIES.find((category) => category.slug === slug)?.name ?? null;
}

/**
 * What the grid is showing. The old index always said "All Listings", even
 * when `?category=` narrowed it, so a category reached that way looked
 * identical to the whole marketplace (decision 1).
 */
function defaultGridHeading(query: MarketplaceQuery): string {
  if (query.view === 'featured') return 'Featured Listings';
  if (query.view === 'trending') return 'Trending Listings';
  if (query.q) return `Search: ${query.q}`;
  return categoryName(query.category) ?? 'All Listings';
}

/** Says which nothing was found in, rather than one line for every case. */
function emptyTitle(query: MarketplaceQuery, filtered: boolean): string {
  if (query.q) return 'No listings match your search';
  if (query.category) return 'No listings in this category yet';
  if (filtered) return 'No listings match your filters';
  return 'No listings in your area yet';
}

/**
 * The marketplace browse experience, behind both `/marketplace` and
 * `/marketplace/[category]`. The two routes differ only in their heading,
 * their back link and where a filter change navigates, so they share this
 * rather than keeping two copies of the same fetch, grid and empty state.
 */
export function MarketplaceBrowse({
  metroId,
  query,
  title,
  actions,
  backHref,
  backLabel,
  lockedCategory,
  onFilterChange,
  gridHeading,
  emptyAction,
  ready = true,
}: MarketplaceBrowseProps) {
  const categories = useCachedCategories();
  const feed = useMarketplaceFeed(ready ? metroId : null, query);
  const { sentinelRef } = useInfiniteScroll({
    hasMore: feed.hasMore,
    loading: feed.loading || feed.loadingMore,
    onLoadMore: feed.loadMore,
  });

  const filtered = isFilteredQuery(query);
  const heading = gridHeading ?? defaultGridHeading(query);

  const filterValue: FilterBarValue = useMemo(
    () => ({ category: query.category, sort: query.sort, query: query.q }),
    [query.category, query.sort, query.q]
  );

  return (
    <div className={styles.container}>
      <PageHeader title={title} actions={actions} backHref={backHref} backLabel={backLabel} />

      <FilterBar
        categories={categories}
        value={filterValue}
        onChange={onFilterChange}
        lockedCategory={lockedCategory}
      />

      {/* The discovery strips are the unnarrowed view's content; once anything
          filters the marketplace they would compete with the results. */}
      {!filtered && feed.sponsored.length > 0 && (
        <ListingStrip title="Sponsored" titleIcon="📢" listings={feed.sponsored} maxItems={5} />
      )}
      {!filtered && (
        <>
          <ListingStrip
            title="Featured"
            titleIcon="⭐"
            listings={feed.featured}
            showAllHref="/marketplace?view=featured"
          />
          <ListingStrip
            title="Recently Added"
            titleIcon="🆕"
            listings={feed.recent}
            showAllHref="/marketplace?sort=newest"
          />
          <ListingStrip
            title="Trending"
            titleIcon="🔥"
            listings={feed.trending}
            showAllHref="/marketplace?view=trending"
          />
        </>
      )}
      {/* A category's own featured strip, above its results. */}
      {filtered && !query.isSearch && feed.featured.length > 0 && (
        <ListingStrip title="Featured" titleIcon="⭐" listings={feed.featured} />
      )}

      <section aria-labelledby={GRID_SECTION_ID} className={styles.gridSection}>
        <h2 id={GRID_SECTION_ID} className={styles.sectionTitle}>
          {heading}
        </h2>

        {!ready || feed.loading ? (
          <LoadingState variant="card" count={6} label="Loading listings…" />
        ) : feed.error ? (
          <ErrorState
            title="Couldn't load listings"
            message={feed.error}
            onRetry={feed.reload}
          />
        ) : feed.grid.length > 0 ? (
          <>
            <ul className={styles.grid}>
              {feed.grid.map((listing) => (
                <li key={listing.id}>
                  <ListingCard listing={listing} />
                </li>
              ))}
            </ul>
            {feed.hasMore && (
              <div ref={sentinelRef} className={styles.loadSentinel} aria-hidden="true" />
            )}
            {feed.loadingMore && (
              <LoadingState variant="card" count={1} label="Loading more listings…" />
            )}
            {feed.loadMoreError && (
              <ErrorState
                title="Couldn't load more listings"
                message={feed.loadMoreError}
                onRetry={feed.retryLoadMore}
              />
            )}
          </>
        ) : (
          <EmptyState
            icon={<IconBuildingStore size={40} />}
            title={emptyTitle(query, filtered)}
            action={filtered ? undefined : emptyAction}
          />
        )}
      </section>
    </div>
  );
}
