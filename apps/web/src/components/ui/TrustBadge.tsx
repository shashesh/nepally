import React from 'react';
import { Badge } from '@mantine/core';
import { IconCircleCheck, IconStarFilled } from '@tabler/icons-react';
import { getTrustLabel } from '@nepally/shared';
import styles from './TrustBadge.module.css';

export interface TrustBadgeProps {
  level: number;
}

export function TrustBadge({ level }: TrustBadgeProps) {
  const tier = level >= 2 ? 2 : level === 1 ? 1 : 0;
  const tierClass = tier === 2 ? styles.contributor : tier === 1 ? styles.verified : styles.new;
  const icon =
    tier === 2 ? <IconStarFilled size={12} aria-hidden="true" /> : tier === 1 ? <IconCircleCheck size={12} aria-hidden="true" /> : null;

  return (
    <Badge variant="default" radius="xs" size="md" className={`${styles.root} ${tierClass}`} leftSection={icon}>
      {getTrustLabel(tier)}
    </Badge>
  );
}
