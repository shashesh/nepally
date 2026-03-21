import React from 'react';
import { Modal, Group, Text, Stack, Loader, Center } from '@mantine/core';
import { formatPublicName, type EventRsvp } from '@nusa/shared';
import Avatar from '../Avatar';

interface Props {
  attendees: EventRsvp[];
  loading?: boolean;
  onClose: () => void;
}

export default function AttendeeList({ attendees, loading, onClose }: Props) {
  return (
    <Modal opened onClose={onClose} title="Attendees" centered size="sm">
      {loading ? (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      ) : attendees.length === 0 ? (
        <Text ta="center" c="dimmed" py="xl">
          No attendees yet.
        </Text>
      ) : (
        <Stack gap="xs">
          {attendees.map((rsvp) => (
            <Group key={rsvp.id} gap="sm" py={4}>
              <Avatar
                name={rsvp.user?.full_name ?? '?'}
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
