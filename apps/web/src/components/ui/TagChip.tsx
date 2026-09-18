import React from 'react';
import { Badge } from '@mantine/core';
import styles from './TagChip.module.css';

const DOT_CLASS: Record<string, string> = {
  housing: styles.housing,
  jobs: styles.jobs,
  help: styles.help,
  question: styles.question,
  politics: styles.politics,
  discussion: styles.discussion,
  emergency: styles.emergencyDot,
};

export interface TagChipProps {
  slug: string;
  label: string;
}

export function TagChip({ slug, label }: TagChipProps) {
  const isEmergency = slug === 'emergency';
  return (
    <Badge
      variant="default"
      radius="sm"
      size="lg"
      data-emergency={isEmergency ? 'true' : undefined}
      className={isEmergency ? styles.emergency : styles.root}
      leftSection={<span className={`${styles.dot} ${DOT_CLASS[slug] ?? styles.other}`} aria-hidden="true" />}
    >
      {label}
    </Badge>
  );
}
