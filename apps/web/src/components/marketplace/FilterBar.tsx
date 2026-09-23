import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CloseButton, NativeSelect, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import type { ListingSortBy, MarketplaceCategory } from '@nepally/shared';
import styles from './FilterBar.module.css';

export interface FilterBarValue {
  category: string; // slug | '' for "All Categories"
  sort: ListingSortBy;
  query: string;
}

interface FilterBarProps {
  categories: MarketplaceCategory[];
  value: FilterBarValue;
  onChange: (next: FilterBarValue) => void;
  lockedCategory?: string;
  searchDebounceMs?: number;
}

const SORT_OPTIONS: { value: ListingSortBy; label: string }[] = [
  { value: 'newest', label: 'Sort: Newest' },
  { value: 'oldest', label: 'Sort: Oldest' },
  { value: 'featured', label: 'Sort: Featured' },
  { value: 'price_asc', label: 'Sort: Price \u2191' },
  { value: 'price_desc', label: 'Sort: Price \u2193' },
];

export function FilterBar({
  categories,
  value,
  onChange,
  lockedCategory,
  searchDebounceMs = 300,
}: FilterBarProps) {
  const [searchText, setSearchText] = useState(value.query);
  const [prevQuery, setPrevQuery] = useState(value.query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef(value);

  // Keep local input in sync when parent value changes externally (e.g., URL nav)
  if (value.query !== prevQuery) {
    setPrevQuery(value.query);
    setSearchText(value.query);
  }

  // The debounced onChange reads the latest value, not the one from the keystroke's render.
  useLayoutEffect(() => {
    latestValueRef.current = value;
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setSearchText(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...latestValueRef.current, query: next });
    }, searchDebounceMs);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onChange({ ...latestValueRef.current, query: searchText });
    }
  };

  const handleSearchClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchText('');
    onChange({ ...latestValueRef.current, query: '' });
  };

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((cat) => ({
      value: cat.slug,
      label: `${cat.emoji ?? ''} ${cat.name}`.trim(),
    })),
  ];

  return (
    <div className={styles.filterBar}>
      {/* NativeSelect, not Select: these are short, fixed lists that need no
          search, and a real <select> gives the native picker on phones. */}
      <NativeSelect
        aria-label="Category"
        className={styles.select}
        data={categoryOptions}
        value={value.category}
        onChange={(e) => onChange({ ...value, category: e.currentTarget.value })}
        disabled={Boolean(lockedCategory)}
      />
      <NativeSelect
        aria-label="Sort"
        className={styles.select}
        data={SORT_OPTIONS}
        value={value.sort}
        onChange={(e) =>
          onChange({ ...value, sort: e.currentTarget.value as ListingSortBy })
        }
      />
      {/* type="text", not "search": Chromium would add its own clear button
          beside ours. */}
      <TextInput
        type="text"
        role="searchbox"
        aria-label="Search listings"
        className={styles.search}
        placeholder="Search Marketplace"
        value={searchText}
        onChange={handleSearchInput}
        onKeyDown={handleSearchKeyDown}
        leftSection={<IconSearch size={16} aria-hidden="true" />}
        rightSection={
          searchText ? (
            <CloseButton aria-label="Clear search" onClick={handleSearchClear} />
          ) : null
        }
        rightSectionPointerEvents="auto"
      />
    </div>
  );
}
