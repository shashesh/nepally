import React, { type ReactElement, type ReactNode } from 'react';
import Link from 'next/link';
import { ActionIcon, Menu, type MenuProps } from '@mantine/core';
import { IconDots } from '@tabler/icons-react';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
}

export interface ActionMenuProps {
  /** Accessible name of the default "⋯" trigger. */
  label: string;
  items: ActionMenuItem[];
  /** Custom trigger; must be a single element that forwards its ref. */
  target?: ReactElement;
  position?: MenuProps['position'];
}

export function ActionMenu({ label, items, target, position = 'bottom-end' }: ActionMenuProps) {
  return (
    <Menu position={position} width={220} withinPortal>
      <Menu.Target>
        {target ?? (
          <ActionIcon variant="subtle" color="gray" aria-label={label}>
            <IconDots size={18} aria-hidden="true" />
          </ActionIcon>
        )}
      </Menu.Target>
      <Menu.Dropdown>
        {items.map((item) =>
          item.href ? (
            <Menu.Item key={item.key} component={Link} href={item.href} leftSection={item.icon} disabled={item.disabled}>
              {item.label}
            </Menu.Item>
          ) : (
            <Menu.Item
              key={item.key}
              onClick={item.onClick}
              leftSection={item.icon}
              color={item.danger ? 'red' : undefined}
              disabled={item.disabled}
            >
              {item.label}
            </Menu.Item>
          )
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
