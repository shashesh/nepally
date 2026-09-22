import React, { useId } from 'react';
import Link from 'next/link';
import { Button, Loader } from '@mantine/core';
import { formatPublicName, type Event } from '@nepally/shared';
import Avatar from '../Avatar';
import styles from './EventOrganizerCard.module.css';

export interface EventOrganizerCardProps {
  organizer: NonNullable<Event['organizer']>;
  /** Members who aren't the organizer and are Level 1+. */
  canMessage: boolean;
  messaging: boolean;
  onMessage: () => void;
}

/**
 * Event detail's organizer card. The public name is the one link to the
 * profile; the avatar beside it is decoration. Message Organizer keeps focus
 * while the conversation opens (busy controls stay focusable).
 */
export function EventOrganizerCard({ organizer, canMessage, messaging, onMessage }: EventOrganizerCardProps) {
  const titleId = useId();
  const publicName = formatPublicName(organizer.full_name);

  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <h2 id={titleId} className={styles.title}>
        Organizer
      </h2>

      <div className={styles.person}>
        <Avatar
          name={publicName}
          toneKey={organizer.full_name}
          photoUrl={organizer.profile_photo}
          trustLevel={organizer.trust_level}
          size="medium"
          decorative
        />
        <Link href={`/users/${organizer.id}`} className={styles.name}>
          {publicName}
        </Link>
      </div>

      {canMessage && (
        <Button
          variant="default"
          fullWidth
          aria-disabled={messaging || undefined}
          data-disabled={messaging || undefined}
          leftSection={messaging ? <Loader size="xs" aria-hidden /> : undefined}
          onClick={messaging ? undefined : onMessage}
        >
          Message Organizer
        </Button>
      )}
    </section>
  );
}
