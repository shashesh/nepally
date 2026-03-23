import React, { useState, useEffect, useMemo } from 'react';
import { Button, Checkbox, Chip, CloseButton, Group, Popover, Stack, Text } from '@mantine/core';
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

  // Separate visible tags and "more" tags
  const visibleTags = useMemo(() => tags.slice(0, MAX_VISIBLE_CHIPS), [tags]);
  const moreTags = useMemo(() => tags.slice(MAX_VISIBLE_CHIPS), [tags]);
  const moreSelectedCount = moreTags.filter((t) =>
    selectedSlugs.includes(t.slug)
  ).length;

  const isAllActive = selectedSlugs.length === 0;

  // Sync local state when dropdown opens
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
    // Remove old "more" selections and add new ones
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
    <Group gap="xs" wrap="wrap" mb="md">
      {/* "All" chip */}
      <Chip
        checked={isAllActive}
        onChange={onAllPress}
        variant="outline"
        radius="xl"
      >
        All
      </Chip>

      {/* Visible tag chips */}
      {visibleTags.map((tag) => {
        const isActive = selectedSlugs.includes(tag.slug);
        const emoji = TAG_EMOJI[tag.slug] || '';
        return (
          <Chip
            key={tag.id}
            checked={isActive}
            onChange={() => onTagToggle(tag.slug)}
            variant="outline"
            radius="xl"
          >
            {emoji ? `${emoji} ${tag.name}` : tag.name}
          </Chip>
        );
      })}

      {/* "More" dropdown */}
      {moreTags.length > 0 && (
        <Popover
          opened={moreOpen}
          onChange={setMoreOpen}
          position="bottom-start"
          shadow="md"
          radius="md"
          width={300}
          withinPortal={false}
          transitionProps={{ duration: 0 }}
        >
          <Popover.Target>
            <Button
              variant={moreSelectedCount > 0 ? 'light' : 'default'}
              size="compact-sm"
              radius="xl"
              onClick={() => setMoreOpen((o) => !o)}
              rightSection={<span className={styles.chevron}>▼</span>}
            >
              More{moreSelectedCount > 0 ? ` +${moreSelectedCount}` : ''}
            </Button>
          </Popover.Target>

          <Popover.Dropdown p={0}>
            <Group justify="space-between" p="sm" className={styles.dropdownHeader}>
              <Text fw={600} size="sm">Filter by Tags</Text>
              <CloseButton
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                size="sm"
              />
            </Group>

            <Stack gap="xs" p="sm">
              {moreTags.map((tag) => {
                const isSelected = localMoreSelections.includes(tag.slug);
                const emoji = TAG_EMOJI[tag.slug] || '';
                return (
                  <Checkbox
                    key={tag.id}
                    label={emoji ? `${emoji} ${tag.name}` : tag.name}
                    checked={isSelected}
                    onChange={() => handleMoreTagToggle(tag.slug)}
                  />
                );
              })}
            </Stack>

            <Group justify="space-between" p="sm" className={styles.dropdownFooter}>
              <Button variant="subtle" size="compact-sm" onClick={handleClear} color="gray">
                Clear
              </Button>
              <Button size="compact-sm" onClick={handleApply}>
                Apply{localMoreSelections.length > 0 ? ` (${localMoreSelections.length})` : ''}
              </Button>
            </Group>
          </Popover.Dropdown>
        </Popover>
      )}
    </Group>
  );
}
