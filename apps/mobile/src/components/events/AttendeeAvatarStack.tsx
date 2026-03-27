import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { type EventRsvp } from '@nepally/shared';
import { Avatar } from '../Avatar';
import { colors } from '../../styles/colors';

const STACK_SIZE = 5;
const AVATAR_SIZE = 24;
const OVERLAP = 8;

interface Props {
  attendees: EventRsvp[];
  totalCount: number;
  onPress?: () => void;
}

export const AttendeeAvatarStack: React.FC<Props> = ({
  attendees,
  totalCount,
  onPress,
}) => {
  const visible = attendees.slice(0, STACK_SIZE);
  const overflow = totalCount - visible.length;

  const label =
    totalCount === 0
      ? 'Be the first to RSVP!'
      : totalCount === 1
      ? '1 person going'
      : `${totalCount} people going`;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={totalCount > 0 ? onPress : undefined}
      activeOpacity={totalCount > 0 ? 0.7 : 1}
      disabled={totalCount === 0}
    >
      {/* Avatar stack */}
      {visible.length > 0 && (
        <View style={[styles.stack, { width: visible.length * (AVATAR_SIZE - OVERLAP) + OVERLAP + (overflow > 0 ? AVATAR_SIZE : 0) }]}>
          {visible.map((rsvp, index) => (
            <View
              key={rsvp.id}
              style={[styles.avatarWrapper, { left: index * (AVATAR_SIZE - OVERLAP) }]}
            >
              <Avatar
                name={rsvp.user?.full_name ?? '?'}
                photoUrl={rsvp.user?.profile_photo}
                trustLevel={rsvp.user?.trust_level}
                size="small"
              />
            </View>
          ))}
          {overflow > 0 && (
            <View
              style={[
                styles.avatarWrapper,
                styles.overflowBadge,
                { left: visible.length * (AVATAR_SIZE - OVERLAP) },
              ]}
            >
              <Text style={styles.overflowText}>+{overflow}</Text>
            </View>
          )}
        </View>
      )}

      {/* Label */}
      <Text style={[styles.label, totalCount > 0 && styles.labelClickable]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stack: {
    height: AVATAR_SIZE,
    position: 'relative',
  },
  avatarWrapper: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.white,
    borderRadius: AVATAR_SIZE / 2,
  },
  overflowBadge: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  label: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  labelClickable: {
    color: colors.primary.main,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
