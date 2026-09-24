import React, { type ReactNode } from 'react';
import { Button, Loader, type ButtonProps } from '@mantine/core';
import type { ModerationAction } from '../../hooks/useModerationQueue';

export interface ModerationCardBusy {
  /** This card's running action: that button shows a Loader and aria-busy. */
  busyAction: ModerationAction | null;
  /** Any action on the page is running: every button is aria-disabled. */
  locked: boolean;
}

interface ModerationActionButtonProps extends ModerationCardBusy {
  action: ModerationAction;
  onPress: () => void;
  variant?: ButtonProps['variant'];
  color?: ButtonProps['color'];
  children: ReactNode;
}

/**
 * A card action that follows the busy-controls rule: while any action runs it
 * stays focusable with aria-disabled and ignores presses, and the running one
 * shows a Loader and aria-busy without changing its name.
 */
export function ModerationActionButton({
  action,
  busyAction,
  locked,
  onPress,
  variant,
  color,
  children,
}: ModerationActionButtonProps) {
  const running = busyAction === action;
  return (
    <Button
      size="xs"
      variant={variant}
      color={color}
      aria-disabled={locked || undefined}
      data-disabled={locked || undefined}
      aria-busy={running || undefined}
      leftSection={running ? <Loader size={12} color="currentColor" aria-hidden="true" /> : undefined}
      onClick={() => {
        if (!locked) onPress();
      }}
    >
      {children}
    </Button>
  );
}
