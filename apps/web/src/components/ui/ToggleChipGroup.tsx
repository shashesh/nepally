import React, { useId, type ReactNode } from 'react';
import { Text, UnstyledButton } from '@mantine/core';
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
}

/**
 * A labelled row of toggle chips: post tags, event types, listing categories.
 *
 * The chips are buttons with `aria-pressed`, not checkboxes. A checkbox would
 * read more naturally for the multi-select case, but the accessible name is
 * what several e2e and unit assertions look these up by, and switching the
 * role would move every one of them for no gain the member can feel.
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

  const describedBy =
    [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.root} role="group" aria-labelledby={labelId} aria-describedby={describedBy}>
      <Text id={labelId} component="span" className={styles.label}>
        {label}
      </Text>

      <div className={styles.chips}>
        {options.map((option) => {
          const isPressed = value.includes(option.value);

          return (
            <UnstyledButton
              key={option.value}
              className={styles.chip}
              data-value={option.value}
              data-pressed={isPressed || undefined}
              aria-pressed={isPressed}
              aria-label={option.name}
              disabled={disabled || (atCap && !isPressed)}
              onClick={() => handlePress(option.value, isPressed)}
            >
              {option.label}
            </UnstyledButton>
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
