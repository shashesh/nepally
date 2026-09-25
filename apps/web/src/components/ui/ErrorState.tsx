import React from 'react';
import { Alert, Button, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/** True when `message` says nothing `title` doesn't: a fallback like "Couldn't load events." under the title "Couldn't load events". */
function restatesTitle(title: string, message: string): boolean {
  return message.trim().replace(/\.$/, '') === title.trim();
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, retryLabel = 'Try again' }: ErrorStateProps) {
  return (
    <Alert variant="light" color="red" radius="lg" title={title} icon={<IconAlertTriangle size={20} aria-hidden="true" />}>
      {restatesTitle(title, message) ? null : <Text size="sm">{message}</Text>}
      {onRetry ? (
        <Button variant="default" size="xs" mt="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </Alert>
  );
}
