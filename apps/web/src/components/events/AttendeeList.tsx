import React from 'react';
import { Modal, Group, Text, Stack } from '@mantine/core';
import { formatPublicName, type EventRsvp } from '@nepally/shared';
import Avatar from '../Avatar';
import { ErrorState, LoadingState } from '../ui';

export interface AttendeeListProps {
  opened: boolean;
  attendees: EventRsvp[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

/**
 * The people going to an event, in a dialog. It stays mounted and follows
 * `opened`, so Mantine runs its transition and returns focus to the opener.
 * The theme's Modal default names the close button "Close".
 */
export default function AttendeeList({ opened, attendees, loading, error, onRetry, onClose }: AttendeeListProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="People going" centered size="sm">
      {loading ? (
        <LoadingState count={3} label="Loading attendees…" />
      ) : error ? (
        <ErrorState title="Couldn't load attendees" message={error} onRetry={onRetry} />
      ) : attendees.length === 0 ? (
        <Text ta="center" c="dimmed" py="xl">
          No attendees yet.
        </Text>
      ) : (
        <Stack gap="xs">
          {attendees.map((rsvp) => (
            <Group key={rsvp.id} gap="sm" py={4}>
              <Avatar
                name={rsvp.user ? formatPublicName(rsvp.user.full_name) : '?'}
                toneKey={rsvp.user?.full_name}
                photoUrl={rsvp.user?.profile_photo}
                trustLevel={rsvp.user?.trust_level}
                size="small"
              />
              <Text size="sm">
                {rsvp.user ? formatPublicName(rsvp.user.full_name) : 'User'}
              </Text>
            </Group>
          ))}
        </Stack>
      )}
    </Modal>
  );
}
