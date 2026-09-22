import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CloseButton, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  type EventType,
} from '@nepally/shared';
import { ToggleChipGroup, type ToggleChipOption } from '../ui';
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

// The emoji is decoration: each chip is named by its label alone.
const CHIP_OPTIONS: ToggleChipOption[] = CHIPS.map((chip) => ({
  value: chip.key,
  label: (
    <>
      <span aria-hidden="true">{chip.icon}</span> {chip.label}
    </>
  ),
  name: chip.label,
}));

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
  const [prevQuery, setPrevQuery] = useState(value.query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef(value);

  // Keep the local input in sync when the parent changes value.query externally.
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
    setSearchText('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange({ ...latestValueRef.current, query: '' });
  };

  return (
    <div className={styles.filterBar}>
      {/* type="text", not "search": Chromium would add its own clear button beside ours. */}
      <TextInput
        type="text"
        role="searchbox"
        aria-label="Search events"
        placeholder="Search events..."
        value={searchText}
        onChange={handleSearchInput}
        onKeyDown={handleSearchKeyDown}
        leftSection={<IconSearch size={16} aria-hidden="true" />}
        rightSection={
          searchText ? <CloseButton aria-label="Clear search" onClick={handleSearchClear} /> : null
        }
        rightSectionPointerEvents="auto"
      />
      <ToggleChipGroup
        label="Event type"
        hideLabel
        layout="scroll"
        mode="single"
        options={CHIP_OPTIONS}
        value={[value.type]}
        onChange={([type]) => onChange({ ...latestValueRef.current, type: type as EventFilterChip })}
      />
    </div>
  );
}
