import React from 'react';
import {
  EVENT_TYPE_ICONS,
  EVENT_TYPE_LABELS,
  type EventType,
} from '@nusa/shared';
import styles from './EventTypeBadge.module.css';

interface Props {
  type: EventType;
}

const TYPE_CLASS: Record<EventType, string> = {
  cultural: styles.badgeCultural,
  religious: styles.badgeReligious,
  social: styles.badgeSocial,
  career: styles.badgeCareer,
  other: styles.badgeOther,
};

export default function EventTypeBadge({ type }: Props) {
  return (
    <span className={`${styles.badge} ${TYPE_CLASS[type]}`}>
      {EVENT_TYPE_ICONS[type]} {EVENT_TYPE_LABELS[type]}
    </span>
  );
}
