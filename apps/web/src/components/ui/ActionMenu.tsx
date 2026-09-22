import React, { useRef, type ReactElement, type ReactNode } from 'react';
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
  const targetRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Choosing an item moves focus from the menu to its trigger before the
  // item's action runs, so a dialog the action opens remembers the trigger as
  // the place to return focus to. Left on the chosen item, the dialog would
  // return focus to an element that has since unmounted, dropping it to
  // <body>. Mantine's own return to the trigger (`returnFocus`) is off: it
  // fires 10ms after the menu closes, after that dialog has taken focus, and
  // would pull focus back out of it. Focus already outside the menu is left
  // alone. Escape still returns focus to the trigger, which Mantine does
  // directly rather than through `returnFocus`.
  const moveFocusToTrigger = () => {
    const active = document.activeElement;
    if (!active || active === document.body || dropdownRef.current?.contains(active)) {
      targetRef.current?.focus();
    }
  };

  const runItem = (item: ActionMenuItem) => {
    moveFocusToTrigger();
    item.onClick?.();
  };

  return (
    <Menu position={position} width={220} withinPortal returnFocus={false}>
      <Menu.Target ref={targetRef}>
        {target ?? (
          <ActionIcon variant="subtle" color="gray" aria-label={label}>
            <IconDots size={18} aria-hidden="true" />
          </ActionIcon>
        )}
      </Menu.Target>
      <Menu.Dropdown ref={dropdownRef}>
        {items.map((item) =>
          item.href && !item.disabled ? (
            <Menu.Item
              key={item.key}
              component={Link}
              href={item.href}
              leftSection={item.icon}
              onClick={moveFocusToTrigger}
            >
              {item.label}
            </Menu.Item>
          ) : (
            <Menu.Item
              key={item.key}
              onClick={() => runItem(item)}
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
