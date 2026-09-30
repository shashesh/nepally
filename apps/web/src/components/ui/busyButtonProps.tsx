import React, { type ReactNode } from 'react';
import { Loader } from '@mantine/core';

/**
 * The busy-controls rule (web-ui-system.md): a locked button stays focusable,
 * and the one that's running shows a Loader in place of its icon.
 */
export function busyButtonProps(locked: boolean, running: boolean, icon?: ReactNode) {
  return {
    'aria-disabled': locked || undefined,
    'data-disabled': locked || undefined,
    'aria-busy': running || undefined,
    leftSection: running ? <Loader size={16} color="currentColor" aria-hidden="true" /> : icon,
  };
}
