import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { MarketplaceCategory } from '@nepally/shared';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';

interface ListingCategoryPickerProps {
  categories: readonly MarketplaceCategory[];
  selectedId: string;
  onSelect: (categoryId: string) => void;
  error?: string;
  /** Reports where the picker sits in the form, so a failed submit can scroll to it. */
  onSectionLayout?: (event: LayoutChangeEvent) => void;
}

/** A category without its own colour is tinted grey. */
const FALLBACK_CATEGORY_COLOR = '#9E9E9E';
/** Hex alpha for the selected chip's tint of the category colour (about 12%). */
const TINT_ALPHA = '20';

/**
 * Each category's selected chip and label, in the category's colour. The
 * colours come from the database, so these are built per category list
 * rather than in the static stylesheet below.
 */
function selectedCategoryStyles(categories: readonly MarketplaceCategory[]) {
  const chips: Record<string, ViewStyle> = {};
  const labels: Record<string, TextStyle> = {};
  for (const cat of categories) {
    chips[cat.id] = { backgroundColor: (cat.color ?? FALLBACK_CATEGORY_COLOR) + TINT_ALPHA };
    labels[cat.id] = { color: cat.color ?? colors.primary.main };
  }
  return { chips: StyleSheet.create(chips), labels: StyleSheet.create(labels) };
}

/** The create/edit listing form's category chips, read out as radio buttons. */
export function ListingCategoryPicker({
  categories,
  selectedId,
  onSelect,
  error,
  onSectionLayout,
}: ListingCategoryPickerProps) {
  const selected = useMemo(() => selectedCategoryStyles(categories), [categories]);
  return (
    <View style={styles.section} onLayout={onSectionLayout}>
      <Text style={styles.label}>Category *</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        accessibilityRole="radiogroup"
        accessibilityLabel="Category"
      >
        {categories.map((cat) => {
          const isSelected = selectedId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                isSelected && styles.chipActive,
                isSelected && selected.chips[cat.id],
              ]}
              onPress={() => onSelect(cat.id)}
              accessibilityRole="radio"
              accessibilityLabel={cat.name}
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text style={[styles.chipText, isSelected && selected.labels[cat.id]]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.m,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  scroll: {
    flexGrow: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: spacing.s,
    gap: spacing.xs,
  },
  chipActive: {
    borderColor: colors.primary.main,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
  },
});
