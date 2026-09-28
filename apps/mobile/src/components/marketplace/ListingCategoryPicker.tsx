import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
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

/** The create/edit listing form's category chips, read out as radio buttons. */
export function ListingCategoryPicker({
  categories,
  selectedId,
  onSelect,
  error,
  onSectionLayout,
}: ListingCategoryPickerProps) {
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
                isSelected && { backgroundColor: (cat.color ?? '#9E9E9E') + '20' },
              ]}
              onPress={() => onSelect(cat.id)}
              accessibilityRole="radio"
              accessibilityLabel={cat.name}
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text
                style={[styles.chipText, isSelected && { color: cat.color ?? colors.primary.main }]}
              >
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
