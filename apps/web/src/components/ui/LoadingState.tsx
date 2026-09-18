import React from 'react';
import { Skeleton, VisuallyHidden } from '@mantine/core';
import styles from './LoadingState.module.css';

export type LoadingStateVariant = 'list' | 'card' | 'detail';

export interface LoadingStateProps {
  variant?: LoadingStateVariant;
  count?: number;
  label?: string;
}

export function LoadingState({ variant = 'list', count = 3, label = 'Loading…' }: LoadingStateProps) {
  const rows = variant === 'detail' ? 1 : count;

  return (
    <div className={styles.root} role="status" aria-live="polite" aria-busy="true">
      <VisuallyHidden>{label}</VisuallyHidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles[variant]} data-testid="loading-row">
          {variant === 'card' ? <Skeleton height={160} radius="lg" /> : null}
          {variant === 'list' ? <Skeleton circle height={40} /> : null}
          <div className={styles.lines}>
            <Skeleton height={variant === 'detail' ? 28 : 14} width={variant === 'detail' ? '60%' : '70%'} />
            <Skeleton height={12} width="45%" />
            {variant === 'detail' ? (
              <>
                <Skeleton height={14} />
                <Skeleton height={14} />
                <Skeleton height={14} width="80%" />
              </>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
