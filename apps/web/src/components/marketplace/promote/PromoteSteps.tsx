import React from 'react';
import { VisuallyHidden } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import styles from './PromoteSteps.module.css';

export interface PromoteStepsProps {
  labels: readonly string[];
  /** 1-based. */
  current: number;
}

/**
 * Where the member is in the promote wizard. An ordered list, not Mantine's
 * Stepper: its steps render as buttons, and this wizard must not let a
 * member click past a step it has not validated.
 */
export function PromoteSteps({ labels, current }: PromoteStepsProps) {
  return (
    <ol className={styles.list} aria-label="Progress">
      {labels.map((label, index) => {
        const number = index + 1;
        const state = number < current ? 'done' : number === current ? 'current' : 'upcoming';
        return (
          <li
            key={label}
            className={styles.step}
            data-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className={styles.marker} aria-hidden="true">
              {state === 'done' ? <IconCheck size={14} /> : number}
            </span>
            <span className={styles.label}>
              {label}
              {state === 'done' ? <VisuallyHidden>, completed</VisuallyHidden> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
