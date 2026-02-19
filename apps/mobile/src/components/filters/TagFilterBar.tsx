import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TAG_EMOJI } from '@nusa/shared';
import type { Tag } from '@nusa/shared';
import { TagSelectorSheet } from './TagSelectorSheet';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_VISIBLE_CHIPS = SCREEN_WIDTH < 375 ? 3 : 4; // 3 on small screens, 4 on larger

interface TagFilterBarProps {
  tags: Tag[];
  selectedSlugs: string[];
  onTagPress: (slug: string) => void;
  onAllPress: () => void;
}

export function TagFilterBar({
  tags,
  selectedSlugs,
  onTagPress,
  onAllPress,
}: TagFilterBarProps) {
  const [sheetVisible, setSheetVisible] = useState(false);

  // Separate visible tags and "more" tags
  const visibleTags = tags.slice(0, MAX_VISIBLE_CHIPS);
  const moreTags = tags.slice(MAX_VISIBLE_CHIPS);
  const moreSelectedCount = moreTags.filter((t) =>
    selectedSlugs.includes(t.slug)
  ).length;

  const isAllActive = selectedSlugs.length === 0;

  const handleMoreTagsApply = (newSelectedSlugs: string[]) => {
    // Get currently selected visible tags
    const visibleSelectedSlugs = selectedSlugs.filter((slug) =>
      visibleTags.some((t) => t.slug === slug)
    );
    // Combine with new "more" selections
    const combinedSlugs = [...visibleSelectedSlugs, ...newSelectedSlugs];

    // Clear all and re-select the combined
    // First clear all (which triggers onAllPress essentially)
    // Then select each one
    // For simplicity, we'll need the parent to handle this differently
    // Let's just update the more tags selections via individual onTagPress calls

    // Remove old "more" selections
    moreTags.forEach((tag) => {
      if (selectedSlugs.includes(tag.slug) && !newSelectedSlugs.includes(tag.slug)) {
        onTagPress(tag.slug); // Toggle off
      }
    });
    // Add new "more" selections
    newSelectedSlugs.forEach((slug) => {
      if (!selectedSlugs.includes(slug)) {
        onTagPress(slug); // Toggle on
      }
    });
  };

  return (
    <View style={styles.container}>
      {/* "All" chip */}
      <TouchableOpacity
        style={[styles.chip, isAllActive && styles.chipActive]}
        onPress={onAllPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.chipLabel, isAllActive && styles.chipLabelActive]}>
          All
        </Text>
      </TouchableOpacity>

      {/* Visible tag chips */}
      {visibleTags.map((tag) => {
        const isActive = selectedSlugs.includes(tag.slug);
        const emoji = TAG_EMOJI[tag.slug] || '';
        return (
          <TouchableOpacity
            key={tag.id}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onTagPress(tag.slug)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
              {emoji ? `${emoji} ${tag.name}` : tag.name}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* "More" chip (only if there are more tags) */}
      {moreTags.length > 0 && (
        <TouchableOpacity
          style={[styles.chip, moreSelectedCount > 0 && styles.chipMoreActive]}
          onPress={() => setSheetVisible(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.chipLabel,
              moreSelectedCount > 0 && styles.chipLabelMoreActive,
            ]}
          >
            More{moreSelectedCount > 0 ? ` +${moreSelectedCount}` : ''}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={moreSelectedCount > 0 ? colors.primary.main : colors.text.secondary}
            style={styles.chevron}
          />
        </TouchableOpacity>
      )}

      {/* Tag Selector Sheet */}
      <TagSelectorSheet
        visible={sheetVisible}
        tags={moreTags}
        selectedSlugs={selectedSlugs.filter((slug) =>
          moreTags.some((t) => t.slug === slug)
        )}
        onClose={() => setSheetVisible(false)}
        onApply={(newSlugs) => {
          handleMoreTagsApply(newSlugs);
          setSheetVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  chipMoreActive: {
    backgroundColor: '#E3F2FD',
    borderColor: colors.primary.main,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  chipLabelActive: {
    color: colors.white,
    fontWeight: '600',
  },
  chipLabelMoreActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 4,
  },
});
