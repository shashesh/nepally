import React from 'react';
import { Badge } from '@mantine/core';
import {
  EVENT_TYPE_ICONS,
  EVENT_TYPE_LABELS,
  type EventType,
} from '@nepally/shared';

interface Props {
  type: EventType;
}

const TYPE_COLORS: Record<EventType, string> = {
  cultural: 'orange',
  religious: 'grape',
  social: 'green',
  career: 'blue',
  other: 'gray',
};

export default function EventTypeBadge({ type }: Props) {
  return (
    <Badge variant="light" color={TYPE_COLORS[type]} size="sm" radius="xl">
      {EVENT_TYPE_ICONS[type]} {EVENT_TYPE_LABELS[type]}
    </Badge>
  );
}
