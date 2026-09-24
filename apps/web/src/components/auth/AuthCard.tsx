import React, { type ReactNode, type Ref } from 'react';
import { Paper, Text, Title } from '@mantine/core';
import styles from './AuthCard.module.css';

export interface AuthCardProps {
  title: string;
  description?: ReactNode;
  /** Lets a step change move focus to the heading (decision 8). */
  titleRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
  /** Cross-links under the card body ("Don't have an account? Sign up"). */
  footer?: ReactNode;
}

/** The card every auth page sits in: the page's h1, an optional description, the form, and cross-links. */
export function AuthCard({ title, description, titleRef, children, footer }: AuthCardProps) {
  return (
    <Paper withBorder className={styles.card}>
      <header className={styles.header}>
        <Title order={1} ref={titleRef} tabIndex={-1} className={styles.title}>
          {title}
        </Title>
        {description ? <Text className={styles.description}>{description}</Text> : null}
      </header>
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </Paper>
  );
}
