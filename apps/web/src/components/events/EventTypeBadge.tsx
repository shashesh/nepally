import React from 'react';
import { Badge } from '@mantine/core';
import {
  EVENT_TYPE_ICONS,
  EVENT_TYPE_LABELS,
  type EventType,
} from '@nepally/shared';
import styles from './EventTypeBadge.module.css';

interface Props {
  type: EventType;
}

/** Coloured from the `--event-<type>` tokens through `data-type`; reads as its label alone. */
export default function EventTypeBadge({ type }: Props) {
  return (
    <Badge variant="default" size="sm" radius="xl" className={styles.badge} data-type={type}>
      <span aria-hidden="true">{EVENT_TYPE_ICONS[type]}</span> <span>{EVENT_TYPE_LABELS[type]}</span>
    </Badge>
  );
}
