import React, { useEffect, useRef, useState } from 'react';
import { Select } from '@mantine/core';
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef(value);
  latestValueRef.current = value;

  // Keep local input in sync when parent value changes externally (e.g., URL nav)
  useEffect(() => {
    setSearchText(value.query);
  }, [value.query]);

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

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((cat) => ({
      value: cat.slug,
      label: `${cat.emoji ?? ''} ${cat.name}`.trim(),
    })),
  ];

  return (
    <div className={styles.filterBar}>
      <div className={styles.selectWrapper}>
        <Select
          aria-label="Category"
          data={categoryOptions}
          value={value.category}
          onChange={(v) => onChange({ ...value, category: v ?? '' })}
          disabled={Boolean(lockedCategory)}
          allowDeselect={false}
          placeholder="All Categories"
          comboboxProps={{ withinPortal: true }}
        />
      </div>
      <div className={styles.selectWrapper}>
        <Select
          aria-label="Sort"
          data={SORT_OPTIONS}
          value={value.sort}
          onChange={(v) => onChange({ ...value, sort: (v as ListingSortBy) ?? 'newest' })}
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
        />
      </div>
      <div className={styles.searchWrapper}>
        <span className={styles.searchIcon} aria-hidden="true">🔍</span>
        <input
          type="text"
          role="searchbox"
          aria-label="Search listings"
          className={styles.searchInput}
          placeholder="Search Marketplace"
          value={searchText}
          onChange={handleSearchInput}
          onKeyDown={handleSearchKeyDown}
        />
      </div>
    </div>
  );
}
