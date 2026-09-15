import React from 'react';
import { Badge } from '@mantine/core';
import { IconCircleCheck, IconStarFilled } from '@tabler/icons-react';
import { getTrustLabel } from '@nepally/shared';
import styles from './TrustBadge.module.css';

export interface TrustBadgeProps {
  level: number;
}

export function TrustBadge({ level }: TrustBadgeProps) {
  const tierClass = level >= 2 ? styles.contributor : level === 1 ? styles.verified : styles.new;
  const icon =
    level >= 2 ? <IconStarFilled size={12} aria-hidden="true" /> : level === 1 ? <IconCircleCheck size={12} aria-hidden="true" /> : null;

  return (
    <Badge variant="default" radius="xs" size="md" className={`${styles.root} ${tierClass}`} leftSection={icon}>
      {getTrustLabel(level)}
    </Badge>
  );
}
