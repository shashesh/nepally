import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  type EventType,
} from '@nepally/shared';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';

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

  const handleSearchChange = (next: string) => {
    setSearchText(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchDebounceMs === 0) {
      onChange({ ...latestValueRef.current, query: next });
      return;
    }
    debounceRef.current = setTimeout(() => {
      onChange({ ...latestValueRef.current, query: next });
    }, searchDebounceMs);
  };

  const handleSearchClear = () => {
    setSearchText('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange({ ...latestValueRef.current, query: '' });
  };

  return (
    <View style={styles.container}>
      {/* Search row */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor={colors.text.tertiary}
          value={searchText}
          onChangeText={handleSearchChange}
          accessibilityLabel="Search events"
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={handleSearchClear}
            accessibilityLabel="Clear search"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Type chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {CHIPS.map((chip) => {
          const isActive = value.type === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onChange({ ...latestValueRef.current, type: chip.key })}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${chip.label}`}
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip.icon} {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: spacing.xs,
    gap: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.background,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.m,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.text.primary,
    padding: 0,
  },
  chipsRow: {
    gap: 8,
    flexDirection: 'row',
    paddingBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  chipText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
});
