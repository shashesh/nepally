import React from 'react';
import { Button } from '@mantine/core';
import { IconCheck, IconStar } from '@tabler/icons-react';
import type { RsvpStatus } from '@nepally/shared';
import styles from './EventResponseControl.module.css';

export interface EventResponseControlProps {
  value: RsvpStatus | null;
  /** Pressing the pressed button passes null. */
  onChange: (next: RsvpStatus | null) => void;
  /** A change is saving: presses are ignored and focus stays put (decision 6). */
  busy?: boolean;
  /** Names the group. Cards pass "Your response to <title>", so many groups on one page stay distinguishable. */
  label?: string;
  size?: 'sm' | 'md';
}

const OPTIONS: ReadonlyArray<{ status: RsvpStatus; label: string; Icon: typeof IconStar }> = [
  { status: 'interested', label: 'Interested', Icon: IconStar },
  { status: 'going', label: 'Going', Icon: IconCheck },
];

/**
 * The Interested / Going toggle pair. Each button keeps one name and carries
 * the state in `aria-pressed`. While busy both stay focusable and inert.
 */
export function EventResponseControl({
  value,
  onChange,
  busy = false,
  label = 'Your response',
  size = 'md',
}: EventResponseControlProps) {
  return (
    <div role="group" aria-label={label} className={styles.control}>
      {OPTIONS.map(({ status, label: optionLabel, Icon }) => {
        const pressed = value === status;
        return (
          <Button
            key={status}
            type="button"
            size={size}
            variant={pressed ? 'filled' : 'default'}
            leftSection={<Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" />}
            aria-pressed={pressed}
            aria-disabled={busy || undefined}
            data-disabled={busy || undefined}
            onClick={busy ? undefined : () => onChange(pressed ? null : status)}
          >
            {optionLabel}
          </Button>
        );
      })}
    </div>
  );
}
