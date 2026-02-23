import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TAG_EMOJI } from '@nusa/shared';
import type { Tag } from '@nusa/shared';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

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
  const isAllActive = selectedSlugs.length === 0;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
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

        {/* Tag chips */}
        {tags.map((tag) => {
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

        {/* Right padding so last chip isn't hidden under the fade */}
        <View style={styles.endPadding} />
      </ScrollView>

      {/* Right-edge fade to hint more content */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fadeRight}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: 8,
  },
  endPadding: {
    width: 32,
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
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  chipLabelActive: {
    color: colors.white,
    fontWeight: '600',
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
  },
});
