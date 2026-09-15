import type { ParsedUrlQuery } from 'querystring';
import type { SearchTab } from '@nepally/shared';

const TABS: SearchTab[] = ['all', 'posts', 'listings', 'people'];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Reads /search?q=&tab=&scope= with safe defaults. */
export function parseSearchParams(query: ParsedUrlQuery): { q: string; tab: SearchTab; allMetros: boolean } {
  const tab = first(query.tab);
  return {
    q: first(query.q) ?? '',
    tab: TABS.includes(tab as SearchTab) ? (tab as SearchTab) : 'all',
    allMetros: first(query.scope) === 'all',
  };
}

/** Builds a shareable /search URL; defaults (tab=all, metro scope) are omitted. */
export function buildSearchHref({ q, tab = 'all', allMetros = false }: { q: string; tab?: SearchTab; allMetros?: boolean }): string {
  const params = new URLSearchParams({ q });
  if (tab !== 'all') params.set('tab', tab);
  if (allMetros) params.set('scope', 'all');
  return `/search?${params.toString()}`;
}
