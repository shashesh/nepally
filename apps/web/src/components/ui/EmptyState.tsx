import React, { type ReactNode } from 'react';
import { Text, Title } from '@mantine/core';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** The heading level; 1 for a page whose empty state is its only heading. Default 3. */
  titleOrder?: 1 | 2 | 3;
}

export function EmptyState({ icon, title, description, action, titleOrder = 3 }: EmptyStateProps) {
  return (
    <div className={styles.root} role="status">
      {icon ? (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <Title order={titleOrder} size="h3">
        {title}
      </Title>
      {description ? <Text className={styles.description}>{description}</Text> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
