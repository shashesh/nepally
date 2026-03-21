import React, { useState, useEffect, useMemo } from 'react';
import { Button, Group, Stack, Checkbox, Text } from '@mantine/core';
import { useClickOutside } from '@mantine/hooks';
import { TAG_EMOJI } from '@nusa/shared';
import type { Tag } from '@nusa/shared';
import styles from './TagFilterBar.module.css';

const MAX_VISIBLE_CHIPS = 4;

interface TagFilterBarProps {
  tags: Tag[];
  selectedSlugs: string[];
  onTagToggle: (slug: string) => void;
  onAllPress: () => void;
}

export default function TagFilterBar({
  tags,
  selectedSlugs,
  onTagToggle,
  onAllPress,
}: TagFilterBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [localMoreSelections, setLocalMoreSelections] = useState<string[]>([]);
  const dropdownRef = useClickOutside(() => setMoreOpen(false));

  const visibleTags = useMemo(() => tags.slice(0, MAX_VISIBLE_CHIPS), [tags]);
  const moreTags = useMemo(() => tags.slice(MAX_VISIBLE_CHIPS), [tags]);
  const moreSelectedCount = moreTags.filter((t) =>
    selectedSlugs.includes(t.slug)
  ).length;

  const isAllActive = selectedSlugs.length === 0;

  useEffect(() => {
    if (moreOpen) {
      setLocalMoreSelections(
        selectedSlugs.filter((slug) => moreTags.some((t) => t.slug === slug))
      );
    }
  }, [moreOpen, moreTags, selectedSlugs]);

  const handleMoreTagToggle = (slug: string) => {
    setLocalMoreSelections((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      return [...prev, slug];
    });
  };

  const handleApply = () => {
    moreTags.forEach((tag) => {
      const wasSelected = selectedSlugs.includes(tag.slug);
      const isNowSelected = localMoreSelections.includes(tag.slug);
      if (wasSelected !== isNowSelected) {
        onTagToggle(tag.slug);
      }
    });
    setMoreOpen(false);
  };

  const handleClear = () => {
    setLocalMoreSelections([]);
  };

  return (
    <Group gap="xs" mb="md" wrap="wrap">
      <Button
        variant={isAllActive ? 'filled' : 'outline'}
        color="nusaPrimary.6"
        radius="xl"
        size="xs"
        onClick={onAllPress}
      >
        All
      </Button>

      {visibleTags.map((tag) => {
        const isActive = selectedSlugs.includes(tag.slug);
        const emoji = TAG_EMOJI[tag.slug] || '';
        return (
          <Button
            key={tag.id}
            variant={isActive ? 'filled' : 'outline'}
            color="nusaPrimary.6"
            radius="xl"
            size="xs"
            onClick={() => onTagToggle(tag.slug)}
          >
            {emoji ? `${emoji} ${tag.name}` : tag.name}
          </Button>
        );
      })}

      {moreTags.length > 0 && (
        <div className={styles.moreWrapper} ref={dropdownRef}>
          <Button
            variant={moreSelectedCount > 0 ? 'light' : 'outline'}
            color="nusaPrimary.6"
            radius="xl"
            size="xs"
            onClick={() => setMoreOpen(!moreOpen)}
          >
            More{moreSelectedCount > 0 ? ` +${moreSelectedCount}` : ''} ▼
          </Button>

          {moreOpen && (
            <div className={styles.dropdown}>
              <Group justify="space-between" p="sm" className={styles.dropdownHeader}>
                <Text fw={600}>Filter by Tags</Text>
                <Button
                  variant="subtle"
                  color="gray"
                  size="compact-xs"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close"
                >
                  ×
                </Button>
              </Group>

              <Stack gap="xs" p="xs" mah={300} className={styles.dropdownContent}>
                {moreTags.map((tag) => {
                  const isSelected = localMoreSelections.includes(tag.slug);
                  const emoji = TAG_EMOJI[tag.slug] || '';
                  return (
                    <Checkbox
                      key={tag.id}
                      label={emoji ? `${emoji} ${tag.name}` : tag.name}
                      checked={isSelected}
                      onChange={() => handleMoreTagToggle(tag.slug)}
                      color="nusaPrimary.6"
                    />
                  );
                })}
              </Stack>

              <Group gap="xs" p="sm" className={styles.dropdownFooter}>
                <Button variant="outline" color="gray" size="xs" flex={1} onClick={handleClear}>
                  Clear
                </Button>
                <Button color="nusaPrimary.6" size="xs" flex={2} onClick={handleApply}>
                  Apply{localMoreSelections.length > 0 ? ` (${localMoreSelections.length})` : ''}
                </Button>
              </Group>
            </div>
          )}
        </div>
      )}
    </Group>
  );
}
