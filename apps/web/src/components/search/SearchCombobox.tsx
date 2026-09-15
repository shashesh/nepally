import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Combobox, Loader, Text, TextInput, useCombobox } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { getShortMetroName } from '@nepally/shared';
import type { SearchTab } from '@nepally/shared';
import { useLocation } from '../../hooks/useLocation';
import { useSearchSuggestions } from '../../hooks/useSearchSuggestions';
import { SearchResultItem, getSearchResultHref, type SearchResult } from './SearchResultItem';
import { buildSearchHref } from './searchUrl';
import styles from './SearchCombobox.module.css';

export interface SearchComboboxProps {
  /** `dropdown` floats under the top-bar input; `inline` lists results below it (phone overlay). */
  layout?: 'dropdown' | 'inline';
  autoFocus?: boolean;
  /** Called after navigating away, e.g. to close the phone overlay. */
  onNavigate?: () => void;
}

const GROUP_NOUNS: Record<Exclude<SearchTab, 'all'>, string> = { posts: 'posts', listings: 'listings', people: 'people' };

export function SearchCombobox({ layout = 'dropdown', autoFocus = false, onNavigate }: SearchComboboxProps) {
  const router = useRouter();
  const { activeLocation } = useLocation();
  const [value, setValue] = useState('');
  const [allMetros, setAllMetros] = useState(false);
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });

  const metroId = activeLocation?.metro_area_id ?? null;
  const metroLabel = activeLocation ? getShortMetroName(activeLocation.metro_name) : 'your area';
  const { query, data, loading, error } = useSearchSuggestions(value, { metroId, allMetros });

  const results = new Map<string, SearchResult>();
  data?.posts.items.forEach((post) => results.set(`post:${post.id}`, { kind: 'post', post }));
  data?.listings.items.forEach((listing) => results.set(`listing:${listing.id}`, { kind: 'listing', listing }));
  data?.people.items.forEach((person) => results.set(`person:${person.id}`, { kind: 'person', person }));
  const isEmpty = Boolean(data) && results.size === 0;

  const navigate = (href: string) => {
    combobox.closeDropdown();
    onNavigate?.();
    void router.push(href);
  };

  const handleOptionSubmit = (optionValue: string) => {
    if (!query) return;
    if (optionValue === 'all') return navigate(buildSearchHref({ q: query, allMetros }));
    if (optionValue === 'scope:all') {
      setAllMetros(true);
      return;
    }
    if (optionValue.startsWith('more:')) {
      return navigate(buildSearchHref({ q: query, tab: optionValue.slice(5) as SearchTab, allMetros }));
    }
    const result = results.get(optionValue);
    if (result) navigate(getSearchResultHref(result));
  };

  const renderGroup = (tab: Exclude<SearchTab, 'all'>, label: string) => {
    const group = data?.[tab];
    if (!group || group.items.length === 0) return null;
    const prefix = tab === 'posts' ? 'post' : tab === 'listings' ? 'listing' : 'person';
    return (
      <Combobox.Group label={label}>
        {group.items.map((item) => {
          const key = `${prefix}:${item.id}`;
          return (
            <Combobox.Option key={key} value={key} className={styles.option}>
              <SearchResultItem result={results.get(key)!} query={query} compact />
            </Combobox.Option>
          );
        })}
        {group.hasMore ? (
          <Combobox.Option value={`more:${tab}`} className={styles.more}>
            {group.totalCount - group.items.length} more {GROUP_NOUNS[tab]} →
          </Combobox.Option>
        ) : null}
      </Combobox.Group>
    );
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleOptionSubmit}
      withinPortal={layout === 'dropdown'}
      position="bottom-start"
      width={layout === 'dropdown' ? 520 : undefined}
      classNames={layout === 'inline' ? { dropdown: styles.inlineDropdown } : undefined}
    >
      <Combobox.Target>
        <TextInput
          value={value}
          onChange={(event) => {
            setValue(event.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            if (layout === 'dropdown') combobox.closeDropdown();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && query && combobox.getSelectedOptionIndex() === -1) {
              event.preventDefault();
              navigate(buildSearchHref({ q: query, allMetros }));
            }
          }}
          placeholder="Search posts, listings, people"
          aria-label="Search Nepally"
          leftSection={<IconSearch size={16} aria-hidden="true" />}
          rightSection={loading ? <Loader size="xs" /> : null}
          autoFocus={autoFocus}
          className={styles.input}
        />
      </Combobox.Target>

      <Combobox.Dropdown hidden={!query}>
        <Combobox.Options className={styles.options}>
          {error ? <Combobox.Empty>Search is unavailable right now</Combobox.Empty> : null}
          {renderGroup('posts', allMetros ? 'Posts' : `Posts in ${metroLabel}`)}
          {renderGroup('listings', 'Listings')}
          {renderGroup('people', 'People')}
          {isEmpty && !loading ? (
            <>
              <Combobox.Empty>{allMetros ? 'No matches anywhere yet' : `No matches in ${metroLabel}`}</Combobox.Empty>
              {!allMetros ? (
                <Combobox.Option value="scope:all" className={styles.more}>
                  Search all metros
                </Combobox.Option>
              ) : null}
            </>
          ) : null}
          {query && !isEmpty ? (
            <Combobox.Option value="all" className={styles.seeAll}>
              See all results for “{query}”
            </Combobox.Option>
          ) : null}
        </Combobox.Options>
        {layout === 'dropdown' ? (
          <Combobox.Footer>
            <Text size="xs" c="dimmed">
              ↑ ↓ to move · Enter to open · Esc to close
            </Text>
          </Combobox.Footer>
        ) : null}
      </Combobox.Dropdown>
    </Combobox>
  );
}
