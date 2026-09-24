import React from 'react';
import Link from 'next/link';
import { Anchor, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { formatPublicName } from '@nepally/shared';
import type { ConversationWithParticipant } from '@nepally/shared';
import { UserMenuTrigger } from '../users/UserMenuTrigger';
import styles from './thread.module.css';

export interface ThreadHeaderProps {
  partner: ConversationWithParticipant;
}

/** Back to the inbox, the partner's one avatar menu, and the page's h1. */
export function ThreadHeader({ partner }: ThreadHeaderProps) {
  const name = formatPublicName(partner.other_user_name);

  return (
    <header className={styles.header}>
      <Anchor component={Link} href="/messages" className={styles.back}>
        <IconArrowLeft size={16} aria-hidden="true" />
        Messages
      </Anchor>
      <div className={styles.partner}>
        <UserMenuTrigger
          userId={partner.other_user_id}
          name={name}
          toneKey={partner.other_user_name}
          photoUrl={partner.other_user_photo}
          trustLevel={partner.other_user_trust_level}
          size="small"
        />
        <Title order={1} className={styles.title}>
          {name}
        </Title>
      </div>
    </header>
  );
}
