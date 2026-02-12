import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius } from '../../styles/spacing';

interface StatusBadgeProps {
  status: 'active' | 'expired';
}

const statusConfig = {
  active: {
    color: colors.badge.active,
    label: 'Active',
  },
  expired: {
    color: colors.badge.expired,
    label: 'Expired',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <View style={[styles.container, { backgroundColor: `${config.color}15` }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.badge,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xxs,
  },
  label: {
    ...typography.caption,
    fontWeight: '500',
  },
});
