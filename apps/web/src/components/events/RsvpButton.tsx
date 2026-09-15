import React from 'react';
import { Button } from '@mantine/core';

type RsvpState = 'default' | 'going' | 'past' | 'cancelled' | 'organizer' | 'level0';

interface Props {
  state: RsvpState;
  onPress?: () => void;
  loading?: boolean;
}

const LABELS: Record<RsvpState, string> = {
  default: 'RSVP',
  going: 'Going ✓',
  past: 'Event Has Passed',
  cancelled: '',
  organizer: "You're the Organizer",
  level0: 'Verify to RSVP',
};

export default function RsvpButton({ state, onPress, loading = false }: Props) {
  if (state === 'cancelled') return null;

  const isDisabled = loading || state === 'past' || state === 'organizer' || state === 'level0';
  const label = loading ? 'Updating...' : LABELS[state];

  return (
    <Button
      variant={state === 'going' ? 'filled' : 'outline'}
      radius="sm"
      size="md"
      onClick={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      loading={loading}
    >
      {label}
    </Button>
  );
}
