import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { RsvpStatus } from '@nepally/shared';
import { colors } from '../../styles/colors';
import { borderRadius } from '../../styles/spacing';

/** Why the member can't respond. A cancelled event shows nothing: its banner already says so. */
export type EventResponseBlock = 'cancelled' | 'past' | 'organizer' | 'unverified';

interface Props {
  value: RsvpStatus | null;
  /** Pressing the selected option passes null. */
  onChange: (next: RsvpStatus | null) => void;
  /** A change is saving: both options are disabled. */
  busy?: boolean;
  blockedBy?: EventResponseBlock | null;
}

const OPTIONS: ReadonlyArray<{ status: RsvpStatus; label: string; icon: string }> = [
  { status: 'interested', label: 'Interested', icon: '★' },
  { status: 'going', label: 'Going', icon: '✓' },
];

const BLOCK_LABELS: Record<Exclude<EventResponseBlock, 'cancelled'>, string> = {
  past: 'Event Has Passed',
  organizer: "You're the Organizer",
  unverified: 'Verify to RSVP',
};

/**
 * Event detail's Interested / Going toggle pair, the same answer the events
 * list gives. When the member can't respond, one disabled button says why.
 */
export const EventResponseButtons: React.FC<Props> = ({
  value,
  onChange,
  busy = false,
  blockedBy = null,
}) => {
  if (blockedBy === 'cancelled') return null;

  if (blockedBy) {
    return (
      <TouchableOpacity
        style={[styles.option, styles.optionBlocked]}
        disabled
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
      >
        <Text style={[styles.label, styles.labelBlocked]}>{BLOCK_LABELS[blockedBy]}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.row}>
      {OPTIONS.map(({ status, label, icon }) => {
        const selected = value === status;
        return (
          <TouchableOpacity
            key={status}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => onChange(selected ? null : status)}
            disabled={busy}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected, disabled: busy }}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {icon} {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.primary.main,
    borderRadius: borderRadius.button,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: colors.primary.main,
  },
  optionBlocked: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary.main,
  },
  labelSelected: {
    color: colors.white,
  },
  labelBlocked: {
    color: colors.text.disabled,
  },
});
