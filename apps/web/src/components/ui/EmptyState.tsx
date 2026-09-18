import React, { type ReactNode } from 'react';
import { Text, Title } from '@mantine/core';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.root} role="status">
      {icon ? (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <Title order={3} className={styles.title}>
        {title}
      </Title>
      {description ? <Text className={styles.description}>{description}</Text> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
