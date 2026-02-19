import React, { useState, useRef, useEffect } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Separate visible tags and "more" tags
  const visibleTags = tags.slice(0, MAX_VISIBLE_CHIPS);
  const moreTags = tags.slice(MAX_VISIBLE_CHIPS);
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
  }, [moreOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [moreOpen]);

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
    <div className={styles.container}>
      {/* "All" chip */}
      <button
        className={`${styles.chip} ${isAllActive ? styles.chipActive : ''}`}
        onClick={onAllPress}
      >
        All
      </button>

      {/* Visible tag chips */}
      {visibleTags.map((tag) => {
        const isActive = selectedSlugs.includes(tag.slug);
        const emoji = TAG_EMOJI[tag.slug] || '';
        return (
          <button
            key={tag.id}
            className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
            onClick={() => onTagToggle(tag.slug)}
          >
            {emoji ? `${emoji} ${tag.name}` : tag.name}
          </button>
        );
      })}

      {/* "More" dropdown */}
      {moreTags.length > 0 && (
        <div className={styles.moreWrapper} ref={dropdownRef}>
          <button
            className={`${styles.chip} ${moreSelectedCount > 0 ? styles.chipMoreActive : ''}`}
            onClick={() => setMoreOpen(!moreOpen)}
          >
            More{moreSelectedCount > 0 ? ` +${moreSelectedCount}` : ''}
            <span className={styles.chevron}>▼</span>
          </button>

          {moreOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <span className={styles.dropdownTitle}>Filter by Tags</span>
                <button
                  className={styles.closeBtn}
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className={styles.dropdownContent}>
                {moreTags.map((tag) => {
                  const isSelected = localMoreSelections.includes(tag.slug);
                  const emoji = TAG_EMOJI[tag.slug] || '';
                  return (
                    <button
                      key={tag.id}
                      className={`${styles.dropdownItem} ${isSelected ? styles.dropdownItemSelected : ''}`}
                      onClick={() => handleMoreTagToggle(tag.slug)}
                    >
                      <span className={styles.dropdownItemLabel}>
                        {emoji ? `${emoji} ${tag.name}` : tag.name}
                      </span>
                      {isSelected && <span className={styles.checkmark}>✓</span>}
                    </button>
                  );
                })}
              </div>

              <div className={styles.dropdownFooter}>
                <button className={styles.clearBtn} onClick={handleClear}>
                  Clear
                </button>
                <button className={styles.applyBtn} onClick={handleApply}>
                  Apply{localMoreSelections.length > 0 ? ` (${localMoreSelections.length})` : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
