import React, { useEffect, useRef, useState } from 'react';
import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  type EventType,
} from '@nepally/shared';
import styles from './EventFilterBar.module.css';

export type EventFilterChip = 'all' | EventType;

export interface EventFilterBarValue {
  type: EventFilterChip;
  query: string;
}

const CHIPS: { key: EventFilterChip; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '🗓️' },
  ...EVENT_TYPES.map((t) => ({
    key: t as EventFilterChip,
    label: EVENT_TYPE_LABELS[t],
    icon: EVENT_TYPE_ICONS[t],
  })),
];

interface EventFilterBarProps {
  value: EventFilterBarValue;
  onChange: (next: EventFilterBarValue) => void;
  searchDebounceMs?: number;
}

export function EventFilterBar({
  value,
  onChange,
  searchDebounceMs = 300,
}: EventFilterBarProps) {
  const [searchText, setSearchText] = useState(value.query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef(value);
  latestValueRef.current = value;

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

  const handleSearchClear = () => {
    setSearchText('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange({ ...latestValueRef.current, query: '' });
  };

  return (
    <div className={styles.filterBar}>
      <div className={styles.searchWrapper}>
        <span className={styles.searchIcon} aria-hidden="true">🔍</span>
        <input
          type="text"
          role="searchbox"
          aria-label="Search events"
          className={styles.searchInput}
          placeholder="Search events..."
          value={searchText}
          onChange={handleSearchInput}
          onKeyDown={handleSearchKeyDown}
        />
        {searchText.length > 0 && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleSearchClear}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      <div className={styles.chips}>
        {CHIPS.map((chip) => {
          const isActive = value.type === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
              onClick={() => onChange({ ...latestValueRef.current, type: chip.key })}
              aria-pressed={isActive}
            >
              {chip.icon} {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
