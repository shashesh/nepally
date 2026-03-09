import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius } from '../../styles/spacing';

interface TrustBadgeProps {
  level: 0 | 1 | 2;
  showLabel?: boolean;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const badgeConfig = {
  0: {
    icon: 'ellipse-outline' as IoniconName,
    color: colors.badge.level0,
    label: 'New',
  },
  1: {
    icon: 'checkmark-circle' as IoniconName,
    color: colors.badge.level1,
    label: 'Verified',
  },
  2: {
    icon: 'checkmark-done-circle' as IoniconName,
    color: colors.badge.level2,
    label: 'Contributor',
  },
};

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  level,
  showLabel = true,
}) => {
  const config = badgeConfig[level];

  return (
    <View style={styles.container}>
      <Ionicons name={config.icon} size={16} color={config.color} />
      {showLabel && (
        <Text style={[styles.label, { color: config.color }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.badge,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    ...typography.caption,
    marginLeft: spacing.xxs,
    fontWeight: '500',
  },
});
