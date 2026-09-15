import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { Anchor, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, backHref, backLabel = 'Back', actions }: PageHeaderProps) {
  return (
    <header className={styles.root}>
      {backHref ? (
        <Anchor component={Link} href={backHref} className={styles.back}>
          <IconArrowLeft size={16} aria-hidden="true" />
          {backLabel}
        </Anchor>
      ) : null}
      <div className={styles.row}>
        <div className={styles.text}>
          <Title order={1} className={styles.title}>
            {title}
          </Title>
          {description ? <Text className={styles.description}>{description}</Text> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </header>
  );
}
