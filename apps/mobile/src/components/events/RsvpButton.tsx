import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';
import { borderRadius } from '../../styles/spacing';

type RsvpState =
  | 'default'     // Not going, can RSVP
  | 'going'       // User has RSVP'd
  | 'past'        // Event has passed
  | 'cancelled'   // Event is cancelled — button hidden
  | 'organizer'   // User is the organizer
  | 'level0';     // User needs to verify first

interface Props {
  state: RsvpState;
  onPress?: () => void;
  loading?: boolean;
}

export const RsvpButton: React.FC<Props> = ({ state, onPress, loading = false }) => {
  if (state === 'cancelled') return null;

  const isDisabled = loading || state === 'past' || state === 'organizer' || state === 'level0';

  const label: Record<RsvpState, string> = {
    default: 'RSVP',
    going: 'Going ✓',
    past: 'Event Has Passed',
    cancelled: '',
    organizer: "You're the Organizer",
    level0: 'Verify to RSVP',
  };

  const buttonLabel = loading ? 'Updating...' : label[state];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        state === 'going' && styles.buttonGoing,
        isDisabled && styles.buttonDisabled,
      ]}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      activeOpacity={isDisabled ? 1 : 0.8}
    >
      <Text
        style={[
          styles.label,
          state === 'going' && styles.labelGoing,
          isDisabled && styles.labelDisabled,
        ]}
      >
        {buttonLabel}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 2,
    borderColor: colors.primary.main,
    borderRadius: borderRadius.button,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonGoing: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  buttonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary.main,
  },
  labelGoing: {
    color: colors.white,
  },
  labelDisabled: {
    color: colors.text.disabled,
  },
});
