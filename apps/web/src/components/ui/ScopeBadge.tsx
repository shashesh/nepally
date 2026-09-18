import React from 'react';
import { Badge } from '@mantine/core';
import styles from './ScopeBadge.module.css';

export interface ScopeBadgeProps {
  isGlobal: boolean;
  metroLabel?: string;
}

export function ScopeBadge({ isGlobal, metroLabel }: ScopeBadgeProps) {
  const label = isGlobal ? 'Global' : metroLabel ? `Local · ${metroLabel}` : 'Local';
  return (
    <Badge variant="default" radius="sm" size="lg" className={isGlobal ? styles.global : styles.local}>
      {label}
    </Badge>
  );
}
