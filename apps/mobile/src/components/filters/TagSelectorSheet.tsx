import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TAG_EMOJI } from '@nusa/shared';
import type { Tag } from '@nusa/shared';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';

interface TagSelectorSheetProps {
  visible: boolean;
  tags: Tag[];
  selectedSlugs: string[];
  onClose: () => void;
  onApply: (selectedSlugs: string[]) => void;
}

export function TagSelectorSheet({
  visible,
  tags,
  selectedSlugs,
  onClose,
  onApply,
}: TagSelectorSheetProps) {
  const [localSelectedSlugs, setLocalSelectedSlugs] = useState<string[]>(selectedSlugs);

  // Sync local state when sheet opens
  useEffect(() => {
    if (visible) {
      setLocalSelectedSlugs(selectedSlugs);
    }
  }, [visible, selectedSlugs]);

  const handleTagPress = (slug: string) => {
    setLocalSelectedSlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      return [...prev, slug];
    });
  };

  const handleClear = () => {
    setLocalSelectedSlugs([]);
  };

  const handleApply = () => {
    onApply(localSelectedSlugs);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filter by Tags</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Tag Grid */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.tagGrid}>
              {tags.map((tag) => {
                const isSelected = localSelectedSlugs.includes(tag.slug);
                const emoji = TAG_EMOJI[tag.slug] || '';
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.tagItem, isSelected && styles.tagItemSelected]}
                    onPress={() => handleTagPress(tag.slug)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tagContent}>
                      <Text
                        style={[
                          styles.tagLabel,
                          isSelected && styles.tagLabelSelected,
                        ]}
                      >
                        {emoji ? `${emoji} ${tag.name}` : tag.name}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.primary.main}
                        />
                      )}
                    </View>
                    {tag.description && (
                      <Text
                        style={styles.tagDescription}
                        numberOfLines={2}
                      >
                        {tag.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.7}
            >
              <Text style={styles.applyButtonText}>
                Apply{localSelectedSlugs.length > 0 ? ` (${localSelectedSlugs.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  tagGrid: {
    gap: spacing.s,
  },
  tagItem: {
    padding: spacing.m,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: colors.primary.main,
  },
  tagContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  tagLabelSelected: {
    color: colors.primary.main,
  },
  tagDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    gap: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearButton: {
    flex: 1,
    paddingVertical: spacing.m,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  clearButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  applyButton: {
    flex: 2,
    paddingVertical: spacing.m,
    borderRadius: 8,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
  },
  applyButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
});
