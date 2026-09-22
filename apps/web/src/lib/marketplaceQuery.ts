import type { ParsedUrlQuery } from 'querystring';
import type { ListingSortBy } from '@nepally/shared';

/** The two discovery rails the index can be narrowed to. */
export type DiscoveryView = 'featured' | 'trending' | null;

/**
 * `/marketplace/search?q=…` reuses the `[category]` route, so this slug marks a
 * search rather than naming a category.
 */
export const SEARCH_SLUG = 'search';

export interface MarketplaceQuery {
  view: DiscoveryView;
  /** A category slug, or '' for all categories. Never the search slug. */
  category: string;
  q: string;
  sort: ListingSortBy;
  isSearch: boolean;
}

const KNOWN_SORTS: ListingSortBy[] = [
  'newest',
  'oldest',
  'featured',
  'price_asc',
  'price_desc',
];

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function parseSort(raw: string): ListingSortBy {
  return (KNOWN_SORTS as string[]).includes(raw) ? (raw as ListingSortBy) : 'newest';
}

function parseView(raw: string): DiscoveryView {
  return raw === 'featured' || raw === 'trending' ? raw : null;
}

/**
 * One reading of the marketplace's URL state, for both `/marketplace` and
 * `/marketplace/[category]`. Both routes expose the slug as `query.category`,
 * so they can share this.
 *
 * Replaces the two drifted copies that lived on the pages: one took `string`
 * and the other `string | string[] | undefined`, so a repeated parameter was
 * read differently depending on which page you were on.
 */
export function parseMarketplaceQuery(query: ParsedUrlQuery): MarketplaceQuery {
  const slug = readParam(query.category);
  const isSearch = slug === SEARCH_SLUG;

  return {
    view: parseView(readParam(query.view)),
    category: isSearch ? '' : slug,
    q: readParam(query.q),
    sort: parseSort(readParam(query.sort)),
    isSearch,
  };
}

/** Whether anything narrows the marketplace, so the discovery strips are hidden. */
export function isFilteredQuery(query: MarketplaceQuery): boolean {
  return (
    Boolean(query.category) ||
    Boolean(query.q) ||
    query.sort !== 'newest' ||
    query.view !== null ||
    query.isSearch
  );
}
