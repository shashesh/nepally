import React, { useCallback, useState, type ReactNode } from 'react';
import { Button, Group, Text, TextInput, Textarea } from '@mantine/core';
import { modals } from '@mantine/modals';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
}

export interface PromptOptions {
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  maxLength?: number;
  multiline?: boolean;
  /** Return an error message to block submission, or null when valid. */
  validate?: (value: string) => string | null;
}

/** Resolves once; later calls (e.g. onClose after onConfirm) are ignored. */
function once<T>(resolve: (value: T) => void): (value: T) => void {
  let settled = false;
  return (value) => {
    if (settled) return;
    settled = true;
    resolve(value);
  };
}

/** Promise-based replacement for window.confirm, rendered with @mantine/modals. */
export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  return useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        const settle = once(resolve);
        modals.openConfirmModal({
          title: options.title,
          children: <Text size="sm">{options.message}</Text>,
          labels: { confirm: options.confirmLabel ?? 'Confirm', cancel: options.cancelLabel ?? 'Cancel' },
          confirmProps: options.danger ? { color: 'red' } : undefined,
          onConfirm: () => settle(true),
          onCancel: () => settle(false),
          onClose: () => settle(false),
        });
      }),
    []
  );
}

interface PromptFormProps {
  options: PromptOptions;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

function PromptForm({ options, onSubmit, onCancel }: PromptFormProps) {
  const [value, setValue] = useState(options.initialValue ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(event.currentTarget.value);
    setError(null);
  };

  const fieldProps = {
    label: options.label,
    value,
    onChange: handleChange,
    maxLength: options.maxLength,
    error,
    'data-autofocus': true,
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const message = options.validate?.(value) ?? null;
        if (message) {
          setError(message);
          return;
        }
        onSubmit(value);
      }}
    >
      {options.multiline ? <Textarea autosize minRows={3} {...fieldProps} /> : <TextInput {...fieldProps} />}
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onCancel}>
          {options.cancelLabel ?? 'Cancel'}
        </Button>
        <Button type="submit">{options.confirmLabel ?? 'Save'}</Button>
      </Group>
    </form>
  );
}

/** Promise-based replacement for window.prompt; resolves null when dismissed. */
export function usePrompt(): (options: PromptOptions) => Promise<string | null> {
  return useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        const settle = once(resolve);
        const modalId = modals.open({
          title: options.title,
          onClose: () => settle(null),
          children: (
            <PromptForm
              options={options}
              onSubmit={(value) => {
                settle(value);
                modals.close(modalId);
              }}
              onCancel={() => {
                settle(null);
                modals.close(modalId);
              }}
            />
          ),
        });
      }),
    []
  );
}
