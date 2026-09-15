import React from 'react';
import Link from 'next/link';
import { Menu, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconLogout, IconMapPin, IconUser } from '@tabler/icons-react';
import type { User } from '@nepally/shared';
import Avatar from '../Avatar';
import styles from './AccountMenu.module.css';

export interface AccountMenuProps {
  user: User;
  onSignOut: () => void;
}

export function AccountMenu({ user, onSignOut }: AccountMenuProps) {
  return (
    <Menu position="bottom-end" width={260} offset={10}>
      <Menu.Target>
        <UnstyledButton className={styles.trigger} aria-label="Open account menu">
          <Avatar name={user.full_name || '?'} photoUrl={user.profile_photo} trustLevel={user.trust_level} size="small" />
          <IconChevronDown size={14} stroke={2.5} aria-hidden="true" />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <div className={styles.identity}>
          <Text size="sm" fw={600} truncate>
            {user.full_name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {user.email}
          </Text>
        </div>
        <Menu.Divider />
        <Menu.Item component={Link} href="/profile" leftSection={<IconUser size={16} aria-hidden="true" />}>
          View Profile
        </Menu.Item>
        <Menu.Item component={Link} href="/profile/locations" leftSection={<IconMapPin size={16} aria-hidden="true" />}>
          Manage Locations
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" onClick={onSignOut} leftSection={<IconLogout size={16} aria-hidden="true" />}>
          Sign Out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
