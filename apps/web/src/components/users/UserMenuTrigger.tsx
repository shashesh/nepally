import React from 'react';
import { UnstyledButton } from '@mantine/core';
import Avatar, { type AvatarSize } from '../Avatar';
import { ActionMenu, type ActionMenuItem } from '../ui';

export interface UserMenuTriggerProps {
  userId: string;
  name: string;
  photoUrl?: string | null;
  trustLevel?: number;
  size?: AvatarSize;
  /** Keeps the avatar's colour stable when `name` is a masked public name. */
  toneKey?: string;
  /** Omit to hide the Chat item, e.g. on your own posts. */
  onChat?: (userId: string, name: string) => void;
}

/**
 * An avatar that opens the member's actions. `ActionMenu` owns the outside
 * click, Escape and focus handling that each page used to hand-roll.
 */
export function UserMenuTrigger({
  userId,
  name,
  photoUrl,
  trustLevel,
  size = 'medium',
  toneKey,
  onChat,
}: UserMenuTriggerProps) {
  const items: ActionMenuItem[] = [
    { key: 'profile', label: 'View profile', href: `/users/${userId}` },
    ...(onChat ? [{ key: 'chat', label: 'Chat', onClick: () => onChat(userId, name) }] : []),
  ];

  return (
    <ActionMenu
      label={`Options for ${name}`}
      items={items}
      target={
        <UnstyledButton aria-label={`Options for ${name}`}>
          <Avatar name={name} photoUrl={photoUrl} trustLevel={trustLevel} size={size} toneKey={toneKey} />
        </UnstyledButton>
      }
    />
  );
}
