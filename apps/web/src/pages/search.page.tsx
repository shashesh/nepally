import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Badge, Button, SegmentedControl, Tabs } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { getShortMetroName, normalizeSearchInput } from '@nepally/shared';
import type { SearchSuggestions, SearchTab } from '@nepally/shared';
import { SearchResultItem, getSearchResultHref, type SearchResult } from '../components/search/SearchResultItem';
import { buildSearchHref, parseSearchParams } from '../components/search/searchUrl';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  scrollFocusedTabIntoView,
  scrollingTabsClassNames,
} from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { useLocation } from '../hooks/useLocation';
import { useSearchPage } from '../hooks/useSearchPage';
import styles from '../styles/Search.module.css';

type TypeTab = Exclude<SearchTab, 'all'>;

const TABS: SearchTab[] = ['all', 'posts', 'listings', 'people'];
const TAB_LABELS: Record<SearchTab, string> = { all: 'All', posts: 'Posts', listings: 'Listings', people: 'People' };

function resultKey(result: SearchResult): string {
  if (result.kind === 'post') return `post:${result.post.id}`;
  if (result.kind === 'listing') return `listing:${result.listing.id}`;
  return `person:${result.person.id}`;
}

function previewResults(preview: SearchSuggestions, tab: TypeTab): SearchResult[] {
  if (tab === 'posts') return preview.posts.items.map((post) => ({ kind: 'post', post }));
  if (tab === 'listings') return preview.listings.items.map((listing) => ({ kind: 'listing', listing }));
  return preview.people.items.map((person) => ({ kind: 'person', person }));
}

function ResultList({ results, query }: { results: SearchResult[]; query: string }) {
  return (
    <ul className={styles.list}>
      {results.map((result) => (
        <li key={resultKey(result)}>
          <Link href={getSearchResultHref(result)} className={styles.resultLink}>
            <SearchResultItem result={result} query={query} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeLocation } = useLocation();
  const { q, tab, allMetros } = parseSearchParams(router.query);
  const query = normalizeSearchInput(q);
  const metroLabel = activeLocation ? getShortMetroName(activeLocation.metro_name) : 'My metro';
  // LocationProvider fills activeLocation asynchronously; without the fallback a
  // direct /search?q= load searches global rows only. FeedPage does the same.
  const metroId = activeLocation?.metro_area_id ?? user?.metro_area_id ?? null;
  // The search RPCs are revoked from anon, so stay idle until the viewer is
  // known to be signed in rather than firing calls that must fail.
  const state = useSearchPage({ query: user ? query : null, tab, allMetros, metroId });
  const { sentinelRef } = useInfiniteScroll({ hasMore: state.hasMore, loading: state.loadingMore, onLoadMore: state.loadMore });

  useEffect(() => {
    if (!user) void router.replace('/login');
  }, [user, router]);

  if (!user) return null;

  const updateUrl = (next: { tab?: SearchTab; allMetros?: boolean }) => {
    void router.replace(
      buildSearchHref({ q: query ?? '', tab: next.tab ?? tab, allMetros: next.allMetros ?? allMetros }),
      undefined,
      { shallow: true, scroll: false }
    );
  };

  const allMetrosAction = allMetros ? undefined : (
    <Button variant="default" onClick={() => updateUrl({ allMetros: true })}>
      Search all metros
    </Button>
  );

  if (!query) {
    return (
      <>
        <Head>
          <title>Search - Nepally</title>
        </Head>
        <PageHeader title="Search" />
        <EmptyState
          titleOrder={2}
          icon={<IconSearch size={22} />}
          title="Search Nepally"
          description="Use the search bar to find posts, marketplace listings and people."
        />
      </>
    );
  }

  const totalCount = state.counts ? state.counts.posts + state.counts.listings + state.counts.people : null;

  return (
    <>
      <Head>
        <title>{`Search: ${query} - Nepally`}</title>
      </Head>
      <PageHeader
        title={`Results for “${query}”`}
        actions={
          <SegmentedControl
            aria-label="Search scope"
            value={allMetros ? 'all' : 'metro'}
            onChange={(value) => updateUrl({ allMetros: value === 'all' })}
            data={[
              { value: 'metro', label: metroLabel },
              { value: 'all', label: 'All metros' },
            ]}
          />
        }
      />

      {state.error ? <ErrorState message="We couldn't load search results." onRetry={state.retry} /> : null}

      <Tabs
        value={tab}
        onChange={(value) => value && updateUrl({ tab: value as SearchTab })}
        keepMounted={false}
        classNames={{ ...scrollingTabsClassNames, list: `${scrollingTabsClassNames.list} ${styles.tabs}` }}
      >
        <Tabs.List aria-label="Result types">
          {TABS.map((key) => {
            const count = key === 'all' ? totalCount : state.counts?.[key] ?? null;
            return (
              <Tabs.Tab
                key={key}
                value={key}
                onFocus={scrollFocusedTabIntoView}
                rightSection={count === null ? null : <Badge variant="light" color="ink" size="sm">{count}</Badge>}
              >
                {TAB_LABELS[key]}
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        <Tabs.Panel value="all" className={styles.panel}>
          {/* ErrorState above already explains the failure; a skeleton or an
              empty state here would claim the request is still running, or that
              it succeeded with nothing to show. */}
          {state.error ? null : state.loading || !state.preview ? (
            <LoadingState label="Searching…" />
          ) : totalCount === 0 ? (
            <EmptyState titleOrder={2} title={`Nothing matches “${query}”`} description={allMetros ? undefined : `Nothing in ${metroLabel} yet.`} action={allMetrosAction} />
          ) : (
            (['posts', 'listings', 'people'] as TypeTab[]).map((key) => {
              const group = state.preview![key];
              if (group.items.length === 0) return null;
              return (
                <section key={key} aria-labelledby={`search-${key}`} className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h2 id={`search-${key}`} className={styles.sectionTitle}>
                      {TAB_LABELS[key]}
                    </h2>
                    {group.hasMore ? (
                      <Button variant="subtle" size="compact-sm" onClick={() => updateUrl({ tab: key })}>
                        See all {group.totalCount} {TAB_LABELS[key].toLowerCase()} →
                      </Button>
                    ) : null}
                  </div>
                  <ResultList results={previewResults(state.preview!, key)} query={query} />
                </section>
              );
            })
          )}
        </Tabs.Panel>

        {(['posts', 'listings', 'people'] as TypeTab[]).map((key) => (
          <Tabs.Panel key={key} value={key} className={styles.panel}>
            {state.error && state.items.length === 0 ? null : state.loading ? (
              <LoadingState label="Searching…" />
            ) : state.items.length === 0 ? (
              <EmptyState
                titleOrder={2}
                title={`No ${TAB_LABELS[key].toLowerCase()} match “${query}”`}
                description={allMetros ? undefined : `Nothing in ${metroLabel} yet.`}
                action={allMetrosAction}
              />
            ) : (
              <>
                <ResultList results={state.items} query={query} />
                <div ref={sentinelRef} />
                {state.loadingMore ? <LoadingState count={1} label="Loading more…" /> : null}
              </>
            )}
          </Tabs.Panel>
        ))}
      </Tabs>
    </>
  );
}
