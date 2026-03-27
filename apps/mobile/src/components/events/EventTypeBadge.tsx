import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_ICONS,
  EVENT_TYPE_LABELS,
  type EventType,
} from '@nepally/shared';

interface Props {
  type: EventType;
}

export const EventTypeBadge: React.FC<Props> = ({ type }) => {
  const colors = EVENT_TYPE_COLORS[type];
  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <Text style={styles.icon}>{EVENT_TYPE_ICONS[type]}</Text>
      <Text style={[styles.label, { color: colors.text }]}>{EVENT_TYPE_LABELS[type]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  icon: {
    fontSize: 11,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
