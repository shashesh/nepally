import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ListingSortBy, MarketplaceCategory } from '@nepally/shared';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';

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
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price \u2191' },
  { value: 'price_desc', label: 'Price \u2193' },
];

export function FilterBar({
  categories,
  value,
  onChange,
  lockedCategory,
  searchDebounceMs = 300,
}: FilterBarProps) {
  const [searchText, setSearchText] = useState(value.query);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
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
    debounceRef.current = setTimeout(() => {
      onChange({ ...latestValueRef.current, query: next });
    }, searchDebounceMs);
  };

  const handleSearchClear = () => {
    setSearchText('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange({ ...latestValueRef.current, query: '' });
  };

  const isCategoryLocked = Boolean(lockedCategory);
  const selectedCategory = categories.find((c) => c.slug === value.category);
  const categoryLabel = selectedCategory
    ? `${selectedCategory.emoji ?? ''} ${selectedCategory.name}`.trim()
    : 'All Categories';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === value.sort)?.label ?? 'Newest';

  const handleCategorySelect = (slug: string) => {
    setCategorySheetOpen(false);
    onChange({ ...value, category: slug });
  };

  const handleSortSelect = (sortBy: ListingSortBy) => {
    setSortSheetOpen(false);
    onChange({ ...value, sort: sortBy });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor={colors.text.tertiary}
          value={searchText}
          onChangeText={handleSearchChange}
          accessibilityLabel="Search listings"
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

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.pill, isCategoryLocked && styles.pillDisabled]}
          onPress={() => !isCategoryLocked && setCategorySheetOpen(true)}
          activeOpacity={isCategoryLocked ? 1 : 0.7}
          disabled={isCategoryLocked}
          accessibilityLabel="Category filter"
          accessibilityRole="button"
        >
          <Text
            style={[styles.pillText, isCategoryLocked && styles.pillTextDisabled]}
            numberOfLines={1}
          >
            {categoryLabel}
          </Text>
          {!isCategoryLocked && (
            <Ionicons name="chevron-down" size={14} color={colors.text.secondary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pill}
          onPress={() => setSortSheetOpen(true)}
          activeOpacity={0.7}
          accessibilityLabel="Sort filter"
          accessibilityRole="button"
        >
          <Text style={styles.pillText} numberOfLines={1}>
            Sort: {sortLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Category picker sheet */}
      <Modal
        visible={categorySheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCategorySheetOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setCategorySheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Category</Text>
              <TouchableOpacity
                onPress={() => setCategorySheetOpen(false)}
                accessibilityLabel="Close category picker"
              >
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity
                style={[styles.sheetOption, value.category === '' && styles.sheetOptionSelected]}
                onPress={() => handleCategorySelect('')}
                activeOpacity={0.7}
              >
                <Text style={styles.sheetOptionText}>All Categories</Text>
                {value.category === '' && (
                  <Ionicons name="checkmark" size={20} color={colors.primary.main} />
                )}
              </TouchableOpacity>
              {categories.map((cat) => {
                const isSelected = value.category === cat.slug;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.sheetOption, isSelected && styles.sheetOptionSelected]}
                    onPress={() => handleCategorySelect(cat.slug)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sheetOptionText}>
                      {cat.emoji ?? ''} {cat.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={colors.primary.main} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sort picker sheet */}
      <Modal
        visible={sortSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSortSheetOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setSortSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Sort By</Text>
              <TouchableOpacity
                onPress={() => setSortSheetOpen(false)}
                accessibilityLabel="Close sort picker"
              >
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = value.sort === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.sheetOption, isSelected && styles.sheetOptionSelected]}
                    onPress={() => handleSortSelect(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sheetOptionText}>{opt.label}</Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={colors.primary.main} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    gap: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillDisabled: {
    opacity: 0.6,
  },
  pillText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  pillTextDisabled: {
    color: colors.text.secondary,
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  sheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetOptionSelected: {
    backgroundColor: '#E3F2FD',
  },
  sheetOptionText: {
    ...typography.body,
    color: colors.text.primary,
  },
});
