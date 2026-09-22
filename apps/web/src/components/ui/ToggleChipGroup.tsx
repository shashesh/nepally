import React, { useId, type ReactNode } from 'react';
import { Text, VisuallyHidden } from '@mantine/core';
import { scrollFocusedTabIntoView } from './scrollingTabs';
import styles from './ToggleChipGroup.module.css';

export interface ToggleChipOption {
  value: string;
  /** Rendered inside the chip; often carries an emoji. */
  label: ReactNode;
  /** Accessible name, when the label is decorated. Defaults to the label. */
  name?: string;
}

export interface ToggleChipGroupProps {
  /** Names the group for assistive technology, e.g. "Tags". */
  label: string;
  options: ToggleChipOption[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Single-select replaces the pick; multiple toggles it. Default 'multiple'. */
  mode?: 'single' | 'multiple';
  /** Multi-select cap. Unpressed chips are disabled once it is reached. */
  max?: number;
  description?: ReactNode;
  error?: string;
  disabled?: boolean;
  /** Keeps the group's name for assistive technology only. */
  hideLabel?: boolean;
  /** 'scroll' keeps the chips on one line and scrolls them sideways below 40em. Default 'wrap'. */
  layout?: 'wrap' | 'scroll';
}

/**
 * A labelled row of toggle chips: post tags, event types, listing categories.
 *
 * The chips are buttons with `aria-pressed`, not checkboxes. A checkbox would
 * read more naturally for the multi-select case, but the accessible name is
 * what several e2e and unit assertions look these up by, and switching the
 * role would move every one of them for no gain the member can feel.
 *
 * They are plain `<button>`s rather than Mantine `UnstyledButton`s, the way
 * PhotoCarousel's controls are. UnstyledButton's reset sets padding, border
 * and background from a single class, which ties this file's `.chip` on
 * specificity and wins on order, leaving the chips looking like bare text.
 * `components/ui/` is exempt from the raw-element lint rule for exactly this,
 * and the focus ring comes from the `:where(...)` rule in globals.css.
 */
export function ToggleChipGroup({
  label,
  options,
  value,
  onChange,
  mode = 'multiple',
  max,
  description,
  error,
  disabled,
  hideLabel = false,
  layout = 'wrap',
}: ToggleChipGroupProps) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const descriptionId = `${baseId}-description`;
  const errorId = `${baseId}-error`;

  const atCap = mode === 'multiple' && max !== undefined && value.length >= max;

  function handlePress(optionValue: string, isPressed: boolean) {
    if (mode === 'single') {
      // Today's pages cannot clear a single-select choice by pressing it
      // again, and nothing asks for that; pressing the current pick is a no-op.
      if (isPressed) return;
      onChange([optionValue]);
      return;
    }

    onChange(
      isPressed ? value.filter((entry) => entry !== optionValue) : [...value, optionValue]
    );
  }

  const labelNode = (
    <Text id={labelId} component="span" className={styles.label}>
      {label}
    </Text>
  );

  const describedBy =
    [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.root} role="group" aria-labelledby={labelId} aria-describedby={describedBy}>
      {hideLabel ? <VisuallyHidden>{labelNode}</VisuallyHidden> : labelNode}

      <div className={styles.chips} data-layout={layout}>
        {options.map((option) => {
          const isPressed = value.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              className={styles.chip}
              data-value={option.value}
              data-pressed={isPressed || undefined}
              aria-pressed={isPressed}
              aria-label={option.name}
              disabled={disabled || (atCap && !isPressed)}
              onClick={() => handlePress(option.value, isPressed)}
              // Chromium's focus scroll skips a chip that is only partly clipped.
              onFocus={layout === 'scroll' ? scrollFocusedTabIntoView : undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {description && (
        <Text id={descriptionId} size="xs" c="dimmed">
          {description}
        </Text>
      )}

      {error && (
        <Text id={errorId} size="xs" className={styles.error}>
          {error}
        </Text>
      )}
    </div>
  );
}
