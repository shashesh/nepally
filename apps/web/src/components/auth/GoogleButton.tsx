import React from 'react';
import { Button, Loader } from '@mantine/core';
import { IconBrandGoogle } from '@tabler/icons-react';

export interface GoogleButtonProps {
  onClick: () => void;
  busy: boolean;
}

/**
 * "Continue with Google". While busy it follows the busy-controls rule: it
 * stays focusable with aria-disabled, shows a Loader in place of the icon,
 * keeps its name and ignores presses.
 */
export function GoogleButton({ onClick, busy }: GoogleButtonProps) {
  return (
    <Button
      variant="default"
      fullWidth
      aria-disabled={busy || undefined}
      data-disabled={busy || undefined}
      aria-busy={busy || undefined}
      leftSection={
        busy ? (
          <Loader size={16} color="currentColor" aria-hidden="true" />
        ) : (
          <IconBrandGoogle size={18} aria-hidden="true" />
        )
      }
      onClick={() => {
        if (!busy) onClick();
      }}
    >
      Continue with Google
    </Button>
  );
}
